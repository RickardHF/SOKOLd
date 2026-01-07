import * as path from 'path';
import { ensureDir, writeFile, pathExists, joinPath } from '../../utils/filesystem.js';
import { TemplateManager } from './TemplateManager.js';

export interface InitOptions {
  force?: boolean;
  minimal?: boolean;
}

export interface InitResult {
  success: boolean;
  filesCreated: string[];
  dirsCreated: string[];
  alreadyExisted: string[];
  errors: string[];
}

export class SpecKitInitializer {
  private templateManager: TemplateManager;

  constructor() {
    this.templateManager = new TemplateManager();
  }

  async initialize(rootPath: string, options: InitOptions = {}): Promise<InitResult> {
    const result: InitResult = {
      success: false,
      filesCreated: [],
      dirsCreated: [],
      alreadyExisted: [],
      errors: [],
    };

    try {
      // Check if already initialized
      const specifyPath = joinPath(rootPath, '.specify');
      if (await pathExists(specifyPath) && !options.force) {
        result.alreadyExisted.push('.specify');
        return result;
      }

      // Create directory structure
      const dirs = [
        joinPath(rootPath, '.specify', 'memory'),
        joinPath(rootPath, '.specify', 'templates'),
        joinPath(rootPath, '.specify', 'scripts'),
        joinPath(rootPath, 'specs'),
      ];

      for (const dir of dirs) {
        if (!await pathExists(dir)) {
          await ensureDir(dir);
          result.dirsCreated.push(path.relative(rootPath, dir));
        } else {
          result.alreadyExisted.push(path.relative(rootPath, dir));
        }
      }

      // Create constitution.md
      const constitutionPath = joinPath(rootPath, '.specify', 'memory', 'constitution.md');
      if (!await pathExists(constitutionPath) || options.force) {
        const constitutionContent = this.templateManager.getConstitutionTemplate();
        await writeFile(constitutionPath, constitutionContent);
        result.filesCreated.push('.specify/memory/constitution.md');
      }

      // Create templates (unless minimal mode)
      if (!options.minimal) {
        const templates = this.templateManager.getAllTemplates();
        for (const [name, content] of Object.entries(templates)) {
          const templatePath = joinPath(rootPath, '.specify', 'templates', name);
          if (!await pathExists(templatePath) || options.force) {
            await writeFile(templatePath, content);
            result.filesCreated.push(`.specify/templates/${name}`);
          }
        }
      }

      result.success = true;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }
}
