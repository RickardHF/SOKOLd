import { ensureDir, writeFile, joinPath } from '../../utils/filesystem.js';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  data?: Record<string, unknown>;
}

export interface SessionData {
  id: string;
  startedAt: string;
  completedAt: string | null;
  featuresProcessed: string[];
  successCount: number;
  failureCount: number;
  skippedCount: number;
  totalChecksRun: number;
  totalChecksPassed: number;
  logs: LogEntry[];
}

export class SessionTracker {
  private session: SessionData;
  private logsDir: string;

  constructor(rootPath: string) {
    this.logsDir = joinPath(rootPath, '.speckit-automate', 'logs');
    this.session = this.createNewSession();
  }

  private createNewSession(): SessionData {
    const id = this.generateSessionId();
    return {
      id,
      startedAt: new Date().toISOString(),
      completedAt: null,
      featuresProcessed: [],
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      totalChecksRun: 0,
      totalChecksPassed: 0,
      logs: [],
    };
  }

  private generateSessionId(): string {
    // Simple alphanumeric ID
    return Math.random().toString(36).substring(2, 10);
  }

  getSessionId(): string {
    return this.session.id;
  }

  getSession(): SessionData {
    return { ...this.session };
  }

  addFeatureProcessed(featureId: string): void {
    if (!this.session.featuresProcessed.includes(featureId)) {
      this.session.featuresProcessed.push(featureId);
    }
  }

  incrementSuccess(): void {
    this.session.successCount++;
  }

  incrementFailure(): void {
    this.session.failureCount++;
  }

  incrementSkipped(): void {
    this.session.skippedCount++;
  }

  addChecksRun(count: number): void {
    this.session.totalChecksRun += count;
  }

  addChecksPassed(count: number): void {
    this.session.totalChecksPassed += count;
  }

  log(level: LogEntry['level'], message: string, data?: Record<string, unknown>): void {
    this.session.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    });
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warning(message: string, data?: Record<string, unknown>): void {
    this.log('warning', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  complete(): void {
    this.session.completedAt = new Date().toISOString();
  }

  async save(): Promise<string> {
    await ensureDir(this.logsDir);
    const logPath = joinPath(this.logsDir, `session-${this.session.id}.json`);
    await writeFile(logPath, JSON.stringify(this.session, null, 2));
    return logPath;
  }

  getDuration(): number {
    const start = new Date(this.session.startedAt).getTime();
    const end = this.session.completedAt 
      ? new Date(this.session.completedAt).getTime()
      : Date.now();
    return Math.round((end - start) / 1000);
  }

  formatDuration(): string {
    const seconds = this.getDuration();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }
}
