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

    @Get('export')
    async export(@Query('city') city?: string, @Query('category') category?: string) {
        const leads = await this.leadsService.findAll({ city, category });
        // build CSV: headers and rows
        const header = ['name', 'phone', 'website', 'emails', 'urls', 'titles', 'city', 'category', 'score'];
        const rows = leads.map((l: any) => {
            const emails = (l.emails || []).join(';');
            const urls = (l.urls || []).join(';');
            const titles = (l.titles || []).join(';');
            return [l.name || '', l.phone || '', l.website || '', emails, urls, titles, l.city || '', l.category || '', l.score ?? ''].map(v => String(v).replace(/\n/g, ' '));
        });
        const csv = [header.join(','), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
        return {
            contentType: 'text/csv',
            csv,
        };
    }
}
