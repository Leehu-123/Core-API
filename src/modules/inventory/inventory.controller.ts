import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { InventoryService } from './inventory.service';
import { QueryInventoryDto, TransferStockDto } from './dto';

@ApiTags('Inventory')
@Controller('inventory')
@ApiBearerAuth('access-token')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Permissions('inventory.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get inventory list with pagination and search' })
  @ApiResponse({ status: 200, description: 'Inventory list' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryInventoryDto) {
    return this.inventoryService.findAll(user.companyId, query);
  }

  @Get('low-stock')
  @Permissions('inventory.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get low stock items' })
  @ApiResponse({ status: 200, description: 'Low stock items list' })
  getLowStockItems(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.getLowStockItems(user.companyId);
  }

  @Get('stats')
  @Permissions('inventory.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get dashboard inventory statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  getDashboardStats(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.getDashboardStats(user.companyId);
  }

  @Get(':productId/history')
  @Permissions('inventory.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get inventory history for a product' })
  @ApiResponse({ status: 200, description: 'Inventory and stock movements' })
  getHistory(@Param('productId', ParseUUIDPipe) productId: string, @CurrentUser() user: JwtPayload) {
    return this.inventoryService.getHistory(productId, user.companyId);
  }

  @Post('transfer')
  @Permissions('inventory.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Transfer stock between locations' })
  @ApiResponse({ status: 201, description: 'Transfer successful' })
  transferStock(@Body() dto: TransferStockDto, @CurrentUser() user: JwtPayload) {
    return this.inventoryService.transferStock(user.companyId, user.sub, dto);
  }
}
