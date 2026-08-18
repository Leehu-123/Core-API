import { Controller, Get, Post, Delete, Body, Param, Request, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CompanyDocumentsService } from './company-documents.service';

@ApiTags('company-documents')
@Controller('company-documents')
export class CompanyDocumentsController {
  constructor(private readonly service: CompanyDocumentsService) {}

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.service.create({
      ...body,
      companyId: req.user.companyId,
      createdById: req.user.sub || req.user.id,
    });
  }

  @Get()
  findAll(@Request() req: any, @Query() query: any) {
    return this.service.findAll(
      req.user.companyId,
      query.type,
      query.page ? parseInt(query.page) : 1,
      query.limit ? parseInt(query.limit) : 20,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, req.user.companyId);
  }
}
