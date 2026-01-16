import ollama from 'ollama';
import { Tool, ToolCall, Message } from 'ollama';

export async function decide(messages: Message[],tools: Tool[], model: string = 'rnj-1'): Promise<DesicionResponse> {

    console.log('Deciding next action using model:', model);

    const response = await ollama.chat({
        model: model,
        messages: messages,
        tools: tools
    });

    const desicion : DesicionResponse = {
        status: response.done_reason === 'stop' ? 'success' : 'failure',
        content: response.message.content,
        tools: response.message.tool_calls || []
    }

    return desicion;
}

export type DesicionResponse = {
    status: 'success' | 'failure';
    content: string;
    tools: ToolCall[];
};