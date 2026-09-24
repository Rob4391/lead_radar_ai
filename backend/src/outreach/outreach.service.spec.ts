const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            messages: { create: mockCreate },
        })),
    };
});

import { OutreachService } from './outreach.service';

describe('OutreachService (Ollama, the default provider)', () => {
    const originalEnv = process.env;
    const originalFetch = global.fetch;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.LLM_PROVIDER;
    });

    afterEach(() => {
        process.env = originalEnv;
        global.fetch = originalFetch;
    });

    it('parses a successful response into outreach messages', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ response: '{"coldEmail": "a", "linkedinMessage": "b", "whatsappMessage": "c"}' }),
        }) as any;

        const service = new OutreachService();
        const result = await service.generateMessages({ name: 'Test Biz', website: null, reviewCount: 0 });

        expect(result).toEqual({ coldEmail: 'a', linkedinMessage: 'b', whatsappMessage: 'c' });
        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost:11434/api/generate',
            expect.objectContaining({ method: 'POST' }),
        );
    });

    it('throws a clear error when Ollama is unreachable', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;
        const service = new OutreachService();
        await expect(service.generateMessages({ name: 'Test Biz' })).rejects.toThrow('Could not reach Ollama');
    });

    it('throws when Ollama responds with a non-OK status', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'model not found' }) as any;
        const service = new OutreachService();
        await expect(service.generateMessages({ name: 'Test Biz' })).rejects.toThrow('status 500');
    });

    it('throws when the response has no "response" field', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
        const service = new OutreachService();
        await expect(service.generateMessages({ name: 'Test Biz' })).rejects.toThrow('did not include a "response" field');
    });

    it('propagates a parse error for a malformed response', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ response: 'not json at all' }) }) as any;
        const service = new OutreachService();
        await expect(service.generateMessages({ name: 'Test Biz' })).rejects.toThrow('did not contain a JSON object');
    });
});

describe('OutreachService (Anthropic, opt-in via LLM_PROVIDER=anthropic)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, LLM_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-ant-test' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('throws when ANTHROPIC_API_KEY is not configured', async () => {
        delete process.env.ANTHROPIC_API_KEY;
        const service = new OutreachService();
        await expect(service.generateMessages({ name: 'Test Biz' })).rejects.toThrow('ANTHROPIC_API_KEY');
    });

    it('parses a successful response into outreach messages', async () => {
        mockCreate.mockResolvedValue({
            content: [{ type: 'text', text: '{"coldEmail": "a", "linkedinMessage": "b", "whatsappMessage": "c"}' }],
        });

        const service = new OutreachService();
        const result = await service.generateMessages({ name: 'Test Biz', website: null, reviewCount: 0 });

        expect(result).toEqual({ coldEmail: 'a', linkedinMessage: 'b', whatsappMessage: 'c' });
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: [expect.objectContaining({ role: 'user' })],
            }),
        );
    });

    it('throws when the response has no text content block', async () => {
        mockCreate.mockResolvedValue({ content: [{ type: 'image' }] });
        const service = new OutreachService();
        await expect(service.generateMessages({ name: 'Test Biz' })).rejects.toThrow('No text content');
    });

    it('propagates a parse error for a malformed response', async () => {
        mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'not json at all' }] });
        const service = new OutreachService();
        await expect(service.generateMessages({ name: 'Test Biz' })).rejects.toThrow('did not contain a JSON object');
    });
});
