const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            messages: { create: mockCreate },
        })),
    };
});

import { ProposalService } from './proposal.service';

describe('ProposalService (Ollama, the default provider)', () => {
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

    it('parses a successful response into a proposal', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ response: '{"proposal": "Here is the plan..."}' }),
        }) as any;

        const service = new ProposalService();
        const result = await service.generateProposal({ name: 'Test Biz', website: null });

        expect(result).toEqual({ proposal: 'Here is the plan...' });
        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost:11434/api/generate',
            expect.objectContaining({ method: 'POST' }),
        );
    });

    it('throws a clear error when Ollama is unreachable', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;
        const service = new ProposalService();
        await expect(service.generateProposal({ name: 'Test Biz' })).rejects.toThrow('Could not reach Ollama');
    });

    it('propagates a parse error for a malformed response', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ response: 'not json at all' }) }) as any;
        const service = new ProposalService();
        await expect(service.generateProposal({ name: 'Test Biz' })).rejects.toThrow('did not contain a JSON object');
    });
});

describe('ProposalService (Anthropic, opt-in via LLM_PROVIDER=anthropic)', () => {
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
        const service = new ProposalService();
        await expect(service.generateProposal({ name: 'Test Biz' })).rejects.toThrow('ANTHROPIC_API_KEY');
    });

    it('parses a successful response into a proposal', async () => {
        mockCreate.mockResolvedValue({
            content: [{ type: 'text', text: '{"proposal": "Here is the plan..."}' }],
        });

        const service = new ProposalService();
        const result = await service.generateProposal({ name: 'Test Biz', website: null });

        expect(result).toEqual({ proposal: 'Here is the plan...' });
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: [expect.objectContaining({ role: 'user' })],
            }),
        );
    });
});
