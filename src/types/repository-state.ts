/**
 * Repository state detection types
 */

export enum RepositoryStateType {
  EMPTY = 'EMPTY',
  UNCONFIGURED = 'UNCONFIGURED',
  PARTIAL_SPECKIT = 'PARTIAL_SPECKIT',
  PARTIAL_SOKOLD = 'PARTIAL_SOKOLD',
  FULL = 'FULL',
  CORRUPTED = 'CORRUPTED'
}

export interface RepositoryState {
  type: RepositoryStateType;
  hasSpeckit: boolean;
  hasSokold: boolean;
  hasSourceFiles: boolean;
  isValid: boolean;
  rootPath: string;
  detectedAt: Date;
}
