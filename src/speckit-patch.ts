/**
 * SpecKit Branch Control Patching
 * 
 * Patches SpecKit scripts to support --no-branch flag and SOKOLD_CURRENT_BRANCH_ONLY env var.
 * Based on: https://github.com/github/spec-kit/issues/841
 */
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';

const PATCH_MARKER_START = '# [SOKOLD-PATCH-START:no-branch-support]';
const PATCH_MARKER_END = '# [SOKOLD-PATCH-END:no-branch-support]';

export type PatchStatus = 'not-initialized' | 'unpatched' | 'patched' | 'partially-patched';

interface PatchResult {
  success: boolean;
  status: PatchStatus;
  details: string[];
}

/**
 * Get the .specify scripts directory
 */
function getScriptsDir(rootPath: string = process.cwd()): string | null {
  const psDir = join(rootPath, '.specify', 'scripts', 'powershell');
  const bashDir = join(rootPath, '.specify', 'scripts', 'bash');
  
  if (existsSync(psDir)) return psDir;
  if (existsSync(bashDir)) return bashDir;
  return null;
}

/**
 * Check if a file contains patch markers
 */
function isPatched(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, 'utf-8');
  return content.includes(PATCH_MARKER_START);
}

/**
 * Get current patch status
 */
export function getSpeckitPatchStatus(rootPath: string = process.cwd()): PatchStatus {
  const specifyDir = join(rootPath, '.specify');
  if (!existsSync(specifyDir)) {
    return 'not-initialized';
  }

  const scriptsDir = getScriptsDir(rootPath);
  if (!scriptsDir) {
    return 'not-initialized';
  }

  const isPowerShell = scriptsDir.includes('powershell');
  const ext = isPowerShell ? '.ps1' : '.sh';
  
  // Only check the files we actually patch (check-prerequisites and setup-plan use common's functions)
  const filesToCheck = [
    `create-new-feature${ext}`,
    `common${ext}`,
  ];

  let patchedCount = 0;
  let existingCount = 0;

  for (const file of filesToCheck) {
    const filePath = join(scriptsDir, file);
    if (existsSync(filePath)) {
      existingCount++;
      if (isPatched(filePath)) {
        patchedCount++;
      }
    }
  }

  if (patchedCount === 0) return 'unpatched';
  if (patchedCount === existingCount) return 'patched';
  return 'partially-patched';
}

/**
 * Backup a file before patching
 */
function backupFile(filePath: string): void {
  const backupPath = filePath + '.sokold-backup';
  if (!existsSync(backupPath)) {
    copyFileSync(filePath, backupPath);
  }
}

/**
 * Restore a file from backup
 */
function restoreFromBackup(filePath: string): boolean {
  const backupPath = filePath + '.sokold-backup';
  if (existsSync(backupPath)) {
    copyFileSync(backupPath, filePath);
    return true;
  }
  return false;
}

/**
 * Apply patches to PowerShell scripts
 */
