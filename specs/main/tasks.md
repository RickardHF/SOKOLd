---
description: "Task list for SpecKit Automation CLI implementation"
---

# Tasks: SpecKit Automation CLI

**Input**: Design documents from `/specs/main/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli-interface.md

**Tests**: Test tasks are NOT included in this implementation as they were not explicitly requested in the feature specification. TDD approach can be adopted later if needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- Single project structure at repository root
- TypeScript/Node.js project
- `src/` for source code, `tests/` for tests
- Paths follow structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic TypeScript/Node.js structure

- [X] T001 Create project directory structure per plan.md (src/cli/, src/core/, src/adapters/, src/utils/, tests/)
- [X] T002 Initialize Node.js project with package.json (TypeScript 5.x, Node.js 18.x LTS)
- [X] T003 [P] Install core dependencies (commander, execa, fs-extra, yaml, glob, chalk) in package.json
- [X] T004 [P] Install dev dependencies (Jest, TypeScript, ESLint, Prettier, @types packages) in package.json
- [X] T005 [P] Configure TypeScript compiler in tsconfig.json
- [X] T006 [P] Configure ESLint and Prettier in .eslintrc.js and .prettierrc
- [X] T007 [P] Configure Jest for TypeScript testing in jest.config.js
- [X] T008 [P] Add npm scripts for build, test, lint, dev in package.json
- [X] T009 Create main entry point in src/main.ts with version check (Node.js >= 18.0.0)
- [X] T010 Create CLI executable bin script that invokes src/main.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T011 Create cross-platform path utilities in src/utils/filesystem.ts (path.normalize, path.join, path.resolve)
- [X] T012 [P] Create process spawning utilities in src/utils/process.ts (using execa with timeout support)
- [X] T013 [P] Create configuration management in src/utils/config.ts (YAML/JSON loading, hierarchy search)
- [X] T014 [P] Create logging utilities in src/utils/logger.ts (verbosity levels: quiet, normal, verbose, debug)
- [X] T015 Create Configuration entity loader in src/core/config/ConfigLoader.ts (implements data-model.md Configuration)
- [X] T016 [P] Create RepositoryContext scanner in src/core/context/RepositoryContext.ts (detects git, SpecKit, project type)
- [X] T017 [P] Create FeatureSpecification parser in src/core/speckit/SpecParser.ts (parses spec.md files)
- [X] T018 Create ImplementationProgress state manager in src/core/state/StateManager.ts (loads/saves .speckit-automate/state.json)
- [X] T019 [P] Create AIToolAdapter interface in src/adapters/ai/AIToolAdapter.ts (detect, suggest, implement methods)
- [X] T020 [P] Create QualityCheck interface in src/adapters/tooling/QualityCheck.ts (detect, run, parse methods)
- [X] T021 Create CLI parser with commander in src/cli/parser.ts (global options, help, version)
- [X] T022 [P] Embed SpecKit templates in templates/ directory (constitution.md, spec-template.md, plan-template.md, tasks-template.md)
- [X] T023 Create error handling and exit code management in src/utils/errors.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Initialize SpecKit in Any Repository (Priority: P1) 🎯 MVP

**Goal**: Enable developers to initialize SpecKit in new or existing repositories with a single command

**Independent Test**: Run `speckit-automate init` in both an empty directory and a directory with existing code, verify all SpecKit files and directories are created correctly without modifying existing code

### Implementation for User Story 1

- [X] T024 [P] [US1] Create InitCommand class in src/cli/commands/InitCommand.ts implementing Command interface
- [X] T025 [US1] Implement SpecKit structure detection logic in src/core/speckit/SpecKitDetector.ts (checks for .specify/ directory)
- [X] T026 [US1] Implement directory creation logic in src/core/speckit/SpecKitInitializer.ts (creates .specify/memory/, .specify/templates/, .specify/scripts/, specs/)
- [X] T027 [US1] Implement template file copying in src/core/speckit/TemplateManager.ts (copies embedded templates to .specify/templates/)
- [X] T028 [US1] Add constitution.md initialization in SpecKitInitializer (creates .specify/memory/constitution.md)
- [X] T029 [US1] Wire InitCommand into CLI parser in src/cli/parser.ts (register init command with options: --force, --minimal)
- [X] T030 [US1] Implement success/error reporting for init command (file counts, next steps suggestions)
- [X] T031 [US1] Add validation to prevent overwriting without --force flag

**Checkpoint**: At this point, User Story 1 should be fully functional - can initialize SpecKit in any repository

---

## Phase 4: User Story 4 - CLI Tool Selection and Configuration (Priority: P3)

**Goal**: Enable users to configure AI CLI tool preference and customize automation behavior

**Independent Test**: Set preference to Copilot via config, run status check, verify Copilot is selected. Change to Claude, verify Claude is selected instead

**Note**: Implementing this before US2 because configuration is needed for implementation features

### Implementation for User Story 4

- [X] T032 [P] [US4] Create ConfigCommand class in src/cli/commands/ConfigCommand.ts implementing Command interface
- [X] T033 [US4] Implement config get action in ConfigCommand (reads and displays config values)
- [X] T034 [US4] Implement config set action in ConfigCommand (updates config file with validation)
- [X] T035 [US4] Implement config list action in ConfigCommand (displays all configuration)
- [X] T036 [US4] Implement config reset action in ConfigCommand (restores defaults)
- [X] T037 [US4] Implement config path action in ConfigCommand (shows config file location)
- [X] T038 [US4] Add platform-specific config directory resolution in src/utils/filesystem.ts (Windows: AppData, macOS: Application Support, Linux: .config)
- [X] T039 [US4] Create configuration schema validation in src/core/config/ConfigValidator.ts (validates aiTool, maxRetries, timeout, etc.)
- [X] T040 [US4] Wire ConfigCommand into CLI parser in src/cli/parser.ts (register config command with --global flag)
- [X] T041 [US4] Implement hierarchical config loading (project → user → defaults) in ConfigLoader

**Checkpoint**: Configuration management is now complete, can be used by implementation features

---

## Phase 5: User Story 2 - Auto-Implement Features from Specifications (Priority: P2)

**Goal**: Automatically detect and implement unimplemented features using AI CLI tools with auto-approval

**Independent Test**: Create a feature spec in `specs/1-test-feature/spec.md`, run `speckit-automate implement`, verify the tool invokes the selected CLI tool with auto-approve flags and generates implementation code

### Implementation for User Story 2

- [X] T042 [P] [US2] Create ImplementCommand class in src/cli/commands/ImplementCommand.ts implementing Command interface
- [X] T043 [P] [US2] Create FeatureScanner in src/core/scanner/FeatureScanner.ts (scans specs/ directory for feature directories)
- [X] T044 [P] [US2] Create StatusDetector in src/core/scanner/StatusDetector.ts (determines if feature is implemented, partial, pending)
- [X] T045 [US2] Create CopilotAdapter in src/adapters/ai/CopilotAdapter.ts implementing AIToolAdapter (GitHub Copilot CLI integration)
- [X] T046 [P] [US2] Create ClaudeAdapter in src/adapters/ai/ClaudeAdapter.ts implementing AIToolAdapter (Claude CLI integration)
- [X] T047 [US2] Create AIToolFactory in src/adapters/ai/AIToolFactory.ts (detects and instantiates available AI tools)
- [X] T048 [US2] Implement AI tool detection logic in adapters (check for gh copilot and claude executables)
- [X] T049 [US2] Create FeatureOrchestrator in src/core/orchestrator/FeatureOrchestrator.ts (manages implementation workflow)
- [X] T050 [US2] Implement auto-approval invocation in CopilotAdapter (use appropriate flags for GitHub Copilot CLI)
- [X] T051 [US2] Implement auto-approval invocation in ClaudeAdapter (use appropriate flags for Claude CLI)
- [X] T052 [US2] Add priority-based feature filtering in FeatureScanner (P1, P2, P3, P4)
- [X] T053 [US2] Add sequential implementation logic in FeatureOrchestrator (process features in priority order)
- [X] T054 [US2] Implement state persistence after each feature in StateManager (save to .speckit-automate/state.json)
- [X] T055 [US2] Add partial implementation resume capability in StatusDetector (check state.json for completed steps)
- [X] T056 [US2] Create ExecutionSession tracker in src/core/state/SessionTracker.ts (tracks current session data per data-model.md)
- [X] T057 [US2] Implement session logging to .speckit-automate/logs/session-{id}.json in SessionTracker
- [X] T058 [US2] Wire ImplementCommand into CLI parser (options: --tool, --priority, --dry-run, --continue)
- [X] T059 [US2] Add progress reporting and real-time feedback in ImplementCommand (spinners, progress bars)
- [X] T060 [US2] Create execution report generation in src/core/orchestrator/ReportGenerator.ts (features processed, success/failure counts)

**Checkpoint**: Auto-implementation is now functional - can detect and implement features using AI tools

---

## Phase 6: User Story 3 - Automated Quality Checks and Fixes (Priority: P2)

**Goal**: Automatically run tests, linting, and builds after implementation, with AI-assisted fixes for failures

**Independent Test**: Introduce intentional test failures or linting errors, run the automation tool, verify it detects issues and successfully fixes them automatically

### Implementation for User Story 3

- [X] T061 [P] [US3] Create TestRunner in src/adapters/tooling/TestRunner.ts implementing QualityCheck (detects and runs test frameworks)
- [X] T062 [P] [US3] Create Linter in src/adapters/tooling/Linter.ts implementing QualityCheck (detects and runs linters)
- [X] T063 [P] [US3] Create Builder in src/adapters/tooling/Builder.ts implementing QualityCheck (detects and runs build tools)
- [X] T064 [US3] Implement test framework detection in TestRunner (npm test, pytest, cargo test, go test)
- [X] T065 [US3] Implement linter detection in Linter (eslint, pylint, clippy, golint)
- [X] T066 [US3] Implement build tool detection in Builder (npm run build, cargo build, go build, make)
- [X] T067 [P] [US3] Create output parser for test results in src/adapters/tooling/parsers/TestOutputParser.ts (JUnit XML, TAP, JSON)
- [X] T068 [P] [US3] Create output parser for lint results in src/adapters/tooling/parsers/LintOutputParser.ts (JSON, checkstyle)
- [X] T069 [P] [US3] Create output parser for build results in src/adapters/tooling/parsers/BuildOutputParser.ts (stderr parsing)
- [X] T070 [US3] Create QualityCheckRunner in src/core/quality/QualityCheckRunner.ts (orchestrates test, lint, build execution)
- [X] T071 [US3] Implement failure detection and parsing in QualityCheckRunner (creates FailureDetail entities)
- [X] T072 [US3] Create FailureFixer in src/core/quality/FailureFixer.ts (invokes AI tool to fix detected failures)
- [X] T073 [US3] Implement retry logic with configurable max attempts in FailureFixer (default 3, from config)
- [X] T074 [US3] Add retry count tracking in StateManager (increment retryCount per feature in state.json)
- [X] T075 [US3] Integrate QualityCheckRunner into FeatureOrchestrator (run checks after implementation)
- [X] T076 [US3] Integrate FailureFixer into FeatureOrchestrator (auto-fix on failure)
- [X] T077 [US3] Add iterative fix-and-recheck loop in FeatureOrchestrator (until pass or max retries)
- [X] T078 [US3] Create QualityCheckResult entities in src/core/quality/QualityCheckResult.ts (per data-model.md)
- [X] T079 [US3] Add quality check results to execution reports in ReportGenerator
- [X] T080 [US3] Add command-line flags to ImplementCommand (--no-tests, --no-lint, --no-build, --max-retries)

**Checkpoint**: Quality checks and auto-fixes are now integrated - features are validated and auto-corrected

---

## Phase 7: Supporting Commands

**Purpose**: Additional commands for status, diagnostics, and state management

### Status Command

- [X] T081 [P] [US2] Create StatusCommand class in src/cli/commands/StatusCommand.ts implementing Command interface
- [X] T082 [US2] Implement feature status display in StatusCommand (loads state, displays per-feature status)
- [X] T083 [US2] Add detailed view option (--detailed flag shows retry counts, failed checks)
- [X] T084 [US2] Add JSON output option (--json flag for machine-readable status)
- [X] T085 [US2] Add status filtering (--filter pending|completed|failed)
- [X] T086 [US2] Wire StatusCommand into CLI parser

### Reset Command

- [X] T087 [P] [US2] Create ResetCommand class in src/cli/commands/ResetCommand.ts implementing Command interface
- [X] T088 [US2] Implement state reset logic in StateManager (reset status to pending, clear retryCount)
- [X] T089 [US2] Add confirmation prompt for reset operations (skip with --force)
- [X] T090 [US2] Add reset all option (--all flag)
- [X] T091 [US2] Wire ResetCommand into CLI parser

### Doctor Command

- [X] T092 [P] [US4] Create DoctorCommand class in src/cli/commands/DoctorCommand.ts implementing Command interface
- [X] T093 [US4] Implement Node.js version check in DoctorCommand (>= 18.0.0)
- [X] T094 [US4] Implement SpecKit initialization check in DoctorCommand
- [X] T095 [US4] Implement AI tool detection and version reporting in DoctorCommand
- [X] T096 [US4] Implement configuration validation in DoctorCommand
- [X] T097 [US4] Implement git repository detection in DoctorCommand (optional check)
- [X] T098 [US4] Add auto-fix capability (--fix flag) for common issues
- [X] T099 [US4] Wire DoctorCommand into CLI parser

---

## Phase 8: Cross-Platform Compatibility & Polish

**Purpose**: Ensure consistent behavior across Windows, macOS, and Linux

- [X] T100 [P] Verify path handling works on Windows (backslashes) and Unix (forward slashes)
- [X] T101 [P] Test config directory resolution on all platforms (Windows AppData, macOS Application Support, Linux .config)
- [X] T102 [P] Validate process spawning with execa on all platforms
- [X] T103 [P] Test file operations (fs-extra) on all platforms
- [X] T104 [P] Add colored output support with chalk (respects NO_COLOR env var)
- [X] T105 [P] Implement --no-color flag handling globally
- [X] T106 [P] Add environment variable support (SPECKIT_CONFIG_PATH, SPECKIT_AI_TOOL, SPECKIT_LOG_LEVEL)
- [X] T107 [P] Create comprehensive error messages following error format contract from cli-interface.md
- [ ] T108 [P] Add CI/CD detection (non-interactive mode) using CI environment variables
- [X] T109 Validate all exit codes match contract specifications in cli-interface.md
- [ ] T110 Add stdin input support for batch operations (implement command)

---

## Phase 9: Documentation & Distribution

**Purpose**: Prepare for release and user consumption

- [X] T111 [P] Create README.md with installation instructions and quick start
- [X] T112 [P] Create CHANGELOG.md with semantic versioning
- [ ] T113 [P] Add inline JSDoc comments to all public interfaces
- [ ] T114 [P] Generate API documentation from JSDoc (if tooling available)
- [ ] T115 [P] Update quickstart.md with actual CLI commands and examples
- [X] T116 Create package.json metadata (description, keywords, repository, license, engines)
- [X] T117 Add bin entry in package.json pointing to compiled CLI executable
- [X] T118 Configure npm package for publishing (set name, version, files to include)
- [ ] T119 Test npm installation globally (npm install -g from local package)
- [ ] T120 Test npm link for development workflow
- [ ] T121 [P] Create GitHub Actions CI workflow for testing on Windows, macOS, Linux
- [ ] T122 [P] Add pre-commit hooks for linting and testing (optional, using husky)

---

## Phase 10: Final Validation

**Purpose**: End-to-end testing and validation against success criteria

- [ ] T123 Validate SC-001: Init command completes in under 10 seconds in new and existing repos
- [ ] T124 Validate SC-002: System detects and implements unimplemented features without user intervention
- [ ] T125 Validate SC-003: Quality checks run after implementation and correctly detect failures
- [ ] T126 Validate SC-004: Auto-fix capability resolves common errors (missing imports, syntax errors)
- [ ] T127 Validate SC-005: Complete implementation cycle for typical feature completes in under 15 minutes
- [ ] T128 Validate SC-006: Can switch between Copilot and Claude through configuration
- [ ] T129 Validate SC-007: Tool operates in CI/CD without interactive prompts
- [ ] T130 Validate SC-008: Execution reports provide complete traceability
- [ ] T131 Run quickstart.md walkthrough end-to-end as final acceptance test
- [ ] T132 Verify all constitution principles are satisfied (cross-platform, CLI-first, observability, etc.)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion - BLOCKS all user stories
- **Phase 3 (US1 - Init)**: Depends on Phase 2 completion - No dependencies on other stories
- **Phase 4 (US4 - Config)**: Depends on Phase 2 completion - Needed before US2 implementation
- **Phase 5 (US2 - Implement)**: Depends on Phase 2 and Phase 4 completion - Core automation feature
- **Phase 6 (US3 - Quality Checks)**: Depends on Phase 5 completion - Extends implementation with quality gates
- **Phase 7 (Supporting Commands)**: Depends on Phase 2, 4, and 5 - Utility commands
- **Phase 8 (Compatibility & Polish)**: Can start after Phase 7 - Cross-cutting improvements
- **Phase 9 (Documentation)**: Can start anytime, complete before distribution
- **Phase 10 (Validation)**: Depends on all previous phases - Final acceptance testing

### User Story Dependencies

- **US1 (Init) - Phase 3**: Independent - Can start after Foundational
- **US4 (Config) - Phase 4**: Independent - Can start after Foundational, but needed before US2
- **US2 (Implement) - Phase 5**: Depends on US4 (Config) for AI tool configuration
- **US3 (Quality Checks) - Phase 6**: Depends on US2 (Implement) to have implementation to check

### Within Each Phase

- Tasks marked [P] can run in parallel (different files, no dependencies)
- Unmarked tasks must run sequentially or after their dependencies
- Tasks with same [Story] label belong to the same user story

### Parallel Opportunities

**Phase 1 (Setup)**:
- T003, T004, T005, T006, T007, T008 can all run in parallel

**Phase 2 (Foundational)**:
- T012, T013, T014 can run in parallel (different utilities)
- T015, T016, T017 can run in parallel after utilities
- T019, T020, T022, T023 can run in parallel

**Phase 3 (US1)**:
- T024 can start once command interface is ready

**Phase 4 (US4)**:
- T032, T038 can run in parallel

**Phase 5 (US2)**:
- T042, T043, T044 can run in parallel at start
- T045, T046 can run in parallel
- Multiple developers can work on different components simultaneously

**Phase 6 (US3)**:
- T061, T062, T063 can run in parallel
- T067, T068, T069 can run in parallel

**Phase 7 (Supporting)**:
- All three command groups (Status, Reset, Doctor) can be developed in parallel

**Phase 8 (Polish)**:
- Most tasks marked [P] can run in parallel

**Phase 9 (Documentation)**:
- Most tasks marked [P] can run in parallel

---

## Parallel Example: Phase 5 (User Story 2 - Implement)

```bash
# Launch scanner and adapters in parallel:
Task T043: "Create FeatureScanner in src/core/scanner/FeatureScanner.ts"
Task T044: "Create StatusDetector in src/core/scanner/StatusDetector.ts"
Task T045: "Create CopilotAdapter in src/adapters/ai/CopilotAdapter.ts"
Task T046: "Create ClaudeAdapter in src/adapters/ai/ClaudeAdapter.ts"

