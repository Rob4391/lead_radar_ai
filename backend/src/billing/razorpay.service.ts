import { Injectable } from '@nestjs/common';
import Razorpay from 'razorpay';
import { PLAN_CONFIG, Plan } from './plans';

@Injectable()
export class RazorpayService {
    private client: Razorpay | null = null;

    private getClient(): Razorpay {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret) {
            throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured');
        }
        if (!this.client) {
            this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
        }
        return this.client;
    }

    async createOrder(plan: Plan) {
        const client = this.getClient();
        const { priceInPaise } = PLAN_CONFIG[plan];
        const order = await client.orders.create({
            amount: priceInPaise,
            currency: 'INR',
            receipt: `plan_${plan.toLowerCase()}_${Date.now()}`,
            notes: { plan },
        });
        return { orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID };
    }
}
