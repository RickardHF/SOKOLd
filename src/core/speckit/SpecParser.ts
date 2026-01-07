import { pathExists, readFile } from '../../utils/filesystem.js';

export enum Priority {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
}

export interface AcceptanceScenario {
  given: string;
  when: string;
  then: string;
}

export interface UserStory {
  id: string;
  title: string;
  priority: Priority;
  description: string;
  acceptanceScenarios: AcceptanceScenario[];
}

export interface FunctionalRequirement {
  id: string;
  description: string;
}

export interface FeatureSpecification {
  id: string;
  name: string;
  path: string;
  priority: Priority;
  userStories: UserStory[];
  requirements: FunctionalRequirement[];
  rawContent: string;
}

export class SpecParser {
  async parse(specPath: string): Promise<FeatureSpecification> {
    if (!await pathExists(specPath)) {
      throw new Error(`Spec file not found: ${specPath}`);
    }

    const content = await readFile(specPath);
    const dirName = specPath.split(/[/\\]/).slice(-2)[0];
    
    return {
      id: this.extractId(dirName),
      name: this.extractName(content, dirName),
      path: specPath,
      priority: this.extractPriority(content),
      userStories: this.extractUserStories(content),
      requirements: this.extractRequirements(content),
      rawContent: content,
    };
  }

  private extractId(dirName: string): string {
    // Extract ID from directory name (e.g., "1-feature-name" -> "1-feature-name")
    return dirName;
  }

  private extractName(content: string, fallback: string): string {
    // Try to extract name from first H1 heading
    const match = content.match(/^#\s+(?:Feature Specification:\s*)?(.+)$/m);
    if (match) {
      return match[1].trim();
    }
    // Fallback to directory name, formatted
    return fallback.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private extractPriority(content: string): Priority {
    // Look for priority in user stories
    const priorityMatch = content.match(/Priority:\s*(P[1-4])/i);
    if (priorityMatch) {
      return priorityMatch[1].toUpperCase() as Priority;
    }
    return Priority.P3; // Default priority
  }

  private extractUserStories(content: string): UserStory[] {
    const stories: UserStory[] = [];
    
    // Match user story sections
    const storyRegex = /###\s+User Story\s+(\d+)\s*[-–]\s*(.+?)\s*\(Priority:\s*(P[1-4])\)/gi;
    let storyMatch;
    
    while ((storyMatch = storyRegex.exec(content)) !== null) {
      const id = `US${storyMatch[1]}`;
      const title = storyMatch[2].trim();
      const priority = storyMatch[3].toUpperCase() as Priority;
      
      // Find content between this story and next story or section
      const storyStart = storyMatch.index;
      const nextSection = content.indexOf('### ', storyStart + storyMatch[0].length);
      const storyContent = nextSection > 0 
        ? content.slice(storyStart, nextSection) 
        : content.slice(storyStart);
      
      stories.push({
        id,
        title,
        priority,
        description: this.extractStoryDescription(storyContent),
        acceptanceScenarios: this.extractAcceptanceScenarios(storyContent),
      });
    }
    
    return stories;
  }

  private extractStoryDescription(storyContent: string): string {
    // Get first paragraph after the header
    const lines = storyContent.split('\n').slice(1);
    const descLines: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('**') || line.startsWith('###') || line.trim() === '') {
        if (descLines.length > 0) break;
        continue;
      }
      descLines.push(line.trim());
    }
    
    return descLines.join(' ').trim();
  }

  private extractAcceptanceScenarios(storyContent: string): AcceptanceScenario[] {
    const scenarios: AcceptanceScenario[] = [];
    
    // Match Given/When/Then patterns
    const scenarioRegex = /\*\*Given\*\*\s+(.+?),?\s*\*\*When\*\*\s+(.+?),?\s*\*\*Then\*\*\s+(.+?)(?:\n|$)/gi;
    let match;
    
    while ((match = scenarioRegex.exec(storyContent)) !== null) {
      scenarios.push({
        given: match[1].trim(),
        when: match[2].trim(),
        then: match[3].trim(),
      });
    }
    
    return scenarios;
  }

  private extractRequirements(content: string): FunctionalRequirement[] {
    const requirements: FunctionalRequirement[] = [];
    
    // Match FR-XXX patterns
    const reqRegex = /\*\*?(FR-\d{3})\*\*?:?\s*(.+?)(?:\n|$)/gi;
    let match;
    
    while ((match = reqRegex.exec(content)) !== null) {
      requirements.push({
        id: match[1],
        description: match[2].trim(),
      });
    }
    
    return requirements;
  }
}
