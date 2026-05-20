/**
 * 验证 Vue 文件的语法
 */

const fs = require('fs');
const path = require('path');

const files = [
  'vue-project/src/views/sample/SampleRegistration.vue',
  'vue-project/src/views/sample/SampleManagement.vue'
];

console.log('========================================');
console.log('验证 Vue 文件语法');
console.log('========================================\n');

files.forEach(file => {
  console.log(`检查文件: ${file}`);
  
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    // 检查基本结构
    const hasTemplate = content.includes('<template>');
    const hasScript = content.includes('<script');
    const hasStyle = content.includes('<style');
    
    console.log(`  ✓ 包含 <template>: ${hasTemplate}`);
    console.log(`  ✓ 包含 <script>: ${hasScript}`);
    console.log(`  ✓ 包含 <style>: ${hasStyle}`);
    
    // 检查标签闭合
    const templateOpen = (content.match(/<template>/g) || []).length;
    const templateClose = (content.match(/<\/template>/g) || []).length;
    const scriptOpen = (content.match(/<script[^>]*>/g) || []).length;
    const scriptClose = (content.match(/<\/script>/g) || []).length;
    const styleOpen = (content.match(/<style[^>]*>/g) || []).length;
    const styleClose = (content.match(/<\/style>/g) || []).length;
    
    console.log(`  ✓ <template> 标签: ${templateOpen} 开 / ${templateClose} 闭`);
    console.log(`  ✓ <script> 标签: ${scriptOpen} 开 / ${scriptClose} 闭`);
    console.log(`  ✓ <style> 标签: ${styleOpen} 开 / ${styleClose} 闭`);
    
    // 检查大括号匹配
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    console.log(`  ✓ 大括号: ${openBraces} 开 / ${closeBraces} 闭 (差值: ${openBraces - closeBraces})`);
    
    // 检查小括号匹配
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    console.log(`  ✓ 小括号: ${openParens} 开 / ${closeParens} 闭 (差值: ${openParens - closeParens})`);
    
    // 检查方括号匹配
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    console.log(`  ✓ 方括号: ${openBrackets} 开 / ${closeBrackets} 闭 (差值: ${openBrackets - closeBrackets})`);
    
    // 检查文件大小
    const stats = fs.statSync(file);
    console.log(`  ✓ 文件大小: ${stats.size} 字节`);
    
    // 检查是否有常见的语法错误
    const errors = [];
    
    if (templateOpen !== templateClose) {
      errors.push(`<template> 标签不匹配`);
    }
    if (scriptOpen !== scriptClose) {
      errors.push(`<script> 标签不匹配`);
    }
    if (styleOpen !== styleClose) {
      errors.push(`<style> 标签不匹配`);
    }
    if (Math.abs(openBraces - closeBraces) > 5) {
      errors.push(`大括号可能不匹配 (差值: ${openBraces - closeBraces})`);
    }
    
    if (errors.length > 0) {
      console.log(`  ✗ 发现问题:`);
      errors.forEach(err => console.log(`    - ${err}`));
    } else {
      console.log(`  ✓ 文件结构看起来正常`);
    }
    
    console.log('');
    
  } catch (error) {
    console.log(`  ✗ 读取文件失败: ${error.message}`);
    console.log('');
  }
});

console.log('========================================');
console.log('验证完成');
console.log('========================================\n');

console.log('如果文件结构正常但仍然报错，请尝试:');
console.log('1. 运行 restart-frontend.bat 重启前端服务');
console.log('2. 清除浏览器缓存 (Ctrl+Shift+Delete)');
console.log('3. 使用无痕模式访问 (Ctrl+Shift+N)');
