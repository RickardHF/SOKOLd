# Tasks: SOKOLd CLI Orchestrator

**Input**: Design documents from `/specs/main/`  
**Prerequisites**: plan.md ✓, spec.md ✓, data-model.md ✓, contracts/ ✓  
**Status**: Implemented - tasks document existing code structure  
**Last Updated**: January 16, 2026

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- All paths are relative to repository root

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Project scaffolding and build configuration

- [x] T001 Create project structure with src/, bin/, tests/ directories
- [x] T002 Initialize npm project with package.json and bin entry for `sokold`
- [x] T003 [P] Configure TypeScript with tsconfig.json (ES modules, strict mode)
- [x] T004 [P] Configure Jest with ts-jest in jest.config.js
- [x] T005 [P] Create bin/sokold.js shebang wrapper for npm bin

**Checkpoint**: Project builds and `sokold` command is available

---

## Phase 2: Foundational (Core Detection)

**Purpose**: Basic detection infrastructure that ALL user stories depend on

- [x] T006 Create ProjectStatus interface in src/detect.ts
- [x] T007 Implement detectProject() to check for .specify/, specs/, spec.md, plan.md, tasks.md, constitution.md
- [x] T008 Implement getNextStep() to determine continuation point
- [x] T007a Add hasConstitution detection for .specify/memory/constitution.md
- [x] T007b Add hasExistingCode detection for src/ and code files

**Checkpoint**: Can detect project state - pipeline can begin

---

## Phase 3: User Story 1 - Run Full Workflow (Priority: P1) 🎯 MVP

**Goal**: User runs `sokold "description"` and gets from idea to implemented code

**Independent Test**: Run `sokold "any description"` in empty directory, verify full workflow executes

### Implementation for User Story 1

- [x] T009 [US1] Create PipelineOptions and ExecutionSummary interfaces in src/pipeline.ts
- [x] T010 [US1] Create Step type and STEP_AGENTS mapping in src/pipeline.ts
- [x] T011 [US1] Implement runSpecifyInit() to spawn `specify init --here --ai <tool> --force`
- [x] T012 [US1] Implement determineSteps() to calculate execution plan from ProjectStatus
- [x] T013 [US1] Implement buildPrompt() to construct agent prompts with description
- [x] T014 [US1] Implement runAICommand() to spawn AI CLI with `-p` flag
- [x] T015 [US1] Implement runVerification() to check implementation via AI
- [x] T016 [US1] Implement runFixAttempt() to request fixes via AI
- [x] T017 [US1] Implement verification loop with max 3 retries in runPipeline()
- [x] T018 [US1] Implement printSummary() to display execution results
- [x] T019 [US1] Wire runPipeline() to execute full flow: detect → init → agents → verify → summary

**Checkpoint**: `sokold "description"` runs complete workflow end-to-end

---

## Phase 4: User Story 2 - Configure AI Tool (Priority: P2)

**Goal**: User can set preferred AI tool and have it persist across sessions

**Independent Test**: Run `sokold set tool claude`, `sokold get tool`, verify persistence

### Implementation for User Story 2

- [x] T020 [P] [US2] Create SokoldConfig interface and DEFAULT_CONFIG in src/config.ts
- [x] T021 [P] [US2] Implement getConfigPath() to return .sokold/config.yaml path
- [x] T022 [US2] Implement loadConfig() to read and merge with defaults
- [x] T023 [US2] Implement saveConfig() to persist to YAML
- [x] T024 [US2] Implement getConfigValue() with dot-notation key support
- [x] T025 [US2] Implement setConfigValue() with dot-notation key support
- [x] T026 [US2] Implement validateConfigValue() to check valid values
- [x] T027 [US2] Implement listConfig() to display all settings
- [x] T028 [US2] Add getConfigKeys() for tab completion support
- [x] T028a [US2] Add workflow.autoConstitution config option

**Checkpoint**: Configuration persists in .sokold/config.yaml

