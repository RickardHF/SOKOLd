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
import { detectProject, getNextStep } from './detect.js';
import { patchSpeckit } from './speckit-patch.js';
import {
  initState,
  markStepStarted,
  markStepCompleted,
  getNextStepFromState,
  clearState,
  type PipelineStep,
} from './state.js';

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
  let status = detectProject();
  
  // Initialize or load state
  if (description) {
    // Starting a new feature - clear any old state
    clearState();
    initState(description);
  }
  
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

  // Determine what steps to run
  const steps = determineSteps(status, description);
  
  if (steps.length === 0) {
    console.log('✅ Nothing to do. Provide a description to start a new feature.');
    printSummary(summary);
    return;
  }

  console.log('📋 Execution plan:');
  for (const step of steps) {
    console.log(`   → ${step}`);
  }
  console.log('');

  if (options.dryRun) {
    console.log('🔸 Dry run - no commands will be executed');
    return;
  }

  // Step 2: Execute speckit workflow steps (skip init and verify - handled separately)
  const agentSteps = steps.filter((s): s is AgentStep => 
    s !== 'init' && s !== 'verify'
  );
  
  for (const step of agentSteps) {
    // Track that we're starting this step
    markStepStarted(step);
    
    const prompt = buildPrompt(step, description, options.currentBranchOnly);
    console.log(`\n⚡ Running: ${step}`);
    console.log(`   Command: ${tool} -p "${STEP_AGENTS[step]} ..."${options.model ? ` --model ${options.model}` : ''}`);
    console.log('');
    
    const success = await runAICommand(tool, prompt, {
      verbose: options.verbose,
      model: options.model,
      autoApprove: options.autoApprove ?? true,
      currentBranchOnly: options.currentBranchOnly,
    });
    
    if (!success) {
      summary.stepsFailed.push(step);
      console.error(`\n❌ Step "${step}" failed. Fix issues and run "sokold --continue" to retry.`);
      printSummary(summary);
      process.exit(1);
    }
    
    // Track completion
    markStepCompleted(step);
    summary.stepsCompleted.push(step);
    console.log(`✓ ${step} completed`);
  }

  // Step 3: Verify and fix loop
  if (steps.includes('implement')) {
    console.log('\n🔍 Verifying implementation...\n');
    
    let verified = false;
    let attempts = 0;
    
    while (!verified && attempts < maxRetries) {
      const verifySuccess = await runVerification(tool, options);
      
      if (verifySuccess) {
        verified = true;
        summary.stepsCompleted.push('verify');
        console.log('✓ Verification passed');
      } else {
        attempts++;
        summary.fixAttempts = attempts;
        
        if (attempts < maxRetries) {
          console.log(`\n🔧 Issues found. Attempting fix (${attempts}/${maxRetries})...\n`);
          await runFixAttempt(tool, options);
        } else {
          console.log(`\n⚠️ Max fix attempts reached (${maxRetries}). Manual review may be needed.`);
          summary.stepsFailed.push('verify');
        }
      }
    }
  }

  summary.endTime = new Date();
  console.log('\n✅ Pipeline completed!\n');
  printSummary(summary);
}

/**
 * Determine which steps need to run
 */
function determineSteps(status: ReturnType<typeof detectProject>, description?: string): Step[] {
  // New feature - run full pipeline with verify
  if (description) {
    return ['specify', 'plan', 'tasks', 'implement', 'verify'];
  }
  
  // Continue from where we left off - first check state, then fall back to file detection
  const allSteps: Step[] = ['specify', 'plan', 'tasks', 'implement', 'verify'];
  
  // Check state first (more reliable)
  const stateNextStep = getNextStepFromState();
  if (stateNextStep) {
    const startIndex = allSteps.indexOf(stateNextStep);
    return allSteps.slice(startIndex);
  }
  
  // Fall back to file-based detection
  const nextStep = getNextStep(status, false);
  if (!nextStep) return [];
  
  const startIndex = allSteps.indexOf(nextStep as Step);
  return allSteps.slice(startIndex);
}

/** Steps that use speckit agents */
type AgentStep = 'specify' | 'plan' | 'tasks' | 'implement';

/**
 * Build the prompt for a given step
 */
function buildPrompt(step: AgentStep, description?: string, currentBranchOnly?: boolean): string {
  const agent = STEP_AGENTS[step];
  
  // Add current-branch-only instructions when enabled
  const branchInstructions = currentBranchOnly 
    ? `

IMPORTANT: Current-branch-only mode is enabled. Do NOT create new git branches. Do NOT run any git checkout or git branch commands. Work entirely on the current branch. Place all specification files in specs/main/ directory instead of creating numbered directories like specs/001-feature-name/. Skip any branch-related setup scripts.`
    : '';
  
  if (step === 'specify' && description) {
    return `${agent} ${description}${branchInstructions}`;
  }
  
  // Other steps just invoke the agent - it reads context from specs/
  return `${agent}${branchInstructions}`;
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
 * Run verification step - check for errors, run tests/build/lint via AI
 */
async function runVerification(
  tool: 'copilot' | 'claude',
  options: PipelineOptions
): Promise<boolean> {
  const verifyPrompt = `Check this project for errors. Run the build, tests, and linting. 
Report any issues found. If everything passes, respond with "All checks passed".
If there are errors, list them clearly so they can be fixed.`;

  return runAICommand(tool, verifyPrompt, {
    verbose: options.verbose,
    model: options.model,
    autoApprove: options.autoApprove ?? true,
    currentBranchOnly: options.currentBranchOnly,
  });
}

/**
 * Run fix attempt - ask AI to fix any issues found
 */
async function runFixAttempt(
  tool: 'copilot' | 'claude',
  options: PipelineOptions
): Promise<boolean> {
  const fixPrompt = `There were errors in the previous verification. 
Please analyze the errors, fix all issues, and ensure the code compiles, tests pass, and linting is clean.
Make the necessary changes to fix all problems.`;

  return runAICommand(tool, fixPrompt, {
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
