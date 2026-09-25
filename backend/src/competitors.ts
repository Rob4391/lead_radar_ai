export interface CompetitorCandidate {
    id: number;
    name?: string | null;
    website?: string | null;
    reviewCount?: number | null;
    instagram?: string | null;
    facebook?: string | null;
    score?: number | null;
}

/**
 * Picks the strongest local peers to benchmark a lead against - the pitch is
 * "here's what your competitors have that you don't", so this ranks by
 * strongest online presence (lowest opportunity score = fewest weak points),
 * excluding the lead itself and listings with no real presence to compare.
 */
export function rankCompetitors(
    candidates: CompetitorCandidate[],
    excludeId: number,
    limit = 3,
): CompetitorCandidate[] {
    return candidates
        .filter((c) => c.id !== excludeId)
        .filter((c) => Boolean(c.website) || (c.reviewCount ?? 0) > 0)
        .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
        .slice(0, limit);
}
