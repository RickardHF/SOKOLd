import { Command } from 'commander';
import { SpecKitInitializer } from '../../core/speckit/SpecKitInitializer.js';
import { SpecKitDetector } from '../../core/speckit/SpecKitDetector.js';
import { Logger } from '../../utils/logger.js';
import { AlreadyInitializedError } from '../../utils/errors.js';
import { resolvePath } from '../../utils/filesystem.js';

export interface InitCommandOptions {
  force?: boolean;
  minimal?: boolean;
}

export async function initCommand(targetPath: string | undefined, options: InitCommandOptions): Promise<void> {
  const logger = Logger.getInstance();
  const rootPath = resolvePath(targetPath ?? process.cwd());

  logger.progress(`Initializing SpecKit in ${rootPath}`);

  const detector = new SpecKitDetector();
  const isInitialized = await detector.isInitialized(rootPath);

  if (isInitialized && !options.force) {
    throw new AlreadyInitializedError(rootPath);
  }

  const initializer = new SpecKitInitializer();
  const result = await initializer.initialize(rootPath, {
    force: options.force,
    minimal: options.minimal,
  });

  if (!result.success) {
    if (result.alreadyExisted.length > 0 && !options.force) {
      throw new AlreadyInitializedError(rootPath);
    }
    if (result.errors.length > 0) {
      throw new Error(result.errors.join('\n'));
    }
  }

  // Report created items
  for (const file of result.filesCreated) {
    logger.success(`Created ${file}`);
  }
  for (const dir of result.dirsCreated) {
    logger.success(`Created ${dir}/`);
  }

  logger.blank();
  logger.info('SpecKit initialized successfully!');
  logger.info('Next steps:');
  logger.info('  1. Review constitution: .specify/memory/constitution.md');
  logger.info('  2. Create your first spec: specs/1-feature-name/spec.md');
  logger.info('  3. Run: speckit-automate implement');
}

export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize SpecKit structure in current or target repository')
    .argument('[path]', 'Target directory path')
    .option('-f, --force', 'Overwrite existing files')
    .option('--minimal', 'Create minimal structure (no example files)')
    .action(initCommand);
}
