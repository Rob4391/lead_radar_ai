export type Plan = 'FREE' | 'STARTER' | 'GROWTH' | 'AGENCY';
export type PurchasablePlan = 'STARTER' | 'GROWTH' | 'AGENCY';

export interface PlanConfig {
    label: string;
    priceInPaise: number;
    /** null = unlimited */
    searchLimit: number | null;
}

export const PLAN_CONFIG: Record<Plan, PlanConfig> = {
    FREE: { label: 'Free', priceInPaise: 0, searchLimit: 10 },
    STARTER: { label: 'Starter', priceInPaise: 99900, searchLimit: 50 },
    GROWTH: { label: 'Growth', priceInPaise: 299900, searchLimit: 250 },
    AGENCY: { label: 'Agency', priceInPaise: 999900, searchLimit: null },
};

export function isPlan(value: unknown): value is Plan {
    return value === 'FREE' || value === 'STARTER' || value === 'GROWTH' || value === 'AGENCY';
}

export function isPurchasablePlan(value: unknown): value is PurchasablePlan {
    return value === 'STARTER' || value === 'GROWTH' || value === 'AGENCY';
}

export const BILLING_PERIOD_DAYS = 30;
