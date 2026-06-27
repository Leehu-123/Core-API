import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions, Roles } from '../../common/decorators';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PermissionsGuard, RolesGuard } from '../../common/guards';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth('access-token')
@Roles('owner', 'admin')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('users.read')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('users.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.create(user.companyId, user.sub, dto);
  }

  @Patch(':id')
  @Permissions('users.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.update(id, user.companyId, user.sub, dto);
  }

  @Delete(':id')
  @Permissions('users.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Deactivate a user (soft delete)' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.remove(id, user.companyId, user.sub);
  }
}
