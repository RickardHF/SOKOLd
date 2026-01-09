#!/usr/bin/env node
/**
 * SoKolD CLI - Simple entry point
 * 
 * Usage:
 *   sokold "Your feature description"     # Run full pipeline
 *   sokold --continue                     # Continue from last step
 *   sokold --status                       # Show project status
 *   sokold --help                         # Show help
 */
import { runPipeline } from './pipeline.js';
import { detectProject, getNextStep } from './detect.js';

interface Args {
  description?: string;
  continue?: boolean;
  status?: boolean;
  dryRun?: boolean;
  tool?: 'copilot' | 'claude';
  verbose?: boolean;
  help?: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  const positional: string[] = [];
  
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    
    if (arg === '--continue' || arg === '-c') {
      args.continue = true;
    } else if (arg === '--status' || arg === '-s') {
      args.status = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      args.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--tool' || arg === '-t') {
      const tool = argv[++i];
      if (tool === 'copilot' || tool === 'claude') {
        args.tool = tool;
      }
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }
  
  if (positional.length > 0) {
    args.description = positional.join(' ');
  }
  
  return args;
}

function showHelp(): void {
  console.log(`
🧊 SoKolD - AI-Powered Code Generation

Usage:
  sokold "Your feature description"   Run full pipeline (specify → plan → tasks → implement)
  sokold --continue                   Continue from where you left off
  sokold --status                     Show project status

Options:
  -t, --tool <name>    Use specific AI tool: copilot (default) or claude
  --dry-run            Show what would be done without executing
  -v, --verbose        Show detailed output
  -h, --help           Show this help

Examples:
  sokold "Add user authentication with JWT tokens"
  sokold "Create a REST API for managing todos"
  sokold --continue --tool claude
`);
}

function showStatus(): void {
  const status = detectProject();
  const nextStep = getNextStep(status, false);
  
  console.log('\n🧊 SoKolD - Project Status\n');
  console.log('SpecKit Setup:');
  console.log(`  .specify folder:     ${status.hasSpeckit ? '✓ exists' : '✗ not found'}`);
  console.log(`  specs/ folder:       ${status.hasSpecs ? '✓ exists' : '✗ not found'}`);
  console.log('');
  console.log('Current Feature (specs/main/):');
  console.log(`  spec.md:             ${status.hasSpec ? '✓ exists' : '✗ not found'}`);
  console.log(`  plan.md:             ${status.hasPlan ? '✓ exists' : '✗ not found'}`);
  console.log(`  tasks.md:            ${status.hasTasks ? '✓ exists' : '✗ not found'}`);
  console.log('');
  
  if (nextStep) {
    console.log(`Next step: ${nextStep}`);
    console.log(`Run: sokold --continue`);
  } else if (!status.hasSpec) {
    console.log('No feature in progress. Start one with:');
    console.log('  sokold "Your feature description"');
  } else {
    console.log('All steps complete! Start a new feature with:');
    console.log('  sokold "Your next feature description"');
  }
  console.log('');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  
  if (args.help) {
    showHelp();
    return;
  }
  
  if (args.status) {
    showStatus();
    return;
  }
  
  // Need either a description or --continue
  if (!args.description && !args.continue) {
    showHelp();
    return;
  }
  
  await runPipeline(args.description, {
    dryRun: args.dryRun,
    tool: args.tool,
    verbose: args.verbose,
  });
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
