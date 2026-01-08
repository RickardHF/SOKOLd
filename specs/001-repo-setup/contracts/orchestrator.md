# API Contract: Setup Orchestrator

**Module**: `src/core/setup/orchestrator.ts`  
**Version**: 1.0.0  
**Status**: Design

## Overview

Coordinates the entire setup workflow, managing state detection, configuration generation, and operation execution.

## Interface

### executeSetup

Main entry point for repository setup.

**Signature**:
```typescript
async function executeSetup(
  repoPath: string,
  options: SetupOptions
): Promise<SetupResult>
```

**Parameters**:
- `repoPath` (string): Absolute path to repository root
- `options` (SetupOptions): Setup configuration
  ```typescript
  interface SetupOptions {
    userDescription?: string; // For new repos
    language?: string; // Override detected language
    framework?: string; // Override detected framework
    force?: boolean; // Overwrite existing configs
    dryRun?: boolean; // Preview changes without applying
    quiet?: boolean; // Minimal output
    verbose?: boolean; // Detailed output
    skipValidation?: boolean; // Skip existing config validation
  }
  ```

**Returns**: Promise<SetupResult>
```typescript
interface SetupResult {
  success: boolean;
  repositoryState: RepositoryState;
  operations: SetupOperation[];
  summary: SetupSummary;
  duration: number;
  warnings: string[];
}

interface SetupSummary {
  filesCreated: number;
  filesUpdated: number;
  filesSkipped: number;
  directoriesCreated: number;
  customValuesPreserved: number;
  configsValidated: number;
}
```

**Errors**:
- `InvalidPathError`: If repoPath invalid
- `PermissionError`: If lacking write permissions
- `SetupFailedError`: If critical operations fail
- `UserCancellationError`: If user cancels interactive prompts

**Behavior**:
1. Detects repository state
2. Based on state, determines required operations:
   - EMPTY: Create both configs from userDescription
   - UNCONFIGURED: Analyze code, create both configs
   - PARTIAL: Create missing config, synchronize settings
   - FULL: Validate and update if needed
3. Generates list of SetupOperations
4. If dryRun, returns operations without executing
5. Executes operations in order
6. Handles errors gracefully, rolls back on critical failures
7. Returns SetupResult with summary

**Examples**:

Setup empty repository:
```typescript
const result = await executeSetup('/path/to/new-repo', {
  userDescription: 'A CLI tool for managing tasks'
});
// Creates both .specify/ and .sokold/ with generated configs
```

Setup existing unconfigured repository:
```typescript
const result = await executeSetup('/path/to/existing-project', {});
// Analyzes code, creates appropriate configs
```

Dry run mode:
```typescript
const result = await executeSetup('/path/to/repo', { dryRun: true });
// Returns operations that would be performed without executing them
console.log(`Would create ${result.summary.filesCreated} files`);
```

**Performance**: < 3 minutes for new repos, < 5 minutes for existing repos with analysis

**Cross-Platform**: All file operations use platform-agnostic APIs
