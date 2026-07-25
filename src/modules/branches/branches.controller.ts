import { Controller, Get, Post, Body, Patch, Param, Delete, Request } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('branches')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  create(@Body() createDto: any, @Request() req: any) {
    return this.branchesService.create({ ...createDto, companyId: req.user.companyId });
  }

  @Get()
  findAll(@Request() req: any) {
    return this.branchesService.findAll(req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.branchesService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Request() req: any) {
    return this.branchesService.update(id, updateDto, req.user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.branchesService.remove(id, req.user.companyId);
  }
}