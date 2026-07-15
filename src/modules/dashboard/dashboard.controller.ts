import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get sales dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  getDashboardStats(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getStats(user.companyId, user.sub, user.roles);
  }
}
