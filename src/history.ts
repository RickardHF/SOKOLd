/**
 * History tracking for SOKOLd
 * 
 * Maintains a history of pipeline runs so users can:
 * - See what was done in previous runs
 * - Request tweaks with context about past implementations
 * - Continue or retry with knowledge of what was attempted
 * 
 * History is stored in .sokold/history.yaml
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parse, stringify } from 'yaml';

const STATE_DIR = '.sokold';
const HISTORY_FILE = 'history.yaml';
const MAX_HISTORY_ENTRIES = 50; // Keep last 50 runs

export type StepName = 'init' | 'constitution' | 'specify' | 'plan' | 'tasks' | 'implement' | 'verify' | 'fix';

export type StepOutcome = 'success' | 'failed' | 'skipped' | 'in-progress';

/**
 * Record of a single step execution
 */
export interface StepRecord {
  /** Step name */
  step: StepName;
  
  /** When the step started */
  startedAt: string;
  
  /** When the step completed (if completed) */
  completedAt?: string;
  
  /** Outcome of the step */
  outcome: StepOutcome;
  
  /** The prompt/command sent to the AI tool */
  prompt?: string;
  
  /** Duration in seconds */
  durationSeconds?: number;
  
  /** Any error message if failed */
  error?: string;
}

/**
 * Record of a file change
 */
export interface FileChange {
  /** Relative path to the file */
  path: string;
  
  /** Type of change */
  action: 'created' | 'modified' | 'deleted';
  
  /** When the change was detected */
  timestamp: string;
  
  /** Which step caused this change */
  step: StepName;
}

/**
 * A single history entry representing one pipeline run
 */
export interface HistoryEntry {
  /** Unique ID for this run */
  id: string;
  
  /** When the run started */
  startedAt: string;
  
  /** When the run completed (if completed) */
  completedAt?: string;
  
  /** The feature description that started this run */
  description?: string;
  
  /** Whether this was a --continue run */
  isContinuation: boolean;
  
  /** AI tool used */
  tool: 'copilot' | 'claude';
  
  /** Model used (if specified) */
  model?: string;
  
  /** All steps executed in this run */
  steps: StepRecord[];
  
  /** Files changed during this run */
  filesChanged: FileChange[];
  
  /** Overall outcome */
  outcome: 'success' | 'partial' | 'failed' | 'in-progress';
  
  /** Total duration in seconds */
  totalDurationSeconds?: number;
  
  /** Number of fix attempts made */
  fixAttempts: number;
  
  /** Any notes or context (for tweaks) */
  notes?: string;
}

/**
 * Full history structure
 */
export interface History {
  /** Schema version for future compatibility */
  version: number;
  
  /** All history entries, newest first */
  entries: HistoryEntry[];
  
  /** ID of the current/active run (if any) */
  activeRunId?: string;
}

/**
 * Get the path to the history file
 */
export function getHistoryPath(rootPath: string = process.cwd()): string {
  return join(rootPath, STATE_DIR, HISTORY_FILE);
}

/**
 * Ensure the state directory exists
 */
function ensureStateDir(rootPath: string = process.cwd()): void {
  const stateDir = join(rootPath, STATE_DIR);
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
}

/**
 * Generate a unique run ID
 */
function generateRunId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `run-${timestamp}-${random}`;
}

/**
 * Load the history
 */
export function loadHistory(rootPath: string = process.cwd()): History {
  const historyPath = getHistoryPath(rootPath);
  
  if (!existsSync(historyPath)) {
    return { version: 1, entries: [] };
  }
  
  try {
    const content = readFileSync(historyPath, 'utf-8');
    const history = parse(content) as History;
    return history || { version: 1, entries: [] };
  } catch {
    return { version: 1, entries: [] };
  }
}

/**
 * Save the history
 */
export function saveHistory(history: History, rootPath: string = process.cwd()): void {
  ensureStateDir(rootPath);
  const historyPath = getHistoryPath(rootPath);
  
  // Prune old entries if needed
  if (history.entries.length > MAX_HISTORY_ENTRIES) {
    history.entries = history.entries.slice(0, MAX_HISTORY_ENTRIES);
  }
  
  writeFileSync(historyPath, stringify(history), 'utf-8');
}

/**
 * Start a new history entry for a pipeline run
 */
export function startHistoryEntry(
  options: {
    description?: string;
    isContinuation: boolean;
    tool: 'copilot' | 'claude';
    model?: string;
  },
  rootPath: string = process.cwd()
): HistoryEntry {
  const history = loadHistory(rootPath);
  
  const entry: HistoryEntry = {
    id: generateRunId(),
    startedAt: new Date().toISOString(),
    description: options.description,
    isContinuation: options.isContinuation,
    tool: options.tool,
    model: options.model,
    steps: [],
    filesChanged: [],
    outcome: 'in-progress',
    fixAttempts: 0,
  };
  
  // Add to front of history
  history.entries.unshift(entry);
  history.activeRunId = entry.id;
  
  saveHistory(history, rootPath);
  return entry;
}

