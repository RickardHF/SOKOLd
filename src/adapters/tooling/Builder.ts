import { QualityCheck, QualityCheckType, QualityCheckResult, FailureDetail } from './QualityCheck.js';
import { runCommand } from '../../utils/process.js';
import { pathExists, joinPath } from '../../utils/filesystem.js';

export class Builder implements QualityCheck {
  readonly type = QualityCheckType.BUILD;

  async detect(rootPath: string): Promise<boolean> {
    const configs = [
      'tsconfig.json',
      'package.json',
      'Makefile',
      'Cargo.toml',
      'go.mod',
      'pyproject.toml',
    ];

    for (const config of configs) {
      if (await pathExists(joinPath(rootPath, config))) {
        return true;
      }
    }

    return false;
  }

  async run(rootPath: string, command?: string): Promise<QualityCheckResult> {
    const startTime = Date.now();
    const buildCommand = command ?? await this.detectBuildCommand(rootPath);
    
    if (!buildCommand) {
      return {
        type: this.type,
        passed: true,
        output: 'No build command detected',
        failures: [],
        duration: Date.now() - startTime,
      };
    }

    const [cmd, ...args] = buildCommand.split(' ');
    const result = await runCommand(cmd, args, { cwd: rootPath, timeout: 300000 });

    return {
      type: this.type,
      passed: result.exitCode === 0,
      output: result.stdout + '\n' + result.stderr,
      failures: this.parse(result.stdout + '\n' + result.stderr),
      duration: Date.now() - startTime,
    };
  }

  parse(output: string): FailureDetail[] {
    const failures: FailureDetail[] = [];

    // TypeScript pattern
    const tsPattern = /(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)/gi;
    let match;
    while ((match = tsPattern.exec(output)) !== null) {
      failures.push({
        file: match[1],
        line: parseInt(match[2], 10),
        message: `${match[4]}: ${match[5].trim()}`,
        severity: 'error',
      });
    }

    // Generic error pattern
    const genericPattern = /error(?:\[\w+\])?:\s*(.+)/gi;
    while ((match = genericPattern.exec(output)) !== null) {
      const msg = match[1].trim();
      if (!failures.some(f => f.message.includes(msg))) {
        failures.push({
          message: msg,
          severity: 'error',
        });
      }
    }

    return failures;
  }

  private async detectBuildCommand(rootPath: string): Promise<string | null> {
    // TypeScript
    if (await pathExists(joinPath(rootPath, 'tsconfig.json'))) {
      return 'npm run build';
    }
    // Node.js
    if (await pathExists(joinPath(rootPath, 'package.json'))) {
      return 'npm run build';
    }
    // Rust
    if (await pathExists(joinPath(rootPath, 'Cargo.toml'))) {
      return 'cargo build';
    }
    // Go
    if (await pathExists(joinPath(rootPath, 'go.mod'))) {
      return 'go build';
    }
    // Make
    if (await pathExists(joinPath(rootPath, 'Makefile'))) {
      return 'make';
    }
    return null;
  }
}
