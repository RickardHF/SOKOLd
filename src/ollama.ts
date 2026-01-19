import ollama from 'ollama';
import { Tool, ToolCall, Message } from 'ollama';
import * as readline from 'readline';
import { runShellCommand } from './functions/helpers.js';

/** Default model used by SOKOLd */
export const DEFAULT_MODEL = 'rnj-1';

/**
 * Prompt user for yes/no confirmation
 */
async function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [y/N]: `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

/**
 * Ensure Ollama is ready with the specified model
 */
export async function ensureOllamaReady(model: string = DEFAULT_MODEL): Promise<{ ready: boolean; error?: string }> {
  try {
    // Check if ollama is running by listing models
    const response = await ollama.list();
    const hasModel = response.models.some(m => m.name === model || m.name.startsWith(`${model}:`));
    
    if (hasModel) return { ready: true };

    // Model not available - ask user to pull it
    console.log(`\n⚠️  Model "${model}" is not available locally.`);
    if (response.models.length > 0) {
      console.log(`   Available: ${response.models.map(m => m.name).join(', ')}`);
    }
    
    if (!await promptYesNo(`\nPull "${model}" now?`)) {
      return { ready: false, error: `Model "${model}" required. Run: ollama pull ${model}` };
    }

    // Pull the model
    console.log(`\n📥 Pulling "${model}"...\n`);
    await runShellCommand(`ollama pull ${model}`);
    
    // Verify it worked
    const verify = await ollama.list();
    if (verify.models.some(m => m.name === model || m.name.startsWith(`${model}:`))) {
      console.log(`\n✅ Model "${model}" ready.\n`);
      return { ready: true };
    }
    return { ready: false, error: `Failed to pull "${model}"` };
  } catch {
    return { ready: false, error: 'Ollama not running. Start with: ollama serve' };
  }
}

export async function decide(messages: Message[],tools: Tool[], model: string = DEFAULT_MODEL): Promise<DesicionResponse> {

    console.log('Deciding next action using model:', model);

    try {
        const response = await ollama.chat({
            model: model,
            messages: messages,
            tools: tools
        });
    
        const desicion : DesicionResponse = {
            status: 'success',
            content: response.message.content,
            tools: response.message.tool_calls || []
        }
    
        return desicion;
    } catch (error) {
        return {
            status: 'failure',
            content: `Error during decision making: ${error}`,
            tools: []
        };
    }
}

export type DesicionResponse = {
    status: 'success' | 'failure';
    content: string;
    tools: ToolCall[];
};