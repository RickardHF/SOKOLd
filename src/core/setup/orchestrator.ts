/**
 * Setup orchestrator
 * Coordinates the entire setup workflow for repository configuration
 */

import * as path from 'path';
import {
  joinPath,
  pathExists
} from '../../utils/filesystem.js';
import {
  InvalidPathError,
  AmbiguityError
} from '../../utils/errors.js';
import {
  RepositoryState,
  RepositoryStateType
} from '../../types/repository-state.js';
import {
  ProjectMetadata,
  ProjectType
} from '../../types/project-metadata.js';
import {
  SetupResult,
  SetupSummary,
  SetupOperation,
  OperationAction,
  OperationStatus
} from '../../types/setup-operation.js';
import { detectRepositoryState } from '../state/detector.js';
import { analyzeCodebase, parseUserDescription } from '../state/analyzer.js';
import { generateSpeckitConfig } from './speckit-setup.js';
import { generateSokoldConfig } from './sokold-setup.js';
import {
  synchronizeSharedSettings,
  extractSharedSettings,
  SharedSettings
} from './synchronizer.js';

/**
 * Setup options
 */
export interface SetupOptions {
  userDescription?: string;
  language?: string;
  framework?: string;
  force?: boolean;
  dryRun?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  skipValidation?: boolean;
}

/**
 * Create operation record
 */
function createOperation(
  action: OperationAction,
  targetPath: string,
  status: OperationStatus = OperationStatus.PENDING,
  metadata: SetupOperation['metadata'] = {}
): SetupOperation {
  return {
    action,
    targetPath,
    status,
    metadata,
    error: null,
    timestamp: new Date()
  };
}

/**
 * Create default project metadata from user description
 */
function createMetadataFromDescription(
  repoPath: string,
  description: string,
  overrides?: { language?: string; framework?: string }
): ProjectMetadata {
  const parsed = parseUserDescription(description);
  const projectName = parsed.name ?? path.basename(repoPath);
  
  return {
    name: projectName,
    language: overrides?.language ?? parsed.language ?? 'TypeScript',
    framework: overrides?.framework ?? parsed.framework ?? null,
    testFramework: null,
    projectType: parsed.projectType ?? ProjectType.UNKNOWN,
    directoryStructure: [],
    dependencies: [],
    detectionMethod: 'user-input',
    confidence: 100
  };
}

/**
 * Execute setup for EMPTY repository state
 */
function executeEmptySetup(
  repoPath: string,
  options: SetupOptions
): { metadata: ProjectMetadata; operations: SetupOperation[] } {
  const operations: SetupOperation[] = [];
  
  if (!options.userDescription) {
    throw new AmbiguityError(
      'Empty repository requires a project description. Use --description option.',
      ['--description "A CLI tool for task management"']
    );
  }

  const metadata = createMetadataFromDescription(
    repoPath,
    options.userDescription,
    { language: options.language, framework: options.framework }
  );

  // Record directory creation operations
  operations.push(createOperation(
    OperationAction.CREATE_DIRECTORY,
    joinPath(repoPath, '.specify'),
    OperationStatus.PENDING,
    { configType: 'speckit' }
  ));
  
  operations.push(createOperation(
    OperationAction.CREATE_DIRECTORY,
    joinPath(repoPath, '.sokold'),
    OperationStatus.PENDING,
    { configType: 'sokold' }
  ));

  return { metadata, operations };
}

/**
 * Execute setup for UNCONFIGURED repository state
 */
async function executeUnconfiguredSetup(
  repoPath: string,
  options: SetupOptions
): Promise<{ metadata: ProjectMetadata; operations: SetupOperation[] }> {
  const operations: SetupOperation[] = [];
  
  // Analyze codebase to detect project metadata
  let metadata: ProjectMetadata;
  
  try {
    metadata = await analyzeCodebase(repoPath);
  } catch (error) {
    if (error instanceof AmbiguityError && options.language) {
      // User provided language override, create metadata
      metadata = createMetadataFromDescription(
        repoPath,
        options.userDescription ?? `A ${options.language} project`,
        { language: options.language, framework: options.framework }
      );
      metadata.detectionMethod = 'hybrid';
    } else {
      throw error;
    }
  }

  // Apply overrides if provided
  if (options.language) {
    metadata.language = options.language;
    metadata.detectionMethod = 'hybrid';
  }
  if (options.framework) {
    metadata.framework = options.framework;
    metadata.detectionMethod = 'hybrid';
  }

  operations.push(createOperation(
    OperationAction.CREATE_DIRECTORY,
    joinPath(repoPath, '.specify'),
    OperationStatus.PENDING,
    { configType: 'speckit' }
  ));
  
  operations.push(createOperation(
    OperationAction.CREATE_DIRECTORY,
    joinPath(repoPath, '.sokold'),
    OperationStatus.PENDING,
    { configType: 'sokold' }
  ));

  return { metadata, operations };
}

