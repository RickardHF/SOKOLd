/**
 * Minimal SpecKit detection - just checks what exists
 */
import { existsSync } from 'fs';
import { join } from 'path';

export interface ProjectStatus {
  hasSpeckit: boolean;      // .specify folder exists
  hasSpecs: boolean;        // specs/ folder exists
  hasSpec: boolean;         // specs/main/spec.md exists
  hasPlan: boolean;         // specs/main/plan.md exists
  hasTasks: boolean;        // specs/main/tasks.md exists
}

export function detectProject(rootPath: string = process.cwd()): ProjectStatus {
  return {
    hasSpeckit: existsSync(join(rootPath, '.specify')),
    hasSpecs: existsSync(join(rootPath, 'specs')),
    hasSpec: existsSync(join(rootPath, 'specs', 'main', 'spec.md')),
    hasPlan: existsSync(join(rootPath, 'specs', 'main', 'plan.md')),
    hasTasks: existsSync(join(rootPath, 'specs', 'main', 'tasks.md')),
  };
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
