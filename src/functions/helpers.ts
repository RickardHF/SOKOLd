
import { spawn } from 'child_process';

export interface RunOptions {
  verbose?: boolean;
  model?: string;
  autoApprove?: boolean;
  currentBranchOnly?: boolean;
  agent?: string; 
}

export async function runAICommand(
  tool: 'copilot' | 'claude',
  prompt: string,
  options: RunOptions = {}
): Promise<string> {
  return new Promise((resolve) => {
    // Build command flags
    const flags: string[] = [];
    
    // Auto-approve flag (tool-specific)
    if (options.autoApprove !== false) {
      flags.push(tool === 'copilot' ? '--allow-all-tools' : '--dangerously-skip-permissions');
    }
    
    // Model flag (tool-specific)
    if (options.model) {
      flags.push(`--model ${options.model}`);
    }
    
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    const fullCommand = `${tool} ${flags.join(' ')} -p "${escapedPrompt}"`.trim();
    
    // Always show the full command being run
    
    console.log(`\nRunning command:\n   $ ${fullCommand}\n`);

    // Set up environment with workflow options
    const env = { ...process.env };
    if (options.currentBranchOnly) {
      env.SOKOLD_CURRENT_BRANCH_ONLY = 'true';
    }

    let output = '';

    const child = spawn(fullCommand, [], {
      cwd: process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe'], // Capture stdout and stderr
      shell: true,
      env,
    });

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text); // Still stream to terminal
      output += text;
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text); // Still stream to terminal
      output += text;
    });

    child.on('close', () => {
      resolve(output);
    });

    child.on('error', (err) => {
      console.error(`Failed to start ${tool}:`, err.message);
      resolve('');
    });
  });
}


export function runShellCommand(command: string): Promise<string> {
    console.log(`\nRunning command:\n   $ ${command}\n`);
    return new Promise((resolve, reject) => {
        const child = spawn(command, {
            cwd: process.cwd(),
            stdio: ['inherit', 'pipe', 'pipe'],
            shell: true
        });
        let output = '';
        child.stdout?.on('data', (data) => {
            const text = data.toString();
            process.stdout.write(text);
            output += text;
        });
        child.stderr?.on('data', (data) => {
            const text = data.toString();
            process.stderr.write(text);
            output += text;
        });
        child.on('close', () => {
            resolve(output);
        });
        child.on('error', (err) => {
            reject(err);
        });
    });
}