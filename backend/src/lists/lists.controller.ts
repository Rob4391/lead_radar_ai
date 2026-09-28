import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../api-key.guard';
import { ListsService } from './lists.service';

type AuthedRequest = Request & { auth?: { userId: string } };

// Lists are per-user data, so unlike /leads there's no legacy x-api-key
// bypass here - there's no "whose list is this" for an admin key to mean.
function requireUserId(req: AuthedRequest): string {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new ForbiddenException('Lists require a signed-in user.');
    }
    return userId;
}

@UseGuards(ApiKeyGuard)
@Controller('lists')
export class ListsController {
    constructor(private readonly listsService: ListsService) { }

    @Get()
    async findAll(@Req() req: AuthedRequest) {
        return this.listsService.findAll(requireUserId(req));
    }

    @Post()
    async create(@Req() req: AuthedRequest, @Body() dto: { name?: string }) {
        if (!dto.name || !dto.name.trim()) {
            throw new BadRequestException('A list name is required.');
        }
        return this.listsService.create(requireUserId(req), dto.name.trim());
    }

    @Get(':id')
    async findOne(@Req() req: AuthedRequest, @Param('id') id: string) {
        const list = await this.listsService.getListWithLeads(requireUserId(req), Number(id));
        if (!list) {
            throw new NotFoundException(`List ${id} not found`);
        }
        return list;
    }

    @Post(':id/leads')
    async addLead(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: { leadId?: number }) {
        if (!dto.leadId) {
            throw new BadRequestException('leadId is required.');
        }
        const result = await this.listsService.addLead(requireUserId(req), Number(id), dto.leadId);
        if (!result) {
            throw new NotFoundException(`List ${id} not found`);
        }
        return result;
    }

    @Delete(':id/leads/:leadId')
    async removeLead(@Req() req: AuthedRequest, @Param('id') id: string, @Param('leadId') leadId: string) {
        const result = await this.listsService.removeLead(requireUserId(req), Number(id), Number(leadId));
        if (result === null) {
            throw new NotFoundException(`List ${id} not found`);
        }
        return { removed: true };
    }

    @Delete(':id')
    async remove(@Req() req: AuthedRequest, @Param('id') id: string) {
        const result = await this.listsService.deleteList(requireUserId(req), Number(id));
        if (result === null) {
            throw new NotFoundException(`List ${id} not found`);
        }
        return { deleted: true };
    }
}
