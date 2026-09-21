import { Controller, Get, Query } from '@nestjs/common';

@Controller('leads')
export class LeadsController {
    // Example: /leads?city=Ahmedabad&category=Dentist
    @Get()
    list(@Query('city') city?: string, @Query('category') category?: string) {
        // Placeholder implementation — later replace with DB query
        return { leads: [], query: { city, category } };
    }
}
