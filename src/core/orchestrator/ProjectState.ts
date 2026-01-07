/**
 * Represents the current state of the project for pipeline orchestration
 */
export interface ProjectState {
  /** Whether SpecKit structure is initialized */
  isInitialized: boolean;
  
  /** Whether a feature spec exists */
  hasSpec: boolean;
  
  /** Whether an implementation plan exists */
  hasPlan: boolean;
  
  /** Whether tasks have been generated */
  hasTasks: boolean;
  
  /** Whether implementation has started/completed */
  hasImplementation: boolean;
  
  /** Last checkpoint step (for resumption) */
  lastCheckpoint: PipelineStep | null;
  
  /** Current feature being worked on */
  featureId: string | null;
}

/**
 * Pipeline steps in execution order
 */
export enum PipelineStep {
  Initialize = 'initialize',
  Specify = 'specify',
  Plan = 'plan',
  Tasks = 'tasks',
  Implement = 'implement',
  Quality = 'quality',
}
