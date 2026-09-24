import { createHmac } from 'crypto';
import { verifyPaymentSignature, verifyWebhookSignature } from './signature';

describe('verifyPaymentSignature', () => {
    const keySecret = 'test_secret';

    it('accepts a correctly signed payment', () => {
        const orderId = 'order_123';
        const paymentId = 'pay_456';
        const signature = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');

        expect(verifyPaymentSignature({ orderId, paymentId, signature, keySecret })).toBe(true);
    });

    it('rejects a tampered signature', () => {
        expect(
            verifyPaymentSignature({ orderId: 'order_123', paymentId: 'pay_456', signature: 'not-the-real-sig', keySecret }),
        ).toBe(false);
    });

    it('rejects a signature computed with the wrong secret', () => {
        const orderId = 'order_123';
        const paymentId = 'pay_456';
        const signature = createHmac('sha256', 'wrong_secret').update(`${orderId}|${paymentId}`).digest('hex');

        expect(verifyPaymentSignature({ orderId, paymentId, signature, keySecret })).toBe(false);
    });
});

describe('verifyWebhookSignature', () => {
    const webhookSecret = 'webhook_secret';

    it('accepts a correctly signed webhook body', () => {
        const rawBody = '{"event":"payment.captured"}';
        const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
        expect(verifyWebhookSignature({ rawBody, signature, webhookSecret })).toBe(true);
    });

    it('rejects a body that does not match the signature', () => {
        const signature = createHmac('sha256', webhookSecret).update('{"event":"payment.captured"}').digest('hex');
        expect(verifyWebhookSignature({ rawBody: '{"event":"payment.failed"}', signature, webhookSecret })).toBe(false);
    });
});
