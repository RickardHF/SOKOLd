# Data Model: SpecKit Automation CLI

**Date**: 2026-01-07  
**Purpose**: Define core entities and their relationships for the automation system

---

## Core Entities

### 1. FeatureSpecification

Represents a feature defined in the `specs/` directory.

**Fields**:
- `id`: string - Unique identifier (e.g., "1-speckit-automation")
- `name`: string - Human-readable name extracted from spec.md
- `path`: string - Absolute path to spec directory
- `priority`: Priority - Feature priority (P1, P2, P3, etc.)
- `status`: ImplementationStatus - Current implementation state
- `requirements`: FunctionalRequirement[] - List of functional requirements
- `userStories`: UserStory[] - List of user scenarios
- `createdAt`: Date - When spec was created
- `updatedAt`: Date - Last modification time

**Relationships**:
- Has many `UserStory`
- Has many `FunctionalRequirement`
- Has one `ImplementationProgress`

**Validation Rules**:
- `id` must match directory name pattern: `\d+-[\w-]+`
- `path` must exist and contain `spec.md`
- `priority` must be valid Priority enum value
- `status` must be valid ImplementationStatus enum value

**State Transitions**:
```
pending → in-progress → testing → completed
              ↓             ↓
           failed       failed
              ↓             ↓
           pending      pending (retry)
```

---

### 2. UserStory

Represents a user scenario from a feature specification.

**Fields**:
- `id`: string - Unique identifier (e.g., "US1")
- `featureId`: string - Parent feature ID
- `title`: string - Story title
- `description`: string - Full scenario description
- `priority`: Priority - Story priority
- `acceptanceScenarios`: AcceptanceScenario[] - Given/When/Then scenarios
- `implementationStatus`: ImplementationStatus

**Relationships**:
- Belongs to `FeatureSpecification`
- Has many `AcceptanceScenario`

**Validation Rules**:
- `id` must match pattern: `US\d+`
- Must have at least one acceptance scenario
- Priority must be specified

---

### 3. FunctionalRequirement

Represents a functional requirement from spec.

**Fields**:
- `id`: string - Requirement ID (e.g., "FR-001")
- `featureId`: string - Parent feature ID
- `description`: string - Requirement description
- `implemented`: boolean - Whether requirement is satisfied
- `testCoverage`: boolean - Whether tests exist for this requirement

**Relationships**:
- Belongs to `FeatureSpecification`

**Validation Rules**:
- `id` must match pattern: `FR-\d{3}`
- Description must not be empty

---

### 4. ImplementationProgress

Tracks implementation progress for a feature.

**Fields**:
- `featureId`: string - Feature being tracked
- `status`: ImplementationStatus - Current status
- `implementedSteps`: string[] - Completed implementation steps
- `failedChecks`: QualityCheckResult[] - Failed quality checks
- `retryCount`: number - Number of retry attempts
- `lastAttempt`: Date - Timestamp of last implementation attempt
- `aiToolUsed`: AIToolType - Which AI tool was used

**Relationships**:
- Belongs to `FeatureSpecification`
- Has many `QualityCheckResult`

**Validation Rules**:
- `retryCount` must be >= 0
- `retryCount` must not exceed configured max (default 3)
- `status` transitions must follow state machine

---

### 5. QualityCheckResult

Represents the outcome of a quality check (test/lint/build).

**Fields**:
- `id`: string - Unique check ID
- `featureId`: string - Feature being checked
- `type`: QualityCheckType - Test, Lint, or Build
- `passed`: boolean - Whether check passed
- `output`: string - Raw output from tool
- `failures`: FailureDetail[] - Parsed failure details
- `executedAt`: Date - When check ran
- `duration`: number - Execution time in milliseconds

**Relationships**:
- Belongs to `ImplementationProgress`
- Has many `FailureDetail`

**Validation Rules**:
- If `passed` is false, `failures` must not be empty
- `duration` must be positive
- `type` must be valid QualityCheckType

---

### 6. FailureDetail

Represents a specific failure from a quality check.

**Fields**:
- `checkId`: string - Parent check ID
- `file`: string - File where failure occurred
- `line`: number | null - Line number (if applicable)
- `message`: string - Error message
- `severity`: Severity - Error, Warning, Info
- `fixed`: boolean - Whether auto-fix was applied
- `fixAttempts`: number - Number of fix attempts

**Relationships**:
- Belongs to `QualityCheckResult`

**Validation Rules**:
- `message` must not be empty
- `fixAttempts` must be >= 0
- If `fixed` is true, `fixAttempts` must be > 0

---

### 7. Configuration

Represents user configuration settings.

**Fields**:
- `aiTool`: AIToolType - Preferred AI CLI tool
- `maxRetries`: number - Max retry attempts for failures
- `timeout`: number - Command timeout in seconds
- `verbosity`: VerbosityLevel - Logging verbosity
- `checks`: QualityCheckConfig - Which checks to run
- `commands`: CommandOverrides - Custom test/lint/build commands
- `priorities`: Priority[] - Which priorities to implement

**Validation Rules**:
- `maxRetries` must be >= 0 and <= 10
- `timeout` must be > 0
- `verbosity` must be valid VerbosityLevel
- `aiTool` must be valid AIToolType

**Default Values**:
```typescript
{
  aiTool: null, // Auto-detect
  maxRetries: 3,
  timeout: 300, // 5 minutes
  verbosity: 'normal',
  checks: { tests: true, linting: true, build: true },
  commands: {},
  priorities: ['P1', 'P2', 'P3']
}
```

---

### 8. ExecutionSession

Tracks one automation run.

