# CLI Interface Contracts

**Version**: 1.0.0  
**Date**: 2026-01-07  
**Purpose**: Define command-line interface contracts for SpecKit Automation CLI

---

## Global Options

Available for all commands:

```
--version, -v          Display version information
--help, -h             Display help for command
--verbose              Enable verbose output
--debug                Enable debug logging
--quiet, -q            Suppress non-error output
--config <path>        Use custom config file
--no-color             Disable colored output
```

**Exit Codes**:
- `0` - Success
- `1` - General error
- `2` - Configuration error
- `3` - Implementation failed
- `4` - Quality checks failed
- `5` - AI tool not available
- `130` - User interrupted (Ctrl+C)

---

## Command: `init`

Initialize SpecKit structure in current or target repository.

### Synopsis

```bash
speckit-automate init [options] [path]
```

### Arguments

- `path` (optional) - Target directory path. Default: current working directory

### Options

```
--force, -f            Overwrite existing files
--minimal              Create minimal structure (no example files)
--template <name>      Use specific template variant
```

### Behavior

1. Detect if SpecKit already initialized (check for `.specify/` directory)
2. If exists and not `--force`: exit with message "Already initialized"
3. Create directory structure:
   ```
   .specify/
   ├── memory/
   │   └── constitution.md
   ├── templates/
   │   ├── spec-template.md
   │   ├── plan-template.md
   │   ├── tasks-template.md
   │   └── ...
   └── scripts/
       └── (utility scripts)
   specs/
   ```
4. Output summary of created files

### Exit Codes

- `0` - Successfully initialized
- `1` - Target path doesn't exist or not a directory
- `2` - Already initialized and `--force` not specified
- `3` - Permission denied writing files

### Examples

```bash
# Initialize in current directory
speckit-automate init

# Initialize in specific directory
speckit-automate init /path/to/repo

# Force reinitialize
speckit-automate init --force

# Minimal setup
speckit-automate init --minimal
```

### Output Format (Normal)

```
✓ Initializing SpecKit in /path/to/repo
✓ Created .specify/memory/constitution.md
✓ Created .specify/templates/ (5 files)
✓ Created specs/ directory

SpecKit initialized successfully!
Next steps:
  1. Review constitution: .specify/memory/constitution.md
  2. Create your first spec: specs/1-feature-name/spec.md
  3. Run: speckit-automate implement
```

### Output Format (JSON with --json flag)

```json
{
  "success": true,
  "path": "/path/to/repo",
  "filesCreated": [
    ".specify/memory/constitution.md",
    ".specify/templates/spec-template.md",
    "specs/"
  ],
  "alreadyExisted": []
}
```

---

## Command: `implement`

Automatically implement unimplemented features using AI CLI tools.

### Synopsis

```bash
speckit-automate implement [options] [features...]
```

### Arguments

- `features...` (optional) - Specific feature IDs to implement (e.g., "1-auth" "2-dashboard"). Default: all unimplemented

### Options

```
--tool <name>          Use specific AI tool (copilot|claude). Default: from config or auto-detect
--priority <level>     Only implement features of priority level (P1, P2, etc.)
--dry-run              Show what would be implemented without executing
--continue             Continue from last failed implementation
--no-tests             Skip running tests after implementation
--no-lint              Skip linting after implementation
--no-build             Skip build after implementation
--max-retries <n>      Override retry limit (default: 3)
--timeout <seconds>    Override command timeout (default: 300)
```

### Behavior

1. Load configuration from hierarchy (user config → project config → flags)
2. Scan `specs/` directory for feature specifications
3. Load state from `.speckit-automate/state.json`
4. Filter features based on:
   - Implementation status (pending or failed with retries remaining)
   - Priority filter (if specified)
   - Explicit feature list (if provided)
5. Detect and validate AI tool availability
6. For each feature sequentially:
   - Update status to "in-progress"
   - Invoke AI tool with feature context
   - Run quality checks (tests, lint, build)
   - If failures: invoke AI tool to fix (with retry limit)
   - Update status to "completed" or "failed"
   - Save state after each feature
