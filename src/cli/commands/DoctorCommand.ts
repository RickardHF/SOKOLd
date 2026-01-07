import { Command } from 'commander';
import { SpecKitDetector } from '../../core/speckit/SpecKitDetector.js';
import { AIToolFactory } from '../../adapters/ai/AIToolFactory.js';
import { AIToolType } from '../../adapters/ai/AIToolAdapter.js';
import { ConfigLoader } from '../../core/config/ConfigLoader.js';
import { ConfigValidator } from '../../core/config/ConfigValidator.js';
import { Logger } from '../../utils/logger.js';
import { findGitRoot, resolvePath } from '../../utils/filesystem.js';

export interface DoctorCommandOptions {
  fix?: boolean;
}

export async function doctorCommand(options: DoctorCommandOptions): Promise<void> {
  const logger = Logger.getInstance();
  const rootPath = resolvePath(process.cwd());
  
  let issues = 0;
  let criticalIssues = 0;

  console.log('');
  console.log('🔬 Running diagnostics...');
  console.log('');

  // Check Node.js version
  const nodeVersion = process.version;
  const [major] = nodeVersion.replace('v', '').split('.').map(Number);
  if (major >= 18) {
    logger.success(`Node.js version: ${nodeVersion} (compatible)`);
  } else {
    logger.error(`Node.js version: ${nodeVersion} (requires >= 18.0.0)`);
    criticalIssues++;
  }

  // Check SpecKit initialization
  const detector = new SpecKitDetector();
  const specKitStatus = await detector.getStatus(rootPath);
  
  if (specKitStatus.initialized) {
    logger.success('SpecKit initialized: Yes');
  } else {
    logger.warning('SpecKit initialized: No');
    issues++;
    if (options.fix) {
      logger.info('  → Run: speckit-automate init');
    }
  }

  // Check AI tools
  console.log('⚠ AI Tools:');
  const toolInfo = await AIToolFactory.getToolInfo();
  let hasAnyTool = false;
  
  for (const tool of toolInfo) {
    const name = tool.type === AIToolType.COPILOT ? 'GitHub Copilot CLI' : 'Claude CLI';
    if (tool.installed) {
      logger.success(`  ${name}: Found${tool.version ? ` (v${tool.version})` : ''}`);
      hasAnyTool = true;
    } else {
      logger.error(`  ${name}: Not found`);
    }
  }

  if (!hasAnyTool) {
    issues++;
  }

  // Check configuration
  try {
    const configLoader = new ConfigLoader();
    const config = await configLoader.load(rootPath);
    const validator = new ConfigValidator();
    const result = validator.validate(config);
    
    if (result.valid) {
      logger.success('Configuration: Valid');
    } else {
      logger.warning(`Configuration: ${result.errors.length} issue(s)`);
      for (const error of result.errors) {
        logger.info(`  → ${error}`);
      }
      issues++;
    }
  } catch {
    logger.success('Configuration: Using defaults');
  }

  // Check Git repository
  const gitRoot = await findGitRoot(rootPath);
  if (gitRoot) {
    logger.success('Git repository: Yes');
  } else {
    logger.warning('Git repository: Not initialized (optional)');
  }

  // Check specs directory
  if (specKitStatus.hasSpecs) {
    logger.success('Specs directory: Found');
  } else {
    logger.warning('Specs directory: Not found');
    if (specKitStatus.initialized) {
      issues++;
    }
  }

  // Summary
  console.log('');
  if (criticalIssues > 0) {
    console.log(`Issues Found: ${issues + criticalIssues} (${criticalIssues} critical)`);
    console.log('');
    console.log('Overall Status: ✗ Cannot proceed');
    process.exit(2);
  } else if (issues > 0) {
    console.log(`Issues Found: ${issues}`);
    if (!hasAnyTool) {
      console.log('  ⚠ No AI CLI tool installed');
      console.log('    Recommendation: Install GitHub Copilot CLI or Claude CLI');
    }
    if (!specKitStatus.initialized) {
      console.log('  ⚠ SpecKit not initialized');
      console.log('    Recommendation: Run speckit-automate init');
    }
    console.log('');
    console.log('Overall Status: ⚠ Ready with warnings');
    process.exit(1);
  } else {
    console.log('');
    console.log('Overall Status: ✓ Ready to use');
  }
}

export function createDoctorCommand(): Command {
  return new Command('doctor')
    .description('Diagnose issues with setup and configuration')
    .option('--fix', 'Attempt to fix detected issues')
    .action(doctorCommand);
}
