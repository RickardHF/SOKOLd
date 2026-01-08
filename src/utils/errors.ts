export enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  CONFIGURATION_ERROR = 2,
  IMPLEMENTATION_FAILED = 3,
  QUALITY_CHECKS_FAILED = 4,
  AI_TOOL_NOT_AVAILABLE = 5,
  USER_INTERRUPTED = 130,
}

export class SpecKitError extends Error {
  constructor(
    message: string,
    public readonly exitCode: ExitCode = ExitCode.GENERAL_ERROR,
    public readonly details?: string,
    public readonly resolution?: string[]
  ) {
    super(message);
    this.name = 'SpecKitError';
  }

  format(): string {
    let output = `ERROR: ${this.message}\n`;

    if (this.details) {
      output += `\n${this.details}\n`;
    }

    if (this.resolution && this.resolution.length > 0) {
      output += '\nTo resolve:\n';
      this.resolution.forEach((step, i) => {
        output += `  ${i + 1}. ${step}\n`;
      });
    }

    output += '\nFor more help: speckit-automate --help\n';
    return output;
  }
}

export class ConfigurationError extends SpecKitError {
  constructor(message: string, details?: string, resolution?: string[]) {
    super(message, ExitCode.CONFIGURATION_ERROR, details, resolution);
    this.name = 'ConfigurationError';
  }
}

export class AIToolError extends SpecKitError {
  constructor(toolName: string, details?: string) {
    super(
      `AI tool not found: ${toolName}`,
      ExitCode.AI_TOOL_NOT_AVAILABLE,
      details,
      [
        `Install ${toolName} CLI and ensure it's in your PATH`,
        'Or configure an alternative tool: speckit-automate config set aiTool <tool>',
        'Run speckit-automate doctor to check tool availability',
      ]
    );
    this.name = 'AIToolError';
  }
}

export class ImplementationError extends SpecKitError {
  constructor(featureId: string, details?: string) {
    super(
      `Implementation failed for feature: ${featureId}`,
      ExitCode.IMPLEMENTATION_FAILED,
      details,
      [
        'Check the feature specification for clarity',
        'Review logs: .speckit-automate/logs/',
        `Reset and retry: speckit-automate reset ${featureId}`,
      ]
    );
    this.name = 'ImplementationError';
  }
}

export class QualityCheckError extends SpecKitError {
  constructor(checkType: string, details?: string) {
    super(
      `Quality check failed: ${checkType}`,
      ExitCode.QUALITY_CHECKS_FAILED,
      details,
      [
        'Review the failed check output above',
        'Run with --no-tests or --no-lint to skip checks temporarily',
        'Fix issues manually and retry',
      ]
    );
    this.name = 'QualityCheckError';
  }
}

export class AlreadyInitializedError extends SpecKitError {
  constructor(path: string) {
    super(
      'SpecKit already initialized',
      ExitCode.CONFIGURATION_ERROR,
      `Found existing .specify directory at: ${path}`,
      [
        'Use --force to reinitialize',
        'Or continue with: speckit-automate implement',
      ]
    );
    this.name = 'AlreadyInitializedError';
  }
}

export class NotInitializedError extends SpecKitError {
  constructor() {
    super(
      'SpecKit not initialized',
      ExitCode.CONFIGURATION_ERROR,
      'Could not find .specify directory in current or parent directories',
      [
        'Run: speckit-automate init',
        'Or navigate to a SpecKit-enabled repository',
      ]
    );
    this.name = 'NotInitializedError';
  }
}

// Setup feature error classes
export class PermissionError extends SpecKitError {
  constructor(path: string) {
    super(
      `Permission denied: ${path}`,
      ExitCode.CONFIGURATION_ERROR,
      `Cannot access or modify: ${path}`,
      ['Check file/directory permissions', 'Run with elevated privileges if needed', 'Ensure the path is not read-only']
    );
    this.name = 'PermissionError';
  }
}

