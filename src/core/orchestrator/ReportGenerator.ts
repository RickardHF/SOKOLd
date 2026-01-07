import { SessionTracker } from '../state/SessionTracker.js';
import { ImplementationResult } from './FeatureOrchestrator.js';

export interface ExecutionReport {
  sessionId: string;
  startedAt: string;
  completedAt: string | null;
  duration: number;
  features: {
    implemented: string[];
    failed: string[];
    skipped: string[];
  };
  summary: {
    successCount: number;
    failureCount: number;
    skippedCount: number;
    totalChecks: number;
    checksPassed: number;
    checksFixed: number;
  };
  exitCode: number;
}

export class ReportGenerator {
  generateReport(
    sessionTracker: SessionTracker,
    results: ImplementationResult[],
    skipped: string[] = []
  ): ExecutionReport {
    const session = sessionTracker.getSession();
    
    const implemented = results.filter(r => r.success).map(r => r.featureId);
    const failed = results.filter(r => !r.success).map(r => r.featureId);
    const checksFixed = results.reduce((sum, r) => sum + r.retries, 0);

    return {
      sessionId: session.id,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      duration: sessionTracker.getDuration(),
      features: {
        implemented,
        failed,
        skipped,
      },
      summary: {
        successCount: session.successCount,
        failureCount: session.failureCount,
        skippedCount: session.skippedCount,
        totalChecks: session.totalChecksRun,
        checksPassed: session.totalChecksPassed,
        checksFixed,
      },
      exitCode: failed.length > 0 ? 3 : 0,
    };
  }

  formatReport(report: ExecutionReport): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('✅ Implementation complete!');
    lines.push(`   Success: ${report.summary.successCount} features`);
    lines.push(`   Failed: ${report.summary.failureCount} features`);
    lines.push(`   Skipped: ${report.summary.skippedCount} features`);
    lines.push('');
    lines.push(`   Total checks: ${report.summary.totalChecks}`);
    lines.push(`   Passed: ${report.summary.checksPassed}`);
    lines.push(`   Fixed: ${report.summary.checksFixed}`);
    lines.push('');
    lines.push(`   Session ID: ${report.sessionId}`);
    lines.push(`   Duration: ${this.formatDuration(report.duration)}`);
    lines.push(`   Log: .speckit-automate/logs/session-${report.sessionId}.json`);

    return lines.join('\n');
  }

  formatJson(report: ExecutionReport): string {
    return JSON.stringify(report, null, 2);
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }
}
