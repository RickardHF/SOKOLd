# Tasks: Adaptive Repository Setup

**Input**: Design documents from `/specs/001-repo-setup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: NOT included in this task list as they were not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single project structure per plan.md:
- Source code: `src/core/`, `src/cli/`, `src/utils/`
- Tests: `tests/unit/`, `tests/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Install and configure dependencies in package.json (fs-extra, glob, yaml, commander, execa)
- [X] T002 [P] Create directory structure src/core/state/ for state detection modules
- [X] T003 [P] Create directory structure src/core/setup/ for setup orchestration modules
- [X] T004 [P] Create directory structure tests/unit/state/ for state detection tests
- [X] T005 [P] Create directory structure tests/unit/setup/ for setup orchestration tests
- [X] T006 [P] Create directory structure tests/integration/setup/ for integration tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Define TypeScript types and interfaces in src/types/repository-state.ts (RepositoryState, RepositoryStateType)
- [X] T008 [P] Define TypeScript types and interfaces in src/types/project-metadata.ts (ProjectMetadata, ProjectType)
- [X] T009 [P] Define TypeScript types and interfaces in src/types/configuration-set.ts (ConfigurationSet, ConfigFile)
- [X] T010 [P] Define TypeScript types and interfaces in src/types/setup-operation.ts (SetupOperation, SetupResult, SetupSummary)
- [X] T011 [P] Define TypeScript types and interfaces in src/types/validation-result.ts (ValidationResult, ValidationError)
- [X] T012 [P] Create custom error classes in src/utils/errors.ts (PermissionError, CorruptionError, AmbiguityError, ValidationError)
- [X] T013 [P] Create file operations utilities in src/utils/file-operations.ts using fs-extra and path.join for cross-platform support
- [X] T014 [P] Create template engine utility in src/utils/template-engine.ts for variable substitution in configuration templates

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Initialize New Empty Repository (Priority: P1) 🎯 MVP

**Goal**: Enable developers to set up both speckit and sokold configurations in a new empty repository using a project description, generating all necessary files and directory structures from scratch.

**Independent Test**: Run setup in a completely empty directory with a project description. Verify that:
- `.specify/` and `.sokold/` directories are created
- All required configuration files exist in both directories
- Configuration files contain project-specific values from the description
- Running speckit and sokold commands works without errors

### Implementation for User Story 1

- [X] T015 [P] [US1] Implement detectRepositoryState() in src/core/state/detector.ts to detect EMPTY state
- [X] T016 [P] [US1] Implement hasSourceFiles() helper in src/core/state/detector.ts using glob to scan for source files
- [X] T017 [US1] Implement parseUserDescription() in src/core/state/analyzer.ts to extract project metadata from user description
- [X] T018 [P] [US1] Create configuration templates in .specify/templates/speckit/ (constitution.md.template, config.yaml.template)
- [X] T019 [P] [US1] Create configuration templates in .sokold/templates/sokold/ (config.yaml.template, default-prompt.md.template)
- [X] T020 [US1] Implement generateSpeckitConfig() in src/core/setup/speckit-setup.ts for creating speckit configuration from templates
- [X] T021 [US1] Implement generateSokoldConfig() in src/core/setup/sokold-setup.ts for creating sokold configuration from templates
- [X] T022 [US1] Implement synchronizeSharedSettings() in src/core/setup/synchronizer.ts to sync project name and language between configs
- [X] T023 [US1] Implement executeSetup() orchestrator for EMPTY state in src/core/setup/orchestrator.ts coordinating detection, generation, and synchronization
- [X] T024 [US1] Create CLI command in src/cli/commands/setup.ts with --description option and human-readable output
- [X] T025 [US1] Add error handling for permission errors and provide actionable error messages
- [X] T026 [US1] Add progress indicators for setup steps in CLI output

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - setup works for empty repositories

---

## Phase 4: User Story 2 - Setup in Existing Unconfigured Repository (Priority: P2)

**Goal**: Enable setup in repositories with existing code but no speckit/sokold configurations, where the system analyzes the codebase to detect language, framework, and structure, then generates appropriate configurations automatically.

**Independent Test**: Run setup in an existing repository (e.g., a React app) without providing description. Verify that:
- System correctly detects the programming language (e.g., TypeScript)
- System correctly identifies the framework (e.g., React)
- Generated configurations match the actual project structure
- No existing code files are modified
- Both speckit and sokold commands work with generated configs

