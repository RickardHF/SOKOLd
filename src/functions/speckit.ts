import { Tool } from "ollama";
import { ToolResponse } from "./types.js";
import { runAICommand } from "./helpers.js";


export const SpecifyFunction: Tool = {
    type: 'function',
    function: {
        name: 'specify_feature',
        description: 'Specify a new feature to be added to the project.',
        parameters: {
            type: 'object',
            properties: {
                feature_description: {
                    type: 'string',
                    description: 'A detailed description of the new feature. Focus on what and why, not how.'
                }
            },
            required: ['feature_description']
        }
    }
}

export const PlanFunction: Tool = {
    type: 'function',
    function: {
        name: 'plan_feature',
        description: 'Will plan the implementation of a feature.',
        parameters: {
            type: 'object',
            properties: {
                technical_requirements: {
                    type: 'string',
                    description: 'Technical requirements and constraints for the feature to be planned. (optional)'
                }
            }
        }
    }
}

export const TaskFunction: Tool = {
    type: 'function',
    function: {
        name: 'create_tasks',
        description: 'Create a list of tasks needed to implement a feature.',
    }
}

export const ImplementFunction: Tool = {
    type: 'function',
    function: {
        name: 'implement_feature',
        description: 'Implement the feature based on the provided plan and tasks.',
        parameters: {
            type: 'object',
            properties: {
                special_considerations: {
                    type: 'string',
                    description: 'Any special considerations to keep in mind during implementation.(optional)'
                }
            }
        }
    }
}

export async function specify(tool: 'copilot' | 'claude', feature_description: string, model?: string): Promise<ToolResponse> {
    try {
        const result = await runAICommand(tool, feature_description, { model, agent: 'speckit.specify' });
        return {
            status: 'success',
            content: result
        };
    } catch (error) {
        return {
            status: 'failure',
            content: `Error specifying feature: ${error}`
        };
    }
}

export async function plan(tool: 'copilot' | 'claude', technical_requirements?: string, model?: string): Promise<ToolResponse> {
    try {
        const prompt = technical_requirements ? technical_requirements : 'No specific technical requirements provided.';
        const result = await runAICommand(tool, prompt, { model, agent: 'speckit.plan' });
        return {
            status: 'success',
            content: result
        };
    } catch (error) {
        return {
            status: 'failure',
            content: `Error planning feature: ${error}`
        };
    }  
}

export async function createTasks(tool: 'copilot' | 'claude', model?: string): Promise<ToolResponse> {
    try {
        const result = await runAICommand(tool, '/speckit.tasks', { model });
        return {
            status: 'success',
            content: result
        };
    } catch (error) {
        return {
            status: 'failure',
            content: `Error creating tasks: ${error}`
        };
    }
}

export async function implement(tool: 'copilot' | 'claude', special_considerations?: string, model?: string): Promise<ToolResponse> {
    try {
        const prompt = special_considerations ? special_considerations : 'Implement the feature.';
        const result = await runAICommand(tool, prompt, { model, agent: 'speckit.implement' });
        return {
            status: 'success',
            content: result
        };
    } catch (error) {
        return {
            status: 'failure',
            content: `Error implementing feature: ${error}`
        };
    }
}