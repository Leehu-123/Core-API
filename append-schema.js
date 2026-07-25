const fs = require('fs');
const dafaSchemaPath = 'd:\\Antigravity\\Dafa manager app\\dafa-manager\\prisma\\schema.prisma';
const coreSchemaPath = 'd:\\Antigravity\\Dafa manager app\\Core-API\\prisma\\schema.prisma';

const dafaContent = fs.readFileSync(dafaSchemaPath, 'utf8').split('\n');

// Extract Enums (from enum TaskPriority to enum KpiStatus)
const enumStartIndex = dafaContent.findIndex(line => line.includes('enum TaskPriority'));
const enumEndIndex = dafaContent.findIndex(line => line.includes('enum KpiStatus')) + 4; // Include the closing brace of KpiStatus

const enums = dafaContent.slice(enumStartIndex, enumEndIndex).join('\n');

// Extract DAFA specific models (from model Branch to end)
const modelStartIndex = dafaContent.findIndex(line => line.includes('model Branch'));
const models = dafaContent.slice(modelStartIndex).join('\n');

const toAppend = `\n// =============================================================================\n// DAFA MANAGER ENUMS & MODELS\n// =============================================================================\n\n${enums}\n\n${models}\n`;

fs.appendFileSync(coreSchemaPath, toAppend);
console.log('Appended DAFA models to Core-API schema successfully.');