7. Generate execution report

### Exit Codes

- `0` - All features implemented successfully
- `3` - One or more features failed implementation
- `4` - Quality checks failed after max retries
- `5` - AI tool not found or not configured

### Examples

```bash
# Implement all unimplemented features
speckit-automate implement

# Implement specific features
speckit-automate implement 1-auth 3-dashboard

# Use Claude instead of Copilot
speckit-automate implement --tool claude

# Only implement P1 features
speckit-automate implement --priority P1

# Dry run to see what would happen
speckit-automate implement --dry-run

# Continue from last failure
speckit-automate implement --continue

# Skip quality checks (not recommended)
speckit-automate implement --no-tests --no-lint
```

### Output Format (Normal)

```
🔍 Scanning for feature specifications...
   Found 3 features: 1-auth (P1), 2-api (P2), 3-dashboard (P3)
   
🤖 Detecting AI tools...
   ✓ GitHub Copilot CLI found (v1.2.3)
   
📋 Implementation queue: 2 features (filtered by priority: P1, P2)
   
▶ Implementing 1-auth (Priority: P1)
  ├─ Invoking AI tool...
  ├─ ✓ Code generated
  ├─ Running tests...
  ├─ ✓ All tests passed (15/15)
  ├─ Running linter...
  ├─ ✓ No linting errors
  ├─ Running build...
  ├─ ✓ Build successful
  └─ ✓ Feature completed
  
▶ Implementing 2-api (Priority: P2)
  ├─ Invoking AI tool...
  ├─ ✓ Code generated
  ├─ Running tests...
  ├─ ✗ 2 tests failed
  ├─ Attempting auto-fix (retry 1/3)...
  ├─ Running tests...
  ├─ ✓ All tests passed (23/23)
  ├─ Running linter...
  ├─ ✓ No linting errors
  ├─ Running build...
  ├─ ✓ Build successful
  └─ ✓ Feature completed (with fixes)
  
✅ Implementation complete!
   Success: 2 features
   Failed: 0 features
   Skipped: 1 feature (filtered out)
   
   Total checks: 12
   Passed: 10
   Fixed: 2
   
   Session ID: a1b2c3d4
   Duration: 12m 34s
   Log: .speckit-automate/logs/session-a1b2c3d4.json
```

### Output Format (JSON with --json flag)

```json
{
  "sessionId": "a1b2c3d4",
  "startedAt": "2026-01-07T14:00:00Z",
  "completedAt": "2026-01-07T14:12:34Z",
  "duration": 754,
  "features": {
    "implemented": ["1-auth", "2-api"],
    "failed": [],
    "skipped": ["3-dashboard"]
  },
  "summary": {
    "successCount": 2,
    "failureCount": 0,
    "skippedCount": 1,
    "totalChecks": 12,
    "checksPassed": 10,
    "checksFixed": 2
  },
  "exitCode": 0
}
```

---

## Command: `status`

Display implementation status of all features.

### Synopsis

```bash
speckit-automate status [options]
```

### Options

```
--detailed, -d         Show detailed information
--json                 Output in JSON format
--filter <status>      Filter by status (pending|in-progress|completed|failed)
```

### Behavior

1. Scan `specs/` directory for features
2. Load state from `.speckit-automate/state.json`
3. Display status summary for each feature
4. Show overall statistics

### Exit Codes

- `0` - Success

### Examples

```bash
# Show status of all features
speckit-automate status

# Detailed view
speckit-automate status --detailed

# Show only failed features
speckit-automate status --filter failed

# JSON output
speckit-automate status --json
```

### Output Format (Normal)

```
Feature Implementation Status
══════════════════════════════

✓ 1-auth              [Completed]  Priority: P1  Last: 2026-01-07
✗ 2-api               [Failed]     Priority: P2  Retries: 3/3
⋯ 3-dashboard         [Pending]    Priority: P3

Summary:
  Total: 3 features
  Completed: 1
  Failed: 1
  Pending: 1
  In Progress: 0
```

### Output Format (JSON)