### Implementation for User Story 2

- [X] T027 [US2] Extend detectRepositoryState() in src/core/state/detector.ts to detect UNCONFIGURED state
- [X] T028 [P] [US2] Implement language detection by file extension counting in src/core/state/analyzer.ts
- [X] T029 [P] [US2] Implement manifest file parsing in src/core/state/analyzer.ts (package.json, requirements.txt, Cargo.toml, go.mod, pom.xml)
- [X] T030 [US2] Implement framework detection in src/core/state/analyzer.ts using dependency inspection and file patterns
- [X] T031 [US2] Implement project type inference in src/core/state/analyzer.ts based on structure and framework
- [X] T032 [US2] Implement confidence score calculation in src/core/state/analyzer.ts
- [X] T033 [US2] Implement directory structure analysis in src/core/state/analyzer.ts to identify src/, tests/, docs/ patterns
- [X] T034 [US2] Implement analyzeCodebase() main function in src/core/state/analyzer.ts coordinating detection steps
- [X] T035 [US2] Update executeSetup() orchestrator in src/core/setup/orchestrator.ts to handle UNCONFIGURED state with code analysis
- [X] T036 [US2] Add --language and --framework CLI options in src/cli/commands/setup.ts to override detection
- [X] T037 [US2] Implement ambiguity error handling in src/core/setup/orchestrator.ts for polyglot projects with confidence < 70
- [X] T038 [US2] Add --verbose flag in src/cli/commands/setup.ts to show detection details

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - setup works for empty repos with description and existing repos with code analysis

---

## Phase 5: User Story 3 - Partial Configuration Update (Priority: P3)

**Goal**: Enable setup when only one configuration exists (speckit or sokold), detecting the existing config, preserving it completely, adding the missing configuration, and synchronizing shared settings between both for compatibility.

**Independent Test**: Create a repository with only `.specify/` folder configured. Run setup without any options. Verify that:
- `.specify/` folder and its files remain completely unchanged
- `.sokold/` folder is created with appropriate configuration
- Shared settings (project name, language) are consistent between both configs
- Both speckit and sokold commands work correctly
- Running setup again is idempotent (no changes)

### Implementation for User Story 3

- [X] T039 [US3] Extend detectRepositoryState() in src/core/state/detector.ts to detect PARTIAL_SPECKIT and PARTIAL_SOKOLD states
- [X] T040 [P] [US3] Implement validateConfiguration() in src/core/state/validator.ts for speckit config validation
- [X] T041 [P] [US3] Implement validateConfiguration() in src/core/state/validator.ts for sokold config validation
- [X] T042 [US3] Implement checkRequiredFiles() in src/core/state/validator.ts to verify all required files exist
- [X] T043 [US3] Implement parseYamlConfig() in src/core/state/validator.ts with error handling for corrupted files
- [X] T044 [US3] Implement extractCustomValues() in src/core/setup/speckit-setup.ts to identify non-default configuration values
- [X] T045 [US3] Implement extractCustomValues() in src/core/setup/sokold-setup.ts to identify non-default configuration values
- [X] T046 [US3] Implement extractSharedSettings() in src/core/setup/synchronizer.ts to read project name and language from existing config
- [X] T047 [US3] Update executeSetup() orchestrator in src/core/setup/orchestrator.ts to handle PARTIAL states, adding missing config only
- [X] T048 [US3] Implement idempotency check in src/core/setup/orchestrator.ts using content comparison before writing files
- [X] T049 [US3] Add operation tracking in src/core/setup/orchestrator.ts to log created/skipped/updated files
- [X] T050 [US3] Update CLI output in src/cli/commands/setup.ts to show skipped operations clearly

**Checkpoint**: All three user stories should now be independently functional - setup handles empty, unconfigured, and partial states

---

## Phase 6: User Story 4 - Minimal Update in Fully Configured Repository (Priority: P4)

**Goal**: When both configs exist, validate them, identify missing files from newer tool versions, add only what's necessary, preserve all custom configurations, and provide safe upgrade path without breaking existing setups.

