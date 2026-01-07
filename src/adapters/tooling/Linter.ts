import { QualityCheck, QualityCheckType, QualityCheckResult, FailureDetail } from './QualityCheck.js';
import { runCommand } from '../../utils/process.js';
import { pathExists, joinPath } from '../../utils/filesystem.js';

export class Linter implements QualityCheck {
  readonly type = QualityCheckType.LINT;

  async detect(rootPath: string): Promise<boolean> {
    const configs = [
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yaml',
      '.eslintrc.yml',
      'eslint.config.js',
      'eslint.config.mjs',
      '.pylintrc',
      'pyproject.toml',
      'clippy.toml',
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
    const lintCommand = command ?? await this.detectLintCommand(rootPath);
    
    if (!lintCommand) {
      return {
        type: this.type,
        passed: true,
        output: 'No lint command detected',
        failures: [],
        duration: Date.now() - startTime,
      };
    }

    const [cmd, ...args] = lintCommand.split(' ');
    const result = await runCommand(cmd, args, { cwd: rootPath, timeout: 120000 });

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

    // ESLint pattern: path/file.ts:line:col: error message
    const eslintPattern = /(.+?):(\d+):(\d+):\s*(error|warning)\s+(.+)/gi;
    let match;
    while ((match = eslintPattern.exec(output)) !== null) {
      failures.push({
        file: match[1],
        line: parseInt(match[2], 10),
        message: match[5].trim(),
        severity: match[4].toLowerCase() as 'error' | 'warning',
      });
    }

    // Generic error pattern
    const genericPattern = /(?:error|warning):\s*(.+)/gi;
    while ((match = genericPattern.exec(output)) !== null) {
      // Avoid duplicates
      const msg = match[1].trim();
      if (!failures.some(f => f.message === msg)) {
        failures.push({
          message: msg,
          severity: 'error',
        });
      }
    }

    return failures;
  }

  private async detectLintCommand(rootPath: string): Promise<string | null> {
    // ESLint
    if (await pathExists(joinPath(rootPath, '.eslintrc.js')) ||
        await pathExists(joinPath(rootPath, '.eslintrc.json')) ||
        await pathExists(joinPath(rootPath, 'eslint.config.js'))) {
      return 'npm run lint';
    }
    // Python
    if (await pathExists(joinPath(rootPath, '.pylintrc'))) {
      return 'pylint';
    }
    // Rust
    if (await pathExists(joinPath(rootPath, 'Cargo.toml'))) {
      return 'cargo clippy';
    }
    // Go
    if (await pathExists(joinPath(rootPath, 'go.mod'))) {
      return 'golint ./...';
    }
    return null;
  }
}
