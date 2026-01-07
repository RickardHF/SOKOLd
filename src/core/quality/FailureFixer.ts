import { AIToolAdapter, ImplementationContext, AIToolResult } from '../../adapters/ai/AIToolAdapter.js';

export interface FixContext {
  featureId: string;
  failures: Array<{
    type: string;
    file?: string;
    line?: number;
    message: string;
  }>;
  originalSpec: string;
  rootPath: string;
}

export class FailureFixer {
  private aiAdapter: AIToolAdapter;
  private maxRetries: number;

  constructor(aiAdapter: AIToolAdapter, maxRetries: number = 3) {
    this.aiAdapter = aiAdapter;
    this.maxRetries = maxRetries;
  }

  async fix(context: FixContext): Promise<AIToolResult> {
    const prompt = this.buildFixPrompt(context);
    
    const implContext: ImplementationContext = {
      featureId: context.featureId,
      specContent: context.originalSpec,
      rootPath: context.rootPath,
      additionalContext: prompt,
    };

    return this.aiAdapter.implement(implContext);
  }

  private buildFixPrompt(context: FixContext): string {
    let prompt = 'Please fix the following issues:\n\n';

    // Group failures by type
    const byType = new Map<string, Array<{ file?: string; line?: number; message: string }>>();
    
    for (const failure of context.failures) {
      const existing = byType.get(failure.type) ?? [];
      existing.push({
        file: failure.file,
        line: failure.line,
        message: failure.message,
      });
      byType.set(failure.type, existing);
    }

    // Format failures by type
    for (const [type, failures] of byType) {
      prompt += `## ${type.toUpperCase()} Issues:\n\n`;
      
      for (const failure of failures) {
        if (failure.file) {
          prompt += `- ${failure.file}`;
          if (failure.line) {
            prompt += `:${failure.line}`;
          }
          prompt += `: ${failure.message}\n`;
        } else {
          prompt += `- ${failure.message}\n`;
        }
      }
      prompt += '\n';
    }

    prompt += '\nPlease make the necessary changes to fix these issues while maintaining the original functionality.\n';

    return prompt;
  }

  getMaxRetries(): number {
    return this.maxRetries;
  }
}
