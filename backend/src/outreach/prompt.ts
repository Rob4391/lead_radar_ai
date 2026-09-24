export interface OutreachLead {
    name?: string | null;
    website?: string | null;
    city?: string | null;
    category?: string | null;
    reviewCount?: number | null;
    instagram?: string | null;
    facebook?: string | null;
}

export interface OutreachMessages {
    coldEmail: string;
    linkedinMessage: string;
    whatsappMessage: string;
}

export function buildOutreachPrompt(lead: OutreachLead): string {
    const gaps: string[] = [];
    if (!lead.website) gaps.push('no website');
    if ((lead.reviewCount ?? 0) < 10) gaps.push('very few Google reviews');
    if (!lead.instagram) gaps.push('no Instagram presence');
    if (!lead.facebook) gaps.push('no Facebook presence');

    return `You are writing cold outreach on behalf of a digital marketing/SEO/web dev agency, targeting a local business with a weak online presence.

Business: ${lead.name || 'the business'}
Category: ${lead.category || 'unknown'}
City: ${lead.city || 'unknown'}
Website: ${lead.website || 'none'}
Google reviews: ${lead.reviewCount ?? 'unknown'}
Weak points: ${gaps.length > 0 ? gaps.join(', ') : 'generally solid online presence'}

Write three short, non-generic outreach messages that reference the specific weak points above. Keep them friendly, concise, and low-pressure — no hard-sell language, no exclamation-mark spam, no fake urgency.

Respond with ONLY a JSON object (no markdown fences, no commentary) with exactly these keys:
{
  "coldEmail": "a short email including a subject line",
  "linkedinMessage": "a short LinkedIn connection/outreach message, under 300 characters",
  "whatsappMessage": "a short, casual WhatsApp message, under 200 characters"
}`;
}

export function parseOutreachResponse(text: string): OutreachMessages {
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

    const obj = parsed as Partial<OutreachMessages>;
    if (
        typeof obj.coldEmail !== 'string' ||
        typeof obj.linkedinMessage !== 'string' ||
        typeof obj.whatsappMessage !== 'string'
    ) {
        throw new Error('Model response was missing one of coldEmail, linkedinMessage, whatsappMessage');
    }

    return { coldEmail: obj.coldEmail, linkedinMessage: obj.linkedinMessage, whatsappMessage: obj.whatsappMessage };
}
