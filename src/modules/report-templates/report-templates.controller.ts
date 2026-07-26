import { Controller, Get, Post, Body, Patch, Param, Delete, Request, Query } from '@nestjs/common';
import { ReportTemplatesService } from './report-templates.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('report-templates')
@Controller('report-templates')
export class ReportTemplatesController {
  constructor(private readonly reportTemplatesService: ReportTemplatesService) {}

  @Post()
  create(@Body() createDto: any, @Request() req: any) {
    return this.reportTemplatesService.create({ ...createDto, companyId: req.user.companyId });
  }

  @Get()
  findAll(@Request() req: any, @Query() query: any) {
    return this.reportTemplatesService.findAll(req.user.companyId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.reportTemplatesService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Request() req: any) {
    return this.reportTemplatesService.update(id, updateDto, req.user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.reportTemplatesService.remove(id, req.user.companyId);
  }
}