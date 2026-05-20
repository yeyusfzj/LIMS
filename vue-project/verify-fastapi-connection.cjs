/**
 * 验证前端是否完全连接到 FastAPI 后端
 * 检查所有配置文件和环境变量
 */

const fs = require('fs');
const path = require('path');

console.log('=== 验证前端 FastAPI 后端连接配置 ===\n');

const checks = [];

// 1. 检查 .env.development
console.log('1. 检查开发环境配置 (.env.development)...');
try {
  const envDev = fs.readFileSync(path.join(__dirname, '.env.development'), 'utf8');
  if (envDev.includes('localhost:8000') && envDev.includes('/api/v1')) {
    console.log('   ✅ 开发环境配置正确: http://localhost:8000/api/v1');
    checks.push({ name: '.env.development', status: 'pass' });
  } else if (envDev.includes('localhost:3000')) {
    console.log('   ❌ 开发环境仍指向 Node.js 后端 (端口 3000)');
    checks.push({ name: '.env.development', status: 'fail', issue: '指向端口 3000' });
  } else {
    console.log('   ⚠️  开发环境配置异常');
    checks.push({ name: '.env.development', status: 'warn', issue: '配置异常' });
  }
} catch (error) {
  console.log('   ❌ 无法读取 .env.development');
  checks.push({ name: '.env.development', status: 'error', issue: '文件不存在' });
}

// 2. 检查 .env.production
console.log('\n2. 检查生产环境配置 (.env.production)...');
try {
  const envProd = fs.readFileSync(path.join(__dirname, '.env.production'), 'utf8');
  if (envProd.includes('/api/v1')) {
    console.log('   ✅ 生产环境配置正确: /api/v1');
    checks.push({ name: '.env.production', status: 'pass' });
  } else if (envProd.includes('/api') && !envProd.includes('/api/v1')) {
    console.log('   ❌ 生产环境仍使用旧路径 /api');
    checks.push({ name: '.env.production', status: 'fail', issue: '使用 /api 而非 /api/v1' });
  } else {
    console.log('   ⚠️  生产环境配置异常');
    checks.push({ name: '.env.production', status: 'warn', issue: '配置异常' });
  }
} catch (error) {
  console.log('   ❌ 无法读取 .env.production');
  checks.push({ name: '.env.production', status: 'error', issue: '文件不存在' });
}

// 3. 检查 http.ts 默认配置
console.log('\n3. 检查 HTTP 客户端默认配置 (src/services/http.ts)...');
try {
  const httpTs = fs.readFileSync(path.join(__dirname, 'src/services/http.ts'), 'utf8');
  if (httpTs.includes('localhost:8000') && httpTs.includes('/api/v1')) {
    console.log('   ✅ HTTP 客户端默认配置正确: http://localhost:8000/api/v1');
    checks.push({ name: 'http.ts baseURL', status: 'pass' });
  } else if (httpTs.includes('localhost:3000')) {
    console.log('   ❌ HTTP 客户端仍指向 Node.js 后端 (端口 3000)');
    checks.push({ name: 'http.ts baseURL', status: 'fail', issue: '指向端口 3000' });
  } else {
    console.log('   ⚠️  HTTP 客户端配置异常');
    checks.push({ name: 'http.ts baseURL', status: 'warn', issue: '配置异常' });
  }
} catch (error) {
  console.log('   ❌ 无法读取 src/services/http.ts');
  checks.push({ name: 'http.ts baseURL', status: 'error', issue: '文件不存在' });
}

// 4. 检查 app store 默认配置
console.log('\n4. 检查应用 Store 默认配置 (src/stores/app.ts)...');
try {
  const appTs = fs.readFileSync(path.join(__dirname, 'src/stores/app.ts'), 'utf8');
  if (appTs.includes('/api/v1')) {
    console.log('   ✅ App Store 默认配置正确: /api/v1');
    checks.push({ name: 'app.ts apiBaseUrl', status: 'pass' });
  } else if (appTs.includes("|| '/api'")) {
    console.log('   ❌ App Store 仍使用旧路径 /api');
    checks.push({ name: 'app.ts apiBaseUrl', status: 'fail', issue: '使用 /api 而非 /api/v1' });
  } else {
    console.log('   ⚠️  App Store 配置异常');
    checks.push({ name: 'app.ts apiBaseUrl', status: 'warn', issue: '配置异常' });
  }
} catch (error) {
  console.log('   ❌ 无法读取 src/stores/app.ts');
  checks.push({ name: 'app.ts apiBaseUrl', status: 'error', issue: '文件不存在' });
}

