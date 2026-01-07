import { TestRunner } from '../../adapters/tooling/TestRunner.js';
import { Linter } from '../../adapters/tooling/Linter.js';
import { Builder } from '../../adapters/tooling/Builder.js';
import { QualityCheckResult, QualityCheckType } from '../../adapters/tooling/QualityCheck.js';

export class QualityCheckRunner {
  private rootPath: string;
  private testRunner: TestRunner;
  private linter: Linter;
  private builder: Builder;
  private customCommands: {
    test?: string;
    lint?: string;
    build?: string;
  };

  constructor(
    rootPath: string,
    customCommands: { test?: string; lint?: string; build?: string } = {}
  ) {
    this.rootPath = rootPath;
    this.testRunner = new TestRunner();
    this.linter = new Linter();
    this.builder = new Builder();
    this.customCommands = customCommands;
  }

  getRootPath(): string {
    return this.rootPath;
  }

  async runTests(): Promise<QualityCheckResult> {
    const hasTests = await this.testRunner.detect(this.rootPath);
    if (!hasTests && !this.customCommands.test) {
      return {
        type: QualityCheckType.TEST,
        passed: true,
        output: 'No tests detected',
        failures: [],
        duration: 0,
      };
    }

    return this.testRunner.run(this.rootPath, this.customCommands.test);
  }

  async runLinting(): Promise<QualityCheckResult> {
    const hasLinter = await this.linter.detect(this.rootPath);
    if (!hasLinter && !this.customCommands.lint) {
      return {
        type: QualityCheckType.LINT,
        passed: true,
        output: 'No linter detected',
        failures: [],
        duration: 0,
      };
    }

    return this.linter.run(this.rootPath, this.customCommands.lint);
  }

  async runBuild(): Promise<QualityCheckResult> {
    const hasBuild = await this.builder.detect(this.rootPath);
    if (!hasBuild && !this.customCommands.build) {
      return {
        type: QualityCheckType.BUILD,
        passed: true,
        output: 'No build tool detected',
        failures: [],
        duration: 0,
      };
    }

    return this.builder.run(this.rootPath, this.customCommands.build);
  }

  async runAll(): Promise<QualityCheckResult[]> {
    const results: QualityCheckResult[] = [];
    
    results.push(await this.runTests());
    results.push(await this.runLinting());
    results.push(await this.runBuild());

    return results;
  }

  allPassed(results: QualityCheckResult[]): boolean {
    return results.every(r => r.passed);
  }

  getFailures(results: QualityCheckResult[]): QualityCheckResult[] {
    return results.filter(r => !r.passed);
  }
}
