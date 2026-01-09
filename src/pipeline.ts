/**
 * Pipeline - runs AI CLI commands to execute speckit workflow
 * 
 * This is intentionally simple. We delegate ALL the work to the AI CLI.
 * No file manipulation, no template management, no complex state tracking.
 */
import { spawn } from 'child_process';
import { detectProject, getNextStep } from './detect.js';

export interface PipelineOptions {
  dryRun?: boolean;
  tool?: 'copilot' | 'claude';
  verbose?: boolean;
}

type Step = 'specify' | 'plan' | 'tasks' | 'implement';

const STEP_AGENTS: Record<Step, string> = {
  specify: '@speckit.specify',
  plan: '@speckit.plan', 
  tasks: '@speckit.tasks',
  implement: '@speckit.implement',
};

/**
 * Run the full pipeline from description to implementation
 */
export async function runPipeline(
  description: string | undefined,
  options: PipelineOptions = {}
): Promise<void> {
  const tool = options.tool ?? 'copilot';
  const status = detectProject();
  
  console.log('\n🧊 SoKolD - AI-Powered Code Generation\n');
  
  // Show current status
  console.log('📊 Project status:');
  console.log(`   SpecKit initialized: ${status.hasSpeckit ? '✓' : '✗'}`);
  console.log(`   Has specification:   ${status.hasSpec ? '✓' : '✗'}`);
  console.log(`   Has plan:            ${status.hasPlan ? '✓' : '✗'}`);
  console.log(`   Has tasks:           ${status.hasTasks ? '✓' : '✗'}`);
  console.log('');

  // Determine what to do
  const steps = determineSteps(status, description);
  
  if (steps.length === 0) {
    console.log('✅ Nothing to do. Provide a description to start a new feature.');
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

  // Execute each step
  for (const step of steps) {
    const prompt = buildPrompt(step, description);
    console.log(`\n⚡ Running: ${step}`);
    console.log(`   Command: ${tool} -p "${STEP_AGENTS[step]} ..."`);
    console.log('');
    
    const success = await runAICommand(tool, prompt, options.verbose);
    
    if (!success) {
      console.error(`\n❌ Step "${step}" failed. Fix issues and run again.`);
      process.exit(1);
    }
    
    console.log(`✓ ${step} completed`);
  }

  console.log('\n✅ Pipeline completed successfully!\n');
}

/**
 * Determine which steps need to run
 */
function determineSteps(status: ReturnType<typeof detectProject>, description?: string): Step[] {
  // New feature - run full pipeline
  if (description) {
    return ['specify', 'plan', 'tasks', 'implement'];
  }
  
  // Continue from where we left off
  const nextStep = getNextStep(status, false);
  if (!nextStep) return [];
  
  const allSteps: Step[] = ['specify', 'plan', 'tasks', 'implement'];
  const startIndex = allSteps.indexOf(nextStep as Step);
  return allSteps.slice(startIndex);
}

/**
 * Build the prompt for a given step
 */
function buildPrompt(step: Step, description?: string): string {
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
async function runAICommand(
  tool: 'copilot' | 'claude',
  prompt: string,
  verbose?: boolean
): Promise<boolean> {
  return new Promise((resolve) => {
    // Build the full command as a single string to handle quoting properly
    const autoApprove = tool === 'copilot' ? '--allow-all-tools' : '--dangerously-skip-permissions';
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    const fullCommand = `${tool} -p "${escapedPrompt}" ${autoApprove}`;
    
    if (verbose) {
      console.log(`   $ ${fullCommand}`);
    }

    const child = spawn(fullCommand, [], {
      cwd: process.cwd(),
      stdio: 'inherit', // Stream output directly to terminal
      shell: true,
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
