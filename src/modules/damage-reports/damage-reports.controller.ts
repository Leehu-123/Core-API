import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { DamageReportsService } from './damage-reports.service';
import { CreateDamageReportDto, QueryDamageReportDto, UpdateDamageReportDto, ProcessDamageReportDto } from './dto';

@ApiTags('Damage Reports')
@Controller('damage-reports')
@ApiBearerAuth('access-token')
export class DamageReportsController {
  constructor(private readonly damageReportsService: DamageReportsService) {}

  @Get()
  @Permissions('damage_reports.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List damage reports' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryDamageReportDto) {
    return this.damageReportsService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('damage_reports.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get damage report details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.damageReportsService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('damage_reports.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create damage report' })
  create(@Body() dto: CreateDamageReportDto, @CurrentUser() user: JwtPayload) {
    return this.damageReportsService.create(user.companyId, user.sub, dto);
  }

  @Put(':id')
  @Permissions('damage_reports.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update damage report' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDamageReportDto, @CurrentUser() user: JwtPayload) {
    return this.damageReportsService.update(id, user.companyId, user.sub, dto);
  }

  @Post(':id/resolve')
  @Permissions('damage_reports.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Resolve damage report' })
  resolve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ProcessDamageReportDto, @CurrentUser() user: JwtPayload) {
    return this.damageReportsService.resolve(id, user.companyId, user.sub, dto);
  }

  @Post(':id/approve')
  @Permissions('damage_reports.approve')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Approve damage report and deduct inventory' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.damageReportsService.approve(id, user.companyId, user.sub);
  }

  @Post(':id/reject')
  @Permissions('damage_reports.approve')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Reject damage report and restore inventory' })
  reject(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.damageReportsService.reject(id, user.companyId, user.sub);
  }

  @Post(':id/cancel')
  @Permissions('damage_reports.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Cancel damage report and restore inventory' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.damageReportsService.cancel(id, user.companyId, user.sub);
  }

  @Delete(':id/hard')
  @Permissions('damage_reports.delete')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Hard delete damage report' })
  hardRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.damageReportsService.hardRemove(id, user.companyId, user.sub);
  }
}
