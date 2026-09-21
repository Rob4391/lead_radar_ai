import { Controller, Get, Query, Post, Body, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiKeyGuard } from './api-key.guard';
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

    @UseGuards(ApiKeyGuard)
    @Get('export')
    async export(@Res() res: Response, @Query('city') city?: string, @Query('category') category?: string) {
        const leads = await this.leadsService.findAll({ city, category });
        const header = ['name', 'phone', 'website', 'emails', 'urls', 'titles', 'city', 'category', 'score'];

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        const filenameParts = ['leads', city || 'all', category || 'all'];
        res.setHeader('Content-Disposition', `attachment; filename="${filenameParts.join('-')}.csv"`);

        // stream rows
        res.write(header.join(',') + '\n');
        for (const l of leads) {
            const emails = (l.emails || []).join(';');
            const urls = (l.urls || []).join(';');
            const titles = (l.titles || []).join(';');
            const row = [l.name || '', l.phone || '', l.website || '', emails, urls, titles, l.city || '', l.category || '', l.score ?? '']
                .map(v => String(v).replace(/\n/g, ' '))
                .map(c => `"${c.replace(/"/g, '""')}"`).join(',');
            res.write(row + '\n');
        }
        res.end();
        return res;
    }
}
import { Controller, Get, Query, Post, Body, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiKeyGuard } from './api-key.guard';
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

    @Get()
    async list(@Query('city') city?: string, @Query('category') category?: string) {
        return this.leadsService.findAll({ city, category });
    }

    @Post()
    async create(@Body() dto: CreateLeadDto) {
        return this.leadsService.create(dto);
    }

    @UseGuards(ApiKeyGuard)
    @Get('export')
    async export(@Res() res: Response, @Query('city') city?: string, @Query('category') category?: string) {
        const leads = await this.leadsService.findAll({ city, category });
        const header = ['name', 'phone', 'website', 'emails', 'urls', 'titles', 'city', 'category', 'score'];

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        const filenameParts = ['leads', city || 'all', category || 'all'];
        res.setHeader('Content-Disposition', `attachment; filename="${filenameParts.join('-')}.csv"`);

        res.write(header.join(',') + '\n');
        for (const l of leads) {
            const emails = (l.emails || []).join(';');
            const urls = (l.urls || []).join(';');
            const titles = (l.titles || []).join(';');
            const row = [l.name || '', l.phone || '', l.website || '', emails, urls, titles, l.city || '', l.category || '', l.score ?? '']
                .map(v => String(v).replace(/\n/g, ' '))
                .map(c => `"${c.replace(/"/g, '""')}"`).join(',');
            res.write(row + '\n');
        }
        res.end();
        return res;
    }
}
