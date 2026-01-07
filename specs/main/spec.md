# Feature Specification: SoKolD - AI-Powered Code Generation CLI

**Feature Branch**: `master`  
**Created**: 2026-01-07  
**Status**: Draft  
**Input**: User description: "Build a CLI tool where the user simply describes what they want to build, and the tool handles everything automatically - from specification generation through implementation. SpecKit should be completely abstracted away from the user. The tool should use an intelligent orchestrator to decide what actions to perform, and leverage the preferred AI CLI tool (GitHub Copilot CLI or Claude) for implementation."

## Overview

SoKolD (pronounced "so cold") is a CLI tool that transforms natural language feature descriptions into working code. Users simply describe what they want, and SoKolD handles the entire pipeline: specification generation, planning, task breakdown, and implementation - all without requiring users to understand or interact with the underlying SpecKit framework.

**CLI Name**: `sokold`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Natural Language Feature Creation (Priority: P1)

A developer wants to add a new feature to their project. They run a single command with a natural language description, and the tool automatically generates specifications, creates an implementation plan, breaks it into tasks, and implements the feature - all without any manual intervention.

**Why this priority**: This is the core value proposition - transforming ideas into code with a single command.

**Independent Test**: Run `sokold "Add a REST API endpoint for user authentication"`, verify that the tool creates specs, plans, tasks, and implements the feature automatically.

**Acceptance Scenarios**:

1. **Given** a project directory, **When** user runs `sokold "Add user login with JWT"`, **Then** tool automatically initializes SpecKit (if needed), generates spec, plan, tasks, and implements the feature
2. **Given** user provides a feature description, **When** orchestrator analyzes the request, **Then** it determines the optimal sequence of actions (specify → plan → tasks → implement)
3. **Given** implementation completes, **When** quality checks fail, **Then** tool automatically fixes issues without user intervention
4. **Given** no configuration exists, **When** tool first runs, **Then** it auto-detects available AI tools and creates default configuration silently

---

### User Story 2 - Intelligent Action Orchestration (Priority: P1)

The tool uses an intelligent orchestrator that analyzes the current project state and user request to determine what actions are needed. It doesn't blindly run all steps - it assesses what's already done and what's needed.

**Why this priority**: Smart orchestration prevents redundant work and enables the tool to handle various scenarios (new features, continuing work, fixing issues).

**Independent Test**: Run `sokold` on a project with partial specs - verify orchestrator detects existing work and continues from the appropriate step.

**Acceptance Scenarios**:

1. **Given** a new feature request, **When** orchestrator runs, **Then** it executes: init → specify → plan → tasks → implement
2. **Given** specs exist but no plan, **When** orchestrator runs, **Then** it skips specify and executes: plan → tasks → implement
3. **Given** tasks exist but implementation failed, **When** user runs `sokold --continue`, **Then** orchestrator resumes implementation from last checkpoint
4. **Given** user runs `sokold status`, **When** orchestrator analyzes state, **Then** it reports what's done, what's pending, and recommended next action

---

### User Story 3 - Zero-Configuration First Run (Priority: P1)

When a user runs SoKolD for the first time, the tool automatically sets up everything needed - detecting available AI tools, creating configuration, and initializing the project structure. No manual setup required.

**Why this priority**: Removing friction from first use is critical for adoption.

**Independent Test**: Run `sokold "Create a hello world CLI"` in a new directory with no prior setup, verify everything initializes automatically.

**Acceptance Scenarios**:

1. **Given** no `.sokold.yaml` config exists, **When** tool runs, **Then** it auto-detects AI tools and creates config with sensible defaults
2. **Given** no SpecKit structure exists, **When** tool runs, **Then** it silently initializes SpecKit without user prompts
3. **Given** both Copilot and Claude are installed, **When** no preference is set, **Then** tool uses Copilot as default (or first available)
4. **Given** no AI tools are installed, **When** tool runs, **Then** it provides clear installation instructions and exits gracefully

---

### User Story 4 - Automated Quality Assurance (Priority: P2)

After implementation, the tool automatically runs tests, linting, and builds. When failures occur, it uses the AI CLI to fix issues iteratively until all checks pass or retry limits are reached.

**Why this priority**: Ensures generated code actually works without manual debugging.

**Acceptance Scenarios**:

1. **Given** implementation completes, **When** tests fail, **Then** tool automatically invokes AI to fix and re-runs tests
2. **Given** linting errors exist, **When** detected, **Then** tool auto-fixes using AI CLI
3. **Given** build fails, **When** error is captured, **Then** tool passes context to AI for resolution
4. **Given** max retries exceeded, **When** issues persist, **Then** tool reports failures and suggests manual review

