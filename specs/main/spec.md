# Feature Specification: SOKOLd CLI Orchestrator

**Feature Branch**: `main`  
**Created**: January 9, 2026  
**Status**: Implemented  
**Input**: User description: "SOKOLd is a thin CLI orchestrator that runs AI CLI tools (copilot/claude) to execute speckit workflows. CLI command is 'sokold' (lowercase). Architecture: 4 files only - cli.ts (arg parsing, help), pipeline.ts (runs AI CLI via spawn to call speckit agents), detect.ts (checks if .specify exists), config.ts (yaml config). The tool delegates ALL work to the AI CLI - no internal file manipulation. Flow: detect project state -> if no speckit run 'specify init' -> run speckit agents (specify, plan, tasks, implement) -> verify via AI -> fix loop -> summary. Keep it simple per Constitution Principle VII."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run Full Workflow from Scratch (Priority: P1)

A developer has a new project idea. They want to go from a plain description to working code without manually running multiple commands. They type `sokold "Build a todo app with REST API"` and the tool handles everything: initializes speckit if needed, creates specifications, plans, tasks, implements, verifies, and reports results.

**Why this priority**: This is the core value proposition - one command to orchestrate the entire speckit workflow.

**Independent Test**: Can be tested by running `sokold "any feature description"` in an empty directory and verifying the complete workflow executes end-to-end.

**Acceptance Scenarios**:

1. **Given** a directory without `.specify/` folder, **When** user runs `sokold "feature description"`, **Then** speckit is initialized first via `specify init`, then the full workflow runs
2. **Given** a directory with `.specify/` already present, **When** user runs `sokold "feature description"`, **Then** workflow runs without re-initializing speckit
3. **Given** any project state, **When** workflow completes, **Then** user sees a summary of what was done (steps completed, files created/modified)

---

### User Story 2 - Configure AI Tool (Priority: P2)

A developer prefers using Claude over Copilot (or vice versa). They want to set their preferred AI tool once and have sokold use it for all future runs.

**Why this priority**: Tool flexibility is important but secondary to core workflow functionality.

**Independent Test**: Can be tested by running `sokold set tool claude`, then `sokold get tool` to verify, then running workflow to confirm correct tool is used.

**Acceptance Scenarios**:

1. **Given** default configuration, **When** user runs `sokold set tool claude`, **Then** configuration is saved to `.sokold/config.yaml`
2. **Given** configuration exists, **When** user runs `sokold get tool`, **Then** current tool setting is displayed
3. **Given** tool is set to `claude`, **When** user runs workflow, **Then** `claude` CLI is invoked instead of `copilot`

---

### User Story 3 - Get Help (Priority: P3)

A new user wants to understand what commands are available and how to use sokold.

**Why this priority**: Discoverability is helpful but users can also read documentation.

**Independent Test**: Can be tested by running `sokold --help` or `sokold` with no arguments and verifying helpful output appears.

**Acceptance Scenarios**:

1. **Given** any state, **When** user runs `sokold --help`, **Then** help text displays available commands and usage
2. **Given** any state, **When** user runs `sokold` with no arguments, **Then** help text is displayed
3. **Given** any state, **When** user runs `sokold set --help`, **Then** config subcommand help is displayed

---

### Edge Cases

- What happens when AI CLI (copilot/claude) is not installed? → Display clear error message with installation instructions
- What happens when speckit agents fail? → Report failure, show AI output, suggest retry
- What happens when verification finds issues? → Automatically retry fix up to 3 times, then report remaining issues
- What happens when user provides empty description? → Display help/usage instead of running workflow

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a CLI command `sokold` as the entry point
- **FR-002**: System MUST accept a feature description as a positional argument (e.g., `sokold "build a todo app"`)
- **FR-003**: System MUST detect if `.specify/` folder exists in current directory
- **FR-004**: System MUST run `specify init --here --ai <tool> --force` when `.specify/` is absent
- **FR-005**: System MUST spawn the configured AI CLI tool (copilot or claude) with `-p` flag to invoke speckit agents
- **FR-006**: System MUST run speckit agents in order: @speckit.specify → @speckit.plan → @speckit.tasks → @speckit.implement
- **FR-007**: System MUST run verification after implementation via AI CLI
- **FR-008**: System MUST retry fixes up to 3 times when verification finds issues
- **FR-009**: System MUST display an execution summary showing steps completed and outcomes
- **FR-010**: System MUST support `sokold set <key> <value>` to configure settings
- **FR-011**: System MUST support `sokold get <key>` to display current settings
- **FR-012**: System MUST store configuration in `.sokold/config.yaml`
- **FR-013**: System MUST display help when run with `--help` flag or no arguments
- **FR-014**: System MUST delegate ALL file manipulation to the AI CLI - no direct file operations

### Key Entities

- **Configuration**: User preferences stored in YAML (tool selection: copilot/claude)
- **ProjectStatus**: Detection results (hasSpeckit, hasSpec, hasPlan, hasTasks)
- **ExecutionSummary**: Record of workflow execution (steps completed, success/failure, duration)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can go from feature description to implemented code with a single command
- **SC-002**: Complete workflow executes in the time it takes the AI to process (no added overhead beyond spawn)
- **SC-003**: 100% of file operations are performed by AI CLI, not by sokold directly
- **SC-004**: Configuration changes persist across sessions
- **SC-005**: Users understand available commands within 30 seconds of reading help output

## Assumptions

- User has Node.js 18+ installed
- User has either `copilot` CLI or `claude` CLI installed and authenticated
- User has `specify` CLI available (installed globally or via npx)
- Project follows speckit conventions (specs in `specs/` directory)

## Constraints

- **Architecture constraint**: Maximum 4 source files (cli.ts, pipeline.ts, detect.ts, config.ts)
- **Simplicity constraint**: Per Constitution Principle VII - favor simplicity over elaborate abstractions
- **Delegation constraint**: SOKOLd is a thin orchestrator; all intelligence lives in AI CLI tools