function patchPowerShellScripts(scriptsDir: string): PatchResult {
  const details: string[] = [];
  const allSuccess = true;

  // Patch create-new-feature.ps1
  const createFeaturePath = join(scriptsDir, 'create-new-feature.ps1');
  if (existsSync(createFeaturePath) && !isPatched(createFeaturePath)) {
    backupFile(createFeaturePath);
    let content = readFileSync(createFeaturePath, 'utf-8');
    
    // Add -NoBranch parameter after other params
    const paramMatch = content.match(/(\[CmdletBinding\(\)\]\s*param\s*\([^)]*\[switch\]\$Help)/s);
    if (paramMatch) {
      content = content.replace(
        paramMatch[1],
        `[CmdletBinding()]\nparam(\n    ${PATCH_MARKER_START}\n    [switch]$NoBranch,\n    ${PATCH_MARKER_END}\n    [switch]$Json,\n    [string]$ShortName,\n    [int]$Number = 0,\n    [switch]$Help`
      );
    }
    
    // Patch the featureDir creation to use current branch when in current-branch-only mode
    // This handles scripts that don't do git checkout but still create numbered directories
    const featureDirPattern = /\$featureDir = Join-Path \$specsDir \$branchName\s*\nNew-Item -ItemType Directory/;
    if (featureDirPattern.test(content)) {
      content = content.replace(
        featureDirPattern,
        `${PATCH_MARKER_START}
# Check if we should use current branch instead of creating numbered directory
# Check env var first, then fallback to config file
$currentBranchOnly = $false
if ($env:SOKOLD_CURRENT_BRANCH_ONLY -eq 'true') {
    $currentBranchOnly = $true
} else {
    # Check .sokold/config.yaml for currentBranchOnly setting
    $sokoldConfig = Join-Path $repoRoot '.sokold/config.yaml'
    if (Test-Path $sokoldConfig) {
        $configContent = Get-Content $sokoldConfig -Raw
        if ($configContent -match 'currentBranchOnly:\\s*true') {
            $currentBranchOnly = $true
        }
    }
}
$skipBranch = $NoBranch -or $currentBranchOnly
if ($skipBranch) {
    # Get current branch name (or fallback to 'main')
    try {
        $currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($currentBranch)) {
            $currentBranch = "main"
        }
    } catch {
        $currentBranch = "main"
    }
    Write-Output "[specify] Info: Current-branch-only mode - using specs/$currentBranch/ directory"
    $branchName = $currentBranch
}
${PATCH_MARKER_END}
$featureDir = Join-Path $specsDir $branchName
New-Item -ItemType Directory`
      );
      details.push('✓ Patched create-new-feature.ps1 (directory creation)');
    } else {
      // Try to find git checkout pattern (older script versions)
      const gitCheckoutPattern = /if \(\$hasGit\) \{\s*try \{\s*git checkout -b \$branchName/;
      if (gitCheckoutPattern.test(content)) {
        content = content.replace(
          gitCheckoutPattern,
          `${PATCH_MARKER_START}
# Check if branch/folder creation should be skipped (current-branch-only mode)
# Check env var first, then fallback to config file
$currentBranchOnly = $false
if ($env:SOKOLD_CURRENT_BRANCH_ONLY -eq 'true') {
    $currentBranchOnly = $true
} else {
    $sokoldConfig = Join-Path $repoRoot '.sokold/config.yaml'
    if (Test-Path $sokoldConfig) {
        $configContent = Get-Content $sokoldConfig -Raw
        if ($configContent -match 'currentBranchOnly:\\s*true') {
            $currentBranchOnly = $true
        }
    }
}
$skipBranch = $NoBranch -or $currentBranchOnly
if ($skipBranch) {
    # Get current branch name
    try {
        $currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
        if ($LASTEXITCODE -ne 0) { $currentBranch = "main" }
    } catch { $currentBranch = "main" }
    Write-Output "[specify] Info: Current-branch-only mode - using specs/$currentBranch/ directory"
    $branchName = $currentBranch
} elseif ($hasGit) {
    try {
        git checkout -b $branchName`
        );
        
        // Find the closing and add marker
        content = content.replace(
          /(\s*\}\s*else\s*\{\s*Write-Warning "[^"]*Git repository not detected[^"]*"\s*\})/,
          `$1\n${PATCH_MARKER_END}`
        );
        details.push('✓ Patched create-new-feature.ps1 (git checkout)');
      } else {
        details.push('⚠ Could not find patch point in create-new-feature.ps1');
      }
    }
    
    writeFileSync(createFeaturePath, content, 'utf-8');
  } else if (isPatched(createFeaturePath)) {
    details.push('→ create-new-feature.ps1 already patched');
  }

  // Patch common.ps1 - should already have env var checks based on what we saw
  const commonPath = join(scriptsDir, 'common.ps1');
  if (existsSync(commonPath) && !isPatched(commonPath)) {
    backupFile(commonPath);
    let content = readFileSync(commonPath, 'utf-8');
    
    // Check if it already has the SOKOLD_CURRENT_BRANCH_ONLY check
    if (!content.includes('SOKOLD_CURRENT_BRANCH_ONLY')) {
      // Add to Get-CurrentBranch function
      const getCurrentBranchMatch = content.match(/(function Get-CurrentBranch \{)/);
      if (getCurrentBranchMatch) {
        content = content.replace(
          getCurrentBranchMatch[1],
          `${getCurrentBranchMatch[1]}\n    ${PATCH_MARKER_START}\n    # Check if current-branch-only mode is enabled\n    if ($env:SOKOLD_CURRENT_BRANCH_ONLY -eq 'true') {\n        return "main"\n    }\n    ${PATCH_MARKER_END}`
        );
      }
      
      // Add to Test-FeatureBranch function
      const testFeatureBranchMatch = content.match(/(function Test-FeatureBranch \{[^}]*param\s*\([^)]*\))/s);
      if (testFeatureBranchMatch) {
        content = content.replace(
          testFeatureBranchMatch[0],
          `${testFeatureBranchMatch[0]}\n    \n    ${PATCH_MARKER_START}\n    # Skip validation in current-branch-only mode\n    if ($env:SOKOLD_CURRENT_BRANCH_ONLY -eq 'true') {\n        Write-Output "[specify] Current-branch-only mode: skipping branch validation"\n        return $true\n    }\n    ${PATCH_MARKER_END}`
        );
      }
      
      writeFileSync(commonPath, content, 'utf-8');
      details.push('✓ Patched common.ps1');
    } else {
      // Already has checks, just add markers for tracking
      if (!content.includes(PATCH_MARKER_START)) {
        content = content.replace(
          /# Check if current-branch-only mode is enabled/g,
          `${PATCH_MARKER_START}\n    # Check if current-branch-only mode is enabled`
        );
        content = content.replace(
          /return "main"\s*\}/,
          `return "main"\n    }\n    ${PATCH_MARKER_END}`
        );
        writeFileSync(commonPath, content, 'utf-8');
      }
      details.push('→ common.ps1 already has env var checks');
    }
  } else if (isPatched(commonPath)) {
    details.push('→ common.ps1 already patched');
  }

  // check-prerequisites.ps1 and setup-plan.ps1 use Test-FeatureBranch from common.ps1
  // so they don't need direct patching if common.ps1 is patched
  details.push('→ check-prerequisites.ps1 uses patched common.ps1');
  details.push('→ setup-plan.ps1 uses patched common.ps1');

  return {
    success: allSuccess,
    status: 'patched',
    details,
  };
}

