import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { computeOpportunityScore } from './scoring';
import { rankCompetitors } from './competitors';
import { LeadStatus } from './lead-status';
import { mergeActivities } from './lead-activity';

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

    async saveAudit(id: number, audit: { websiteAgeYears: number | null; isOldWebsite: boolean; mobileFriendly: boolean; isSlowLoad: boolean; hasBrokenPages: boolean }) {
        return this.prisma.lead.update({
            where: { id },
            data: { ...audit, auditedAt: new Date() },
        });
    }

    async findActivity(userId: string, leadId: number) {
        return this.prisma.leadActivity.findUnique({ where: { userId_leadId: { userId, leadId } } });
    }

    // Shared leads + this user's private activity, in the flat shape the
    // frontend reads. Without a user (admin key) leads come back with defaults.
    async withActivity<L extends { id: number }>(leads: L[], userId?: string) {
        if (!userId || leads.length === 0) return mergeActivities(leads, []);
        const activities = await this.prisma.leadActivity.findMany({
            where: { userId, leadId: { in: leads.map((l) => l.id) } },
        });
        return mergeActivities(leads, activities);
    }

    private upsertActivity(userId: string, leadId: number, data: Record<string, unknown>) {
        return this.prisma.leadActivity.upsert({
            where: { userId_leadId: { userId, leadId } },
            update: data,
            create: { userId, leadId, ...data },
        });
    }

    async saveOutreach(userId: string, leadId: number, messages: { coldEmail: string; linkedinMessage: string; whatsappMessage: string }) {
        return this.upsertActivity(userId, leadId, { ...messages, outreachGeneratedAt: new Date() });
    }

    async saveProposal(userId: string, leadId: number, proposal: string) {
        return this.upsertActivity(userId, leadId, { proposal, proposalGeneratedAt: new Date() });
    }

    async updateStatus(userId: string, leadId: number, status: LeadStatus, notes?: string) {
        return this.upsertActivity(userId, leadId, {
            status,
            ...(notes !== undefined ? { notes } : {}),
            statusUpdatedAt: new Date(),
        });
    }

    async findCompetitors(id: number, limit = 3) {
        const lead = await this.findById(id);
        if (!lead) return null;

        const candidates = await this.prisma.lead.findMany({
            where: { city: lead.city, category: lead.category },
        });
        return rankCompetitors(candidates, id, limit);
    }
}
