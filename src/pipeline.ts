/**
 * Pipeline - runs AI CLI commands to execute speckit workflow
 * 
 * This is intentionally simple. We delegate ALL the work to the AI CLI.
 * No file manipulation, no template management, no complex state tracking.
 * 
 * Flow:
 * 1. Initialize speckit if needed (via `specify init`)
 * 2. Run speckit agents: specify → plan → tasks → implement
 * 3. Verify: check for errors via AI
 * 4. Fix loop: if errors, ask AI to fix and retry (max 3 attempts)
 * 5. Generate summary of what was done
 */
import { spawn } from 'child_process';
import { detectProject } from './detect.js';
import { patchSpeckit } from './speckit-patch.js';
import {
  initState,
  clearState,
  loadState,
  markStepStarted,
  markStepCompleted,
  type PipelineStep,
} from './state.js';
import {
  startHistoryEntry,
  completeHistoryEntry,
  recordStepStart,
  recordStepComplete,
  buildHistoryContext,
  getActiveRun,
} from './history.js';
import { decide, ensureOllamaReady, DEFAULT_MODEL } from './ollama.js';
import { askUserExec, askUserFunction, continueProcessFunction, endProcessFunction, reiterateFunction, runAICommandExec, runCommandExec } from './functions/misc.js';
import { Message } from 'ollama';
import { createTasks, implement, ImplementFunction, plan, PlanFunction, specify, SpecifyFunction, TaskFunction } from './functions/speckit.js';

export interface PipelineOptions {
  dryRun?: boolean;
  tool?: 'copilot' | 'claude';
  model?: string;
  verbose?: boolean;
  autoApprove?: boolean;
  currentBranchOnly?: boolean;
  autoConstitution?: boolean;
  maxRetries?: number;
}

// Use PipelineStep from state module, plus 'init' which is internal
type Step = 'init' | 'constitution' | PipelineStep;

const STEP_AGENTS: Record<Exclude<Step, 'init' | 'verify'>, string> = {
  constitution: '/speckit.constitution',
  specify: '/speckit.specify',
  plan: '/speckit.plan',
  tasks: '/speckit.tasks',
  implement: '/speckit.implement',
};

/** Track execution for summary */
interface ExecutionSummary {
  stepsCompleted: string[];
  stepsFailed: string[];
  fixAttempts: number;
  startTime: Date;
  endTime?: Date;
}

/**
 * Run the full pipeline from description to implementation
 */
