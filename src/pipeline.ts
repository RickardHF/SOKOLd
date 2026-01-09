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

export interface PipelineOptions {
  dryRun?: boolean;
  tool?: 'copilot' | 'claude';
  model?: string;
  verbose?: boolean;
  autoApprove?: boolean;
  currentBranchOnly?: boolean;
  maxRetries?: number;
}

type Step = 'init' | 'specify' | 'plan' | 'tasks' | 'implement' | 'verify';

const STEP_AGENTS: Record<Exclude<Step, 'init' | 'verify'>, string> = {
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
  
  const summary: ExecutionSummary = {
    stepsCompleted: [],
    stepsFailed: [],
    fixAttempts: 0,
    startTime: new Date(),
  };
  
  console.log('\n🧊 SoKolD - AI-Powered Code Generation\n');
  
  // Show current status
  console.log('📊 Project status:');
  console.log(`   SpecKit initialized: ${status.hasSpeckit ? '✓' : '✗'}`);
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
      
      // Re-detect status after init
      status = detectProject();
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
    const prompt = buildPrompt(step, description);
    console.log(`\n⚡ Running: ${step}`);
    console.log(`   Command: ${tool} -p "${STEP_AGENTS[step]} ..."`);
    console.log('');
    
    const success = await runAICommand(tool, prompt, {
      verbose: options.verbose,
      model: options.model,
      autoApprove: options.autoApprove ?? true,
      currentBranchOnly: options.currentBranchOnly,
    });
    
    if (!success) {
      summary.stepsFailed.push(step);
      console.error(`\n❌ Step "${step}" failed. Fix issues and run again.`);
      printSummary(summary);
      process.exit(1);
    }
    
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
  
  // Continue from where we left off
  const nextStep = getNextStep(status, false);
  if (!nextStep) return [];
  
  const allSteps: Step[] = ['specify', 'plan', 'tasks', 'implement', 'verify'];
  const startIndex = allSteps.indexOf(nextStep as Step);
  return allSteps.slice(startIndex);
}

/** Steps that use speckit agents */
type AgentStep = 'specify' | 'plan' | 'tasks' | 'implement';

/**
 * Build the prompt for a given step
 */
function buildPrompt(step: AgentStep, description?: string): string {
  const agent = STEP_AGENTS[step];
  
  if (step === 'specify' && description) {
    return `${agent} ${description}`;
  }
  
  // Other steps just invoke the agent - it reads context from specs/
  return agent;
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
      if (tool === 'copilot') {
        flags.push(`--model ${options.model}`);
      } else {
        // Claude uses --model as well
        flags.push(`--model ${options.model}`);
      }
    }
    
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    const fullCommand = `${tool} -p "${escapedPrompt}" ${flags.join(' ')}`.trim();
    
    if (options.verbose) {
      console.log(`   $ ${fullCommand}`);
    }

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
 */
async function runSpecifyInit(
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
