import { FailureDetail } from '../QualityCheck.js';

export class TestOutputParser {
  parse(output: string): FailureDetail[] {
    const failures: FailureDetail[] = [];

    // Jest pattern
    this.parseJestOutput(output, failures);
    
    // Mocha pattern
    this.parseMochaOutput(output, failures);
    
    // TAP format
    this.parseTapOutput(output, failures);
    
    // Python pytest pattern
    this.parsePytestOutput(output, failures);
    
    // Generic failure pattern
    this.parseGenericFailures(output, failures);

    return failures;
  }

  private parseJestOutput(output: string, failures: FailureDetail[]): void {
    // FAIL pattern
    const failPattern = /FAIL\s+(.+?)$/gm;
    let match;
    while ((match = failPattern.exec(output)) !== null) {
      failures.push({
        file: match[1].trim(),
        message: 'Test file failed',
        severity: 'error',
      });
    }

    // Test case pattern: ● TestSuiteName › testName
    const testPattern = /●\s+(.+?)\s*\n\s*\n?\s*(.+)/g;
    while ((match = testPattern.exec(output)) !== null) {
      failures.push({
        message: `${match[1]}: ${match[2]}`.trim(),
        severity: 'error',
      });
    }

    // Expect pattern with location
    const expectPattern = /expect\(.+\)\.(.+)\s*\n\s*at\s+(.+?):(\d+)/g;
    while ((match = expectPattern.exec(output)) !== null) {
      failures.push({
        file: match[2],
        line: parseInt(match[3], 10),
        message: `Expectation failed: ${match[1]}`,
        severity: 'error',
      });
    }
  }

  private parseMochaOutput(output: string, failures: FailureDetail[]): void {
    // Mocha failure pattern
    const pattern = /\d+\)\s+(.+?):\n\s*(.+)/g;
    let match;
    while ((match = pattern.exec(output)) !== null) {
      failures.push({
        message: `${match[1]}: ${match[2]}`.trim(),
        severity: 'error',
      });
    }
  }

  private parseTapOutput(output: string, failures: FailureDetail[]): void {
    // TAP not ok pattern
    const pattern = /not ok\s+\d+\s+(.+)/g;
    let match;
    while ((match = pattern.exec(output)) !== null) {
      failures.push({
        message: match[1].trim(),
        severity: 'error',
      });
    }
  }

  private parsePytestOutput(output: string, failures: FailureDetail[]): void {
    // pytest FAILED pattern
    const pattern = /FAILED\s+(.+?)::(.+?)(?:\s+-\s+(.+))?$/gm;
    let match;
    while ((match = pattern.exec(output)) !== null) {
      failures.push({
        file: match[1],
        message: match[3] ?? `Test ${match[2]} failed`,
        severity: 'error',
      });
    }

    // pytest error with location
    const errorPattern = /(.+?):(\d+):\s+(.+Error.+)/g;
    while ((match = errorPattern.exec(output)) !== null) {
      failures.push({
        file: match[1],
        line: parseInt(match[2], 10),
        message: match[3].trim(),
        severity: 'error',
      });
    }
  }

  private parseGenericFailures(output: string, failures: FailureDetail[]): void {
    // Generic error/failure patterns
    const patterns = [
      /(?:FAILED|FAIL|Error|AssertionError):?\s*(.+)/gi,
      /error:\s*(.+)/gi,
      /assertion failed:?\s*(.+)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const msg = match[1].trim();
        // Avoid duplicates
        if (!failures.some(f => f.message === msg)) {
          failures.push({
            message: msg,
            severity: 'error',
          });
        }
      }
    }
  }
}
