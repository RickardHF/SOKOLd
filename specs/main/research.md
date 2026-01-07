# Research: SpecKit Automation CLI

**Date**: 2026-01-07  
**Purpose**: Resolve NEEDS CLARIFICATION items from Technical Context and establish technical foundation

## Research Questions

1. **Language Selection**: Which language best supports cross-platform CLI tools with minimal dependencies?
2. **Testing Framework**: What cross-platform test framework works well with chosen language?
3. **Core Dependencies**: What minimal trusted libraries are needed for file ops, process spawning, CLI parsing?
4. **Process Orchestration**: How to spawn and monitor AI CLI tools (Copilot/Claude) with auto-approval?
5. **Cross-Platform Path Handling**: Best practices for platform-agnostic file paths
6. **Configuration Management**: Standard config file formats and locations per platform

---

## Decision 1: Language Selection

### Candidates Evaluated

**Node.js (JavaScript/TypeScript)**
- ✅ Excellent cross-platform support (Windows, macOS, Linux)
- ✅ Rich ecosystem for CLI tools (commander, yargs, inquirer)
- ✅ Native JSON handling, great for parsing test/lint output
- ✅ Strong packaging: npm, standalone binaries via pkg/nexe
- ✅ Excellent process spawning (child_process, execa)
- ✅ Large trusted library ecosystem
- ⚠️ Runtime dependency (Node.js must be installed)
- ⚠️ Memory footprint slightly higher than compiled languages

**Python 3.11+**
- ✅ Excellent cross-platform support
- ✅ Standard library has most needed functionality
- ✅ Good CLI frameworks (argparse, click, typer)
- ✅ Easy packaging: pip, pyinstaller for binaries
- ✅ subprocess module for process management
- ⚠️ Runtime dependency (Python must be installed)
- ⚠️ Packaging standalone binaries can be complex

**Rust**
- ✅ True cross-platform native binaries
- ✅ No runtime dependency, smallest footprint
- ✅ Strong CLI ecosystem (clap, structopt)
- ✅ Excellent packaging: cargo, single binary output
- ✅ Superior performance and memory safety
- ⚠️ Steeper learning curve
- ⚠️ Longer compile times
- ⚠️ Smaller ecosystem compared to Node/Python

**Go**
- ✅ True cross-platform native binaries
- ✅ No runtime dependency, small footprint
- ✅ Simple concurrency for parallel operations
- ✅ Good standard library for file/process operations
- ✅ Single binary distribution
- ⚠️ Less rich CLI library ecosystem vs Node/Python
- ⚠️ JSON/YAML parsing requires external libraries

### Decision: **Node.js (TypeScript)**

**Rationale**:
- **Availability**: Node.js is already installed in most development environments (Constitution Principle I)
- **Minimal Dependencies**: Can leverage standard libraries extensively (Principle VII)
- **Cross-Platform Excellence**: Node.js abstracts platform differences exceptionally well (Principle I)
- **Rapid Development**: Rich ecosystem speeds TDD cycles (Principle III)
- **Process Orchestration**: Best-in-class for spawning and managing CLI processes (core requirement)
- **Packaging**: Multiple options for distribution (npm + binary compilation) (Principle IV)
- **JSON Native**: Essential for parsing AI CLI output, test results, lint reports
- **TypeScript**: Type safety improves maintainability without runtime overhead

**Alternatives Considered**:
- **Rust**: Rejected due to learning curve vs. timeline, though superior for pure performance
- **Python**: Close second, but Node.js has better process management and JSON handling
- **Go**: Good fit, but Node.js ecosystem more mature for CLI tooling

---

## Decision 2: Testing Framework

### Selected: **Jest** (for TypeScript/Node.js)

**Rationale**:
- Cross-platform by default
- TypeScript support out of the box
- Excellent mocking for subprocess calls
- Parallel test execution
- Snapshot testing useful for CLI output validation
- Wide adoption, trusted ecosystem

**Alternatives Considered**:
- **Mocha + Chai**: More modular but requires more setup
- **Vitest**: Modern but Jest is more battle-tested
- **AVA**: Good but Jest has better TypeScript integration

---

## Decision 3: Core Dependencies

### Minimal Trusted Libraries

| Library | Purpose | Why Trusted | Alternatives Rejected |
|---------|---------|-------------|----------------------|
| **commander** | CLI parsing, subcommands | 50k+ stars, standard in Node ecosystem | yargs (heavier), minimist (too minimal) |
| **execa** | Process spawning with better API than child_process | sindresorhus (trusted maintainer), 6k+ stars | child_process (lower-level), shelljs (too heavy) |
| **fs-extra** | Cross-platform file operations | Extends native fs, 9k+ stars | Native fs (missing utilities), fs-jetpack (less adoption) |
| **chalk** | Terminal colors (optional, for UX) | 20k+ stars, zero deps | ansi-colors (similar, chalk more popular) |
| **yaml** | Config file parsing | Standard YAML library, 7k+ stars | js-yaml (older API) |
| **glob** | File pattern matching | 8k+ stars, widely used | fast-glob (good but glob is standard) |

