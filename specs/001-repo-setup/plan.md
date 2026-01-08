# Implementation Plan: Adaptive Repository Setup

**Branch**: `001-repo-setup` | **Date**: 2026-01-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-repo-setup/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement adaptive repository setup that detects current configuration state (empty, unconfigured, partially configured, fully configured) and creates/updates only necessary speckit and sokold configurations. System analyzes existing code when present or uses user description for new repositories, preserving custom settings while ensuring complete configuration. Technical approach will leverage TypeScript for cross-platform file system operations, pattern matching for code analysis, and idempotent configuration generation.

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 18.0+  
**Primary Dependencies**: fs-extra (file operations), glob (pattern matching), yaml (config parsing), commander (CLI), execa (git operations)  
**Storage**: File system (repository .specify/ and .sokold/ directories)  
**Testing**: Jest with cross-platform test execution (Windows, macOS, Linux)  
**Target Platform**: Cross-platform CLI (Windows, macOS, Linux via Node.js)
**Project Type**: Single project (CLI tool)  
**Performance Goals**: Repository scan <5 seconds for 10k files, setup completion <3 minutes for new repos  
**Constraints**: Must work offline after initial install, preserve custom configs 100%, idempotent operations  
**Scale/Scope**: Support repos from empty to 100k+ files, handle 10+ language/framework combinations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Cross-Platform Compatibility ✅
- **Status**: PASS
- **Evidence**: Using Node.js with fs-extra and path for platform-agnostic file operations. Testing plan includes Windows, macOS, Linux validation.
- **Risk**: File permission detection may vary by platform - will use try-catch with platform-specific error handling.

### II. CLI-First Design ✅
- **Status**: PASS
- **Evidence**: Implements new `sokold setup` command. Uses commander for CLI, supports JSON output for scripting, follows stdout/stderr conventions.
- **Action**: Ensure exit codes (0=success, non-zero=specific errors) are properly defined.

### III. Test-Driven Development ✅
- **Status**: PASS
- **Evidence**: Jest test suite exists. Will write failing tests for each repository state before implementation.
- **Action**: Phase 2 tasks must include "Write failing test" as first step for each acceptance scenario.

### IV. Distribution & Packaging ✅
- **Status**: PASS
- **Evidence**: Already distributed via npm. Setup command adds to existing CLI, no new distribution concerns.
- **Action**: Ensure backward compatibility with existing sokold installations.

### V. Observability & Debugging ✅
- **Status**: PASS
- **Evidence**: Will implement --verbose flag for setup command, structured logging for each detection/creation step.
- **Action**: Error messages must specify which files failed and provide actionable remediation.

### VI. Versioning & Stability ✅
- **Status**: PASS
- **Evidence**: New feature increments MINOR version (1.0.0 → 1.1.0). No breaking changes to existing commands.
- **Action**: Update CHANGELOG with new setup command documentation.

### VII. Simplicity & Best Practices ✅
- **Status**: PASS
- **Evidence**: Uses existing dependencies (fs-extra, glob), follows Node.js conventions for config location.
- **Risk**: Code analysis for language detection could become complex - keep to simple heuristics (file extensions, manifest files).
- **Action**: Start with minimal detection (5-10 languages), expand based on usage data.

---

## Post-Design Constitution Re-Evaluation

**Date**: 2026-01-08 (After Phase 1 Design)

### Changes Since Initial Check

All principles remain PASS with design validation:

### I. Cross-Platform Compatibility ✅
- **Design Validation**: API contracts specify use of path.join and fs-extra throughout. Quickstart guide emphasizes cross-platform patterns. No platform-specific code paths required.
- **Action**: CI configuration must test on Windows, macOS, Linux.

### II. CLI-First Design ✅
- **Design Validation**: CLI contract (cli-command.md) defines complete interface with JSON output mode, exit codes, stdout/stderr separation. Supports scripting and automation.
- **Action**: Document CLI in README.md with examples.

### III. Test-Driven Development ✅
- **Design Validation**: Quickstart guide specifies TDD workflow - tests first, then implementation. Test structure defined with unit and integration test paths.
- **Action**: Enforce in Phase 2 tasks - every acceptance scenario starts with failing test.

### IV. Distribution & Packaging ✅
- **Design Validation**: No new distribution mechanism needed. Command registers with existing CLI. Backward compatible.
- **Action**: Bump package.json to 1.1.0 when releasing.

### V. Observability & Debugging ✅
- **Design Validation**: CLI contract defines --verbose, --quiet, structured error types with actionable messages. Exit codes map to error categories.
- **Action**: Implement comprehensive logging in orchestrator.

### VI. Versioning & Stability ✅
- **Design Validation**: Feature is additive only (MINOR version bump). No breaking changes. Existing commands unaffected.
- **Action**: Update CHANGELOG.md with migration notes for users.

### VII. Simplicity & Best Practices ✅
- **Design Validation**: Research selected simple heuristics (file counting, manifest parsing) over complex ML approaches. Template-based generation over programmatic. Single project structure maintained.
- **Action**: Review complexity during implementation - reject any non-essential abstractions.

### Final Assessment: ✅ ALL PRINCIPLES PASS

No constitution violations. Design maintains simplicity while meeting all functional requirements. Ready for Phase 2 (Task Planning).

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── scanner/           # Existing - repo analysis
│   ├── config/            # Existing - configuration management
│   ├── state/             # NEW - repository state detection
│   │   ├── detector.ts           # Detects empty/unconfigured/partial/full state
│   │   ├── analyzer.ts           # Code analysis for language/framework detection
│   │   └── validator.ts          # Validates existing configurations
│   └── setup/             # NEW - setup orchestration
│       ├── orchestrator.ts       # Main setup workflow coordinator
│       ├── speckit-setup.ts      # Speckit configuration generator
│       ├── sokold-setup.ts       # Sokold configuration generator
│       └── synchronizer.ts       # Syncs interdependent settings
├── cli/
│   └── commands/
│       └── setup.ts       # NEW - CLI command for `sokold setup`
└── utils/
    └── file-operations.ts # Cross-platform file utilities

tests/
├── integration/
│   └── setup/             # NEW - Integration tests for setup scenarios
│       ├── empty-repo.test.ts      # User Story 1 tests
│       ├── unconfigured-repo.test.ts # User Story 2 tests
│       ├── partial-config.test.ts   # User Story 3 tests
│       └── full-config.test.ts      # User Story 4 tests
└── unit/
    ├── state/             # NEW - Unit tests for state detection
    └── setup/             # NEW - Unit tests for setup components
```

**Structure Decision**: Single project structure fits this CLI tool. New modules added to existing `src/core/` hierarchy maintain consistency with current organization (scanner, config, orchestrator, etc.). Setup functionality logically groups under `core/setup/` with state detection as prerequisite in `core/state/`. Tests mirror source structure following existing Jest conventions.

## Complexity Tracking

No constitution violations detected. This section remains empty as all design decisions align with constitution principles.


## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
