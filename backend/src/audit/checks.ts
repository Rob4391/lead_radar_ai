export function isWebsiteOld(
    earliestSnapshotTimestamp: string | null,
    now: Date = new Date(),
): { ageYears: number | null; isOld: boolean } {
    if (!earliestSnapshotTimestamp || earliestSnapshotTimestamp.length < 8) {
        return { ageYears: null, isOld: false };
    }
    const year = Number(earliestSnapshotTimestamp.slice(0, 4));
    const month = Number(earliestSnapshotTimestamp.slice(4, 6)) - 1;
    const day = Number(earliestSnapshotTimestamp.slice(6, 8));
    const snapshotDate = new Date(year, month, day);
    const ageYears = (now.getTime() - snapshotDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return { ageYears: Math.round(ageYears * 10) / 10, isOld: ageYears >= 5 };
}

export function hasViewportMetaTag(html: string): boolean {
    return /<meta[^>]+name=["']viewport["']/i.test(html);
}

export function isSlowLoad(loadTimeMs: number, thresholdMs = 3000): boolean {
    return loadTimeMs > thresholdMs;
}

export function classifyPerformanceScore(score: number | null, threshold = 0.5): boolean | null {
    if (score === null || score === undefined) return null;
    return score < threshold;
}

export function extractInternalLinks(html: string, baseUrl: string, limit = 5): string[] {
    const hrefRegex = /href=["']([^"']+)["']/gi;
    const base = new URL(baseUrl);
    const links = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = hrefRegex.exec(html)) !== null && links.size < limit) {
        try {
            const resolved = new URL(match[1], base);
            if (resolved.hostname === base.hostname && resolved.href !== base.href) {
                links.add(resolved.href);
            }
        } catch {
            // ignore invalid/unparsable hrefs (mailto:, javascript:, etc.)
        }
    }
    return Array.from(links);
}
