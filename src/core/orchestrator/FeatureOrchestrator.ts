import { FeatureSpecification } from '../speckit/SpecParser.js';
import { StateManager, ImplementationStatus } from '../state/StateManager.js';
import { SessionTracker } from '../state/SessionTracker.js';
import { AIToolAdapter, ImplementationContext } from '../../adapters/ai/AIToolAdapter.js';
import { QualityCheckResult } from '../../adapters/tooling/QualityCheck.js';
import { QualityCheckRunner } from '../quality/QualityCheckRunner.js';
import { Logger } from '../../utils/logger.js';

export interface OrchestratorOptions {
  dryRun?: boolean;
  maxRetries?: number;
  skipTests?: boolean;
  skipLint?: boolean;
  skipBuild?: boolean;
}

export interface ImplementationResult {
  featureId: string;
  success: boolean;
  qualityResults: QualityCheckResult[];
  retries: number;
  error?: string;
}

export class FeatureOrchestrator {
  private stateManager: StateManager;
  private sessionTracker: SessionTracker;
  private aiAdapter: AIToolAdapter;
  private qualityRunner: QualityCheckRunner;
  private logger: Logger;
  private options: OrchestratorOptions;

  constructor(
    rootPath: string,
    aiAdapter: AIToolAdapter,
    options: OrchestratorOptions = {}
  ) {
    this.stateManager = new StateManager(rootPath);
    this.sessionTracker = new SessionTracker(rootPath);
    this.aiAdapter = aiAdapter;
    this.qualityRunner = new QualityCheckRunner(rootPath);
    this.logger = Logger.getInstance();
    this.options = {
      maxRetries: 3,
      dryRun: false,
      skipTests: false,
      skipLint: false,
      skipBuild: false,
      ...options,
    };
  }

  async initialize(): Promise<void> {
    await this.stateManager.load();
  }

  async implementFeature(feature: FeatureSpecification): Promise<ImplementationResult> {
    const result: ImplementationResult = {
      featureId: feature.id,
      success: false,
      qualityResults: [],
      retries: 0,
    };

    this.logger.progress(`Implementing ${feature.id} (Priority: ${feature.priority})`);
    this.sessionTracker.addFeatureProcessed(feature.id);

    if (this.options.dryRun) {
      this.logger.step('Dry run - skipping actual implementation');
      result.success = true;
      return result;
    }

    // Update state to in-progress
    this.stateManager.updateFeatureStatus(feature.id, ImplementationStatus.IN_PROGRESS);
    await this.stateManager.save();

    try {
      // Invoke AI tool
      this.logger.step('Invoking AI tool...');
      const context: ImplementationContext = {
        featureId: feature.id,
        specContent: feature.rawContent,
        rootPath: this.qualityRunner.getRootPath(),
      };

      const aiResult = await this.aiAdapter.implement(context);
      
      if (!aiResult.success) {
        this.logger.stepError(`AI tool failed: ${aiResult.error ?? 'Unknown error'}`);
        result.error = aiResult.error;
        this.stateManager.updateFeatureStatus(feature.id, ImplementationStatus.FAILED);
        await this.stateManager.save();
        this.sessionTracker.incrementFailure();
        return result;
      }

      this.logger.stepSuccess('Code generated');
      this.stateManager.addImplementedStep(feature.id, 'code-generation');

      // Run quality checks
      const qualityResults = await this.runQualityChecks();
      result.qualityResults = qualityResults;

      // Check for failures
      const failures = qualityResults.filter(r => !r.passed);
      
      if (failures.length > 0) {
        // Attempt auto-fix with retries
        let retryCount = 0;
        const maxRetries = this.options.maxRetries ?? 3;

        while (failures.length > 0 && retryCount < maxRetries) {
          retryCount++;
          result.retries = retryCount;
          this.logger.step(`Attempting auto-fix (retry ${retryCount}/${maxRetries})...`);
          
          this.stateManager.incrementRetryCount(feature.id);
          
          // Request AI to fix failures
          const fixContext: ImplementationContext = {
            featureId: feature.id,
            specContent: feature.rawContent,
            rootPath: this.qualityRunner.getRootPath(),
            additionalContext: this.formatFailuresForFix(failures),
          };

          const fixResult = await this.aiAdapter.implement(fixContext);
          
          if (!fixResult.success) {
            continue;
          }

          // Re-run quality checks
          const retryResults = await this.runQualityChecks();
          result.qualityResults = retryResults;
          
          const stillFailing = retryResults.filter(r => !r.passed);
          if (stillFailing.length === 0) {
            break;
          }
        }
      }

      // Final status check
      const finalFailures = result.qualityResults.filter(r => !r.passed);
      
      if (finalFailures.length > 0) {
        this.logger.stepError('Quality checks failed after max retries');
        for (const f of finalFailures) {
          this.stateManager.addFailedCheck(feature.id, f.type);
        }
        this.stateManager.updateFeatureStatus(feature.id, ImplementationStatus.FAILED);
        this.sessionTracker.incrementFailure();
        result.error = 'Quality checks failed';
      } else {
        this.logger.stepSuccess('Feature completed' + (result.retries > 0 ? ' (with fixes)' : ''));
        this.stateManager.updateFeatureStatus(feature.id, ImplementationStatus.COMPLETED);
        this.sessionTracker.incrementSuccess();
        result.success = true;
      }

      await this.stateManager.save();
      
    } catch (error) {
      this.logger.stepError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      result.error = error instanceof Error ? error.message : String(error);
      this.stateManager.updateFeatureStatus(feature.id, ImplementationStatus.FAILED);
      await this.stateManager.save();
      this.sessionTracker.incrementFailure();
    }

    return result;
  }

