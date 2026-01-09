# Data Model: SOKOLd CLI Orchestrator

**Last Updated**: January 9, 2026  
**Status**: Implemented

## Core Types

### Args (cli.ts)

Command-line argument parsing result.

```typescript
interface Args {
  description?: string;           // Feature description (positional)
  continue?: boolean;             // --continue flag
  status?: boolean;               // --status flag
  dryRun?: boolean;               // --dry-run flag
  tool?: 'copilot' | 'claude';    // --tool flag
  model?: string;                 // --model flag
  verbose?: boolean;              // --verbose flag
  help?: boolean;                 // --help flag
  configCommand?: 'get' | 'set' | 'list' | 'path';
  configKey?: string;
  configValue?: string;
}
```

### ProjectStatus (detect.ts)

Result of project state detection.

```typescript
interface ProjectStatus {
  hasSpeckit: boolean;   // .specify/ folder exists
  hasSpecs: boolean;     // specs/ folder exists
  hasSpec: boolean;      // specs/main/spec.md exists
  hasPlan: boolean;      // specs/main/plan.md exists
  hasTasks: boolean;     // specs/main/tasks.md exists
}
```

### PipelineOptions (pipeline.ts)

Options for pipeline execution.

```typescript
interface PipelineOptions {
  dryRun?: boolean;              // Show what would run without executing
  tool?: 'copilot' | 'claude';   // AI CLI tool to use
  model?: string;                // Model override
  verbose?: boolean;             // Verbose output
  autoApprove?: boolean;         // Auto-approve AI tool calls
  currentBranchOnly?: boolean;   // Force current branch workflow
  maxRetries?: number;           // Max fix attempts (default: 3)
}
```

### ExecutionSummary (pipeline.ts)

Track execution for end-of-run summary.

```typescript
interface ExecutionSummary {
  stepsCompleted: string[];      // Successfully completed steps
  stepsFailed: string[];         // Failed steps
  fixAttempts: number;           // Number of fix iterations
  startTime: Date;               // Pipeline start time
  endTime?: Date;                // Pipeline end time
}
```

### SokoldConfig (config.ts)

Persisted user configuration.

```typescript
interface SokoldConfig {
  tool: 'copilot' | 'claude';    // AI CLI tool preference
  model?: string;                // Model preference
  autoApprove: boolean;          // Auto-approve tool calls
  verbose: boolean;              // Verbose output by default
  output: {
    colors: boolean;             // Enable terminal colors
    format: 'human' | 'json';    // Output format
  };
  workflow: {
    currentBranchOnly: boolean;  // Force current branch mode
  };
  promptsDir?: string;           // Custom prompts directory
}
```

## Constants

### Step Types (pipeline.ts)

```typescript
type Step = 'init' | 'specify' | 'plan' | 'tasks' | 'implement' | 'verify';
```

### Agent Mappings (pipeline.ts)

```typescript
const STEP_AGENTS: Record<AgentStep, string> = {
  specify: '/speckit.specify',
  plan: '/speckit.plan',
  tasks: '/speckit.tasks',
  implement: '/speckit.implement',
};
```

### Default Configuration (config.ts)

```typescript
const DEFAULT_CONFIG: SokoldConfig = {
  tool: 'copilot',
  model: undefined,
  autoApprove: true,
  verbose: false,
  output: { colors: true, format: 'human' },
  workflow: { currentBranchOnly: false },
};
```

## File Paths

| Path | Purpose |
|------|---------|
| `.sokold/config.yaml` | User configuration storage |
| `.specify/` | Speckit initialization marker |
| `specs/main/spec.md` | Feature specification |
| `specs/main/plan.md` | Implementation plan |
| `specs/main/tasks.md` | Task breakdown |

## State Transitions

```
[No .specify/] → detect → runSpecifyInit() → [Has .specify/]
[Has .specify/] → detect → determine steps → [Execute pipeline]
[No spec.md] → specify agent → [Has spec.md]
[Has spec.md, no plan.md] → plan agent → [Has plan.md]
[Has plan.md, no tasks.md] → tasks agent → [Has tasks.md]
[Has tasks.md] → implement agent → [Implementation complete]
[Implementation complete] → verify → [Pass/Fail]
[Verify fail] → fix attempt → [Retry verify, max 3x]
```
