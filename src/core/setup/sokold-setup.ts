/**
 * Sokold configuration generator
 * Creates sokold configuration files from templates
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  joinPath,
  pathExists,
  ensureDir,
  writeFile,
  readFile,
  fileContentMatches,
  createBackup
} from '../../utils/filesystem.js';
import {
  substituteVariables,
  createTemplateVariables
} from '../../utils/template-engine.js';
import { TemplateNotFoundError } from '../../utils/errors.js';
import { ProjectMetadata } from '../../types/project-metadata.js';
import {
  ConfigurationSet,
  ConfigType,
  ConfigFile
} from '../../types/configuration-set.js';

/**
 * Generator options
 */
export interface GeneratorOptions {
  preserveCustom?: boolean;
  overwrite?: boolean;
  backupExisting?: boolean;
}

const DEFAULT_OPTIONS: GeneratorOptions = {
  preserveCustom: true,
  overwrite: false,
  backupExisting: true
};

/**
 * Sokold required files and their templates
 */
const SOKOLD_FILES: Array<{ path: string; template: string; required: boolean }> = [
  { path: 'config.yaml', template: 'sokold/config.yaml.template', required: true },
  { path: 'prompts/default.md', template: 'sokold/prompts/default.md.template', required: true }
];

/**
 * Get templates directory path
 */
function getTemplatesDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return joinPath(__dirname, '..', '..', '..', 'templates');
}

/**
 * Extract custom values from existing sokold configuration
 */
export async function extractCustomValues(
  configPath: string
): Promise<Map<string, unknown>> {
  const customizations = new Map<string, unknown>();
  
  if (!(await pathExists(configPath))) {
    return customizations;
  }

  try {
    const content = await readFile(configPath);
    
    if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
      const yaml = await import('yaml');
      const parsed = yaml.parse(content) as Record<string, unknown>;
      
      for (const [key, value] of Object.entries(parsed)) {
        customizations.set(key, value);
      }
    }
  } catch {
    // If parsing fails, return empty customizations
  }

  return customizations;
}

/**
 * Generate sokold configuration for a repository
 */
export async function generateSokoldConfig(
  repoPath: string,
  metadata: ProjectMetadata,
  options: GeneratorOptions = {}
): Promise<ConfigurationSet> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const templatesDir = getTemplatesDir();
  const sokoldPath = joinPath(repoPath, '.sokold');
  
  const configSet: ConfigurationSet = {
    type: ConfigType.SOKOLD,
    rootPath: sokoldPath,
    files: [],
    customizations: new Map(),
    version: '1.0.0',
    isComplete: true,
    isValid: true,
    validationErrors: []
  };

  // Create template variables
  const variables = createTemplateVariables(
    metadata.name,
    metadata.language,
    metadata.framework,
    '1.0.0'
  );

  // Ensure .sokold directory structure exists
  await ensureDir(sokoldPath);
  await ensureDir(joinPath(sokoldPath, 'prompts'));
  await ensureDir(joinPath(sokoldPath, 'templates'));

  // Generate each configuration file
  for (const fileSpec of SOKOLD_FILES) {
    const targetPath = joinPath(sokoldPath, fileSpec.path);
    const templatePath = joinPath(templatesDir, fileSpec.template);

    const configFile: ConfigFile = {
      path: fileSpec.path,
      required: fileSpec.required,
      template: fileSpec.template,
      exists: false,
      isValid: true,
      customized: false
    };

    // Check if template exists
    if (!(await pathExists(templatePath))) {
      if (fileSpec.required) {
        throw new TemplateNotFoundError(templatePath);
      }
      continue;
    }

    // Check if target file already exists
    const targetExists = await pathExists(targetPath);
    configFile.exists = targetExists;

    if (targetExists && !opts.overwrite) {
      configFile.customized = true;
      
      const customs = await extractCustomValues(targetPath);
      for (const [key, value] of customs.entries()) {
        configSet.customizations.set(`${fileSpec.path}:${key}`, value);
      }
      
      configSet.files.push(configFile);
      continue;
    }

    // Backup existing file if needed
    if (targetExists && opts.backupExisting) {
      await createBackup(targetPath);
    }

    // Load and substitute template
    const templateContent = await readFile(templatePath);
    const generatedContent = substituteVariables(templateContent, variables);

    // Check if content actually changed
    if (targetExists && await fileContentMatches(targetPath, generatedContent)) {
      configFile.customized = false;
      configSet.files.push(configFile);
      continue;
    }

    // Write the generated file
    await ensureDir(path.dirname(targetPath));
    await writeFile(targetPath, generatedContent);
    configFile.exists = true;
    configSet.files.push(configFile);
  }

  return configSet;
}
