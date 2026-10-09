import { PLAN_CONFIG, PurchasablePlan, isPurchasablePlan } from './plans';

export class OrderMismatchError extends Error { }

export interface RazorpayOrderLike {
    id: string;
    amount: number | string;
    // Razorpay returns [] (not {}) when an order has no notes.
    notes?: Record<string, unknown> | unknown[];
}

/**
 * Works out what a paid order actually bought, from the order stored at
 * Razorpay - never from what the browser claims. The plan and customer are
 * written into the order's notes at checkout, and the amount must match that
 * plan's price, so paying for STARTER can't be "verified" as AGENCY and one
 * user's payment can't upgrade another account.
 */
export function resolvePaidPlan(order: RazorpayOrderLike, expectedUserId?: string): { plan: PurchasablePlan; userId: string; amount: number } {
    const notes = (Array.isArray(order.notes) ? {} : order.notes ?? {}) as Record<string, unknown>;
    const plan = notes.plan;
    const userId = notes.userId;

    if (!isPurchasablePlan(plan)) {
        throw new OrderMismatchError(`Order ${order.id} is not for a purchasable plan`);
    }
    if (typeof userId !== 'string' || !userId) {
        throw new OrderMismatchError(`Order ${order.id} has no customer attached`);
    }
    if (expectedUserId && userId !== expectedUserId) {
        throw new OrderMismatchError(`Order ${order.id} belongs to a different account`);
    }
    const amount = Number(order.amount);
    if (amount !== PLAN_CONFIG[plan].priceInPaise) {
        throw new OrderMismatchError(`Order ${order.id} amount does not match the ${plan} price`);
    }
    return { plan, userId, amount };
}