/**
 * Get the current active run
 */
export function getActiveRun(rootPath: string = process.cwd()): HistoryEntry | null {
  const history = loadHistory(rootPath);
  
  if (!history.activeRunId) {
    return null;
  }
  
  return history.entries.find(e => e.id === history.activeRunId) || null;
}

/**
 * Record a step starting
 */
export function recordStepStart(
  step: StepName,
  prompt?: string,
  rootPath: string = process.cwd()
): void {
  const history = loadHistory(rootPath);
  const entry = history.entries.find(e => e.id === history.activeRunId);
  
  if (!entry) return;
  
  const stepRecord: StepRecord = {
    step,
    startedAt: new Date().toISOString(),
    outcome: 'in-progress',
    prompt,
  };
  
  entry.steps.push(stepRecord);
  saveHistory(history, rootPath);
}

/**
 * Record a step completing
 */
export function recordStepComplete(
  step: StepName,
  outcome: 'success' | 'failed',
  error?: string,
  rootPath: string = process.cwd()
): void {
  const history = loadHistory(rootPath);
  const entry = history.entries.find(e => e.id === history.activeRunId);
  
  if (!entry) return;
  
  // Find the step record (last one matching this step name that's in-progress)
  const stepRecord = [...entry.steps].reverse().find(
    s => s.step === step && s.outcome === 'in-progress'
  );
  
  if (stepRecord) {
    const completedAt = new Date();
    stepRecord.completedAt = completedAt.toISOString();
    stepRecord.outcome = outcome;
    stepRecord.error = error;
    stepRecord.durationSeconds = Math.round(
      (completedAt.getTime() - new Date(stepRecord.startedAt).getTime()) / 1000
    );
  }
  
  saveHistory(history, rootPath);
}

/**
 * Record a file change
 */
export function recordFileChange(
  path: string,
  action: 'created' | 'modified' | 'deleted',
  step: StepName,
  rootPath: string = process.cwd()
): void {
  const history = loadHistory(rootPath);
  const entry = history.entries.find(e => e.id === history.activeRunId);
  
  if (!entry) return;
  
  entry.filesChanged.push({
    path,
    action,
    timestamp: new Date().toISOString(),
    step,
  });
  
  saveHistory(history, rootPath);
}

/**
 * Record multiple file changes at once
 */
export function recordFileChanges(
  changes: Array<{ path: string; action: 'created' | 'modified' | 'deleted' }>,
  step: StepName,
  rootPath: string = process.cwd()
): void {
  const history = loadHistory(rootPath);
  const entry = history.entries.find(e => e.id === history.activeRunId);
  
  if (!entry) return;
  
  const timestamp = new Date().toISOString();
  for (const change of changes) {
    entry.filesChanged.push({
      path: change.path,
      action: change.action,
      timestamp,
      step,
    });
  }
  
  saveHistory(history, rootPath);
}

/**
 * Increment fix attempt counter
 */
export function recordFixAttempt(rootPath: string = process.cwd()): void {
  const history = loadHistory(rootPath);
  const entry = history.entries.find(e => e.id === history.activeRunId);
  
  if (!entry) return;
  
  entry.fixAttempts++;
  saveHistory(history, rootPath);
}

/**
 * Complete the current run
 */
export function completeHistoryEntry(
  outcome: 'success' | 'partial' | 'failed',
  notes?: string,
  rootPath: string = process.cwd()
): void {
  const history = loadHistory(rootPath);
  const entry = history.entries.find(e => e.id === history.activeRunId);
  
  if (!entry) return;
  
  const completedAt = new Date();
  entry.completedAt = completedAt.toISOString();
  entry.outcome = outcome;
  entry.notes = notes;
  entry.totalDurationSeconds = Math.round(
    (completedAt.getTime() - new Date(entry.startedAt).getTime()) / 1000
  );
  
  // Clear active run
  history.activeRunId = undefined;
  
  saveHistory(history, rootPath);
}

/**
 * Add a note to the current or most recent run
 */
export function addRunNote(note: string, rootPath: string = process.cwd()): void {
  const history = loadHistory(rootPath);
  
  // Find active run or most recent
  const entry = history.activeRunId 
    ? history.entries.find(e => e.id === history.activeRunId)
    : history.entries[0];
  
  if (!entry) return;
  
  entry.notes = entry.notes ? `${entry.notes}\n${note}` : note;
  saveHistory(history, rootPath);
}

/**
 * Get recent history entries
 */
export function getRecentHistory(
  count: number = 10,
  rootPath: string = process.cwd()
): HistoryEntry[] {
  const history = loadHistory(rootPath);
  return history.entries.slice(0, count);
}