// 5. 检查 Login.vue 错误提示
console.log('\n5. 检查登录页面错误提示 (src/views/Login.vue)...');
try {
  const loginVue = fs.readFileSync(path.join(__dirname, 'src/views/Login.vue'), 'utf8');
  if (loginVue.includes('localhost:8000')) {
    console.log('   ✅ 登录页面错误提示正确: http://localhost:8000');
    checks.push({ name: 'Login.vue 错误提示', status: 'pass' });
  } else if (loginVue.includes('localhost:3000')) {
    console.log('   ❌ 登录页面错误提示仍指向端口 3000');
    checks.push({ name: 'Login.vue 错误提示', status: 'fail', issue: '提示端口 3000' });
  } else {
    console.log('   ⚠️  登录页面错误提示未找到');
    checks.push({ name: 'Login.vue 错误提示', status: 'warn', issue: '未找到端口提示' });
  }
} catch (error) {
  console.log('   ❌ 无法读取 src/views/Login.vue');
  checks.push({ name: 'Login.vue 错误提示', status: 'error', issue: '文件不存在' });
}

// 6. 检查测试文件
console.log('\n6. 检查测试文件配置 (test-audit-pages.cjs)...');
try {
  const testFile = fs.readFileSync(path.join(__dirname, 'test-audit-pages.cjs'), 'utf8');
  if (testFile.includes('localhost:8000') && testFile.includes('/api/v1')) {
    console.log('   ✅ 测试文件配置正确: http://localhost:8000/api/v1');
    checks.push({ name: 'test-audit-pages.cjs', status: 'pass' });
  } else if (testFile.includes('localhost:3000')) {
    console.log('   ❌ 测试文件仍指向 Node.js 后端 (端口 3000)');
    checks.push({ name: 'test-audit-pages.cjs', status: 'fail', issue: '指向端口 3000' });
  } else {
    console.log('   ⚠️  测试文件配置异常');
    checks.push({ name: 'test-audit-pages.cjs', status: 'warn', issue: '配置异常' });
  }
} catch (error) {
  console.log('   ⚠️  测试文件不存在（可选）');
  checks.push({ name: 'test-audit-pages.cjs', status: 'skip', issue: '文件不存在' });
}

// 总结
console.log('\n' + '='.repeat(60));
console.log('检查总结:');
console.log('='.repeat(60));

const passed = checks.filter(c => c.status === 'pass').length;
const failed = checks.filter(c => c.status === 'fail').length;
const warned = checks.filter(c => c.status === 'warn').length;
const errors = checks.filter(c => c.status === 'error').length;
const skipped = checks.filter(c => c.status === 'skip').length;

console.log(`✅ 通过: ${passed}`);
console.log(`❌ 失败: ${failed}`);
console.log(`⚠️  警告: ${warned}`);
console.log(`🚫 错误: ${errors}`);
console.log(`⏭️  跳过: ${skipped}`);
console.log(`📊 总计: ${checks.length}`);

if (failed > 0 || errors > 0) {
  console.log('\n❌ 发现问题，需要修复:');
  checks.filter(c => c.status === 'fail' || c.status === 'error').forEach(c => {
    console.log(`   - ${c.name}: ${c.issue}`);
  });
  console.log('\n建议操作:');
  console.log('   1. 检查并修复上述配置文件');
  console.log('   2. 确保所有配置指向 http://localhost:8000/api/v1');
  console.log('   3. 重启前端开发服务器');
  process.exit(1);
} else if (warned > 0) {
  console.log('\n⚠️  存在警告，建议检查:');
  checks.filter(c => c.status === 'warn').forEach(c => {
    console.log(`   - ${c.name}: ${c.issue}`);
  });
  console.log('\n✅ 核心配置正确，可以继续使用');
  process.exit(0);
} else {
  console.log('\n✅ 所有配置检查通过！');
  console.log('\n前端已完全连接到 FastAPI 后端:');
  console.log('   - 开发环境: http://localhost:8000/api/v1');
  console.log('   - 生产环境: /api/v1');
  console.log('\n可以开始测试前后端数据交互功能。');
  process.exit(0);
}
