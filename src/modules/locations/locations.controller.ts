import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto, QueryLocationDto } from './dto';

@ApiTags('Locations')
@Controller('locations')
@ApiBearerAuth('access-token')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @Permissions('locations.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List locations with search and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of locations' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryLocationDto) {
    return this.locationsService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('locations.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get location by ID' })
  @ApiResponse({ status: 200, description: 'Location details' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.locationsService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('locations.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create a new location' })
  @ApiResponse({ status: 201, description: 'Location created' })
  create(@Body() dto: CreateLocationDto, @CurrentUser() user: JwtPayload) {
    return this.locationsService.create(user.companyId, user.sub, dto);
  }

  @Patch(':id')
  @Permissions('locations.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update a location' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLocationDto, @CurrentUser() user: JwtPayload) {
    return this.locationsService.update(id, user.companyId, user.sub, dto);
  }

  @Delete(':id')
  @Permissions('locations.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Soft delete a location' })
  @ApiResponse({ status: 200, description: 'Location deleted' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.locationsService.remove(id, user.companyId, user.sub);
  }

  @Delete(':id/hard')
  @Permissions('locations.delete')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Hard delete a location' })
  @ApiResponse({ status: 200, description: 'Location permanently deleted' })
  hardRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.locationsService.hardRemove(id, user.companyId, user.sub);
  }
}
