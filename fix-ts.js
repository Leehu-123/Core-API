const fs = require('fs');
const path = require('path');

const modules = [
  'branches', 'departments', 'dafa-tasks', 'kpi-criteria', 'kpi-records', 'work-reports', 'report-templates'
];

const srcModulesDir = path.join(__dirname, 'src', 'modules');

modules.forEach(mod => {
  const controllerPath = path.join(srcModulesDir, mod, `${mod}.controller.ts`);
  if (fs.existsSync(controllerPath)) {
    let content = fs.readFileSync(controllerPath, 'utf8');
    content = content.replace(/@Request\(\) req/g, '@Request() req: any');
    fs.writeFileSync(controllerPath, content);
  }
});

// Fix department service
const deptServicePath = path.join(srcModulesDir, 'departments', 'departments.service.ts');
if (fs.existsSync(deptServicePath)) {
  let content = fs.readFileSync(deptServicePath, 'utf8');
  content = content.replace(/where: \{ companyId \}/g, 'where: {}');
  content = content.replace(/where: \{ id, companyId \}/g, 'where: { id }');
  fs.writeFileSync(deptServicePath, content);
}

console.log('Fixed TS errors in generated files.');
