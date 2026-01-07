import { FailureDetail } from '../QualityCheck.js';

export class BuildOutputParser {
  parse(output: string): FailureDetail[] {
    const failures: FailureDetail[] = [];

    // TypeScript compiler errors
    this.parseTypeScriptOutput(output, failures);
    
    // Rust cargo errors
    this.parseRustOutput(output, failures);
    
    // Go build errors
    this.parseGoOutput(output, failures);
    
    // Generic compiler errors
    this.parseGenericOutput(output, failures);

    return failures;
  }

  private parseTypeScriptOutput(output: string, failures: FailureDetail[]): void {
    // TypeScript format: file.ts(10,5): error TS2322: Type 'x' is not assignable
    const pattern = /(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)/g;
    let match;
    while ((match = pattern.exec(output)) !== null) {
      failures.push({
        file: match[1],
        line: parseInt(match[2], 10),
        message: `${match[4]}: ${match[5]}`,
        severity: 'error',
      });
    }

    // Alternative format: file.ts:10:5 - error TS2322: ...
    const altPattern = /(.+?):(\d+):(\d+)\s*-\s*error\s+(TS\d+):\s*(.+)/g;
    while ((match = altPattern.exec(output)) !== null) {
      failures.push({
        file: match[1],
        line: parseInt(match[2], 10),
        message: `${match[4]}: ${match[5]}`,
        severity: 'error',
      });
    }
  }

  private parseRustOutput(output: string, failures: FailureDetail[]): void {
    // Rust format: error[E0001]: message
    //              --> file.rs:10:5
    const pattern = /error(?:\[E\d+\])?:\s*(.+?)\n\s*-->\s*(.+?):(\d+):\d+/g;
    let match;
    while ((match = pattern.exec(output)) !== null) {
      failures.push({
        file: match[2],
        line: parseInt(match[3], 10),
        message: match[1],
        severity: 'error',
      });
    }
  }

  private parseGoOutput(output: string, failures: FailureDetail[]): void {
    // Go format: ./file.go:10:5: error message
    const pattern = /\.\/(.+?):(\d+):\d+:\s*(.+)/g;
    let match;
    while ((match = pattern.exec(output)) !== null) {
      failures.push({
        file: match[1],
        line: parseInt(match[2], 10),
        message: match[3],
        severity: 'error',
      });
    }
  }

  private parseGenericOutput(output: string, failures: FailureDetail[]): void {
    // Generic error patterns
    const patterns = [
      // GCC/Clang: file.c:10:5: error: message
      /(.+?):(\d+):\d+:\s*error:\s*(.+)/gi,
      // Generic: error: message
      /^error:\s*(.+)$/gm,
      // Fatal error pattern
      /fatal error:\s*(.+)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        if (match.length >= 4) {
          // Has file and line
          failures.push({
            file: match[1],
            line: parseInt(match[2], 10),
            message: match[3].trim(),
            severity: 'error',
          });
        } else {
          // Just message
          const msg = match[1].trim();
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
}
