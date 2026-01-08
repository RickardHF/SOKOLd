# Research: Adaptive Repository Setup

**Date**: 2026-01-08  
**Feature**: 001-repo-setup  
**Status**: Complete

## Overview

Research to resolve technical decisions for implementing adaptive repository setup that handles four states: empty repository, existing unconfigured repository, partially configured repository, and fully configured repository.

## Research Tasks

### 1. Repository State Detection Strategy

**Decision**: Multi-stage detection using file system checks

**Rationale**: 
- Most reliable approach is checking for presence/absence of marker directories and files
- Fast file system operations (stat calls) scale well even for large repos
- Clear decision tree: check `.specify/` → check `.sokold/` → determine state
- Validation step checks configuration completeness beyond directory existence

**Implementation Approach**:
```typescript
1. Check if .specify/ exists → hasSpeckit
2. Check if .sokold/ exists → hasSokold
3. If neither: EMPTY or UNCONFIGURED (check for any source files)
4. If one: PARTIAL_SPECKIT or PARTIAL_SOKOLD
5. If both: validate completeness → FULL or PARTIAL_INCOMPLETE
```

**Alternatives Considered**:
- Git history analysis: Rejected - too slow, unreliable for imported repos
- Package.json inspection: Rejected - not all repos have package.json
- Configuration file parsing first: Rejected - need state before parsing

### 2. Code Analysis for Language/Framework Detection

**Decision**: Heuristic-based detection using file extensions and manifest files

**Rationale**:
- File extension counting is fast and accurate for primary language (90%+ accuracy)
- Package manifests (package.json, requirements.txt, Cargo.toml, etc.) reveal frameworks
- Glob patterns can scan thousands of files in milliseconds
- Simple heuristics avoid ML/AI complexity while meeting SC-004 (90% accuracy)

**Detection Priority**:
1. **Manifest files** (highest confidence): package.json → Node.js/TypeScript, requirements.txt → Python
2. **File extension prevalence**: Count .ts/.js/.py/.rs/.go files, use majority
3. **Framework markers**: React (jsx/tsx), FastAPI (main.py patterns), Express (app.use patterns)
4. **Fallback**: Prompt user if ambiguous (polyglot projects)

**Language Support (Phase 1)**:
- JavaScript/TypeScript (Node.js, React, Vue, Angular)
- Python (FastAPI, Django, Flask)
- Go (standard library patterns)
- Rust (Cargo ecosystem)
- Java (Maven/Gradle)

**Alternatives Considered**:
- Tree-sitter parsing: Rejected - too heavy, requires native bindings
- LLM-based analysis: Rejected - offline requirement, latency concerns
- GitHub Linguist approach: Considered but simplified - full Linguist is complex

### 3. Configuration File Generation and Templating

**Decision**: Template-based generation with variable substitution

**Rationale**:
- Templates ensure consistency and make updates manageable
- Variable substitution allows personalization (project name, language, etc.)
- Templates can live in `.specify/templates/` and be versioned
- Supports both speckit and sokold configuration schemas

**Template Structure**:
```
.specify/templates/
├── speckit/
│   ├── constitution.md.template
│   ├── config.yaml.template
│   └── README.md.template
└── sokold/
    ├── config.yaml.template
    ├── prompts/
    └── templates/
```

**Variables for Substitution**:
- `{{PROJECT_NAME}}` - from repo name or user input
- `{{LANGUAGE}}` - from code analysis
- `{{FRAMEWORK}}` - from code analysis
- `{{DATE}}` - setup timestamp
- `{{VERSION}}` - tool version

**Alternatives Considered**:
- Programmatic generation: Rejected - harder to maintain, less flexible
- Copy existing configs: Rejected - doesn't personalize
- Hardcoded defaults: Rejected - inflexible, poor UX

### 4. Preserving Custom Configuration Values

**Decision**: Smart merge strategy with three-way comparison

**Rationale**:
- Three-way merge: default template + existing config + new template → merged output
- Detect custom values by comparing existing against known defaults
- Only overwrite if file is missing or user confirms
- Track custom sections with special markers if needed

**Merge Strategy**:
1. Load existing configuration
2. Load default template for that version
3. Compare existing vs default → identify custom values
4. Apply custom values to new template
5. Add missing keys with new defaults
6. Preserve all non-default values

**Safe Overwrites**:
- Missing files: Always create
- Corrupted/invalid files: Warn and prompt
- Default values only: Update to new defaults
- Custom values present: Preserve and merge

**Alternatives Considered**:
- Always preserve, never update: Rejected - prevents upgrades
- Always overwrite: Rejected - violates FR-006
- Manual merge conflicts: Rejected - poor UX for CLI tool

### 5. Cross-Platform File System Operations

**Decision**: Use fs-extra with explicit path.join for all paths

**Rationale**:
- fs-extra provides promise-based API and extra utilities (ensureDir, copy)
- path.join handles platform differences (\ vs / separators)
- Node.js path module is battle-tested across platforms
- Already in project dependencies

**Platform-Specific Concerns**:
- **Windows**: Use path.win32 when needed, respect %APPDATA% for user configs
- **macOS**: Handle ~/Library/Application Support paths
- **Linux**: Respect XDG_CONFIG_HOME or ~/.config
- **Permissions**: Try-catch file operations, provide clear error messages

