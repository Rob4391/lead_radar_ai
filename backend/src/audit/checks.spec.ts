import { classifyPerformanceScore, extractInternalLinks, hasViewportMetaTag, isSlowLoad, isWebsiteOld } from './checks';

describe('isWebsiteOld', () => {
    it('returns null age when no snapshot exists', () => {
        expect(isWebsiteOld(null)).toEqual({ ageYears: null, isOld: false });
    });

    it('returns null age when timestamp is too short', () => {
        expect(isWebsiteOld('2020')).toEqual({ ageYears: null, isOld: false });
    });

    it('flags a site older than 5 years as old', () => {
        const now = new Date(2026, 0, 1);
        const result = isWebsiteOld('20180101000000', now);
        expect(result.isOld).toBe(true);
        expect(result.ageYears).toBeCloseTo(8, 0);
    });

    it('does not flag a recent site as old', () => {
        const now = new Date(2026, 0, 1);
        const result = isWebsiteOld('20250601000000', now);
        expect(result.isOld).toBe(false);
    });
});

describe('hasViewportMetaTag', () => {
    it('detects a viewport meta tag', () => {
        expect(hasViewportMetaTag('<head><meta name="viewport" content="width=device-width"></head>')).toBe(true);
    });

    it('returns false when no viewport tag is present', () => {
        expect(hasViewportMetaTag('<head><title>No viewport here</title></head>')).toBe(false);
    });
});

describe('isSlowLoad', () => {
    it('flags load times above the threshold', () => {
        expect(isSlowLoad(4000)).toBe(true);
    });

    it('does not flag load times under the threshold', () => {
        expect(isSlowLoad(1500)).toBe(false);
    });
});

describe('classifyPerformanceScore', () => {
    it('returns null when score is missing', () => {
        expect(classifyPerformanceScore(null)).toBeNull();
    });

    it('flags a low score as slow', () => {
        expect(classifyPerformanceScore(0.3)).toBe(true);
    });

    it('does not flag a high score as slow', () => {
        expect(classifyPerformanceScore(0.9)).toBe(false);
    });
});

describe('extractInternalLinks', () => {
    it('extracts unique internal links, ignoring external and non-http hrefs', () => {
        const html = `
            <a href="/about">About</a>
            <a href="https://example.com/contact">Contact</a>
            <a href="https://other.com/page">Other site</a>
            <a href="mailto:hi@example.com">Mail</a>
            <a href="/about">About again</a>
        `;
        const links = extractInternalLinks(html, 'https://example.com');
        expect(links).toEqual(['https://example.com/about', 'https://example.com/contact']);
    });

    it('respects the limit', () => {
        const html = `<a href="/a">a</a><a href="/b">b</a><a href="/c">c</a>`;
        const links = extractInternalLinks(html, 'https://example.com', 2);
        expect(links).toHaveLength(2);
    });
});