export async function runPipeline(
  description: string | undefined,
  options: PipelineOptions = {}
): Promise<void> {
  const tool = options.tool ?? 'copilot';
  const maxRetries = options.maxRetries ?? 3;
  let retries = 0;
  
  // Check Ollama installation and model availability first
  console.log('🔍 Checking Ollama setup...');
  const ollamaStatus = await ensureOllamaReady(DEFAULT_MODEL);
  
  if (!ollamaStatus.ready) {
    console.error(`\n❌ ${ollamaStatus.error}`);
    process.exit(1);
  }
  console.log(`✅ Ollama ready with model "${DEFAULT_MODEL}"\n`);

  let status = detectProject();

  // Initialize or load state
  if (description) {
    // Starting a new feature - clear any old state
    clearState();
    initState(description);
  }

  // Start history tracking
  startHistoryEntry({
    description,
    isContinuation: !description,
    tool,
    model: options.model,
  });

  const summary: ExecutionSummary = {
    stepsCompleted: [],
    stepsFailed: [],
    fixAttempts: 0,
    startTime: new Date(),
  };

  console.log(`
   _____ ____  _  __ ____  _      _____  
  / ___// __ \\| |/ // __ \\| |    |  __ \\ 
  \\__ \\| |  | |   /| |  | | |    | |  | |
 ___) | |__| | . \\| |__| | |____| |__| |
|____/ \\____/|_|\\_\\____/|______|_____/ `);

  // Show current status
  console.log('📊 Project status:');
  console.log(`   SpecKit initialized: ${status.hasSpeckit ? '✓' : '✗'}`);
  console.log(`   Has constitution:    ${status.hasConstitution ? '✓' : '✗'}`);
  console.log(`   Has specification:   ${status.hasSpec ? '✓' : '✗'}`);
  console.log(`   Has plan:            ${status.hasPlan ? '✓' : '✗'}`);
  console.log(`   Has tasks:           ${status.hasTasks ? '✓' : '✗'}`);
  console.log('');

  // Step 1: Initialize speckit if needed
  if (!status.hasSpeckit) {
    console.log('🔧 SpecKit not initialized. Running setup...\n');

    if (options.dryRun) {
      console.log(`   Would run: specify init --here --ai ${tool} --force`);
    } else {
      const initSuccess = await runSpecifyInit(tool, options.verbose);
      if (!initSuccess) {
        console.error('\n❌ Failed to initialize SpecKit. Please run "specify init" manually.');
        process.exit(1);
      }
      summary.stepsCompleted.push('init');
      console.log('✓ SpecKit initialized\n');

      // Auto-patch if currentBranchOnly is enabled
      if (options.currentBranchOnly) {
        console.log('🔧 Patching SpecKit for branch control...\n');
        const patchResult = patchSpeckit();
        if (patchResult.success) {
          console.log('✓ SpecKit patched for branch control\n');
        } else {
          console.warn('⚠️ Could not auto-patch SpecKit scripts\n');
        }
      }

      // Re-detect status after init
      status = detectProject();
    }
  }

  // Step 1.5: Auto-create constitution if enabled and missing
  if (options.autoConstitution && !status.hasConstitution && description) {
    console.log('📜 No constitution found. Auto-creating based on project context...\n');

    if (!options.dryRun) {
      const constitutionSuccess = await runConstitutionStep(tool, description, status.hasExistingCode, options);
      if (constitutionSuccess) {
        summary.stepsCompleted.push('constitution');
        console.log('✓ Constitution created\n');
        // Re-detect status after constitution
        status = detectProject();
      } else {
        console.warn('⚠️ Could not auto-create constitution, continuing anyway...\n');
      }
    } else {
      console.log('   Would run: constitution step with project analysis');
    }
  }

  // Build history context for AI prompts
  const historyContext = buildHistoryContext();
  const currentState = loadState();
  const activeRun = getActiveRun();

  const firstDesicion = await decide(
    [
      {
        role: 'system',
        content: `
You are part of an AI development coding assistant. 
You are an orchestrator that decidedes on the next steps to take in order to implement a software feature.
The user prompts might make it sound like they you to implement the feature, but that is just for you to orchestrate. 

This is the first step in determining how to proceed with the development workflow.
The user has provided a description of what he wants to achieve through the AI development assistant.
After this step is done we will move on to working on the development workflow itself and you'll then have tools at disposal to delegate this work to other agents.

It could be that the user wants to 
- Add a new feature
- Create a completely new project/application/etc
- Wants to continue from where the process left off
- Wants to fix issues in the previous/current implementation
- Wants to change something in the current implementation
- Similar scenarios

Your task is to:

Determine if you have enough information to proceed to working on the development workflow or if you need to ask the user for a single clarifying question first.
We won't have access to user input later, so for that reason we'll need to ask any clarifying questions now.
If no clarifying questions are needed, we can just continue.

You are NOT going to implement anything at this stage. The user isn't asking YOU to imlplement anything visually or similar. 
You are the project lead and orchestrator. You will delegate the actual implementation work to other agents in the next steps of the workflow.
Don't refuse to answer because it's out of scope or not part of your capabilites. Your capabilities are not an issue or limiting factor here.
If you don't play ball and actually help with function calling you are failing in your role as an AI development assistant.
The process is dependent on you to help move things forward.

## OUTRAGEOUS PITFALLS TO AVOID:

- Refusing to answer and cooperate
- Not providing a tool call
- Stating that this is out of scope or not within your capabilities; the coding will be handled by other agents that DO have these abilities

## Requirements:

- You MUST resond with a tool call.
- No free form text responses.
- Refusing to answer is not an option.
- Stating that this is out of scope is not an option.
- Consider all user prompts as relevant for software development, it is the context you're working with.

## Context:

- Current project status:
- SpecKit initialized: ${status.hasSpeckit}
- Constitution present: ${status.hasConstitution}
- Specification present: ${status.hasSpec}
- Plan present: ${status.hasPlan}
- Tasks present: ${status.hasTasks}
- Existing code present: ${status.hasExistingCode}
- User description provided: ${description ? '✓' : '✗'}

${currentState ? `## Current Pipeline State:
- Started at: ${currentState.startedAt}
- Last completed step: ${currentState.lastCompletedStep || 'none'}
- Completed steps: ${currentState.completedSteps.join(', ') || 'none'}
- Current step in progress: ${currentState.currentStep || 'none'}\n` : ''}
${activeRun ? `## Active Run:
- Run ID: ${activeRun.id}
- Steps executed: ${activeRun.steps.map(s => `${s.step}(${s.outcome})`).join(', ') || 'none'}\n` : ''}
${historyContext ? `\n${historyContext}\n` : ''}
`

      },
      {
        role: 'user',
        content: description ?? 'No new feature description provided.',
      }
    ],
    [
      askUserFunction,
      continueProcessFunction
    ]
  );

  if (firstDesicion.status === 'failure') {
    console.error('❌ Failed to determine next steps:', firstDesicion.content);
    process.exit(1);
  }

  console.log(firstDesicion.content);

  const messages: Message[] = [
    {
      role: 'system',
      content: `
You are part of an AI development coding assistant.

You are an orchestrator that decides on the next steps to take in order to implement a software feature.
Use the tools at your disposal to get information and perform actions.

All coding tasks will be handled by other agents in the workflow.

## Context:
- SpecKit initialized: ${status.hasSpeckit}
- Constitution present: ${status.hasConstitution}
- Specification present: ${status.hasSpec}
- Plan present: ${status.hasPlan}
- Tasks present: ${status.hasTasks}

${currentState ? `## Current Pipeline State:
- Started at: ${currentState.startedAt}
- Last completed step: ${currentState.lastCompletedStep || 'none'}
- Completed steps: ${currentState.completedSteps.join(', ') || 'none'}\n` : ''}
${historyContext ? `\n${historyContext}\n` : ''}`
    },
    {
      role: 'user',
      content: description ?? 'No new feature description provided.',
    }
  ];

  for (const toolCall of firstDesicion.tools) {
    if (toolCall.function.name === 'ask_user') {
      const reply = await askUserExec(toolCall.function.arguments['question'] + '\n');
      if (reply.status === 'success') {

        if (firstDesicion.content) messages.push({
          role: 'assistant',
          content: firstDesicion.content
        });

        messages.push({
          role: 'tool',
          tool_name: toolCall.function.name,
          content: reply.content
        })

        console.log('\n✅ Received user input, continuing with the pipeline.');
      } else {
        console.error('❌ Failed to get user input:', reply.content);
        process.exit(1);
      }
    }
  }

  let continue_work = true;

  while (continue_work) {

    const desicion = await decide(messages,
      [
        reiterateFunction,
        endProcessFunction,
        SpecifyFunction,
        PlanFunction,
        TaskFunction,
        ImplementFunction,
      ]
    );

    if (desicion.status === 'failure') {
      console.error('❌ Failed to determine next steps:', desicion.content);
      
      retries++;
      if (retries >= maxRetries) {
        console.error('❌ Maximum retry attempts reached. Exiting.');
        process.exit(1);
      }

      messages.push({
        role: 'agent',
        content: `Error determining next steps: ${desicion.content}. Retrying attempt ${retries} of ${maxRetries}.`
      });
      continue;
    }

    retries = 0;

    console.log('\n🤖 AI Decision:');
    console.log(desicion.content);

    if (desicion.content) messages.push({
      role: 'assistant',
      content: desicion.content
    });

    for (const toolCall of desicion.tools) {

      let tool_content: string = '';
      let tool_status:string = '';
      let tool_output: string = '';

      if (toolCall.function.name === 'reiterate_process') {
        const reasoning = toolCall.function.arguments['reasoning'] || 'No reasoning provided.';

        tool_content = reasoning;

        break;
      } else if (toolCall.function.name === 'specify_feature') {
        // Track step in state and history
        markStepStarted('specify');
        recordStepStart('specify', toolCall.function.arguments['feature_description']);
        
        const result = await specify(tool, toolCall.function.arguments['feature_description'], options.model);
        tool_content = JSON.stringify(result);
        tool_status = result.status;
        tool_output = result.content;
        
        // Record step completion
        if (result.status === 'success') {
          markStepCompleted('specify');
          recordStepComplete('specify', 'success');
          summary.stepsCompleted.push('specify');
        } else {
          recordStepComplete('specify', 'failed', result.content);
          summary.stepsFailed.push('specify');
        }
      } else if (toolCall.function.name === 'end_process') {
        continue_work = false;
        console.log('✅ AI determined no further action is needed.');
        completeHistoryEntry('success', 'AI determined no further action needed');
        printSummary(summary);
        return;
      } else if (toolCall.function.name === 'plan_feature') {
        // Track step in state and history
        markStepStarted('plan');
        recordStepStart('plan', toolCall.function.arguments['technical_requirements']);
        
        const result = await plan(tool, toolCall.function.arguments['technical_requirements'], options.model);
        tool_content = JSON.stringify(result);
        tool_status = result.status;
        tool_output = result.content;
        
        // Record step completion
        if (result.status === 'success') {
          markStepCompleted('plan');
          recordStepComplete('plan', 'success');
          summary.stepsCompleted.push('plan');
        } else {
          recordStepComplete('plan', 'failed', result.content);
          summary.stepsFailed.push('plan');
        }
      } else if (toolCall.function.name === 'create_tasks') {
        // Track step in state and history
        markStepStarted('tasks');
        recordStepStart('tasks');
        
        const result = await createTasks(tool, options.model);
        tool_content = JSON.stringify(result);
        tool_status = result.status;
        tool_output = result.content;
        
        // Record step completion
        if (result.status === 'success') {
          markStepCompleted('tasks');
          recordStepComplete('tasks', 'success');
          summary.stepsCompleted.push('tasks');
        } else {
          recordStepComplete('tasks', 'failed', result.content);
          summary.stepsFailed.push('tasks');
        }
      } else if (toolCall.function.name === 'implement_feature') {
        // Track step in state and history
        markStepStarted('implement');
        recordStepStart('implement', toolCall.function.arguments['special_considerations']);
        
        const result = await implement(tool, toolCall.function.arguments['special_considerations'], options.model);
        tool_content = JSON.stringify(result);
        tool_status = result.status;
        tool_output = result.content;
        
        // Record step completion
        if (result.status === 'success') {
          markStepCompleted('implement');
          recordStepComplete('implement', 'success');
          summary.stepsCompleted.push('implement');
        } else {
          recordStepComplete('implement', 'failed', result.content);
          summary.stepsFailed.push('implement');
        }
      } else if (toolCall.function.name === 'run_ai_command') {
        const result = await runAICommandExec(
          tool,
          toolCall.function.arguments['prompt'],
          options.model
        );
        tool_content = JSON.stringify(result);
        tool_status = result.status;
        tool_output = result.content;
      } else if (toolCall.function.name === 'run_command') {
        const result = await runCommandExec(
          toolCall.function.arguments['command']
        );
        tool_content = JSON.stringify(result);
        tool_status = result.status;
        tool_output = result.content;
      } else if (toolCall.function.name === 'verify_quality') {
        const result = await runAICommandExec(
          tool,
          toolCall.function.arguments['prompt'],
          options.model
        );
        tool_content = JSON.stringify(result);
        tool_status = result.status;
        tool_output = result.content;
      }
      else {
        console.warn(`⚠️ Unknown tool call: ${toolCall.function.name}`);
        tool_content = `⚠️ Unknown tool call: ${toolCall.function.name}`;
      }

      console.log(`\n🛠 Tool Call: ${toolCall.function.name}`);
      console.log(`Status: ${tool_status}`);
      console.log(tool_output);

      messages.push({
        role: 'tool',
        tool_name: toolCall.function.name,
        content: tool_content
      });
    }
  }

}


