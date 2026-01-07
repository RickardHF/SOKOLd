import { AIToolAdapter, AIToolType, ImplementationContext, AIToolResult } from './AIToolAdapter.js';
import { commandExists, getCommandVersion, runCommand, runCommandStreaming } from '../../utils/process.js';

export class ClaudeAdapter implements AIToolAdapter {
  readonly type = AIToolType.CLAUDE;
  readonly executable = 'claude';
  readonly autoApproveFlag = '--dangerously-skip-permissions';

  async detect(): Promise<boolean> {
    return commandExists('claude');
  }

  async getVersion(): Promise<string | null> {
    return getCommandVersion('claude', '--version');
  }

  async suggest(prompt: string, cwd: string): Promise<AIToolResult> {
    const startTime = Date.now();
    
    try {
      const result = await runCommand(
        'claude',
        ['-p', prompt],
        { cwd, timeout: 120000 }
      );

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.exitCode !== 0 ? result.stderr : undefined,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  async implement(context: ImplementationContext): Promise<AIToolResult> {
    const startTime = Date.now();
    
    try {
      // Construct the implementation prompt
      const prompt = this.buildImplementationPrompt(context);
      
      const result = await runCommandStreaming(
        'claude',
        ['-p', prompt, this.autoApproveFlag],
        { 
          cwd: context.rootPath, 
          timeout: 300000, // 5 minutes
        }
      );

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.exitCode !== 0 ? result.stderr : undefined,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  async runWithAutoApprove(prompt: string, cwd: string): Promise<AIToolResult> {
    const startTime = Date.now();
    
    try {
      const result = await runCommandStreaming(
        'claude',
        ['-p', prompt, this.autoApproveFlag],
        { 
          cwd, 
          timeout: 600000, // 10 minutes for complex operations
        }
      );

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.exitCode !== 0 ? result.stderr : undefined,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  private buildImplementationPrompt(context: ImplementationContext): string {
    let prompt = `Implement the following feature specification:\n\n`;
    prompt += `Feature ID: ${context.featureId}\n\n`;
    prompt += `Specification:\n${context.specContent}\n`;
    
    if (context.additionalContext) {
      prompt += `\nAdditional Context:\n${context.additionalContext}\n`;
    }
    
    return prompt;
  }
}
