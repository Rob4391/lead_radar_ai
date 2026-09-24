import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { computeOpportunityScore } from './scoring';

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
        const score = computeOpportunityScore(place);
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

    // Recompute + persist scores for existing leads (e.g. after schema/algorithm changes).
    async scoreLeads(filter?: { city?: string; category?: string }) {
        const leads = await this.findAll(filter);
        const updated = [];
        for (const lead of leads) {
            const score = computeOpportunityScore(lead);
            updated.push(await this.prisma.lead.update({ where: { id: lead.id }, data: { score } }));
        }
        return updated;
    }

    async findById(id: number) {
        return this.prisma.lead.findUnique({ where: { id } });
    }

    async saveOutreach(id: number, messages: { coldEmail: string; linkedinMessage: string; whatsappMessage: string }) {
        return this.prisma.lead.update({
            where: { id },
            data: { ...messages, outreachGeneratedAt: new Date() },
        });
    }

    async saveAudit(id: number, audit: { websiteAgeYears: number | null; isOldWebsite: boolean; mobileFriendly: boolean; isSlowLoad: boolean; hasBrokenPages: boolean }) {
        return this.prisma.lead.update({
            where: { id },
            data: { ...audit, auditedAt: new Date() },
        });
    }
}
