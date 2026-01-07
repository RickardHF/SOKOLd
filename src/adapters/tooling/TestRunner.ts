import { QualityCheck, QualityCheckType, QualityCheckResult, FailureDetail } from './QualityCheck.js';
import { runCommand } from '../../utils/process.js';
import { pathExists, joinPath } from '../../utils/filesystem.js';

export class TestRunner implements QualityCheck {
  readonly type = QualityCheckType.TEST;

  async detect(rootPath: string): Promise<boolean> {
    // Check for common test configurations
    const configs = [
      'jest.config.js',
      'jest.config.ts',
      'vitest.config.ts',
      'vitest.config.js',
      'pytest.ini',
      'pyproject.toml',
      'Cargo.toml',
      'go.mod',
    ];

    for (const config of configs) {
      if (await pathExists(joinPath(rootPath, config))) {
        return true;
      }
    }

    // Check for package.json with test script
    const packageJsonPath = joinPath(rootPath, 'package.json');
    if (await pathExists(packageJsonPath)) {
      return true;
    }

    return false;
  }

  async run(rootPath: string, command?: string): Promise<QualityCheckResult> {
    const startTime = Date.now();
    const testCommand = command ?? await this.detectTestCommand(rootPath);
    
    if (!testCommand) {
      return {
        type: this.type,
        passed: true,
        output: 'No test command detected',
        failures: [],
        duration: Date.now() - startTime,
      };
    }

    const [cmd, ...args] = testCommand.split(' ');
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

    // Jest pattern
    const jestPattern = /FAIL\s+(.+?)\s*\n|●\s+(.+?)\s*\n\s*(.+)/g;
    let match;
    while ((match = jestPattern.exec(output)) !== null) {
      if (match[1]) {
        failures.push({
          file: match[1].trim(),
          message: 'Test file failed',
          severity: 'error',
        });
      }
    }

    // Generic test failure pattern
    const genericPattern = /(?:FAILED|FAIL|Error|AssertionError):?\s*(.+)/gi;
    while ((match = genericPattern.exec(output)) !== null) {
      failures.push({
        message: match[1].trim(),
        severity: 'error',
      });
    }

    return failures;
  }

  private async detectTestCommand(rootPath: string): Promise<string | null> {
    // Node.js
    if (await pathExists(joinPath(rootPath, 'package.json'))) {
      return 'npm test';
    }
    // Python
    if (await pathExists(joinPath(rootPath, 'pytest.ini')) || 
        await pathExists(joinPath(rootPath, 'pyproject.toml'))) {
      return 'pytest';
    }
    // Rust
    if (await pathExists(joinPath(rootPath, 'Cargo.toml'))) {
      return 'cargo test';
    }
    // Go
    if (await pathExists(joinPath(rootPath, 'go.mod'))) {
      return 'go test ./...';
    }
    return null;
  }
}