/**
 * Run an AI CLI command and stream output
 */
interface RunOptions {
  verbose?: boolean;
  model?: string;
  autoApprove?: boolean;
  currentBranchOnly?: boolean;
}

async function runAICommand(
  tool: 'copilot' | 'claude',
  prompt: string,
  options: RunOptions = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    // Build command flags
    const flags: string[] = [];

    // Auto-approve flag (tool-specific)
    if (options.autoApprove !== false) {
      flags.push(tool === 'copilot' ? '--allow-all-tools' : '--dangerously-skip-permissions');
    }

    // Model flag (tool-specific)
    if (options.model) {
      flags.push(`--model ${options.model}`);
    }

    const escapedPrompt = prompt.replace(/"/g, '\\"');
    const fullCommand = `${tool} ${flags.join(' ')} -p "${escapedPrompt}"`.trim();

    // Always show the full command being run
    console.log(`   $ ${fullCommand}`);
    console.log('');

    // Set up environment with workflow options
    const env = { ...process.env };
    if (options.currentBranchOnly) {
      env.SOKOLD_CURRENT_BRANCH_ONLY = 'true';
    }

    const child = spawn(fullCommand, [], {
      cwd: process.cwd(),
      stdio: 'inherit', // Stream output directly to terminal
      shell: true,
      env,
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', (err) => {
      console.error(`Failed to start ${tool}:`, err.message);
      resolve(false);
    });
  });
}

