# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-12

### Added

- **Core CLI Commands**
  - Default command: `sokold "description"` - Run full pipeline from description to implementation
  - `sokold --continue` / `-c` - Continue from where you left off
  - `sokold --status` / `-s` - Show project status
  - `sokold --help` / `-h` - Show help
  - `sokold --dry-run` - Preview without executing

- **Configuration Management**
  - `sokold config list` - List all settings with descriptions
  - `sokold config get <key>` - Get a specific setting
  - `sokold config set <key> <value>` - Set a setting
  - `sokold config path` - Show config file path
  - `sokold get <key>` / `sokold set <key> <value>` - Shorthand config commands
  - Configuration stored in `.sokold/config.yaml`

- **SpecKit Integration**
  - Auto-initializes SpecKit via `specify init` when needed
  - Orchestrates SpecKit agents: specify → plan → tasks → implement
  - Verification step with auto-fix retry loop (up to 3 attempts)
  - Execution summary with timing

- **SpecKit Patching for Branch Control**
  - `sokold speckit status` - Check patch status
  - `sokold speckit patch` - Apply patches for branch control
  - `sokold speckit unpatch` - Remove patches, restore originals
  - `workflow.currentBranchOnly` config option to stay on current branch

- **AI CLI Support**
  - Support for GitHub Copilot CLI and Claude CLI
  - `--tool` / `-t` flag to select AI tool
  - `--model` / `-m` flag to specify model
  - Auto-approve mode enabled by default

- **Configuration Options**
  - `tool` - AI CLI tool (copilot/claude)
  - `model` - Model override
  - `autoApprove` - Auto-approve tool calls
  - `verbose` - Verbose output
  - `output.colors` - Enable colored output
  - `output.format` - Output format (human/json)
  - `workflow.currentBranchOnly` - Stay on current branch

### Technical Details

- Node.js >= 18.0.0 required
- TypeScript codebase with ES modules
- Thin orchestrator design - delegates all file operations to AI CLI
- Cross-platform support (Windows, macOS, Linux)

