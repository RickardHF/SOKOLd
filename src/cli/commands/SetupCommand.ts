/**
 * Setup command
 * Initializes or updates speckit and sokold configurations in a repository
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { Logger } from '../../utils/logger.js';
import { resolvePath } from '../../utils/filesystem.js';
import {
  handleError,
  SetupExitCodes,
  PermissionError,
  AmbiguityError,
  SetupValidationError
} from '../../utils/errors.js';
import { executeSetup, SetupOptions } from '../../core/setup/orchestrator.js';
import { RepositoryStateType } from '../../types/repository-state.js';
import { SetupResult, OperationStatus } from '../../types/setup-operation.js';

export interface SetupCommandOptions {
  description?: string;
  language?: string;
  framework?: string;
  force?: boolean;
  dryRun?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  skipValidation?: boolean;
  outputJson?: boolean;
}

/**
 * Format state type for display
 */
function formatStateType(type: RepositoryStateType): string {
  const stateDescriptions: Record<RepositoryStateType, string> = {
    [RepositoryStateType.EMPTY]: 'Empty repository',
    [RepositoryStateType.UNCONFIGURED]: 'Existing code, no configuration',
    [RepositoryStateType.PARTIAL_SPECKIT]: 'Speckit only, missing sokold',
    [RepositoryStateType.PARTIAL_SOKOLD]: 'Sokold only, missing speckit',
    [RepositoryStateType.FULL]: 'Fully configured',
    [RepositoryStateType.CORRUPTED]: 'Configuration corrupted'
  };
  return stateDescriptions[type] ?? type;
}

/**
 * Display human-readable progress output
 */
function displayProgress(logger: Logger, message: string, options: SetupCommandOptions): void {
  if (!options.quiet) {
    logger.progress(message);
  }
}

/**
 * Display human-readable setup result
 */
function displayResult(logger: Logger, result: SetupResult, options: SetupCommandOptions): void {
  if (options.quiet && result.success) {
    return;
  }

  if (options.outputJson) {
    console.log(JSON.stringify({
      success: result.success,
      repositoryState: {
        type: result.repositoryState.type,
        hasSpeckit: result.repositoryState.hasSpeckit,
        hasSokold: result.repositoryState.hasSokold,
        hasSourceFiles: result.repositoryState.hasSourceFiles,
        isValid: result.repositoryState.isValid
      },
      summary: result.summary,
      duration: result.duration,
      warnings: result.warnings
    }, null, 2));
    return;
  }

  logger.blank();

  if (result.success) {
    logger.success('Setup complete!');
  } else {
    logger.error('Setup failed');
  }

  logger.blank();
  logger.info('Summary:');
  logger.info(`  Files created: ${result.summary.filesCreated}`);
  logger.info(`  Files updated: ${result.summary.filesUpdated}`);
  logger.info(`  Files skipped: ${result.summary.filesSkipped}`);
  logger.info(`  Directories created: ${result.summary.directoriesCreated}`);
  
  if (result.summary.customValuesPreserved > 0) {
    logger.info(`  Custom values preserved: ${result.summary.customValuesPreserved}`);
  }
  
  if (result.summary.configsValidated > 0) {
    logger.info(`  Configs validated: ${result.summary.configsValidated}`);
  }

  logger.info(`  Duration: ${(result.duration / 1000).toFixed(2)}s`);

  if (result.warnings.length > 0) {
    logger.blank();
    logger.warning('Warnings:');
    for (const warning of result.warnings) {
      logger.warning(`  - ${warning}`);
    }
  }

  // Show verbose operation details
  if (options.verbose) {
    logger.blank();
    logger.info('Operations:');
    for (const op of result.operations) {
      const status = op.status === OperationStatus.COMPLETED ? chalk.green('✓') :
                    op.status === OperationStatus.SKIPPED ? chalk.yellow('⊙') :
                    op.status === OperationStatus.FAILED ? chalk.red('✗') : '?';
      logger.info(`  ${status} ${op.action}: ${op.targetPath}`);
      if (op.metadata.reason) {
        logger.info(`    Reason: ${op.metadata.reason}`);
      }
    }
  }
}

/**
 * Setup command handler
 */
export async function setupCommand(
  targetPath: string | undefined,
  options: SetupCommandOptions
): Promise<void> {
  const logger = Logger.getInstance();
  const rootPath = resolvePath(targetPath ?? process.cwd());

  try {
    displayProgress(logger, '🔍 Detecting repository state...', options);

    const setupOptions: SetupOptions = {
      userDescription: options.description,
      language: options.language,
      framework: options.framework,
      force: options.force,
      dryRun: options.dryRun,
      quiet: options.quiet,
      verbose: options.verbose,
      skipValidation: options.skipValidation
    };

    const result = await executeSetup(rootPath, setupOptions);

    // Display state detection result
    if (!options.quiet && !options.outputJson) {
      logger.success(`Repository state: ${formatStateType(result.repositoryState.type)}`);
      
      if (options.dryRun) {
        logger.warning('Dry run mode - no changes applied');
        logger.blank();
        logger.info('Operations that would be performed:');
        for (const op of result.operations) {
          logger.info(`  - ${op.action}: ${op.targetPath}`);
        }
      }
    }

    displayResult(logger, result, options);

    if (!result.success) {
      process.exit(SetupExitCodes.VALIDATION);
    }

  } catch (error) {
    if (options.outputJson) {
      console.log(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }, null, 2));
    }

    if (error instanceof AmbiguityError) {
      logger.error(error.message);
      logger.blank();
      logger.info('Available options:');
      for (const opt of error.options) {
        logger.info(`  - ${opt}`);
      }
      logger.blank();
      logger.info('To resolve, specify one of:');
      logger.info('  sokold setup --language <lang>');
      logger.info('  sokold setup --framework <framework>');
      process.exit(SetupExitCodes.AMBIGUITY);
    }

    if (error instanceof PermissionError) {
      logger.error(error.message);
      process.exit(SetupExitCodes.PERMISSION);
    }

    if (error instanceof SetupValidationError) {
      logger.error(error.message);
      for (const err of error.validationErrors) {
        logger.error(`  - ${err}`);
      }
      process.exit(SetupExitCodes.VALIDATION);
    }

    handleError(error);
  }
}

/**
 * Create setup command
 */
export function createSetupCommand(): Command {
  return new Command('setup')
    .description('Initialize or update speckit and sokold configurations')
    .argument('[path]', 'Target repository path (defaults to current directory)')
    .option('-d, --description <text>', 'Project description (for new repositories)')
    .option('-l, --language <lang>', 'Override detected language')
    .option('-f, --framework <framework>', 'Override detected framework')
    .option('--force', 'Overwrite existing configurations')
    .option('--dry-run', 'Preview changes without applying')
    .option('-q, --quiet', 'Minimal output (errors only)')
    .option('-v, --verbose', 'Detailed output with debugging info')
    .option('--skip-validation', 'Skip validation of existing configs')
    .option('--output-json', 'Output results as JSON')
    .action(setupCommand);
}
