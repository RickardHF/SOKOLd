import { execa, type Options as ExecaOptions } from 'execa';

export interface ProcessOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: boolean;
}

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  killed: boolean;
}

/**
 * Execute a command and return the result
 */
export async function runCommand(
  command: string,
  args: string[] = [],
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  const execaOptions: ExecaOptions = {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    timeout: options.timeout,
    shell: options.shell ?? false,
    reject: false,
  };

  const result = await execa(command, args, execaOptions);

  return {
    exitCode: result.exitCode ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
    timedOut: result.timedOut ?? false,
    killed: result.killed,
  };
}

/**
 * Check if a command exists in PATH
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const result = await runCommand(cmd, [command]);
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Get command version
 */
export async function getCommandVersion(
  command: string,
  versionArg: string = '--version'
): Promise<string | null> {
  try {
    const result = await runCommand(command, [versionArg]);
    if (result.exitCode === 0) {
      // Extract version from output (common patterns)
      const output = result.stdout || result.stderr;
      const versionMatch = output.match(/(\d+\.\d+\.\d+)/);
      return versionMatch ? versionMatch[1] : output.trim().split('\n')[0];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Run command with streaming output (for long-running processes)
 */
export async function runCommandStreaming(
  command: string,
  args: string[] = [],
  options: ProcessOptions & {
    onStdout?: (data: string) => void;
    onStderr?: (data: string) => void;
  } = {}
): Promise<ProcessResult> {
  const execaOptions: ExecaOptions = {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    timeout: options.timeout,
    shell: options.shell ?? false,
    reject: false,
  };

  const subprocess = execa(command, args, execaOptions);

  let stdout = '';
  let stderr = '';

  if (subprocess.stdout) {
    subprocess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      options.onStdout?.(text);
    });
  }

  if (subprocess.stderr) {
    subprocess.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      options.onStderr?.(text);
    });
  }

  const result = await subprocess;

  return {
    exitCode: result.exitCode ?? 1,
    stdout: stdout || result.stdout,
    stderr: stderr || result.stderr,
    timedOut: result.timedOut ?? false,
    killed: result.killed,
  };
}
