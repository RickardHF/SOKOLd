/**
 * State management for SOKOLd
 * 
 * Tracks the current pipeline state so --continue knows exactly where to resume.
 * State is stored in .sokold/state.yaml
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { parse, stringify } from 'yaml';

export type PipelineStep = 'specify' | 'plan' | 'tasks' | 'implement' | 'verify';

export interface PipelineState {
  /** The feature description that started this pipeline */
  description?: string;
  
  /** When the pipeline was started */
  startedAt: string;
  
  /** Last step that was completed successfully */
  lastCompletedStep?: PipelineStep;
  
  /** Current step in progress (if any) */
  currentStep?: PipelineStep;
  
  /** Steps that have been completed */
  completedSteps: PipelineStep[];
  
  /** Last updated timestamp */
  updatedAt: string;
}

const STATE_DIR = '.sokold';
const STATE_FILE = 'state.yaml';

/**
 * Get the path to the state file
 */
export function getStatePath(rootPath: string = process.cwd()): string {
  return join(rootPath, STATE_DIR, STATE_FILE);
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
 * Load the current pipeline state
 */
export function loadState(rootPath: string = process.cwd()): PipelineState | null {
  const statePath = getStatePath(rootPath);
  
  if (!existsSync(statePath)) {
    return null;
  }
  
  try {
    const content = readFileSync(statePath, 'utf-8');
    return parse(content) as PipelineState;
  } catch {
    return null;
  }
}

/**
 * Save the current pipeline state
 */
export function saveState(state: PipelineState, rootPath: string = process.cwd()): void {
  ensureStateDir(rootPath);
  const statePath = getStatePath(rootPath);
  
  state.updatedAt = new Date().toISOString();
  writeFileSync(statePath, stringify(state), 'utf-8');
}

/**
 * Initialize a new pipeline state
 */
export function initState(description?: string, rootPath: string = process.cwd()): PipelineState {
  const state: PipelineState = {
    description,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedSteps: [],
  };
  
  saveState(state, rootPath);
  return state;
}

/**
 * Mark a step as started
 */
export function markStepStarted(step: PipelineStep, rootPath: string = process.cwd()): void {
  const state = loadState(rootPath) || initState(undefined, rootPath);
  state.currentStep = step;
  saveState(state, rootPath);
}

/**
 * Mark a step as completed
 */
export function markStepCompleted(step: PipelineStep, rootPath: string = process.cwd()): void {
  const state = loadState(rootPath) || initState(undefined, rootPath);
  state.lastCompletedStep = step;
  state.currentStep = undefined;
  
  if (!state.completedSteps.includes(step)) {
    state.completedSteps.push(step);
  }
  
  saveState(state, rootPath);
}

/**
 * Get the next step to run based on state
 */
export function getNextStepFromState(rootPath: string = process.cwd()): PipelineStep | null {
  const state = loadState(rootPath);
  
  if (!state) {
    return null;
  }
  
  const allSteps: PipelineStep[] = ['specify', 'plan', 'tasks', 'implement', 'verify'];
  
  // If there's a current step in progress, resume from there
  if (state.currentStep) {
    return state.currentStep;
  }
  
  // Otherwise, find the next incomplete step
  if (state.lastCompletedStep) {
    const lastIndex = allSteps.indexOf(state.lastCompletedStep);
    if (lastIndex < allSteps.length - 1) {
      return allSteps[lastIndex + 1];
    }
  }
  
  // All steps complete or no state
  return null;
}

/**
 * Clear the pipeline state (for starting fresh)
 */
export function clearState(rootPath: string = process.cwd()): void {
  const statePath = getStatePath(rootPath);
  if (existsSync(statePath)) {
    unlinkSync(statePath);
  }
}

/**
 * Check if there's an active pipeline
 */
export function hasActiveState(rootPath: string = process.cwd()): boolean {
  const state = loadState(rootPath);
  if (!state) return false;
  
  // Has state and not all steps completed
  const allSteps: PipelineStep[] = ['specify', 'plan', 'tasks', 'implement', 'verify'];
  return state.completedSteps.length < allSteps.length;
}
