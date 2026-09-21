import { Controller, Get } from '@nestjs/common';

@Controller('leads')
export class LeadsController {
    @Get()
    list() {
        return { leads: [] };
    }
}
