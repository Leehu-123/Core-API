import { Controller, Get, Post, Body, Patch, Param, Delete, Request, Query, ForbiddenException } from '@nestjs/common';
import { KpiRecordsService } from './kpi-records.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('kpi-records')
@Controller('kpi-records')
export class KpiRecordsController {
  constructor(private readonly kpiRecordsService: KpiRecordsService) {}

  @Post()
  create(@Body() createDto: any, @Request() req: any) {
    return this.kpiRecordsService.create({ ...createDto, companyId: req.user.companyId });
  }

  @Post('bulk')
  bulkSave(@Body() body: any, @Request() req: any) {
    return this.kpiRecordsService.bulkSave(body, req.user.companyId);
  }

  @Post('approve')
  approve(@Body() body: any, @Request() req: any) {
    const role = (req.user.role || (Array.isArray(req.user.roles) ? req.user.roles[0] : req.user.roles) || '').toString().toUpperCase();
    if (role !== 'ADMIN' && role !== 'OWNER') {
      throw new ForbiddenException('Chỉ tài khoản quản trị mới có quyền phê duyệt phiếu KPI');
    }
    return this.kpiRecordsService.approve(body, req.user.companyId);
  }

  @Post('delete-sheet')
  deleteSheetPost(@Body() body: any, @Request() req: any) {
    return this.kpiRecordsService.deleteSheet(body, req.user.companyId);
  }

  @Delete('sheet')
  deleteSheet(@Body() body: any, @Request() req: any) {
    return this.kpiRecordsService.deleteSheet(body, req.user.companyId);
  }

  @Get('pending')
  findPendingSheets(@Request() req: any, @Query() query: any) {
    const role = req.user.role || (Array.isArray(req.user.roles) ? req.user.roles[0] : req.user.roles) || '';
    const userId = req.user.sub || req.user.id;
    return this.kpiRecordsService.findPendingSheets(req.user.companyId, userId, role, query);
  }

  @Get()
  findAll(@Request() req: any, @Query() query: any) {
    const role = req.user.role || (Array.isArray(req.user.roles) ? req.user.roles[0] : req.user.roles) || '';
    const userId = req.user.sub || req.user.id;
    return this.kpiRecordsService.findAll(req.user.companyId, userId, role, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.kpiRecordsService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Request() req: any) {
    return this.kpiRecordsService.update(id, updateDto, req.user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.kpiRecordsService.remove(id, req.user.companyId);
  }
}