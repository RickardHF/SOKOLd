import { pathExists, isDirectory, findGitRoot, findSpecKitRoot, joinPath } from '../../utils/filesystem.js';

export enum ProjectType {
  NODE = 'node',
  PYTHON = 'python',
  RUST = 'rust',
  GO = 'go',
  UNKNOWN = 'unknown',
}

export interface RepositoryContextData {
  rootPath: string;
  hasGit: boolean;
  hasSpecKit: boolean;
  projectType: ProjectType;
  testFramework: string | null;
  linter: string | null;
  buildTool: string | null;
  specsDirPath: string | null;
}

export class RepositoryContext {
  private data: RepositoryContextData;

  private constructor(data: RepositoryContextData) {
    this.data = data;
  }

  static async detect(startPath: string = process.cwd()): Promise<RepositoryContext> {
    const gitRoot = await findGitRoot(startPath);
    const specKitRoot = await findSpecKitRoot(startPath);
    
    const rootPath = specKitRoot ?? gitRoot ?? startPath;
    const hasGit = gitRoot !== null;
    const hasSpecKit = specKitRoot !== null;

    const projectType = await RepositoryContext.detectProjectType(rootPath);
    const testFramework = await RepositoryContext.detectTestFramework(rootPath, projectType);
    const linter = await RepositoryContext.detectLinter(rootPath, projectType);
    const buildTool = await RepositoryContext.detectBuildTool(rootPath, projectType);
    
    const specsPath = joinPath(rootPath, 'specs');
    const specsDirPath = await pathExists(specsPath) && await isDirectory(specsPath) ? specsPath : null;

    return new RepositoryContext({
      rootPath,
      hasGit,
      hasSpecKit,
      projectType,
      testFramework,
      linter,
      buildTool,
      specsDirPath,
    });
  }

  private static async detectProjectType(rootPath: string): Promise<ProjectType> {
    // Check for Node.js
    if (await pathExists(joinPath(rootPath, 'package.json'))) {
      return ProjectType.NODE;
    }
    // Check for Python
    if (await pathExists(joinPath(rootPath, 'setup.py')) || 
        await pathExists(joinPath(rootPath, 'pyproject.toml')) ||
        await pathExists(joinPath(rootPath, 'requirements.txt'))) {
      return ProjectType.PYTHON;
    }
    // Check for Rust
    if (await pathExists(joinPath(rootPath, 'Cargo.toml'))) {
      return ProjectType.RUST;
    }
    // Check for Go
    if (await pathExists(joinPath(rootPath, 'go.mod'))) {
      return ProjectType.GO;
    }
    return ProjectType.UNKNOWN;
  }

  private static async detectTestFramework(rootPath: string, projectType: ProjectType): Promise<string | null> {
    switch (projectType) {
      case ProjectType.NODE:
        if (await pathExists(joinPath(rootPath, 'jest.config.js')) ||
            await pathExists(joinPath(rootPath, 'jest.config.ts'))) {
          return 'jest';
        }
        if (await pathExists(joinPath(rootPath, 'vitest.config.ts'))) {
          return 'vitest';
        }
        // Check package.json for test script
        return 'npm test';
      case ProjectType.PYTHON:
        if (await pathExists(joinPath(rootPath, 'pytest.ini')) ||
            await pathExists(joinPath(rootPath, 'pyproject.toml'))) {
          return 'pytest';
        }
        return 'python -m pytest';
      case ProjectType.RUST:
        return 'cargo test';
      case ProjectType.GO:
        return 'go test';
      default:
        return null;
    }
  }

  private static async detectLinter(rootPath: string, projectType: ProjectType): Promise<string | null> {
    switch (projectType) {
      case ProjectType.NODE:
        if (await pathExists(joinPath(rootPath, '.eslintrc.js')) ||
            await pathExists(joinPath(rootPath, '.eslintrc.json')) ||
            await pathExists(joinPath(rootPath, 'eslint.config.js'))) {
          return 'eslint';
        }
        return null;
      case ProjectType.PYTHON:
        return 'pylint';
      case ProjectType.RUST:
        return 'cargo clippy';
      case ProjectType.GO:
        return 'golint';
      default:
        return null;
    }
  }

  private static async detectBuildTool(rootPath: string, projectType: ProjectType): Promise<string | null> {
    switch (projectType) {
      case ProjectType.NODE:
        if (await pathExists(joinPath(rootPath, 'tsconfig.json'))) {
          return 'tsc';
        }
        return 'npm run build';
      case ProjectType.PYTHON:
        return 'python setup.py build';
      case ProjectType.RUST:
        return 'cargo build';
      case ProjectType.GO:
        return 'go build';
      default:
        return null;
    }
  }

  get rootPath(): string {
    return this.data.rootPath;
  }

  get hasGit(): boolean {
    return this.data.hasGit;
  }

  get hasSpecKit(): boolean {
    return this.data.hasSpecKit;
  }

  get projectType(): ProjectType {
    return this.data.projectType;
  }

  get testFramework(): string | null {
    return this.data.testFramework;
  }

  get linter(): string | null {
    return this.data.linter;
  }

  get buildTool(): string | null {
    return this.data.buildTool;
  }

  get specsDirPath(): string | null {
    return this.data.specsDirPath;
  }

  toJSON(): RepositoryContextData {
    return { ...this.data };
  }
}
