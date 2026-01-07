import { Configuration, validateConfig } from '../../utils/config.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class ConfigValidator {
  validate(config: Partial<Configuration>): ValidationResult {
    const errors = validateConfig(config);
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateAiTool(value: unknown): ValidationResult {
    if (value === null || value === undefined) {
      return { valid: true, errors: [] };
    }
    if (typeof value !== 'string') {
      return { valid: false, errors: ['aiTool must be a string'] };
    }
    if (!['copilot', 'claude'].includes(value.toLowerCase())) {
      return { valid: false, errors: ["aiTool must be 'copilot' or 'claude'"] };
    }
    return { valid: true, errors: [] };
  }

  validateMaxRetries(value: unknown): ValidationResult {
    if (typeof value !== 'number') {
      return { valid: false, errors: ['maxRetries must be a number'] };
    }
    if (value < 0 || value > 10) {
      return { valid: false, errors: ['maxRetries must be between 0 and 10'] };
    }
    return { valid: true, errors: [] };
  }

  validateTimeout(value: unknown): ValidationResult {
    if (typeof value !== 'number') {
      return { valid: false, errors: ['timeout must be a number'] };
    }
    if (value <= 0) {
      return { valid: false, errors: ['timeout must be a positive number'] };
    }
    return { valid: true, errors: [] };
  }

  validateVerbosity(value: unknown): ValidationResult {
    if (typeof value !== 'string') {
      return { valid: false, errors: ['verbosity must be a string'] };
    }
    if (!['quiet', 'normal', 'verbose', 'debug'].includes(value.toLowerCase())) {
      return { valid: false, errors: ["verbosity must be 'quiet', 'normal', 'verbose', or 'debug'"] };
    }
    return { valid: true, errors: [] };
  }

  validatePriorities(value: unknown): ValidationResult {
    if (!Array.isArray(value)) {
      return { valid: false, errors: ['priorities must be an array'] };
    }
    const validPriorities = ['P1', 'P2', 'P3', 'P4'];
    for (const p of value) {
      if (typeof p !== 'string' || !validPriorities.includes(p.toUpperCase())) {
        return { valid: false, errors: [`Invalid priority: ${p}. Must be P1, P2, P3, or P4`] };
      }
    }
    return { valid: true, errors: [] };
  }
}
