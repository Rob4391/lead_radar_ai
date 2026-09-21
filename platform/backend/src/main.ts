import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({ controllers: [LeadsController], providers: [LeadsService] })
class AppModule { }

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors();
    await app.listen(3001);
}

bootstrap();
