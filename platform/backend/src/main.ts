import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get } from '@nestjs/common';

@Controller()
class AppController {
    @Get()
    root() {
        return { status: 'ok' };
    }
}

@Module({ controllers: [AppController] })
class AppModule { }

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    await app.listen(3001);
}

bootstrap();
