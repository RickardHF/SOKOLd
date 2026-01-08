/**
 * Code analyzer module
 * Analyzes existing code or user description to extract project metadata
 */

import { glob } from 'glob';
import * as path from 'path';
import { joinPath, pathExists, readFile } from '../../utils/filesystem.js';
import { NoSourceFilesError, AmbiguityError } from '../../utils/errors.js';
import {
  ProjectMetadata,
  ProjectType,
  DirectoryInfo,
  Dependency
} from '../../types/project-metadata.js';

/**
 * Language detection patterns and file extensions
 */
const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  'TypeScript': ['.ts', '.tsx'],
  'JavaScript': ['.js', '.jsx', '.mjs', '.cjs'],
  'Python': ['.py', '.pyw'],
  'Go': ['.go'],
  'Rust': ['.rs'],
  'Java': ['.java'],
  'C#': ['.cs'],
  'Ruby': ['.rb'],
  'PHP': ['.php'],
  'Swift': ['.swift'],
  'Kotlin': ['.kt', '.kts']
};

/**
 * Framework detection patterns based on dependencies
 */
const FRAMEWORK_PATTERNS: Record<string, { deps: string[]; files?: string[] }> = {
  'React': { deps: ['react', 'react-dom'], files: ['*.tsx', '*.jsx'] },
  'Vue': { deps: ['vue'], files: ['*.vue'] },
  'Angular': { deps: ['@angular/core'] },
  'Express': { deps: ['express'] },
  'NestJS': { deps: ['@nestjs/core'] },
  'FastAPI': { deps: ['fastapi'] },
  'Django': { deps: ['django'] },
  'Flask': { deps: ['flask'] },
  'Spring Boot': { deps: ['spring-boot-starter'] },
  'Gin': { deps: ['github.com/gin-gonic/gin'] },
  'Echo': { deps: ['github.com/labstack/echo'] },
  'Actix': { deps: ['actix-web'] },
  'Rocket': { deps: ['rocket'] }
};

/**
 * Test framework detection patterns
 */
const TEST_FRAMEWORK_PATTERNS: Record<string, string[]> = {
  'Jest': ['jest', '@jest/core'],
  'Mocha': ['mocha'],
  'pytest': ['pytest'],
  'unittest': [], // Python built-in
  'go test': [], // Go built-in
  'JUnit': ['junit'],
  'RSpec': ['rspec'],
  'PHPUnit': ['phpunit']
};

/**
 * Analyzer options
 */
export interface AnalyzerOptions {
  maxFilesToScan?: number;
  excludePaths?: string[];
  minConfidence?: number;
}

const DEFAULT_OPTIONS: AnalyzerOptions = {
  maxFilesToScan: 10000,
  excludePaths: ['node_modules', '.git', 'dist', 'build', 'coverage', '.specify', '.sokold'],
  minConfidence: 70
};

/**
 * Parse user description to extract project metadata
 */
export function parseUserDescription(description: string): Partial<ProjectMetadata> {
  const metadata: Partial<ProjectMetadata> = {
    detectionMethod: 'user-input',
    confidence: 100
  };

  // Extract project name (first capitalized word or quoted string)
  const nameMatch = description.match(/"([^"]+)"|'([^']+)'|^(\w+)/);
  if (nameMatch) {
    metadata.name = nameMatch[1] ?? nameMatch[2] ?? nameMatch[3];
  }

  // Detect language mentions
  const languageKeywords: Record<string, string> = {
    'typescript': 'TypeScript',
    'javascript': 'JavaScript',
    'python': 'Python',
    'go': 'Go',
    'golang': 'Go',
    'rust': 'Rust',
    'java': 'Java',
    'csharp': 'C#',
    'c#': 'C#',
    'ruby': 'Ruby',
    'php': 'PHP'
  };

  const lowerDesc = description.toLowerCase();
  for (const [keyword, language] of Object.entries(languageKeywords)) {
    if (lowerDesc.includes(keyword)) {
      metadata.language = language;
      break;
    }
  }

  // Detect framework mentions
  const frameworkKeywords: Record<string, string> = {
    'react': 'React',
    'vue': 'Vue',
    'angular': 'Angular',
    'express': 'Express',
    'fastapi': 'FastAPI',
    'django': 'Django',
    'flask': 'Flask',
    'spring': 'Spring Boot',
    'nestjs': 'NestJS',
    'nest.js': 'NestJS'
  };

  for (const [keyword, framework] of Object.entries(frameworkKeywords)) {
    if (lowerDesc.includes(keyword)) {
      metadata.framework = framework;
      break;
    }
  }

  // Detect project type mentions
  const typeKeywords: Record<string, ProjectType> = {
    'cli': ProjectType.CLI,
    'command-line': ProjectType.CLI,
    'web app': ProjectType.WEB_APP,
    'webapp': ProjectType.WEB_APP,
    'website': ProjectType.WEB_APP,
    'api': ProjectType.API,
    'rest api': ProjectType.API,
    'backend': ProjectType.API,
    'library': ProjectType.LIBRARY,
    'package': ProjectType.LIBRARY,
    'mobile': ProjectType.MOBILE,
    'desktop': ProjectType.DESKTOP
  };

  for (const [keyword, projectType] of Object.entries(typeKeywords)) {
    if (lowerDesc.includes(keyword)) {
      metadata.projectType = projectType;
      break;
    }
  }

  return metadata;
}

