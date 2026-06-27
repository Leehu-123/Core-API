import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { GoodsIssuesService } from './goods-issues.service';
import { CreateGoodsIssueDto, QueryGoodsIssueDto, UpdateGoodsIssueDto } from './dto';

@ApiTags('Goods Issues')
@Controller('goods-issues')
@ApiBearerAuth('access-token')
export class GoodsIssuesController {
  constructor(private readonly goodsIssuesService: GoodsIssuesService) {}

  @Get()
  @Permissions('goods_issues.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List goods issues' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryGoodsIssueDto) {
    return this.goodsIssuesService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('goods_issues.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get goods issue details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.goodsIssuesService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('goods_issues.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create goods issue' })
  create(@Body() dto: CreateGoodsIssueDto, @CurrentUser() user: JwtPayload) {
    return this.goodsIssuesService.create(user.companyId, user.sub, dto);
  }

  @Put(':id')
  @Permissions('goods_issues.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update goods issue' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGoodsIssueDto, @CurrentUser() user: JwtPayload) {
    return this.goodsIssuesService.update(id, user.companyId, user.sub, dto);
  }

  @Post(':id/submit')
  @Permissions('goods_issues.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Submit goods issue' })
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.goodsIssuesService.submit(id, user.companyId, user.sub);
  }

  @Post(':id/approve')
  @Permissions('goods_issues.approve')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Approve goods issue' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.goodsIssuesService.approve(id, user.companyId, user.sub);
  }

  @Post(':id/confirm')
  @Permissions('goods_issues.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Confirm goods issue to inventory' })
  confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.goodsIssuesService.confirm(id, user.companyId, user.sub);
  }

  @Post(':id/cancel')
  @Permissions('goods_issues.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Cancel goods issue' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.goodsIssuesService.cancel(id, user.companyId, user.sub);
  }

  @Delete(':id/hard')
  @Permissions('goods_issues.delete')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Hard delete goods issue' })
  hardRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.goodsIssuesService.hardRemove(id, user.companyId, user.sub);
  }
}
