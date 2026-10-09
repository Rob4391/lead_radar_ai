import { LeadStatus } from './lead-status';

export interface LeadActivityFields {
    coldEmail: string | null;
    linkedinMessage: string | null;
    whatsappMessage: string | null;
    outreachGeneratedAt: Date | null;
    proposal: string | null;
    proposalGeneratedAt: Date | null;
    status: LeadStatus;
    notes: string | null;
    statusUpdatedAt: Date | null;
}

const EMPTY_ACTIVITY: LeadActivityFields = {
    coldEmail: null,
    linkedinMessage: null,
    whatsappMessage: null,
    outreachGeneratedAt: null,
    proposal: null,
    proposalGeneratedAt: null,
    status: 'NEW',
    notes: null,
    statusUpdatedAt: null,
};

/**
 * Overlays one user's private activity onto shared leads, so API responses
 * keep the same flat shape the frontend already reads (lead.status,
 * lead.coldEmail, ...) while each user only ever sees their own values.
 */
export function mergeActivities<L extends { id: number }>(
    leads: L[],
    activities: ({ leadId: number } & Partial<LeadActivityFields>)[],
): (L & LeadActivityFields)[] {
    const byLead = new Map(activities.map((a) => [a.leadId, a]));
    return leads.map((lead) => {
        const activity = byLead.get(lead.id);
        const merged: LeadActivityFields = { ...EMPTY_ACTIVITY };
        if (activity) {
            for (const key of Object.keys(EMPTY_ACTIVITY) as (keyof LeadActivityFields)[]) {
                if (activity[key] !== undefined) (merged as any)[key] = activity[key];
            }
        }
        return { ...lead, ...merged };
    });
}
