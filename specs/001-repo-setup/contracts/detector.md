# API Contract: Repository State Detector

**Module**: `src/core/state/detector.ts`  
**Version**: 1.0.0  
**Status**: Design

## Overview

Detects the current configuration state of a repository (empty, unconfigured, partially configured, or fully configured).

## Interface

### detectRepositoryState

Analyzes a repository and returns its current configuration state.

**Signature**:
```typescript
async function detectRepositoryState(
  repoPath: string
): Promise<RepositoryState>
```

**Parameters**:
- `repoPath` (string): Absolute path to repository root directory

**Returns**: Promise<RepositoryState>
```typescript
interface RepositoryState {
  type: RepositoryStateType;
  hasSpeckit: boolean;
  hasSokold: boolean;
  hasSourceFiles: boolean;
  isValid: boolean;
  rootPath: string;
  detectedAt: Date;
}

enum RepositoryStateType {
  EMPTY = 'EMPTY',
  UNCONFIGURED = 'UNCONFIGURED',
  PARTIAL_SPECKIT = 'PARTIAL_SPECKIT',
  PARTIAL_SOKOLD = 'PARTIAL_SOKOLD',
  FULL = 'FULL',
  CORRUPTED = 'CORRUPTED'
}
```

**Errors**:
- `InvalidPathError`: If repoPath does not exist or is not a directory
- `PermissionError`: If lacking read permissions for repoPath
- `NotARepositoryError`: If repoPath is not a git repository (when git is required)

**Behavior**:
1. Validates repoPath exists and is accessible
2. Checks for .specify/ directory → sets hasSpeckit
3. Checks for .sokold/ directory → sets hasSokold
4. Scans for source files (excluding node_modules, .git) → sets hasSourceFiles
5. If configs exist, validates them → sets isValid
6. Determines type based on detection results
7. Returns RepositoryState with timestamp

**Examples**:

Empty repository:
```typescript
const state = await detectRepositoryState('/path/to/new-repo');
// Returns: { type: 'EMPTY', hasSpeckit: false, hasSokold: false, 
//            hasSourceFiles: false, isValid: true, ... }
```

Unconfigured repository:
```typescript
const state = await detectRepositoryState('/path/to/existing-project');
// Returns: { type: 'UNCONFIGURED', hasSpeckit: false, hasSokold: false,
//            hasSourceFiles: true, isValid: true, ... }
```

Partial configuration:
```typescript
const state = await detectRepositoryState('/path/to/partial-repo');
// Returns: { type: 'PARTIAL_SPECKIT', hasSpeckit: true, hasSokold: false,
//            hasSourceFiles: true, isValid: true, ... }
```

**Performance**: < 1 second for repos with < 10k files

**Cross-Platform**: Uses path.join for all path operations, works on Windows/macOS/Linux
