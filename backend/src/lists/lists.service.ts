import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ListsService implements OnModuleInit {
    private prisma = new PrismaClient();

    async onModuleInit() {
        await this.prisma.$connect();
    }

    async findAll(userId: string) {
        const lists = await this.prisma.list.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { items: true } } },
        });
        return lists.map((l) => ({ id: l.id, name: l.name, createdAt: l.createdAt, leadCount: l._count.items }));
    }

    async create(userId: string, name: string) {
        return this.prisma.list.create({ data: { userId, name } });
    }

    // Returns null if the list doesn't exist or doesn't belong to this user,
    // so callers can 404 without leaking another user's list by id.
    async findOwnedList(userId: string, listId: number) {
        return this.prisma.list.findFirst({ where: { id: listId, userId } });
    }

    async getListWithLeads(userId: string, listId: number) {
        const list = await this.findOwnedList(userId, listId);
        if (!list) return null;

        const items = await this.prisma.listLead.findMany({
            where: { listId },
            orderBy: { addedAt: 'desc' },
            include: { lead: true },
        });
        return { id: list.id, name: list.name, createdAt: list.createdAt, leads: items.map((i) => i.lead) };
    }

    async addLead(userId: string, listId: number, leadId: number) {
        const list = await this.findOwnedList(userId, listId);
        if (!list) return null;

        return this.prisma.listLead.upsert({
            where: { listId_leadId: { listId, leadId } },
            update: {},
            create: { listId, leadId },
        });
    }

    async removeLead(userId: string, listId: number, leadId: number) {
        const list = await this.findOwnedList(userId, listId);
        if (!list) return null;

        await this.prisma.listLead.deleteMany({ where: { listId, leadId } });
        return true;
    }

    async deleteList(userId: string, listId: number) {
        const list = await this.findOwnedList(userId, listId);
        if (!list) return null;

        await this.prisma.list.delete({ where: { id: listId } });
        return true;
    }
}
