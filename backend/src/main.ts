import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { PlacesService } from './places/places.service';
import { LeadCollectionProcessor } from './jobs/lead-collection.processor';

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
    controllers: [LeadsController],
    providers: [LeadsService, PlacesService, LeadCollectionProcessor],
})
class AppModule { }

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors();
    await app.listen(3001);
}

bootstrap();
