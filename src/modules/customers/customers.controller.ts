import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Put, Post, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomerDto } from './dto';

@ApiTags('Customers')
@Controller('customers')
@ApiBearerAuth('access-token')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Permissions('customers.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List customers with search and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of customers' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryCustomerDto) {
    return this.customersService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('customers.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer details' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.customersService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('customers.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: JwtPayload) {
    return this.customersService.create(user.companyId, user.sub, dto);
  }

  @Put(':id')
  @Permissions('customers.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update a customer' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() user: JwtPayload) {
    return this.customersService.update(id, user.companyId, user.sub, dto);
  }

  @Delete(':id')
  @Permissions('customers.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Soft delete a customer (admin/manager only)' })
  @ApiResponse({ status: 200, description: 'Customer deleted' })
  @ApiResponse({ status: 403, description: 'Sales users cannot delete customers' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    // Only admin, owner, manager roles can delete customers
    const adminRoles = ['owner', 'admin', 'administrator', 'manager'];
    const hasAdminRole = user.roles?.some((r: string) => adminRoles.includes(r.toLowerCase()));
    if (!hasAdminRole) {
      throw new ForbiddenException('Nhân viên sale không có quyền xóa khách hàng. Vui lòng liên hệ quản trị viên để được phê duyệt.');
    }
    return this.customersService.remove(id, user.companyId, user.sub);
  }
}
