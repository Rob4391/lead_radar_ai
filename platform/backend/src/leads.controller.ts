import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { LeadsService } from './leads.service';

class CreateLeadDto {
    name?: string;
    phone?: string;
    website?: string;
    emails?: string[];
    urls?: string[];
    titles?: string[];
    city?: string;
    category?: string;
}

@Controller('leads')
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) { }

    // Example: /leads?city=Ahmedabad&category=Dentist
    @Get()
    async list(@Query('city') city?: string, @Query('category') category?: string) {
        return this.leadsService.findAll({ city, category });
    }

    @Post()
    async create(@Body() dto: CreateLeadDto) {
        return this.leadsService.create(dto);
    }
}
