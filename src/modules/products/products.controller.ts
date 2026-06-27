import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, QueryProductDto, GenerateCodeDto } from './dto';

@ApiTags('Products')
@Controller('products')
@ApiBearerAuth('access-token')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Permissions('products.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List products with search and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of products' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryProductDto) {
    return this.productsService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('products.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('products.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: JwtPayload) {
    return this.productsService.create(user.companyId, user.sub, dto);
  }

  @Patch(':id')
  @Permissions('products.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: JwtPayload) {
    return this.productsService.update(id, user.companyId, user.sub, dto);
  }

  @Delete(':id')
  @Permissions('products.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Soft delete a product' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.remove(id, user.companyId, user.sub);
  }

  @Post('generate-code')
  @Permissions('products.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Generate item code based on attributes' })
  @ApiResponse({ status: 200, description: 'Generated code' })
  generateCode(@Body() dto: GenerateCodeDto) {
    const code = this.productsService.generateItemCode(dto);
    return { code };
  }

  @Delete(':id/hard')
  @Permissions('products.delete')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Hard delete a product' })
  @ApiResponse({ status: 200, description: 'Product permanently deleted' })
  hardRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.hardRemove(id, user.companyId, user.sub);
  }
}
