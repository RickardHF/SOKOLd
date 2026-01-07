import { glob } from 'glob';
import { pathExists, isDirectory, joinPath } from '../../utils/filesystem.js';
import { SpecParser, FeatureSpecification, Priority } from '../speckit/SpecParser.js';

export class FeatureScanner {
  private specParser: SpecParser;

  constructor() {
    this.specParser = new SpecParser();
  }

  async scan(rootPath: string): Promise<FeatureSpecification[]> {
    const specsDir = joinPath(rootPath, 'specs');
    
    if (!await pathExists(specsDir) || !await isDirectory(specsDir)) {
      return [];
    }

    const features: FeatureSpecification[] = [];
    
    // Find all spec.md files in specs/*/ directories
    const pattern = joinPath(specsDir, '*', 'spec.md').replace(/\\/g, '/');
    const specFiles = await glob(pattern);

    for (const specFile of specFiles) {
      try {
        const spec = await this.specParser.parse(specFile);
        features.push(spec);
      } catch (error) {
        // Skip invalid spec files
        console.warn(`Warning: Could not parse ${specFile}`);
      }
    }

    return features;
  }

  async scanByPriority(rootPath: string, priorities: Priority[]): Promise<FeatureSpecification[]> {
    const allFeatures = await this.scan(rootPath);
    return allFeatures.filter(f => priorities.includes(f.priority));
  }

  async scanFeature(rootPath: string, featureId: string): Promise<FeatureSpecification | null> {
    const specFile = joinPath(rootPath, 'specs', featureId, 'spec.md');
    
    if (!await pathExists(specFile)) {
      return null;
    }

    try {
      return await this.specParser.parse(specFile);
    } catch {
      return null;
    }
  }

  sortByPriority(features: FeatureSpecification[]): FeatureSpecification[] {
    const priorityOrder = { P1: 0, P2: 1, P3: 2, P4: 3 };
    return [...features].sort((a, b) => 
      (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4)
    );
  }
}
