import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { SalesTasksService } from './sales-tasks.service';
import { CreateSalesTaskDto, UpdateSalesTaskDto, QuerySalesTaskDto } from './dto';

@ApiTags('Sales Tasks')
@Controller('sales-tasks')
@ApiBearerAuth('access-token')
export class SalesTasksController {
  constructor(private readonly salesTasksService: SalesTasksService) {}

  @Get()
  @Permissions('sales_tasks.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List sales tasks with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of sales tasks' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QuerySalesTaskDto) {
    const isSales = user.roles?.some(r => r.toLowerCase() === 'sales' || r.toLowerCase() === 'sale');
    const salesUserId = isSales ? user.sub : undefined;
    return this.salesTasksService.findAll(user.companyId, query, salesUserId);
  }

  @Get(':id')
  @Permissions('sales_tasks.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get sales task by ID' })
  @ApiResponse({ status: 200, description: 'Sales task details with relations' })
  @ApiResponse({ status: 404, description: 'Sales task not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.salesTasksService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('sales_tasks.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create a new sales task' })
  @ApiResponse({ status: 201, description: 'Sales task created' })
  create(@Body() dto: CreateSalesTaskDto, @CurrentUser() user: JwtPayload) {
    return this.salesTasksService.create(user.companyId, user.sub, dto);
  }

  @Put(':id')
  @Permissions('sales_tasks.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update a sales task' })
  @ApiResponse({ status: 200, description: 'Sales task updated' })
  @ApiResponse({ status: 404, description: 'Sales task not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSalesTaskDto, @CurrentUser() user: JwtPayload) {
    return this.salesTasksService.update(id, user.companyId, user.sub, dto);
  }

  @Post(':id/complete')
  @Permissions('sales_tasks.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Mark a sales task as completed' })
  @ApiResponse({ status: 200, description: 'Sales task marked as done' })
  @ApiResponse({ status: 404, description: 'Sales task not found' })
  complete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.salesTasksService.complete(id, user.companyId, user.sub);
  }

  @Post(':id/cancel')
  @Permissions('sales_tasks.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Cancel a sales task' })
  @ApiResponse({ status: 200, description: 'Sales task cancelled' })
  @ApiResponse({ status: 404, description: 'Sales task not found' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.salesTasksService.cancel(id, user.companyId, user.sub);
  }

  @Delete(':id')
  @Permissions('sales_tasks.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Delete a sales task' })
  @ApiResponse({ status: 200, description: 'Sales task deleted' })
  @ApiResponse({ status: 404, description: 'Sales task not found' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.salesTasksService.remove(id, user.companyId, user.sub);
  }
}