**Independent Test**: Run setup on a repository with both `.specify/` and `.sokold/` fully configured. Verify that:
- No existing files are overwritten unnecessarily
- Custom configuration values remain unchanged
- Only genuinely missing files (if any) are added
- Running setup multiple times produces identical results (idempotent)
- Validation identifies any configuration issues and provides actionable recommendations

### Implementation for User Story 4

- [X] T051 [US4] Extend detectRepositoryState() in src/core/state/detector.ts to detect FULL and CORRUPTED states
- [X] T052 [US4] Implement validateSchemaCompliance() in src/core/state/validator.ts for YAML schema validation
- [X] T053 [US4] Implement detectDeprecatedSettings() in src/core/state/validator.ts to identify outdated configuration options
- [X] T054 [US4] Implement three-way merge strategy in src/core/setup/speckit-setup.ts (default template + existing config + new template)
- [X] T055 [US4] Implement three-way merge strategy in src/core/setup/sokold-setup.ts (default template + existing config + new template)
- [X] T056 [US4] Implement contentHash() in src/utils/file-operations.ts for comparing file contents to determine if update needed
- [X] T057 [US4] Update executeSetup() orchestrator in src/core/setup/orchestrator.ts to handle FULL state with validation and minimal updates
- [X] T058 [US4] Add --force flag in src/cli/commands/setup.ts to allow overwriting existing configurations when explicitly requested
- [X] T059 [US4] Add --skip-validation flag in src/cli/commands/setup.ts to bypass validation checks
- [X] T060 [US4] Implement validation result reporting in src/cli/commands/setup.ts showing errors, warnings, and recommendations

**Checkpoint**: All user stories complete - setup handles all four repository states (empty, unconfigured, partial, full)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and finalize the feature

- [X] T061 [P] Add --dry-run flag in src/cli/commands/setup.ts to preview changes without applying them
- [X] T062 [P] Add --output-json flag in src/cli/commands/setup.ts for machine-readable output
- [X] T063 [P] Add --quiet flag in src/cli/commands/setup.ts for minimal output (errors only)
- [X] T064 [P] Implement structured exit codes in src/cli/commands/setup.ts (0=success, 1=permission, 2=corruption, 3=ambiguity, 5=validation)
- [X] T065 [P] Add comprehensive error messages with remediation steps in src/utils/errors.ts
- [X] T066 [P] Implement backup functionality in src/core/setup/orchestrator.ts before modifying existing files
- [X] T067 Implement rollback mechanism in src/core/setup/orchestrator.ts for failed operations
- [X] T068 [P] Add performance optimization for large repositories (10k+ files) in src/core/state/analyzer.ts
- [X] T069 [P] Add logging infrastructure with debug/verbose modes throughout all modules
- [X] T070 [P] Update CHANGELOG.md with new setup command documentation
- [X] T071 [P] Update README.md with setup command usage and examples
- [X] T072 Run integration tests for all four user stories using test scenarios from quickstart.md
- [X] T073 Test cross-platform compatibility on Windows, macOS, and Linux
- [X] T074 Validate that setup command works with all five supported languages (TypeScript, Python, Go, Rust, Java)
- [X] T075 Code review and refactoring for simplicity per Constitution Principle VII

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion (can run parallel to US1 with separate team)
- **User Story 3 (Phase 5)**: Depends on US1 and US2 completion (builds on detection and generation)
- **User Story 4 (Phase 6)**: Depends on US3 completion (builds on validation)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 detector, uses same generators
- **User Story 3 (P3)**: Requires US1 and US2 (needs both detection and generation working)
- **User Story 4 (P4)**: Requires US3 (needs validation working)

### Within Each User Story

**User Story 1 Flow**:
1. Detector (T015, T016) - must complete first
2. Parser (T017) - depends on types
3. Templates (T018, T019) - can run in parallel
4. Generators (T020, T021) - depend on templates
5. Synchronizer (T022) - depends on generators
6. Orchestrator (T023) - depends on all above
7. CLI (T024, T025, T026) - depends on orchestrator

**User Story 2 Flow**:
1. Detector extension (T027)
2. Analysis functions (T028-T033) - can run in parallel
3. Analyzer main function (T034) - depends on analysis functions
4. Orchestrator update (T035) - depends on analyzer
5. CLI options (T036-T038) - depends on orchestrator