/**
 * Get a specific history entry by index (0 = most recent)
 */
export function getHistoryEntry(
  index: number,
  rootPath: string = process.cwd()
): HistoryEntry | null {
  const history = loadHistory(rootPath);
  return history.entries[index] || null;
}

/**
 * Get the last completed run (for context when tweaking)
 */
export function getLastCompletedRun(rootPath: string = process.cwd()): HistoryEntry | null {
  const history = loadHistory(rootPath);
  return history.entries.find(e => e.outcome !== 'in-progress') || null;
}

/**
 * Format a history entry for display
 */
export function formatHistoryEntry(entry: HistoryEntry, verbose: boolean = false): string {
  const lines: string[] = [];
  
  const statusEmoji = {
    'success': '✅',
    'partial': '⚠️',
    'failed': '❌',
    'in-progress': '🔄',
  }[entry.outcome];
  
  const date = new Date(entry.startedAt);
  const dateStr = date.toLocaleDateString();
  const timeStr = date.toLocaleTimeString();
  
  lines.push(`${statusEmoji} Run ${entry.id.substring(4, 12)} - ${dateStr} ${timeStr}`);
  
  if (entry.description) {
    const truncDesc = entry.description.length > 60 
      ? entry.description.substring(0, 57) + '...'
      : entry.description;
    lines.push(`   "${truncDesc}"`);
  } else if (entry.isContinuation) {
    lines.push('   (continuation run)');
  }
  
  // Steps summary
  const successSteps = entry.steps.filter(s => s.outcome === 'success').map(s => s.step);
  const failedSteps = entry.steps.filter(s => s.outcome === 'failed').map(s => s.step);
  
  if (successSteps.length > 0) {
    lines.push(`   Steps: ${successSteps.join(' → ')}`);
  }
  if (failedSteps.length > 0) {
    lines.push(`   Failed: ${failedSteps.join(', ')}`);
  }
  
  // Duration
  if (entry.totalDurationSeconds) {
    const mins = Math.floor(entry.totalDurationSeconds / 60);
    const secs = entry.totalDurationSeconds % 60;
    lines.push(`   Duration: ${mins > 0 ? `${mins}m ` : ''}${secs}s`);
  }
  
  // Verbose details
  if (verbose) {
    lines.push(`   Tool: ${entry.tool}${entry.model ? ` (${entry.model})` : ''}`);
    
    if (entry.filesChanged.length > 0) {
      lines.push(`   Files changed: ${entry.filesChanged.length}`);
      for (const fc of entry.filesChanged.slice(0, 5)) {
        lines.push(`     ${fc.action}: ${fc.path}`);
      }
      if (entry.filesChanged.length > 5) {
        lines.push(`     ... and ${entry.filesChanged.length - 5} more`);
      }
    }
    
    if (entry.fixAttempts > 0) {
      lines.push(`   Fix attempts: ${entry.fixAttempts}`);
    }
    
    if (entry.notes) {
      lines.push(`   Notes: ${entry.notes}`);
    }
    
    // Show step details
    lines.push('   Step details:');
    for (const step of entry.steps) {
      const stepEmoji = {
        'success': '✓',
        'failed': '✗',
        'skipped': '○',
        'in-progress': '…',
      }[step.outcome];
      const duration = step.durationSeconds ? ` (${step.durationSeconds}s)` : '';
      lines.push(`     ${stepEmoji} ${step.step}${duration}`);
      if (step.error) {
        lines.push(`       Error: ${step.error}`);
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Format history for display
 */
export function formatHistory(
  entries: HistoryEntry[],
  verbose: boolean = false
): string {
  if (entries.length === 0) {
    return 'No history entries found.';
  }
  
  const lines: string[] = [''];
  for (const entry of entries) {
    lines.push(formatHistoryEntry(entry, verbose));
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Build context string from recent history for AI prompts
 * This provides context about what was done so the user can request tweaks
 */
export function buildHistoryContext(rootPath: string = process.cwd()): string {
  const lastRun = getLastCompletedRun(rootPath);
  
  if (!lastRun) {
    return '';
  }
  
  const lines: string[] = [
    '--- Previous Run Context ---',
    `Description: ${lastRun.description || '(continuation)'}`,
    `Outcome: ${lastRun.outcome}`,
    `Steps completed: ${lastRun.steps.filter(s => s.outcome === 'success').map(s => s.step).join(', ')}`,
  ];
  
  if (lastRun.filesChanged.length > 0) {
    lines.push('Files modified:');
    for (const fc of lastRun.filesChanged) {
      lines.push(`  - ${fc.action}: ${fc.path}`);
    }
  }
  
  if (lastRun.notes) {
    lines.push(`Notes: ${lastRun.notes}`);
  }
  
  lines.push('--- End Previous Run Context ---');
  
  return lines.join('\n');
}
