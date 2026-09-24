import { Controller, Get, Post, Body, Req, BadRequestException, UnauthorizedException, UseGuards, Headers, HttpCode } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../api-key.guard';
import { PLAN_CONFIG, isPurchasablePlan } from './plans';
import { RazorpayService } from './razorpay.service';
import { SubscriptionService } from './subscription.service';
import { verifyPaymentSignature, verifyWebhookSignature } from './signature';

@Controller('billing')
export class BillingController {
    constructor(
        private readonly razorpayService: RazorpayService,
        private readonly subscriptionService: SubscriptionService,
    ) { }

    @Get('plans')
    listPlans() {
        // FREE is granted automatically on sign-up, not something to buy here.
        return Object.entries(PLAN_CONFIG)
            .filter(([plan]) => plan !== 'FREE')
            .map(([plan, cfg]) => ({
                plan,
                label: cfg.label,
                priceInPaise: cfg.priceInPaise,
                priceInRupees: cfg.priceInPaise / 100,
                searchLimit: cfg.searchLimit,
            }));
    }

    @UseGuards(ApiKeyGuard)
    @Get('status')
    async getStatus(@Req() req: Request & { auth?: { userId: string } }) {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new UnauthorizedException('Billing status requires a signed-in user');
        }
        return this.subscriptionService.getStatus(userId);
    }

    @UseGuards(ApiKeyGuard)
    @Post('checkout')
    async checkout(@Req() req: Request & { auth?: { userId: string } }, @Body() dto: { plan?: string }) {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new UnauthorizedException('Checkout requires a signed-in user');
        }
        if (!isPurchasablePlan(dto.plan)) {
            throw new BadRequestException('plan must be one of STARTER, GROWTH, AGENCY');
        }
        return this.razorpayService.createOrder(dto.plan);
    }

    @UseGuards(ApiKeyGuard)
    @Post('verify')
    async verify(
        @Req() req: Request & { auth?: { userId: string } },
        @Body() dto: { orderId?: string; paymentId?: string; signature?: string; plan?: string },
    ) {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new UnauthorizedException('Verification requires a signed-in user');
        }
        if (!dto.orderId || !dto.paymentId || !dto.signature || !isPurchasablePlan(dto.plan)) {
            throw new BadRequestException('orderId, paymentId, signature, and a valid plan are required');
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) {
            throw new BadRequestException('RAZORPAY_KEY_SECRET is not configured');
        }

        const valid = verifyPaymentSignature({
            orderId: dto.orderId,
            paymentId: dto.paymentId,
            signature: dto.signature,
            keySecret,
        });
        if (!valid) {
            throw new BadRequestException('Payment signature verification failed');
        }

        const subscription = await this.subscriptionService.activate(userId, dto.plan, dto.orderId);
        return { message: `Subscribed to ${dto.plan}`, subscription };
    }

    @Post('webhook')
    @HttpCode(200)
    async webhook(@Req() req: Request & { rawBody?: Buffer }, @Headers('x-razorpay-signature') signature: string) {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret || !signature || !req.rawBody) {
            throw new BadRequestException('Webhook not configured or missing signature');
        }

        const valid = verifyWebhookSignature({
            rawBody: req.rawBody.toString('utf8'),
            signature,
            webhookSecret,
        });
        if (!valid) {
            throw new UnauthorizedException('Invalid webhook signature');
        }

        // Order/payment activation is handled synchronously via /billing/verify.
        // This endpoint exists so Razorpay has a verified place to send async
        // events (e.g. future recurring-subscription webhooks) without us
        // trusting unauthenticated requests.
        return { received: true };
    }
}
