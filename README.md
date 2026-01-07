# SoKolD - AI-Powered Code Generation CLI

Transform natural language descriptions into working code with a single command. SoKolD handles everything automatically - from specification generation through implementation.

## Quick Start

```bash
# Install globally
npm install -g sokold

# Create a feature with natural language
sokold "Add a REST API endpoint for user authentication with JWT"

# That's it! SoKolD handles everything:
# - Initializes project structure (if needed)
# - Generates specifications
# - Creates implementation plan
# - Breaks down into tasks
# - Implements the feature
# - Runs quality checks
# - Auto-fixes any issues
```

## How It Works

SoKolD uses an intelligent orchestrator that:

1. **Analyzes** your project state and request
2. **Determines** what actions are needed
3. **Executes** the pipeline automatically
4. **Validates** the implementation with tests, linting, and builds
5. **Fixes** any issues using AI

You never need to understand the underlying SpecKit framework - it's completely abstracted.

## Commands

### Default Command (Primary Usage)

```bash
# Simply describe what you want
sokold "Your feature description here"

# Continue from where you left off
sokold --continue

# Preview what would happen without executing
sokold "Add feature X" --dry-run

# Use a specific AI tool
sokold "Add feature X" --tool copilot
sokold "Add feature X" --tool claude
```

### Status & Information

```bash
# Check implementation status
sokold status
sokold status --detailed
sokold status --json

# Diagnose setup issues
sokold doctor
sokold doctor --fix
```

### Configuration (Advanced)

```bash
# View configuration
sokold config show

# Set preferences
sokold config set aiTool copilot
sokold config set maxRetries 5

# Reset configuration
sokold config reset
```

## Configuration

SoKolD auto-generates configuration on first run. You can customize via `.sokold.yaml`:

```yaml
# .sokold.yaml (auto-generated, optional to customize)
aiTool: copilot          # or 'claude'
maxRetries: 3
timeout: 300             # seconds

checks:
  tests: true
  linting: true
  build: true

commands:
  test: "npm test"
  lint: "npm run lint"
  build: "npm run build"
```

## Requirements

- Node.js >= 18.0.0
- GitHub Copilot CLI **or** Claude CLI (installed and authenticated)

## Global Options

```
--version, -v     Display version
--help, -h        Display help
--verbose         Verbose output
--debug           Debug logging
--quiet, -q       Suppress non-error output
--dry-run         Preview without executing
--continue        Resume from last checkpoint
--tool <name>     Use specific AI tool (copilot|claude)
```

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Configuration error
- `3` - Implementation failed
- `4` - Quality checks failed
- `5` - AI tool not available

## License

MIT
