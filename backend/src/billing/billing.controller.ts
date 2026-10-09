import { Controller, Get, Post, Body, Req, BadRequestException, UnauthorizedException, UseGuards, Headers, HttpCode, Logger } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../api-key.guard';
import { UserThrottlerGuard } from '../user-throttler.guard';
import { PLAN_CONFIG } from './plans';
import { RazorpayService } from './razorpay.service';
import { SubscriptionService } from './subscription.service';
import { verifyPaymentSignature, verifyWebhookSignature } from './signature';
import { OrderMismatchError, resolvePaidPlan } from './order-validation';
import { CheckoutDto, VerifyPaymentDto } from './billing.dto';

type AuthedRequest = Request & { auth?: { userId: string } };

function requireUser(req: AuthedRequest, action: string): string {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new UnauthorizedException(`${action} requires a signed-in user`);
    }
    return userId;
}

@Controller('billing')
export class BillingController {
    private readonly logger = new Logger(BillingController.name);

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

    @UseGuards(ApiKeyGuard, UserThrottlerGuard)
    @Get('status')
    async getStatus(@Req() req: AuthedRequest) {
        return this.subscriptionService.getStatus(requireUser(req, 'Billing status'));
    }

    @UseGuards(ApiKeyGuard, UserThrottlerGuard)
    @Post('checkout')
    async checkout(@Req() req: AuthedRequest, @Body() dto: CheckoutDto) {
        return this.razorpayService.createOrder(dto.plan, requireUser(req, 'Checkout'));
    }

    @UseGuards(ApiKeyGuard, UserThrottlerGuard)
    @Post('verify')
    async verify(@Req() req: AuthedRequest, @Body() dto: VerifyPaymentDto) {
        const userId = requireUser(req, 'Verification');

        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) {
            throw new BadRequestException('RAZORPAY_KEY_SECRET is not configured');
        }
        const valid = verifyPaymentSignature({ orderId: dto.orderId, paymentId: dto.paymentId, signature: dto.signature, keySecret });
        if (!valid) {
            throw new BadRequestException('Payment signature verification failed');
        }

        // The signature only proves *this order* was paid. What was bought, and
        // for whom, comes from the order itself.
        const order = await this.razorpayService.fetchOrder(dto.orderId);
        let paid;
        try {
            paid = resolvePaidPlan(order as any, userId);
        } catch (err) {
            if (err instanceof OrderMismatchError) throw new BadRequestException(err.message);
            throw err;
        }

        const result = await this.subscriptionService.activateFromPayment({ orderId: dto.orderId, paymentId: dto.paymentId, ...paid });
        return { message: `Subscribed to ${paid.plan}`, alreadyProcessed: result.alreadyProcessed, subscription: result.subscription };
    }

    @Post('webhook')
    @HttpCode(200)
    async webhook(@Req() req: Request & { rawBody?: Buffer }, @Headers('x-razorpay-signature') signature: string) {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret || !signature || !req.rawBody) {
            throw new BadRequestException('Webhook not configured or missing signature');
        }
        const rawBody = req.rawBody.toString('utf8');
        if (!verifyWebhookSignature({ rawBody, signature, webhookSecret })) {
            throw new UnauthorizedException('Invalid webhook signature');
        }

        // Activates the plan even if the customer paid and closed the tab before
        // the browser reached /billing/verify. Safe to receive alongside /verify:
        // activation is once-per-order.
        const event = JSON.parse(rawBody);
        if (event.event !== 'order.paid' && event.event !== 'payment.captured') {
            return { received: true, ignored: event.event };
        }
        const orderId: string | undefined = event.payload?.order?.entity?.id ?? event.payload?.payment?.entity?.order_id;
        const paymentId: string | undefined = event.payload?.payment?.entity?.id;
        if (!orderId || !paymentId) {
            return { received: true, ignored: 'no order or payment id in payload' };
        }

        const order = await this.razorpayService.fetchOrder(orderId);
        let paid;
        try {
            paid = resolvePaidPlan(order as any);
        } catch (err) {
            if (err instanceof OrderMismatchError) {
                // Answer 200 so Razorpay doesn't retry something that can never succeed.
                this.logger.warn(`Webhook for ${orderId} not activated: ${err.message}`);
                return { received: true, ignored: err.message };
            }
            throw err; // transient (DB/API) errors -> non-2xx -> Razorpay retries
        }

        const result = await this.subscriptionService.activateFromPayment({ orderId, paymentId, ...paid });
        return { received: true, activated: !result.alreadyProcessed };
    }
}
