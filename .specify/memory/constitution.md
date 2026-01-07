<!--
SYNC IMPACT REPORT
==================
Version: 1.0.0 → 1.0.1
Rationale: Clarification of local-only development workflow

Changes:
- Development Workflow: Clarified local-only branching (no remote repository required)

Templates Status:
✅ plan-template.md - Constitution Check section aligns
✅ spec-template.md - User scenarios support CLI testing
✅ tasks-template.md - Task organization supports TDD and platform testing
✅ agent-file-template.md - Generic template, no constitution-specific references
✅ checklist-template.md - Generic template, no constitution-specific references

Follow-up: None - all templates verified for consistency
-->

# Local-Agentic CLI Constitution

## Core Principles

### I. Cross-Platform Compatibility

The tool MUST run on all major operating systems (Windows, macOS, Linux) without conditional
feature limitations. Platform-specific implementations MUST be abstracted behind unified
interfaces. File paths, environment variables, and system calls MUST use cross-platform
abstractions. Testing MUST include validation on all three major platforms before release.

**Rationale**: Users expect CLI tools to work consistently across their development environments.
Platform-specific bugs undermine trust and adoption.

### II. CLI-First Design

All functionality MUST be accessible via command-line interface with clear, predictable
commands. Follow POSIX/GNU conventions: use stdin for input when appropriate, stdout for
primary output, stderr for errors and warnings. Support both human-readable and
machine-parseable output (JSON, structured formats). Exit codes MUST follow standard
conventions (0 = success, non-zero = failure).

**Rationale**: CLI tools are composable building blocks in automation pipelines. Consistent I/O
protocols enable scripting, testing, and integration with other tools.

### III. Test-Driven Development (NON-NEGOTIABLE)

Tests MUST be written before implementation. Test files MUST exist and FAIL before any feature
code is written. Follow Red-Green-Refactor cycle strictly: write failing test → implement
minimal code to pass → refactor if needed. All PRs MUST include tests demonstrating the
feature/fix. No exceptions.

**Rationale**: TDD ensures code is testable by design, documents expected behavior, and
prevents regression. CLI tools with poor test coverage become unmaintainable.

### IV. Distribution & Packaging

The tool MUST be installable via native package managers (npm, pip, cargo, etc.) appropriate
to the implementation language. Release artifacts MUST include standalone binaries for each
platform when feasible. Installation MUST be simple (one command), and upgrades MUST preserve
user configuration. Document installation methods clearly in README.

**Rationale**: Distribution friction kills adoption. Users expect modern CLI tools to install
easily and update gracefully.

### V. Observability & Debugging

Implement structured logging with configurable verbosity levels (--quiet, --verbose, --debug).
All errors MUST include actionable messages indicating what failed and how to resolve it.
Support environment variable configuration (e.g., DEBUG=*) for troubleshooting. Never fail
silently.

**Rationale**: CLI tools run in diverse environments. Good diagnostics reduce support burden
and enable users to self-serve when issues arise.

### VI. Versioning & Stability

Follow semantic versioning (MAJOR.MINOR.PATCH) strictly. Breaking changes MUST increment
MAJOR version and include migration guide. New features increment MINOR version. Bug fixes
increment PATCH version. Maintain a CHANGELOG documenting all user-facing changes. Deprecate
features with warnings before removal (minimum one MINOR version).

**Rationale**: Users depend on CLI tools in production workflows. Breaking changes without
warning damage trust and disrupt workflows.

### VII. Simplicity & Best Practices

Start with the simplest implementation that solves the problem. Follow YAGNI (You Aren't
Gonna Need It): avoid premature abstraction. Prefer standard library functions over
third-party dependencies when reasonable. Configuration MUST use conventional files
(.specifyrc, config files in XDG directories, etc.). Avoid reinventing conventions that
already exist in the ecosystem.

**Rationale**: Simple code is maintainable code. CLI tools should be lightweight and
predictable, leveraging ecosystem standards rather than inventing new patterns.

## Platform Standards

**Language Selection**: Choose languages with strong cross-platform support (Node.js, Python,
Rust, Go). Avoid platform-specific languages unless building platform-specific tools.

**Path Handling**: MUST use platform-agnostic path libraries (path.join, pathlib, std::path).
NEVER hard-code path separators or assume Unix-style paths.

**Binary Distribution**: Provide binaries for x64 and arm64 architectures on Windows, macOS,
and Linux. Use CI/CD to build and test on actual target platforms, not emulation.

**Configuration Storage**: Follow platform conventions (Windows: %APPDATA%, macOS:
~/Library/Application Support, Linux: ~/.config or XDG_CONFIG_HOME).

## Development Workflow

**Branching**: Feature branches MUST be named `###-feature-name` where ### is numeric. This
project uses local-only development; no remote repository or PR workflow is required.

**Code Review**: All changes MUST pass automated tests on all platforms before integration.
New functionality MUST include test coverage. Complexity that violates simplicity principle
MUST be justified in commit messages or documentation.

**Release Process**: Tag releases with vMAJOR.MINOR.PATCH. Build artifacts for all platforms
in CI. Update CHANGELOG before release. Publish to package registries (npm, PyPI, crates.io)
atomically.

**Documentation**: README MUST include installation, basic usage, and contribution guidelines.
Changes affecting user-facing behavior MUST update docs in the same PR.

## Governance

This constitution supersedes all other development practices and style guides. Any deviation
MUST be explicitly justified and documented. Amendments to this constitution require
documented rationale, impact analysis, and migration plan if applicable.

**Compliance Review**: All PRs MUST verify alignment with constitution principles. Plan
documents MUST include "Constitution Check" gate validating adherence. Complexity
violations MUST be tracked in plan complexity table with justification.

**Amendment Process**: Propose amendments via PR updating this document. Include version bump
rationale (MAJOR/MINOR/PATCH) and impact on dependent templates. Amendments become effective
upon merge.

**Living Document**: This constitution evolves with the project. Template validation ensures
consistency between constitution and workflow artifacts (plan, spec, tasks templates).

**Version**: 1.0.1 | **Ratified**: 2026-01-07 | **Last Amended**: 2026-01-07
