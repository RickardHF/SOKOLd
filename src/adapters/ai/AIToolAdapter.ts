export enum AIToolType {
  COPILOT = 'copilot',
  CLAUDE = 'claude',
}

export interface ImplementationContext {
  featureId: string;
  specContent: string;
  rootPath: string;
  additionalContext?: string;
}

export interface AIToolResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

export interface AIToolAdapter {
  readonly type: AIToolType;
  readonly executable: string;
  readonly autoApproveFlag: string;

  detect(): Promise<boolean>;
  getVersion(): Promise<string | null>;
  suggest(prompt: string, cwd: string): Promise<AIToolResult>;
  implement(context: ImplementationContext): Promise<AIToolResult>;
  runWithAutoApprove(prompt: string, cwd: string): Promise<AIToolResult>;
}