**Total Dependencies**: 5-6 core libraries (excluding TypeScript dev dependencies)

**Justification**:
- All libraries have >5k GitHub stars, indicating trust and maintenance
- Each solves a specific cross-platform challenge (Constitution I)
- Most have zero or minimal transitive dependencies (Constitution VII)
- Alternatives exist if any library becomes unmaintained

---

## Decision 4: Process Orchestration Strategy

### AI CLI Tool Invocation

**Approach**: Adapter pattern with tool-specific implementations

**GitHub Copilot CLI**:
```typescript
// Example invocation with auto-approval
execa('gh', ['copilot', 'suggest', '--target', 'shell', ...args], {
  stdio: 'pipe', // Capture output
  env: { ...process.env, GITHUB_COPILOT_AUTO_APPROVE: 'true' }
});
```

**Claude CLI** (assuming similar interface):
```typescript
execa('claude', ['code', '--auto-approve', ...args], {
  stdio: 'pipe'
});
```

**Key Considerations**:
- Use `execa` for cross-platform process spawning
- Capture stdout/stderr separately for parsing
- Set timeouts to prevent hanging (configurable, default 5 minutes)
- Parse JSON output where available, fallback to text parsing
- Retry logic with exponential backoff (FR-015: max 3 attempts)

### Quality Check Execution

**Test Running**:
- Detect test framework from project files (package.json, pytest.ini, Cargo.toml)
- Map to standard commands: `npm test`, `pytest`, `cargo test`, etc.
- Parse exit codes and output (JUnit XML, TAP, JSON reporters)

**Linting**:
- Detect linters: `.eslintrc`, `pylint.cfg`, `clippy.toml`
- Run with JSON output flags where supported
- Parse structured output for actionable errors

**Building**:
- Detect build tools: `package.json` scripts, `Makefile`, `Cargo.toml`
- Run build commands, capture stderr for errors
- Parse compiler/bundler output for specific failures

---

## Decision 5: Cross-Platform Path Handling

### Best Practices

**Use Node.js `path` module exclusively**:
```typescript
import * as path from 'path';

// ✅ Correct: platform-agnostic
const specPath = path.join(repoRoot, 'specs', featureName, 'spec.md');

// ❌ Wrong: hardcoded separator
const specPath = `${repoRoot}/specs/${featureName}/spec.md`;
```

**Path Normalization**:
- Always use `path.normalize()` on external inputs
- Use `path.resolve()` for absolute paths
- Use `path.relative()` for displaying user-friendly paths

**Configuration Storage**:
- **Windows**: `%APPDATA%\speckit-automate\` → `C:\Users\{user}\AppData\Roaming\speckit-automate\`
- **macOS**: `~/Library/Application Support/speckit-automate/`
- **Linux**: `~/.config/speckit-automate/` (XDG_CONFIG_HOME)

Use `os.homedir()` + platform detection via `process.platform`:
```typescript
import * as os from 'os';
import * as path from 'path';

function getConfigDir(): string {
  const home = os.homedir();
  switch (process.platform) {
    case 'win32':
      return path.join(home, 'AppData', 'Roaming', 'speckit-automate');
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'speckit-automate');
    default: // linux and others
      return path.join(home, '.config', 'speckit-automate');
  }
}
```

---

## Decision 6: Configuration Management

### Configuration Format: **YAML** (with JSON fallback)

**File Name**: `.speckit-automate.yaml` (or `.speckit-automate.json`)

**Search Hierarchy**:
1. Current working directory
2. Repository root (git root detection)
3. User config directory (OS-specific, see above)

**Schema**:
```yaml
# .speckit-automate.yaml
aiTool: copilot  # or 'claude'
maxRetries: 3
timeout: 300  # seconds (5 minutes)
verbosity: normal  # quiet, normal, verbose, debug

# Optional overrides
commands:
  test: "npm test"
  lint: "npm run lint"
  build: "npm run build"

# Feature filters (which priorities to implement)
priorities:
  - P1
  - P2
  # P3 excluded

# Quality check toggles
checks:
  tests: true
  linting: true
  build: true
