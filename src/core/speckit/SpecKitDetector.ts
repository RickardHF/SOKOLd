import { pathExists, joinPath } from '../../utils/filesystem.js';
import { glob } from 'glob';

export class SpecKitDetector {
  async isInitialized(rootPath: string): Promise<boolean> {
    const specifyPath = joinPath(rootPath, '.specify');
    return pathExists(specifyPath);
  }

  async hasSpecs(rootPath: string): Promise<boolean> {
    const specsPath = joinPath(rootPath, 'specs');
    return pathExists(specsPath);
  }

  async hasSpec(rootPath: string): Promise<boolean> {
    const specFiles = await glob('specs/**/spec.md', { cwd: rootPath });
    return specFiles.length > 0;
  }

  async hasPlan(rootPath: string): Promise<boolean> {
    const planFiles = await glob('specs/**/plan.md', { cwd: rootPath });
    return planFiles.length > 0;
  }

  async hasTasks(rootPath: string): Promise<boolean> {
    const taskFiles = await glob('specs/**/tasks.md', { cwd: rootPath });
    return taskFiles.length > 0;
  }

  async hasConstitution(rootPath: string): Promise<boolean> {
    const constitutionPath = joinPath(rootPath, '.specify', 'memory', 'constitution.md');
    return pathExists(constitutionPath);
  }

  async hasTemplates(rootPath: string): Promise<boolean> {
    const templatesPath = joinPath(rootPath, '.specify', 'templates');
    return pathExists(templatesPath);
  }

  async getStatus(rootPath: string): Promise<{
    initialized: boolean;
    hasSpecs: boolean;
    hasSpec: boolean;
    hasPlan: boolean;
    hasTasks: boolean;
    hasConstitution: boolean;
    hasTemplates: boolean;
  }> {
    return {
      initialized: await this.isInitialized(rootPath),
      hasSpecs: await this.hasSpecs(rootPath),
      hasSpec: await this.hasSpec(rootPath),
      hasPlan: await this.hasPlan(rootPath),
      hasTasks: await this.hasTasks(rootPath),
      hasConstitution: await this.hasConstitution(rootPath),
      hasTemplates: await this.hasTemplates(rootPath),
    };
  }
}
