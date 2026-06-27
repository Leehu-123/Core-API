import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto, UpdateOpportunityDto, QueryOpportunityDto } from './dto';

@ApiTags('Opportunities')
@Controller('opportunities')
@ApiBearerAuth('access-token')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  @Permissions('opportunities.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List opportunities with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of opportunities' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryOpportunityDto) {
    return this.opportunitiesService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('opportunities.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get opportunity by ID' })
  @ApiResponse({ status: 200, description: 'Opportunity details with full relations' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.opportunitiesService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('opportunities.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create a new opportunity' })
  @ApiResponse({ status: 201, description: 'Opportunity created' })
  create(@Body() dto: CreateOpportunityDto, @CurrentUser() user: JwtPayload) {
    return this.opportunitiesService.create(user.companyId, user.sub, dto);
  }

  @Patch(':id')
  @Permissions('opportunities.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update an opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity updated' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOpportunityDto, @CurrentUser() user: JwtPayload) {
    return this.opportunitiesService.update(id, user.companyId, user.sub, dto);
  }

  @Delete(':id')
  @Permissions('opportunities.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Soft delete an opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity soft deleted' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.opportunitiesService.softRemove(id, user.companyId, user.sub);
  }

  @Delete(':id/hard')
  @Permissions('opportunities.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Permanently delete an opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity permanently deleted' })
  hardRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.opportunitiesService.hardRemove(id, user.companyId, user.sub);
  }
}