**Best Practices**:
```typescript
import path from 'path';
import fs from 'fs-extra';

// Always use path.join
const configPath = path.join(repoRoot, '.specify', 'config.yaml');

// Ensure directory exists before writing
await fs.ensureDir(path.dirname(configPath));

// Handle permissions gracefully
try {
  await fs.writeFile(configPath, content);
} catch (error) {
  if (error.code === 'EACCES') {
    throw new Error(`Permission denied writing to ${configPath}`);
  }
  throw error;
}
```

**Alternatives Considered**:
- Native fs module: Rejected - callback-based, lacks utilities
- Custom path handling: Rejected - reinventing wheel, error-prone

### 6. Idempotent Setup Operations

**Decision**: Check-before-write pattern with content comparison

**Rationale**:
- Running setup multiple times should produce identical results
- Check file existence and content hash before writing
- Skip operations that don't change state
- Log skipped operations for transparency

**Idempotency Implementation**:
1. Calculate expected file content
2. Check if file exists
3. If exists, compare content hash
4. If identical, skip and log "already up to date"
5. If different, merge custom values or prompt
6. Write only if content differs

**Logging for Transparency**:
```
✓ Created .specify/constitution.md
⊙ Skipped .specify/config.yaml (already up to date)
⊕ Updated .sokold/config.yaml (merged custom values)
```

**Alternatives Considered**:
- Always overwrite: Rejected - not idempotent, loses custom values
- Timestamp-based: Rejected - unreliable, doesn't detect content changes
- Database tracking: Rejected - adds complexity, offline issues

### 7. Error Handling and User Feedback

**Decision**: Structured error types with actionable messages and --verbose mode

**Rationale**:
- Users need to understand what failed and how to fix it
- Different error types require different handling (permission vs corruption vs ambiguity)
- Verbose mode aids debugging without overwhelming default output
- Exit codes enable scripting

**Error Categories**:
- **PermissionError** (exit 1): Clear message about which file/directory
- **CorruptionError** (exit 2): Suggest backup and manual fix
- **AmbiguityError** (exit 3): Prompt for user input to resolve
- **NetworkError** (exit 4): For any future template downloads
- **ValidationError** (exit 5): Configuration doesn't match schema

**User Feedback Levels**:
- **Default**: Progress indicators, summary of changes
- **--quiet**: Only errors to stderr
- **--verbose**: Detailed operations, file paths, detection results
- **--debug**: Full stack traces, intermediate values

**Example Messages**:
```
Error: Cannot create .specify/ directory (Permission denied)
→ Run with sudo, or change directory ownership:
  sudo chown -R $USER /path/to/repo

Warning: Detected both Python and JavaScript files equally
→ Please specify primary language:
  sokold setup --language=python
```

**Alternatives Considered**:
- Silent failures: Rejected - violates constitution principle V
- Single error type: Rejected - loses actionable context
- Always interactive prompts: Rejected - breaks scripting

### 8. Synchronizing Interdependent Settings

**Decision**: Shared configuration registry with validation rules

**Rationale**:
- Some settings must be consistent between speckit and sokold
- Explicit registry makes dependencies visible and testable
- Validation rules catch inconsistencies
- Single source of truth for shared values

**Shared Settings**:
- Project name
- Primary language
- Repository root path
- AI provider settings (if both configs reference)
- Test framework

**Synchronization Approach**:
```typescript
interface SharedConfig {
  projectName: string;
  language: string;
  repoRoot: string;
}

function synchronize(
  speckitConfig: SpeckitConfig,
  sokoldConfig: SokoldConfig,
  shared: SharedConfig
): [SpeckitConfig, SokoldConfig] {
  // Apply shared values to both
  speckitConfig.projectName = shared.projectName;
  sokoldConfig.projectName = shared.projectName;
  
  // Validate consistency
  validate(speckitConfig, sokoldConfig);
  
  return [speckitConfig, sokoldConfig];
}
```

**Alternatives Considered**:
- Independent configs: Rejected - FR-008 requires synchronization
- One config for both tools: Rejected - tools may have different needs
- Manual sync by user: Rejected - error-prone, poor UX

## Implementation Priorities

### Must Have (P0)
- Repository state detection (4 states)
- Template-based config generation
- Basic language detection (5 languages)
- Idempotent operations
- Cross-platform file operations
- Error handling with actionable messages

### Should Have (P1)
- Advanced framework detection
- Smart merge for custom values
- Verbose/quiet modes
- Validation of existing configs
- Synchronization of shared settings

### Nice to Have (P2)
- Extended language support (10+ languages)
- Interactive prompts for ambiguous cases
- Dry-run mode (--dry-run)
- Backup before modifications
- Migration from older config versions

## Open Questions

None - all technical clarifications resolved through research above.

## References

- Node.js path module: https://nodejs.org/api/path.html
- fs-extra documentation: https://github.com/jprichardson/node-fs-extra
- GitHub Linguist (language detection): https://github.com/github/linguist
- XDG Base Directory Specification: https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
