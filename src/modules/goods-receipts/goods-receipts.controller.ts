import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { GoodsReceiptsService } from './goods-receipts.service';
import { CreateGoodsReceiptDto, QueryGoodsReceiptDto, UpdateGoodsReceiptDto } from './dto';

@ApiTags('Goods Receipts')
@Controller('goods-receipts')
@ApiBearerAuth('access-token')
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Get()
  @Permissions('goods_receipts.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List goods receipts' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryGoodsReceiptDto) {
    return this.goodsReceiptsService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('goods_receipts.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get goods receipt details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.goodsReceiptsService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('goods_receipts.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create goods receipt' })
  create(@Body() dto: CreateGoodsReceiptDto, @CurrentUser() user: JwtPayload) {
    return this.goodsReceiptsService.create(user.companyId, user.sub, dto);
  }

  @Put(':id')
  @Permissions('goods_receipts.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update goods receipt' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGoodsReceiptDto, @CurrentUser() user: JwtPayload) {
    return this.goodsReceiptsService.update(id, user.companyId, user.sub, dto);
  }

  @Post(':id/submit')
  @Permissions('goods_receipts.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Submit goods receipt' })
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.goodsReceiptsService.submit(id, user.companyId, user.sub);
  }

  @Post(':id/approve')
  @Permissions('goods_receipts.approve')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Approve goods receipt' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.goodsReceiptsService.approve(id, user.companyId, user.sub);
  }

  @Post(':id/confirm')
  @Permissions('goods_receipts.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Confirm goods receipt to inventory' })
  confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.goodsReceiptsService.confirm(id, user.companyId, user.sub);
  }

  @Post(':id/cancel')
  @Permissions('goods_receipts.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Cancel goods receipt' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.goodsReceiptsService.cancel(id, user.companyId, user.sub);
  }

  @Delete(':id/hard')
  @Permissions('goods_receipts.delete')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Hard delete goods receipt' })
  hardRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.goodsReceiptsService.hardRemove(id, user.companyId, user.sub);
  }
}
