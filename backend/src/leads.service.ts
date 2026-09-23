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
        return this.prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' } });
    }

    async create(lead: any) {
        return this.prisma.lead.create({ data: lead });
    }

    async upsertFromPlace(place: { placeId: string; name?: string; phone?: string; website?: string; reviewCount?: number }, city: string, category: string) {
        return this.prisma.lead.upsert({
            where: { placeId: place.placeId },
            update: { name: place.name, phone: place.phone, website: place.website, reviewCount: place.reviewCount },
            create: {
                placeId: place.placeId,
                name: place.name,
                phone: place.phone,
                website: place.website,
                reviewCount: place.reviewCount,
                city,
                category,
                emails: [],
                urls: [],
                titles: [],
            },
        });
    }
}
