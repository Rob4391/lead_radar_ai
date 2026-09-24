import { Injectable } from '@nestjs/common';
import { PrismaClient, Plan as PrismaPlan, SubscriptionStatus } from '@prisma/client';
import { PLAN_CONFIG, BILLING_PERIOD_DAYS, Plan } from './plans';

@Injectable()
export class SubscriptionService {
    private prisma = new PrismaClient();

    /** New users get the FREE tier immediately, no payment required. */
    private async getOrCreate(userId: string) {
        const existing = await this.prisma.subscription.findUnique({ where: { userId } });
        const now = new Date();
        const periodEnd = new Date(now.getTime() + BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000);

        // Self-heal a blank row from before FREE plans existed (never had a plan set).
        if (existing && existing.plan === null) {
            return this.prisma.subscription.update({
                where: { userId },
                data: { plan: 'FREE', status: 'ACTIVE', periodStart: now, currentPeriodEnd: periodEnd, searchesThisPeriod: 0 },
            });
        }
        if (existing) return existing;

        return this.prisma.subscription.create({
            data: { userId, plan: 'FREE', status: 'ACTIVE', periodStart: now, currentPeriodEnd: periodEnd },
        });
    }

    /**
     * Rolls the usage period forward once it lapses. The FREE plan auto-renews
     * (no payment involved); paid plans actually expire and need repurchasing.
     */
    private async syncPeriod(sub: {
        id: number;
        plan: PrismaPlan | null;
        status: SubscriptionStatus;
        periodStart: Date | null;
        currentPeriodEnd: Date | null;
        searchesThisPeriod: number;
    }) {
        const now = new Date();
        if (sub.status === 'ACTIVE' && sub.currentPeriodEnd && now > sub.currentPeriodEnd) {
            if (sub.plan === 'FREE') {
                const periodEnd = new Date(now.getTime() + BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000);
                return this.prisma.subscription.update({
                    where: { id: sub.id },
                    data: { periodStart: now, currentPeriodEnd: periodEnd, searchesThisPeriod: 0 },
                });
            }
            return this.prisma.subscription.update({
                where: { id: sub.id },
                data: { status: 'EXPIRED', searchesThisPeriod: 0 },
            });
        }
        return sub;
    }

    async getStatus(userId: string) {
        const raw = await this.getOrCreate(userId);
        const sub = await this.syncPeriod(raw);
        const limit = sub.plan ? PLAN_CONFIG[sub.plan as Plan].searchLimit : 0;
        return {
            plan: sub.plan,
            status: sub.status,
            searchesThisPeriod: sub.searchesThisPeriod,
            searchLimit: limit,
            remaining: limit === null ? null : Math.max(0, limit - sub.searchesThisPeriod),
            currentPeriodEnd: sub.currentPeriodEnd,
        };
    }

    async canSearch(userId: string): Promise<boolean> {
        const status = await this.getStatus(userId);
        if (status.status !== 'ACTIVE') return false;
        return status.searchLimit === null || status.searchesThisPeriod < status.searchLimit;
    }

    async recordSearch(userId: string) {
        await this.prisma.subscription.update({
            where: { userId },
            data: { searchesThisPeriod: { increment: 1 } },
        });
    }

    async activate(userId: string, plan: Plan, razorpayOrderId: string) {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000);
        await this.getOrCreate(userId);
        return this.prisma.subscription.update({
            where: { userId },
            data: {
                plan: plan as PrismaPlan,
                status: 'ACTIVE',
                periodStart: now,
                currentPeriodEnd: periodEnd,
                searchesThisPeriod: 0,
                lastRazorpayOrderId: razorpayOrderId,
            },
        });
    }
}
