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
    
    this.logger.verbose('Generating feature specification...');
    // Use AI adapter for content generation
    const prompt = `/speckit.specify

User Prompt:
"${description}".

Consider existing specifications if any.
    
Include these sections:
- Feature title and overview
- User scenarios with acceptance criteria  
- Technical requirements
- Dependencies
- Implementation notes

Format as markdown. Be specific and actionable.`;
    
    const result = await this.aiAdapter.runWithAutoApprove(prompt, this.rootPath);
    if (!result.success) {
      throw new Error(`Failed to generate specification: ${result.error}`);
    }
    
    this.logger.verbose('Specification saved to specs/main/spec.md');
  }

  /**
   * Step: Generate implementation plan using speckit-plan
   */
  private async executePlan(): Promise<void> {
    if (!this.aiAdapter) throw new Error('AI adapter not initialized');
    
    this.logger.verbose('Creating implementation plan...');
    
    // Ask AI to create implementation plan
    const prompt = `/speckit.plan`;
    
    const result = await this.aiAdapter.runWithAutoApprove(prompt, this.rootPath);
    if (!result.success) {
      throw new Error(`Failed to generate plan: ${result.error}`);
    }
    
    this.logger.verbose('Plan saved to specs/main/plan.md');
  }

  /**
   * Step: Generate tasks using speckit-tasks
   */
  private async executeTasks(): Promise<void> {
    if (!this.aiAdapter) throw new Error('AI adapter not initialized');
    
    this.logger.verbose('Breaking down into tasks...');
    
    // Ask AI to create task list
    const prompt = `/speckit.tasks`;
    
    const result = await this.aiAdapter.runWithAutoApprove(prompt, this.rootPath);
    if (!result.success) {
      throw new Error(`Failed to generate tasks: ${result.error}`);
    }
    
    this.logger.verbose(result.output);
    
    this.logger.verbose('Tasks saved to specs/main/tasks.md');
  }

  /**
   * Step: Implement tasks using speckit-implement
   */
  private async executeImplement(): Promise<void> {
    if (!this.aiAdapter) throw new Error('AI adapter not initialized');
    
    this.logger.verbose('Implementing tasks...');
    
    const { promises: fs } = await import('fs');
    const path = await import('path');
    
    // Read all context
    const specPath = path.join(this.rootPath, 'specs', 'main', 'spec.md');
    const tasksPath = path.join(this.rootPath, 'specs', 'main', 'tasks.md');
    
    const specContent = await fs.readFile(specPath, 'utf-8');
    const tasksContent = await fs.readFile(tasksPath, 'utf-8');
    
    // Use AI to implement the tasks
    const prompt = `Implement this feature by executing the necessary commands:

SPECIFICATION:
${specContent.substring(0, 500)}...

TASKS:
${tasksContent}

Generate the shell commands needed to implement these tasks. Include:
- Creating/modifying files
- Installing dependencies if needed
- Setting up configuration

Provide actual executable shell commands.`;
    
    const result = await this.aiAdapter.suggest(prompt, this.rootPath);
    if (!result.success) {
      throw new Error(`Failed to get implementation commands: ${result.error}`);
    }
    
    this.logger.info('AI suggested commands:');
    this.logger.info(result.output);
    this.logger.warning('Note: Automatic command execution is not yet implemented for safety.');
    this.logger.warning('Please review and execute the suggested commands manually.');
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
          const output = await this.runCommand(check.command);
          this.logger.success(`${check.name} passed`);
          if (output.stdout && this.logger.isVerbose()) {
            this.logger.verbose(output.stdout);
          }
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
   * Run a shell command and capture detailed output
   */
  private async runCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    const { execa } = await import('execa');
    try {
      const result = await execa(command, { 
        shell: true, 
        cwd: this.rootPath,
        reject: false,
      });
      
      if (result.exitCode !== 0) {
        throw new Error(`Command failed with exit code ${result.exitCode}\n${result.stderr || result.stdout}`);
      }
      
      return { stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  /**
   * Auto-fix quality check failures using AI CLI
   */
  private async autoFix(checkName: string, error: unknown): Promise<void> {
    if (!this.aiAdapter) throw new Error('AI adapter not initialized');
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // First, log the failure as a task in specs for tracking
    await this.logFailureAsTask(checkName, errorMessage);
    
    // Build context for the AI to fix the issue
    const { promises: fs } = await import('fs');
    const path = await import('path');
    
    // Read current spec/tasks for context
    let specContext = '';
    try {
      const specPath = path.join(this.rootPath, 'specs', 'main', 'spec.md');
      specContext = await fs.readFile(specPath, 'utf-8');
    } catch {
      // No spec file, continue without it
    }
    
    // Create the fix prompt for the AI CLI
    const fixPrompt = `Fix the following ${checkName} failure in this project.

## Error Output:
${errorMessage}

## Project Context:
${specContext ? specContext.substring(0, 1000) : 'No spec available'}

## Instructions:
1. Analyze the error output to understand what failed
2. Read the relevant source files to understand the issue
3. Make the necessary code changes to fix the ${checkName} failure
4. Do not change unrelated code
5. Ensure your fix addresses the root cause, not just the symptom`;

    this.logger.info(`Invoking AI CLI to fix ${checkName} failures...`);
    
    // Use the AI CLI to actually fix the code
    const result = await this.invokeAICLI(fixPrompt);
    
    if (!result.success) {
      this.logger.warning(`AI CLI fix attempt completed with issues: ${result.error || 'unknown'}`);
    } else {
      this.logger.success(`AI CLI applied fixes for ${checkName}`);
    }
  }

  /**
   * Log a failure as a task in the specs for tracking
   */
  private async logFailureAsTask(checkName: string, errorMessage: string): Promise<void> {
    const { promises: fs } = await import('fs');
    const path = await import('path');
    
    const tasksPath = path.join(this.rootPath, 'specs', 'main', 'tasks.md');
    
    try {
      let tasksContent = '';
      try {
        tasksContent = await fs.readFile(tasksPath, 'utf-8');
      } catch {
        tasksContent = '# Tasks\n\n';
      }
      
      // Add failure task if not already present
      const failureMarker = `## Fix: ${checkName} failure`;
      if (!tasksContent.includes(failureMarker)) {
        const timestamp = new Date().toISOString();
        const failureTask = `\n${failureMarker} (${timestamp})\n\n\`\`\`\n${errorMessage.substring(0, 500)}\n\`\`\`\n\n- [ ] Analyze and fix the ${checkName} error\n- [ ] Verify fix resolves the issue\n\n`;
        
        tasksContent += failureTask;
        await fs.writeFile(tasksPath, tasksContent, 'utf-8');
        this.logger.verbose(`Logged ${checkName} failure as task`);
      }
    } catch (err) {
      // Non-critical, continue even if logging fails
      this.logger.verbose(`Could not log failure task: ${err}`);
    }
  }

  /**
   * Invoke the AI CLI to perform fixes
   */
  private async invokeAICLI(prompt: string): Promise<{ success: boolean; error?: string }> {
    const { runCommandStreaming } = await import('../../utils/process.js');
    
    try {
      // Determine which CLI to use based on adapter type
      const isCopilot = this.aiAdapter?.type === AIToolType.COPILOT;
      
      if (isCopilot) {
        // Use Copilot CLI with prompt mode
        const result = await runCommandStreaming(
          'copilot',
          ['-p', prompt, '--allow-all-tools'],
          { cwd: this.rootPath, timeout: 300000 }
        );
        
        return {
          success: result.exitCode === 0,
          error: result.exitCode !== 0 ? result.stderr : undefined,
        };
      } else {
        // For Claude CLI
        const result = await runCommandStreaming(
          'claude',
          ['-p', prompt],
          { cwd: this.rootPath, timeout: 300000 }
        );
        
        return {
          success: result.exitCode === 0,
          error: result.exitCode !== 0 ? result.stderr : undefined,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
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
