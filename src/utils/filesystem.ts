import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';

/**
 * Cross-platform path utilities
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath);
}

export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}

export function resolvePath(...segments: string[]): string {
  return path.resolve(...segments);
}

export function relativePath(from: string, to: string): string {
  return path.relative(from, to);
}

export function dirname(filePath: string): string {
  return path.dirname(filePath);
}

export function basename(filePath: string, ext?: string): string {
  return path.basename(filePath, ext);
}

export function extname(filePath: string): string {
  return path.extname(filePath);
}

/**
 * Get platform-specific config directory
 */
export function getConfigDir(): string {
  const home = os.homedir();
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming'), 'speckit-automate');
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'speckit-automate');
    default:
      return path.join(process.env.XDG_CONFIG_HOME ?? path.join(home, '.config'), 'speckit-automate');
  }
}

/**
 * Get platform-specific data directory
 */
export function getDataDir(): string {
  const home = os.homedir();
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local'), 'speckit-automate');
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'speckit-automate');
    default:
      return path.join(process.env.XDG_DATA_HOME ?? path.join(home, '.local', 'share'), 'speckit-automate');
  }
}

/**
 * Check if a path exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
  return fs.pathExists(filePath);
}

/**
 * Check if path is a directory
 */
export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if path is a file
 */
export async function isFile(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Ensure directory exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

/**
 * Read file contents
 */
export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Write file contents
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Copy file or directory
 */
export async function copy(src: string, dest: string): Promise<void> {
  await fs.copy(src, dest);
}

/**
 * Remove file or directory
 */
export async function remove(filePath: string): Promise<void> {
  await fs.remove(filePath);
}

/**
 * Read directory contents
 */
export async function readDir(dirPath: string): Promise<string[]> {
  return fs.readdir(dirPath);
}

/**
 * Find git root directory
 */
export async function findGitRoot(startPath: string): Promise<string | null> {
  let currentPath = resolvePath(startPath);
  const root = path.parse(currentPath).root;

  while (currentPath !== root) {
    const gitPath = joinPath(currentPath, '.git');
    if (await pathExists(gitPath)) {
      return currentPath;
    }
    currentPath = dirname(currentPath);
  }
  return null;
}

/**
 * Find SpecKit root directory (.specify folder)
 */
export async function findSpecKitRoot(startPath: string): Promise<string | null> {
  let currentPath = resolvePath(startPath);
  const root = path.parse(currentPath).root;

  while (currentPath !== root) {
    const specifyPath = joinPath(currentPath, '.specify');
    if (await pathExists(specifyPath)) {
      return currentPath;
    }
    currentPath = dirname(currentPath);
  }
  return null;
}