```json
{
  "features": [
    {
      "id": "1-auth",
      "name": "Authentication System",
      "status": "completed",
      "priority": "P1",
      "lastAttempt": "2026-01-07T14:00:00Z",
      "retryCount": 0
    },
    {
      "id": "2-api",
      "name": "REST API",
      "status": "failed",
      "priority": "P2",
      "lastAttempt": "2026-01-07T14:05:00Z",
      "retryCount": 3,
      "failedChecks": ["test"]
    }
  ],
  "summary": {
    "total": 3,
    "completed": 1,
    "failed": 1,
    "pending": 1,
    "inProgress": 0
  }
}
```

---

## Command: `config`

Manage configuration settings.

### Synopsis

```bash
speckit-automate config <action> [key] [value]
```

### Actions

- `get <key>` - Get configuration value
- `set <key> <value>` - Set configuration value
- `list` - List all configuration
- `reset` - Reset to defaults
- `path` - Show config file path

### Options

```
--global, -g           Use global user config instead of project config
```

### Behavior

1. Load appropriate config file (global or project)
2. Perform action (get/set/list/reset)
3. Save changes (for set/reset)

### Exit Codes

- `0` - Success
- `2` - Invalid configuration key or value

### Examples

```bash
# Get current AI tool preference
speckit-automate config get aiTool

# Set AI tool to Copilot
speckit-automate config set aiTool copilot

# Set max retries to 5
speckit-automate config set maxRetries 5

# List all configuration
speckit-automate config list

# Show config file location
speckit-automate config path

# Reset to defaults
speckit-automate config reset
```

### Output Format

```bash
$ speckit-automate config get aiTool
copilot

$ speckit-automate config list
aiTool: copilot
maxRetries: 3
timeout: 300
verbosity: normal
checks.tests: true
checks.linting: true
checks.build: true

$ speckit-automate config path
/home/user/.config/speckit-automate/config.yaml
```

---

## Command: `reset`

Reset implementation state for features.

### Synopsis

```bash
speckit-automate reset [features...]
```

### Arguments

- `features...` (optional) - Specific feature IDs to reset. Default: prompt for confirmation

### Options

```
--all, -a              Reset all features without prompting
--force, -f            Skip confirmation prompt
```

### Behavior

1. Load state file
2. Identify features to reset
3. Prompt for confirmation (unless `--force`)
4. Reset status to "pending", clear retry count
5. Save updated state

### Exit Codes

- `0` - Success
- `1` - User cancelled

### Examples

```bash
# Reset specific feature
speckit-automate reset 2-api

# Reset multiple features
speckit-automate reset 2-api 3-dashboard

# Reset all (with prompt)
speckit-automate reset --all

# Force reset without confirmation
speckit-automate reset 2-api --force
```

### Output Format

```
⚠ Reset feature implementation state

Features to reset:
  • 2-api (status: failed, retries: 3)
  • 3-dashboard (status: completed)

This will clear retry counts and allow re-implementation.

Continue? (y/N): y

✓ Reset 2-api
✓ Reset 3-dashboard

2 features reset successfully.
```

---

## Command: `doctor`

Diagnose issues with setup and configuration.

### Synopsis

```bash
speckit-automate doctor [options]
```

### Options

```
--fix                  Attempt to fix detected issues
```

### Behavior

1. Check Node.js version compatibility
2. Check for SpecKit initialization
3. Detect available AI CLI tools
4. Validate configuration files
5. Check for common issues (permissions, paths, etc.)
6. Optionally attempt fixes

### Exit Codes

- `0` - No issues found
- `1` - Issues detected (but non-blocking)
- `2` - Critical issues that prevent operation

### Examples

```bash
# Run diagnostics
speckit-automate doctor

# Run diagnostics and auto-fix
speckit-automate doctor --fix
```

### Output Format

