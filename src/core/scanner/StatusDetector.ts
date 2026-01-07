import { StateManager, ImplementationStatus } from '../state/StateManager.js';
import { FeatureSpecification } from '../speckit/SpecParser.js';

export interface StatusInfo {
  featureId: string;
  status: ImplementationStatus;
  retryCount: number;
  lastAttempt: string | null;
  failedChecks: string[];
  canRetry: boolean;
}

export class StatusDetector {
  private stateManager: StateManager;
  private maxRetries: number;

  constructor(stateManager: StateManager, maxRetries: number = 3) {
    this.stateManager = stateManager;
    this.maxRetries = maxRetries;
  }

  getStatus(featureId: string): StatusInfo {
    const state = this.stateManager.getFeatureState(featureId);
    
    if (!state) {
      return {
        featureId,
        status: ImplementationStatus.PENDING,
        retryCount: 0,
        lastAttempt: null,
        failedChecks: [],
        canRetry: true,
      };
    }

    return {
      featureId,
      status: state.status,
      retryCount: state.retryCount,
      lastAttempt: state.lastAttempt,
      failedChecks: state.failedChecks,
      canRetry: state.retryCount < this.maxRetries || state.status !== ImplementationStatus.FAILED,
    };
  }

  isImplemented(featureId: string): boolean {
    const state = this.stateManager.getFeatureState(featureId);
    return state?.status === ImplementationStatus.COMPLETED;
  }

  isPending(featureId: string): boolean {
    const state = this.stateManager.getFeatureState(featureId);
    return !state || state.status === ImplementationStatus.PENDING;
  }

  isFailed(featureId: string): boolean {
    const state = this.stateManager.getFeatureState(featureId);
    return state?.status === ImplementationStatus.FAILED;
  }

  canRetry(featureId: string): boolean {
    const state = this.stateManager.getFeatureState(featureId);
    if (!state) return true;
    if (state.status === ImplementationStatus.COMPLETED) return false;
    return state.retryCount < this.maxRetries;
  }

  filterPendingFeatures(features: FeatureSpecification[]): FeatureSpecification[] {
    return features.filter(f => this.isPending(f.id) || (this.isFailed(f.id) && this.canRetry(f.id)));
  }

  filterByStatus(features: FeatureSpecification[], status: ImplementationStatus): FeatureSpecification[] {
    return features.filter(f => {
      const state = this.stateManager.getFeatureState(f.id);
      if (!state && status === ImplementationStatus.PENDING) return true;
      return state?.status === status;
    });
  }

  getSummary(features: FeatureSpecification[]): {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    inProgress: number;
  } {
    const summary = {
      total: features.length,
      completed: 0,
      failed: 0,
      pending: 0,
      inProgress: 0,
    };

    for (const feature of features) {
      const state = this.stateManager.getFeatureState(feature.id);
      if (!state || state.status === ImplementationStatus.PENDING) {
        summary.pending++;
      } else {
        switch (state.status) {
          case ImplementationStatus.COMPLETED:
            summary.completed++;
            break;
          case ImplementationStatus.FAILED:
            summary.failed++;
            break;
          case ImplementationStatus.IN_PROGRESS:
          case ImplementationStatus.TESTING:
            summary.inProgress++;
            break;
        }
      }
    }

    return summary;
  }
}
