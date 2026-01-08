# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-08

### Added

- `setup` command for adaptive repository configuration
  - Automatically detects repository state (empty, unconfigured, partial, full)
  - Analyzes existing code to detect language, framework, and project type
  - Generates speckit and sokold configurations from templates
  - Preserves custom configuration values during updates
  - Supports idempotent operations (safe to run multiple times)
- Repository state detection module (`src/core/state/`)
  - Detects programming languages by file extension counting
  - Parses manifest files (package.json, requirements.txt, etc.)
  - Identifies frameworks from dependencies
  - Calculates confidence scores for detection accuracy
- Configuration generators (`src/core/setup/`)
  - Template-based configuration generation
  - Shared settings synchronization between speckit and sokold
  - Custom value preservation and three-way merge
- New CLI options for setup command:
  - `--description` for project description (new repos)
  - `--language` and `--framework` for manual override
  - `--force` to overwrite existing configurations
  - `--dry-run` to preview changes
  - `--output-json` for machine-readable output
  - `--verbose` for detailed debugging output
  - `--quiet` for minimal output
  - `--skip-validation` to bypass config validation
- Structured exit codes for scripting integration
- Configuration validation with schema compliance checking
- Template engine for variable substitution

### Changed

- Extended error handling with setup-specific error classes
- Added content hash comparison for idempotency

## [1.0.0] - 2026-01-07

### Added

- Initial release
- `init` command to initialize SpecKit structure in repositories
- `implement` command for auto-implementing features using AI CLI tools
- `status` command to display feature implementation status
- `config` command for managing configuration settings
- `reset` command to reset implementation state
- `doctor` command for diagnosing setup issues
- Support for GitHub Copilot CLI and Claude CLI
- Quality checks: tests, linting, and builds
- Auto-fix capability with configurable retries
- Cross-platform support (Windows, macOS, Linux)
- Session logging and execution reports
- Hierarchical configuration (project → user → defaults)