  async implementFeatures(features: FeatureSpecification[]): Promise<ImplementationResult[]> {
    const results: ImplementationResult[] = [];

    for (const feature of features) {
      const result = await this.implementFeature(feature);
      results.push(result);
    }

    return results;
  }

  private async runQualityChecks(): Promise<QualityCheckResult[]> {
    const results: QualityCheckResult[] = [];

    if (!this.options.skipTests) {
      this.logger.step('Running tests...');
      const testResult = await this.qualityRunner.runTests();
      results.push(testResult);
      this.sessionTracker.addChecksRun(1);
      if (testResult.passed) {
        this.logger.stepSuccess('All tests passed');
        this.sessionTracker.addChecksPassed(1);
      } else {
        this.logger.stepError('Tests failed');
      }
    }

    if (!this.options.skipLint) {
      this.logger.step('Running linter...');
      const lintResult = await this.qualityRunner.runLinting();
      results.push(lintResult);
      this.sessionTracker.addChecksRun(1);
      if (lintResult.passed) {
        this.logger.stepSuccess('No linting errors');
        this.sessionTracker.addChecksPassed(1);
      } else {
        this.logger.stepError('Linting failed');
      }
    }

    if (!this.options.skipBuild) {
      this.logger.step('Running build...');
      const buildResult = await this.qualityRunner.runBuild();
      results.push(buildResult);
      this.sessionTracker.addChecksRun(1);
      if (buildResult.passed) {
        this.logger.stepSuccess('Build successful');
        this.sessionTracker.addChecksPassed(1);
      } else {
        this.logger.stepError('Build failed');
      }
    }

    return results;
  }

  private formatFailuresForFix(failures: QualityCheckResult[]): string {
    let context = 'Please fix the following issues:\n\n';
    
    for (const failure of failures) {
      context += `## ${failure.type.toUpperCase()} Failures:\n`;
      for (const detail of failure.failures) {
        if (detail.file) {
          context += `- ${detail.file}`;
          if (detail.line) {
            context += `:${detail.line}`;
          }
          context += `: ${detail.message}\n`;
        } else {
          context += `- ${detail.message}\n`;
        }
      }
      context += '\n';
    }

    return context;
  }

  getSessionTracker(): SessionTracker {
    return this.sessionTracker;
  }

  getStateManager(): StateManager {
    return this.stateManager;
  }
}
