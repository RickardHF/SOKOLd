# Tasks: SOKOLd CLI Orchestrator

**Input**: Design documents from `/specs/main/`  
**Prerequisites**: plan.md ✓, spec.md ✓, data-model.md ✓, contracts/ ✓  
**Status**: Implemented - tasks document existing code structure

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
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
- [x] T007 Implement detectProject() to check for .specify/, specs/, spec.md, plan.md, tasks.md
- [x] T008 Implement getNextStep() to determine continuation point

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

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge cases, and user experience

- [x] T035 Add status display (📊) showing project state before execution
- [x] T036 Add execution plan display (📋) showing steps to run
- [x] T037 Add step progress display (⚡) with command being run
- [x] T038 Add success/failure indicators (✓/✗) for each step
- [x] T039 Handle empty description → show help
- [x] T040 Handle --dry-run flag → show plan without executing
- [x] T041 Handle --verbose flag → pass through to AI CLI
- [x] T042 Exit with code 1 on pipeline failure, 0 on success

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
Phase 6 (Polish) ◄────────────────────────────────────────────────────────┘
```

**Notes**:
- Phase 1 must complete before all others
- Phase 2 must complete before user story phases
- User stories (Phases 3-5) can be implemented in parallel after Phase 2
- Phase 6 depends on all user stories being complete

## Parallel Execution Opportunities

| Parallel Group | Tasks | Rationale |
|----------------|-------|-----------|
| Setup configs | T003, T004, T005 | Independent config files |
| US2 foundation | T020, T021 | Interface + path helper are independent |
| Cross-story | Phases 3, 4, 5 | Each story touches different files |

## Implementation Strategy

Since this is an **existing implementation**, all tasks are marked complete (✓). This document serves as:

1. **Architecture documentation** - shows how code maps to user stories
2. **Onboarding guide** - new contributors understand the breakdown
3. **Regression reference** - if changes break something, trace back to task

## File → Task Mapping

| File | Tasks |
|------|-------|
| src/cli.ts | T029-T034 (US3) |
| src/pipeline.ts | T009-T019 (US1) |
| src/detect.ts | T006-T008 (Foundational) |
| src/config.ts | T020-T028 (US2) |
| bin/sokold.js | T005 (Setup) |
| package.json | T002 (Setup) |
| tsconfig.json | T003 (Setup) |
| jest.config.js | T004 (Setup) |

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 42 |
| Setup phase | 5 tasks |
| Foundational phase | 3 tasks |
| User Story 1 (P1) | 11 tasks |
| User Story 2 (P2) | 9 tasks |
| User Story 3 (P3) | 6 tasks |
| Polish phase | 8 tasks |
| Parallel opportunities | 3 groups |
| MVP scope | Phases 1-3 (19 tasks) |
