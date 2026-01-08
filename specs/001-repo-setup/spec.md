# Feature Specification: Adaptive Repository Setup

**Feature Branch**: `001-repo-setup`  
**Created**: 2026-01-08  
**Status**: Draft  
**Input**: User description: "The application should be able to be set up in empty repos, existing repos without configuration and existing repos with configurations. If its a new repo then it should use user description for setting up everything and creating specifications etc, if the repo already exist but it has neither speckit nor sokold set up, it should set these up with regards to the existing code. If only one of these configurations exist then we should set up what is missing and update what needs updating. Where everything already exist we should only overwrite what is necessary and add missing files."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initialize New Empty Repository (Priority: P1)

A developer creates a new repository and wants to set up both speckit and sokold configurations from scratch. They provide a project description, and the system generates all necessary configuration files, directory structures, and initial specifications based on their description.

**Why this priority**: This is the foundational use case - enables developers to start new projects quickly with proper tooling from day one. Delivers immediate value by eliminating manual setup overhead.

**Independent Test**: Can be fully tested by running setup in a new empty repository and verifying that all configuration files, directories, and initial specs are created correctly. Delivers a fully functional speckit+sokold environment.

**Acceptance Scenarios**:

1. **Given** an empty repository with no files, **When** user runs setup with project description, **Then** system creates .specify/ and .sokold/ directories with all necessary configuration files
2. **Given** setup completes successfully, **When** user examines created files, **Then** all configuration files contain project-specific values derived from the provided description
3. **Given** new repository setup is complete, **When** user runs speckit and sokold commands, **Then** both tools function correctly without additional configuration

---

### User Story 2 - Setup in Existing Unconfigured Repository (Priority: P2)

A developer has an existing codebase without speckit or sokold configurations. They run setup, and the system analyzes the existing code structure, dependencies, and patterns to generate appropriate configurations that align with the current project state.

**Why this priority**: Enables adoption of speckit/sokold in existing projects, which represents a larger market than greenfield projects. Critical for tool adoption.

**Independent Test**: Can be tested independently by taking an existing project (e.g., a React app), running setup without description, and verifying configurations match the actual code structure (correct language, framework detection, existing file patterns).

**Acceptance Scenarios**:

1. **Given** a repository with code but no speckit/sokold configs, **When** user runs setup, **Then** system analyzes code structure and creates configurations matching the existing project
2. **Given** existing code uses specific languages and frameworks, **When** setup completes, **Then** generated configurations reflect detected languages, frameworks, and project patterns
3. **Given** existing project has non-standard directory structure, **When** setup runs, **Then** configurations adapt to the actual directory layout rather than imposing defaults

---

### User Story 3 - Partial Configuration Update (Priority: P3)

A repository has speckit configured but lacks sokold setup, or vice versa. User runs setup, and the system detects existing configuration, preserves it, sets up the missing configuration, and updates any shared or interdependent settings for compatibility.

**Why this priority**: Supports incremental adoption and tool migration scenarios. Less critical than P1/P2 but important for flexibility and user experience.

**Independent Test**: Can be tested by creating a repo with only .specify/ folder, running setup, and verifying that .sokold/ is added while .specify/ remains unchanged. Delivers value by adding missing tool without disrupting existing setup.

**Acceptance Scenarios**:

1. **Given** repository has speckit but no sokold configuration, **When** user runs setup, **Then** sokold configuration is created while speckit configuration remains untouched
2. **Given** repository has sokold but no speckit configuration, **When** user runs setup, **Then** speckit configuration is created while sokold configuration remains unchanged
3. **Given** one configuration exists, **When** setup adds the missing configuration, **Then** any interdependent settings are synchronized between both configurations

---

### User Story 4 - Minimal Update in Fully Configured Repository (Priority: P4)

A repository has both speckit and sokold fully configured. User runs setup (perhaps after tool updates), and the system detects existing configurations, validates them, adds only missing files or settings introduced in newer versions, and leaves existing custom configurations intact.

**Why this priority**: Supports maintenance and upgrades without breaking existing setups. Lowest priority as it's mainly for edge cases and updates.

**Independent Test**: Can be tested by running setup on a fully configured repo and verifying no files are overwritten unnecessarily, only missing files are added, and custom configurations remain intact. Delivers value by enabling safe updates.

**Acceptance Scenarios**:

1. **Given** repository has both speckit and sokold configured, **When** user runs setup, **Then** system detects existing configurations and skips unnecessary file creation
2. **Given** existing configurations are complete, **When** setup runs, **Then** only missing files (e.g., new templates from tool updates) are added
3. **Given** user has customized configuration values, **When** setup runs, **Then** custom values are preserved and not overwritten with defaults
4. **Given** setup detects outdated configuration format, **When** validation runs, **Then** user receives recommendations for updates without automatic overwrites

