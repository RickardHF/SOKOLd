/**
 * Configuration synchronizer
 * Ensures shared settings are consistent between speckit and sokold configs
 */

import { joinPath, pathExists, readFile, writeFile } from '../../utils/filesystem.js';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

/**
 * Shared settings that must be consistent between configs
 */
export interface SharedSettings {
  projectName: string;
  language: string;
  framework: string | null;
}

/**
 * Extract shared settings from speckit configuration
 */
export async function extractSharedSettings(
  repoPath: string
): Promise<SharedSettings | null> {
  const speckitConfigPath = joinPath(repoPath, '.specify', 'config.yaml');
  const sokoldConfigPath = joinPath(repoPath, '.sokold', 'config.yaml');

  // Try speckit first
  if (await pathExists(speckitConfigPath)) {
    try {
      const content = await readFile(speckitConfigPath);
      const config = parseYaml(content) as Record<string, unknown>;
      const project = config.project as Record<string, string> | undefined;
      
      if (project) {
        return {
          projectName: project.name ?? '',
          language: project.language ?? '',
          framework: project.framework ?? null
        };
      }
    } catch {
      // Fall through to try sokold
    }
  }

  // Try sokold
  if (await pathExists(sokoldConfigPath)) {
    try {
      const content = await readFile(sokoldConfigPath);
      const config = parseYaml(content) as Record<string, unknown>;
      const project = config.project as Record<string, string> | undefined;
      
      if (project) {
        return {
          projectName: project.name ?? '',
          language: project.language ?? '',
          framework: project.framework ?? null
        };
      }
    } catch {
      // Return null if both fail
    }
  }

  return null;
}

/**
 * Update configuration file with shared settings
 */
async function updateConfigWithSharedSettings(
  configPath: string,
  settings: SharedSettings
): Promise<boolean> {
  if (!(await pathExists(configPath))) {
    return false;
  }

  try {
    const content = await readFile(configPath);
    const config = parseYaml(content) as Record<string, unknown>;
    
    if (!config.project) {
      config.project = {};
    }
    
    const project = config.project as Record<string, string | null>;
    project.name = settings.projectName;
    project.language = settings.language;
    project.framework = settings.framework;

    const updatedContent = stringifyYaml(config);
    await writeFile(configPath, updatedContent);
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronize shared settings between speckit and sokold configurations
 * Ensures both configurations have consistent project name, language, and framework
 */
export async function synchronizeSharedSettings(
  repoPath: string,
  settings: SharedSettings
): Promise<{ speckit: boolean; sokold: boolean }> {
  const speckitConfigPath = joinPath(repoPath, '.specify', 'config.yaml');
  const sokoldConfigPath = joinPath(repoPath, '.sokold', 'config.yaml');

  const results = {
    speckit: false,
    sokold: false
  };

  // Update speckit config
  if (await pathExists(speckitConfigPath)) {
    results.speckit = await updateConfigWithSharedSettings(speckitConfigPath, settings);
  }

  // Update sokold config
  if (await pathExists(sokoldConfigPath)) {
    results.sokold = await updateConfigWithSharedSettings(sokoldConfigPath, settings);
  }

  return results;
}

/**
 * Validate that shared settings are consistent between configs
 */
export async function validateSharedSettingsConsistency(
  repoPath: string
): Promise<{ isConsistent: boolean; differences: string[] }> {
  const speckitConfigPath = joinPath(repoPath, '.specify', 'config.yaml');
  const sokoldConfigPath = joinPath(repoPath, '.sokold', 'config.yaml');
  
  const differences: string[] = [];

  const speckitExists = await pathExists(speckitConfigPath);
  const sokoldExists = await pathExists(sokoldConfigPath);

  if (!speckitExists || !sokoldExists) {
    return { isConsistent: true, differences: [] };
  }

  try {
    const speckitContent = await readFile(speckitConfigPath);
    const sokoldContent = await readFile(sokoldConfigPath);
    
    const speckitConfig = parseYaml(speckitContent) as Record<string, unknown>;
    const sokoldConfig = parseYaml(sokoldContent) as Record<string, unknown>;
    
    const speckitProject = speckitConfig.project as Record<string, string> | undefined;
    const sokoldProject = sokoldConfig.project as Record<string, string> | undefined;

    if (speckitProject && sokoldProject) {
      if (speckitProject.name !== sokoldProject.name) {
        differences.push(`Project name: speckit="${speckitProject.name}" vs sokold="${sokoldProject.name}"`);
      }
      if (speckitProject.language !== sokoldProject.language) {
        differences.push(`Language: speckit="${speckitProject.language}" vs sokold="${sokoldProject.language}"`);
      }
      if (speckitProject.framework !== sokoldProject.framework) {
        differences.push(`Framework: speckit="${speckitProject.framework}" vs sokold="${sokoldProject.framework}"`);
      }
    }
  } catch {
    // If parsing fails, consider them consistent
  }

  return {
    isConsistent: differences.length === 0,
    differences
  };
}
