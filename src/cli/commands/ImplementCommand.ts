import { Command } from 'commander';
import { FeatureScanner } from '../../core/scanner/FeatureScanner.js';
import { StatusDetector } from '../../core/scanner/StatusDetector.js';
import { FeatureOrchestrator, OrchestratorOptions } from '../../core/orchestrator/FeatureOrchestrator.js';
import { ReportGenerator } from '../../core/orchestrator/ReportGenerator.js';
import { AIToolFactory } from '../../adapters/ai/AIToolFactory.js';
import { AIToolType } from '../../adapters/ai/AIToolAdapter.js';
import { StateManager } from '../../core/state/StateManager.js';
import { ConfigLoader } from '../../core/config/ConfigLoader.js';
import { Logger } from '../../utils/logger.js';
import { AIToolError, NotInitializedError } from '../../utils/errors.js';
import { findSpecKitRoot } from '../../utils/filesystem.js';
import { Priority } from '../../core/speckit/SpecParser.js';

export interface ImplementCommandOptions {
  tool?: string;
  priority?: string;
  dryRun?: boolean;
  continue?: boolean;
  noTests?: boolean;
  noLint?: boolean;
  noBuild?: boolean;
  maxRetries?: string;
  timeout?: string;
  json?: boolean;
}

export async function implementCommand(featureIds: string[], options: ImplementCommandOptions): Promise<void> {
  const logger = Logger.getInstance();
  
  // Find SpecKit root
  const rootPath = await findSpecKitRoot(process.cwd());
  if (!rootPath) {
    throw new NotInitializedError();
  }

  // Load configuration
  const configLoader = new ConfigLoader();
  const config = await configLoader.load(rootPath);

  logger.header('Scanning for feature specifications...');

  // Scan for features
  const scanner = new FeatureScanner();
  let features = await scanner.scan(rootPath);

  if (features.length === 0) {
    logger.warning('No features found in specs/ directory');
    return;
  }

  // Filter by priority
  const priorities = options.priority 
    ? [options.priority.toUpperCase() as Priority]
    : config.priorities.map(p => p as Priority);
  
  features = features.filter(f => priorities.includes(f.priority));

  // Filter by feature IDs if specified
  if (featureIds.length > 0) {
    features = features.filter(f => featureIds.includes(f.id));
  }

  // Sort by priority
  features = scanner.sortByPriority(features);

  // Load state and filter pending features
  const stateManager = new StateManager(rootPath);
  await stateManager.load();
  
  const statusDetector = new StatusDetector(stateManager, config.maxRetries);
  
  if (!options.continue) {
    // Only pending features unless --continue is used
    features = statusDetector.filterPendingFeatures(features);
  }

  logger.info(`   Found ${features.length} feature(s) to implement`);
  for (const f of features) {
    logger.verbose(`   - ${f.id} (${f.priority})`);
  }
  logger.blank();

  // Detect AI tool
  logger.header('Detecting AI tools...');
  
  const toolType = options.tool 
    ? (options.tool.toLowerCase() === 'copilot' ? AIToolType.COPILOT : AIToolType.CLAUDE)
    : config.aiTool === 'copilot' ? AIToolType.COPILOT 
    : config.aiTool === 'claude' ? AIToolType.CLAUDE 
    : null;
  
  const aiAdapter = await AIToolFactory.getAdapter(toolType);
  
  if (!aiAdapter) {
    const toolName = toolType ?? 'AI CLI';
    throw new AIToolError(toolName, 'No AI CLI tool could be detected');
  }

  const version = await aiAdapter.getVersion();
  logger.success(`${aiAdapter.type === AIToolType.COPILOT ? 'GitHub Copilot CLI' : 'Claude CLI'} found${version ? ` (v${version})` : ''}`);
  logger.blank();

  if (features.length === 0) {
    logger.info('No pending features to implement');
    return;
  }

  logger.info(`📋 Implementation queue: ${features.length} feature(s)`);
  logger.blank();

  // Create orchestrator
  const orchestratorOptions: OrchestratorOptions = {
    dryRun: options.dryRun,
    maxRetries: options.maxRetries ? parseInt(options.maxRetries, 10) : config.maxRetries,
    skipTests: options.noTests ?? !config.checks.tests,
    skipLint: options.noLint ?? !config.checks.linting,
    skipBuild: options.noBuild ?? !config.checks.build,
  };

  const orchestrator = new FeatureOrchestrator(rootPath, aiAdapter, orchestratorOptions);
  await orchestrator.initialize();

  // Implement features
  const results = await orchestrator.implementFeatures(features);

  // Complete session
  const sessionTracker = orchestrator.getSessionTracker();
  sessionTracker.complete();
  await sessionTracker.save();

  // Generate report
  const reportGenerator = new ReportGenerator();
  const skipped = features
    .filter(f => !results.some(r => r.featureId === f.id))
    .map(f => f.id);
  
  const report = reportGenerator.generateReport(sessionTracker, results, skipped);

  if (options.json) {
    console.log(reportGenerator.formatJson(report));
  } else {
    console.log(reportGenerator.formatReport(report));
  }

  // Exit with appropriate code
  if (report.exitCode !== 0) {
    process.exit(report.exitCode);
  }
}

export function createImplementCommand(): Command {
  return new Command('implement')
    .description('Automatically implement unimplemented features using AI CLI tools')
    .argument('[features...]', 'Specific feature IDs to implement')
    .option('--tool <name>', 'Use specific AI tool (copilot|claude)')
    .option('--priority <level>', 'Only implement features of priority level (P1, P2, etc.)')
    .option('--dry-run', 'Show what would be implemented without executing')
    .option('--continue', 'Continue from last failed implementation')
    .option('--no-tests', 'Skip running tests after implementation')
    .option('--no-lint', 'Skip linting after implementation')
    .option('--no-build', 'Skip build after implementation')
    .option('--max-retries <n>', 'Override retry limit')
    .option('--timeout <seconds>', 'Override command timeout')
    .option('--json', 'Output in JSON format')
    .action(implementCommand);
}
