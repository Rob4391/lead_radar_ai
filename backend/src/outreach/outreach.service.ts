import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { buildOutreachPrompt, parseOutreachResponse, OutreachLead, OutreachMessages } from './prompt';

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5';
const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen2.5:1.5b';

@Injectable()
export class OutreachService {
    private readonly logger = new Logger(OutreachService.name);
    private anthropicClient: Anthropic | null = null;

    /** Ollama (free, local) unless LLM_PROVIDER=anthropic is explicitly set. */
    private getProvider(): 'anthropic' | 'ollama' {
        return process.env.LLM_PROVIDER === 'anthropic' ? 'anthropic' : 'ollama';
    }

    private getAnthropicClient(): Anthropic {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY is not configured');
        }
        if (!this.anthropicClient) {
            this.anthropicClient = new Anthropic({ apiKey });
        }
        return this.anthropicClient;
    }

    private async callAnthropic(prompt: string): Promise<string> {
        const client = this.getAnthropicClient();
        const response = await client.messages.create({
            model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        });

        const textBlock = response.content.find((block) => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
            throw new Error('No text content in model response');
        }
        return textBlock.text;
    }

    private async callOllama(prompt: string): Promise<string> {
        const baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
        const model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

        let res: Response;
        try {
            res = await fetch(`${baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt, stream: false }),
            });
        } catch (err) {
            throw new Error(`Could not reach Ollama at ${baseUrl} — is "ollama serve" running? (${(err as Error).message})`);
        }

        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Ollama request failed with status ${res.status}: ${body}`);
        }

        const data: any = await res.json();
        if (typeof data.response !== 'string') {
            throw new Error('Ollama response did not include a "response" field');
        }
        return data.response;
    }

    async generateMessages(lead: OutreachLead): Promise<OutreachMessages> {
        const prompt = buildOutreachPrompt(lead);
        const text = this.getProvider() === 'anthropic' ? await this.callAnthropic(prompt) : await this.callOllama(prompt);

        try {
            return parseOutreachResponse(text);
        } catch (err) {
            this.logger.error(`Failed to parse outreach response: ${(err as Error).message}`);
            throw err;
        }
    }
}
