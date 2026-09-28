export type LeadStatus = 'NEW' | 'CONTACTED' | 'REPLIED' | 'WON' | 'LOST';

const LEAD_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'REPLIED', 'WON', 'LOST'];

export function isLeadStatus(value: unknown): value is LeadStatus {
    return typeof value === 'string' && (LEAD_STATUSES as string[]).includes(value);
}
