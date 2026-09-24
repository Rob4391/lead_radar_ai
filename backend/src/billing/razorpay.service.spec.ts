const mockOrdersCreate = jest.fn();

jest.mock('razorpay', () => {
    return jest.fn().mockImplementation(() => ({
        orders: { create: mockOrdersCreate },
    }));
});

import { RazorpayService } from './razorpay.service';

describe('RazorpayService', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, RAZORPAY_KEY_ID: 'rzp_test_id', RAZORPAY_KEY_SECRET: 'rzp_test_secret' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('throws when Razorpay keys are not configured', async () => {
        delete process.env.RAZORPAY_KEY_ID;
        delete process.env.RAZORPAY_KEY_SECRET;
        const service = new RazorpayService();
        await expect(service.createOrder('STARTER')).rejects.toThrow('RAZORPAY_KEY_ID');
    });

    it('creates an order with the correct amount in paise for the plan', async () => {
        mockOrdersCreate.mockResolvedValue({ id: 'order_abc', amount: 99900, currency: 'INR' });

        const service = new RazorpayService();
        const result = await service.createOrder('STARTER');

        expect(mockOrdersCreate).toHaveBeenCalledWith(
            expect.objectContaining({ amount: 99900, currency: 'INR', notes: { plan: 'STARTER' } }),
        );
        expect(result).toEqual({ orderId: 'order_abc', amount: 99900, currency: 'INR', keyId: 'rzp_test_id' });
    });

    it('uses the AGENCY plan price', async () => {
        mockOrdersCreate.mockResolvedValue({ id: 'order_xyz', amount: 999900, currency: 'INR' });
        const service = new RazorpayService();
        await service.createOrder('AGENCY');
        expect(mockOrdersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 999900 }));
    });
});
