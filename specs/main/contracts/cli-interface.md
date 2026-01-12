# CLI Interface Contract: SOKOLd

**Version**: 1.0.0  
**Last Updated**: January 9, 2026

## Command Syntax

```
sokold [command] [options] [description]
```

## Commands

### Main Workflow

#### `sokold "<description>"`

Run full speckit workflow for a new feature.

**Input**: Feature description (quoted string)  
**Output**: Execution log, summary  
**Exit codes**: 0 (success), 1 (failure)

```bash
sokold "Add user authentication with JWT"
sokold "Create REST API for todos"
```

#### `sokold --continue` / `sokold -c`

Continue from the last completed step.

**Input**: None  
**Output**: Execution log, summary  
**Exit codes**: 0 (success), 1 (failure)

```bash
sokold --continue
sokold -c
```

#### `sokold --status` / `sokold -s`

Display project status (what artifacts exist).

**Input**: None  
**Output**: Status report to stdout  
**Exit codes**: 0

```bash
sokold --status
```

### Configuration

#### `sokold set <key> <value>`

Set a configuration value (shorthand for `sokold config set`).

**Input**: Key name, value  
**Output**: Confirmation message  
**Exit codes**: 0 (success), 1 (invalid key/value)

```bash
sokold set tool claude
sokold set autoApprove false
```

#### `sokold get <key>`

Get a configuration value (shorthand for `sokold config get`).

**Input**: Key name  
**Output**: Current value to stdout  
**Exit codes**: 0

```bash
sokold get tool
# Output: copilot
```

#### `sokold config list`

List all configuration settings.

**Input**: None  
**Output**: All settings to stdout  
**Exit codes**: 0

#### `sokold config path`

Show path to config file.

**Input**: None  
**Output**: Absolute path to stdout  
**Exit codes**: 0

### Help

#### `sokold --help` / `sokold -h`

Display usage information.

**Input**: None  
**Output**: Help text to stdout  
**Exit codes**: 0

#### `sokold` (no arguments)

Display help (same as `--help`).

## Options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--tool <name>` | `-t` | AI tool override (copilot/claude) | config value |
| `--model <name>` | `-m` | Model override | config value |
| `--dry-run` | | Show plan without executing | false |
| `--verbose` | `-v` | Verbose output | false |
| `--help` | `-h` | Show help | - |

## Configuration Keys

| Key | Type | Values | Default |
|-----|------|--------|---------|
| `tool` | string | `copilot`, `claude` | `copilot` |
| `model` | string | any | (tool default) |
| `autoApprove` | boolean | `true`, `false` | `true` |
| `verbose` | boolean | `true`, `false` | `false` |
| `output.colors` | boolean | `true`, `false` | `true` |
| `output.format` | string | `human`, `json` | `human` |
| `workflow.currentBranchOnly` | boolean | `true`, `false` | `false` |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General failure (AI CLI error, verification failed after retries) |

## Output Format

### Human (default)

```
   _____ ____  _  __ ____  _      _____  
  / ___// __ \| |/ // __ \| |    |  __ \ 
  \__ \| |  | |   /| |  | | |    | |  | |
 ___) | |__| | . \| |__| | |____| |__| |
|____/ \____/|_|\_\\____/|______|_____/ 

📊 Project status:
   SpecKit initialized: ✓
   Has specification:   ✓
   Has plan:            ✓
   Has tasks:           ✗

📋 Execution plan:
   → tasks
   → implement
   → verify

⚡ Running: tasks
   Command: copilot -p "/speckit.tasks ..."

✓ tasks completed
✅ Pipeline completed!

Summary:
  Duration: 45s
  Steps completed: tasks, implement, verify
  Fix attempts: 0
```

### JSON (when `output.format=json`)

```json
{
  "status": "success",
  "stepsCompleted": ["tasks", "implement", "verify"],
  "stepsFailed": [],
  "fixAttempts": 0,
  "duration": 45000
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SOKOLD_TOOL` | Override AI tool (copilot/claude) |
| `DEBUG` | Enable debug logging when set |

## File Artifacts

| Path | Created by | Purpose |
|------|------------|---------|
| `.sokold/config.yaml` | sokold | User configuration |
| `.specify/` | specify init | Speckit workspace marker |
| `specs/main/spec.md` | @speckit.specify | Feature specification |
| `specs/main/plan.md` | @speckit.plan | Implementation plan |
| `specs/main/tasks.md` | @speckit.tasks | Task breakdown |
