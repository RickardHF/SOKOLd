/**
 * Minimal SpecKit detection - just checks what exists
 */
import { existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

export interface ProjectStatus {
  hasSpeckit: boolean;      // .specify folder exists
  hasSpecs: boolean;        // specs/ folder exists
  hasSpec: boolean;         // specs/main/spec.md exists
  hasPlan: boolean;         // specs/main/plan.md exists
  hasTasks: boolean;        // specs/main/tasks.md exists
  hasConstitution: boolean; // .specify/memory/constitution.md exists
  hasExistingCode: boolean; // src/ or other code directories exist
}

export function detectProject(rootPath: string = process.cwd()): ProjectStatus {
  return {
    hasSpeckit: existsSync(join(rootPath, '.specify')),
    hasSpecs: existsSync(join(rootPath, 'specs')),
    hasSpec: existsSync(join(rootPath, 'specs', 'main', 'spec.md')),
    hasPlan: existsSync(join(rootPath, 'specs', 'main', 'plan.md')),
    hasTasks: existsSync(join(rootPath, 'specs', 'main', 'tasks.md')),
    hasConstitution: existsSync(join(rootPath, '.specify', 'memory', 'constitution.md')),
    hasExistingCode: detectExistingCode(rootPath),
  };
}

/**
 * Detect if the project has existing code (not just config files)
 */
function detectExistingCode(rootPath: string): boolean {
  const codeDirs = ['src', 'lib', 'app', 'packages', 'source'];
  const codeExtensions = ['.ts', '.js', '.py', '.go', '.rs', '.java', '.cs', '.rb'];
  
  // Check for common source directories
  for (const dir of codeDirs) {
    if (existsSync(join(rootPath, dir))) {
      return true;
    }
  }
  
  // Check for code files in root (excluding config files)
  try {
    const rootFiles = readdirSync(rootPath);
    for (const file of rootFiles) {
      const ext = extname(file).toLowerCase();
      if (codeExtensions.includes(ext)) {
        const stat = statSync(join(rootPath, file));
        if (stat.isFile()) {
          return true;
        }
      }
    }
  } catch {
    // Ignore read errors
  }
  
  return false;
}

export function getNextStep(status: ProjectStatus, hasDescription: boolean): string | null {
  // If user provided a description, always start fresh with specify
  if (hasDescription) {
    return 'specify';
  }
  
  // Otherwise, figure out where to continue
  if (!status.hasSpec) return null; // Nothing to continue
  if (!status.hasPlan) return 'plan';
  if (!status.hasTasks) return 'tasks';
  return 'implement';
}
