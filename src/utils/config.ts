import * as yaml from 'yaml';
import * as path from 'path';
import { getConfigDir, pathExists, readFile, writeFile } from './filesystem.js';

export interface QualityCheckConfig {
  tests: boolean;
  linting: boolean;
  build: boolean;
}

export interface CommandOverrides {
  test?: string;
  lint?: string;
  build?: string;
}

export interface Configuration {
  aiTool: 'copilot' | 'claude' | null;
  maxRetries: number;
  timeout: number;
  verbosity: 'quiet' | 'normal' | 'verbose' | 'debug';
  checks: QualityCheckConfig;
  commands: CommandOverrides;
  priorities: string[];
}

const DEFAULT_CONFIG: Configuration = {
  aiTool: null,
  maxRetries: 3,
  timeout: 300,
  verbosity: 'normal',
  checks: {
    tests: true,
    linting: true,
    build: true,
  },
  commands: {},
  priorities: ['P1', 'P2', 'P3'],
};

/**
 * Get configuration file paths in priority order
 */
export function getConfigPaths(cwd: string = process.cwd()): string[] {
  return [
    path.join(cwd, '.speckit-automate.yaml'),
    path.join(cwd, '.speckit-automate.json'),
    path.join(getConfigDir(), 'config.yaml'),
    path.join(getConfigDir(), 'config.json'),
  ];
}

/**
 * Load configuration from YAML or JSON file
 */
export async function loadConfigFile(filePath: string): Promise<Partial<Configuration>> {
  const content = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.yaml' || ext === '.yml') {
    return yaml.parse(content) as Partial<Configuration>;
  } else {
    return JSON.parse(content) as Partial<Configuration>;
  }
}

/**
 * Save configuration to file
 */
export async function saveConfigFile(filePath: string, config: Partial<Configuration>): Promise<void> {
  const ext = path.extname(filePath).toLowerCase();
  let content: string;

  if (ext === '.yaml' || ext === '.yml') {
    content = yaml.stringify(config);
  } else {
    content = JSON.stringify(config, null, 2);
  }

  await writeFile(filePath, content);
}

/**
 * Load configuration with hierarchy (project → user → defaults)
 */
export async function loadConfig(cwd: string = process.cwd()): Promise<Configuration> {
  const config: Configuration = { ...DEFAULT_CONFIG };
  const configPaths = getConfigPaths(cwd);

  // Load from files in reverse order (defaults first, project last)
  for (const configPath of [...configPaths].reverse()) {
    if (await pathExists(configPath)) {
      try {
        const fileConfig = await loadConfigFile(configPath);
        Object.assign(config, fileConfig);
        if (fileConfig.checks) {
          config.checks = { ...DEFAULT_CONFIG.checks, ...fileConfig.checks };
        }
        if (fileConfig.commands) {
          config.commands = { ...DEFAULT_CONFIG.commands, ...fileConfig.commands };
        }
      } catch {
        // Ignore invalid config files
      }
    }
  }

  // Override from environment variables
  if (process.env.SPECKIT_AI_TOOL) {
    const tool = process.env.SPECKIT_AI_TOOL.toLowerCase();
    if (tool === 'copilot' || tool === 'claude') {
      config.aiTool = tool;
    }
  }

  if (process.env.SPECKIT_LOG_LEVEL) {
    const level = process.env.SPECKIT_LOG_LEVEL.toLowerCase();
    if (['quiet', 'normal', 'verbose', 'debug'].includes(level)) {
      config.verbosity = level as Configuration['verbosity'];
    }
  }

  return config;
}

/**
 * Get project config path (creates if needed)
 */
export function getProjectConfigPath(cwd: string = process.cwd()): string {
  return path.join(cwd, '.speckit-automate.yaml');
}

/**
 * Get global config path (creates if needed)
 */
export function getGlobalConfigPath(): string {
  return path.join(getConfigDir(), 'config.yaml');
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Configuration {
  return { ...DEFAULT_CONFIG };
}

/**
 * Validate configuration values
 */
export function validateConfig(config: Partial<Configuration>): string[] {
  const errors: string[] = [];

  if (config.aiTool !== undefined && config.aiTool !== null) {
    if (!['copilot', 'claude'].includes(config.aiTool)) {
      errors.push(`Invalid aiTool: ${config.aiTool}. Must be 'copilot' or 'claude'`);
    }
  }

  if (config.maxRetries !== undefined) {
    if (typeof config.maxRetries !== 'number' || config.maxRetries < 0 || config.maxRetries > 10) {
      errors.push('maxRetries must be a number between 0 and 10');
    }
  }

  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout <= 0) {
      errors.push('timeout must be a positive number');
    }
  }

  if (config.verbosity !== undefined) {
    if (!['quiet', 'normal', 'verbose', 'debug'].includes(config.verbosity)) {
      errors.push(`Invalid verbosity: ${config.verbosity}. Must be 'quiet', 'normal', 'verbose', or 'debug'`);
    }
  }

  return errors;
}
