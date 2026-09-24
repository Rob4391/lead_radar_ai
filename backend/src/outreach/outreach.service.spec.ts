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

describe('OutreachService', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, ANTHROPIC_API_KEY: 'sk-ant-test' };
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
