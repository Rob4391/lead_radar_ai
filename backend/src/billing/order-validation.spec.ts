import { OrderMismatchError, resolvePaidPlan } from './order-validation';
import { PLAN_CONFIG } from './plans';

const order = (overrides: Record<string, unknown> = {}) => ({
    id: 'order_1',
    amount: PLAN_CONFIG.STARTER.priceInPaise,
    notes: { plan: 'STARTER', userId: 'user_a' },
    ...overrides,
});

describe('resolvePaidPlan', () => {
    it('returns the plan and customer recorded on the order', () => {
        expect(resolvePaidPlan(order(), 'user_a')).toEqual({ plan: 'STARTER', userId: 'user_a', amount: PLAN_CONFIG.STARTER.priceInPaise });
    });

    it('accepts the amount as a string, as some Razorpay payloads send it', () => {
        expect(resolvePaidPlan(order({ amount: String(PLAN_CONFIG.STARTER.priceInPaise) })).plan).toBe('STARTER');
    });

    it('rejects an order paid at a cheaper plan price but labelled as a dearer plan', () => {
        const tampered = order({ notes: { plan: 'AGENCY', userId: 'user_a' } }); // amount is still STARTER's
        expect(() => resolvePaidPlan(tampered, 'user_a')).toThrow(OrderMismatchError);
    });

    it("rejects someone else's order", () => {
        expect(() => resolvePaidPlan(order(), 'user_b')).toThrow('different account');
    });

    it('rejects an order with no customer attached (e.g. created before this change)', () => {
        expect(() => resolvePaidPlan(order({ notes: { plan: 'STARTER' } }))).toThrow('no customer');
    });

    it('rejects an order with no notes at all (Razorpay sends [] then)', () => {
        expect(() => resolvePaidPlan(order({ notes: [] }))).toThrow(OrderMismatchError);
    });

    it('rejects the free plan, which is never sold', () => {
        expect(() => resolvePaidPlan(order({ amount: 0, notes: { plan: 'FREE', userId: 'user_a' } }))).toThrow(OrderMismatchError);
    });
});
