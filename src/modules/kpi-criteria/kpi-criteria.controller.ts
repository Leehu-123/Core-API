import { Controller, Get, Post, Body, Patch, Param, Delete, Request } from '@nestjs/common';
import { KpiCriteriaService } from './kpi-criteria.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('kpi-criteria')
@Controller('kpi-criteria')
export class KpiCriteriaController {
  constructor(private readonly kpiCriteriaService: KpiCriteriaService) {}

  @Post()
  create(@Body() createDto: any, @Request() req: any) {
    return this.kpiCriteriaService.create({ ...createDto, companyId: req.user.companyId });
  }

  @Get()
  findAll(@Request() req: any) {
    return this.kpiCriteriaService.findAll(req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.kpiCriteriaService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Request() req: any) {
    return this.kpiCriteriaService.update(id, updateDto, req.user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.kpiCriteriaService.remove(id, req.user.companyId);
  }
}