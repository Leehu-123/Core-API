import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { KpisService } from './kpis.service';
import { CreateKpiDto, UpdateKpiDto, QueryKpiDto } from './dto';

@ApiTags('KPIs')
@Controller('kpis')
@ApiBearerAuth('access-token')
export class KpisController {
  constructor(private readonly kpisService: KpisService) {}

  @Get()
  @Permissions('kpis.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List KPIs with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of KPIs' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryKpiDto) {
    return this.kpisService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('kpis.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get KPI by ID' })
  @ApiResponse({ status: 200, description: 'KPI details' })
  @ApiResponse({ status: 404, description: 'KPI not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.kpisService.findOne(id, user.companyId);
  }

  @Get('user/:userId')
  @Permissions('kpis.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get all KPIs for a specific user' })
  @ApiResponse({ status: 200, description: 'List of KPIs for the user' })
  findByUser(@Param('userId', ParseUUIDPipe) userId: string, @CurrentUser() user: JwtPayload) {
    return this.kpisService.findByUser(userId, user.companyId);
  }

  @Post()
  @Permissions('kpis.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create or update a KPI (upsert by company+user+month+year)' })
  @ApiResponse({ status: 201, description: 'KPI created or updated' })
  upsert(@Body() dto: CreateKpiDto, @CurrentUser() user: JwtPayload) {
    return this.kpisService.upsert(user.companyId, user.sub, dto);
  }

  @Put(':id')
  @Permissions('kpis.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update a KPI' })
  @ApiResponse({ status: 200, description: 'KPI updated' })
  @ApiResponse({ status: 404, description: 'KPI not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateKpiDto, @CurrentUser() user: JwtPayload) {
    return this.kpisService.update(id, user.companyId, user.sub, dto);
  }

  @Delete(':id')
  @Permissions('kpis.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Delete a KPI' })
  @ApiResponse({ status: 200, description: 'KPI deleted' })
  @ApiResponse({ status: 404, description: 'KPI not found' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.kpisService.remove(id, user.companyId, user.sub);
  }
}
