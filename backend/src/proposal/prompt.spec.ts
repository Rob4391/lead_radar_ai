import { buildProposalPrompt, parseProposalResponse } from './prompt';

describe('buildProposalPrompt', () => {
    it('includes audit findings when present', () => {
        const prompt = buildProposalPrompt({
            name: 'Joe\'s Cafe',
            website: 'https://joescafe.com',
            isOldWebsite: true,
            websiteAgeYears: 7.2,
            mobileFriendly: false,
            isSlowLoad: true,
            hasBrokenPages: true,
        });

        expect(prompt).toContain('website is 7.2 years old');
        expect(prompt).toContain('site is not mobile-friendly');
        expect(prompt).toContain('site loads slowly');
        expect(prompt).toContain('site has broken links');
    });

    it('flags a missing website as its own finding', () => {
        const prompt = buildProposalPrompt({ name: 'No Site Biz', website: null });
        expect(prompt).toContain('has no website at all');
    });

    it('falls back to a growth-focused framing when no issues are found', () => {
        const prompt = buildProposalPrompt({
            name: 'Clean Biz',
            website: 'https://cleanbiz.com',
            isOldWebsite: false,
            mobileFriendly: true,
            isSlowLoad: false,
            hasBrokenPages: false,
        });
        expect(prompt).toContain('no major issues found');
    });
});

describe('parseProposalResponse', () => {
    it('parses a valid JSON response', () => {
        const result = parseProposalResponse('{"proposal": "Here is the plan..."}');
        expect(result).toEqual({ proposal: 'Here is the plan...' });
    });

    it('extracts JSON even with surrounding commentary', () => {
        const result = parseProposalResponse('Sure! {"proposal": "text"} Hope that helps.');
        expect(result).toEqual({ proposal: 'text' });
    });

    it('throws when there is no JSON object', () => {
        expect(() => parseProposalResponse('not json at all')).toThrow('did not contain a JSON object');
    });

    it('throws when the proposal field is missing', () => {
        expect(() => parseProposalResponse('{"other": "field"}')).toThrow('missing "proposal"');
    });
});
