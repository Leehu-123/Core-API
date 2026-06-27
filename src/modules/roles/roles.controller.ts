import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { RolesService } from './roles.service';
import { AssignRoleDto } from './dto';

@ApiTags('Roles')
@Controller('roles')
@ApiBearerAuth('access-token')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles for current company' })
  @ApiResponse({ status: 200, description: 'List of roles with permissions' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.rolesService.findAll(user.companyId);
  }

  @Post('assign')
  @Roles('owner', 'admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Assign a role to a user (owner/admin only)' })
  @ApiResponse({ status: 201, description: 'Role assigned' })
  @ApiResponse({ status: 409, description: 'Role already assigned' })
  assignRole(@Body() dto: AssignRoleDto, @CurrentUser() user: JwtPayload) {
    return this.rolesService.assignRole(user.companyId, dto);
  }

  @Post('remove')
  @Roles('owner', 'admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Remove a role from a user (owner/admin only)' })
  @ApiResponse({ status: 200, description: 'Role removed' })
  removeRole(@Body() dto: AssignRoleDto, @CurrentUser() user: JwtPayload) {
    return this.rolesService.removeRole(user.companyId, dto);
  }
}
