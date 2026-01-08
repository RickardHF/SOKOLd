import { AIToolAdapter, AIToolType, ImplementationContext, AIToolResult } from './AIToolAdapter.js';
import { commandExists, getCommandVersion, runCommand, runCommandStreaming } from '../../utils/process.js';

export class CopilotAdapter implements AIToolAdapter {
  readonly type = AIToolType.COPILOT;
  readonly executable = 'gh';
  readonly autoApproveFlag = '--yes';

  async detect(): Promise<boolean> {
    // Check if gh CLI is installed
    const ghExists = await commandExists('gh');
    if (!ghExists) {
      return false;
    }

    // Check if copilot extension is available
    const result = await runCommand('gh', ['copilot', '--help']);
    return result.exitCode === 0;
  }

  async getVersion(): Promise<string | null> {
    const ghVersion = await getCommandVersion('gh', '--version');
    if (!ghVersion) {
      return null;
    }
    
    // Try to get copilot version
    const result = await runCommand('gh', ['copilot', '--version']);
    if (result.exitCode === 0) {
      return result.stdout.trim() || ghVersion;
    }
    
    return ghVersion;
  }

  async suggest(prompt: string, cwd: string): Promise<AIToolResult> {
    const startTime = Date.now();
    
    // NOTE: gh copilot suggest is designed for shell command suggestions only
    // It cannot be used for generating markdown content or arbitrary text
    // This method only works for short shell command suggestions
    
    // Check if the prompt looks like it's asking for a shell command
    const isShellRequest = /^(how to|command to|install|run|execute|delete|create|remove|list|show|find|search)/i.test(prompt.trim());
    
    if (!isShellRequest && prompt.length > 200) {
      // This is likely a content generation request, which suggest doesn't support
      return {
        success: false,
        output: '',
        error: 'GitHub Copilot CLI suggest command only supports shell command suggestions. For content generation, please use Claude CLI or provide content manually.',
        duration: Date.now() - startTime,
      };
    }
    
    try {
      const result = await runCommand(
        'gh',
        ['copilot', 'suggest', '-t', 'shell', prompt],
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
      
      // Use gh copilot with the prompt directly
      const result = await runCommandStreaming(
        'gh',
        ['copilot', prompt],
        { 
          cwd: context.rootPath, 
          timeout: 300000, // 5 minutes
          env: { ...process.env, GH_COPILOT_AUTO_APPROVE: 'true' },
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
      // Use gh copilot with the prompt directly (not suggest mode)
      // This invokes the agent with auto-approval of tool usage
      const result = await runCommandStreaming(
        'gh',
        ['copilot', prompt],
        { 
          cwd, 
          timeout: 600000, // 10 minutes for complex operations
          env: { ...process.env, GH_COPILOT_AUTO_APPROVE: 'true' },
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
