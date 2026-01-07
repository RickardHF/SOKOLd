import { Command } from 'commander';
import { FeatureScanner } from '../../core/scanner/FeatureScanner.js';
import { StatusDetector } from '../../core/scanner/StatusDetector.js';
import { StateManager, ImplementationStatus } from '../../core/state/StateManager.js';
import { ConfigLoader } from '../../core/config/ConfigLoader.js';
import { NotInitializedError } from '../../utils/errors.js';
import { findSpecKitRoot } from '../../utils/filesystem.js';

export interface StatusCommandOptions {
  detailed?: boolean;
  json?: boolean;
  filter?: string;
}

export async function statusCommand(options: StatusCommandOptions): Promise<void> {
  // Find SpecKit root
  const rootPath = await findSpecKitRoot(process.cwd());
  if (!rootPath) {
    throw new NotInitializedError();
  }

  // Load configuration
  const configLoader = new ConfigLoader();
  const config = await configLoader.load(rootPath);

  // Scan for features
  const scanner = new FeatureScanner();
  const features = await scanner.scan(rootPath);

  // Load state
  const stateManager = new StateManager(rootPath);
  await stateManager.load();
  
  const statusDetector = new StatusDetector(stateManager, config.maxRetries);

  // Get status for each feature
  const statuses = features.map(f => ({
    feature: f,
    status: statusDetector.getStatus(f.id),
  }));

  // Filter if requested
  let filtered = statuses;
  if (options.filter) {
    const filterStatus = options.filter.toLowerCase();
    filtered = statuses.filter(s => s.status.status.toLowerCase() === filterStatus);
  }

  // Output as JSON
  if (options.json) {
    const summary = statusDetector.getSummary(features);
    const output = {
      features: filtered.map(s => ({
        id: s.feature.id,
        name: s.feature.name,
        status: s.status.status,
        priority: s.feature.priority,
        lastAttempt: s.status.lastAttempt,
        retryCount: s.status.retryCount,
        failedChecks: s.status.failedChecks,
      })),
      summary,
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Output as text
  console.log('');
  console.log('Feature Implementation Status');
  console.log('══════════════════════════════');
  console.log('');

  for (const { feature, status } of filtered) {
    const icon = getStatusIcon(status.status);
    const statusText = `[${status.status}]`.padEnd(14);
    const priorityText = `Priority: ${feature.priority}`;
    
    let line = `${icon} ${feature.id.padEnd(20)} ${statusText} ${priorityText}`;
    
    if (status.lastAttempt) {
      const date = new Date(status.lastAttempt).toLocaleDateString();
      line += `  Last: ${date}`;
    }

    if (status.retryCount > 0 && options.detailed) {
      line += `  Retries: ${status.retryCount}/${config.maxRetries}`;
    }

    console.log(line);

    if (options.detailed && status.failedChecks.length > 0) {
      console.log(`     Failed checks: ${status.failedChecks.join(', ')}`);
    }
  }

  // Summary
  const summary = statusDetector.getSummary(features);
  console.log('');
  console.log('Summary:');
  console.log(`  Total: ${summary.total} features`);
  console.log(`  Completed: ${summary.completed}`);
  console.log(`  Failed: ${summary.failed}`);
  console.log(`  Pending: ${summary.pending}`);
  console.log(`  In Progress: ${summary.inProgress}`);
}

function getStatusIcon(status: ImplementationStatus): string {
  switch (status) {
    case ImplementationStatus.COMPLETED:
      return '✓';
    case ImplementationStatus.FAILED:
      return '✗';
    case ImplementationStatus.IN_PROGRESS:
    case ImplementationStatus.TESTING:
      return '▶';
    case ImplementationStatus.PENDING:
    default:
      return '⋯';
  }
}

export function createStatusCommand(): Command {
  return new Command('status')
    .description('Display implementation status of all features')
    .option('-d, --detailed', 'Show detailed information')
    .option('--json', 'Output in JSON format')
    .option('--filter <status>', 'Filter by status (pending|in-progress|completed|failed)')
    .action(statusCommand);
}
