# API Contract: CLI Command

**Module**: `src/cli/commands/setup.ts`  
**Version**: 1.0.0  
**Status**: Design

## Overview

Command-line interface for the `sokold setup` command.

## Command Specification

### sokold setup

Initializes or updates speckit and sokold configurations in a repository.

**Usage**:
```bash
sokold setup [options]
```

**Options**:
- `--description <text>` - Project description (for new repos)
- `--language <lang>` - Override detected language
- `--framework <framework>` - Override detected framework
- `--force` - Overwrite existing configurations
- `--dry-run` - Preview changes without applying
- `--quiet` - Minimal output (errors only)
- `--verbose` - Detailed output with debugging info
- `--skip-validation` - Skip validation of existing configs
- `--output-json` - Output results as JSON

**Exit Codes**:
- `0` - Success
- `1` - Permission error
- `2` - Corruption error
- `3` - Ambiguity error (user input needed)
- `4` - Network error (future use)
- `5` - Validation error

**Output Format**:

Default (human-readable):
```
🔍 Detecting repository state...
✓ Repository state: UNCONFIGURED
🔎 Analyzing codebase...
✓ Detected: TypeScript + React (confidence: 95%)

📋 Setup plan:
  • Create .specify/ directory
  • Create .sokold/ directory
  • Generate 8 configuration files

⚙️  Executing setup...
✓ Created .specify/memory/constitution.md
✓ Created .specify/config.yaml
✓ Created .sokold/config.yaml
...

✅ Setup complete!

Summary:
  Files created: 8
  Directories created: 2
  Duration: 2.3s
```

JSON output (--output-json):
```json
{
  "success": true,
  "repositoryState": {
    "type": "FULL",
    "hasSpeckit": true,
    "hasSokold": true,
    "hasSourceFiles": true,
    "isValid": true
  },
  "summary": {
    "filesCreated": 8,
    "filesUpdated": 0,
    "filesSkipped": 0,
    "directoriesCreated": 2,
    "customValuesPreserved": 0,
    "configsValidated": 2
  },
  "duration": 2347,
  "warnings": []
}
```

Quiet mode (--quiet):
```
# Only shows on error:
Error: Permission denied writing to /path/.specify/
→ Run with sudo or change ownership
```

Verbose mode (--verbose):
```
[DEBUG] Repository path: /Users/dev/project
[DEBUG] Detected state: UNCONFIGURED
[DEBUG] Scanning for source files...
[DEBUG] Found 142 TypeScript files
[DEBUG] Found 38 JavaScript files
[DEBUG] Primary language: TypeScript (78.3%)
[DEBUG] Detected framework: React (confidence: 95%)
...
```

**Examples**:

Setup empty repository with description:
```bash
sokold setup --description "A CLI tool for managing tasks"
```

Setup existing repository:
```bash
cd /path/to/existing-project
sokold setup
```

Preview changes without applying:
```bash
sokold setup --dry-run
```

Force overwrite existing configs:
```bash
sokold setup --force
```

Output as JSON for scripting:
```bash
sokold setup --output-json > setup-result.json
```

Override detected language:
```bash
sokold setup --language python --framework fastapi
```

**Interactive Prompts**:

When ambiguity detected:
```
⚠️  Multiple languages detected with similar prevalence:
   1. TypeScript (45%)
   2. Python (43%)
   3. Go (12%)

Which is the primary language?
> 1

Which framework is used?
   1. React
   2. Vue
   3. Angular
   4. None
> 1
```

**Cross-Platform**: Command works identically on Windows, macOS, and Linux
