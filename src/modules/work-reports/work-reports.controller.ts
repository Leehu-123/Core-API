import { Controller, Get, Post, Body, Patch, Param, Delete, Request } from '@nestjs/common';
import { WorkReportsService } from './work-reports.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('work-reports')
@Controller('work-reports')
export class WorkReportsController {
  constructor(private readonly workReportsService: WorkReportsService) {}

  @Post()
  create(@Body() createDto: any, @Request() req: any) {
    return this.workReportsService.create({ ...createDto, companyId: req.user.companyId });
  }

  @Get()
  findAll(@Request() req: any) {
    return this.workReportsService.findAll(req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.workReportsService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Request() req: any) {
    return this.workReportsService.update(id, updateDto, req.user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.workReportsService.remove(id, req.user.companyId);
  }
}