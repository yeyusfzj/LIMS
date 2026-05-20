/**
 * 检查DELETE路由是否正确注册
 */

const fs = require('fs');
const path = require('path');

// 读取路由文件
const routeFile = fs.readFileSync(
  path.join(__dirname, 'backend-api/src/routes/sampleRoutes.ts'),
  'utf-8'
);

console.log('========================================');
console.log('检查DELETE路由配置');
console.log('========================================\n');

// 查找DELETE路由定义
const deleteRouteMatch = routeFile.match(/router\.delete\(\s*['"]\/(:id)['"],[\s\S]*?sampleController\.deleteSample/);

if (deleteRouteMatch) {
  console.log('✓ 找到DELETE路由定义');
  console.log('\n路由配置:');
  console.log('----------------------------------------');
  console.log(deleteRouteMatch[0]);
  console.log('----------------------------------------\n');
} else {
  console.log('✗ 未找到DELETE路由定义\n');
}

// 检查路由顺序
console.log('路由注册顺序:');
console.log('----------------------------------------');

const routeMatches = routeFile.matchAll(/router\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g);
let index = 1;
for (const match of routeMatches) {
  const method = match[1].toUpperCase();
  const path = match[2];
  console.log(`${index}. ${method.padEnd(7)} ${path}`);
  index++;
}

console.log('========================================');
