import { Controller, Get, Post, Patch, Delete, Body, Param, Request, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DailyTasksService } from './daily-tasks.service';

@ApiTags('daily-tasks')
@Controller('daily-tasks')
export class DailyTasksController {
  constructor(private readonly service: DailyTasksService) {}

  @Get()
  findByDate(@Query('date') date: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.service.findByDate(userId, req.user.companyId, date);
  }

  @Post()
  create(@Body() body: { title: string; date: string }, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.service.create({
      userId,
      companyId: req.user.companyId,
      date: body.date,
      title: body.title,
    });
  }

  @Post('reorder')
  reorder(@Body() body: { date: string; orderedIds: string[] }, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.service.reorder(userId, body.date, body.orderedIds);
  }

  @Patch(':id/toggle')
  toggleComplete(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.service.toggleComplete(id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { title: string }, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.service.update(id, userId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.service.remove(id, userId);
  }
}