```
🔬 Running diagnostics...

✓ Node.js version: 18.19.0 (compatible)
✓ SpecKit initialized: Yes
⚠ AI Tools:
  ✓ GitHub Copilot CLI: Found (v1.2.3)
  ✗ Claude CLI: Not found
✓ Configuration: Valid
✓ Permissions: OK
✗ Git repository: Not initialized (optional)

Issues Found: 2
  ⚠ Claude CLI not installed (non-blocking)
    Recommendation: Install if you plan to use Claude
  
  ⚠ Not a git repository (optional)
    Recommendation: Initialize git for better tracking

Overall Status: ✓ Ready to use
```

---

## Standard Input/Output Contracts

### STDIN

- Commands accept piped input for batch operations
- Example: `echo "1-auth\n2-api" | speckit-automate implement`

### STDOUT

- Human-readable output by default
- Structured output (JSON) with `--json` flag
- Progress indicators for long-running operations
- Color-coded messages (✓ green, ✗ red, ⚠ yellow) unless `--no-color`

### STDERR

- Error messages
- Warnings
- Debug/verbose logging

### Progress Reporting

Long-running operations show progress:
```
▶ Implementing 1-auth (Priority: P1)
  ├─ Invoking AI tool... [=====     ] 50%
```

Spinners for indeterminate operations:
```
  ├─ Invoking AI tool... ⠋
```

---

## Environment Variables

```bash
SPECKIT_CONFIG_PATH    # Override config file location
SPECKIT_AI_TOOL        # Override AI tool selection (copilot|claude)
SPECKIT_LOG_LEVEL      # Override verbosity (quiet|normal|verbose|debug)
NO_COLOR               # Disable colored output (standard)
DEBUG                  # Enable debug mode (standard)
```

---

## Configuration File Contract

Location hierarchy (first found wins):
1. `.speckit-automate.yaml` (project root)
2. `~/.config/speckit-automate/config.yaml` (Linux/macOS)
3. `%APPDATA%\speckit-automate\config.yaml` (Windows)

Schema (YAML):
```yaml
# AI tool preference
aiTool: copilot  # or 'claude', null for auto-detect

# Retry configuration
maxRetries: 3
timeout: 300  # seconds

# Logging
verbosity: normal  # quiet|normal|verbose|debug

# Quality checks
checks:
  tests: true
  linting: true
  build: true

# Command overrides (optional)
commands:
  test: "npm test"
  lint: "npm run lint"
  build: "npm run build"

# Feature filters
priorities:
  - P1
  - P2
  # - P3  # Commented out = excluded
```

---

## State File Contract

Location: `.speckit-automate/state.json` (per repository)

Schema (JSON):
```json
{
  "version": "1.0.0",
  "lastRun": "2026-01-07T14:00:00Z",
  "features": {
    "1-auth": {
      "status": "completed",
      "implementedSteps": ["cli-parser", "auth-module"],
      "failedChecks": [],
      "retryCount": 0,
      "lastAttempt": "2026-01-07T14:00:00Z"
    },
    "2-api": {
      "status": "failed",
      "implementedSteps": ["api-routes"],
      "failedChecks": ["test"],
      "retryCount": 3,
      "lastAttempt": "2026-01-07T14:05:00Z"
    }
  }
}
```

---

## Error Message Format

Errors follow consistent structure:

```
ERROR: {Brief description}

{Detailed explanation of what went wrong}

{Actionable steps to resolve}

For more help: speckit-automate --help
```

Example:
```
ERROR: AI tool not found

GitHub Copilot CLI could not be located in your PATH.

To resolve:
  1. Install GitHub Copilot CLI: https://docs.github.com/copilot/cli
  2. Or configure Claude CLI: speckit-automate config set aiTool claude
  3. Or check your PATH includes the tool's location

For more help: speckit-automate --help
```

---

## Version Compatibility

- **CLI Version**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Config Version**: Validated on load, migration guide for breaking changes
- **State Version**: Auto-migrated when possible, warns if incompatible
- **Node.js**: Minimum v18.0.0, recommended v18.x LTS or higher

Compatibility check on startup:
```typescript
if (process.version < 'v18.0.0') {
  console.error('ERROR: Node.js >= 18.0.0 required');
  process.exit(2);
}
```
