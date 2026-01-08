/**
 * Project metadata types for code analysis
 */

export enum ProjectType {
  CLI = 'CLI',
  WEB_APP = 'WEB_APP',
  API = 'API',
  LIBRARY = 'LIBRARY',
  MOBILE = 'MOBILE',
  DESKTOP = 'DESKTOP',
  UNKNOWN = 'UNKNOWN'
}

export interface DirectoryInfo {
  path: string;
  purpose: string;
  fileCount: number;
}

export interface Dependency {
  name: string;
  version: string | null;
  type: 'runtime' | 'dev' | 'peer';
  source: string;
}

export interface ProjectMetadata {
  name: string;
  language: string;
  framework: string | null;
  testFramework: string | null;
  projectType: ProjectType;
  directoryStructure: DirectoryInfo[];
  dependencies: Dependency[];
  detectionMethod: 'user-input' | 'code-analysis' | 'hybrid';
  confidence: number;
}
