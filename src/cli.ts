#!/usr/bin/env node
/**
 * SoKolD CLI - Simple entry point
 * 
 * Usage:
 *   sokold "Your feature description"     # Run full pipeline
 *   sokold --continue                     # Continue from last step
 *   sokold --status                       # Show project status
 *   sokold config <command>               # Manage configuration
 *   sokold --help                         # Show help
 */
import { runPipeline } from './pipeline.js';
import { detectProject, getNextStep } from './detect.js';
import { 
  loadConfig, 
  getConfigValue, 
  setConfigValue, 
  listConfig, 
  getConfigKeys,
  validateConfigValue,
  getConfigPath,
} from './config.js';

interface Args {
  description?: string;
  continue?: boolean;
  status?: boolean;
  dryRun?: boolean;
  tool?: 'copilot' | 'claude';
  model?: string;
  verbose?: boolean;
  help?: boolean;
  configCommand?: 'get' | 'set' | 'list' | 'path';
  configKey?: string;
  configValue?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  const positional: string[] = [];
  
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    
    // Handle 'config' subcommand
    if (arg === 'config' && i === 2) {
      const subCmd = argv[++i];
      if (subCmd === 'get' || subCmd === 'set' || subCmd === 'list' || subCmd === 'path') {
        args.configCommand = subCmd;
        if (subCmd === 'get' || subCmd === 'set') {
          args.configKey = argv[++i];
        }
        if (subCmd === 'set') {
          args.configValue = argv[++i];
        }
      } else {
        args.configCommand = 'list'; // default to list if no valid subcommand
      }
      continue;
    }
    
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
    } else if (arg === '--model' || arg === '-m') {
      args.model = argv[++i];
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
  sokold config <command>             Manage configuration

Options:
  -t, --tool <name>    Use specific AI tool: copilot (default) or claude
  -m, --model <name>   Use specific model (e.g., gpt-4, claude-3-opus)
  --dry-run            Show what would be done without executing
  -v, --verbose        Show detailed output
  -h, --help           Show this help

Config Commands:
  sokold config list              Show all settings
  sokold config get <key>         Get a specific setting
  sokold config set <key> <val>   Set a specific setting
  sokold config path              Show config file path

Config Keys:
  tool          AI CLI tool: copilot or claude
  model         Model to use (e.g., gpt-4, claude-3-opus)
  autoApprove   Auto-approve tool calls (true/false)
  verbose       Verbose output (true/false)
  output.colors Enable colors (true/false)
  output.format Output format: human or json

Examples:
  sokold "Add user authentication with JWT tokens"
  sokold "Create a REST API for managing todos"
  sokold --continue --tool claude
  sokold config set tool claude
  sokold config set model gpt-4
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

function handleConfigCommand(args: Args): void {
  switch (args.configCommand) {
    case 'list': {
      const config = listConfig();
      const keys = getConfigKeys();
      console.log('\n🧊 SoKolD Configuration\n');
      for (const [key, value] of Object.entries(config)) {
        const desc = keys[key] || '';
        const displayValue = value === undefined ? '(not set)' : String(value);
        console.log(`  ${key}: ${displayValue}`);
        if (desc) {
          console.log(`    └─ ${desc}`);
        }
      }
      console.log('');
      break;
    }
    case 'get': {
      if (!args.configKey) {
        console.error('Usage: sokold config get <key>');
        process.exit(1);
      }
      const value = getConfigValue(args.configKey);
      if (value === undefined) {
        console.log(`${args.configKey}: (not set)`);
      } else {
        console.log(`${args.configKey}: ${value}`);
      }
      break;
    }
    case 'set': {
      if (!args.configKey || args.configValue === undefined) {
        console.error('Usage: sokold config set <key> <value>');
        process.exit(1);
      }
      const error = validateConfigValue(args.configKey, args.configValue);
      if (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
      setConfigValue(args.configKey, args.configValue);
      console.log(`✓ Set ${args.configKey} = ${args.configValue}`);
      break;
    }
    case 'path': {
      console.log(getConfigPath());
      break;
    }
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  
  if (args.help) {
    showHelp();
    return;
  }
  
  if (args.configCommand) {
    handleConfigCommand(args);
    return;
  }
  
  if (args.status) {
    showStatus();
    return;
  }
  
  // Load config and merge with CLI args
  const config = loadConfig();
  const tool = args.tool ?? config.tool;
  const model = args.model ?? config.model;
  const verbose = args.verbose ?? config.verbose;
  
  // Need either a description or --continue
  if (!args.description && !args.continue) {
    showHelp();
    return;
  }
  
  await runPipeline(args.description, {
    dryRun: args.dryRun,
    tool,
    model,
    verbose,
    autoApprove: config.autoApprove,
  });
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Fatal error:', message);
  process.exit(1);
});
