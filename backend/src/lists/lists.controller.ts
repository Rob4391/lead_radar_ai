import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, Req, UseGuards, NotFoundException, ConflictException } from '@nestjs/common';
import { ApiKeyGuard } from '../api-key.guard';
import { ListsService } from './lists.service';
import { AuthedRequest, requireUserId } from '../auth-context';
import { UserThrottlerGuard } from '../user-throttler.guard';
import { AddLeadToListDto, CreateListDto } from './lists.dto';

@UseGuards(ApiKeyGuard, UserThrottlerGuard)
@Controller('lists')
export class ListsController {
    constructor(private readonly listsService: ListsService) { }

    @Get()
    async findAll(@Req() req: AuthedRequest) {
        return this.listsService.findAll(requireUserId(req));
    }

    @Post()
    async create(@Req() req: AuthedRequest, @Body() dto: CreateListDto) {
        try {
            return await this.listsService.create(requireUserId(req), dto.name.trim());
        } catch (err) {
            if ((err as { code?: string }).code === 'P2002') {
                throw new ConflictException('You already have a list with this name.');
            }
            throw err;
        }
    }

    @Get(':id')
    async findOne(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
        const list = await this.listsService.getListWithLeads(requireUserId(req), id);
        if (!list) {
            throw new NotFoundException(`List ${id} not found`);
        }
        return list;
    }

    @Post(':id/leads')
    async addLead(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: AddLeadToListDto) {
        const result = await this.listsService.addLead(requireUserId(req), id, dto.leadId);
        if (!result) {
            throw new NotFoundException(`List ${id} not found`);
        }
        return result;
    }

    @Delete(':id/leads/:leadId')
    async removeLead(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number, @Param('leadId', ParseIntPipe) leadId: number) {
        const result = await this.listsService.removeLead(requireUserId(req), id, leadId);
        if (result === null) {
            throw new NotFoundException(`List ${id} not found`);
        }
        return { removed: true };
    }

    @Delete(':id')
    async remove(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
        const result = await this.listsService.deleteList(requireUserId(req), id);
        if (result === null) {
            throw new NotFoundException(`List ${id} not found`);
        }
        return { deleted: true };
    }
}