/**
 * Count files by extension in a directory
 */
async function countFilesByExtension(
  repoPath: string,
  options: AnalyzerOptions
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const ignorePatterns = (options.excludePaths ?? []).map(p => `${p}/**`);

  for (const [language, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
    let total = 0;
    for (const ext of extensions) {
      const files = await glob(`**/*${ext}`, {
        cwd: repoPath,
        ignore: ignorePatterns,
        nodir: true,
        maxDepth: 10
      });
      total += Math.min(files.length, options.maxFilesToScan ?? 10000);
    }
    if (total > 0) {
      counts.set(language, total);
    }
  }

  return counts;
}

/**
 * Detect primary language from file counts
 */
function detectLanguage(
  fileCounts: Map<string, number>
): { language: string; confidence: number } {
  if (fileCounts.size === 0) {
    return { language: 'Unknown', confidence: 0 };
  }

  const total = Array.from(fileCounts.values()).reduce((a, b) => a + b, 0);
  let maxLanguage = 'Unknown';
  let maxCount = 0;

  for (const [language, count] of fileCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      maxLanguage = language;
    }
  }

  // TypeScript takes precedence over JavaScript if both exist
  const tsCount = fileCounts.get('TypeScript') ?? 0;
  const jsCount = fileCounts.get('JavaScript') ?? 0;
  if (tsCount > 0 && jsCount > 0 && maxLanguage === 'JavaScript') {
    maxLanguage = 'TypeScript';
    maxCount = tsCount;
  }

  const confidence = Math.round((maxCount / total) * 100);
  return { language: maxLanguage, confidence };
}

/**
 * Parse package.json for dependencies
 */
async function parsePackageJson(repoPath: string): Promise<Dependency[]> {
  const pkgPath = joinPath(repoPath, 'package.json');
  if (!(await pathExists(pkgPath))) {
    return [];
  }

  try {
    const content = await readFile(pkgPath);
    const pkg = JSON.parse(content) as Record<string, unknown>;
    const dependencies: Dependency[] = [];

    const deps = pkg.dependencies as Record<string, string> | undefined;
    if (deps) {
      for (const [name, version] of Object.entries(deps)) {
        dependencies.push({ name, version, type: 'runtime', source: 'package.json' });
      }
    }

    const devDeps = pkg.devDependencies as Record<string, string> | undefined;
    if (devDeps) {
      for (const [name, version] of Object.entries(devDeps)) {
        dependencies.push({ name, version, type: 'dev', source: 'package.json' });
      }
    }

    return dependencies;
  } catch {
    return [];
  }
}

/**
 * Parse requirements.txt for Python dependencies
 */
async function parseRequirementsTxt(repoPath: string): Promise<Dependency[]> {
  const reqPath = joinPath(repoPath, 'requirements.txt');
  if (!(await pathExists(reqPath))) {
    return [];
  }

  try {
    const content = await readFile(reqPath);
    const dependencies: Dependency[] = [];

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:==|>=|<=|~=)?(.+)?$/);
        if (match) {
          dependencies.push({
            name: match[1],
            version: match[2] ?? null,
            type: 'runtime',
            source: 'requirements.txt'
          });
        }
      }
    }

    return dependencies;
  } catch {
    return [];
  }
}

