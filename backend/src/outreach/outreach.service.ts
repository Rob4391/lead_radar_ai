import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { buildOutreachPrompt, parseOutreachResponse, OutreachLead, OutreachMessages } from './prompt';

const DEFAULT_MODEL = 'claude-sonnet-5';

@Injectable()
export class OutreachService {
    private readonly logger = new Logger(OutreachService.name);
    private client: Anthropic | null = null;

    private getClient(): Anthropic {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY is not configured');
        }
        if (!this.client) {
            this.client = new Anthropic({ apiKey });
        }
        return this.client;
    }

    async generateMessages(lead: OutreachLead): Promise<OutreachMessages> {
        const client = this.getClient();
        const prompt = buildOutreachPrompt(lead);

        const response = await client.messages.create({
            model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        });

        const textBlock = response.content.find((block) => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
            throw new Error('No text content in model response');
        }

        try {
            return parseOutreachResponse(textBlock.text);
        } catch (err) {
            this.logger.error(`Failed to parse outreach response: ${(err as Error).message}`);
            throw err;
        }
    }
}
