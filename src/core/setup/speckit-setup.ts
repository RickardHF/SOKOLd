/**
 * Speckit configuration generator
 * Creates speckit configuration files from templates
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
 * Speckit required files and their templates
 */
const SPECKIT_FILES: Array<{ path: string; template: string; required: boolean }> = [
  { path: 'memory/constitution.md', template: 'speckit/constitution.md.template', required: true },
  { path: 'config.yaml', template: 'speckit/config.yaml.template', required: false }
];

/**
 * Get templates directory path
 */
function getTemplatesDir(): string {
  // Templates are relative to the package root
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return joinPath(__dirname, '..', '..', '..', 'templates');
}

/**
 * Extract custom values from existing configuration
 * This identifies values that differ from template defaults
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
    
    // For YAML files, try to parse and extract non-default values
    if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
      const yaml = await import('yaml');
      const parsed = yaml.parse(content) as Record<string, unknown>;
      
      // Store all custom values
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
 * Generate speckit configuration for a repository
 */
export async function generateSpeckitConfig(
  repoPath: string,
  metadata: ProjectMetadata,
  options: GeneratorOptions = {}
): Promise<ConfigurationSet> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const templatesDir = getTemplatesDir();
  const specifyPath = joinPath(repoPath, '.specify');
  
  const configSet: ConfigurationSet = {
    type: ConfigType.SPECKIT,
    rootPath: specifyPath,
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

  // Ensure .specify directory exists
  await ensureDir(specifyPath);
  await ensureDir(joinPath(specifyPath, 'memory'));
  await ensureDir(joinPath(specifyPath, 'templates'));
  await ensureDir(joinPath(specifyPath, 'scripts', 'powershell'));

  // Generate each configuration file
  for (const fileSpec of SPECKIT_FILES) {
    const targetPath = joinPath(specifyPath, fileSpec.path);
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
      // File exists and we shouldn't overwrite
      configFile.customized = true;
      
      // Extract custom values for potential merging
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

    // Check if content actually changed (for idempotency)
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

  // Copy standard templates if they don't exist
  const standardTemplates = ['spec-template.md', 'plan-template.md', 'tasks-template.md'];
  for (const templateName of standardTemplates) {
    const sourcePath = joinPath(templatesDir, templateName);
    const targetPath = joinPath(specifyPath, 'templates', templateName);
    
    if (await pathExists(sourcePath) && !(await pathExists(targetPath))) {
      const content = await readFile(sourcePath);
      await writeFile(targetPath, content);
    }
  }

  return configSet;
}
