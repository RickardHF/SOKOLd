# Implementation Plan: SOKOLd CLI Orchestrator

**Branch**: `main` | **Date**: January 9, 2026 | **Spec**: [spec.md](spec.md)
**Status**: Implemented - documenting existing architecture

## Summary

SOKOLd is a CLI orchestrator that uses local Ollama models to coordinate speckit workflows. It uses function calling to invoke AI CLI tools (copilot/claude) for SpecKit agent execution. The tool tracks pipeline state for resumption (--continue) and maintains history of all runs for context. Architecture is modular: core files for CLI, pipeline, detection, config, plus supporting modules for state, history, and Ollama integration.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+  
**Primary Dependencies**: yaml (config parsing), ollama (AI inference), Node.js built-ins (spawn, fs, path)  
**Storage**: YAML config in `.sokold/config.yaml`  
**Testing**: Jest with ts-jest  
**Target Platform**: Cross-platform CLI (Windows, macOS, Linux)  
**Project Type**: Single project (CLI tool)  
**Performance Goals**: Minimal overhead - spawn AI CLI and wait for completion  
**Constraints**: 4-file architecture maximum, no direct file manipulation beyond config  
**Scale/Scope**: Single-user CLI tool, local development workflows

## Constitution Check

*GATE: Verified against constitution v1.0.1*

| Principle | Status | Implementation |
|-----------|--------|----------------|
| I. Cross-Platform | ✅ | Uses `path.join()`, Node.js cross-platform APIs |
| II. CLI-First | ✅ | POSIX conventions, exit codes, stdout/stderr separation |
| III. Test-Driven | ✅ | Jest test structure in place |
| IV. Distribution | ✅ | npm package with bin entry in package.json |
| V. Observability | ✅ | --verbose flag, emoji status output, clear error messages |
| VI. Versioning | ✅ | CHANGELOG.md exists, semver in package.json |
| VII. Simplicity | ✅ | 4-file architecture, delegates to AI CLI |

**No violations requiring justification.**

## Project Structure

### Documentation (this feature)

```text
specs/main/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical research (N/A - straightforward implementation)
├── data-model.md        # Data entities and types
├── quickstart.md        # Getting started guide
├── contracts/           # Interface definitions
│   └── cli-interface.md # CLI command contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Implementation tasks (future)
```

### Source Code (repository root)

```text
src/
├── cli.ts           # Entry point, argument parsing, help display
├── pipeline.ts      # Main orchestration - runs AI via Ollama
├── detect.ts        # Project state detection (.specify, specs/, etc.)
├── config.ts        # YAML configuration management
├── state.ts         # Pipeline state tracking for --continue
├── history.ts       # Run history tracking and management
├── ollama.ts        # Ollama integration for local AI inference
├── speckit-patch.ts # SpecKit script patching for branch control
└── functions/       # Ollama function definitions
    ├── speckit.ts   # SpecKit agent functions (specify, plan, tasks, implement)
    ├── misc.ts      # General functions (ask_user, run_command, etc.)
    ├── helpers.ts   # Helper utilities
    └── types.ts     # Type definitions

bin/
└── sokold.js        # npm bin entry point (shebang wrapper)

tests/
├── integration/     # Integration tests
└── unit/            # Unit tests
```

**Structure Decision**: Modular architecture with clear separation of concerns. Core files handle CLI flow, while supporting modules manage state, history, and AI integration.

## Component Design

### cli.ts - Entry Point

**Responsibility**: Parse arguments, route to appropriate handler (help, config, or pipeline)

**Exports**:
- `parseArgs(argv: string[]): Args` - Parse command-line arguments
- `showHelp(): void` - Display usage information
- `handleConfigCommand(args: Args): void` - Handle config subcommands

**Key behaviors**:
- `sokold "description"` → calls `runPipeline(description)`
- `sokold --help` → calls `showHelp()`
- `sokold set/get <key> [value]` → shorthand for config commands
- `sokold config list/get/set/path` → config management

### pipeline.ts - Orchestration

**Responsibility**: Execute speckit workflow via Ollama function calling

**Exports**:
- `runPipeline(description: string | undefined, options: PipelineOptions): Promise<void>`

**Flow**:
1. `ensureOllamaReady()` → verify Ollama is running with required model
2. `detectProject()` → check current state
3. If no `.specify/` → `runSpecifyInit()` via spawn
4. Initialize state tracking and history entry
5. Determine steps based on state and description
6. For each step: use Ollama `decide()` with function tools
7. After implement: `runVerification()` loop (max 3 retries)
8. Complete history entry and `printSummary()`

**Types**:
```typescript
type Step = 'init' | 'constitution' | 'specify' | 'plan' | 'tasks' | 'implement' | 'verify';
interface PipelineOptions { dryRun?, tool?, model?, verbose?, autoApprove?, currentBranchOnly?, autoConstitution?, maxRetries? }
interface ExecutionSummary { stepsCompleted[], stepsFailed[], fixAttempts, startTime, endTime? }
```

### detect.ts - State Detection

**Responsibility**: Check what speckit artifacts exist

**Exports**:
- `detectProject(rootPath?: string): ProjectStatus`
- `getNextStep(status: ProjectStatus, hasDescription: boolean): string | null`