export class CorruptionError extends SpecKitError {
  public readonly filePath: string;
  
  constructor(path: string, details?: string) {
    super(
      `Configuration corrupted at ${path}`,
      ExitCode.CONFIGURATION_ERROR,
      details,
      ['Backup and delete the corrupted file', 'Run setup again to recreate', 'Check for valid YAML/JSON syntax']
    );
    this.name = 'CorruptionError';
    this.filePath = path;
  }
}

export class AmbiguityError extends SpecKitError {
  public readonly options: string[];
  
  constructor(message: string, options: string[]) {
    super(
      message,
      ExitCode.CONFIGURATION_ERROR,
      `Detected options: ${options.join(', ')}`,
      ['Specify --language to set primary language', 'Specify --framework to set framework', 'Review detected options and choose one']
    );
    this.name = 'AmbiguityError';
    this.options = options;
  }
}

export class SetupValidationError extends SpecKitError {
  public readonly validationErrors: string[];
  
  constructor(message: string, errors: string[]) {
    super(
      message,
      ExitCode.CONFIGURATION_ERROR,
      errors.join('\n'),
      ['Fix validation errors listed above', 'Use --skip-validation to bypass', 'Check configuration file syntax']
    );
    this.name = 'SetupValidationError';
    this.validationErrors = errors;
  }
}

export class InvalidPathError extends SpecKitError {
  constructor(path: string) {
    super(
      `Invalid path: ${path}`,
      ExitCode.CONFIGURATION_ERROR,
      'Path does not exist or is not accessible',
      ['Verify the path exists', 'Check spelling and permissions', 'Use absolute paths for clarity']
    );
    this.name = 'InvalidPathError';
  }
}

export class NoSourceFilesError extends SpecKitError {
  constructor(path: string) {
    super(
      `No source files found in: ${path}`,
      ExitCode.CONFIGURATION_ERROR,
      'Repository appears to be empty or contains no recognized source files',
      ['Add source files to the repository', 'Use --description to provide project info', 'Check if files are in excluded directories']
    );
    this.name = 'NoSourceFilesError';
  }
}

export class TemplateNotFoundError extends SpecKitError {
  constructor(templatePath: string) {
    super(
      `Template not found: ${templatePath}`,
      ExitCode.CONFIGURATION_ERROR,
      'Required template file is missing',
      ['Reinstall sokold to restore templates', 'Check template directory structure', 'Verify installation integrity']
    );
    this.name = 'TemplateNotFoundError';
  }
}

export class FileExistsError extends SpecKitError {
  constructor(path: string) {
    super(
      `File already exists: ${path}`,
      ExitCode.CONFIGURATION_ERROR,
      'Cannot overwrite existing file without --force flag',
      ['Use --force to overwrite', 'Backup and remove the file manually', 'Check if file needs to be preserved']
    );
    this.name = 'FileExistsError';
  }
}

/**
 * Setup-specific exit codes mapping
 */
export const SetupExitCodes = {
  SUCCESS: 0,
  PERMISSION: 1,
  CORRUPTION: 2,
  AMBIGUITY: 3,
  NETWORK: 4,
  VALIDATION: 5
} as const;

/**
 * Get exit code for a setup error type
 */
export function getSetupExitCode(error: Error): number {
  if (error instanceof PermissionError) return SetupExitCodes.PERMISSION;
  if (error instanceof CorruptionError) return SetupExitCodes.CORRUPTION;
  if (error instanceof AmbiguityError) return SetupExitCodes.AMBIGUITY;
  if (error instanceof SetupValidationError) return SetupExitCodes.VALIDATION;
  return 1;
}

/**
 * Handle error and exit with appropriate code
 */
export function handleError(error: unknown): never {
  if (error instanceof SpecKitError) {
    console.error(error.format());
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    console.error(`ERROR: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(ExitCode.GENERAL_ERROR);
  }

  console.error('An unexpected error occurred');
  process.exit(ExitCode.GENERAL_ERROR);
}
