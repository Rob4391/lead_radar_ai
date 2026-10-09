let store: Record<string, any> = {};
let payments: Record<string, any> = {};
let nextId = 1;

const mockPrisma = {
    subscription: {
        findUnique: jest.fn(({ where: { userId } }: any) => Promise.resolve(store[userId] ?? null)),
        create: jest.fn(({ data }: any) => {
            const row = {
                id: nextId++,
                userId: data.userId,
                plan: null,
                status: 'EXPIRED',
                periodStart: null,
                currentPeriodEnd: null,
                searchesThisPeriod: 0,
                lastRazorpayOrderId: null,
                ...data,
            };
            store[data.userId] = row;
            return Promise.resolve(row);
        }),
        update: jest.fn(({ where: { userId, id }, data }: any) => {
            const key = userId ?? Object.keys(store).find((k) => store[k].id === id);
            const row = store[key!];
            if (data.searchesThisPeriod?.increment) {
                row.searchesThisPeriod += data.searchesThisPeriod.increment;
            } else {
                Object.assign(row, data);
            }
            return Promise.resolve(row);
        }),
    },
    payment: {
        findUnique: jest.fn(({ where: { orderId } }: any) => Promise.resolve(payments[orderId] ?? null)),
        create: jest.fn(({ data }: any) => {
            if (payments[data.orderId]) return Promise.reject(Object.assign(new Error('unique'), { code: 'P2002' }));
            payments[data.orderId] = data;
            return Promise.resolve(data);
        }),
    },
    $transaction: jest.fn((fn: any) => fn(mockPrisma)),
};

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
    let service: SubscriptionService;

    beforeEach(() => {
        store = {};
        payments = {};
        nextId = 1;
        jest.clearAllMocks();
        service = new SubscriptionService();
    });

    it('grants a brand-new user the FREE plan with 10 searches automatically', async () => {
        const status = await service.getStatus('user_1');
        expect(status.status).toBe('ACTIVE');
        expect(status.plan).toBe('FREE');
        expect(status.searchLimit).toBe(10);
        expect(status.remaining).toBe(10);
        expect(await service.canSearch('user_1')).toBe(true);
    });

    it('heals a legacy blank row (plan: null, status: EXPIRED) into an active FREE plan', async () => {
        store['user_legacy'] = {
            id: nextId++,
            userId: 'user_legacy',
            plan: null,
            status: 'EXPIRED',
            periodStart: null,
            currentPeriodEnd: null,
            searchesThisPeriod: 0,
            lastRazorpayOrderId: null,
        };

        const status = await service.getStatus('user_legacy');
        expect(status.plan).toBe('FREE');
        expect(status.status).toBe('ACTIVE');
        expect(status.searchLimit).toBe(10);
        expect(await service.canSearch('user_legacy')).toBe(true);
    });

    it('blocks searches once the FREE limit is reached', async () => {
        await service.getStatus('user_free'); // provisions the FREE plan
        store['user_free'].searchesThisPeriod = 10;
        expect(await service.canSearch('user_free')).toBe(false);
    });

    it('auto-renews the FREE plan once its period lapses, instead of expiring', async () => {
        await service.getStatus('user_renew');
        store['user_renew'].searchesThisPeriod = 10;
        store['user_renew'].currentPeriodEnd = new Date(Date.now() - 1000);

        const status = await service.getStatus('user_renew');
        expect(status.status).toBe('ACTIVE');
        expect(status.plan).toBe('FREE');
        expect(status.searchesThisPeriod).toBe(0);
        expect(status.remaining).toBe(10);
    });

    it('activates a plan with the correct limit and a 30-day period', async () => {
        await service.activate('user_2', 'GROWTH', 'order_abc');
        const status = await service.getStatus('user_2');

        expect(status.status).toBe('ACTIVE');
        expect(status.plan).toBe('GROWTH');
        expect(status.searchLimit).toBe(250);
        expect(status.remaining).toBe(250);
        expect(status.currentPeriodEnd).toBeInstanceOf(Date);
    });

    it('allows unlimited searches on the AGENCY plan', async () => {
        await service.activate('user_3', 'AGENCY', 'order_xyz');
        for (let i = 0; i < 5; i++) {
            expect(await service.canSearch('user_3')).toBe(true);
            await service.recordSearch('user_3');
        }
        const status = await service.getStatus('user_3');
        expect(status.searchLimit).toBeNull();
        expect(status.remaining).toBeNull();
    });

    it('blocks searches once the STARTER limit is reached', async () => {
        await service.activate('user_4', 'STARTER', 'order_starter');
        store['user_4'].searchesThisPeriod = 50;
        expect(await service.canSearch('user_4')).toBe(false);

        store['user_4'].searchesThisPeriod = 49;
        expect(await service.canSearch('user_4')).toBe(true);
    });

    it('expires an ACTIVE subscription once currentPeriodEnd has passed', async () => {
        await service.activate('user_5', 'STARTER', 'order_old');
        store['user_5'].currentPeriodEnd = new Date(Date.now() - 1000);

        const status = await service.getStatus('user_5');
        expect(status.status).toBe('EXPIRED');
        expect(await service.canSearch('user_5')).toBe(false);
    });

    describe('activateFromPayment', () => {
        const payment = { orderId: 'order_pay1', paymentId: 'pay_1', userId: 'user_p', plan: 'GROWTH' as const, amount: 299900 };

        it('activates the plan and records the payment', async () => {
            const result = await service.activateFromPayment(payment);
            expect(result.alreadyProcessed).toBe(false);
            expect(result.subscription).toMatchObject({ plan: 'GROWTH', status: 'ACTIVE' });
            expect(payments['order_pay1']).toBeDefined();
        });

        it('refuses to replay the same payment to renew the plan for free', async () => {
            await service.activateFromPayment(payment);
            const firstEnd = store['user_p'].currentPeriodEnd;
            await service.recordSearch('user_p');

            const replay = await service.activateFromPayment(payment);
            expect(replay.alreadyProcessed).toBe(true);
            expect(store['user_p'].currentPeriodEnd).toBe(firstEnd); // period not extended
            expect(store['user_p'].searchesThisPeriod).toBe(1);     // usage not reset
        });

        it('treats a concurrent duplicate (unique violation) as already processed', async () => {
            mockPrisma.payment.findUnique.mockResolvedValueOnce(null);
            payments['order_pay1'] = payment; // another request committed first
            const result = await service.activateFromPayment(payment);
            expect(result.alreadyProcessed).toBe(true);
        });
    });
});
