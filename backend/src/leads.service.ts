import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class LeadsService implements OnModuleInit {
    private prisma = new PrismaClient();

    async onModuleInit() {
        await this.prisma.$connect();
    }

    async findAll(filter?: { city?: string; category?: string }) {
        const where: any = {};
        if (filter?.city) where.city = { equals: filter.city, mode: 'insensitive' };
        if (filter?.category) where.category = { equals: filter.category, mode: 'insensitive' };
        return this.prisma.lead.findMany({ where, orderBy: [{ score: 'desc' }, { createdAt: 'desc' }] });
    }

    async create(lead: any) {
        return this.prisma.lead.create({ data: lead });
    }

    async upsertFromPlace(place: { placeId: string; name?: string; phone?: string; website?: string; reviewCount?: number }, city: string, category: string) {
        const score = this.computeScore(place);
        return this.prisma.lead.upsert({
            where: { placeId: place.placeId },
            update: { name: place.name, phone: place.phone, website: place.website, reviewCount: place.reviewCount, score },
            create: {
                placeId: place.placeId,
                name: place.name,
                phone: place.phone,
                website: place.website,
                reviewCount: place.reviewCount,
                score,
                city,
                category,
                emails: [],
                urls: [],
                titles: [],
            },
        });
    }

    // Opportunity score (0-100): higher = easier win (no site, few reviews, no socials).
    // 100 = no website + few reviews + no social presence; ~20 = already has a strong online presence.
    private computeScore(lead: { website?: string | null; reviewCount?: number | null; instagram?: string | null; facebook?: string | null }): number {
        let score = 0;
        if (!lead.website) score += 40;
        const reviews = lead.reviewCount ?? 0;
        if (reviews < 10) score += 30;
        else if (reviews < 50) score += 15;
        if (!lead.instagram) score += 15;
        if (!lead.facebook) score += 15;
        return Math.min(100, score);
    }

    // Recompute + persist scores for existing leads (e.g. after schema/algorithm changes).
    async scoreLeads(filter?: { city?: string; category?: string }) {
        const leads = await this.findAll(filter);
        const updated = [];
        for (const lead of leads) {
            const score = this.computeScore(lead);
            updated.push(await this.prisma.lead.update({ where: { id: lead.id }, data: { score } }));
        }
        return updated;
    }
}
