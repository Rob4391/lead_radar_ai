import { Controller, Get, Query, Post, Patch, Body, Res, Req, UseGuards, Param, ParseIntPipe, NotFoundException, InternalServerErrorException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { ApiKeyGuard } from './api-key.guard';
import { LeadsService } from './leads.service';
import { PlacesService } from './places/places.service';
import { LEAD_CSV_HEADER, leadToCsvRow } from './csv';
import { OutreachService } from './outreach/outreach.service';
import { isOutreachLanguage } from './outreach/prompt';
import { SubscriptionService } from './billing/subscription.service';
import { AuditService } from './audit/audit.service';
import { UnsafeUrlError } from './audit/safe-fetch';
import { ProposalService } from './proposal/proposal.service';
import { isLeadStatus } from './lead-status';
import { AuthedRequest, requireAdmin, requireUserId } from './auth-context';
import { UserThrottlerGuard } from './user-throttler.guard';
import { CollectLeadsDto, CreateLeadDto, ScoreLeadsDto, UpdateStatusDto } from './leads.dto';

// LLM generation and new Places searches cost CPU time or money; audits are
// free outbound fetches, so agencies auditing a page of results get more room.
const EXPENSIVE = { default: { limit: 10, ttl: 60_000 } };
const AUDIT = { default: { limit: 30, ttl: 60_000 } };

@UseGuards(ApiKeyGuard, UserThrottlerGuard)
@Controller('leads')
export class LeadsController {
    constructor(
        private readonly leadsService: LeadsService,
        private readonly placesService: PlacesService,
        private readonly outreachService: OutreachService,
        private readonly subscriptionService: SubscriptionService,
        private readonly auditService: AuditService,
        private readonly proposalService: ProposalService,
        @InjectQueue('lead-collection') private leadQueue: Queue,
    ) { }

    @Get()
    async list(@Req() req: AuthedRequest, @Query('city') city?: string, @Query('category') category?: string) {
        const leads = await this.leadsService.findAll({ city, category });
        return this.leadsService.withActivity(leads, req.auth?.userId);
    }

    @Post()
    async create(@Req() req: AuthedRequest, @Body() dto: CreateLeadDto) {
        // Leads normally come from Google Places. Letting any user insert one
        // with an arbitrary website would let them aim the server-side audit
        // fetch anywhere, so manual creation is admin tooling only.
        requireAdmin(req);
        return this.leadsService.create(dto);
    }

    @Throttle(EXPENSIVE)
    @Post('collect')
    async collect(@Req() req: AuthedRequest, @Body() dto: CollectLeadsDto) {
        console.log(`[Collect] Request for ${dto.city} / ${dto.category}`);

        // Check cache first
        const existing = await this.leadsService.findAll({ city: dto.city, category: dto.category });
        // existing is already an array from findMany()
        if (Array.isArray(existing) && existing.length > 0) {
            console.log(`[Collect] Found ${existing.length} cached leads`);
            return this.leadsService.withActivity(existing, req.auth?.userId);
        }

        // Only Clerk-authenticated requests carry req.auth; the legacy x-api-key
        // path (scripts/CI) bypasses the monthly search limit entirely.
        const userId = req.auth?.userId;
        if (userId) {
            const allowed = await this.subscriptionService.canSearch(userId);
            if (!allowed) {
                throw new ForbiddenException('Monthly search limit reached for your plan. Upgrade to continue.');
            }
        }

        // Queue background collection job
        const job = await this.leadQueue.add(dto, {
            removeOnComplete: false,  // Keep job in queue so we can poll its status
            attempts: 2,
            backoff: { type: 'fixed', delay: 1000 },
        });

        console.log(`[Collect] Queued job ${job.id} for ${dto.city} / ${dto.category}`);
        if (userId) {
            await this.subscriptionService.recordSearch(userId);
        }
        // Return job ID for polling; frontend can call /leads/collect-status/:jobId
        return { jobId: job.id, message: `Finding leads in ${dto.city}...`, status: 'queued' };
    }

    @Get('collect-status/:jobId')
    async getCollectStatus(@Req() req: AuthedRequest, @Param('jobId', ParseIntPipe) jobId: number) {
        const job = await this.leadQueue.getJob(jobId);
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
            const leads = await this.leadsService.withActivity(Array.isArray(leadsResult) ? leadsResult : [], req.auth?.userId);
            console.log(`[Status ${jobId}] Job done. Returning ${leads.length} leads`);
            return { status: 'done', leads, result };
        }

        if (state === 'failed') {
            console.log(`[Status ${jobId}] Job failed: ${job.failedReason}`);
            return { status: 'failed', error: job.failedReason, jobId };
        }

        return { status: state, progress, jobId };
    }

    @Post('score')
    async score(@Req() req: AuthedRequest, @Body() dto: ScoreLeadsDto) {
        requireAdmin(req);
        const updated = await this.leadsService.scoreLeads({ city: dto?.city, category: dto?.category });
        return { message: `Scored ${updated.length} lead(s)`, count: updated.length };
    }

    @Throttle(EXPENSIVE)
    @Post(':id/outreach')
    async generateOutreach(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number, @Query('force') force?: string, @Query('language') language?: string) {
        const lead = await this.leadsService.findById(id);
        if (!lead) {
            throw new NotFoundException(`Lead ${id} not found`);
        }

        if (language && !isOutreachLanguage(language)) {
            throw new BadRequestException(`Unsupported language: ${language}`);
        }
        // A non-default language always regenerates - the cache only ever holds
        // one language's worth of messages at a time, so a language switch is
        // itself a reason to regenerate, same as ?force=true.
        const isDefaultLanguage = !language || language === 'english';

        const userId = requireUserId(req);
        const activity = await this.leadsService.findActivity(userId, lead.id);
        if (!force && isDefaultLanguage && activity?.coldEmail && activity.linkedinMessage && activity.whatsappMessage) {
            return {
                coldEmail: activity.coldEmail,
                linkedinMessage: activity.linkedinMessage,
                whatsappMessage: activity.whatsappMessage,
                cached: true,
            };
        }

        try {
            const messages = await this.outreachService.generateMessages(lead, isOutreachLanguage(language) ? language : 'english');
            await this.leadsService.saveOutreach(userId, lead.id, messages);
            return { ...messages, cached: false };
        } catch (err) {
            throw new InternalServerErrorException((err as Error).message);
        }
    }

    @Throttle(AUDIT)
    @Post(':id/audit')
    async auditLead(@Param('id', ParseIntPipe) id: number, @Query('force') force?: string) {
        const lead = await this.leadsService.findById(id);
        if (!lead) {
            throw new NotFoundException(`Lead ${id} not found`);
        }
        if (!lead.website) {
            throw new InternalServerErrorException('Lead has no website to audit');
        }

        if (!force && lead.auditedAt) {
            return {
                websiteAgeYears: lead.websiteAgeYears,
                isOldWebsite: lead.isOldWebsite,
                mobileFriendly: lead.mobileFriendly,
                isSlowLoad: lead.isSlowLoad,
                hasBrokenPages: lead.hasBrokenPages,
                cached: true,
            };
        }

        try {
            const audit = await this.auditService.auditWebsite(lead.website);
            await this.leadsService.saveAudit(lead.id, audit);
            return { ...audit, cached: false };
        } catch (err) {
            if (err instanceof UnsafeUrlError) {
                throw new BadRequestException(err.message);
            }
            throw new InternalServerErrorException((err as Error).message);
        }
    }

    @Throttle(EXPENSIVE)
    @Post(':id/proposal')
    async generateProposal(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number, @Query('force') force?: string) {
        const lead = await this.leadsService.findById(id);
        if (!lead) {
            throw new NotFoundException(`Lead ${id} not found`);
        }

        const userId = requireUserId(req);
        const activity = await this.leadsService.findActivity(userId, lead.id);
        if (!force && activity?.proposal) {
            return { proposal: activity.proposal, cached: true };
        }

        try {
            const result = await this.proposalService.generateProposal(lead);
            await this.leadsService.saveProposal(userId, lead.id, result.proposal);
            return { ...result, cached: false };
        } catch (err) {
            throw new InternalServerErrorException((err as Error).message);
        }
    }

    @Patch(':id/status')
    async updateStatus(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatusDto) {
        const userId = requireUserId(req);
        const lead = await this.leadsService.findById(id);
        if (!lead) {
            throw new NotFoundException(`Lead ${id} not found`);
        }
        if (!isLeadStatus(dto.status)) {
            throw new BadRequestException(`Unsupported status: ${dto.status}`);
        }
        await this.leadsService.updateStatus(userId, lead.id, dto.status, dto.notes);
        const [merged] = await this.leadsService.withActivity([lead], userId);
        return merged;
    }

    @Get(':id/competitors')
    async getCompetitors(@Param('id', ParseIntPipe) id: number) {
        const competitors = await this.leadsService.findCompetitors(id);
        if (competitors === null) {
            throw new NotFoundException(`Lead ${id} not found`);
        }
        return competitors;
    }

    @Get('export')
    async export(@Req() req: AuthedRequest, @Res() res: Response, @Query('city') city?: string, @Query('category') category?: string) {
        const leads = await this.leadsService.withActivity(await this.leadsService.findAll({ city, category }), req.auth?.userId);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        const filenameParts = ['leads', city || 'all', category || 'all'];
        res.setHeader('Content-Disposition', `attachment; filename="${filenameParts.join('-')}.csv"`);

        res.write(LEAD_CSV_HEADER.join(',') + '\n');
        for (const lead of leads) {
            res.write(leadToCsvRow(lead) + '\n');
        }
        res.end();
        return res;
    }
}