/**
 * Run `specify init` to initialize SpecKit in the current directory
 * Exported so it can be called directly from CLI init command
 */
export async function runSpecifyInit(
  tool: 'copilot' | 'claude',
  verbose?: boolean
): Promise<boolean> {
  return new Promise((resolve) => {
    const aiFlag = tool === 'copilot' ? 'copilot' : 'claude';
    const command = `specify init --here --ai ${aiFlag} --force`;

    if (verbose) {
      console.log(`   $ ${command}`);
    }

    const child = spawn(command, [], {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', (err) => {
      console.error('Failed to run specify init:', err.message);
      resolve(false);
    });
  });
}

/**
 * Run the constitution step to create project principles
 * Analyzes existing code if present, otherwise uses the feature description
 */
async function runConstitutionStep(
  tool: 'copilot' | 'claude',
  description: string,
  hasExistingCode: boolean,
  options: PipelineOptions
): Promise<boolean> {
  let prompt: string;

  if (hasExistingCode) {
    // Existing project - analyze it to create constitution
    prompt = `${STEP_AGENTS.constitution} Analyze this existing project and create a constitution based on:
1. The existing code structure, languages, and patterns used
2. Any existing README, package.json, or config files that indicate project standards
3. The coding style and conventions already in place

Create a constitution that reflects the project's current practices and principles.
Keep it concise but comprehensive. Focus on principles that will guide future AI-assisted development.`;
  } else {
    // New project - use the feature description to seed the constitution
    prompt = `${STEP_AGENTS.constitution} Create a constitution for a new project based on this initial feature request:
"${description}"

Infer appropriate principles based on:
1. The type of project/feature being requested
2. Common best practices for similar projects
3. Cross-platform compatibility, testing, and documentation standards

Keep the constitution concise but set a solid foundation for the project.`;
  }

  console.log(`\n⚡ Running: constitution (auto-generate)`);
  console.log(`   Context: ${hasExistingCode ? 'Analyzing existing project' : 'Creating from feature description'}`);

  return runAICommand(tool, prompt, {
    verbose: options.verbose,
    model: options.model,
    autoApprove: options.autoApprove ?? true,
    currentBranchOnly: options.currentBranchOnly,
  });
}

/**
 * Print execution summary
 */
function printSummary(summary: ExecutionSummary): void {
  const duration = summary.endTime
    ? Math.round((summary.endTime.getTime() - summary.startTime.getTime()) / 1000)
    : Math.round((new Date().getTime() - summary.startTime.getTime()) / 1000);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 EXECUTION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (summary.stepsCompleted.length > 0) {
    console.log('\n✅ Completed steps:');
    for (const step of summary.stepsCompleted) {
      console.log(`   • ${step}`);
    }
  }

  if (summary.stepsFailed.length > 0) {
    console.log('\n❌ Failed steps:');
    for (const step of summary.stepsFailed) {
      console.log(`   • ${step}`);
    }
  }

  if (summary.fixAttempts > 0) {
    console.log(`\n🔧 Fix attempts: ${summary.fixAttempts}`);
  }

  console.log(`\n⏱️  Duration: ${duration}s`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