---

### Edge Cases

- What happens when repository has partial/corrupted configuration files (e.g., .specify/ folder exists but is empty)?
- How does system handle when it cannot detect project language/framework from existing code?
- What happens if user provides conflicting description (e.g., "Python project" but repo has only JavaScript files)?
- How does system behave when it lacks write permissions to create configuration directories?
- What happens when existing configurations have custom structures that don't match expected formats?
- How does system handle very large repositories (thousands of files) during code analysis?
- What happens when repository has multiple languages/frameworks (polyglot project)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect whether repository is empty, partially configured (speckit only, sokold only), or fully configured before proceeding with setup
- **FR-002**: System MUST create .specify/ directory structure with all required configuration files when speckit is not configured
- **FR-003**: System MUST create .sokold/ directory structure with all required configuration files when sokold is not configured
- **FR-004**: System MUST analyze existing codebase to detect project language, framework, and directory structure when no user description is provided
- **FR-005**: System MUST use user-provided description to generate project-specific configurations when setting up an empty repository
- **FR-006**: System MUST preserve existing configuration files and custom settings when they are already present
- **FR-007**: System MUST identify and add only missing configuration files when repository is already partially or fully configured
- **FR-008**: System MUST synchronize interdependent settings between speckit and sokold configurations when one is added to existing setup
- **FR-009**: System MUST validate existing configurations and report any detected issues or inconsistencies
- **FR-010**: System MUST generate initial specification files based on user description in new repository setups
- **FR-011**: System MUST handle scenarios where code analysis is inconclusive by prompting user for clarification or using safe defaults
- **FR-012**: System MUST maintain backwards compatibility with existing speckit and sokold configuration formats
- **FR-013**: System MUST provide clear feedback about what was created, updated, or skipped during setup process
- **FR-014**: System MUST fail gracefully with informative error messages when lacking necessary permissions or encountering corrupted files

### Key Entities

- **Repository State**: Represents the current configuration status (empty, unconfigured, partially configured with speckit only, partially configured with sokold only, fully configured)
- **Configuration Set**: Represents either speckit or sokold configuration including all files, directories, and settings
- **Project Metadata**: Information extracted from user description or code analysis including language, framework, project type, and directory structure
- **Setup Operation**: The action being performed (create, update, skip) for each configuration file or directory
- **Validation Result**: Outcome of checking existing configurations for completeness and correctness

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: User can complete setup of new empty repository in under 3 minutes including providing project description
- **SC-002**: System correctly detects repository state (empty, unconfigured, partially configured, fully configured) in 100% of test cases
- **SC-003**: Setup preserves 100% of existing custom configuration values in partially or fully configured repositories
- **SC-004**: Code analysis correctly identifies primary programming language and framework in at least 90% of existing repositories
- **SC-005**: Setup completes without user intervention in at least 80% of cases (only requires clarification in ambiguous scenarios)
- **SC-006**: User satisfaction rating of "setup process was clear and predictable" exceeds 85%
- **SC-007**: Zero instances of setup overwriting valid existing configurations unintentionally
- **SC-008**: Average time to set up existing unconfigured repository is under 5 minutes

## Assumptions

- Repository has git initialized before running setup
- User has read/write permissions to repository directory
- For code analysis, repository contains at least some source files (not just README/config files)
- User provides project description in natural language (English) for new repository setup
- Speckit and sokold tools follow consistent configuration file naming and structure conventions
- System has network access to download any required templates or dependencies during setup
- When multiple frameworks are detected, the most prevalent one (by file count) is used as primary
- Setup command is idempotent - running multiple times produces same result without side effects
- Custom configuration values are those that differ from tool defaults (system can identify defaults)

## Dependencies

- Git must be available in the environment
- File system APIs for directory and file manipulation
- Code analysis capabilities for detecting languages and frameworks (file extensions, package manifests, imports)
- Access to speckit and sokold template files for generating new configurations
- User input mechanism for interactive clarification prompts when needed

## Out of Scope

- Automated migration of existing test suites to speckit format
- Integration with external project management or CI/CD systems during setup
- Automatic refactoring of existing code to match sokold patterns
- Setup of tools beyond speckit and sokold (e.g., linters, formatters, CI config)
- Validation of actual code quality or test coverage in existing repositories
- Backup or versioning of configurations before modification (assumes user has git for rollback)
- Support for monorepos with multiple independent projects in single repository
