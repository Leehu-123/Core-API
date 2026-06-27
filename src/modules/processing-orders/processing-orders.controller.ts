import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { ProcessingOrdersService } from './processing-orders.service';
import { CreateProcessingOrderDto, QueryProcessingOrderDto, UpdateProcessingOrderDto, CompleteProcessingOrderDto } from './dto';

@ApiTags('Processing Orders')
@Controller('processing-orders')
@ApiBearerAuth('access-token')
export class ProcessingOrdersController {
  constructor(private readonly processingOrdersService: ProcessingOrdersService) {}

  @Get()
  @Permissions('processing_orders.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List processing orders' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryProcessingOrderDto) {
    return this.processingOrdersService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('processing_orders.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get processing order details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.processingOrdersService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('processing_orders.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create processing order' })
  create(@Body() dto: CreateProcessingOrderDto, @CurrentUser() user: JwtPayload) {
    return this.processingOrdersService.create(user.companyId, user.sub, dto);
  }

  @Put(':id')
  @Permissions('processing_orders.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update processing order' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProcessingOrderDto, @CurrentUser() user: JwtPayload) {
    return this.processingOrdersService.update(id, user.companyId, user.sub, dto);
  }

  @Post(':id/submit')
  @Permissions('processing_orders.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Submit processing order' })
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.processingOrdersService.submit(id, user.companyId, user.sub);
  }

  @Post(':id/approve')
  @Permissions('processing_orders.approve')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Approve processing order' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.processingOrdersService.approve(id, user.companyId, user.sub);
  }

  @Post(':id/start')
  @Permissions('processing_orders.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Start processing (deduct materials)' })
  start(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.processingOrdersService.start(id, user.companyId, user.sub);
  }

  @Post(':id/complete')
  @Permissions('processing_orders.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Complete processing (add outputs/wastes)' })
  complete(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteProcessingOrderDto, @CurrentUser() user: JwtPayload) {
    return this.processingOrdersService.complete(id, user.companyId, user.sub, dto);
  }

  @Post(':id/cancel')
  @Permissions('processing_orders.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Cancel processing order' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.processingOrdersService.cancel(id, user.companyId, user.sub);
  }

  @Delete(':id/hard')
  @Permissions('processing_orders.delete')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Hard delete processing order' })
  hardRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.processingOrdersService.hardRemove(id, user.companyId, user.sub);
  }
}
