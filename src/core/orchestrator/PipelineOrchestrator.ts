import { Logger } from '../../utils/logger.js';
import { ConfigLoader } from '../config/ConfigLoader.js';
import { SpecKitDetector } from '../speckit/SpecKitDetector.js';
import { SpecKitInitializer } from '../speckit/SpecKitInitializer.js';
import { AIToolFactory } from '../../adapters/ai/AIToolFactory.js';
import { AIToolType, AIToolAdapter } from '../../adapters/ai/AIToolAdapter.js';
import { StateManager } from '../state/StateManager.js';
import { ProjectState, PipelineStep } from './ProjectState.js';
import { AIToolError } from '../../utils/errors.js';

export interface PipelineOrchestratorOptions {
  dryRun?: boolean;
  continueFromCheckpoint?: boolean;
  aiTool?: 'copilot' | 'claude';
  reviewBeforeImplement?: boolean;
}

/**
 * PipelineOrchestrator - Intelligent orchestrator that analyzes project state
 * and determines what actions to perform to transform a natural language
 * description into working code.
 * 
 * Pipeline steps:
 * 1. Initialize - Ensure SpecKit structure exists
 * 2. Specify - Generate feature specification from description
 * 3. Plan - Create implementation plan
 * 4. Tasks - Break down into actionable tasks
 * 5. Implement - Execute tasks using AI CLI
 * 6. Quality - Run tests, linting, build and auto-fix issues
 */
export class PipelineOrchestrator {
  private readonly logger = Logger.getInstance();
  private readonly options: PipelineOrchestratorOptions;
  private readonly rootPath: string;
  private aiAdapter: AIToolAdapter | null = null;

  constructor(options: PipelineOrchestratorOptions = {}) {
    this.options = options;
    this.rootPath = process.cwd();
  }

  /**
   * Main entry point - runs the full pipeline or continues from checkpoint
   */
  async run(description?: string): Promise<void> {
    this.logger.header('🧊 SoKolD - AI-Powered Code Generation');
    this.logger.blank();

    // Step 1: Analyze current state
    const state = await this.analyzeProjectState();
    
    // Step 2: Determine required actions
    const actions = this.determineActions(state, description);
    
    if (actions.length === 0) {
      this.logger.success('Nothing to do - project is up to date');
      return;
    }

    // Step 3: Show plan
    this.logger.info('📋 Execution plan:');
    for (const action of actions) {
      this.logger.info(`   ${this.getStepIcon(action)} ${this.getStepDescription(action)}`);
    }
    this.logger.blank();

    if (this.options.dryRun) {
      this.logger.warning('Dry run mode - no changes will be made');
      return;
    }

    // Step 4: Ensure AI tool is available
    await this.ensureAITool();

    // Step 5: Ensure configuration exists
    await this.ensureConfiguration();

    // Step 6: Execute pipeline
    await this.executePipeline(actions, description, state);
  }

  /**
   * Analyze current project state to determine what's already done
   */
  private async analyzeProjectState(): Promise<ProjectState> {
    this.logger.verbose('Analyzing project state...');

    const detector = new SpecKitDetector();
    const isInitialized = await detector.isInitialized(this.rootPath);
    
    const state: ProjectState = {
      isInitialized,
      hasSpec: false,
      hasPlan: false,
      hasTasks: false,
      hasImplementation: false,
      lastCheckpoint: null,
      featureId: null,
    };

    if (isInitialized) {
      // Check for existing specs, plans, tasks
      state.hasSpec = await detector.hasSpec(this.rootPath);
      state.hasPlan = await detector.hasPlan(this.rootPath);
      state.hasTasks = await detector.hasTasks(this.rootPath);
      
      // Load checkpoint if continuing
      if (this.options.continueFromCheckpoint) {
        const stateManager = new StateManager(this.rootPath);
        await stateManager.load();
        state.lastCheckpoint = stateManager.getLastCheckpoint();
        state.featureId = stateManager.getCurrentFeatureId();
      }
    }

    this.logger.verbose(`State: init=${state.isInitialized}, spec=${state.hasSpec}, plan=${state.hasPlan}, tasks=${state.hasTasks}`);
    
    return state;
  }

