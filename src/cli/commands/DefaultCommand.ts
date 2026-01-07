import { Command } from 'commander';
import { PipelineOrchestrator } from '../../core/orchestrator/PipelineOrchestrator.js';
import { Logger } from '../../utils/logger.js';

export interface DefaultCommandOptions {
  dryRun?: boolean;
  continue?: boolean;
  tool?: string;
  review?: boolean;
  verbose?: boolean;
  debug?: boolean;
  quiet?: boolean;
}

export async function defaultAction(
  descriptionParts: string[],
  options: DefaultCommandOptions
): Promise<void> {
  const logger = Logger.getInstance();
  const description = descriptionParts.join(' ').trim();

  // If no description and no --continue flag, show help
  if (!description && !options.continue) {
    logger.info('SoKolD - AI-Powered Code Generation CLI\n');
    logger.info('Usage:');
    logger.info('  sokold "Your feature description here"');
    logger.info('  sokold --continue                      Resume from last checkpoint');
    logger.info('  sokold status                          Check implementation status');
    logger.info('  sokold doctor                          Diagnose setup issues');
    logger.info('\nRun `sokold --help` for all options.');
    return;
  }

  const orchestrator = new PipelineOrchestrator({
    dryRun: options.dryRun,
    continueFromCheckpoint: options.continue,
    aiTool: options.tool as 'copilot' | 'claude' | undefined,
    reviewBeforeImplement: options.review,
  });

  await orchestrator.run(description || undefined);
}

export function createDefaultCommand(): Command {
  return new Command('create')
    .description('Create a feature from natural language description')
    .argument('<description...>', 'Natural language description of the feature')
    .option('--dry-run', 'Preview what would happen without executing')
    .option('--tool <name>', 'Use specific AI tool (copilot|claude)')
    .option('--review', 'Review generated spec before implementation')
    .action(async (descriptionParts: string[], options: DefaultCommandOptions) => {
      await defaultAction(descriptionParts, options);
    });
}
