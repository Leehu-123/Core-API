import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto';

@ApiTags('Companies')
@Controller('companies')
@ApiBearerAuth('access-token')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user company profile' })
  @ApiResponse({ status: 200, description: 'Company profile' })
  getMyCompany(@CurrentUser() user: JwtPayload) {
    return this.companiesService.getMyCompany(user.companyId);
  }

  @Patch('me')
  @Roles('owner', 'admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update company profile (owner/admin only)' })
  @ApiResponse({ status: 200, description: 'Company updated' })
  updateMyCompany(@Body() dto: UpdateCompanyDto, @CurrentUser() user: JwtPayload) {
    return this.companiesService.updateMyCompany(user.companyId, dto);
  }
}
