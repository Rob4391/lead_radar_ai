export class AuditService {
    // Simple scoring placeholder: returns score 0-100
    scorePresence(data: { website?: string; reviews?: number; ssl?: boolean; instagram?: string | null; facebook?: string | null }) {
        let score = 0;
        if (!data.website) score += 50;
        if ((data.reviews || 0) < 10) score += 20;
        if (!data.ssl) score += 10;
        if (!data.instagram) score += 10;
        if (!data.facebook) score += 10;
        return Math.min(100, score);
    }
}
