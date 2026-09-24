// Opportunity score (0-100): higher = easier win (no site, few reviews, no socials).
// 100 = no website + few reviews + no social presence; ~20 = already has a strong online presence.
export function computeOpportunityScore(lead: {
    website?: string | null;
    reviewCount?: number | null;
    instagram?: string | null;
    facebook?: string | null;
}): number {
    let score = 0;
    if (!lead.website) score += 40;
    const reviews = lead.reviewCount ?? 0;
    if (reviews < 10) score += 30;
    else if (reviews < 50) score += 15;
    if (!lead.instagram) score += 15;
    if (!lead.facebook) score += 15;
    return Math.min(100, score);
}
