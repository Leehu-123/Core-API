import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto } from './dto';

@ApiTags('Teams') @Controller('teams') @ApiBearerAuth('access-token')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get() @Permissions('teams.read') @UseGuards(PermissionsGuard) @ApiOperation({ summary: 'List teams' })
  findAll(@CurrentUser() user: JwtPayload) { return this.teamsService.findAll(user.companyId); }

  @Get(':id') @Permissions('teams.read') @UseGuards(PermissionsGuard) @ApiOperation({ summary: 'Get team' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) { return this.teamsService.findOne(id, user.companyId); }

  @Post() @Permissions('teams.write') @UseGuards(PermissionsGuard) @ApiOperation({ summary: 'Create team' })
  create(@Body() dto: CreateTeamDto, @CurrentUser() user: JwtPayload) { return this.teamsService.create(user.companyId, dto); }

  @Put(':id') @Permissions('teams.write') @UseGuards(PermissionsGuard) @ApiOperation({ summary: 'Update team' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTeamDto, @CurrentUser() user: JwtPayload) { return this.teamsService.update(id, user.companyId, dto); }

  @Delete(':id') @Permissions('teams.delete') @UseGuards(PermissionsGuard) @ApiOperation({ summary: 'Delete team' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) { return this.teamsService.remove(id, user.companyId); }
}
