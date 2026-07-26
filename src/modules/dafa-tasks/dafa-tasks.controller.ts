import { Controller, Get, Post, Body, Patch, Param, Delete, Request, Query } from '@nestjs/common';
import { DafaTasksService } from './dafa-tasks.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('dafa-tasks')
@Controller('dafa-tasks')
export class DafaTasksController {
  constructor(private readonly dafaTasksService: DafaTasksService) {}

  @Post()
  create(@Body() createDto: any, @Request() req: any) {
    return this.dafaTasksService.create({
      ...createDto,
      companyId: req.user.companyId,
      createdById: req.user.sub || req.user.id,
    });
  }

  @Get()
  findAll(@Request() req: any, @Query() query: any) {
    return this.dafaTasksService.findAll(req.user.companyId, query);
  }

  @Get('dashboard-stats')
  getDashboardStats(@Request() req: any) {
    return this.dafaTasksService.getDashboardStats(
      req.user.companyId,
      req.user.id,
      req.user.role
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.dafaTasksService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Request() req: any) {
    return this.dafaTasksService.update(id, updateDto, req.user.companyId, req.user.sub || req.user.id);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Body() body: { content: string }, @Request() req: any) {
    return this.dafaTasksService.addComment(id, req.user.sub || req.user.id, body.content, req.user.companyId);
  }

  @Post(':id/attachments')
  addAttachment(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.dafaTasksService.addAttachment(id, req.user.sub || req.user.id, body, req.user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.dafaTasksService.remove(id, req.user.companyId);
  }
}