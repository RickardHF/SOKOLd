#!/usr/bin/env node
/**
 * SOKOLd CLI - Simple entry point
 * 
 * Usage:
 *   sokold "Your feature description"     # Run full pipeline
 *   sokold --continue                     # Continue from last step
 *   sokold --status                       # Show project status
 *   sokold config <command>               # Manage configuration
 *   sokold --help                         # Show help
 */
import { runPipeline, runSpecifyInit } from './pipeline.js';
import { detectProject, getNextStep } from './detect.js';
import { 
  loadConfig, 
  getConfigValue, 
  setConfigValue, 
  listConfig, 
  getConfigKeys,
  validateConfigValue,
  getConfigPath,
  initConfig,
  hasConfig,
} from './config.js';
import {
  patchSpeckit,
  unpatchSpeckit,
  printSpeckitStatus,
} from './speckit-patch.js';
import {
  loadState,
  getNextStepFromState,
} from './state.js';
import {
  getRecentHistory,
  getHistoryEntry,
  formatHistory,
  formatHistoryEntry,
  addRunNote,
} from './history.js';

interface Args {
  description?: string;
  continue?: boolean;
  status?: boolean;
  dryRun?: boolean;
  tool?: 'copilot' | 'claude';
  model?: string;
  verbose?: boolean;
  help?: boolean;
  init?: boolean;
  configCommand?: 'get' | 'set' | 'list' | 'path';
  configKey?: string;
  configValue?: string;
  speckitCommand?: 'patch' | 'unpatch' | 'status';
  historyCommand?: 'list' | 'show' | 'note';
  historyIndex?: number;
  historyNote?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  const positional: string[] = [];
  
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    
    // Handle 'init' command (sokold init)
    if (arg === 'init' && i === 2) {
      args.init = true;
      continue;
    }
    
    // Handle 'status' command (sokold status)
    if (arg === 'status' && i === 2) {
      args.status = true;
      continue;
    }
    
    // Handle 'config' subcommand (sokold config set/get/list/path)
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
    
    // Handle 'speckit' subcommand (sokold speckit patch/unpatch/status)
    if (arg === 'speckit' && i === 2) {
      const subCmd = argv[++i];
      if (subCmd === 'patch' || subCmd === 'unpatch' || subCmd === 'status') {
        args.speckitCommand = subCmd;
      } else {
        args.speckitCommand = 'status'; // default to status if no valid subcommand
      }
      continue;
    }
    
    // Handle 'history' subcommand (sokold history [index] / sokold history note <text>)
    if (arg === 'history' && i === 2) {
      const nextArg = argv[i + 1];
      if (nextArg === 'note') {
        args.historyCommand = 'note';
        i++; // skip 'note'
        // Collect rest as note text
        const noteArgs: string[] = [];
        while (i + 1 < argv.length) {
          noteArgs.push(argv[++i]);
        }
        args.historyNote = noteArgs.join(' ');
      } else if (nextArg && !nextArg.startsWith('-')) {
        // Numeric index for show
        const idx = parseInt(nextArg, 10);
        if (!isNaN(idx)) {
          args.historyCommand = 'show';
          args.historyIndex = idx;
          i++; // skip the index
        } else {
          args.historyCommand = 'list';
        }
      } else {
        args.historyCommand = 'list';
      }
      continue;
    }
    
    // Handle shorthand: sokold set <key> <value> → sokold config set <key> <value>
    if (arg === 'set' && i === 2) {
      args.configCommand = 'set';
      args.configKey = argv[++i];
      args.configValue = argv[++i];
      continue;
    }
    