---

## Phase 5: User Story 3 - Get Help (Priority: P3)

**Goal**: User can discover commands and usage via help text

**Independent Test**: Run `sokold --help`, verify comprehensive help displays

### Implementation for User Story 3

- [x] T029 [P] [US3] Create Args interface in src/cli.ts
- [x] T030 [US3] Implement parseArgs() to handle flags, commands, positional args
- [x] T031 [US3] Add shorthand parsing for `sokold set <key> <value>` and `sokold get <key>`
- [x] T032 [US3] Implement showHelp() with usage examples and config keys
- [x] T033 [US3] Implement handleConfigCommand() for config subcommands
- [x] T034 [US3] Wire CLI entry point to route to help, config, or pipeline

**Checkpoint**: Help text accessible via `--help` and no-args

---

## Phase 6: User Story 4 - Local AI with Ollama (Priority: P1)

**Goal**: User can run pipeline using local Ollama models instead of cloud AI CLIs

**Independent Test**: Run `sokold "description"` with Ollama running, verify local model is used

### Implementation for User Story 4

- [x] T043 [US4] Create ollama.ts module for Ollama integration
- [x] T044 [US4] Implement ensureOllamaReady() to verify Ollama is running and model available
- [x] T045 [US4] Implement decide() function for AI decision making with function calling
- [x] T046 [US4] Define DEFAULT_MODEL constant ('rnj-1')
- [x] T047 [US4] Create functions/ directory for Ollama tool definitions
- [x] T048 [US4] Create functions/types.ts with ToolResponse interface
- [x] T049 [US4] Create functions/speckit.ts with SpecifyFunction, PlanFunction, TaskFunction, ImplementFunction
- [x] T050 [US4] Implement specify(), plan(), createTasks(), implement() executor functions
- [x] T051 [US4] Create functions/misc.ts with askUserFunction, runCommandFunction, etc.
- [x] T052 [US4] Create functions/helpers.ts with runAICommand() and runShellCommand() utilities
- [x] T053 [US4] Update pipeline.ts to use Ollama decide() with function tools
- [x] T054 [US4] Add Ollama readiness check at pipeline start

**Checkpoint**: Pipeline uses local Ollama for orchestration

---

## Phase 7: User Story 5 - State & History Tracking (Priority: P2)

**Goal**: User can resume interrupted pipelines and review past runs

**Independent Test**: Interrupt `sokold "description"`, run `sokold --continue`, verify resume works

### Implementation for User Story 5

- [x] T055 [US5] Create state.ts module for pipeline state management
- [x] T056 [US5] Implement PipelineState interface with completedSteps, currentStep, etc.
- [x] T057 [US5] Implement loadState(), saveState(), initState(), clearState()
- [x] T058 [US5] Implement markStepStarted(), markStepCompleted() for progress tracking
- [x] T059 [US5] Implement getNextStepFromState() for --continue support
- [x] T060 [US5] Create history.ts module for run history tracking
- [x] T061 [US5] Implement HistoryEntry, StepRecord, FileChange interfaces
- [x] T062 [US5] Implement startHistoryEntry(), completeHistoryEntry()
- [x] T063 [US5] Implement recordStepStart(), recordStepComplete()
- [x] T064 [US5] Implement getRecentHistory(), getHistoryEntry()
- [x] T065 [US5] Implement addRunNote() for annotating past runs
- [x] T066 [US5] Implement buildHistoryContext() for providing context to AI
- [x] T067 [US5] Add history command parsing in cli.ts
- [x] T068 [US5] Implement formatHistory(), formatHistoryEntry() for display
- [x] T069 [US5] Wire state tracking into pipeline.ts
- [x] T070 [US5] Wire history tracking into pipeline.ts

**Checkpoint**: `sokold --continue` and `sokold history` work correctly

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge cases, and user experience

