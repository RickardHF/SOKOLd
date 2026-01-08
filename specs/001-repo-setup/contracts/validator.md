# API Contract: Configuration Validator

**Module**: `src/core/state/validator.ts`  
**Version**: 1.0.0  
**Status**: Design

## Overview

Validates existing speckit and sokold configurations for completeness and correctness.

## Interface

### validateConfiguration

Checks if a configuration set is complete and valid.

**Signature**:
```typescript
async function validateConfiguration(
  configPath: string,
  configType: ConfigType
): Promise<ValidationResult>
```

**Parameters**:
- `configPath` (string): Absolute path to configuration directory (.specify/ or .sokold/)
- `configType` (ConfigType): Type of configuration to validate
  ```typescript
  enum ConfigType {
    SPECKIT = 'SPECKIT',
    SOKOLD = 'SOKOLD'
  }
  ```

**Returns**: Promise<ValidationResult>
```typescript
interface ValidationResult {
  isValid: boolean;
  isComplete: boolean;
  version: string | null;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  missingFiles: string[];
  invalidFiles: string[];
}

interface ValidationError {
  path: string;
  field: string | null;
  message: string;
  severity: 'error';
  code: string;
}

interface ValidationWarning {
  path: string;
  message: string;
  severity: 'warning';
  code: string;
}
```

**Errors**:
- `InvalidPathError`: If configPath does not exist
- `UnsupportedConfigTypeError`: If configType is not recognized

**Behavior**:
1. Checks all required files exist for configType
2. Parses configuration files (YAML, Markdown, etc.)
3. Validates against schema for that configType
4. Checks for deprecated settings
5. Returns validation result with detailed errors/warnings

**Required Files by Type**:

Speckit (ConfigType.SPECKIT):
- `.specify/memory/constitution.md`
- `.specify/scripts/powershell/setup-plan.ps1`
- `.specify/scripts/powershell/update-agent-context.ps1`
- `.specify/templates/plan-template.md`
- `.specify/templates/spec-template.md`
- `.specify/templates/tasks-template.md`

Sokold (ConfigType.SOKOLD):
- `.sokold/config.yaml`
- `.sokold/prompts/default.md`
- `.sokold/templates/` (directory)

**Examples**:

Valid configuration:
```typescript
const result = await validateConfiguration('/path/to/repo/.specify', ConfigType.SPECKIT);
// Returns: { isValid: true, isComplete: true, errors: [], warnings: [], ... }
```

Missing files:
```typescript
const result = await validateConfiguration('/path/to/repo/.sokold', ConfigType.SOKOLD);
// Returns: { isValid: false, isComplete: false, 
//            missingFiles: ['.sokold/config.yaml'],
//            errors: [{message: 'Required file missing: config.yaml', ...}] }
```

Invalid YAML:
```typescript
const result = await validateConfiguration('/path/to/repo/.sokold', ConfigType.SOKOLD);
// Returns: { isValid: false, isComplete: true,
//            invalidFiles: ['.sokold/config.yaml'],
//            errors: [{message: 'Invalid YAML syntax at line 5', ...}] }
```

**Performance**: < 500ms per configuration

**Cross-Platform**: File path validation works on all platforms
