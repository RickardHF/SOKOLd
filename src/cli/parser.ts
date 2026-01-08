import { Command } from 'commander';
import { Logger, VerbosityLevel } from '../utils/logger.js';
import { handleError } from '../utils/errors.js';

import { createInitCommand } from './commands/InitCommand.js';
import { createConfigCommand } from './commands/ConfigCommand.js';
import { createImplementCommand } from './commands/ImplementCommand.js';
import { createStatusCommand } from './commands/StatusCommand.js';
import { createResetCommand } from './commands/ResetCommand.js';
import { createDoctorCommand } from './commands/DoctorCommand.js';
import { createSetupCommand } from './commands/SetupCommand.js';
import { defaultAction } from './commands/DefaultCommand.js';

const VERSION = '1.0.0';

export const program = new Command();

program
  .name('sokold')
  .description('AI-powered code generation CLI - transform natural language descriptions into working code')
  .version(VERSION, '-v, --version', 'Display version information')
  .argument('[description...]', 'Natural language description of the feature to create')
  .option('--verbose', 'Enable verbose output')
  .option('--debug', 'Enable debug logging')
  .option('-q, --quiet', 'Suppress non-error output')
  .option('--config <path>', 'Use custom config file')
  .option('--no-color', 'Disable colored output')
  .option('--dry-run', 'Preview what would happen without executing')
  .option('--continue', 'Continue from last checkpoint')
  .option('--tool <name>', 'Use specific AI tool (copilot|claude)')
  .option('--review', 'Review generated spec before implementation')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    
    const logger = Logger.getInstance();
    
    if (opts.debug) {
      logger.setVerbosity(VerbosityLevel.DEBUG);
    } else if (opts.verbose) {
      logger.setVerbosity(VerbosityLevel.VERBOSE);
    } else if (opts.quiet) {
      logger.setVerbosity(VerbosityLevel.QUIET);
    }

    if (opts.noColor) {
      logger.setNoColor(true);
    }
  })
  .action(defaultAction);

// Register subcommands (for advanced usage)
program.addCommand(createSetupCommand());
program.addCommand(createConfigCommand());
program.addCommand(createStatusCommand());
program.addCommand(createDoctorCommand());
program.addCommand(createResetCommand());

// Keep these as hidden/advanced commands
program.addCommand(createInitCommand().description('(Advanced) Initialize SpecKit structure manually'));
program.addCommand(createImplementCommand().description('(Advanced) Run implementation step manually'));

// Error handling
program.exitOverride((err) => {
  if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
    process.exit(0);
  }
  handleError(err);
});