# After these complete, continue with orchestration:
Task T049: "Create FeatureOrchestrator in src/core/orchestrator/FeatureOrchestrator.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 4 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Init command)
4. Complete Phase 4: User Story 4 (Config command)
5. **STOP and VALIDATE**: Test init and config independently
6. Can now manually set up SpecKit and configure preferences

### Core Value (Add User Story 2)

1. Complete MVP phases above
2. Complete Phase 5: User Story 2 (Implement command)
3. **STOP and VALIDATE**: Test auto-implementation independently with simple feature
4. Can now auto-implement features (without quality checks)

### Full Feature (Add User Story 3)

1. Complete Core Value phases above
2. Complete Phase 6: User Story 3 (Quality checks and auto-fixes)
3. **STOP and VALIDATE**: Test full implementation cycle with quality gates
4. Full automation is now functional

### Production Ready

1. Complete Full Feature phases above
2. Complete Phase 7: Supporting Commands (status, reset, doctor)
3. Complete Phase 8: Cross-Platform Compatibility & Polish
4. Complete Phase 9: Documentation & Distribution
5. Complete Phase 10: Final Validation
6. Ready for release and distribution

### Parallel Team Strategy

With multiple developers:

1. **Team completes Phase 1 and Phase 2 together** (foundational infrastructure)
2. Once Phase 2 is done:
   - **Developer A**: Phase 3 (User Story 1 - Init)
   - **Developer B**: Phase 4 (User Story 4 - Config)
   - **Developer C**: Phase 2 parallel tasks, then help with Phase 5 prep
