# Quickstart Guide: Adaptive Repository Setup

**Feature**: 001-repo-setup  
**For**: Developers implementing this feature  
**Last Updated**: 2026-01-08

## Overview

This guide helps you implement the adaptive repository setup feature that automatically detects repository state and creates/updates speckit and sokold configurations.

## Prerequisites

- Node.js 18.0+ installed
- TypeScript 5.3+ configured
- Jest test environment set up
- Git repository initialized

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  CLI Command Layer                  │
│              (src/cli/commands/setup.ts)            │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────┐
│              Setup Orchestrator                     │
│         (src/core/setup/orchestrator.ts)            │
└──────┬──────────────────────────────────────┬───────┘
       │                                      │
       ↓                                      ↓
┌──────────────────┐              ┌──────────────────────┐
│  State Detection │              │  Config Generation   │
│  & Validation    │              │  & Synchronization   │
└──────────────────┘              └──────────────────────┘
       │                                      │
       ├─ Detector                            ├─ Speckit Setup
       ├─ Analyzer                            ├─ Sokold Setup
       └─ Validator                           └─ Synchronizer
```

## Key Components

### 1. State Detection (`src/core/state/`)

**detector.ts** - Identifies repository state
- Checks for .specify/ and .sokold/ directories
- Scans for source files
- Determines state type (EMPTY, UNCONFIGURED, PARTIAL, FULL, CORRUPTED)

**analyzer.ts** - Analyzes codebase
- Counts file extensions to detect primary language
- Parses manifest files (package.json, requirements.txt) for framework
- Infers project type from structure
- Returns ProjectMetadata with confidence score

**validator.ts** - Validates existing configs
- Checks required files exist
- Validates YAML/JSON syntax
- Verifies schema compliance
- Returns ValidationResult with errors/warnings

### 2. Setup Orchestration (`src/core/setup/`)

**orchestrator.ts** - Main workflow coordinator
- Calls detector to get repository state
- Based on state, determines operations needed
- Coordinates generation and synchronization
- Handles errors and rollback
- Returns SetupResult

**speckit-setup.ts** - Speckit configuration generator
- Loads templates from `.specify/templates/`
- Substitutes variables (project name, language, etc.)
- Merges custom values if preserving existing
- Writes files to `.specify/` directory

**sokold-setup.ts** - Sokold configuration generator
- Similar to speckit-setup but for `.sokold/` configs
- Handles sokold-specific templates

**synchronizer.ts** - Syncs shared settings
- Identifies settings that must match between configs
- Updates both configs to ensure consistency
- Validates synchronization

### 3. CLI Command (`src/cli/commands/setup.ts`)

- Parses command-line arguments
- Calls orchestrator with options
- Formats output (human-readable or JSON)
- Handles exit codes

## Implementation Workflow

### Step 1: Set Up Tests First (TDD)

```bash
# Create test files for each component
tests/unit/state/detector.test.ts
tests/unit/state/analyzer.test.ts
tests/unit/state/validator.test.ts
tests/unit/setup/orchestrator.test.ts
tests/unit/setup/speckit-setup.test.ts
tests/unit/setup/sokold-setup.test.ts
tests/integration/setup/empty-repo.test.ts
tests/integration/setup/unconfigured-repo.test.ts
tests/integration/setup/partial-config.test.ts
tests/integration/setup/full-config.test.ts
```

Example test (detector.test.ts):
```typescript
import { detectRepositoryState } from '../../../src/core/state/detector';

