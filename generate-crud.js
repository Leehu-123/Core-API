const fs = require('fs');
const path = require('path');

const modules = [
  { name: 'branches', modelName: 'Branch', serviceName: 'BranchesService', controllerName: 'BranchesController', moduleName: 'BranchesModule' },
  { name: 'departments', modelName: 'Department', serviceName: 'DepartmentsService', controllerName: 'DepartmentsController', moduleName: 'DepartmentsModule' },
  { name: 'dafa-tasks', modelName: 'Task', serviceName: 'DafaTasksService', controllerName: 'DafaTasksController', moduleName: 'DafaTasksModule' },
  { name: 'kpi-criteria', modelName: 'KpiCriteria', serviceName: 'KpiCriteriaService', controllerName: 'KpiCriteriaController', moduleName: 'KpiCriteriaModule' },
  { name: 'kpi-records', modelName: 'KpiRecord', serviceName: 'KpiRecordsService', controllerName: 'KpiRecordsController', moduleName: 'KpiRecordsModule' },
  { name: 'work-reports', modelName: 'WorkReport', serviceName: 'WorkReportsService', controllerName: 'WorkReportsController', moduleName: 'WorkReportsModule' },
  { name: 'report-templates', modelName: 'ReportTemplate', serviceName: 'ReportTemplatesService', controllerName: 'ReportTemplatesController', moduleName: 'ReportTemplatesModule' },
  { name: 'notifications', modelName: 'Notification', serviceName: 'NotificationsService', controllerName: 'NotificationsController', moduleName: 'NotificationsModule' },
];

const srcModulesDir = path.join(__dirname, 'src', 'modules');

modules.forEach(mod => {
  const modDir = path.join(srcModulesDir, mod.name);
  if (!fs.existsSync(modDir)) fs.mkdirSync(modDir, { recursive: true });

  const serviceCamel = mod.serviceName.charAt(0).toLowerCase() + mod.serviceName.slice(1);
  const prismaModel = mod.modelName.charAt(0).toLowerCase() + mod.modelName.slice(1);

  // module
  fs.writeFileSync(path.join(modDir, `${mod.name}.module.ts`), `
import { Module } from '@nestjs/common';
import { ${mod.serviceName} } from './${mod.name}.service';
import { ${mod.controllerName} } from './${mod.name}.controller';

@Module({
  controllers: [${mod.controllerName}],
  providers: [${mod.serviceName}],
})
export class ${mod.moduleName} {}
`.trim());

  // controller
  fs.writeFileSync(path.join(modDir, `${mod.name}.controller.ts`), `
import { Controller, Get, Post, Body, Patch, Param, Delete, Request } from '@nestjs/common';
import { ${mod.serviceName} } from './${mod.name}.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('${mod.name}')
@Controller('${mod.name}')
export class ${mod.controllerName} {
  constructor(private readonly ${serviceCamel}: ${mod.serviceName}) {}

  @Post()
  create(@Body() createDto: any, @Request() req) {
    return this.${serviceCamel}.create({ ...createDto, companyId: req.user.companyId });
  }

  @Get()
  findAll(@Request() req) {
    return this.${serviceCamel}.findAll(req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.${serviceCamel}.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Request() req) {
    return this.${serviceCamel}.update(id, updateDto, req.user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.${serviceCamel}.remove(id, req.user.companyId);
  }
}
`.trim());

  // service
  fs.writeFileSync(path.join(modDir, `${mod.name}.service.ts`), `
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ${mod.serviceName} {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.${prismaModel}.create({ data });
  }

  async findAll(companyId: string) {
    return this.prisma.${prismaModel}.findMany({
      where: { companyId },
    });
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.${prismaModel}.findFirst({
      where: { id, companyId },
    });
    if (!item) throw new NotFoundException('Not found');
    return item;
  }

  async update(id: string, data: any, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.${prismaModel}.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.${prismaModel}.delete({
      where: { id },
    });
  }
}
`.trim());
});

console.log('CRUD modules generated successfully.');
