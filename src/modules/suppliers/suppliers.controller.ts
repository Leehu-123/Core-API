import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto, QuerySupplierDto } from './dto';

@ApiTags('Suppliers')
@Controller('suppliers')
@ApiBearerAuth('access-token')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @Permissions('suppliers.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List suppliers with search and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of suppliers' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QuerySupplierDto) {
    return this.suppliersService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('suppliers.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiResponse({ status: 200, description: 'Supplier details' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.suppliersService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('suppliers.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiResponse({ status: 201, description: 'Supplier created' })
  create(@Body() dto: CreateSupplierDto, @CurrentUser() user: JwtPayload) {
    return this.suppliersService.create(user.companyId, user.sub, dto);
  }

  @Patch(':id')
  @Permissions('suppliers.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto, @CurrentUser() user: JwtPayload) {
    return this.suppliersService.update(id, user.companyId, user.sub, dto);
  }

  @Delete(':id')
  @Permissions('suppliers.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Soft delete a supplier' })
  @ApiResponse({ status: 200, description: 'Supplier deleted' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.suppliersService.remove(id, user.companyId, user.sub);
  }

  @Delete(':id/hard')
  @Permissions('suppliers.delete')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Hard delete a supplier' })
  @ApiResponse({ status: 200, description: 'Supplier permanently deleted' })
  hardRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.suppliersService.hardRemove(id, user.companyId, user.sub);
  }
}
