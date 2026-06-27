import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { BusinessTripsService } from './business-trips.service';
import { CreateBusinessTripDto, UpdateBusinessTripDto, QueryBusinessTripDto, AddDailyReportDto } from './dto';

@ApiTags('Business Trips')
@Controller('business-trips')
@ApiBearerAuth('access-token')
export class BusinessTripsController {
  constructor(private readonly businessTripsService: BusinessTripsService) {}

  @Get()
  @Permissions('business_trips.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List business trips with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of business trips' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryBusinessTripDto) {
    return this.businessTripsService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('business_trips.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get business trip by ID with user and daily reports' })
  @ApiResponse({ status: 200, description: 'Business trip details with relations' })
  @ApiResponse({ status: 404, description: 'Business trip not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.businessTripsService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('business_trips.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create a new business trip' })
  @ApiResponse({ status: 201, description: 'Business trip created with status PROPOSED' })
  create(@Body() dto: CreateBusinessTripDto, @CurrentUser() user: JwtPayload) {
    return this.businessTripsService.create(user.companyId, user.sub, dto);
  }

  @Put(':id')
  @Permissions('business_trips.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update a business trip' })
  @ApiResponse({ status: 200, description: 'Business trip updated' })
  @ApiResponse({ status: 404, description: 'Business trip not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBusinessTripDto, @CurrentUser() user: JwtPayload) {
    return this.businessTripsService.update(id, user.companyId, user.sub, dto);
  }

  @Post(':id/approve')
  @Permissions('business_trips.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Approve a proposed business trip' })
  @ApiResponse({ status: 200, description: 'Business trip approved' })
  @ApiResponse({ status: 400, description: 'Trip is not in PROPOSED status' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.businessTripsService.approve(id, user.companyId, user.sub);
  }

  @Post(':id/reject')
  @Permissions('business_trips.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Reject a proposed business trip' })
  @ApiResponse({ status: 200, description: 'Business trip rejected' })
  @ApiResponse({ status: 400, description: 'Trip is not in PROPOSED status' })
  reject(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.businessTripsService.reject(id, user.companyId, user.sub);
  }

  @Post(':id/start')
  @Permissions('business_trips.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Start an approved business trip' })
  @ApiResponse({ status: 200, description: 'Business trip started' })
  @ApiResponse({ status: 400, description: 'Trip is not in APPROVED status' })
  start(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.businessTripsService.start(id, user.companyId, user.sub);
  }

  @Post(':id/complete')
  @Permissions('business_trips.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Complete an in-progress business trip' })
  @ApiResponse({ status: 200, description: 'Business trip completed' })
  @ApiResponse({ status: 400, description: 'Trip is not in IN_PROGRESS status' })
  complete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.businessTripsService.complete(id, user.companyId, user.sub);
  }

  @Get(':id/reports')
  @Permissions('business_trips.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get daily reports for a business trip' })
  @ApiResponse({ status: 200, description: 'List of daily reports' })
  @ApiResponse({ status: 404, description: 'Business trip not found' })
  getDailyReports(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.businessTripsService.getDailyReports(id, user.companyId);
  }

  @Post(':id/reports')
  @Permissions('business_trips.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Add a daily report to a business trip' })
  @ApiResponse({ status: 201, description: 'Daily report added and trip totals updated' })
  @ApiResponse({ status: 404, description: 'Business trip not found' })
  addDailyReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddDailyReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.businessTripsService.addDailyReport(id, user.companyId, user.sub, dto);
  }

  @Delete(':id/hard')
  @Permissions('business_trips.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Hard delete a business trip and its daily reports' })
  @ApiResponse({ status: 200, description: 'Business trip permanently deleted' })
  @ApiResponse({ status: 404, description: 'Business trip not found' })
  hardRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.businessTripsService.hardRemove(id, user.companyId, user.sub);
  }
}
