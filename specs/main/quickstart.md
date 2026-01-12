# Quickstart: SOKOLd CLI

**SOKOLd** is a thin CLI orchestrator that runs AI CLI tools to execute SpecKit workflows.

## Prerequisites

- Node.js 18+
- One of: `copilot` CLI (GitHub Copilot) or `claude` CLI (Anthropic Claude)
- `specify` CLI (SpecKit)

## Installation

```bash
# From npm (when published)
npm install -g sokold

# From source
git clone <repo>
cd local-agentic
npm install
npm run build
npm link
```

## Quick Start

### 1. Run Your First Feature

```bash
# Navigate to your project
cd my-project

# Run SOKOLd with a feature description
sokold "Add user authentication with JWT tokens"
```

SOKOLd will:
1. Initialize SpecKit if needed (`specify init`)
2. Create specification → plan → tasks
3. Implement the feature
4. Verify and fix any issues
5. Show execution summary

### 2. Configure Your Preferred AI Tool

```bash
# Use Claude instead of Copilot (default)
sokold set tool claude

# Check current setting
sokold get tool

# List all settings
sokold config list
```

### 3. Continue Interrupted Work

```bash
# If SOKOLd was interrupted, continue from where you left off
sokold --continue
```

### 4. Check Project Status

```bash
# See what SpecKit artifacts exist
sokold --status
```

## Common Commands

| Command | Description |
|---------|-------------|
| `sokold "description"` | Run full workflow for new feature |
| `sokold --continue` | Continue from last completed step |
| `sokold --status` | Show project status |
| `sokold --help` | Show help |
| `sokold set tool <name>` | Set AI tool (copilot/claude) |
| `sokold get tool` | Get current AI tool |
| `sokold config list` | List all configuration |

## Configuration Options

| Key | Values | Default | Description |
|-----|--------|---------|-------------|
| `tool` | copilot, claude | copilot | AI CLI tool to use |
| `model` | string | (tool default) | Model override |
| `autoApprove` | true, false | true | Auto-approve tool calls |
| `verbose` | true, false | false | Verbose output |
| `output.colors` | true, false | true | Terminal colors |
| `output.format` | human, json | human | Output format |
| `workflow.currentBranchOnly` | true, false | false | Stay on current branch |

## How It Works

SOKOLd is a **thin orchestrator** - it doesn't manipulate files directly. Instead, it:

1. **Detects** project state (checks for `.specify/`, `specs/`, etc.)
2. **Spawns** the configured AI CLI (`copilot` or `claude`) with SpecKit agent prompts
3. **Sequences** the workflow: specify → plan → tasks → implement
4. **Verifies** implementation via AI and retries fixes if needed
5. **Reports** what was done

All file operations are performed by the AI CLI, not SOKOLd.

## Branch Control

By default, SpecKit creates feature branches. To stay on your current branch:

```bash
# Enable current-branch-only mode
sokold set workflow.currentBranchOnly true

# Apply patches to SpecKit scripts (required for branch control)
sokold speckit patch

# Now features will use specs/main/ without creating branches
sokold "Add new feature"
```

## Troubleshooting

### "AI CLI not found"

Make sure `copilot` or `claude` CLI is installed and authenticated:

```bash
# For GitHub Copilot CLI
gh extension install github/gh-copilot

# For Claude CLI
pip install anthropic-cli
```

### "SpecKit initialization failed"

Try running SpecKit init manually:

```bash
specify init --here --ai copilot
```

### "Verification keeps failing"

SOKOLd retries fixes up to 3 times. If issues persist:
1. Check the AI output for specific errors
2. Fix issues manually
3. Run `sokold --continue` to resume