  /**
   * Determine which pipeline steps need to run based on current state
   */
  private determineActions(state: ProjectState, description?: string): PipelineStep[] {
    const actions: PipelineStep[] = [];

    // If continuing from checkpoint, resume from there
    if (this.options.continueFromCheckpoint && state.lastCheckpoint) {
      return this.getActionsFromCheckpoint(state.lastCheckpoint);
    }

    // New feature request - determine full pipeline
    if (description) {
      if (!state.isInitialized) {
        actions.push(PipelineStep.Initialize);
      }
      actions.push(PipelineStep.Specify);
      actions.push(PipelineStep.Plan);
      actions.push(PipelineStep.Tasks);
      actions.push(PipelineStep.Implement);
      actions.push(PipelineStep.Quality);
    } else if (state.hasTasks && !state.hasImplementation) {
      // Has tasks but not implemented - just implement
      actions.push(PipelineStep.Implement);
      actions.push(PipelineStep.Quality);
    } else if (state.hasPlan && !state.hasTasks) {
      // Has plan but no tasks
      actions.push(PipelineStep.Tasks);
      actions.push(PipelineStep.Implement);
      actions.push(PipelineStep.Quality);
    } else if (state.hasSpec && !state.hasPlan) {
      // Has spec but no plan
      actions.push(PipelineStep.Plan);
      actions.push(PipelineStep.Tasks);
      actions.push(PipelineStep.Implement);
      actions.push(PipelineStep.Quality);
    }

    return actions;
  }

  /**
   * Get remaining actions from a checkpoint
   */
  private getActionsFromCheckpoint(checkpoint: PipelineStep): PipelineStep[] {
    const allSteps = [
      PipelineStep.Initialize,
      PipelineStep.Specify,
      PipelineStep.Plan,
      PipelineStep.Tasks,
      PipelineStep.Implement,
      PipelineStep.Quality,
    ];
    
    const checkpointIndex = allSteps.indexOf(checkpoint);
    return allSteps.slice(checkpointIndex);
  }

  /**
   * Ensure an AI tool is available
   */
  private async ensureAITool(): Promise<void> {
    this.logger.verbose('Detecting AI tools...');

    const preferredType = this.options.aiTool === 'copilot' 
      ? AIToolType.COPILOT 
      : this.options.aiTool === 'claude' 
        ? AIToolType.CLAUDE 
        : null;

    this.aiAdapter = await AIToolFactory.getAdapter(preferredType);

    if (!this.aiAdapter) {
      throw new AIToolError(
        'AI CLI',
        'No AI CLI tool found. Please install GitHub Copilot CLI or Claude CLI.'
      );
    }

    const version = await this.aiAdapter.getVersion();
    const toolName = this.aiAdapter.type === AIToolType.COPILOT ? 'GitHub Copilot CLI' : 'Claude CLI';
    this.logger.success(`${toolName} detected${version ? ` (v${version})` : ''}`);
  }

  /**
   * Ensure configuration exists, auto-generate if needed
   */
  private async ensureConfiguration(): Promise<void> {
    const configLoader = new ConfigLoader();
    
    if (!await configLoader.exists(this.rootPath)) {
      this.logger.verbose('No configuration found, auto-generating...');
      await configLoader.generateDefault(this.rootPath, this.aiAdapter!.type);
      this.logger.verbose('Configuration created at .sokold.yaml');
    }
  }

  /**
   * Execute the pipeline steps
   */
  private async executePipeline(
    actions: PipelineStep[],
    description: string | undefined,
    state: ProjectState
  ): Promise<void> {
    const stateManager = new StateManager(this.rootPath);
    await stateManager.load();

    for (const step of actions) {
      this.logger.header(`${this.getStepIcon(step)} ${this.getStepDescription(step)}`);
      
      try {
        await this.executeStep(step, description, state);
        stateManager.setCheckpoint(step);
        await stateManager.save();
        this.logger.success(`${this.getStepDescription(step)} completed`);
        this.logger.blank();
      } catch (error) {
        this.logger.error(`Failed at step: ${step}`);
        stateManager.setCheckpoint(step);
        await stateManager.save();
        throw error;
      }
    }

    this.logger.header('✅ Pipeline completed successfully');
  }

  /**
   * Execute a single pipeline step
   */
  private async executeStep(
    step: PipelineStep,
    description: string | undefined,
    _state: ProjectState
  ): Promise<void> {
    switch (step) {
      case PipelineStep.Initialize:
        await this.executeInitialize();
        break;
      case PipelineStep.Specify:
        await this.executeSpecify(description!);
        break;
      case PipelineStep.Plan:
        await this.executePlan();
        break;
      case PipelineStep.Tasks:
        await this.executeTasks();
        break;
      case PipelineStep.Implement:
        await this.executeImplement();
        break;
      case PipelineStep.Quality:
        await this.executeQuality();
        break;
    }
  }

