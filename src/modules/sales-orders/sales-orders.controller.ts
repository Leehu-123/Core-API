import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { SalesOrdersService } from './sales-orders.service';
import { CreateSalesOrderDto, UpdateSalesOrderDto, QuerySalesOrderDto, AddPaymentDto } from './dto';

@ApiTags('Sales Orders')
@Controller('sales_orders')
@ApiBearerAuth('access-token')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  @Permissions('sales_orders.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List sales orders' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QuerySalesOrderDto) {
    return this.salesOrdersService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('sales_orders.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get sales order details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.salesOrdersService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('sales_orders.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create sales order' })
  create(@Body() dto: CreateSalesOrderDto, @CurrentUser() user: JwtPayload) {
    return this.salesOrdersService.create(user.companyId, user.sub, dto);
  }

  @Put(':id')
  @Permissions('sales_orders.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update sales order' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSalesOrderDto, @CurrentUser() user: JwtPayload) {
    return this.salesOrdersService.update(id, user.companyId, user.sub, dto);
  }

  @Post(':id/confirm')
  @Permissions('sales_orders.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Confirm sales order (NEW -> CONFIRMED)' })
  confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.salesOrdersService.confirm(id, user.companyId, user.sub);
  }

  @Post(':id/payments')
  @Permissions('sales_orders.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Add payment to sales order' })
  addPayment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddPaymentDto, @CurrentUser() user: JwtPayload) {
    return this.salesOrdersService.addPayment(id, user.companyId, user.sub, dto);
  }

  @Patch(':id/status')
  @Permissions('sales_orders.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update sales order status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.salesOrdersService.updateStatus(id, user.companyId, user.sub, status);
  }

  @Post(':id/cancel')
  @Permissions('sales_orders.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Cancel sales order' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.salesOrdersService.cancel(id, user.companyId, user.sub);
  }

  @Delete(':id')
  @Permissions('sales_orders.delete')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Soft delete sales order' })
  softRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.salesOrdersService.softRemove(id, user.companyId, user.sub);
  }

  @Delete(':id/hard')
  @Permissions('sales_orders.delete')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Hard delete sales order' })
  hardRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.salesOrdersService.hardRemove(id, user.companyId, user.sub);
  }
}