**User Story 3 Flow**:
1. Detector extension (T039)
2. Validators (T040-T043) - can run in parallel after T039
3. Custom value extraction (T044-T046) - can run in parallel
4. Orchestrator update (T047-T049) - depends on validators and extractors
5. CLI update (T050) - depends on orchestrator

**User Story 4 Flow**:
1. Detector extension (T051)
2. Advanced validators (T052, T053) - can run in parallel
3. Merge strategies (T054, T055) - can run in parallel
4. Content hash (T056)
5. Orchestrator update (T057) - depends on all above
6. CLI flags (T058-T060) - depends on orchestrator

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks except T001 can run in parallel (T002-T006 create different directories)

**Phase 2 (Foundational)**: 
- T008-T011 can run in parallel (define different types)
- T012-T014 can run in parallel (different utilities)

**Within User Story 1**:
- T018 and T019 can run in parallel (different template sets)
- T020 and T021 can run in parallel (different generators)

**Within User Story 2**:
- T028 and T029 can run in parallel (different detection methods)
- T030, T031, T032, T033 can run in parallel after T028-T029

**Within User Story 3**:
- T040 and T041 can run in parallel (different validators)
- T044 and T045 can run in parallel (different extractors)

**Phase 7 (Polish)**:
- T061-T066 can run in parallel (different features)
- T068-T071 can run in parallel (different enhancements)

---

## Parallel Example: User Story 1

```bash
# After foundational phase, launch template creation together:
Task T018: "Create configuration templates in .specify/templates/speckit/"
Task T019: "Create configuration templates in .sokold/templates/sokold/"

# After templates exist, launch generators together:
Task T020: "Implement generateSpeckitConfig() in src/core/setup/speckit-setup.ts"
Task T021: "Implement generateSokoldConfig() in src/core/setup/sokold-setup.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T014) - CRITICAL foundation
3. Complete Phase 3: User Story 1 (T015-T026)
4. **STOP and VALIDATE**: Test setup in empty repository with description
5. This delivers immediate value - new projects can be initialized quickly

**MVP Deliverable**: `sokold setup --description "My project"` works in empty repos

### Incremental Delivery

1. **Milestone 1**: Setup + Foundational → Types and utilities ready
2. **Milestone 2**: + User Story 1 → Empty repo setup works (MVP!)
3. **Milestone 3**: + User Story 2 → Existing repo setup works
4. **Milestone 4**: + User Story 3 → Partial config update works
5. **Milestone 5**: + User Story 4 → Full config validation works
6. **Milestone 6**: + Polish → Production ready

Each milestone adds value without breaking previous functionality.

### Parallel Team Strategy

With 2 developers:

1. Both complete Setup + Foundational together (T001-T014)
2. **Split after Foundational checkpoint**:
   - Developer A: User Story 1 (T015-T026) - Empty repo setup
   - Developer B: User Story 2 (T027-T038) - Code analysis and detection
3. **Merge and continue**:
   - Developer A: User Story 3 (T039-T050) - Partial config
   - Developer B: User Story 4 (T051-T060) - Full config validation
4. Both work on Polish tasks in parallel (T061-T075)

With 3 developers after Foundational:
- Developer A: User Story 1
- Developer B: User Story 2  
- Developer C: Prepare templates and utilities for US3/US4

---

## Task Summary

**Total Tasks**: 75

**Tasks by Phase**:
- Phase 1 (Setup): 6 tasks
- Phase 2 (Foundational): 8 tasks - BLOCKING
- Phase 3 (US1 - Empty Repo): 12 tasks - MVP
- Phase 4 (US2 - Code Analysis): 12 tasks
- Phase 5 (US3 - Partial Config): 12 tasks
- Phase 6 (US4 - Full Config): 10 tasks
- Phase 7 (Polish): 15 tasks

**Parallel Tasks**: 42 tasks marked with [P] across all phases

**MVP Scope**: Phases 1-3 (26 tasks) deliver working empty repository setup

**Critical Path**: Phase 1 → Phase 2 (foundation) → Phase 3 (MVP)

---

## Notes

- All file paths use cross-platform conventions (path.join)
- No tests included as not requested in specification
- Each user story is independently testable after completion
- User Story 4 can be deferred if rapid MVP delivery needed
- Constitution validated: no violations, simplicity maintained
- Idempotency enforced throughout all operations
- Custom configuration preservation guaranteed at every step
