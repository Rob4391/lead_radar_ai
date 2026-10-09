import { NestFactory } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import helmet from 'helmet';
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
import { ListsController } from './lists/lists.controller';
import { ListsService } from './lists/lists.service';

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
        // Per-user default; routes that call the LLM, the audit or Places override it lower.
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    ],
    controllers: [LeadsController, BillingController, ListsController],
    providers: [LeadsService, PlacesService, LeadCollectionProcessor, OutreachService, RazorpayService, SubscriptionService, AuditService, ProposalService, ListsService],
})
class AppModule { }

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { rawBody: true });
    app.use(helmet());
    // The browser talks to Next.js, which calls this API server-to-server, so
    // only our own frontend origin(s) ever need CORS access.
    app.enableCors({ origin: (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim()) });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(3001);
}

bootstrap();