describe('detectRepositoryState', () => {
  it('should detect EMPTY state for new repository', async () => {
    // Arrange
    const repoPath = '/tmp/test-empty-repo';
    // Create empty directory
    
    // Act
    const state = await detectRepositoryState(repoPath);
    
    // Assert
    expect(state.type).toBe('EMPTY');
    expect(state.hasSpeckit).toBe(false);
    expect(state.hasSokold).toBe(false);
    expect(state.hasSourceFiles).toBe(false);
  });
  
  // More tests for each state type...
});
```

### Step 2: Implement State Detection

1. **Create detector.ts**:
   - Implement `detectRepositoryState()` function
   - Use fs-extra to check directory existence
   - Use glob to scan for source files
   - Return RepositoryState object

2. **Create analyzer.ts**:
   - Implement `analyzeCodebase()` function
   - Count file extensions using glob patterns
   - Parse manifest files (package.json, etc.)
   - Calculate confidence score
   - Return ProjectMetadata

3. **Create validator.ts**:
   - Implement `validateConfiguration()` function
   - Check required files exist
   - Parse and validate YAML/JSON
   - Return ValidationResult

### Step 3: Implement Configuration Generation

1. **Create template files**:
   ```
   .specify/templates/
   ├── constitution.md.template
   ├── config.yaml.template
   └── ... other templates
   
   .sokold/templates/
   ├── config.yaml.template
   └── ... other templates
   ```

2. **Create speckit-setup.ts**:
   - Load templates from filesystem
   - Replace variables with metadata values
   - Handle custom value preservation
   - Write files to .specify/ directory

3. **Create sokold-setup.ts**:
   - Similar implementation for sokold configs

4. **Create synchronizer.ts**:
   - Define shared settings registry
   - Update both configs with shared values
   - Validate consistency

### Step 4: Implement Orchestrator

1. **Create orchestrator.ts**:
   - Implement `executeSetup()` function
   - Call detector to get state
   - Based on state, call appropriate generators
   - Handle dry-run mode
   - Track operations in SetupOperation[]
   - Return SetupResult

### Step 5: Implement CLI Command

1. **Create setup.ts command**:
   - Define command with commander
   - Parse options
   - Call orchestrator
   - Format output based on --quiet/--verbose/--output-json
   - Set appropriate exit codes

2. **Register command** in main CLI entry point

### Step 6: Integration Testing

Run integration tests for each user story:
- Empty repository setup
- Unconfigured repository setup
- Partial configuration update
- Full configuration validation

## Development Tips

### Cross-Platform File Operations

Always use:
```typescript
import path from 'path';
import fs from 'fs-extra';

// Good
const configPath = path.join(repoRoot, '.specify', 'config.yaml');

// Bad (will fail on Windows)
const configPath = `${repoRoot}/.specify/config.yaml`;
```

### Error Handling

Use custom error classes:
```typescript
export class PermissionError extends Error {
  constructor(path: string) {
    super(`Permission denied: ${path}`);
    this.name = 'PermissionError';
  }
}
```

### Logging

Use structured logging:
```typescript
if (options.verbose) {
  console.log(`[DEBUG] Detected ${fileCount} source files`);
}
```

### Idempotency

Always check before modifying:
```typescript
const exists = await fs.pathExists(filePath);
if (exists) {
  const existingContent = await fs.readFile(filePath, 'utf8');
  const newContent = generateContent();
  if (existingContent === newContent) {
    return { action: 'SKIP', reason: 'already up to date' };
  }
}
```

## Testing Strategy

### Unit Tests
- Test each component in isolation
- Mock file system operations
- Test edge cases (permissions, corrupted files, etc.)

### Integration Tests
- Test full workflow end-to-end
- Use temporary directories for test repos
- Verify actual file creation
- Test all four repository states

### Cross-Platform Tests
- Run tests on Windows, macOS, Linux
- Use GitHub Actions matrix for CI
- Test path handling on each platform

## Common Pitfalls

1. **Path separators**: Always use `path.join()`, never string concatenation
2. **Async operations**: Remember to await all fs operations
3. **Custom value detection**: Don't assume all non-default values are custom
4. **Error messages**: Include actionable remediation steps
5. **Idempotency**: Test running setup multiple times in a row

## Performance Considerations

- Limit file scanning to 10k files by default
- Use parallel glob operations where possible
- Cache analysis results for dry-run preview
- Stream large files rather than loading into memory

## Security Considerations

- Validate all user-provided paths (no path traversal)
- Don't trust existing config files (validate thoroughly)
- Handle permission errors gracefully
- Don't expose sensitive paths in error messages

## Next Steps

After completing implementation:
1. Run full test suite on all platforms
2. Test manually with real repositories
3. Update CHANGELOG.md
4. Update README.md with setup command documentation
5. Create PR for review

## Reference

- Feature Spec: `specs/001-repo-setup/spec.md`
- Data Model: `specs/001-repo-setup/data-model.md`
- API Contracts: `specs/001-repo-setup/contracts/`
- Research: `specs/001-repo-setup/research.md`
