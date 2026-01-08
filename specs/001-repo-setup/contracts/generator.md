# API Contract: Configuration Generator

**Module**: `src/core/setup/speckit-setup.ts` and `src/core/setup/sokold-setup.ts`  
**Version**: 1.0.0  
**Status**: Design

## Overview

Generates speckit or sokold configuration files from templates with personalization based on project metadata.

## Interface (Speckit)

### generateSpeckitConfig

Creates speckit configuration files for a repository.

**Signature**:
```typescript
async function generateSpeckitConfig(
  repoPath: string,
  metadata: ProjectMetadata,
  options?: GeneratorOptions
): Promise<ConfigurationSet>
```

**Parameters**:
- `repoPath` (string): Absolute path to repository root
- `metadata` (ProjectMetadata): Project information for personalization
- `options` (GeneratorOptions, optional): Generation options
  ```typescript
  interface GeneratorOptions {
    preserveCustom?: boolean; // Default: true
    overwrite?: boolean; // Default: false
    backupExisting?: boolean; // Default: true
  }
  ```

**Returns**: Promise<ConfigurationSet>
```typescript
interface ConfigurationSet {
  type: ConfigType;
  rootPath: string;
  files: ConfigFile[];
  customizations: Map<string, any>;
  version: string;
  isComplete: boolean;
  isValid: boolean;
  validationErrors: ValidationError[];
}
```

**Errors**:
- `TemplateNotFoundError`: If required templates missing
- `FileExistsError`: If files exist and overwrite=false
- `WriteError`: If file write operations fail

**Behavior**:
1. Loads speckit templates from `.specify/templates/`
2. Substitutes variables with metadata values:
   - `{{PROJECT_NAME}}` → metadata.name
   - `{{LANGUAGE}}` → metadata.language
   - `{{FRAMEWORK}}` → metadata.framework
   - `{{DATE}}` → current date
   - `{{VERSION}}` → tool version
3. If preserveCustom=true and files exist, merges custom values
4. Creates all required files in `.specify/` directory
5. Validates generated configuration
6. Returns ConfigurationSet with results

**Templates Used**:
- `constitution.md.template` → `.specify/memory/constitution.md`
- `config.yaml.template` → `.specify/config.yaml`
- `plan-template.md` → `.specify/templates/plan-template.md`
- `spec-template.md` → `.specify/templates/spec-template.md`
- `tasks-template.md` → `.specify/templates/tasks-template.md`

**Examples**:

Generate new configuration:
```typescript
const config = await generateSpeckitConfig('/path/to/repo', {
  name: 'my-project',
  language: 'TypeScript',
  framework: 'React',
  projectType: ProjectType.WEB_APP,
  // ... other metadata
});
// Creates .specify/ with all required files
```

Update existing with custom preservation:
```typescript
const config = await generateSpeckitConfig('/path/to/repo', metadata, {
  preserveCustom: true,
  overwrite: true
});
// Merges custom values into new templates
```

**Performance**: < 1 second per configuration

## Interface (Sokold)

### generateSokoldConfig

Creates sokold configuration files for a repository.

**Signature**:
```typescript
async function generateSokoldConfig(
  repoPath: string,
  metadata: ProjectMetadata,
  options?: GeneratorOptions
): Promise<ConfigurationSet>
```

**Parameters**: Same as generateSpeckitConfig

**Returns**: Same as generateSpeckitConfig

**Behavior**: Similar to generateSpeckitConfig but for sokold templates

**Templates Used**:
- `config.yaml.template` → `.sokold/config.yaml`
- `default-prompt.md.template` → `.sokold/prompts/default.md`
- `templates/` → `.sokold/templates/` (directory structure)

**Examples**: Similar to generateSpeckitConfig examples

**Cross-Platform**: All file operations use fs-extra and path.join for compatibility
