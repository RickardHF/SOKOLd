/**
 * Repository state detection module
 * Detects the current configuration state of a repository
 */

import { glob } from 'glob';
import * as path from 'path';
import {
  pathExists,
  isDirectory,
  joinPath
} from '../../utils/filesystem.js';
import { InvalidPathError } from '../../utils/errors.js';
import {
  RepositoryState,
  RepositoryStateType
} from '../../types/repository-state.js';

/**
 * Default file patterns to exclude from source file scanning
 */
const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  'coverage/**',
  '.specify/**',
  '.sokold/**',
  '*.log',
  '*.lock'
];

/**
 * Source file extensions to detect
 */
const SOURCE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.pyw',
  '.go',
  '.rs',
  '.java', '.kt', '.scala',
  '.cs', '.fs',
  '.rb',
  '.php',
  '.swift',
  '.c', '.cpp', '.h', '.hpp',
  '.vue', '.svelte'
];

/**
 * Check if repository has source files
 */
export async function hasSourceFiles(
  repoPath: string,
  excludePatterns: string[] = DEFAULT_EXCLUDE_PATTERNS
): Promise<boolean> {
  const patterns = SOURCE_EXTENSIONS.map(ext => `**/*${ext}`);
  
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: repoPath,
      ignore: excludePatterns,
      nodir: true,
      absolute: false,
      maxDepth: 10
    });
    
    if (files.length > 0) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if speckit configuration exists (.specify directory)
 */
async function hasSpeckitConfig(repoPath: string): Promise<boolean> {
  const specifyPath = joinPath(repoPath, '.specify');
  return await pathExists(specifyPath) && await isDirectory(specifyPath);
}

/**
 * Check if sokold configuration exists (.sokold directory)
 */
async function hasSokoldConfig(repoPath: string): Promise<boolean> {
  const sokoldPath = joinPath(repoPath, '.sokold');
  return await pathExists(sokoldPath) && await isDirectory(sokoldPath);
}

/**
 * Determine repository state type based on detection results
 */
function determineStateType(
  hasSpeckit: boolean,
  hasSokold: boolean,
  hasSources: boolean,
  isValid: boolean
): RepositoryStateType {
  // Check for corrupted state first
  if ((hasSpeckit || hasSokold) && !isValid) {
    return RepositoryStateType.CORRUPTED;
  }

  // Both configs present and valid
  if (hasSpeckit && hasSokold) {
    return RepositoryStateType.FULL;
  }

  // Only speckit present
  if (hasSpeckit && !hasSokold) {
    return RepositoryStateType.PARTIAL_SPECKIT;
  }

  // Only sokold present
  if (!hasSpeckit && hasSokold) {
    return RepositoryStateType.PARTIAL_SOKOLD;
  }

  // No configs - check for source files
  if (hasSources) {
    return RepositoryStateType.UNCONFIGURED;
  }

  // Empty repository
  return RepositoryStateType.EMPTY;
}

/**
 * Detect the current configuration state of a repository
 */
export async function detectRepositoryState(
  repoPath: string
): Promise<RepositoryState> {
  // Validate repository path
  const resolvedPath = path.resolve(repoPath);
  
  if (!(await pathExists(resolvedPath))) {
    throw new InvalidPathError(resolvedPath);
  }
  
  if (!(await isDirectory(resolvedPath))) {
    throw new InvalidPathError(`${resolvedPath} is not a directory`);
  }

  // Detect configuration presence
  const hasSpeckit = await hasSpeckitConfig(resolvedPath);
  const hasSokold = await hasSokoldConfig(resolvedPath);
  const hasSources = await hasSourceFiles(resolvedPath);
  
  // For now, assume configs are valid if they exist
  // Full validation will be implemented in validator.ts
  const isValid = true;

  // Determine state type
  const type = determineStateType(hasSpeckit, hasSokold, hasSources, isValid);

  return {
    type,
    hasSpeckit,
    hasSokold,
    hasSourceFiles: hasSources,
    isValid,
    rootPath: resolvedPath,
    detectedAt: new Date()
  };
}