    // Handle shorthand: sokold get <key> → sokold config get <key>
    if (arg === 'get' && i === 2) {
      args.configCommand = 'get';
      args.configKey = argv[++i];
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
   _____ ____  _  __ ____  _      _____  
  / ___// __ \\| |/ // __ \\| |    |  __ \\ 
  \\__ \\| |  | |   /| |  | | |    | |  | |
 ___) | |__| | . \\| |__| | |____| |__| |
|____/ \\____/|_|\\_\\____/|______|_____/ 

Usage:
  sokold init                         Initialize SOKOLd and SpecKit (setup only, no workflow)
  sokold "Your feature description"   Run full pipeline (specify → plan → tasks → implement → verify)
  sokold --continue                   Continue from where you left off
  sokold status                       Show project status

Commands:
  sokold init                     Initialize SpecKit in the current directory
  sokold status                   Show project status (same as --status)
  sokold set <key> <value>        Quick config (shorthand for config set)
  sokold get <key>                Quick config (shorthand for config get)
  sokold config <command>         Manage configuration

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

History Commands:
  sokold history                  Show recent run history
  sokold history <n>              Show details of run #n (0 = most recent)
  sokold history note <text>      Add a note to the most recent run

SpecKit Commands:
  sokold speckit patch            Patch SpecKit scripts for branch control
  sokold speckit unpatch          Remove patches, restore original scripts
  sokold speckit status           Show current patch status

Config Keys:
  tool                        AI CLI tool: copilot or claude
  model                       Model to use (e.g., gpt-4, claude-3-opus)
  autoApprove                 Auto-approve tool calls (true/false)
  verbose                     Verbose output (true/false)
  output.colors               Enable colors (true/false)
  output.format               Output format: human or json
  workflow.currentBranchOnly  Force all features to current branch (true/false)
  workflow.autoConstitution   (Experimental) Auto-create constitution if missing (true/false)

Examples:
  sokold init                              # First-time setup
  sokold "Add user authentication"         # Start a new feature
  sokold --continue                        # Resume work on current feature
  sokold status                            # Check project status
  sokold set tool claude                   # Switch to Claude
  sokold history                           # View recent runs
  sokold history 0                         # Details of the last run
`);
}

function showStatus(): void {
  const status = detectProject();
  const state = loadState();
  const stateNextStep = getNextStepFromState();
  const fileNextStep = getNextStep(status, false);
  const nextStep = stateNextStep || fileNextStep;
  const config = loadConfig();
  
  console.log('\n🧊 SOKOLd - Project Status\n');
  console.log('SpecKit Setup:');
  console.log(`  .specify folder:     ${status.hasSpeckit ? '✓ exists' : '✗ not found'}`);
  console.log(`  constitution:        ${status.hasConstitution ? '✓ exists' : '✗ not found'}`);
  console.log(`  specs/ folder:       ${status.hasSpecs ? '✓ exists' : '✗ not found'}`);
  console.log('');
  console.log('Current Feature (specs/main/):');
  console.log(`  spec.md:             ${status.hasSpec ? '✓ exists' : '✗ not found'}`);
  console.log(`  plan.md:             ${status.hasPlan ? '✓ exists' : '✗ not found'}`);
  console.log(`  tasks.md:            ${status.hasTasks ? '✓ exists' : '✗ not found'}`);
  console.log('');
  
  // Show auto-constitution status if relevant
  if (!status.hasConstitution) {
    if (config.workflow.autoConstitution) {
      console.log('📜 Constitution: Will be auto-created on next feature run');
    } else {
      console.log('📜 Constitution: Not found (enable workflow.autoConstitution to auto-create)');
    }
    console.log('');
  }
  
  // Show pipeline state if available
  if (state) {
    console.log('Pipeline State:');
    if (state.description) {
      console.log(`  Feature:           "${state.description}"`);
    }
    console.log(`  Started:           ${new Date(state.startedAt).toLocaleString()}`);
    console.log(`  Completed steps:   ${state.completedSteps.length > 0 ? state.completedSteps.join(' → ') : '(none)'}`);
    if (state.currentStep) {
      console.log(`  In progress:       ${state.currentStep}`);
    }
    console.log('');
  }
  
  if (nextStep) {
    console.log(`Next step: ${nextStep}`);
    console.log(`Run: sokold --continue`);
  } else if (!status.hasSpec && !state) {
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
      console.log('\n🧊 SOKOLd Configuration\n');
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

function handleSpeckitCommand(args: Args): void {
  switch (args.speckitCommand) {
    case 'patch': {
      console.log('\n🧊 Patching SpecKit scripts...\n');
      const result = patchSpeckit();
      for (const detail of result.details) {
        console.log(`  ${detail}`);
      }
      if (result.success) {
        console.log('\n✅ SpecKit patched successfully.');
        console.log('   Set workflow.currentBranchOnly=true to enable branch control.\n');
      } else {
        console.error('\n❌ Patching failed.\n');
        process.exit(1);
      }
      break;
    }
    case 'unpatch': {
      console.log('\n🧊 Removing SpecKit patches...\n');
      const result = unpatchSpeckit();
      for (const detail of result.details) {
        console.log(`  ${detail}`);
      }
      if (result.success) {
        console.log('\n✅ SpecKit patches removed.\n');
      } else {
        console.error('\n❌ Unpatch failed.\n');
        process.exit(1);
      }
      break;
    }
    case 'status': {
      printSpeckitStatus();
      break;
    }
  }
}

function handleHistoryCommand(args: Args): void {
  switch (args.historyCommand) {
    case 'list': {
      console.log('\n🧊 SOKOLd - Run History\n');
      const entries = getRecentHistory(10);
      if (entries.length === 0) {
        console.log('No history entries yet. Run a feature to create history.\n');
      } else {
        console.log(formatHistory(entries, args.verbose ?? false));
        console.log(`Showing ${entries.length} most recent runs.`);
        console.log('Use "sokold history <n>" to see details (0 = most recent).\n');
      }
      break;
    }
    case 'show': {
      const index = args.historyIndex ?? 0;
      const entry = getHistoryEntry(index);
      if (!entry) {
        console.error(`No history entry at index ${index}.`);
        const entries = getRecentHistory(1);
        if (entries.length === 0) {
          console.error('No history entries found.');
        } else {
          console.error(`Valid indices: 0-${entries.length - 1}`);
        }
        process.exit(1);
      }
      console.log('\n🧊 SOKOLd - Run Details\n');
      console.log(formatHistoryEntry(entry, true));
      console.log('');
      break;
    }
    case 'note': {
      if (!args.historyNote) {
        console.error('Usage: sokold history note <text>');
        process.exit(1);
      }
      addRunNote(args.historyNote);
      console.log(`✓ Note added to most recent run.`);
      break;
    }
  }
}

async function handleInit(args: Args): Promise<void> {
  const config = loadConfig();
  const tool = args.tool ?? config.tool;
  const verbose = args.verbose ?? config.verbose;
  const status = detectProject();
  const configExists = hasConfig();
  
  console.log(`
   _____ ____  _  __ ____  _      _____  
  / ___// __ \\| |/ // __ \\| |    |  __ \\ 
  \\__ \\| |  | |   /| |  | | |    | |  | |
 ___) | |__| | . \\| |__| | |____| |__| |
