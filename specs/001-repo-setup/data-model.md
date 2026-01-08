# Data Model: Adaptive Repository Setup

**Feature**: 001-repo-setup  
**Date**: 2026-01-08  
**Status**: Design Complete

## Overview

This document defines the entities, their relationships, and state transitions for the adaptive repository setup feature.

## Core Entities

### RepositoryState

Represents the current configuration status of a repository.

**Fields**:
- `type`: RepositoryStateType (enum)
- `hasSpeckit`: boolean - True if .specify/ directory exists
- `hasSokold`: boolean - True if .sokold/ directory exists
- `hasSourceFiles`: boolean - True if repository contains any source code files
- `isValid`: boolean - True if existing configs pass validation
- `rootPath`: string - Absolute path to repository root
- `detectedAt`: Date - Timestamp of state detection

**State Types** (RepositoryStateType enum):
- `EMPTY` - No files in repository
- `UNCONFIGURED` - Has source files but no speckit/sokold configs
- `PARTIAL_SPECKIT` - Has only .specify/ configuration
- `PARTIAL_SOKOLD` - Has only .sokold/ configuration
- `FULL` - Has both configurations and they are valid
- `CORRUPTED` - Has configurations but they are invalid/incomplete

**Validation Rules**:
- `EMPTY` requires: hasSourceFiles=false, hasSpeckit=false, hasSokold=false
- `UNCONFIGURED` requires: hasSourceFiles=true, hasSpeckit=false, hasSokold=false
- `PARTIAL_SPECKIT` requires: hasSpeckit=true, hasSokold=false
- `PARTIAL_SOKOLD` requires: hasSokold=true, hasSpeckit=false
- `FULL` requires: hasSpeckit=true, hasSokold=true, isValid=true
- `CORRUPTED` requires: (hasSpeckit OR hasSokold) AND isValid=false

**State Transitions**:
```
EMPTY → FULL (via setup with user description)
UNCONFIGURED → FULL (via setup with code analysis)
PARTIAL_SPECKIT → FULL (via setup adds sokold)
PARTIAL_SOKOLD → FULL (via setup adds speckit)
CORRUPTED → FULL (via setup repairs/recreates configs)
FULL → FULL (via idempotent setup, no changes)
```

### ProjectMetadata

Information about the project extracted from user description or code analysis.

**Fields**:
- `name`: string - Project name (from repo name or user input)
- `language`: string - Primary programming language
- `framework`: string | null - Detected framework (React, FastAPI, etc.)
- `testFramework`: string | null - Detected test framework (Jest, pytest, etc.)
- `projectType`: ProjectType (enum) - Type of project
- `directoryStructure`: DirectoryInfo[] - Key directories detected
- `dependencies`: Dependency[] - Main dependencies detected
- `detectionMethod`: 'user-input' | 'code-analysis' | 'hybrid'
- `confidence`: number - Confidence score 0-100 for detection accuracy

**Project Types** (ProjectType enum):
- `CLI` - Command-line tool
- `WEB_APP` - Web application (frontend/backend)
- `API` - API server
- `LIBRARY` - Reusable library/package
- `MOBILE` - Mobile application
- `DESKTOP` - Desktop application
- `UNKNOWN` - Could not determine

**Validation Rules**:
- `name` must be non-empty string, no special characters except - and _
- `language` must be supported language (see SupportedLanguages)
- `confidence` must be 0-100
- If `detectionMethod` is 'user-input', confidence should be 100
- If `confidence` < 70, should prompt user for confirmation

**Relationships**:
- One RepositoryState has zero or one ProjectMetadata
- ProjectMetadata is created during code analysis or from user input

### ConfigurationSet

Represents either speckit or sokold configuration files and settings.

**Fields**:
- `type`: ConfigType (enum) - 'speckit' | 'sokold'
- `rootPath`: string - Path to configuration directory (.specify/ or .sokold/)
- `files`: ConfigFile[] - List of configuration files
- `customizations`: Map<string, any> - Custom values that differ from defaults
- `version`: string - Configuration schema version
- `isComplete`: boolean - True if all required files exist
- `isValid`: boolean - True if configuration passes schema validation
- `validationErrors`: ValidationError[] - List of validation issues

**Config Types** (ConfigType enum):
- `SPECKIT` - Speckit configuration (.specify/)
- `SOKOLD` - Sokold configuration (.sokold/)

**Required Files by Type**:

Speckit:
- `.specify/memory/constitution.md`
- `.specify/scripts/powershell/setup-plan.ps1`
- `.specify/scripts/powershell/update-agent-context.ps1`
- `.specify/templates/plan-template.md`
- `.specify/templates/spec-template.md`
- `.specify/templates/tasks-template.md`

Sokold:
- `.sokold/config.yaml`
- `.sokold/prompts/default.md`
- `.sokold/templates/` (directory)

**Validation Rules**:
- All required files must exist for `isComplete` = true
- Files must pass schema validation for `isValid` = true
- `version` must match expected format (semver)
- Corrupted YAML/JSON files should set `isValid` = false

**Relationships**:
- One RepositoryState has zero, one, or two ConfigurationSets
- ConfigurationSet references ProjectMetadata for personalization

