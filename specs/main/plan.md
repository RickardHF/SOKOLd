# Implementation Plan: SOKOLd CLI Orchestrator

**Branch**: `main` | **Date**: January 9, 2026 | **Spec**: [spec.md](spec.md)
**Status**: Implemented - documenting existing architecture

## Summary

SOKOLd is a thin CLI orchestrator that delegates all work to AI CLI tools (copilot/claude) via spawn. The tool detects project state, initializes speckit if needed, runs speckit agents in sequence (specify → plan → tasks → implement), verifies implementation, and provides an execution summary. Architecture is intentionally minimal: 4 TypeScript files with clear separation of concerns.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+  
**Primary Dependencies**: yaml (config parsing), Node.js built-ins (spawn, fs, path)  
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
├── cli.ts       # Entry point, argument parsing, help display
├── pipeline.ts  # Main orchestration - runs AI CLI via spawn
├── detect.ts    # Project state detection (.specify, specs/, etc.)
└── config.ts    # YAML configuration management

bin/
└── sokold.js    # npm bin entry point (shebang wrapper)

tests/
├── contract/    # Contract tests
├── integration/ # Integration tests
│   └── setup/
└── unit/        # Unit tests
    ├── setup/
    └── state/
```

**Structure Decision**: Single project with flat `src/` directory. Each file has a single responsibility. No subdirectories needed given 4-file constraint.

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

**Responsibility**: Execute speckit workflow via AI CLI

**Exports**:
- `runPipeline(description: string | undefined, options: PipelineOptions): Promise<void>`

**Flow**:
1. `detectProject()` → check current state
2. If no `.specify/` → `runSpecifyInit()` via spawn
3. Determine steps based on state and description
4. For each step: spawn `<tool> -p "/<agent> <prompt>"`
5. After implement: `runVerification()` loop (max 3 retries)
6. `printSummary()` → show execution results

**Types**:
```typescript
type Step = 'init' | 'specify' | 'plan' | 'tasks' | 'implement' | 'verify';
interface PipelineOptions { dryRun?, tool?, model?, verbose?, autoApprove?, maxRetries? }
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
  hasSpeckit: boolean;  // .specify/ exists
  hasSpecs: boolean;    // specs/ exists
  hasSpec: boolean;     // specs/main/spec.md exists
  hasPlan: boolean;     // specs/main/plan.md exists
  hasTasks: boolean;    // specs/main/tasks.md exists
}
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
  workflow: { currentBranchOnly: boolean };
}
```

**Storage**: `.sokold/config.yaml`

## Complexity Tracking

> No violations - architecture meets simplicity requirements.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| File count | 4 files | Minimum viable separation of concerns |
| Dependencies | yaml only | Avoid bloat, use Node.js built-ins |
| State management | None | Stateless - detect from filesystem |
| File manipulation | Delegated | AI CLI handles all file operations |

## Phase Outputs

Since this documents an existing implementation:

- **research.md**: Not needed - implementation is straightforward
- **data-model.md**: Will document TypeScript interfaces
- **quickstart.md**: Will document usage for new users
- **contracts/cli-interface.md**: Will document CLI command structure