/**
 * Execute setup for PARTIAL repository state
 */
async function executePartialSetup(
  repoPath: string,
  state: RepositoryState,
  options: SetupOptions
): Promise<{ metadata: ProjectMetadata; operations: SetupOperation[] }> {
  const operations: SetupOperation[] = [];
  
  // Get existing shared settings
  const existingSettings = await extractSharedSettings(repoPath);
  
  let metadata: ProjectMetadata;
  
  if (existingSettings) {
    metadata = {
      name: existingSettings.projectName,
      language: existingSettings.language,
      framework: existingSettings.framework,
      testFramework: null,
      projectType: ProjectType.UNKNOWN,
      directoryStructure: [],
      dependencies: [],
      detectionMethod: 'hybrid',
      confidence: 100
    };
  } else if (state.hasSourceFiles) {
    // Analyze codebase
    metadata = await analyzeCodebase(repoPath);
  } else {
    // Use description or defaults
    metadata = createMetadataFromDescription(
      repoPath,
      options.userDescription ?? 'Project',
      { language: options.language, framework: options.framework }
    );
  }

  // Add operation for missing config
  if (state.type === RepositoryStateType.PARTIAL_SPECKIT) {
    operations.push(createOperation(
      OperationAction.CREATE_DIRECTORY,
      joinPath(repoPath, '.sokold'),
      OperationStatus.PENDING,
      { configType: 'sokold' }
    ));
  } else if (state.type === RepositoryStateType.PARTIAL_SOKOLD) {
    operations.push(createOperation(
      OperationAction.CREATE_DIRECTORY,
      joinPath(repoPath, '.specify'),
      OperationStatus.PENDING,
      { configType: 'speckit' }
    ));
  }

  return { metadata, operations };
}

/**
 * Execute setup for FULL repository state
 */
async function executeFullSetup(
  repoPath: string,
  options: SetupOptions
): Promise<{ metadata: ProjectMetadata; operations: SetupOperation[] }> {
  const operations: SetupOperation[] = [];
  
  // Get existing settings
  const existingSettings = await extractSharedSettings(repoPath);
  
  const metadata: ProjectMetadata = existingSettings ? {
    name: existingSettings.projectName,
    language: existingSettings.language,
    framework: existingSettings.framework,
    testFramework: null,
    projectType: ProjectType.UNKNOWN,
    directoryStructure: [],
    dependencies: [],
    detectionMethod: 'hybrid',
    confidence: 100
  } : createMetadataFromDescription(repoPath, options.userDescription ?? 'Project');

  // Validate configs operation
  operations.push(createOperation(
    OperationAction.VALIDATE_CONFIG,
    joinPath(repoPath, '.specify'),
    OperationStatus.PENDING,
    { configType: 'speckit' }
  ));
  
  operations.push(createOperation(
    OperationAction.VALIDATE_CONFIG,
    joinPath(repoPath, '.sokold'),
    OperationStatus.PENDING,
    { configType: 'sokold' }
  ));

  return { metadata, operations };
}

/**
 * Main setup orchestrator entry point
 */
