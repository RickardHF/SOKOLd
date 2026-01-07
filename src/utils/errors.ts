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