### SetupOperation

Represents an action to be performed during setup.

**Fields**:
- `action`: OperationAction (enum) - Type of operation
- `targetPath`: string - File or directory path affected
- `status`: OperationStatus (enum) - Current status
- `metadata`: OperationMetadata - Additional operation details
- `error`: Error | null - Error if operation failed
- `timestamp`: Date - When operation was performed

**Operation Actions** (OperationAction enum):
- `CREATE_DIRECTORY` - Create new directory
- `CREATE_FILE` - Create new file from template
- `UPDATE_FILE` - Update existing file (merge custom values)
- `SKIP_FILE` - Skip because already up to date
- `VALIDATE_CONFIG` - Validate existing configuration
- `BACKUP_FILE` - Create backup before modification

**Operation Status** (OperationStatus enum):
- `PENDING` - Not yet executed
- `IN_PROGRESS` - Currently executing
- `COMPLETED` - Successfully completed
- `SKIPPED` - Skipped (idempotent, no changes needed)
- `FAILED` - Failed with error

**Operation Metadata**:
```typescript
interface OperationMetadata {
  configType?: 'speckit' | 'sokold';
  fileSize?: number;
  customValuesPreserved?: number;
  backupPath?: string;
  reason?: string; // Why skipped or failed
}
```

**Validation Rules**:
- `targetPath` must be within repository root
- `status` transitions: PENDING → IN_PROGRESS → (COMPLETED | SKIPPED | FAILED)
- If status is FAILED, error must not be null
- If action is SKIP_FILE, status must be SKIPPED

**State Transitions**:
```
PENDING → IN_PROGRESS (on operation start)
IN_PROGRESS → COMPLETED (on success)
IN_PROGRESS → SKIPPED (if no changes needed)
IN_PROGRESS → FAILED (on error)
```

### SetupResult

Overall result of a setup execution.

**Fields**:
- `success`: boolean - True if setup completed without critical errors
- `repositoryState`: RepositoryState - Final repository state
- `operations`: SetupOperation[] - All operations performed
- `summary`: SetupSummary - High-level summary
- `duration`: number - Total execution time in milliseconds
- `warnings`: string[] - Non-critical warnings

**Setup Summary**:
```typescript
interface SetupSummary {
  filesCreated: number;
  filesUpdated: number;
  filesSkipped: number;
  directoriesCreated: number;
  customValuesPreserved: number;
  configsValidated: number;
}
```

**Validation Rules**:
- If `success` is false, at least one operation must have status FAILED
- `duration` must be positive number
- Sum of summary counts should match operations length

**Relationships**:
- One setup execution produces one SetupResult
- SetupResult contains multiple SetupOperations
- SetupResult references final RepositoryState

## Supporting Types

### Dependency

Represents a detected project dependency.

**Fields**:
- `name`: string - Dependency name
- `version`: string | null - Version if detected
- `type`: 'runtime' | 'dev' | 'peer'
- `source`: string - Where detected (package.json, requirements.txt, etc.)

### DirectoryInfo

Information about a directory in the project structure.

**Fields**:
- `path`: string - Relative path from repository root
- `purpose`: string - Inferred purpose (src, tests, docs, etc.)
- `fileCount`: number - Number of files in directory

### ValidationError

Describes a configuration validation failure.

**Fields**:
- `path`: string - File path where error occurred
- `field`: string | null - Specific field if applicable
- `message`: string - Human-readable error message
- `severity`: 'error' | 'warning'
- `code`: string - Machine-readable error code

### ConfigFile

Represents a single configuration file.

**Fields**:
- `path`: string - Relative path from config root
- `required`: boolean - True if file is mandatory
- `template`: string | null - Template used to generate
- `exists`: boolean - True if file exists on disk
- `isValid`: boolean - True if content is valid
- `customized`: boolean - True if differs from default template

## Relationships Diagram

```
RepositoryState (1) ──> (0..1) ProjectMetadata
       │
       │ (1)
       ↓
       (0..2) ConfigurationSet
              │
              │ (1)
              ↓
              (*) ConfigFile

SetupResult (1) ──> (1) RepositoryState
     │
     │ (1)
     ↓
     (*) SetupOperation
```

## Supported Languages

Initial support (Phase 1):
- JavaScript/TypeScript
- Python
- Go
- Rust
- Java

Extended support (future phases):
- C#/.NET
- Ruby
- PHP
- Swift
- Kotlin

## Configuration Schema Versions

- Speckit: v1.0 (initial version)
- Sokold: v1.0 (initial version)

Future versions must maintain backward compatibility or provide migration path.

## Invariants

1. A repository cannot be both EMPTY and have source files
2. A FULL state must have both speckit and sokold configurations valid
3. Setup operations must be idempotent - running twice produces same result
4. Custom configuration values must be preserved during updates
5. All file paths must be absolute or relative to known root
6. RepositoryState.type must match the combination of hasSpeckit/hasSokold/hasSourceFiles
7. If confidence < 70, user confirmation should be required before proceeding
8. ConfigurationSet.isComplete implies all required files exist
9. SetupOperation.status can only transition forward, never backward
10. SetupResult.success = true implies zero operations with status FAILED