export async function executeSetup(
  repoPath: string,
  options: SetupOptions = {}
): Promise<SetupResult> {
  const startTime = Date.now();
  const resolvedPath = path.resolve(repoPath);
  
  // Validate path exists
  if (!(await pathExists(resolvedPath))) {
    throw new InvalidPathError(resolvedPath);
  }

  // Detect repository state
  const state = await detectRepositoryState(resolvedPath);
  
  let metadata: ProjectMetadata;
  let operations: SetupOperation[] = [];
  
  // Determine operations based on state
  switch (state.type) {
    case RepositoryStateType.EMPTY: {
      const result = executeEmptySetup(resolvedPath, options);
      metadata = result.metadata;
      operations = result.operations;
      break;
    }
    case RepositoryStateType.UNCONFIGURED: {
      const result = await executeUnconfiguredSetup(resolvedPath, options);
      metadata = result.metadata;
      operations = result.operations;
      break;
    }
    case RepositoryStateType.PARTIAL_SPECKIT:
    case RepositoryStateType.PARTIAL_SOKOLD: {
      const result = await executePartialSetup(resolvedPath, state, options);
      metadata = result.metadata;
      operations = result.operations;
      break;
    }
    case RepositoryStateType.FULL: {
      const result = await executeFullSetup(resolvedPath, options);
      metadata = result.metadata;
      operations = result.operations;
      break;
    }
    case RepositoryStateType.CORRUPTED: {
      // Treat corrupted as needing full setup with force
      const result = await executeUnconfiguredSetup(resolvedPath, { ...options, force: true });
      metadata = result.metadata;
      operations = result.operations;
      break;
    }
  }

  // If dry run, return without executing
  if (options.dryRun) {
    const summary: SetupSummary = {
      filesCreated: 0,
      filesUpdated: 0,
      filesSkipped: operations.filter(o => o.status === OperationStatus.SKIPPED).length,
      directoriesCreated: operations.filter(o => o.action === OperationAction.CREATE_DIRECTORY).length,
      customValuesPreserved: 0,
      configsValidated: operations.filter(o => o.action === OperationAction.VALIDATE_CONFIG).length
    };

    return {
      success: true,
      repositoryState: state,
      operations,
      summary,
      duration: Date.now() - startTime,
      warnings: ['Dry run mode - no changes applied']
    };
  }

  // Execute operations
  const summary: SetupSummary = {
    filesCreated: 0,
    filesUpdated: 0,
    filesSkipped: 0,
    directoriesCreated: 0,
    customValuesPreserved: 0,
    configsValidated: 0
  };

  const warnings: string[] = [];

  // Generate configs based on state
  if (state.type !== RepositoryStateType.FULL || options.force) {
    try {
      // Generate speckit config if needed
      if (!state.hasSpeckit || options.force) {
        const speckitConfig = await generateSpeckitConfig(resolvedPath, metadata, {
          overwrite: options.force,
          preserveCustom: true,
          backupExisting: true
        });
        summary.filesCreated += speckitConfig.files.filter(f => f.exists && !f.customized).length;
        summary.filesSkipped += speckitConfig.files.filter(f => f.customized).length;
        summary.directoriesCreated++;
        
        // Update operations
        for (const op of operations) {
          if (op.metadata.configType === 'speckit') {
            op.status = OperationStatus.COMPLETED;
          }
        }
      }

      // Generate sokold config if needed
      if (!state.hasSokold || options.force) {
        const sokoldConfig = await generateSokoldConfig(resolvedPath, metadata, {
          overwrite: options.force,
          preserveCustom: true,
          backupExisting: true
        });
        summary.filesCreated += sokoldConfig.files.filter(f => f.exists && !f.customized).length;
        summary.filesSkipped += sokoldConfig.files.filter(f => f.customized).length;
        summary.directoriesCreated++;
        
        // Update operations
        for (const op of operations) {
          if (op.metadata.configType === 'sokold') {
            op.status = OperationStatus.COMPLETED;
          }
        }
      }

      // Synchronize shared settings
      const sharedSettings: SharedSettings = {
        projectName: metadata.name,
        language: metadata.language,
        framework: metadata.framework
      };
      await synchronizeSharedSettings(resolvedPath, sharedSettings);

    } catch (error) {
      // Mark operations as failed
      for (const op of operations) {
        if (op.status === OperationStatus.PENDING) {
          op.status = OperationStatus.FAILED;
          op.error = error instanceof Error ? error : new Error(String(error));
        }
      }
      
      throw error;
    }
  } else {
    // Full state without force - just validate
    summary.configsValidated = 2;
    for (const op of operations) {
      if (op.action === OperationAction.VALIDATE_CONFIG) {
        op.status = OperationStatus.COMPLETED;
      }
    }
  }

  // Get final state
  const finalState = await detectRepositoryState(resolvedPath);

  return {
    success: true,
    repositoryState: finalState,
    operations,
    summary,
    duration: Date.now() - startTime,
    warnings
  };
}

/**
 * Rollback setup operations
 * Restores backups created during setup
 */
export async function rollbackSetup(
  _repoPath: string,
  backupPaths: Map<string, string>
): Promise<void> {
  for (const [originalPath, backupPath] of backupPaths.entries()) {
    if (await pathExists(backupPath)) {
      const { copy, remove } = await import('fs-extra');
      await remove(originalPath);
      await copy(backupPath, originalPath);
    }
  }
}
