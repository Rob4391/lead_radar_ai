import { Controller, Get, Query, Post, Body, Res, UseGuards, Param } from '@nestjs/common';
import { Response } from 'express';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { ApiKeyGuard } from './api-key.guard';
import { LeadsService } from './leads.service';
import { PlacesService } from './places/places.service';

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
    constructor(
        private readonly leadsService: LeadsService,
        private readonly placesService: PlacesService,
        @InjectQueue('lead-collection') private leadQueue: Queue,
    ) { }

    @Get()
    async list(@Query('city') city?: string, @Query('category') category?: string) {
        return this.leadsService.findAll({ city, category });
    }

    @Post()
    async create(@Body() dto: CreateLeadDto) {
        return this.leadsService.create(dto);
    }

    @Post('collect')
    async collect(@Body() dto: { city: string; category: string }) {
        console.log(`[Collect] Request for ${dto.city} / ${dto.category}`);

        // Check cache first
        const existing = await this.leadsService.findAll({ city: dto.city, category: dto.category });
        // existing is already an array from findMany()
        if (Array.isArray(existing) && existing.length > 0) {
            console.log(`[Collect] Found ${existing.length} cached leads`);
            return existing;
        }

        // Queue background collection job
        const job = await this.leadQueue.add(dto, {
            removeOnComplete: false,  // Keep job in queue so we can poll its status
            attempts: 2,
            backoff: { type: 'fixed', delay: 1000 },
        });

        console.log(`[Collect] Queued job ${job.id} for ${dto.city} / ${dto.category}`);
        // Return job ID for polling; frontend can call /leads/collect-status/:jobId
        return { jobId: job.id, message: `Finding leads in ${dto.city}...`, status: 'queued' };
    }

    @Get('collect-status/:jobId')
    async getCollectStatus(@Param('jobId') jobId: string) {
        const job = await this.leadQueue.getJob(Number(jobId));
        if (!job) {
            console.log(`[Status] Job ${jobId} not found`);
            return { error: 'Job not found', jobId };
        }

        const state = await job.getState();
        const progress = job.progress();
        console.log(`[Status ${jobId}] State: ${state}, Progress: ${progress}`);

        if (state === 'completed') {
            const result = job.returnvalue;
            const leadsResult = await this.leadsService.findAll({
                city: job.data.city,
                category: job.data.category,
            });
            // findAll returns array directly from Prisma findMany
            const leads = Array.isArray(leadsResult) ? leadsResult : [];
            console.log(`[Status ${jobId}] Job done. Returning ${leads.length} leads`);
            return { status: 'done', leads, result };
        }

        if (state === 'failed') {
            console.log(`[Status ${jobId}] Job failed: ${job.failedReason}`);
            return { status: 'failed', error: job.failedReason, jobId };
        }

        return { status: state, progress, jobId };
    }

    @UseGuards(ApiKeyGuard)
    @Post('score')
    async score(@Body() dto: { city?: string; category?: string }) {
        const updated = await this.leadsService.scoreLeads({ city: dto?.city, category: dto?.category });
        return { message: `Scored ${updated.length} lead(s)`, count: updated.length };
    }

    @UseGuards(ApiKeyGuard)
    @Get('export')
    async export(@Res() res: Response, @Query('city') city?: string, @Query('category') category?: string) {
        const leads = await this.leadsService.findAll({ city, category });
        const header = ['name', 'phone', 'website', 'emails', 'urls', 'titles', 'city', 'category', 'reviewCount', 'instagram', 'facebook', 'score'];

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        const filenameParts = ['leads', city || 'all', category || 'all'];
        res.setHeader('Content-Disposition', `attachment; filename="${filenameParts.join('-')}.csv"`);

        res.write(header.join(',') + '\n');
        for (const l of leads) {
            const emails = (l.emails || []).join(';');
            const urls = (l.urls || []).join(';');
            const titles = (l.titles || []).join(';');
            const row = [l.name || '', l.phone || '', l.website || '', emails, urls, titles, l.city || '', l.category || '', l.reviewCount ?? '', l.instagram || '', l.facebook || '', l.score ?? '']
                .map(v => String(v).replace(/\n/g, ' '))
                .map(c => `"${c.replace(/"/g, '""')}"`).join(',');
            res.write(row + '\n');
        }
        res.end();
        return res;
    }
}
