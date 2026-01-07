export enum VerbosityLevel {
  QUIET = 'quiet',
  NORMAL = 'normal',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
}

export interface LoggerOptions {
  verbosity: VerbosityLevel;
  noColor: boolean;
}

const LEVEL_ORDER = [VerbosityLevel.QUIET, VerbosityLevel.NORMAL, VerbosityLevel.VERBOSE, VerbosityLevel.DEBUG];

function shouldUseColor(): boolean {
  if (process.env.NO_COLOR || process.env.FORCE_NO_COLOR) {
    return false;
  }
  if (process.env.FORCE_COLOR) {
    return true;
  }
  return process.stdout.isTTY ?? false;
}

export class Logger {
  private static instance: Logger;
  private verbosity: VerbosityLevel = VerbosityLevel.NORMAL;
  private useColor: boolean = shouldUseColor();

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setVerbosity(level: VerbosityLevel | string): void {
    if (Object.values(VerbosityLevel).includes(level as VerbosityLevel)) {
      this.verbosity = level as VerbosityLevel;
    }
  }

  setNoColor(noColor: boolean): void {
    this.useColor = !noColor && shouldUseColor();
  }

  private shouldLog(level: VerbosityLevel): boolean {
    return LEVEL_ORDER.indexOf(level) <= LEVEL_ORDER.indexOf(this.verbosity);
  }

  private formatMessage(message: string, prefix: string, color?: string): string {
    if (this.useColor && color) {
      return `${color}${prefix}${message}\x1b[0m`;
    }
    return `${prefix}${message}`;
  }

  isQuiet(): boolean {
    return this.verbosity === VerbosityLevel.QUIET;
  }

  isVerbose(): boolean {
    return this.verbosity === VerbosityLevel.VERBOSE || this.verbosity === VerbosityLevel.DEBUG;
  }

  isDebug(): boolean {
    return this.verbosity === VerbosityLevel.DEBUG;
  }

  info(message: string): void {
    if (this.shouldLog(VerbosityLevel.NORMAL)) {
      console.log(message);
    }
  }

  success(message: string): void {
    if (this.shouldLog(VerbosityLevel.NORMAL)) {
      console.log(this.formatMessage(message, '✓ ', '\x1b[32m'));
    }
  }

  warning(message: string): void {
    if (this.shouldLog(VerbosityLevel.NORMAL)) {
      console.warn(this.formatMessage(message, '⚠ ', '\x1b[33m'));
    }
  }

  error(message: string): void {
    console.error(this.formatMessage(message, '✗ ', '\x1b[31m'));
  }

  verbose(message: string): void {
    if (this.shouldLog(VerbosityLevel.VERBOSE)) {
      console.log(this.formatMessage(message, '  ', '\x1b[90m'));
    }
  }

  debug(message: string): void {
    if (this.shouldLog(VerbosityLevel.DEBUG)) {
      console.log(this.formatMessage(message, '[DEBUG] ', '\x1b[36m'));
    }
  }

  progress(message: string): void {
    if (this.shouldLog(VerbosityLevel.NORMAL)) {
      console.log(this.formatMessage(message, '▶ ', '\x1b[34m'));
    }
  }

  step(message: string): void {
    if (this.shouldLog(VerbosityLevel.NORMAL)) {
      console.log(this.formatMessage(message, '  ├─ ', ''));
    }
  }

  stepSuccess(message: string): void {
    if (this.shouldLog(VerbosityLevel.NORMAL)) {
      console.log(this.formatMessage(message, '  ├─ ✓ ', '\x1b[32m'));
    }
  }

  stepError(message: string): void {
    if (this.shouldLog(VerbosityLevel.NORMAL)) {
      console.log(this.formatMessage(message, '  ├─ ✗ ', '\x1b[31m'));
    }
  }

  blank(): void {
    if (this.shouldLog(VerbosityLevel.NORMAL)) {
      console.log('');
    }
  }

  header(message: string): void {
    if (this.shouldLog(VerbosityLevel.NORMAL)) {
      console.log(this.formatMessage(message, '🔍 ', '\x1b[1m'));
    }
  }

  table(data: Record<string, string>[]): void {
    if (this.shouldLog(VerbosityLevel.NORMAL)) {
      console.table(data);
    }
  }
}
