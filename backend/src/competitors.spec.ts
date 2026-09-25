import { rankCompetitors } from './competitors';

describe('rankCompetitors', () => {
    it('excludes the lead itself', () => {
        const result = rankCompetitors(
            [{ id: 1, score: 10, website: 'https://a.com' }],
            1,
        );
        expect(result).toHaveLength(0);
    });

    it('excludes listings with no website and no reviews', () => {
        const result = rankCompetitors(
            [{ id: 2, score: 10, website: null, reviewCount: 0 }],
            1,
        );
        expect(result).toHaveLength(0);
    });

    it('includes a listing with reviews but no website', () => {
        const result = rankCompetitors(
            [{ id: 2, score: 40, website: null, reviewCount: 25 }],
            1,
        );
        expect(result).toHaveLength(1);
    });

    it('ranks by strongest online presence first (lowest opportunity score)', () => {
        const result = rankCompetitors(
            [
                { id: 2, score: 60, website: 'https://weak.com', reviewCount: 5 },
                { id: 3, score: 10, website: 'https://strong.com', reviewCount: 200 },
                { id: 4, score: 35, website: 'https://mid.com', reviewCount: 50 },
            ],
            1,
        );
        expect(result.map((c) => c.id)).toEqual([3, 4, 2]);
    });

    it('treats a missing score as the weakest (never ranked ahead of a scored peer)', () => {
        const result = rankCompetitors(
            [
                { id: 2, score: undefined, website: 'https://unknown.com', reviewCount: 5 },
                { id: 3, score: 10, website: 'https://strong.com', reviewCount: 200 },
            ],
            1,
        );
        expect(result.map((c) => c.id)).toEqual([3, 2]);
    });

    it('respects the limit', () => {
        const candidates = Array.from({ length: 10 }, (_, i) => ({
            id: i + 2,
            score: i,
            website: 'https://x.com',
        }));
        const result = rankCompetitors(candidates, 1, 3);
        expect(result).toHaveLength(3);
    });
});
