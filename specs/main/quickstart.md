# Quickstart Guide: SpecKit Automation CLI

**Version**: 1.0.0  
**Last Updated**: 2026-01-07

This guide walks through building and using the SpecKit Automation CLI from scratch.

---

## Prerequisites

- **Node.js**: 18.x LTS or higher ([download](https://nodejs.org/))
- **npm**: 9.x or higher (comes with Node.js)
- **Git**: For version control (optional but recommended)
- **AI CLI Tool**: GitHub Copilot CLI or Claude CLI installed and configured

---

## Installation

### From npm (After Release)

```bash
# Install globally
npm install -g speckit-automate

# Verify installation
speckit-automate --version
```

### From Source (Development)

```bash
# Clone repository
git clone <repository-url>
cd speckit-automate

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link for local development
npm link

# Verify
speckit-automate --version
```

---

## Quick Start (5 Minutes)

### Step 1: Initialize SpecKit in Your Project

Navigate to your project directory (or create a new one):

```bash
mkdir my-project
cd my-project
git init  # Optional
```

Initialize SpecKit:

```bash
speckit-automate init
```

**Expected Output**:
```
✓ Initializing SpecKit in /path/to/my-project
✓ Created .specify/memory/constitution.md
✓ Created .specify/templates/ (5 files)
✓ Created specs/ directory

SpecKit initialized successfully!
```

**What Was Created**:
- `.specify/` directory with templates and constitution
- `specs/` directory for feature specifications
- `.speckit-automate.yaml` config file (optional, created on first config change)

### Step 2: Configure AI Tool (One-Time)

```bash
# Check what's available
speckit-automate doctor

# Set your preferred AI tool
speckit-automate config set aiTool copilot
# or
speckit-automate config set aiTool claude
```

### Step 3: Create Your First Feature Spec

Create a feature directory:

```bash
mkdir -p specs/1-hello-world
```

Create `specs/1-hello-world/spec.md`:

```markdown
# Feature Specification: Hello World CLI

## User Scenarios & Testing

### User Story 1 - Basic Greeting (Priority: P1)

A user runs a CLI command and receives a greeting message.

**Acceptance Scenarios**:

1. **Given** the CLI is installed, **When** user runs `hello`, **Then** output is "Hello, World!"
2. **Given** the CLI is installed, **When** user runs `hello --name Alice`, **Then** output is "Hello, Alice!"

## Requirements

### Functional Requirements

- **FR-001**: System MUST accept optional --name parameter
- **FR-002**: System MUST output greeting to stdout
- **FR-003**: System MUST exit with code 0 on success

## Success Criteria

- **SC-001**: Users can run the hello command and see greeting in under 1 second
```

### Step 4: Implement the Feature Automatically

```bash
speckit-automate implement
```

**What Happens**:
1. Tool scans `specs/` and finds `1-hello-world`
2. Detects it's unimplemented
3. Invokes AI CLI tool (Copilot or Claude) with feature context
4. AI generates code for the feature
5. Runs tests (if project has test setup)
6. Runs linter (if configured)
7. Runs build (if applicable)
8. Reports results

**Expected Output**:
```
🔍 Scanning for feature specifications...
   Found 1 feature: 1-hello-world (P1)
   
🤖 Detecting AI tools...
   ✓ GitHub Copilot CLI found
   
▶ Implementing 1-hello-world (Priority: P1)
  ├─ Invoking AI tool...
  ├─ ✓ Code generated
  ├─ ✓ Feature completed
  
✅ Implementation complete!
   Success: 1 feature
```

### Step 5: Check Implementation Status

```bash
speckit-automate status
```

**Output**:
```
Feature Implementation Status
══════════════════════════════

✓ 1-hello-world      [Completed]  Priority: P1  Last: 2026-01-07
```

---

## Common Workflows

### Workflow 1: New Feature Development

1. **Write Specification**:
   ```bash
   mkdir specs/2-user-auth
   # Edit specs/2-user-auth/spec.md with requirements
   ```

2. **Implement Automatically**:
   ```bash
   speckit-automate implement 2-user-auth
   ```

3. **Review and Test**:
   - Check generated code
   - Run manual tests if needed
   - Commit changes

### Workflow 2: Batch Implementation

Implement multiple features at once:

```bash
# Implement all P1 features
speckit-automate implement --priority P1

# Implement specific features
speckit-automate implement 1-hello-world 2-user-auth 3-dashboard
```

### Workflow 3: Handle Failed Implementation

When a feature fails:

```bash
# Check status
speckit-automate status

# Review logs
cat .speckit-automate/logs/session-<id>.json

# Reset and retry
speckit-automate reset 2-user-auth
speckit-automate implement 2-user-auth

# Or skip quality checks temporarily
speckit-automate implement 2-user-auth --no-tests --no-lint
```

### Workflow 4: Customize Configuration

```bash
# Increase retry limit
speckit-automate config set maxRetries 5

# Set custom test command
speckit-automate config set commands.test "npm run test:unit"

# Disable linting
speckit-automate config set checks.linting false

# View all settings
speckit-automate config list
```

---

## Development Setup

### Project Structure After First Implementation

```
my-project/
├── .specify/                   # SpecKit templates (created by init)
│   ├── memory/
│   │   └── constitution.md
│   └── templates/
│       ├── spec-template.md
│       ├── plan-template.md
│       └── ...
├── specs/                      # Feature specifications
│   └── 1-hello-world/
│       └── spec.md
├── src/                        # Source code (created by AI)
│   ├── cli/
│   │   └── commands/
│   │       └── hello.ts
│   └── main.ts
├── tests/                      # Tests (if TDD enabled)
│   └── hello.test.ts
├── .speckit-automate/          # Automation state
│   ├── state.json
│   └── logs/
│       └── session-xyz.json
├── .speckit-automate.yaml      # Project config (optional)
├── package.json                # Node.js project file
└── tsconfig.json               # TypeScript config (if using TS)
```

### Running Tests Manually

After implementation, you can run tests yourself:

```bash
# If Node.js project
npm test

# If Python project
pytest

# If Rust project
cargo test
```

### Building Manually

```bash
# If Node.js/TypeScript
npm run build

# If Rust
cargo build

# If Go
go build
```

---

## Troubleshooting

### Issue: "AI tool not found"

**Problem**: The automation tool can't find GitHub Copilot CLI or Claude CLI.

**Solution**:
```bash
# Check if AI tool is installed
which gh  # For Copilot
which claude  # For Claude

# Install Copilot CLI
# https://docs.github.com/copilot/cli

# Or configure alternative tool
speckit-automate config set aiTool claude
```

### Issue: "Already initialized"

**Problem**: Running `init` in a directory that already has SpecKit.

**Solution**:
```bash
# Force reinitialize if needed
speckit-automate init --force

# Or skip initialization and proceed to implement
speckit-automate implement
```

### Issue: Implementation Fails Repeatedly

**Problem**: Feature fails to implement after max retries.

**Solution**:
1. Check logs for details:
   ```bash
   cat .speckit-automate/logs/session-<id>.json | jq '.failures'
   ```

2. Review the feature spec for clarity

3. Try manual implementation with AI tool directly

4. Reset and retry with higher retry limit:
   ```bash
   speckit-automate config set maxRetries 5
   speckit-automate reset 2-feature-name
   speckit-automate implement 2-feature-name
   ```

### Issue: Quality Checks Fail

**Problem**: Tests, linting, or build fail after implementation.

**Solution**:
```bash
# See what failed
speckit-automate status --detailed

# Try auto-fix (automatic by default)
speckit-automate implement 2-feature-name

# Or skip checks temporarily to unblock
speckit-automate implement 2-feature-name --no-tests --no-lint

# Then fix manually and re-run checks
npm test
npm run lint
```

### Issue: Wrong AI Tool Used

**Problem**: Tool uses Copilot but you want Claude (or vice versa).

**Solution**:
```bash
# Check current setting
speckit-automate config get aiTool

# Change to preferred tool
speckit-automate config set aiTool claude

# Override for single command
speckit-automate implement --tool claude
```

---

## Advanced Usage

### CI/CD Integration

Use in continuous integration:

```yaml
# .github/workflows/auto-implement.yml
name: Auto-Implement Features

on:
  push:
    paths:
      - 'specs/**'

jobs:
  implement:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install SpecKit Automation
        run: npm install -g speckit-automate
      
      - name: Run Implementation
        run: |
          speckit-automate implement --no-color
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Commit Changes
        run: |
          git config user.name "SpecKit Bot"
          git config user.email "bot@speckit.dev"
          git add .
          git commit -m "Auto-implement features" || true
          git push
```

### Custom Test Commands

Override default test detection:

```yaml
# .speckit-automate.yaml
commands:
  test: "npm run test:integration && npm run test:unit"
  lint: "npm run lint -- --fix"
  build: "npm run build:prod"
```

### Filter by Priority

Implement only critical features:

```bash
# Only P1 features
speckit-automate implement --priority P1

# Configure permanently
speckit-automate config set priorities P1,P2
```

### JSON Output for Scripting

Parse output programmatically:

```bash
# Get JSON output
result=$(speckit-automate implement --json)

# Parse with jq
success_count=$(echo $result | jq '.summary.successCount')
if [ $success_count -eq 0 ]; then
  echo "No features implemented"
  exit 1
fi
```

---

## Best Practices

### 1. Write Clear Specifications

- Use concrete acceptance scenarios (Given/When/Then)
- Define measurable success criteria
- Avoid implementation details in specs
- Prioritize user stories (P1 = critical, P2 = important, P3 = nice-to-have)

### 2. Start Small

- Begin with one simple P1 feature
- Verify automation works end-to-end
- Then scale to more complex features

### 3. Review AI-Generated Code

- Always review what the AI creates
- Run manual tests for critical features
- Refactor if needed (automation can re-run)

### 4. Use Version Control

- Initialize git before using automation
- Commit after each successful feature
- Easy to revert if something goes wrong

### 5. Configure for Your Project

- Set custom test/lint/build commands in config
- Adjust retry limits based on project complexity
- Use priority filtering to control scope

---

## Next Steps

- **Read the Constitution**: Check `.specify/memory/constitution.md` to understand project principles
- **Explore Templates**: Review `.specify/templates/` to see spec/plan/task formats
- **Check CLI Contracts**: See `specs/main/contracts/cli-interface.md` for complete command reference
- **Join Community**: (Add links when available)

---

## Getting Help

```bash
# General help
speckit-automate --help

# Command-specific help
speckit-automate implement --help

# Run diagnostics
speckit-automate doctor

# Check version
speckit-automate --version
```

**Support Resources**:
- Documentation: (Add URL)
- Issues: (Add GitHub issues URL)
- Discussions: (Add discussions URL)

---

## Example: Complete Feature Implementation

Let's walk through a complete example:

**1. Initialize Project**:
```bash
mkdir todo-app
cd todo-app
git init
npm init -y
speckit-automate init
```

**2. Create Feature Spec** (`specs/1-task-management/spec.md`):
```markdown
# Feature Specification: Task Management

## User Scenarios & Testing

### User Story 1 - Create Task (Priority: P1)

User can create a task with a title and optional description.

**Acceptance Scenarios**:

1. **Given** CLI is running, **When** user runs `todo add "Buy milk"`, **Then** task is created with ID and confirmation message
2. **Given** CLI is running, **When** user runs `todo add "Buy milk" --desc "Whole milk"`, **Then** task is created with description

### User Story 2 - List Tasks (Priority: P1)

User can list all tasks.

**Acceptance Scenarios**:

1. **Given** tasks exist, **When** user runs `todo list`, **Then** all tasks are displayed with IDs, titles, status

## Requirements

- **FR-001**: System MUST persist tasks to local file
- **FR-002**: System MUST generate unique IDs for tasks
- **FR-003**: System MUST output success confirmation
- **FR-004**: System MUST handle empty task list gracefully

## Success Criteria

- **SC-001**: Users can add and list tasks within 1 second each
- **SC-002**: Tasks persist across CLI sessions
```

**3. Configure**:
```bash
speckit-automate config set aiTool copilot
speckit-automate config set maxRetries 3
```

**4. Implement**:
```bash
speckit-automate implement
```

**5. Verify**:
```bash
# Check status
speckit-automate status

# Test manually
npm test  # If tests were generated

# Try the CLI
node src/main.js add "Buy milk"
node src/main.js list
```

**6. Commit**:
```bash
git add .
git commit -m "feat: implement task management (auto-generated)"
```

Done! Your feature is implemented, tested, and committed.

---

**Happy Automating! 🚀**
