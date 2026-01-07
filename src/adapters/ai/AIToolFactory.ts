import { AIToolAdapter, AIToolType } from './AIToolAdapter.js';
import { CopilotAdapter } from './CopilotAdapter.js';
import { ClaudeAdapter } from './ClaudeAdapter.js';

export class AIToolFactory {
  private static adapters: Map<AIToolType, AIToolAdapter> = new Map();

  static async detectAvailableTools(): Promise<AIToolAdapter[]> {
    const available: AIToolAdapter[] = [];

    const copilot = new CopilotAdapter();
    if (await copilot.detect()) {
      available.push(copilot);
      this.adapters.set(AIToolType.COPILOT, copilot);
    }

    const claude = new ClaudeAdapter();
    if (await claude.detect()) {
      available.push(claude);
      this.adapters.set(AIToolType.CLAUDE, claude);
    }

    return available;
  }

  static async getAdapter(type: AIToolType | null): Promise<AIToolAdapter | null> {
    // If type is specified, get that specific adapter
    if (type) {
      if (this.adapters.has(type)) {
        return this.adapters.get(type) ?? null;
      }

      // Try to create and detect the adapter
      const adapter = this.createAdapter(type);
      if (adapter && await adapter.detect()) {
        this.adapters.set(type, adapter);
        return adapter;
      }
      return null;
    }

    // Auto-detect: prefer Copilot, fallback to Claude
    const available = await this.detectAvailableTools();
    if (available.length > 0) {
      return available[0];
    }

    return null;
  }

  static createAdapter(type: AIToolType): AIToolAdapter | null {
    switch (type) {
      case AIToolType.COPILOT:
        return new CopilotAdapter();
      case AIToolType.CLAUDE:
        return new ClaudeAdapter();
      default:
        return null;
    }
  }

  static async getToolInfo(): Promise<Array<{ type: AIToolType; installed: boolean; version: string | null }>> {
    const tools: Array<{ type: AIToolType; installed: boolean; version: string | null }> = [];

    const copilot = new CopilotAdapter();
    const copilotInstalled = await copilot.detect();
    tools.push({
      type: AIToolType.COPILOT,
      installed: copilotInstalled,
      version: copilotInstalled ? await copilot.getVersion() : null,
    });

    const claude = new ClaudeAdapter();
    const claudeInstalled = await claude.detect();
    tools.push({
      type: AIToolType.CLAUDE,
      installed: claudeInstalled,
      version: claudeInstalled ? await claude.getVersion() : null,
    });

    return tools;
  }
}