|____/ \\____/|_|\\_\\____/|______|_____/ 

🔧 Initializing SOKOLd...
`);

  // Check if already fully initialized
  if (status.hasSpeckit && configExists) {
    console.log('✓ Already initialized:');
    console.log('  • SpecKit (.specify folder)');
    console.log('  • SOKOLd config (.sokold/config.yaml)');
    console.log('');
    console.log('Ready to use! Start a feature with:');
    console.log('  sokold "Your feature description"');
    console.log('');
    return;
  }

  console.log(`Using AI tool: ${tool}`);
  console.log('');
  
  // Step 1: Initialize SpecKit if needed
  if (!status.hasSpeckit) {
    console.log('Setting up SpecKit...');
    const success = await runSpecifyInit(tool, verbose);
    
    if (!success) {
      console.error('\n❌ Failed to initialize SpecKit.');
      console.error('   Try running manually: specify init --here');
      process.exit(1);
    }
    console.log('✓ SpecKit initialized (.specify folder created)');
  } else {
    console.log('✓ SpecKit already initialized');
  }
  
  // Step 2: Create SOKOLd config if needed
  if (!configExists) {
    const created = initConfig();
    if (created) {
      console.log('✓ SOKOLd config created (.sokold/config.yaml)');
    }
  } else {
    console.log('✓ SOKOLd config already exists');
  }
  
  console.log('');
  console.log('✅ SOKOLd initialized successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Start a new feature:  sokold "Your feature description"');
  console.log('  2. Check status:         sokold --status');
  console.log('  3. Customize settings:   sokold config list');
  console.log('');
  console.log('Config file location: .sokold/config.yaml');
  console.log('');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  
  if (args.help) {
    showHelp();
    return;
  }
  
  if (args.init) {
    await handleInit(args);
    return;
  }
  
  if (args.configCommand) {
    handleConfigCommand(args);
    return;
  }
  
  if (args.speckitCommand) {
    handleSpeckitCommand(args);
    return;
  }
  
  if (args.historyCommand) {
    handleHistoryCommand(args);
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
  const currentBranchOnly = config.workflow.currentBranchOnly;
  const autoConstitution = config.workflow.autoConstitution;
  
  // Need either a description or --continue to run the pipeline
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
    currentBranchOnly,
    autoConstitution,
  });
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Fatal error:', message);
  process.exit(1);
});