**Fields**:
- `id`: string - Unique session ID (UUID)
- `startedAt`: Date - Session start time
- `completedAt`: Date | null - Session end time (null if in progress)
- `featuresProcessed`: string[] - Feature IDs processed
- `successCount`: number - Features successfully implemented
- `failureCount`: number - Features that failed
- `skippedCount`: number - Features skipped
- `totalChecksRun`: number - Total quality checks executed
- `totalChecksPassed`: number - Checks that passed
- `logs`: LogEntry[] - Session logs

**Relationships**:
- Has many `LogEntry`

**Validation Rules**:
- `startedAt` must be before `completedAt` (if set)
- Counts must be non-negative
- `successCount + failureCount + skippedCount` should equal `featuresProcessed.length`

---

### 9. AIToolAdapter

Abstract representation of AI CLI tool integration.

**Fields**:
- `type`: AIToolType - Tool identifier
- `executable`: string - Path to CLI executable
- `version`: string | null - Detected version
- `isInstalled`: boolean - Whether tool is available
- `autoApproveFlag`: string - Flag for auto-approval mode

**Methods** (Interface):
- `detect(): Promise<boolean>` - Check if tool is installed
- `getVersion(): Promise<string>` - Get tool version
- `suggest(prompt: string): Promise<string>` - Get suggestion from AI
- `implement(context: ImplementationContext): Promise<string>` - Implement feature

**Validation Rules**:
- `executable` must be valid command name or path
- `autoApproveFlag` must not be empty for implemented adapters

---

### 10. RepositoryContext

Represents the target repository being automated.

**Fields**:
- `rootPath`: string - Absolute path to repository root
- `hasGit`: boolean - Whether repo is git-initialized
- `hasSpecKit`: boolean - Whether SpecKit is initialized
- `projectType`: ProjectType - Detected project type (Node, Python, Rust, etc.)
- `testFramework`: string | null - Detected test framework
- `linter`: string | null - Detected linter
- `buildTool`: string | null - Detected build tool
- `features`: FeatureSpecification[] - Discovered feature specs

**Validation Rules**:
- `rootPath` must exist and be a directory
- If `hasSpecKit` is true, `.specify/` directory must exist

---

## Enumerations

### ImplementationStatus
```typescript
enum ImplementationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  TESTING = 'testing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}
```

### QualityCheckType
```typescript
enum QualityCheckType {
  TEST = 'test',
  LINT = 'lint',
  BUILD = 'build'
}
```

### AIToolType
```typescript
enum AIToolType {
  COPILOT = 'copilot',
  CLAUDE = 'claude'
}
```

### Priority
```typescript
enum Priority {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4'
}
```

### VerbosityLevel
```typescript
enum VerbosityLevel {
  QUIET = 'quiet',
  NORMAL = 'normal',
  VERBOSE = 'verbose',
  DEBUG = 'debug'
}
```

### Severity
```typescript
enum Severity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}
```

### ProjectType
```typescript
enum ProjectType {
  NODE = 'node',
  PYTHON = 'python',
  RUST = 'rust',
  GO = 'go',
  UNKNOWN = 'unknown'
}
```

---

## Entity Relationships Diagram

```
RepositoryContext
    │
    ├─── FeatureSpecification (1:many)
    │       │
    │       ├─── UserStory (1:many)
    │       │       └─── AcceptanceScenario (1:many)
    │       │
    │       ├─── FunctionalRequirement (1:many)
    │       │
    │       └─── ImplementationProgress (1:1)
    │               └─── QualityCheckResult (1:many)
    │                       └─── FailureDetail (1:many)
    │
    └─── ExecutionSession (1:many)
            └─── LogEntry (1:many)

Configuration (singleton)

AIToolAdapter (factory-created instances)
```

---

## Persistence Strategy

### Files
- **Configuration**: `~/.config/speckit-automate/config.yaml` (user), `.speckit-automate.yaml` (project)
- **State**: `.speckit-automate/state.json` (per repository)
- **Session Logs**: `.speckit-automate/logs/session-{id}.json` (per session)

### In-Memory
- Active `ExecutionSession` during runtime
- `AIToolAdapter` instances cached after detection
- `RepositoryContext` loaded once at startup

### No Database
- File-based storage only (aligns with CLI tool simplicity)
- JSON for structured data (easy parsing, no schema migrations)
- YAML for user-facing config (human-readable)

---

## Data Flow

1. **Initialization**:
   - Load `Configuration` from file hierarchy
   - Create `RepositoryContext` by scanning filesystem
   - Detect `AIToolAdapter` for configured/available tools

2. **Feature Discovery**:
   - Scan `specs/` directory for features
   - Parse each `spec.md` to create `FeatureSpecification`
   - Load `ImplementationProgress` from state file

3. **Implementation Cycle**:
   - Create `ExecutionSession`
   - For each unimplemented feature:
     - Update `ImplementationProgress.status` to IN_PROGRESS
     - Use `AIToolAdapter` to generate code
     - Run `QualityCheck` to create `QualityCheckResult`
     - Parse failures into `FailureDetail` entities
     - If failures, use `AIToolAdapter` to fix (increment `retryCount`)
     - Update `status` to COMPLETED or FAILED
   - Close `ExecutionSession` with final counts

4. **Persistence**:
   - Save `ImplementationProgress` to state file after each feature
   - Append `LogEntry` to session log in real-time
   - Update session summary on completion

---

## Notes

- All dates are ISO 8601 strings in JSON (e.g., "2026-01-07T14:00:00Z")
- All paths are absolute and normalized using `path.normalize()`
- Entity IDs use consistent patterns for easy validation
- State transitions are explicit to prevent invalid states
- Retry logic is bounded to prevent infinite loops
