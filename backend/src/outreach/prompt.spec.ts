import { buildOutreachPrompt, parseOutreachResponse } from './prompt';

describe('buildOutreachPrompt', () => {
    it('calls out specific weak points for a lead with no website or socials', () => {
        const prompt = buildOutreachPrompt({ name: 'Joe\'s Dentist', reviewCount: 2 });
        expect(prompt).toContain('no website');
        expect(prompt).toContain('very few Google reviews');
        expect(prompt).toContain('no Instagram presence');
        expect(prompt).toContain('no Facebook presence');
        expect(prompt).toContain('Joe\'s Dentist');
    });

    it('does not claim weak points a lead does not have', () => {
        const prompt = buildOutreachPrompt({
            website: 'https://example.com',
            reviewCount: 100,
            instagram: 'https://instagram.com/x',
            facebook: 'https://facebook.com/x',
        });
        expect(prompt).toContain('generally solid online presence');
        expect(prompt).not.toContain('no website');
    });
});

describe('parseOutreachResponse', () => {
    it('parses a clean JSON response', () => {
        const result = parseOutreachResponse(
            '{"coldEmail": "Subject: hi\\n\\nbody", "linkedinMessage": "hi there", "whatsappMessage": "hey!"}',
        );
        expect(result).toEqual({
            coldEmail: 'Subject: hi\n\nbody',
            linkedinMessage: 'hi there',
            whatsappMessage: 'hey!',
        });
    });

    it('extracts JSON even when wrapped in markdown fences or commentary', () => {
        const text = 'Sure, here you go:\n```json\n{"coldEmail": "a", "linkedinMessage": "b", "whatsappMessage": "c"}\n```';
        expect(parseOutreachResponse(text)).toEqual({ coldEmail: 'a', linkedinMessage: 'b', whatsappMessage: 'c' });
    });

    it('throws when there is no JSON object in the response', () => {
        expect(() => parseOutreachResponse('sorry, I cannot help with that')).toThrow('did not contain a JSON object');
    });

    it('throws when a required key is missing', () => {
        expect(() => parseOutreachResponse('{"coldEmail": "a", "linkedinMessage": "b"}')).toThrow('missing one of');
    });
});
