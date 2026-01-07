import { Command } from 'commander';
import { StateManager } from '../../core/state/StateManager.js';
import { Logger } from '../../utils/logger.js';
import { NotInitializedError } from '../../utils/errors.js';
import { findSpecKitRoot } from '../../utils/filesystem.js';
import * as readline from 'readline';

export interface ResetCommandOptions {
  all?: boolean;
  force?: boolean;
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export async function resetCommand(featureIds: string[], options: ResetCommandOptions): Promise<void> {
  const logger = Logger.getInstance();
  
  // Find SpecKit root
  const rootPath = await findSpecKitRoot(process.cwd());
  if (!rootPath) {
    throw new NotInitializedError();
  }

  // Load state
  const stateManager = new StateManager(rootPath);
  await stateManager.load();

  const state = stateManager.getState();
  const allFeatureIds = Object.keys(state.features);

  // Determine what to reset
  let toReset: string[];
  if (options.all) {
    toReset = allFeatureIds;
  } else if (featureIds.length > 0) {
    toReset = featureIds.filter(id => allFeatureIds.includes(id));
    const notFound = featureIds.filter(id => !allFeatureIds.includes(id));
    if (notFound.length > 0) {
      logger.warning(`Features not found in state: ${notFound.join(', ')}`);
    }
  } else {
    logger.error('Specify feature IDs or use --all');
    process.exit(1);
  }

  if (toReset.length === 0) {
    logger.info('No features to reset');
    return;
  }

  // Show what will be reset
  console.log('');
  console.log('⚠ Reset feature implementation state');
  console.log('');
  console.log('Features to reset:');
  for (const id of toReset) {
    const featureState = stateManager.getFeatureState(id);
    if (featureState) {
      console.log(`  • ${id} (status: ${featureState.status}, retries: ${featureState.retryCount})`);
    } else {
      console.log(`  • ${id}`);
    }
  }
  console.log('');
  console.log('This will clear retry counts and allow re-implementation.');
  console.log('');

  // Confirm unless --force
  if (!options.force) {
    const confirmed = await confirm('Continue?');
    if (!confirmed) {
      logger.info('Reset cancelled');
      return;
    }
  }

  // Reset features
  for (const id of toReset) {
    stateManager.resetFeature(id);
    logger.success(`Reset ${id}`);
  }

  await stateManager.save();
  
  console.log('');
  logger.info(`${toReset.length} feature(s) reset successfully.`);
}

export function createResetCommand(): Command {
  return new Command('reset')
    .description('Reset implementation state for features')
    .argument('[features...]', 'Specific feature IDs to reset')
    .option('-a, --all', 'Reset all features')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(resetCommand);
}
