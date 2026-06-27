import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { StocktakesService } from './stocktakes.service';
import { CreateStocktakeDto, QueryStocktakeDto, UpdateStocktakeDto, CompleteStocktakeDto } from './dto';

@ApiTags('Stocktakes')
@Controller('stocktakes')
@ApiBearerAuth('access-token')
export class StocktakesController {
  constructor(private readonly stocktakesService: StocktakesService) {}

  @Get()
  @Permissions('stocktakes.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List stocktakes' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryStocktakeDto) {
    return this.stocktakesService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('stocktakes.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get stocktake details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.stocktakesService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('stocktakes.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create stocktake' })
  create(@Body() dto: CreateStocktakeDto, @CurrentUser() user: JwtPayload) {
    return this.stocktakesService.create(user.companyId, user.sub, dto);
  }

  @Put(':id')
  @Permissions('stocktakes.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update stocktake' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStocktakeDto, @CurrentUser() user: JwtPayload) {
    return this.stocktakesService.update(id, user.companyId, user.sub, dto);
  }

  @Post(':id/submit')
  @Permissions('stocktakes.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Submit stocktake for review' })
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.stocktakesService.submit(id, user.companyId, user.sub);
  }

  @Post(':id/complete')
  @Permissions('stocktakes.approve')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Complete stocktake and optionally create adjustment' })
  complete(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteStocktakeDto, @CurrentUser() user: JwtPayload) {
    return this.stocktakesService.complete(id, user.companyId, user.sub, dto);
  }

  @Post(':id/cancel')
  @Permissions('stocktakes.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Cancel stocktake' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.stocktakesService.cancel(id, user.companyId, user.sub);
  }

  @Delete(':id/hard')
  @Permissions('stocktakes.delete')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Hard delete stocktake' })
  hardRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.stocktakesService.hardRemove(id, user.companyId, user.sub);
  }
}
