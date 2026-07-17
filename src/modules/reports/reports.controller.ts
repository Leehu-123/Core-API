import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Get report statistics' })
  @ApiResponse({ status: 200, description: 'Report stats' })
  @ApiQuery({ name: 'type', required: true, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getReport(
    @CurrentUser() user: JwtPayload,
    @Query('type') type: string,
    @Query('userId') userIdFilter?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const isSales = user.roles?.some(r => r.toLowerCase() === 'sales' || r.toLowerCase() === 'sale');
    const roleForReport = isSales ? 'SALES' : 'ADMIN';
    return this.reportsService.getReport(
      user.companyId,
      type,
      userIdFilter,
      startDate,
      endDate,
      roleForReport,
      user.sub
    );
  }
}