```

**Rationale**:
- YAML is human-friendly for config files (Constitution VII - conventional)
- JSON fallback for programmatic generation
- Hierarchical search allows per-project and user-global config
- Explicit defaults ensure zero-config operation

---

## Decision 7: State Tracking

### Implementation Progress State

**Storage**: `.speckit-automate/state.json` in repository root

**Schema**:
```json
{
  "version": "1.0.0",
  "lastRun": "2026-01-07T14:00:00Z",
  "features": {
    "1-speckit-automation": {
      "status": "in-progress",
      "implementedSteps": [
        "initialization",
        "cli-parser"
      ],
      "failedChecks": [],
      "retryCount": 0,
      "lastAttempt": "2026-01-07T14:00:00Z"
    }
  }
}
```

**Rationale**:
- JSON for easy parsing/writing
- Tracks per-feature progress (FR-017)
- Enables resume capability (FR-005: partial implementation)
- Hidden directory (`.speckit-automate/`) avoids clutter

---

## Technology Stack Summary

| Component | Choice | Version | Justification |
|-----------|--------|---------|---------------|
| **Language** | TypeScript | 5.x | Type safety, Node.js ecosystem, cross-platform |
| **Runtime** | Node.js | 18.x LTS | Stability, wide availability, mature APIs |
| **CLI Framework** | commander | ^11.0 | Standard, minimal, well-tested |
| **Process Exec** | execa | ^8.0 | Better API than child_process, cross-platform |
| **File Ops** | fs-extra | ^11.0 | Cross-platform file utilities |
| **Config Parser** | yaml | ^2.3 | YAML config support |
| **Pattern Matching** | glob | ^10.0 | File discovery |
| **Testing** | Jest | ^29.0 | TypeScript support, mocking, snapshots |
| **Linting** | ESLint + Prettier | ^8.0 / ^3.0 | Code quality, consistency |
| **Build Tool** | tsc + esbuild | 5.x / ^0.19 | Fast compilation, optional bundling |
| **Package Manager** | npm | ^9.0 | Standard, lockfiles, scripts |

**Total Core Dependencies**: 6 runtime libraries
**Total Dev Dependencies**: ~15 (testing, linting, types)

---

## Architecture Patterns

### 1. Command Pattern (CLI Commands)
Each command (init, implement, etc.) is a separate class implementing a common interface:
```typescript
interface Command {
  name: string;
  description: string;
  execute(args: ParsedArgs): Promise<CommandResult>;
}
```

### 2. Adapter Pattern (AI CLI Tools)
Abstract AI tool interface with concrete implementations:
```typescript
interface AIAdapter {
  isInstalled(): Promise<boolean>;
  suggest(prompt: string): Promise<string>;
  autoApprove: boolean;
}
// Implementations: CopilotAdapter, ClaudeAdapter
```

### 3. Strategy Pattern (Quality Checks)
Different check strategies (test, lint, build) implement common interface:
```typescript
interface QualityCheck {
  detect(repoPath: string): Promise<boolean>;
  run(repoPath: string): Promise<CheckResult>;
  parse(output: string): FailureReport[];
}
```

### 4. Factory Pattern (Tool Detection)
Detect and instantiate appropriate tools based on project structure:
```typescript
class ToolFactory {
  static detectTestFramework(repoPath: string): TestRunner | null;
  static detectLinter(repoPath: string): Linter | null;
  static detectBuildTool(repoPath: string): Builder | null;
}
```

---

## Build & Distribution

### Development Workflow
```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm test             # Run Jest tests
npm run lint         # ESLint + Prettier
npm run dev          # Watch mode for development
```

### Distribution Options

**Option 1: npm Package (Recommended)**
```bash
npm install -g speckit-automate
speckit-automate init
```

**Option 2: Standalone Binary (via pkg or nexe)**
- Bundle Node runtime + compiled code
- Platform-specific binaries: `speckit-automate-win.exe`, `speckit-automate-macos`, `speckit-automate-linux`
- ~40-50MB per binary (includes Node runtime)

**Option 3: npx (No Installation)**
```bash
npx speckit-automate init
```

**Recommendation**: Start with npm package (Option 1), add binary distribution (Option 2) after initial release.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **AI CLI tool API changes** | Adapter pattern isolates changes, version detection can warn users |
| **Platform-specific bugs** | CI/CD tests on all 3 platforms (GitHub Actions matrix), path module usage |
| **Process hanging** | Timeout enforcement (default 5min), user configurable |
| **Large repository slowness** | Async operations, parallel quality checks where possible, progress indicators |
| **SpecKit template drift** | Embed templates in code, version-check against latest SpecKit release |
| **Node.js version incompatibility** | Specify minimum version (18.x) in package.json, runtime check on startup |

---

## Open Questions for Phase 1

1. **Exact CLI interface for Copilot/Claude**: Need to verify actual flags for auto-approval mode
2. **State persistence strategy**: Consider if `.speckit-automate/` is best location or use `.git/`?
3. **Parallel vs Sequential**: Should multiple features implement in parallel (if independent)?
4. **Progress reporting**: Real-time streaming output vs. batch updates?

These will be resolved during contract design in Phase 1.

---

## References

- Node.js Path Documentation: https://nodejs.org/api/path.html
- XDG Base Directory Specification: https://specifications.freedesktop.org/basedir-spec/
- Semantic Versioning: https://semver.org/
- GitHub Copilot CLI Documentation: (to be verified)
- Claude CLI Documentation: (to be verified)
