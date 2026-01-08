/**
 * Configuration validator
 * Validates existing speckit and sokold configurations
 */

import { joinPath, pathExists, readFile } from '../../utils/filesystem.js';
import { parse as parseYaml } from 'yaml';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '../../types/validation-result.js';
import { ConfigType } from '../../types/configuration-set.js';

/**
 * Required files for speckit configuration
 */
const SPECKIT_REQUIRED_FILES = [
  'memory/constitution.md'
];

/**
 * Required files for sokold configuration
 */
const SOKOLD_REQUIRED_FILES = [
  'config.yaml'
];

/**
 * Check if all required files exist
 */
export async function checkRequiredFiles(
  configPath: string,
  configType: ConfigType
): Promise<{ exists: string[]; missing: string[] }> {
  const requiredFiles = configType === ConfigType.SPECKIT 
    ? SPECKIT_REQUIRED_FILES 
    : SOKOLD_REQUIRED_FILES;

  const exists: string[] = [];
  const missing: string[] = [];

  for (const file of requiredFiles) {
    const filePath = joinPath(configPath, file);
    if (await pathExists(filePath)) {
      exists.push(file);
    } else {
      missing.push(file);
    }
  }

  return { exists, missing };
}

/**
 * Parse YAML configuration file with error handling
 */
export async function parseYamlConfig(
  filePath: string
): Promise<{ success: boolean; data: Record<string, unknown> | null; error: string | null }> {
  try {
    if (!(await pathExists(filePath))) {
      return { success: false, data: null, error: 'File not found' };
    }

    const content = await readFile(filePath);
    const data = parseYaml(content) as Record<string, unknown>;
    
    if (data === null || typeof data !== 'object') {
      return { success: false, data: null, error: 'Invalid YAML: expected object' };
    }

    return { success: true, data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    return { success: false, data: null, error: message };
  }
}

/**
 * Validate speckit configuration schema
 */
async function validateSpeckitSchema(
  configPath: string
): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  const configFile = joinPath(configPath, 'config.yaml');
  
  if (await pathExists(configFile)) {
    const result = await parseYamlConfig(configFile);
    
    if (!result.success) {
      errors.push({
        path: 'config.yaml',
        field: null,
        message: `Invalid YAML: ${result.error}`,
        severity: 'error',
        code: 'INVALID_YAML'
      });
    } else if (result.data) {
      // Validate required fields
      const project = result.data.project as Record<string, string> | undefined;
      if (!project) {
        warnings.push({
          path: 'config.yaml',
          message: 'Missing project section',
          severity: 'warning',
          code: 'MISSING_PROJECT'
        });
      } else {
        if (!project.name) {
          warnings.push({
            path: 'config.yaml',
            message: 'Missing project.name',
            severity: 'warning',
            code: 'MISSING_PROJECT_NAME'
          });
        }
        if (!project.language) {
          warnings.push({
            path: 'config.yaml',
            message: 'Missing project.language',
            severity: 'warning',
            code: 'MISSING_PROJECT_LANGUAGE'
          });
        }
      }
    }
  }

  // Check constitution.md exists and is not empty
  const constitutionPath = joinPath(configPath, 'memory', 'constitution.md');
  if (await pathExists(constitutionPath)) {
    const content = await readFile(constitutionPath);
    if (content.trim().length === 0) {
      warnings.push({
        path: 'memory/constitution.md',
        message: 'Constitution file is empty',
        severity: 'warning',
        code: 'EMPTY_CONSTITUTION'
      });
    }
  }

  return { errors, warnings };
}

/**
 * Validate sokold configuration schema
 */
async function validateSokoldSchema(
  configPath: string
): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  const configFile = joinPath(configPath, 'config.yaml');
  
  if (await pathExists(configFile)) {
    const result = await parseYamlConfig(configFile);
    
    if (!result.success) {
      errors.push({
        path: 'config.yaml',
        field: null,
        message: `Invalid YAML: ${result.error}`,
        severity: 'error',
        code: 'INVALID_YAML'
      });
    } else if (result.data) {
      const project = result.data.project as Record<string, string> | undefined;
      if (!project) {
        warnings.push({
          path: 'config.yaml',
          message: 'Missing project section',
          severity: 'warning',
          code: 'MISSING_PROJECT'
        });
      }
    }
  } else {
    errors.push({
      path: 'config.yaml',
      field: null,
      message: 'Required config.yaml file not found',
      severity: 'error',
      code: 'MISSING_CONFIG'
    });
  }

  return { errors, warnings };
}

/**
 * Validate schema compliance for a configuration
 */
export async function validateSchemaCompliance(
  configPath: string,
  configType: ConfigType
): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
  if (configType === ConfigType.SPECKIT) {
    return validateSpeckitSchema(configPath);
  } else {
    return validateSokoldSchema(configPath);
  }
}

/**
 * Detect deprecated settings in configuration
 */
export async function detectDeprecatedSettings(
  configPath: string,
  _configType: ConfigType
): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];
  
  const configFile = joinPath(configPath, 'config.yaml');
  if (!(await pathExists(configFile))) {
    return warnings;
  }

  const result = await parseYamlConfig(configFile);
  if (!result.success || !result.data) {
    return warnings;
  }

  // Check for deprecated settings (placeholder for future deprecations)
  const deprecatedKeys: Record<string, string> = {
    // 'oldKey': 'Use newKey instead'
  };

  for (const [key, message] of Object.entries(deprecatedKeys)) {
    if (key in result.data) {
      warnings.push({
        path: 'config.yaml',
        message: `Deprecated setting '${key}': ${message}`,
        severity: 'warning',
        code: 'DEPRECATED_SETTING'
      });
    }
  }

  return warnings;
}

/**
 * Validate a complete configuration set
 */
export async function validateConfiguration(
  configPath: string,
  configType: ConfigType
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    isComplete: true,
    version: null,
    errors: [],
    warnings: [],
    missingFiles: [],
    invalidFiles: []
  };

  // Check if config directory exists
  if (!(await pathExists(configPath))) {
    result.isValid = false;
    result.isComplete = false;
    result.errors.push({
      path: configPath,
      field: null,
      message: 'Configuration directory not found',
      severity: 'error',
      code: 'CONFIG_DIR_NOT_FOUND'
    });
    return result;
  }

  // Check required files
  const { missing } = await checkRequiredFiles(configPath, configType);
  if (missing.length > 0) {
    result.isComplete = false;
    result.missingFiles = missing;
    for (const file of missing) {
      result.errors.push({
        path: file,
        field: null,
        message: `Required file missing: ${file}`,
        severity: 'error',
        code: 'MISSING_REQUIRED_FILE'
      });
    }
  }

  // Validate schema
  const schemaResult = await validateSchemaCompliance(configPath, configType);
  result.errors.push(...schemaResult.errors);
  result.warnings.push(...schemaResult.warnings);

  // Check for deprecated settings
  const deprecationWarnings = await detectDeprecatedSettings(configPath, configType);
  result.warnings.push(...deprecationWarnings);

  // Extract version from config
  const configFile = joinPath(configPath, 'config.yaml');
  if (await pathExists(configFile)) {
    const parseResult = await parseYamlConfig(configFile);
    if (parseResult.success && parseResult.data) {
      result.version = parseResult.data.version as string ?? '1.0.0';
    }
  }

  // Track invalid files
  result.invalidFiles = result.errors
    .filter(e => e.code === 'INVALID_YAML')
    .map(e => e.path);

  // Set overall validity
  result.isValid = result.errors.length === 0;

  return result;
}
