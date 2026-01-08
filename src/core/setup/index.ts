/**
 * Setup module exports
 */

export { executeSetup, rollbackSetup, SetupOptions } from './orchestrator.js';
export { generateSpeckitConfig, GeneratorOptions } from './speckit-setup.js';
export { generateSokoldConfig } from './sokold-setup.js';
export {
  synchronizeSharedSettings,
  extractSharedSettings,
  validateSharedSettingsConsistency,
  SharedSettings
} from './synchronizer.js';
