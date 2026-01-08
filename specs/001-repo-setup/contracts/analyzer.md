# API Contract: Code Analyzer

**Module**: `src/core/state/analyzer.ts`  
**Version**: 1.0.0  
**Status**: Design

## Overview

Analyzes existing code in a repository to detect programming language, framework, and project structure.

## Interface

### analyzeCodebase

Scans repository files to determine project metadata.

**Signature**:
```typescript
async function analyzeCodebase(
  repoPath: string,
  options?: AnalyzerOptions
): Promise<ProjectMetadata>
```

**Parameters**:
- `repoPath` (string): Absolute path to repository root
- `options` (AnalyzerOptions, optional): Analysis configuration
  ```typescript
  interface AnalyzerOptions {
    maxFilesToScan?: number; // Default: 10000
    excludePaths?: string[]; // Default: ['node_modules', '.git', 'dist', 'build']
    minConfidence?: number; // Default: 70 (0-100)
  }
  ```

**Returns**: Promise<ProjectMetadata>
```typescript
interface ProjectMetadata {
  name: string;
  language: string;
  framework: string | null;
  testFramework: string | null;
  projectType: ProjectType;
  directoryStructure: DirectoryInfo[];
  dependencies: Dependency[];
  detectionMethod: 'user-input' | 'code-analysis' | 'hybrid';
  confidence: number;
}

enum ProjectType {
  CLI = 'CLI',
  WEB_APP = 'WEB_APP',
  API = 'API',
  LIBRARY = 'LIBRARY',
  MOBILE = 'MOBILE',
  DESKTOP = 'DESKTOP',
  UNKNOWN = 'UNKNOWN'
}
```

**Errors**:
- `InvalidPathError`: If repoPath does not exist
- `NoSourceFilesError`: If no source files found
- `AmbiguousProjectError`: If confidence < minConfidence and multiple languages detected equally

**Behavior**:
1. Scans repoPath for source files (respecting excludePaths)
2. Detects language by:
   - Checking manifest files (package.json, requirements.txt, Cargo.toml, etc.)
   - Counting file extensions (.ts, .py, .rs, .go, .java)
   - Choosing language with highest file count
3. Detects framework by:
   - Inspecting dependencies in manifest files
   - Looking for framework-specific patterns (e.g., App.tsx for React)
4. Infers project type from structure and framework
5. Calculates confidence score based on detection clarity
6. Returns ProjectMetadata with all findings

**Examples**:

TypeScript + React project:
```typescript
const metadata = await analyzeCodebase('/path/to/react-app');
// Returns: { name: 'react-app', language: 'TypeScript', 
//            framework: 'React', projectType: 'WEB_APP', confidence: 95, ... }
```

Python + FastAPI project:
```typescript
const metadata = await analyzeCodebase('/path/to/api-server');
// Returns: { name: 'api-server', language: 'Python',
//            framework: 'FastAPI', projectType: 'API', confidence: 90, ... }
```

Polyglot project (ambiguous):
```typescript
try {
  const metadata = await analyzeCodebase('/path/to/polyglot', { minConfidence: 70 });
} catch (error) {
  // Throws AmbiguousProjectError with detected languages for user to choose
}
```

**Performance**: < 5 seconds for repos with < 10k files

**Supported Languages** (Phase 1):
- JavaScript/TypeScript (Node.js, React, Vue, Angular, Express)
- Python (FastAPI, Django, Flask)
- Go (standard library)
- Rust (Cargo ecosystem)
- Java (Maven, Gradle, Spring Boot)

**Cross-Platform**: Uses glob patterns and path operations compatible with all platforms