/**
 * Detect framework from dependencies
 */
function detectFramework(dependencies: Dependency[]): string | null {
  const depNames = new Set(dependencies.map(d => d.name.toLowerCase()));

  for (const [framework, pattern] of Object.entries(FRAMEWORK_PATTERNS)) {
    const hasAllDeps = pattern.deps.every(dep => 
      depNames.has(dep.toLowerCase()) || 
      Array.from(depNames).some(d => d.includes(dep.toLowerCase()))
    );
    if (hasAllDeps) {
      return framework;
    }
  }

  return null;
}

/**
 * Detect test framework from dependencies
 */
function detectTestFramework(dependencies: Dependency[]): string | null {
  const depNames = new Set(dependencies.map(d => d.name.toLowerCase()));

  for (const [framework, deps] of Object.entries(TEST_FRAMEWORK_PATTERNS)) {
    if (deps.length === 0) continue;
    if (deps.some(dep => depNames.has(dep.toLowerCase()))) {
      return framework;
    }
  }

  return null;
}

/**
 * Infer project type from framework and structure
 */
function inferProjectType(
  framework: string | null,
  hasBinDir: boolean,
  hasSrcDir: boolean
): ProjectType {
  if (framework) {
    if (['React', 'Vue', 'Angular'].includes(framework)) {
      return ProjectType.WEB_APP;
    }
    if (['Express', 'FastAPI', 'Django', 'Flask', 'NestJS', 'Spring Boot', 'Gin', 'Echo', 'Actix', 'Rocket'].includes(framework)) {
      return ProjectType.API;
    }
  }

  if (hasBinDir) {
    return ProjectType.CLI;
  }

  if (hasSrcDir) {
    return ProjectType.LIBRARY;
  }

  return ProjectType.UNKNOWN;
}

/**
 * Analyze directory structure
 */
async function analyzeDirectoryStructure(repoPath: string): Promise<DirectoryInfo[]> {
  const dirs: DirectoryInfo[] = [];
  const commonDirs = ['src', 'lib', 'bin', 'tests', 'test', 'docs', 'examples'];

  for (const dirName of commonDirs) {
    const dirPath = joinPath(repoPath, dirName);
    if (await pathExists(dirPath)) {
      const files = await glob('**/*', {
        cwd: dirPath,
        nodir: true,
        ignore: ['node_modules/**', '.git/**']
      });
      dirs.push({
        path: dirName,
        purpose: dirName,
        fileCount: files.length
      });
    }
  }

  return dirs;
}

/**
 * Analyze codebase to extract project metadata
 */
export async function analyzeCodebase(
  repoPath: string,
  options: AnalyzerOptions = {}
): Promise<ProjectMetadata> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Count files by extension
  const fileCounts = await countFilesByExtension(repoPath, opts);
  
  if (fileCounts.size === 0) {
    throw new NoSourceFilesError(repoPath);
  }

  // Detect language
  const { language, confidence } = detectLanguage(fileCounts);

  // Check for ambiguity
  if (confidence < (opts.minConfidence ?? 70)) {
    const languages = Array.from(fileCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([lang, count]) => `${lang} (${Math.round((count / Array.from(fileCounts.values()).reduce((a, b) => a + b, 0)) * 100)}%)`);
    
    throw new AmbiguityError(
      `Multiple languages detected with similar prevalence`,
      languages
    );
  }

  // Parse dependencies
  const dependencies = [
    ...(await parsePackageJson(repoPath)),
    ...(await parseRequirementsTxt(repoPath))
  ];

  // Detect framework and test framework
  const framework = detectFramework(dependencies);
  const testFramework = detectTestFramework(dependencies);

  // Analyze directory structure
  const directoryStructure = await analyzeDirectoryStructure(repoPath);
  const hasBinDir = directoryStructure.some(d => d.path === 'bin');
  const hasSrcDir = directoryStructure.some(d => d.path === 'src' || d.path === 'lib');

  // Infer project type
  const projectType = inferProjectType(framework, hasBinDir, hasSrcDir);

  // Get project name from directory name
  const name = path.basename(repoPath);

  return {
    name,
    language,
    framework,
    testFramework,
    projectType,
    directoryStructure,
    dependencies,
    detectionMethod: 'code-analysis',
    confidence
  };
}