3. After Phases 3 & 4:
   - **Developer A + B**: Phase 5 (User Story 2 - Implement) - can split adapters/scanner/orchestrator
4. After Phase 5:
   - **Developer A**: Phase 6 (User Story 3 - Quality Checks)
   - **Developer B**: Phase 7 (Supporting Commands)
   - **Developer C**: Phase 8 (Compatibility & Polish)
5. All developers: Phase 9 and Phase 10 together

---

## Task Metrics

- **Total Tasks**: 132
- **Phase 1 (Setup)**: 10 tasks (8 parallelizable)
- **Phase 2 (Foundational)**: 13 tasks (9 parallelizable)
- **Phase 3 (US1 - Init)**: 8 tasks (1 parallelizable)
- **Phase 4 (US4 - Config)**: 10 tasks (2 parallelizable)
- **Phase 5 (US2 - Implement)**: 19 tasks (5 parallelizable)
- **Phase 6 (US3 - Quality)**: 20 tasks (7 parallelizable)
- **Phase 7 (Supporting)**: 19 tasks (3 parallelizable)
- **Phase 8 (Polish)**: 11 tasks (10 parallelizable)
- **Phase 9 (Documentation)**: 12 tasks (10 parallelizable)
- **Phase 10 (Validation)**: 10 tasks

**Parallel Opportunities**: 55 tasks marked [P] (41.7% of total)

**Estimated MVP Scope**: Phases 1-4 (41 tasks) = ~30% of total work, delivers init and config functionality

**Estimated Core Value**: Phases 1-5 (60 tasks) = ~45% of total work, delivers auto-implementation

**Estimated Full Feature**: Phases 1-6 (80 tasks) = ~60% of total work, delivers complete automation with quality checks

---

## Notes

- All tasks follow strict checklist format: `- [ ] [ID] [P?] [Story?] Description with file path`
- [P] tasks = different files, no dependencies, can run in parallel
- [Story] labels (US1-US4) map to user stories from spec.md for traceability
- Each user story should be independently completable and testable
- Tests were NOT included as they were not explicitly requested in the specification
- Commit after each task or logical group of related tasks
- Stop at any checkpoint to validate story independently
- All paths use TypeScript conventions (.ts extension) per research.md decision
- Cross-platform compatibility is built-in via Node.js path module and execa
- Configuration hierarchy (project → user → defaults) enables flexible usage
- State persistence enables resume capability after failures
- AI tool adapter pattern enables easy extension to new AI CLI tools