---

### User Story 5 - Advanced Commands for Power Users (Priority: P3)

Power users who want more control can access individual steps of the pipeline or inspect/manage configuration.

**Why this priority**: Provides escape hatches without cluttering the primary experience.

**Acceptance Scenarios**:

1. **Given** user runs `sokold config show`, **Then** current configuration is displayed
2. **Given** user runs `sokold config set aiTool claude`, **Then** preference is saved
3. **Given** user runs `sokold doctor`, **Then** system health and setup issues are reported
4. **Given** user runs `sokold status`, **Then** implementation progress is shown

---

### Edge Cases

- What happens when the user's description is too vague?
  - Orchestrator uses AI to ask clarifying questions or makes reasonable assumptions
  - Generated spec can be reviewed before implementation with `--review` flag

- What happens mid-implementation if the user cancels?
  - State is saved to allow resumption with `sokold --continue`
  - Partial work is preserved, not rolled back

- What if the project has no build/test commands?
  - Tool detects project type and uses sensible defaults
  - Skips checks that don't apply (no tests = no test run)

- What if SpecKit agents fail?
  - Tool retries with exponential backoff
  - Falls back to simpler prompts if complex ones fail
  - Reports which step failed for debugging

## Requirements *(mandatory)*

### Functional Requirements

**Core Pipeline**
- **FR-001**: System MUST accept natural language feature descriptions as the primary input
- **FR-002**: System MUST automatically initialize SpecKit structure on first run without user prompts
- **FR-003**: System MUST auto-generate configuration file with detected AI tools on first run
- **FR-004**: System MUST orchestrate the full pipeline: specify → plan → tasks → implement
- **FR-005**: System MUST invoke SpecKit agents (speckit-specify, speckit-plan, speckit-tasks, speckit-implement) internally
- **FR-006**: System MUST completely abstract SpecKit from the end user

**Intelligent Orchestration**
- **FR-007**: Orchestrator MUST analyze project state to determine required actions
- **FR-008**: Orchestrator MUST skip steps that are already complete
- **FR-009**: Orchestrator MUST support resumption from last checkpoint on failure
- **FR-010**: Orchestrator MUST decide action sequence based on: existing specs, plans, tasks, and implementation status

**AI Tool Integration**
- **FR-011**: System MUST support GitHub Copilot CLI with auto-approve flags
- **FR-012**: System MUST support Claude CLI with auto-approve flags
- **FR-013**: System MUST auto-detect which AI tools are available
- **FR-014**: System MUST use first available tool if no preference is set

**Quality Assurance**
- **FR-015**: System MUST automatically run tests after implementation
- **FR-016**: System MUST automatically run linting after implementation
- **FR-017**: System MUST automatically run build after implementation
- **FR-018**: System MUST auto-fix failures using AI CLI with retry logic
- **FR-019**: System MUST implement configurable retry limits (default 3)

**State & Reporting**
- **FR-020**: System MUST persist state to enable resumption
- **FR-021**: System MUST provide status command showing implementation progress
- **FR-022**: System MUST generate execution reports on completion

### Key Entities

- **Orchestrator**: Central decision-maker that analyzes state and determines action sequence
- **Pipeline Step**: Individual action (specify, plan, tasks, implement, quality-check)
- **Project State**: Current status including existing specs, plans, tasks, implementation progress
- **Configuration**: Auto-generated settings including AI tool preference, retry limits, check settings
- **Execution Session**: Tracks one run including steps executed, results, and checkpoints

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can go from idea to implementation with a single command (`sokold "description"`)
- **SC-002**: First-time setup requires zero manual configuration steps
- **SC-003**: Tool correctly determines required actions 95% of the time based on project state
- **SC-004**: Complete pipeline (specify → implement) completes in under 20 minutes for typical features
- **SC-005**: Auto-fix resolves 70%+ of common quality check failures
- **SC-006**: Resumption after failure works correctly, continuing from last checkpoint
- **SC-007**: Users never need to directly invoke SpecKit commands

## Assumptions

- Users have Node.js >= 18.0.0 installed
- Users have GitHub Copilot CLI or Claude CLI installed and authenticated
- Projects use standard tooling conventions (package.json, Cargo.toml, etc.)
- SpecKit agents are available via the AI CLI tool's custom agents/extensions
