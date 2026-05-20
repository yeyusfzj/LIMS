/**
 * 测试样品流转页面修复
 * 验证 http 导入问题已解决
 */

const fs = require('fs');
const path = require('path');

console.log('=== 样品流转页面 HTTP 导入修复验证 ===\n');

// 读取修复后的文件
const filePath = path.join(__dirname, 'vue-project/src/views/sample/SampleTransferManagement.vue');
const content = fs.readFileSync(filePath, 'utf-8');

// 检查导入语句
const correctImport = content.includes("import http from '@/services/http'");
const incorrectImport = content.includes("import { http } from '@/services/http'");

console.log('✓ 文件路径:', filePath);
console.log('✓ 正确的导入方式 (import http from):', correctImport ? '✅ 是' : '❌ 否');
console.log('✓ 错误的导入方式 (import { http } from):', incorrectImport ? '❌ 存在' : '✅ 不存在');

if (correctImport && !incorrectImport) {
  console.log('\n✅ 修复成功！样品流转页面现在使用正确的 http 导入方式。');
  console.log('\n修复内容:');
  console.log('- 将 import { http } from \'@/services/http\' 改为');
  console.log('- import http from \'@/services/http\'');
  console.log('\n这与其他正常工作的组件保持一致，如:');
  console.log('- ReportTemplateList.vue');
  console.log('- ReportTemplateEditor.vue');
  console.log('- WorkflowDesigner.vue');
} else {
  console.log('\n❌ 修复失败，请检查文件内容。');
}

console.log('\n=== 验证完成 ===');
