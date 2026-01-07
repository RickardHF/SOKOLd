export enum QualityCheckType {
  TEST = 'test',
  LINT = 'lint',
  BUILD = 'build',
}

export interface QualityCheckResult {
  type: QualityCheckType;
  passed: boolean;
  output: string;
  failures: FailureDetail[];
  duration: number;
}

export interface FailureDetail {
  file?: string;
  line?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface QualityCheck {
  readonly type: QualityCheckType;
  
  detect(rootPath: string): Promise<boolean>;
  run(rootPath: string, command?: string): Promise<QualityCheckResult>;
  parse(output: string): FailureDetail[];
}