/**
 * Apply patches to Bash scripts
 */
function patchBashScripts(scriptsDir: string): PatchResult {
  const details: string[] = [];
  const allSuccess = true;

  // Patch create-new-feature.sh
  const createFeaturePath = join(scriptsDir, 'create-new-feature.sh');
  if (existsSync(createFeaturePath) && !isPatched(createFeaturePath)) {
    backupFile(createFeaturePath);
    let content = readFileSync(createFeaturePath, 'utf-8');
    
    // Add NO_BRANCH variable after other variables
    const varMatch = content.match(/(SHORT_NAME="")/);
    if (varMatch) {
      content = content.replace(
        varMatch[1],
        `${varMatch[1]}\n${PATCH_MARKER_START}\nNO_BRANCH=false\n${PATCH_MARKER_END}`
      );
    }
    
    // Add --no-branch flag parsing
    const helpCaseMatch = content.match(/(--help\|-h\))/);
    if (helpCaseMatch) {
      content = content.replace(
        helpCaseMatch[1],
        `${PATCH_MARKER_START}\n    --no-branch)\n        NO_BRANCH=true\n        ;;\n    ${PATCH_MARKER_END}\n    ${helpCaseMatch[1]}`
      );
    }
    
    // Modify branch creation block
    const gitCheckoutPattern = /if \[ "\$HAS_GIT" = true \]; then\s*git checkout -b "\$BRANCH_NAME"/;
    if (gitCheckoutPattern.test(content)) {
      content = content.replace(
        gitCheckoutPattern,
        `${PATCH_MARKER_START}
if [ "$NO_BRANCH" = true ] || [ "$SOKOLD_CURRENT_BRANCH_ONLY" = "true" ]; then
    >&2 echo "[specify] Info: Skipping branch creation (--no-branch or SOKOLD_CURRENT_BRANCH_ONLY)"
elif [ "$HAS_GIT" = true ]; then
    git checkout -b "$BRANCH_NAME"
${PATCH_MARKER_END}`
      );
    }
    
    writeFileSync(createFeaturePath, content, 'utf-8');
    details.push('✓ Patched create-new-feature.sh');
  } else if (isPatched(createFeaturePath)) {
    details.push('→ create-new-feature.sh already patched');
  }

  // Patch common.sh
  const commonPath = join(scriptsDir, 'common.sh');
  if (existsSync(commonPath) && !isPatched(commonPath)) {
    backupFile(commonPath);
    let content = readFileSync(commonPath, 'utf-8');
    
    // Add env var check to get_current_branch
    const getCurrentBranchMatch = content.match(/(get_current_branch\s*\(\)\s*\{)/);
    if (getCurrentBranchMatch && !content.includes('SOKOLD_CURRENT_BRANCH_ONLY')) {
      content = content.replace(
        getCurrentBranchMatch[1],
        `${getCurrentBranchMatch[1]}\n    ${PATCH_MARKER_START}\n    # Check if current-branch-only mode is enabled\n    if [ "$SOKOLD_CURRENT_BRANCH_ONLY" = "true" ]; then\n        echo "main"\n        return\n    fi\n    ${PATCH_MARKER_END}`
      );
    }
    
    // Add env var check to check_feature_branch
    const checkFeatureBranchMatch = content.match(/(check_feature_branch\s*\(\)\s*\{)/);
    if (checkFeatureBranchMatch) {
      content = content.replace(
        checkFeatureBranchMatch[1],
        `${checkFeatureBranchMatch[1]}\n    ${PATCH_MARKER_START}\n    # Skip validation in current-branch-only mode\n    if [ "$SOKOLD_CURRENT_BRANCH_ONLY" = "true" ]; then\n        >&2 echo "[specify] Current-branch-only mode: skipping branch validation"\n        return 0\n    fi\n    ${PATCH_MARKER_END}`
      );
    }
    
    writeFileSync(commonPath, content, 'utf-8');
    details.push('✓ Patched common.sh');
  } else if (isPatched(commonPath)) {
    details.push('→ common.sh already patched');
  }

  details.push('→ check-prerequisites.sh uses patched common.sh');
  details.push('→ setup-plan.sh uses patched common.sh');

  return {
    success: allSuccess,
    status: 'patched',
    details,
  };
}

/**
 * Apply all patches to SpecKit scripts
 */
export function patchSpeckit(rootPath: string = process.cwd()): PatchResult {
  const scriptsDir = getScriptsDir(rootPath);
  
  if (!scriptsDir) {
    return {
      success: false,
      status: 'not-initialized',
      details: ['SpecKit not initialized. Run "specify init" first.'],
    };
  }

  const isPowerShell = scriptsDir.includes('powershell');
  
  if (isPowerShell) {
    return patchPowerShellScripts(scriptsDir);
  } else {
    return patchBashScripts(scriptsDir);
  }
}

/**
 * Remove all patches from SpecKit scripts
 */
export function unpatchSpeckit(rootPath: string = process.cwd()): PatchResult {
  const scriptsDir = getScriptsDir(rootPath);
  
  if (!scriptsDir) {
    return {
      success: false,
      status: 'not-initialized',
      details: ['SpecKit not initialized.'],
    };
  }

  const isPowerShell = scriptsDir.includes('powershell');
  const ext = isPowerShell ? '.ps1' : '.sh';
  const details: string[] = [];
  
  const filesToRestore = [
    `create-new-feature${ext}`,
    `common${ext}`,
  ];

  for (const file of filesToRestore) {
    const filePath = join(scriptsDir, file);
    if (restoreFromBackup(filePath)) {
      details.push(`✓ Restored ${file} from backup`);
    } else if (existsSync(filePath) && isPatched(filePath)) {
      // No backup, try to remove patch markers and patched code
      let content = readFileSync(filePath, 'utf-8');
      const patchRegex = new RegExp(
        `${PATCH_MARKER_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${PATCH_MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`,
        'g'
      );
      content = content.replace(patchRegex, '');
      writeFileSync(filePath, content, 'utf-8');
      details.push(`✓ Removed patches from ${file}`);
    } else {
      details.push(`→ ${file} not patched`);
    }
  }

  return {
    success: true,
    status: 'unpatched',
    details,
  };
}

/**
 * Print patch status to console
 */
export function printSpeckitStatus(rootPath: string = process.cwd()): void {
  const status = getSpeckitPatchStatus(rootPath);
  
  console.log('\n🧊 SpecKit Patch Status\n');
  
  switch (status) {
    case 'not-initialized':
      console.log('  Status: ❌ SpecKit not initialized');
      console.log('  Run "specify init" to initialize SpecKit first.');
      break;
    case 'unpatched':
      console.log('  Status: ⚪ Not patched');
      console.log('  Run "sokold speckit patch" to enable branch control.');
      break;
    case 'patched':
      console.log('  Status: ✅ Patched');
      console.log('  Branch control is enabled. Set workflow.currentBranchOnly=true to use.');
      break;
    case 'partially-patched':
      console.log('  Status: ⚠️ Partially patched');
      console.log('  Some scripts may have been updated. Run "sokold speckit patch" to fix.');
      break;
  }
  console.log('');
}
