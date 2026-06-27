import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { CustomerInteractionsService } from './customer-interactions.service';
import { CreateCustomerInteractionDto, QueryCustomerInteractionDto } from './dto';

@ApiTags('Customer Interactions')
@Controller('customer-interactions')
@ApiBearerAuth('access-token')
export class CustomerInteractionsController {
  constructor(private readonly customerInteractionsService: CustomerInteractionsService) {}

  @Get()
  @Permissions('interactions.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List customer interactions with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of customer interactions' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryCustomerInteractionDto) {
    return this.customerInteractionsService.findAll(user.companyId, query);
  }

  @Get('customer/:customerId')
  @Permissions('interactions.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get all interactions for a specific customer' })
  @ApiResponse({ status: 200, description: 'List of interactions for the customer' })
  findByCustomer(@Param('customerId', ParseUUIDPipe) customerId: string, @CurrentUser() user: JwtPayload) {
    return this.customerInteractionsService.findByCustomer(customerId, user.companyId);
  }

  @Post()
  @Permissions('interactions.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create a new customer interaction' })
  @ApiResponse({ status: 201, description: 'Customer interaction created' })
  create(@Body() dto: CreateCustomerInteractionDto, @CurrentUser() user: JwtPayload) {
    return this.customerInteractionsService.create(user.companyId, user.sub, dto);
  }

  @Delete(':id')
  @Permissions('interactions.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Delete a customer interaction' })
  @ApiResponse({ status: 200, description: 'Customer interaction deleted' })
  @ApiResponse({ status: 404, description: 'Customer interaction not found' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.customerInteractionsService.remove(id, user.companyId, user.sub);
  }
}
