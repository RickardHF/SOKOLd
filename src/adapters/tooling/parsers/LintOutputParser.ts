import { FailureDetail } from '../QualityCheck.js';

export class LintOutputParser {
  parse(output: string): FailureDetail[] {
    const failures: FailureDetail[] = [];

    // Try JSON format first
    this.parseJsonOutput(output, failures);
    
    if (failures.length === 0) {
      // ESLint standard format
      this.parseEslintOutput(output, failures);
      
      // Pylint format
      this.parsePylintOutput(output, failures);
      
      // Clippy format
      this.parseClippyOutput(output, failures);
      
      // Generic lint pattern
      this.parseGenericLintOutput(output, failures);
    }

    return failures;
  }

  private parseJsonOutput(output: string, failures: FailureDetail[]): void {
    try {
      // Try to find JSON array in output
      const jsonMatch = output.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0]) as Array<{
          filePath?: string;
          messages?: Array<{
            line?: number;
            column?: number;
            message?: string;
            severity?: number;
            ruleId?: string;
          }>;
        }>;

        for (const file of results) {
          if (file.messages) {
            for (const msg of file.messages) {
              failures.push({
                file: file.filePath,
                line: msg.line,
                message: msg.ruleId ? `${msg.ruleId}: ${msg.message}` : msg.message ?? 'Lint error',
                severity: msg.severity === 2 ? 'error' : 'warning',
              });
            }
          }
        }
      }
    } catch {
      // Not JSON format, continue to other parsers
    }
  }

  private parseEslintOutput(output: string, failures: FailureDetail[]): void {
    // ESLint format: /path/to/file.ts:10:5: error message (rule-name)
    const pattern = /(.+?):(\d+):(\d+):\s*(error|warning)\s+(.+?)(?:\s+\((.+)\))?$/gm;
    let match;
    while ((match = pattern.exec(output)) !== null) {
      failures.push({
        file: match[1],
        line: parseInt(match[2], 10),
        message: match[6] ? `${match[6]}: ${match[5]}` : match[5],
        severity: match[4] as 'error' | 'warning',
      });
    }

    // Alternative format: file.ts(10,5): error ...
    const altPattern = /(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(.+)/gi;
    while ((match = altPattern.exec(output)) !== null) {
      failures.push({
        file: match[1],
        line: parseInt(match[2], 10),
        message: match[5],
        severity: match[4].toLowerCase() as 'error' | 'warning',
      });
    }
  }

  private parsePylintOutput(output: string, failures: FailureDetail[]): void {
    // Pylint format: file.py:10:0: E0001: error message (error-code)
    const pattern = /(.+?):(\d+):\d+:\s*([CRWEF]\d{4}):\s*(.+)/g;
    let match;
    while ((match = pattern.exec(output)) !== null) {
      const severity = match[3].startsWith('E') || match[3].startsWith('F') ? 'error' : 'warning';
      failures.push({
        file: match[1],
        line: parseInt(match[2], 10),
        message: `${match[3]}: ${match[4]}`,
        severity,
      });
    }
  }

  private parseClippyOutput(output: string, failures: FailureDetail[]): void {
    // Rust Clippy format: warning: message
    //                     --> file.rs:10:5
    const pattern = /(warning|error)(?:\[.+?\])?:\s*(.+?)\n\s*-->\s*(.+?):(\d+):\d+/g;
    let match;
    while ((match = pattern.exec(output)) !== null) {
      failures.push({
        file: match[3],
        line: parseInt(match[4], 10),
        message: match[2],
        severity: match[1] as 'error' | 'warning',
      });
    }
  }

  private parseGenericLintOutput(output: string, failures: FailureDetail[]): void {
    // Generic: file:line: message
    const pattern = /(.+?):(\d+):\s*(?:error|warning|lint):\s*(.+)/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(output)) !== null) {
      const msg = match[3].trim();
      const file = match[1];
      if (!failures.some(f => f.message === msg && f.file === file)) {
        failures.push({
          file,
          line: parseInt(match[2], 10),
          message: msg,
          severity: 'error',
        });
      }
    }
  }
}
