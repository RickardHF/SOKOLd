import { Command } from 'commander';
import * as path from 'path';
import { ConfigLoader } from '../../core/config/ConfigLoader.js';
import { ConfigValidator } from '../../core/config/ConfigValidator.js';
import { Logger } from '../../utils/logger.js';
import { getProjectConfigPath, getGlobalConfigPath, loadConfigFile, saveConfigFile, getDefaultConfig, Configuration } from '../../utils/config.js';
import { pathExists, ensureDir } from '../../utils/filesystem.js';

export interface ConfigCommandOptions {
  global?: boolean;
}

export async function configGetCommand(key: string, options: ConfigCommandOptions): Promise<void> {
  const logger = Logger.getInstance();
  const configLoader = new ConfigLoader();
  
  const config = await configLoader.load(process.cwd(), { globalConfig: options.global });
  const value = (config as unknown as Record<string, unknown>)[key];
  
  if (value === undefined) {
    logger.error(`Unknown configuration key: ${key}`);
    process.exit(2);
  }
  
  if (typeof value === 'object') {
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log(String(value ?? 'null'));
  }
}

export async function configSetCommand(key: string, value: string, options: ConfigCommandOptions): Promise<void> {
  const logger = Logger.getInstance();
  const configPath = options.global ? getGlobalConfigPath() : getProjectConfigPath();
  
  // Load existing config or start fresh
  let config: Partial<Configuration> = {};
  if (await pathExists(configPath)) {
    config = await loadConfigFile(configPath);
  }

  // Parse value appropriately
  let parsedValue: unknown;
  if (value === 'true') {
    parsedValue = true;
  } else if (value === 'false') {
    parsedValue = false;
  } else if (value === 'null') {
    parsedValue = null;
  } else if (!isNaN(Number(value))) {
    parsedValue = Number(value);
  } else if (value.includes(',')) {
    parsedValue = value.split(',').map(v => v.trim());
  } else {
    parsedValue = value;
  }

  // Handle nested keys (e.g., checks.tests)
  if (key.includes('.')) {
    const parts = key.split('.');
    let current: Record<string, unknown> = config as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = parsedValue;
  } else {
    (config as Record<string, unknown>)[key] = parsedValue;
  }

  // Validate
  const validator = new ConfigValidator();
  const result = validator.validate(config);
  if (!result.valid) {
    logger.error(`Invalid value: ${result.errors.join(', ')}`);
    process.exit(2);
  }

  // Save
  await ensureDir(path.dirname(configPath));
  await saveConfigFile(configPath, config);
  
  logger.success(`Set ${key} = ${value}`);
}

export async function configListCommand(options: ConfigCommandOptions): Promise<void> {
  const configLoader = new ConfigLoader();
  const config = await configLoader.load(process.cwd(), { globalConfig: options.global });

  const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, flatten(value as Record<string, unknown>, fullKey));
      } else {
        result[fullKey] = String(value);
      }
    }
    return result;
  };

  const flat = flatten(config as unknown as Record<string, unknown>);
  for (const [key, value] of Object.entries(flat)) {
    console.log(`${key}: ${value}`);
  }
}

export async function configResetCommand(options: ConfigCommandOptions): Promise<void> {
  const logger = Logger.getInstance();
  const configPath = options.global ? getGlobalConfigPath() : getProjectConfigPath();
  
  if (!await pathExists(configPath)) {
    logger.info('No configuration file to reset');
    return;
  }

  const defaults = getDefaultConfig();
  await saveConfigFile(configPath, defaults);
  
  logger.success('Configuration reset to defaults');
}

export async function configPathCommand(options: ConfigCommandOptions): Promise<void> {
  const configPath = options.global ? getGlobalConfigPath() : getProjectConfigPath();
  console.log(configPath);
}

export function createConfigCommand(): Command {
  const cmd = new Command('config')
    .description('Manage configuration settings');

  cmd
    .command('get <key>')
    .description('Get configuration value')
    .option('-g, --global', 'Use global user config')
    .action(configGetCommand);

  cmd
    .command('set <key> <value>')
    .description('Set configuration value')
    .option('-g, --global', 'Use global user config')
    .action(configSetCommand);

  cmd
    .command('list')
    .description('List all configuration')
    .option('-g, --global', 'Use global user config')
    .action(configListCommand);

  cmd
    .command('reset')
    .description('Reset to defaults')
    .option('-g, --global', 'Use global user config')
    .action(configResetCommand);

  cmd
    .command('path')
    .description('Show config file path')
    .option('-g, --global', 'Use global user config')
    .action(configPathCommand);

  return cmd;
}
