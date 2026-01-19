```
   _____ ____  _  __ ____  _      _____  
  / ___// __ \| |/ // __ \| |    |  __ \ 
  \__ \| |  | |   /| |  | | |    | |  | |
 ___) | |__| | . \| |__| | |____| |__| |
|____/ \____/|_|\_\\____/|______|_____/ 
```

# SOKOLd - AI-Powered Code Generation CLI

Transform natural language descriptions into working code with a single command. SOKOLd uses local Ollama models combined with [SpecKit](https://github.com/github/spec-kit) agents to handle the complete workflow—from specification through implementation.

## Quick Start

```bash
# Install globally
npm install -g sokold

# Initialize SOKOLd in your project (one-time setup)
sokold init

# Create a feature with natural language
sokold "Add a REST API endpoint for user authentication with JWT"

# That's it! SOKOLd handles everything:
# ✓ Generates specifications (specify → plan → tasks)
# ✓ Implements the feature
# ✓ Runs verification checks
# ✓ Auto-fixes issues (up to 3 attempts)
# ✓ Tracks history for future reference
```

## How It Works

SOKOLd uses Ollama for local AI inference and orchestrates SpecKit agents in a pipeline:

1. **Specify** → Generate a detailed specification from your description
2. **Plan** → Create an implementation plan
3. **Tasks** → Break down the plan into actionable tasks
4. **Implement** → Execute the tasks using AI
5. **Verify** → Run builds, tests, and linting
6. **Fix** → Auto-fix any issues (retry loop)

You describe what you want, and SOKOLd handles the rest.

## Commands

### Initialize

```bash
# First-time setup - initializes SpecKit in your project
sokold init

# With specific tool
sokold init --tool claude
```

This is a **setup-only** command that prepares your project for SOKOLd without running any workflow steps. It creates the `.specify/` folder structure needed by SpecKit.

### Primary Usage

```bash
# Describe what you want to build
sokold "Your feature description here"

# Continue from where you left off
sokold --continue
sokold -c

# Preview what would happen without executing
sokold "Add feature X" --dry-run

# Use a specific AI tool
sokold "Add feature X" --tool copilot
sokold "Add feature X" --tool claude

# Use a specific model
sokold "Add feature X" --model gpt-4
```

### Check Status

```bash
sokold status
sokold --status
sokold -s
```

Shows:
- Whether SpecKit is initialized
- What specification files exist (`spec.md`, `plan.md`, `tasks.md`)
- Pipeline state (what steps have been completed, what's next)
- What the next step would be

### History

SOKOLd tracks all pipeline runs so you can review past work:

```bash
# View recent run history
sokold history

# View details of a specific run (0 = most recent)
sokold history 0

# Add a note to the most recent run
sokold history note "Fixed auth bug, needs review"
```

### Configuration

SOKOLd stores configuration in `.sokold/config.yaml`. Manage it via CLI:

```bash
# List all settings with descriptions
sokold config list

# Get a specific setting
sokold config get tool
sokold get tool              # shorthand

# Set a setting
sokold config set tool claude
sokold set tool claude       # shorthand

# Show config file path
sokold config path
```

#### Config Keys

| Key | Description | Values |
|-----|-------------|--------|
| `tool` | AI CLI tool to use | `copilot`, `claude` |
| `model` | Model to use (code generation etc) | e.g., `gpt-4`, `claude-3-opus` |
| `autoApprove` | Auto-approve all tool calls | `true`, `false` |
| `verbose` | Show verbose output | `true`, `false` |
| `output.colors` | Enable colored output | `true`, `false` |
| `output.format` | Output format | `human`, `json` |
| `workflow.currentBranchOnly` | Stay on current branch (no feature branches) | `true`, `false` |
| `workflow.autoConstitution` | Auto-create constitution if missing (experimental) | `true`, `false` |

### SpecKit Patching

SOKOLd can patch SpecKit scripts to support `workflow.currentBranchOnly` mode, which prevents automatic branch creation:

```bash
# Check current patch status
sokold speckit status

# Apply patches for branch control
sokold speckit patch

# Remove patches (restore originals)
sokold speckit unpatch
```

When `workflow.currentBranchOnly` is enabled:
- Specs go in `specs/main/` instead of `specs/###-feature-name/`
- No new git branches are created
- Works entirely on your current branch

## Configuration File

Configuration is stored in `.sokold/config.yaml`:

```yaml
# .sokold/config.yaml

# AI Tool Settings
tool: copilot           # Options: copilot, claude
# model: gpt-4          # Optional: specific model

# Auto-approve all tool calls without prompting
autoApprove: true

# Workflow Settings
workflow:
  # When true: work on current branch, specs in specs/main/
  # When false: create feature branches and numbered spec folders
  currentBranchOnly: false
  # (Experimental) Auto-create constitution if missing
  autoConstitution: false

# Output Settings
output:
  colors: true
  format: human         # Options: human, json

# Verbose output
verbose: false
```

## CLI Options

```
-t, --tool <name>    Use specific AI tool: copilot (default) or claude
-m, --model <name>   Use specific model (e.g., gpt-4, claude-3-opus)
-c, --continue       Continue from where you left off
-s, --status         Show project status
    --dry-run        Show what would be done without executing
-v, --verbose        Show detailed output
-h, --help           Show help
```

## Requirements

- **Node.js** >= 18.0.0
- **Ollama** installed
  - Default model: `rnj-1`
- **SpecKit** installed (`specify` CLI available)
- **AI CLI** (one of):
  - [GitHub Copilot CLI](https://githubnext.com/projects/copilot-cli/) (installed and authenticated)
  - [Claude CLI](https://claude.ai/cli) (installed and authenticated)

## Project Structure

When you run SOKOLd, it creates/uses:

```
your-project/
├── .sokold/
│   ├── config.yaml       # SOKOLd configuration
│   ├── state.yaml        # Current pipeline state
│   └── history.yaml      # Run history
├── .specify/
│   ├── memory/
│   │   └── constitution.md  # Project constitution
│   └── scripts/          # SpecKit scripts (auto-generated)
└── specs/
    └── main/             # Feature specs (when currentBranchOnly=true)
        ├── spec.md       # Feature specification
        ├── plan.md       # Implementation plan
        └── tasks.md      # Task breakdown
```

## Examples

```bash
# Build a new feature
sokold "Add user authentication with JWT tokens and password hashing"

# Add an API endpoint
sokold "Create a REST API for managing todos with CRUD operations"

# Continue interrupted work
sokold --continue

# Use Claude instead of Copilot
sokold "Add caching layer with Redis" --tool claude

# Work on current branch only (no branch creation)
sokold set workflow.currentBranchOnly true
sokold "Add logging middleware"

# Check what's done and what's next
sokold status

# Review past runs
sokold history
sokold history 0    # Details of most recent run
```

## Pipeline Output

When running, SOKOLd shows:

```
   _____ ____  _  __ ____  _      _____  
  / ___// __ \| |/ // __ \| |    |  __ \ 
  \__ \| |  | |   /| |  | | |    | |  | |
 ___) | |__| | . \| |__| | |____| |__| |
|____/ \____/|_|\_\____/|______|_____/ 

� Checking Ollama setup...
✅ Ollama ready with model "rnj-1"

📊 Project status:
   SpecKit initialized: ✓
   Has specification:   ✗
   Has plan:            ✗
   Has tasks:           ✗

📋 Execution plan:
   → specify
   → plan
   → tasks
   → implement
   → verify

⚡ Running: specify
   Deciding next action using model: rnj-1
   
✓ specify completed

... (continues through pipeline)

✅ Pipeline completed!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 EXECUTION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Completed steps:
   • specify
   • plan
   • tasks
   • implement
   • verify

⏱️  Duration: 245s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Architecture

SOKOLd is built with the following components:

```
src/
├── cli.ts         # Entry point, argument parsing, help display
├── pipeline.ts    # Main orchestration - runs AI via Ollama
├── detect.ts      # Project state detection (.specify, specs/, etc.)
├── config.ts      # YAML configuration management
├── state.ts       # Pipeline state tracking for --continue
├── history.ts     # Run history tracking
├── ollama.ts      # Ollama integration for local AI inference
├── speckit-patch.ts # SpecKit script patching for branch control
└── functions/     # Tool definitions for Ollama function calling
    ├── speckit.ts # SpecKit agent functions (specify, plan, tasks, implement)
    ├── misc.ts    # General functions (ask_user, run_command, etc.)
    ├── helpers.ts # Helper utilities
    └── types.ts   # Type definitions
```

SOKOLd uses **Ollama** for local AI inference, which provides:
- Fast, local execution (no cloud API calls for orchestration)
- Function calling to invoke SpecKit agents
- Flexible model selection

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error / Command failed |

## License

MIT
