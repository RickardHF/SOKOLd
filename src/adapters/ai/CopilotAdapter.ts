import { AIToolAdapter, AIToolType, ImplementationContext, AIToolResult } from './AIToolAdapter.js';
import { commandExists, getCommandVersion, runCommand, runCommandStreaming } from '../../utils/process.js';

export class CopilotAdapter implements AIToolAdapter {
  readonly type = AIToolType.COPILOT;
  readonly executable = 'copilot';
  readonly autoApproveFlag = '--allow-all-tools';

  async detect(): Promise<boolean> {
    // Check if copilot CLI is installed (standalone command, not gh extension)
    const copilotExists = await commandExists('copilot');
    if (!copilotExists) {
      return false;
    }

    // Verify it works
    const result = await runCommand('copilot', ['--help']);
    return result.exitCode === 0;
  }

  async getVersion(): Promise<string | null> {
    const version = await getCommandVersion('copilot', '--version');
    return version;
  }

  async suggest(prompt: string, cwd: string): Promise<AIToolResult> {
    const startTime = Date.now();
    
    try {
      // Copilot CLI uses -p for prompt mode with non-interactive execution
      const result = await runCommand(
        'copilot',
        ['-p', prompt, '--allow-all-tools'],
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
      
      // Use copilot CLI with prompt mode and auto-approve tools
      const result = await runCommandStreaming(
        'copilot',
        ['-p', prompt, '--allow-all-tools'],
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
      // Use copilot CLI with prompt mode and auto-approve all tools
      const result = await runCommandStreaming(
        'copilot',
        ['-p', prompt, '--allow-all-tools'],
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