  /**
   * Step: Initialize SpecKit structure
   */
  private async executeInitialize(): Promise<void> {
    const initializer = new SpecKitInitializer();
    await initializer.initialize(this.rootPath);
  }

  /**
   * Step: Generate specification from description using speckit-specify
   */
  private async executeSpecify(description: string): Promise<void> {
    if (!this.aiAdapter) throw new Error('AI adapter not initialized');
    
    const prompt = `Use the speckit-specify agent to create a feature specification for: ${description}`;
    await this.aiAdapter.runWithAutoApprove(prompt, this.rootPath);
  }

  /**
   * Step: Generate implementation plan using speckit-plan
   */
  private async executePlan(): Promise<void> {
    if (!this.aiAdapter) throw new Error('AI adapter not initialized');
    
    const prompt = 'Use the speckit-plan agent to create an implementation plan based on the current spec';
    await this.aiAdapter.runWithAutoApprove(prompt, this.rootPath);
  }

  /**
   * Step: Generate tasks using speckit-tasks
   */
  private async executeTasks(): Promise<void> {
    if (!this.aiAdapter) throw new Error('AI adapter not initialized');
    
    const prompt = 'Use the speckit-tasks agent to generate actionable tasks from the plan';
    await this.aiAdapter.runWithAutoApprove(prompt, this.rootPath);
  }

  /**
   * Step: Implement tasks using speckit-implement
   */
  private async executeImplement(): Promise<void> {
    if (!this.aiAdapter) throw new Error('AI adapter not initialized');
    
    const prompt = 'Use the speckit-implement agent to implement all tasks in tasks.md';
    await this.aiAdapter.runWithAutoApprove(prompt, this.rootPath);
  }

  /**
   * Step: Run quality checks and auto-fix issues
   */
  private async executeQuality(): Promise<void> {
    const configLoader = new ConfigLoader();
    const config = await configLoader.load(this.rootPath);
    
    const checks = [
      { name: 'tests', command: config.commands.test, enabled: config.checks.tests },
      { name: 'linting', command: config.commands.lint, enabled: config.checks.linting },
      { name: 'build', command: config.commands.build, enabled: config.checks.build },
    ];

    for (const check of checks) {
      if (!check.enabled || !check.command) continue;
      
      this.logger.verbose(`Running ${check.name}...`);
      
      let retries = 0;
      const maxRetries = config.maxRetries;
      
      while (retries <= maxRetries) {
        try {
          await this.runCommand(check.command);
          this.logger.success(`${check.name} passed`);
          break;
        } catch (error) {
          retries++;
          if (retries > maxRetries) {
            this.logger.error(`${check.name} failed after ${maxRetries} retries`);
            throw error;
          }
          
          this.logger.warning(`${check.name} failed, attempting auto-fix (${retries}/${maxRetries})...`);
          await this.autoFix(check.name, error);
        }
      }
    }
  }

  /**
   * Run a shell command
   */
  private async runCommand(command: string): Promise<void> {
    const { execa } = await import('execa');
    await execa(command, { shell: true, cwd: this.rootPath, stdio: 'inherit' });
  }

  /**
   * Auto-fix quality check failures using AI
   */
  private async autoFix(checkName: string, error: unknown): Promise<void> {
    if (!this.aiAdapter) throw new Error('AI adapter not initialized');
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const prompt = `Fix the ${checkName} failures. Error: ${errorMessage}`;
    await this.aiAdapter.runWithAutoApprove(prompt, this.rootPath);
  }

  private getStepIcon(step: PipelineStep): string {
    const icons: Record<PipelineStep, string> = {
      [PipelineStep.Initialize]: '📁',
      [PipelineStep.Specify]: '📝',
      [PipelineStep.Plan]: '🗺️',
      [PipelineStep.Tasks]: '📋',
      [PipelineStep.Implement]: '⚡',
      [PipelineStep.Quality]: '✅',
    };
    return icons[step] || '•';
  }

  private getStepDescription(step: PipelineStep): string {
    const descriptions: Record<PipelineStep, string> = {
      [PipelineStep.Initialize]: 'Initialize project structure',
      [PipelineStep.Specify]: 'Generate feature specification',
      [PipelineStep.Plan]: 'Create implementation plan',
      [PipelineStep.Tasks]: 'Break down into tasks',
      [PipelineStep.Implement]: 'Implement tasks',
      [PipelineStep.Quality]: 'Run quality checks',
    };
    return descriptions[step] || step;
  }
}
