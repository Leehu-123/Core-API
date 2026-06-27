import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogDto } from './dto';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@ApiBearerAuth('access-token')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Permissions('audit_logs.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List audit logs with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of audit logs' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryAuditLogDto) {
    return this.auditLogsService.findAll(user.companyId, query);
  }
}
