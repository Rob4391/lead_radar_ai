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
        if (filter?.city) where.city = filter.city;
        if (filter?.category) where.category = filter.category;
        return this.prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' } });
    }

    async create(lead: any) {
        return this.prisma.lead.create({ data: lead });
    }
}
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
        if (filter?.city) where.city = filter.city;
        if (filter?.category) where.category = filter.category;
        return this.prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' } });
    }

    async create(lead: any) {
        return this.prisma.lead.create({ data: lead });
    }
}
