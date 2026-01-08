/**
 * Validation result types for configuration validation
 */

export interface ValidationError {
  path: string;
  field: string | null;
  message: string;
  severity: 'error';
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  severity: 'warning';
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  isComplete: boolean;
  version: string | null;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  missingFiles: string[];
  invalidFiles: string[];
}
