import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { PlacesService } from './places/places.service';
import { LeadCollectionProcessor } from './jobs/lead-collection.processor';
import { OutreachService } from './outreach/outreach.service';
import { BillingController } from './billing/billing.controller';
import { RazorpayService } from './billing/razorpay.service';
import { SubscriptionService } from './billing/subscription.service';
import { AuditService } from './audit/audit.service';
import { ProposalService } from './proposal/proposal.service';

@Module({
    imports: [
        BullModule.forRoot({
            redis: {
                host: 'localhost',
                port: 6379,
                ...(() => {
                    const url = process.env.REDIS_URL;
                    if (url && url !== 'redis://localhost:6379') {
                        const parsed = new URL(url);
                        return {
                            host: parsed.hostname,
                            port: parseInt(parsed.port, 10),
                            password: parsed.password || undefined,
                        };
                    }
                    return {};
                })(),
            },
        }),
        BullModule.registerQueue({ name: 'lead-collection' }),
    ],
    controllers: [LeadsController, BillingController],
    providers: [LeadsService, PlacesService, LeadCollectionProcessor, OutreachService, RazorpayService, SubscriptionService, AuditService, ProposalService],
})
class AppModule { }

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { rawBody: true });
    app.enableCors();
    await app.listen(3001);
}

bootstrap();
