import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { StockAdjustmentsService } from './stock-adjustments.service';
import { CreateStockAdjustmentDto, QueryStockAdjustmentDto, UpdateStockAdjustmentDto } from './dto';

@ApiTags('Stock Adjustments')
@Controller('adjustments')
@ApiBearerAuth('access-token')
export class StockAdjustmentsController {
  constructor(private readonly stockAdjustmentsService: StockAdjustmentsService) {}

  @Get()
  @Permissions('adjustments.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List stock adjustments' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryStockAdjustmentDto) {
    return this.stockAdjustmentsService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('adjustments.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get stock adjustment details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.stockAdjustmentsService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('adjustments.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create stock adjustment' })
  create(@Body() dto: CreateStockAdjustmentDto, @CurrentUser() user: JwtPayload) {
    return this.stockAdjustmentsService.create(user.companyId, user.sub, dto);
  }

  @Put(':id')
  @Permissions('adjustments.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update stock adjustment' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStockAdjustmentDto, @CurrentUser() user: JwtPayload) {
    return this.stockAdjustmentsService.update(id, user.companyId, user.sub, dto);
  }

  @Post(':id/submit')
  @Permissions('adjustments.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Submit stock adjustment for approval' })
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.stockAdjustmentsService.submit(id, user.companyId, user.sub);
  }

  @Post(':id/approve')
  @Permissions('adjustments.approve')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Approve stock adjustment and apply inventory changes' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.stockAdjustmentsService.approve(id, user.companyId, user.sub);
  }

  @Post(':id/cancel')
  @Permissions('adjustments.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Cancel stock adjustment' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.stockAdjustmentsService.cancel(id, user.companyId, user.sub);
  }

  @Delete(':id/hard')
  @Permissions('adjustments.delete')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Hard delete stock adjustment' })
  hardRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.stockAdjustmentsService.hardRemove(id, user.companyId, user.sub);
  }
}
