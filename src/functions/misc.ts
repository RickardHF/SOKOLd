import { Tool } from "ollama";
import * as readline from 'node:readline/promises';
import { ToolResponse } from "./types.js";
import { runAICommand, runShellCommand } from "./helpers.js";

export const askUserFunction: Tool = {
    type: 'function',
    function: {
        name: 'ask_user',
        description: 'Ask the user a question and wait for their response.',
        parameters: {
            type: 'object',
            properties: {
                question: {
                    type: 'string',
                    description: 'The question to ask the user.'
                }
            },
            required: ['question']
        }
    }
}

export async function askUserExec(question: string): Promise<ToolResponse> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    try {

        const answer = await rl.question(question);
        rl.close();
        return { status: 'success', content: answer };
    } catch (error) {
        rl.close();
        return { status: 'failure', content: `Error asking user: ${error}` };
    }
}

export const endProcessFunction: Tool = {
    type: 'function',
    function: {
        name: 'end_process',
        description: 'When you are finished with all the work, call this function to end the process.',
    }
}

export const continueProcessFunction: Tool = {
    type: 'function',
    function: {
        name: 'continue_process',
        description: 'Call this function to continue the process and proceed to the next step. If you need to reiterate provide a reasoning for why.',
        parameters: {
            type: 'object',
            properties: {
                continue: {
                    type: 'boolean',
                    description: 'Set to true to continue to the next step.'
                },
                reasoning: {
                    type: 'string',
                    description: 'The reasoning for reiterating the previous step. (optional)'
                }
            },
            required: ['continue']
        }
    }
}

export const reiterateFunction: Tool = {
    type: 'function',
    function: {
        name: 'reiterate_process',
        description: 'Call this function to reiterate the previous step. Provide a reasoning for why.',
        parameters: {
            type: 'object',
            properties: {
                reasoning: {
                    type: 'string',
                    description: 'The reasoning for reiterating the previous step.'
                }
            },
            required: ['reasoning']
        }
    }
}

export const runCommandFunction: Tool = {
    type: 'function',
    function: {
        name: 'run_command',
        description: 'Run a shell command in the project directory.',
        parameters: {
            type: 'object',
            properties: {
                command: {
                    type: 'string',
                    description: 'The shell command to run.'
                }
            },
            required: ['command']
        }
    }
}

export async function runCommandExec(command: string): Promise<ToolResponse> {
    try {
        const result = await runShellCommand(command);
        return {
            status: 'success',
            content: result
        };
    } catch (error) {
        return {
            status: 'failure',
            content: `Error running command: ${error}`
        };
    }
}

export const runAICommandFunction: Tool = {
    type: 'function',
    function: {
        name: 'run_ai_command',
        description: 'Run an AI command using the local-agentic CLI.',
        parameters: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'The prompt to send to the AI.'
                }
            },
            required: ['prompt']
        }
    }
}

export async function runAICommandExec(tool: 'copilot' | 'claude', prompt: string, model?: string): Promise<ToolResponse> {
    try {
        const result = await runAICommand(tool, prompt, { model });
        return {
            status: 'success',
            content: result
        };
    } catch (error) {
        return {
            status: 'failure',
            content: `Error running AI command: ${error}`
        };
    }
}

export const verifyQualityFunction: Tool = {
    type: 'function',
    function: {
        name: 'verify_quality',
        description: 'Verify the quality of the implemented feature by running tests and checks.',
    }
}

export async function verifyQualityExec(tool: 'copilot' | 'claude', model?: string): Promise<ToolResponse> {
    try {
        const result = await runAICommand(tool, 'Go through the implemented feature and verify its quality by running tests and checks. Pay attention to original user requirements and ensure all edge cases are covered. Focus especially on the changes made and make sure the code is secure and compliant. Ensure it lives up to the speckit specification.', { model });
        return {
            status: 'success',
            content: result
        };
    } catch (error) {
        return {
            status: 'failure',
            content: `Error verifying quality: ${error}`
        };
    }
}