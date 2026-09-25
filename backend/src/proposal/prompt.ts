export interface ProposalLead {
    name?: string | null;
    website?: string | null;
    city?: string | null;
    category?: string | null;
    isOldWebsite?: boolean | null;
    websiteAgeYears?: number | null;
    mobileFriendly?: boolean | null;
    isSlowLoad?: boolean | null;
    hasBrokenPages?: boolean | null;
}

export interface ProposalResult {
    proposal: string;
}

export function buildProposalPrompt(lead: ProposalLead): string {
    const findings: string[] = [];
    if (!lead.website) findings.push('has no website at all');
    if (lead.isOldWebsite) findings.push(`website is ${lead.websiteAgeYears ?? 'several'} years old`);
    if (lead.mobileFriendly === false) findings.push('site is not mobile-friendly');
    if (lead.isSlowLoad) findings.push('site loads slowly');
    if (lead.hasBrokenPages) findings.push('site has broken links');

    return `You are a digital marketing/web dev agency writing a short scope-of-work and pricing proposal for a prospective client, based on real findings about their online presence.

Business: ${lead.name || 'the business'}
Category: ${lead.category || 'unknown'}
City: ${lead.city || 'unknown'}
Website: ${lead.website || 'none'}
Findings: ${findings.length > 0 ? findings.join(', ') : 'no major issues found - focus the proposal on growth/marketing services instead of fixes'}

Write a short, professional proposal (plain text, simple line breaks, no markdown headers or asterisks) with exactly three parts:
1. A one-paragraph summary of the opportunity, referencing the specific findings above.
2. A bulleted scope of work (3-5 concrete line items addressing the findings).
3. A suggested pricing range in Indian Rupees (INR), appropriate for a small local business engagement.

Respond with ONLY a JSON object (no markdown fences, no commentary) with exactly this key:
{
  "proposal": "the full proposal text"
}`;
}

export function parseProposalResponse(text: string): ProposalResult {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error('Model response did not contain a JSON object');
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(match[0]);
    } catch {
        throw new Error('Model response was not valid JSON');
    }

    const obj = parsed as Partial<ProposalResult>;
    if (typeof obj.proposal !== 'string') {
        throw new Error('Model response was missing "proposal"');
    }

    return { proposal: obj.proposal };
}