- [x] T035 Add status display (📊) showing project state before execution
- [x] T036 Add execution plan display (📋) showing steps to run
- [x] T037 Add step progress display (⚡) with command being run
- [x] T038 Add success/failure indicators (✓/✗) for each step
- [x] T039 Handle empty description → show help
- [x] T040 Handle --dry-run flag → show plan without executing
- [x] T041 Handle --verbose flag → pass through to AI CLI
- [x] T042 Exit with code 1 on pipeline failure, 0 on success
- [x] T071 Add Ollama status check (🔍) at pipeline start
- [x] T072 Handle missing Ollama model → prompt to pull

---

## Dependencies

```
Phase 1 (Setup) ─────────────────────────────────────────────────────────┐
                                                                          │
Phase 2 (Foundational) ──────────────────────────────────────────────────┤
                                                                          │
     ┌────────────────────┬────────────────────┬──────────────────────┐  │
     │                    │                    │                      │  │
Phase 3 (US1)       Phase 4 (US2)        Phase 5 (US3)                │  │
Full Workflow       Configuration         Help                        │  │
     │                    │                    │                      │  │
     └────────────────────┴────────────────────┴──────────────────────┘  │
                                                                          │
Phase 6 (US4: Ollama) ◄───────────────────────────────────────────────────┤
                                                                          │
Phase 7 (US5: State & History) ◄──────────────────────────────────────────┤
                                                                          │
Phase 8 (Polish) ◄────────────────────────────────────────────────────────┘
```

**Notes**:
- Phase 1 must complete before all others
- Phase 2 must complete before user story phases
- User stories (Phases 3-5) can be implemented in parallel after Phase 2
- Phase 6 (Ollama) depends on Phase 3 (Full Workflow)
- Phase 7 (State & History) depends on Phase 3 (Full Workflow)
- Phase 8 depends on all user stories being complete

## Parallel Execution Opportunities

| Parallel Group | Tasks | Rationale |
|----------------|-------|-----------|
| Setup configs | T003, T004, T005 | Independent config files |
| US2 foundation | T020, T021 | Interface + path helper are independent |
| Cross-story | Phases 3, 4, 5 | Each story touches different files |
| Function defs | T048, T049, T051 | Independent tool definitions |

## Implementation Strategy

Since this is an **existing implementation**, all tasks are marked complete (✓). This document serves as:

1. **Architecture documentation** - shows how code maps to user stories
2. **Onboarding guide** - new contributors understand the breakdown
3. **Regression reference** - if changes break something, trace back to task

## File → Task Mapping

| File | Tasks |
|------|-------|
| src/cli.ts | T029-T034, T067-T068 (US3, US5) |
| src/pipeline.ts | T009-T019, T053-T054, T069-T070 (US1, US4, US5) |
| src/detect.ts | T006-T008 (Foundational) |
| src/config.ts | T020-T028 (US2) |
| src/state.ts | T055-T059 (US5) |
| src/history.ts | T060-T066 (US5) |
| src/ollama.ts | T043-T046 (US4) |
| src/functions/types.ts | T048 (US4) |
| src/functions/speckit.ts | T049-T050 (US4) |
| src/functions/misc.ts | T051 (US4) |
| src/functions/helpers.ts | T052 (US4) |
| bin/sokold.js | T005 (Setup) |
| package.json | T002 (Setup) |
| tsconfig.json | T003 (Setup) |
| jest.config.js | T004 (Setup) |

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 72 |
| Setup phase | 5 tasks |
| Foundational phase | 5 tasks |
| User Story 1 (P1) | 11 tasks |
| User Story 2 (P2) | 10 tasks |
| User Story 3 (P3) | 6 tasks |
| User Story 4 (P1: Ollama) | 12 tasks |
| User Story 5 (P2: State/History) | 16 tasks |
| Polish phase | 10 tasks |
| Polish phase | 8 tasks |
| Parallel opportunities | 3 groups |
| MVP scope | Phases 1-3 (19 tasks) |
