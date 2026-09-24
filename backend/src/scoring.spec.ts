import { computeOpportunityScore } from './scoring';

describe('computeOpportunityScore', () => {
    it('scores 100 for a business with no website, few reviews, and no socials', () => {
        expect(computeOpportunityScore({ website: null, reviewCount: 0, instagram: null, facebook: null })).toBe(100);
    });

    it('scores low for a business with strong online presence', () => {
        const score = computeOpportunityScore({
            website: 'https://example.com',
            reviewCount: 200,
            instagram: 'https://instagram.com/example',
            facebook: 'https://facebook.com/example',
        });
        expect(score).toBe(0);
    });

    it('gives partial credit for a mid-range review count', () => {
        const score = computeOpportunityScore({
            website: 'https://example.com',
            reviewCount: 25,
            instagram: 'https://instagram.com/example',
            facebook: 'https://facebook.com/example',
        });
        expect(score).toBe(15);
    });

    it('treats a missing reviewCount as zero reviews', () => {
        const score = computeOpportunityScore({ website: 'https://example.com' });
        expect(score).toBe(30 + 15 + 15);
    });

    it('never exceeds 100', () => {
        const score = computeOpportunityScore({ website: null, reviewCount: -5, instagram: null, facebook: null });
        expect(score).toBeLessThanOrEqual(100);
    });
});
