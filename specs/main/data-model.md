# Data Model: SOKOLd CLI Orchestrator

**Last Updated**: January 16, 2026  
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
  init?: boolean;                 // init command
  configCommand?: 'get' | 'set' | 'list' | 'path';
  configKey?: string;
  configValue?: string;
  speckitCommand?: 'patch' | 'unpatch' | 'status';
  historyCommand?: 'list' | 'show' | 'note';
  historyIndex?: number;
  historyNote?: string;
}
```

### ProjectStatus (detect.ts)

Result of project state detection.

```typescript
interface ProjectStatus {
  hasSpeckit: boolean;      // .specify folder exists
  hasSpecs: boolean;        // specs/ folder exists
  hasSpec: boolean;         // specs/main/spec.md exists
  hasPlan: boolean;         // specs/main/plan.md exists
  hasTasks: boolean;        // specs/main/tasks.md exists
  hasConstitution: boolean; // .specify/memory/constitution.md exists
  hasExistingCode: boolean; // src/ or other code directories exist
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
  autoConstitution?: boolean;    // Auto-create constitution if missing
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

### PipelineState (state.ts)

Track pipeline state for --continue support.

```typescript
type PipelineStep = 'specify' | 'plan' | 'tasks' | 'implement' | 'verify';

interface PipelineState {
  description?: string;          // Feature description that started this pipeline
  startedAt: string;             // When the pipeline was started
  lastCompletedStep?: PipelineStep;  // Last step completed successfully
  currentStep?: PipelineStep;    // Current step in progress
  completedSteps: PipelineStep[]; // All steps completed
  updatedAt: string;             // Last updated timestamp
  historyRunId?: string;         // ID of associated history entry
}
```

### HistoryEntry (history.ts)

A single history entry representing one pipeline run.

```typescript
type StepName = 'init' | 'constitution' | 'specify' | 'plan' | 'tasks' | 'implement' | 'verify' | 'fix';
type StepOutcome = 'success' | 'failed' | 'skipped' | 'in-progress';

interface StepRecord {
  step: StepName;                // Step name
  startedAt: string;             // When the step started
  completedAt?: string;          // When the step completed
  outcome: StepOutcome;          // Outcome of the step
  prompt?: string;               // The prompt sent to AI
  durationSeconds?: number;      // Duration in seconds
  error?: string;                // Error message if failed
}

interface FileChange {
  path: string;                  // Relative path to the file
  action: 'created' | 'modified' | 'deleted';
  timestamp: string;             // When the change was detected
  step: StepName;                // Which step caused this change
}

interface HistoryEntry {
  id: string;                    // Unique ID for this run
  startedAt: string;             // When the run started
  completedAt?: string;          // When the run completed
  description?: string;          // Feature description
  isContinuation: boolean;       // Was this a --continue run
  tool: 'copilot' | 'claude';    // AI tool used
  model?: string;                // Model used
  steps: StepRecord[];           // All steps executed
  filesChanged: FileChange[];    // Files changed during run
  outcome: 'success' | 'partial' | 'failed' | 'in-progress';
  durationSeconds?: number;      // Total duration
  notes?: string[];              // User-added notes
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
    autoConstitution: boolean;   // Auto-create constitution if missing
  };
  promptsDir?: string;           // Custom prompts directory
}
```

### DecisionResponse (ollama.ts)

Response from Ollama decision making.

```typescript
type DecisionResponse = {
  status: 'success' | 'failure';
  content: string;
  tools: ToolCall[];
};
```

### ToolResponse (functions/types.ts)

Standard response format for Ollama function tools.

```typescript
interface ToolResponse {
  status: 'success' | 'failure';
  content: string;
}
```

## Constants

### Step Types (pipeline.ts)

```typescript
type Step = 'init' | 'constitution' | 'specify' | 'plan' | 'tasks' | 'implement' | 'verify';
```

### Agent Mappings (pipeline.ts)

```typescript
const STEP_AGENTS: Record<Exclude<Step, 'init' | 'verify'>, string> = {
  constitution: '/speckit.constitution',
  specify: '/speckit.specify',
  plan: '/speckit.plan',
  tasks: '/speckit.tasks',
  implement: '/speckit.implement',
};
```

### Default Ollama Model (ollama.ts)

```typescript
const DEFAULT_MODEL = 'rnj-1';
```

### Default Configuration (config.ts)

```typescript
const DEFAULT_CONFIG: SokoldConfig = {
  tool: 'copilot',
  model: undefined,
  autoApprove: true,
  verbose: false,
  output: { colors: true, format: 'human' },
  workflow: { currentBranchOnly: false, autoConstitution: false },
};
```

## File Paths

| Path | Purpose |
|------|---------|
| `.sokold/config.yaml` | User configuration storage |
| `.sokold/state.yaml` | Current pipeline state |
| `.sokold/history.yaml` | Run history |
| `.specify/` | Speckit initialization marker |
| `.specify/memory/constitution.md` | Project constitution |
| `specs/main/spec.md` | Feature specification |
| `specs/main/plan.md` | Implementation plan |
| `specs/main/tasks.md` | Task breakdown |

## State Transitions

```
[Start] → ensureOllamaReady() → [Ollama Ready]
[No .specify/] → detect → runSpecifyInit() → [Has .specify/]
[Has .specify/] → detect → determine steps → [Execute pipeline]
[No spec.md] → specify agent (via Ollama function call) → [Has spec.md]
[Has spec.md, no plan.md] → plan agent → [Has plan.md]
[Has plan.md, no tasks.md] → tasks agent → [Has tasks.md]
[Has tasks.md] → implement agent → [Implementation complete]
[Implementation complete] → verify → [Pass/Fail]
[Verify fail] → fix attempt → [Retry verify, max 3x]
[Complete] → update history → [End]
```

## Ollama Function Tools

### SpecKit Functions (functions/speckit.ts)

| Function | Description | Parameters |
|----------|-------------|------------|
| `specify_feature` | Specify a new feature | `feature_description: string` |
| `plan_feature` | Plan feature implementation | `technical_requirements?: string` |
| `create_tasks` | Create task breakdown | (none) |
| `implement_feature` | Implement the feature | `special_considerations?: string` |

### Misc Functions (functions/misc.ts)

| Function | Description | Parameters |
|----------|-------------|------------|
| `ask_user` | Ask user a question | `question: string` |
| `run_command` | Run shell command | `command: string` |
| `run_ai_command` | Run AI CLI command | `prompt: string` |
| `end_process` | End the pipeline | (none) |
| `continue_process` | Continue to next step | `continue: boolean, reasoning?: string` |
| `reiterate_process` | Reiterate previous step | `reasoning: string` |
