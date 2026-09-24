export const LEAD_CSV_HEADER = [
    'name', 'phone', 'website', 'emails', 'urls', 'titles',
    'city', 'category', 'reviewCount', 'instagram', 'facebook', 'score',
    'coldEmail', 'linkedinMessage', 'whatsappMessage',
];

export interface CsvLead {
    name?: string | null;
    phone?: string | null;
    website?: string | null;
    emails?: string[] | null;
    urls?: string[] | null;
    titles?: string[] | null;
    city?: string | null;
    category?: string | null;
    reviewCount?: number | null;
    instagram?: string | null;
    facebook?: string | null;
    score?: number | null;
    coldEmail?: string | null;
    linkedinMessage?: string | null;
    whatsappMessage?: string | null;
}

function escapeCsvField(value: string): string {
    return `"${value.replace(/\n/g, ' ').replace(/"/g, '""')}"`;
}

export function leadToCsvRow(lead: CsvLead): string {
    const fields = [
        lead.name || '',
        lead.phone || '',
        lead.website || '',
        (lead.emails || []).join(';'),
        (lead.urls || []).join(';'),
        (lead.titles || []).join(';'),
        lead.city || '',
        lead.category || '',
        lead.reviewCount ?? '',
        lead.instagram || '',
        lead.facebook || '',
        lead.score ?? '',
        lead.coldEmail || '',
        lead.linkedinMessage || '',
        lead.whatsappMessage || '',
    ];
    return fields.map(v => escapeCsvField(String(v))).join(',');
}
