/**
 * Setup operation types for tracking setup actions
 */

import type { RepositoryState } from './repository-state.js';

export enum OperationAction {
  CREATE_DIRECTORY = 'CREATE_DIRECTORY',
  CREATE_FILE = 'CREATE_FILE',
  UPDATE_FILE = 'UPDATE_FILE',
  SKIP_FILE = 'SKIP_FILE',
  VALIDATE_CONFIG = 'VALIDATE_CONFIG',
  BACKUP_FILE = 'BACKUP_FILE'
}

export enum OperationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED'
}

export interface OperationMetadata {
  configType?: 'speckit' | 'sokold';
  fileSize?: number;
  customValuesPreserved?: number;
  backupPath?: string;
  reason?: string;
}

export interface SetupOperation {
  action: OperationAction;
  targetPath: string;
  status: OperationStatus;
  metadata: OperationMetadata;
  error: Error | null;
  timestamp: Date;
}

export interface SetupSummary {
  filesCreated: number;
  filesUpdated: number;
  filesSkipped: number;
  directoriesCreated: number;
  customValuesPreserved: number;
  configsValidated: number;
}

export interface SetupResult {
  success: boolean;
  repositoryState: RepositoryState;
  operations: SetupOperation[];
  summary: SetupSummary;
  duration: number;
  warnings: string[];
}
