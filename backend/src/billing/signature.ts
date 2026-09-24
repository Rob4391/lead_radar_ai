import { createHmac, timingSafeEqual } from 'crypto';

function hmacHex(secret: string, payload: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

/** Verifies the signature Razorpay's checkout handler returns after a successful payment. */
export function verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
    keySecret: string;
}): boolean {
    const expected = hmacHex(params.keySecret, `${params.orderId}|${params.paymentId}`);
    return safeEqual(expected, params.signature);
}

/** Verifies the X-Razorpay-Signature header on a webhook request against the raw request body. */
export function verifyWebhookSignature(params: {
    rawBody: string;
    signature: string;
    webhookSecret: string;
}): boolean {
    const expected = hmacHex(params.webhookSecret, params.rawBody);
    return safeEqual(expected, params.signature);
}