**Types**:
```typescript
interface ProjectStatus {
  hasSpeckit: boolean;      // .specify folder exists
  hasSpecs: boolean;        // specs/ exists
  hasSpec: boolean;         // specs/main/spec.md exists
  hasPlan: boolean;         // specs/main/plan.md exists
  hasTasks: boolean;        // specs/main/tasks.md exists
  hasConstitution: boolean; // .specify/memory/constitution.md exists
  hasExistingCode: boolean; // src/ or other code directories exist
}
```

### state.ts - Pipeline State

**Responsibility**: Track pipeline state for --continue support

**Exports**:
- `loadState(rootPath?: string): PipelineState | null`
- `saveState(state: PipelineState, rootPath?: string): void`
- `initState(description?: string, rootPath?: string): PipelineState`
- `clearState(rootPath?: string): void`
- `markStepStarted(step: PipelineStep, rootPath?: string): void`
- `markStepCompleted(step: PipelineStep, rootPath?: string): void`
- `getNextStepFromState(rootPath?: string): PipelineStep | null`

**Types**:
```typescript
type PipelineStep = 'specify' | 'plan' | 'tasks' | 'implement' | 'verify';
interface PipelineState {
  description?: string;
  startedAt: string;
  lastCompletedStep?: PipelineStep;
  currentStep?: PipelineStep;
  completedSteps: PipelineStep[];
  updatedAt: string;
  historyRunId?: string;
}
```

**Storage**: `.sokold/state.yaml`

### history.ts - Run History

**Responsibility**: Track pipeline run history for context and review

**Exports**:
- `startHistoryEntry(options): string` - Start tracking a new run
- `completeHistoryEntry(id, outcome): void` - Complete a run
- `recordStepStart(step, prompt?): void` - Record step start
- `recordStepComplete(step, outcome, error?): void` - Record step completion
- `getRecentHistory(count?: number): HistoryEntry[]`
- `getHistoryEntry(index: number): HistoryEntry | null`
- `addRunNote(note: string, runId?: string): void`
- `buildHistoryContext(runIds?: string[]): string` - Build context from past runs

**Types**:
```typescript
type StepName = 'init' | 'constitution' | 'specify' | 'plan' | 'tasks' | 'implement' | 'verify' | 'fix';
type StepOutcome = 'success' | 'failed' | 'skipped' | 'in-progress';
interface StepRecord { step, startedAt, completedAt?, outcome, prompt?, durationSeconds?, error? }
interface HistoryEntry { id, startedAt, completedAt?, description?, isContinuation, tool, model?, steps[], filesChanged[], outcome, durationSeconds?, notes? }
```

**Storage**: `.sokold/history.yaml`

### ollama.ts - AI Integration

**Responsibility**: Interface with Ollama for local AI inference

**Exports**:
- `ensureOllamaReady(model?: string): Promise<{ ready: boolean; error?: string }>`
- `decide(messages: Message[], tools: Tool[], model?: string): Promise<DecisionResponse>`
- `DEFAULT_MODEL: string` - Default model name ('rnj-1')

**Types**:
```typescript
type DecisionResponse = { status: 'success' | 'failure'; content: string; tools: ToolCall[] }
```

### config.ts - Configuration

**Responsibility**: Persist and retrieve user preferences

**Exports**:
- `loadConfig(rootPath?: string): SokoldConfig`
- `saveConfig(config: SokoldConfig, rootPath?: string): void`
- `getConfigValue(key: string, rootPath?: string): unknown`
- `setConfigValue(key: string, value: unknown, rootPath?: string): void`
- `listConfig(rootPath?: string): void`
- `getConfigPath(rootPath?: string): string`

**Types**:
```typescript
interface SokoldConfig {
  tool: 'copilot' | 'claude';
  model?: string;
  autoApprove: boolean;
  verbose: boolean;
  output: { colors: boolean; format: 'human' | 'json' };
  workflow: { currentBranchOnly: boolean; autoConstitution: boolean };
  promptsDir?: string;
}
```

**Storage**: `.sokold/config.yaml`

### functions/ - Ollama Function Definitions

**Responsibility**: Define tools for Ollama function calling

**Files**:
- `speckit.ts` - SpecKit agent functions (SpecifyFunction, PlanFunction, TaskFunction, ImplementFunction)
- `misc.ts` - General functions (askUserFunction, runCommandFunction, endProcessFunction, continueProcessFunction)
- `helpers.ts` - Utility functions (runAICommand, runShellCommand)
- `types.ts` - Shared type definitions (ToolResponse)

**Types**:
```typescript
interface ToolResponse { status: 'success' | 'failure'; content: string }
```

## Complexity Tracking

> Architecture evolved from 4-file constraint to support new features while maintaining simplicity.

| Aspect | Decision | Rationale |
|--------|----------|----------|
| File count | 8+ files | Modular separation for maintainability (core + supporting modules) |
| Dependencies | yaml, ollama | yaml for config, ollama for local AI inference |
| State management | state.ts | Track pipeline state for --continue resumption |
| History tracking | history.ts | Maintain run history for context and review |
| AI integration | ollama.ts | Local AI inference with function calling |
| File manipulation | Delegated | AI CLI (copilot/claude) handles all file operations |

## Phase Outputs

Since this documents an existing implementation:

- **research.md**: Not needed - implementation is straightforward
- **data-model.md**: Will document TypeScript interfaces
- **quickstart.md**: Will document usage for new users
- **contracts/cli-interface.md**: Will document CLI command structure
