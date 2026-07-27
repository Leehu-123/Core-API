import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
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
import { CreateUserDto, UpdateUserDto, UserFilterDto } from './dto';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  findAll(@Query() query: UserFilterDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.findAll(user.companyId, query);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  updateProfile(@Body() dto: UpdateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.update(user.sub, user.companyId, user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const isSelf = user.sub === id;
    const userRole = (user.roles?.[0] || '').toString().toLowerCase();
    const isPrivileged = ['owner', 'admin', 'administrator', 'manager', 'accountant'].includes(userRole);

    if (!isSelf && !isPrivileged) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin người dùng này');
    }

    return this.usersService.findOne(id, user.companyId);
  }

  @Post()
  @Roles('owner', 'admin')
  @Permissions('users.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.create(user.companyId, user.sub, dto);
  }

  @Put(':id')
  @Roles('owner', 'admin')
  @Permissions('users.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update a user (PUT)' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.update(id, user.companyId, user.sub, dto);
  }

  @Patch(':id')
  @Roles('owner', 'admin')
  @Permissions('users.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update a user (PATCH)' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  patchUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.update(id, user.companyId, user.sub, dto);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  @Permissions('users.write')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Deactivate a user (soft delete)' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.remove(id, user.companyId, user.sub);
  }
}
