/**
 * Configuration set types for speckit/sokold configs
 */

import type { ValidationError } from './validation-result.js';

export enum ConfigType {
  SPECKIT = 'SPECKIT',
  SOKOLD = 'SOKOLD'
}

export interface ConfigFile {
  path: string;
  required: boolean;
  template: string | null;
  exists: boolean;
  isValid: boolean;
  customized: boolean;
}

export interface ConfigurationSet {
  type: ConfigType;
  rootPath: string;
  files: ConfigFile[];
  customizations: Map<string, unknown>;
  version: string;
  isComplete: boolean;
  isValid: boolean;
  validationErrors: ValidationError[];
}
