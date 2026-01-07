import * as path from 'path';
import { pathExists } from '../../utils/filesystem.js';
import { Configuration, getDefaultConfig, validateConfig, loadConfigFile, saveConfigFile } from '../../utils/config.js';
import { AIToolType } from '../../adapters/ai/AIToolAdapter.js';

export interface ConfigLoaderOptions {
  configPath?: string;
  globalConfig?: boolean;
}

export class ConfigLoader {
  private config: Configuration;
  private configPath: string | null = null;

  constructor() {
    this.config = getDefaultConfig();
  }

  async load(cwd: string = process.cwd(), options: ConfigLoaderOptions = {}): Promise<Configuration> {
    this.config = getDefaultConfig();

    const paths = this.getConfigPaths(cwd, options);
    
    for (const configPath of paths) {
      if (await pathExists(configPath)) {
        try {
          const fileConfig = await loadConfigFile(configPath);
          this.mergeConfig(fileConfig);
          this.configPath = configPath;
        } catch (error) {
          // Continue to next config file if parsing fails
        }
      }
    }

    // Apply environment overrides
    this.applyEnvironmentOverrides();

    return this.config;
  }

  async exists(cwd: string): Promise<boolean> {
    const paths = this.getConfigPaths(cwd, {});
    for (const configPath of paths) {
      if (await pathExists(configPath)) {
        return true;
      }
    }
    return false;
  }

  async generateDefault(cwd: string, detectedTool: AIToolType): Promise<void> {
    const configPath = path.join(cwd, '.sokold.yaml');
    const config: Partial<Configuration> = {
      aiTool: detectedTool === AIToolType.COPILOT ? 'copilot' : 'claude',
      maxRetries: 3,
      timeout: 300,
      checks: {
        tests: true,
        linting: true,
        build: true,
      },
      commands: {
        test: 'npm test',
        lint: 'npm run lint',
        build: 'npm run build',
      },
    };
    await saveConfigFile(configPath, config);
    this.configPath = configPath;
    this.mergeConfig(config);
  }

  private getConfigPaths(cwd: string, options: ConfigLoaderOptions): string[] {
    if (options.configPath) {
      return [options.configPath];
    }

    const paths: string[] = [];
    
    // Global config (lowest priority)
    const globalDir = this.getGlobalConfigDir();
    paths.push(path.join(globalDir, 'config.yaml'));
    paths.push(path.join(globalDir, 'config.json'));

    // Project config (highest priority) - unless globalConfig is set
    if (!options.globalConfig) {
      paths.push(path.join(cwd, '.sokold.yaml'));
      paths.push(path.join(cwd, '.sokold.json'));
      // Legacy paths for backwards compatibility
      paths.push(path.join(cwd, '.speckit-automate.yaml'));
      paths.push(path.join(cwd, '.speckit-automate.json'));
    }

    return paths;
  }

  private getGlobalConfigDir(): string {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    switch (process.platform) {
      case 'win32':
        return path.join(process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming'), 'sokold');
      case 'darwin':
        return path.join(home, 'Library', 'Application Support', 'sokold');
      default:
        return path.join(process.env.XDG_CONFIG_HOME ?? path.join(home, '.config'), 'sokold');
    }
  }

  private mergeConfig(fileConfig: Partial<Configuration>): void {
    if (fileConfig.aiTool !== undefined) {
      this.config.aiTool = fileConfig.aiTool;
    }
    if (fileConfig.maxRetries !== undefined) {
      this.config.maxRetries = fileConfig.maxRetries;
    }
    if (fileConfig.timeout !== undefined) {
      this.config.timeout = fileConfig.timeout;
    }
    if (fileConfig.verbosity !== undefined) {
      this.config.verbosity = fileConfig.verbosity;
    }
    if (fileConfig.checks) {
      this.config.checks = { ...this.config.checks, ...fileConfig.checks };
    }
    if (fileConfig.commands) {
      this.config.commands = { ...this.config.commands, ...fileConfig.commands };
    }
    if (fileConfig.priorities) {
      this.config.priorities = fileConfig.priorities;
    }
  }

  private applyEnvironmentOverrides(): void {
    if (process.env.SOKOLD_AI_TOOL || process.env.SPECKIT_AI_TOOL) {
      const tool = (process.env.SOKOLD_AI_TOOL ?? process.env.SPECKIT_AI_TOOL)!.toLowerCase();
      if (tool === 'copilot' || tool === 'claude') {
        this.config.aiTool = tool;
      }
    }

    if (process.env.SOKOLD_LOG_LEVEL || process.env.SPECKIT_LOG_LEVEL) {
      const level = (process.env.SOKOLD_LOG_LEVEL ?? process.env.SPECKIT_LOG_LEVEL)!.toLowerCase();
      if (['quiet', 'normal', 'verbose', 'debug'].includes(level)) {
        this.config.verbosity = level as Configuration['verbosity'];
      }
    }
  }

  getConfig(): Configuration {
    return { ...this.config };
  }

  getConfigPath(): string | null {
    return this.configPath;
  }

  async save(configPath: string, config: Partial<Configuration>): Promise<void> {
    const errors = validateConfig(config);
    if (errors.length > 0) {
      throw new Error(`Invalid configuration: ${errors.join(', ')}`);
    }

    await saveConfigFile(configPath, config);
  }

  async get(key: keyof Configuration): Promise<unknown> {
    return this.config[key];
  }

  async set(key: keyof Configuration, value: unknown, configPath: string): Promise<void> {
    let existingConfig: Partial<Configuration> = {};
    
    if (await pathExists(configPath)) {
      existingConfig = await loadConfigFile(configPath);
    }

    (existingConfig as Record<string, unknown>)[key] = value;

    const errors = validateConfig(existingConfig as Partial<Configuration>);
    if (errors.length > 0) {
      throw new Error(`Invalid value: ${errors.join(', ')}`);
    }

    await saveConfigFile(configPath, existingConfig);
  }
}
