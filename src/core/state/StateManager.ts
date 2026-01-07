import * as path from 'path';
import { pathExists, readFile, writeFile, ensureDir, joinPath } from '../../utils/filesystem.js';
import { PipelineStep } from '../orchestrator/ProjectState.js';

export enum ImplementationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  TESTING = 'testing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export interface FeatureState {
  status: ImplementationStatus;
  implementedSteps: string[];
  failedChecks: string[];
  retryCount: number;
  lastAttempt: string | null;
}

export interface StateFile {
  version: string;
  lastRun: string | null;
  features: Record<string, FeatureState>;
  checkpoint: PipelineStep | null;
  currentFeatureId: string | null;
}

const STATE_VERSION = '1.0.0';

export class StateManager {
  private statePath: string;
  private state: StateFile;

  constructor(rootPath: string) {
    this.statePath = joinPath(rootPath, '.sokold', 'state.json');
    this.state = this.createEmptyState();
  }

  private createEmptyState(): StateFile {
    return {
      version: STATE_VERSION,
      lastRun: null,
      features: {},
      checkpoint: null,
      currentFeatureId: null,
    };
  }

  async load(): Promise<StateFile> {
    if (await pathExists(this.statePath)) {
      try {
        const content = await readFile(this.statePath);
        this.state = JSON.parse(content) as StateFile;
        // Ensure version compatibility
        if (!this.state.version) {
          this.state.version = STATE_VERSION;
        }
        // Ensure new fields exist
        if (!this.state.checkpoint) {
          this.state.checkpoint = null;
        }
        if (!this.state.currentFeatureId) {
          this.state.currentFeatureId = null;
        }
      } catch {
        this.state = this.createEmptyState();
      }
    } else {
      this.state = this.createEmptyState();
    }
    return this.state;
  }

  async save(): Promise<void> {
    await ensureDir(path.dirname(this.statePath));
    await writeFile(this.statePath, JSON.stringify(this.state, null, 2));
  }

  getState(): StateFile {
    return { ...this.state };
  }

  getLastCheckpoint(): PipelineStep | null {
    return this.state.checkpoint;
  }

  setCheckpoint(step: PipelineStep): void {
    this.state.checkpoint = step;
    this.state.lastRun = new Date().toISOString();
  }

  clearCheckpoint(): void {
    this.state.checkpoint = null;
  }

  getCurrentFeatureId(): string | null {
    return this.state.currentFeatureId;
  }

  setCurrentFeatureId(featureId: string | null): void {
    this.state.currentFeatureId = featureId;
  }

  getFeatureState(featureId: string): FeatureState | null {
    return this.state.features[featureId] ?? null;
  }

  setFeatureState(featureId: string, state: Partial<FeatureState>): void {
    const existing = this.state.features[featureId] ?? this.createEmptyFeatureState();
    this.state.features[featureId] = { ...existing, ...state };
  }

  createEmptyFeatureState(): FeatureState {
    return {
      status: ImplementationStatus.PENDING,
      implementedSteps: [],
      failedChecks: [],
      retryCount: 0,
      lastAttempt: null,
    };
  }

  updateFeatureStatus(featureId: string, status: ImplementationStatus): void {
    if (!this.state.features[featureId]) {
      this.state.features[featureId] = this.createEmptyFeatureState();
    }
    this.state.features[featureId].status = status;
    this.state.features[featureId].lastAttempt = new Date().toISOString();
  }

  addImplementedStep(featureId: string, step: string): void {
    if (!this.state.features[featureId]) {
      this.state.features[featureId] = this.createEmptyFeatureState();
    }
    if (!this.state.features[featureId].implementedSteps.includes(step)) {
      this.state.features[featureId].implementedSteps.push(step);
    }
  }

  addFailedCheck(featureId: string, check: string): void {
    if (!this.state.features[featureId]) {
      this.state.features[featureId] = this.createEmptyFeatureState();
    }
    if (!this.state.features[featureId].failedChecks.includes(check)) {
      this.state.features[featureId].failedChecks.push(check);
    }
  }

  incrementRetryCount(featureId: string): number {
    if (!this.state.features[featureId]) {
      this.state.features[featureId] = this.createEmptyFeatureState();
    }
    this.state.features[featureId].retryCount++;
    return this.state.features[featureId].retryCount;
  }

  resetFeature(featureId: string): void {
    this.state.features[featureId] = this.createEmptyFeatureState();
  }

  resetAllFeatures(): void {
    for (const featureId of Object.keys(this.state.features)) {
      this.resetFeature(featureId);
    }
  }

  updateLastRun(): void {
    this.state.lastRun = new Date().toISOString();
  }

  getPendingFeatures(): string[] {
    return Object.entries(this.state.features)
      .filter(([_, state]) => state.status === ImplementationStatus.PENDING)
      .map(([id, _]) => id);
  }

  getFailedFeatures(): string[] {
    return Object.entries(this.state.features)
      .filter(([_, state]) => state.status === ImplementationStatus.FAILED)
      .map(([id, _]) => id);
  }

  getCompletedFeatures(): string[] {
    return Object.entries(this.state.features)
      .filter(([_, state]) => state.status === ImplementationStatus.COMPLETED)
      .map(([id, _]) => id);
  }
}
