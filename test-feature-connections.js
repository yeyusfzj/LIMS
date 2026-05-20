/**
 * 功能连接测试脚本
 * 测试前端各个功能模块与后端API的连接状态
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:3000/api';

// 测试结果存储
const testResults = {};

console.log('🔍 开始功能连接测试...\n');

// 定义需要测试的API端点
const apiEndpoints = [
  // 认证相关
  { name: '用户登录', method: 'POST', url: '/auth/login', category: '认证管理' },
  { name: '用户注册', method: 'POST', url: '/auth/register', category: '认证管理' },
  { name: '获取用户信息', method: 'GET', url: '/auth/me', category: '认证管理' },
  
  // 用户管理
  { name: '用户列表', method: 'GET', url: '/users', category: '用户管理' },
  { name: '创建用户', method: 'POST', url: '/users', category: '用户管理' },
  
  // 角色管理
  { name: '角色列表', method: 'GET', url: '/roles', category: '角色管理' },
  { name: '创建角色', method: 'POST', url: '/roles', category: '角色管理' },
  
  // 样品管理
  { name: '样品列表', method: 'GET', url: '/samples', category: '样品管理' },
  { name: '创建样品', method: 'POST', url: '/samples', category: '样品管理' },
  { name: '样品详情', method: 'GET', url: '/samples/1', category: '样品管理' },
  
  // 工作流管理
  { name: '工作流列表', method: 'GET', url: '/workflows', category: '工作流管理' },
  { name: '创建工作流', method: 'POST', url: '/workflows', category: '工作流管理' },
  
  // 任务管理
  { name: '任务列表', method: 'GET', url: '/tasks', category: '任务管理' },
  { name: '创建任务', method: 'POST', url: '/tasks', category: '任务管理' },
  
  // 检测结果
  { name: '结果列表', method: 'GET', url: '/results', category: '检测结果' },
  { name: '创建结果', method: 'POST', url: '/results', category: '检测结果' },
  
  // 审核管理
  { name: '审核列表', method: 'GET', url: '/audits', category: '审核管理' },
  { name: '创建审核', method: 'POST', url: '/audits', category: '审核管理' },
  
  // 报告管理
  { name: '报告模板列表', method: 'GET', url: '/report-templates', category: '报告管理' },
  { name: '报告列表', method: 'GET', url: '/reports', category: '报告管理' },
  
  // 统计分析
  { name: '统计数据', method: 'GET', url: '/statistics/dashboard', category: '统计分析' },
  
  // 审计日志
  { name: '审计日志', method: 'GET', url: '/audit-logs', category: '审计日志' },
  
  // 系统管理
  { name: '数据备份', method: 'GET', url: '/backups', category: '系统管理' },
  { name: '性能监控', method: 'GET', url: '/performance/metrics', category: '系统管理' }
];

// 测试单个API端点
async function testEndpoint(endpoint) {
  try {
    const config = {
      method: endpoint.method,
      url: `${BACKEND_URL}${endpoint.url}`,
      timeout: 5000,
      validateStatus: function (status) {
        // 接受200-499的状态码，我们主要测试连通性
        return status >= 200 && status < 500;
      }
    };

    // 为POST请求添加基本数据
    if (endpoint.method === 'POST') {
      config.data = { test: true };
      config.headers = { 'Content-Type': 'application/json' };
    }

    const response = await axios(config);
    
    let status = 'success';
    let message = '连接正常';
    
    if (response.status === 401) {
      message = '需要认证（正常）';
    } else if (response.status === 403) {
      message = '需要权限（正常）';
    } else if (response.status === 404) {
      status = 'warning';
      message = '接口不存在';
    } else if (response.status >= 400) {
      status = 'warning';
      message = `HTTP ${response.status}`;
    }
    
    return { status, message, httpStatus: response.status };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return { status: 'error', message: '连接被拒绝', httpStatus: null };
    } else if (error.code === 'ETIMEDOUT') {
      return { status: 'error', message: '连接超时', httpStatus: null };
    } else {
      return { status: 'error', message: error.message, httpStatus: null };
    }
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('📡 测试API端点连接状态...\n');
  
  for (const endpoint of apiEndpoints) {
    process.stdout.write(`测试 ${endpoint.name}... `);
    const result = await testEndpoint(endpoint);
    
    if (!testResults[endpoint.category]) {
      testResults[endpoint.category] = [];
    }
    
    testResults[endpoint.category].push({
      name: endpoint.name,
      url: endpoint.url,
      method: endpoint.method,
      ...result
    });
    
    const statusIcon = result.status === 'success' ? '✅' : 
                      result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${statusIcon} ${result.message}`);
  }
}

// 分析前端路由和API使用情况
async function analyzeFrontendApiUsage() {
  console.log('\n🔍 分析前端API使用情况...\n');
  
  const frontendFiles = [
    'vue-project/src/services/auditService.ts',
    'vue-project/src/stores/auth.ts',
    'vue-project/src/stores/sample.ts'
  ];
  
  const apiUsageAnalysis = {};
  
  for (const filePath of frontendFiles) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 查找API调用
        const apiCalls = [];
        const httpCallRegex = /http\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
        let match;
        
        while ((match = httpCallRegex.exec(content)) !== null) {
          apiCalls.push({
            method: match[1].toUpperCase(),
            url: match[2]
          });
        }
        
        if (apiCalls.length > 0) {
          apiUsageAnalysis[filePath] = apiCalls;
        }
      }
    } catch (error) {
      console.log(`⚠️  无法读取文件 ${filePath}: ${error.message}`);
    }
  }
  
  // 显示分析结果
  if (Object.keys(apiUsageAnalysis).length > 0) {
    console.log('📋 前端API调用分析:');
    for (const [file, calls] of Object.entries(apiUsageAnalysis)) {
      console.log(`\n📄 ${file}:`);
      calls.forEach(call => {
        console.log(`   ${call.method} ${call.url}`);
      });
    }
  } else {
    console.log('⚠️  未在指定文件中找到API调用');
  }
  
  return apiUsageAnalysis;
}

// 生成详细报告
function generateDetailedReport() {
  console.log('\n📊 详细测试报告');
  console.log('='.repeat(60));
  
  let totalTests = 0;
  let successCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  
  for (const [category, tests] of Object.entries(testResults)) {
    console.log(`\n📂 ${category}:`);
    
    tests.forEach(test => {
      totalTests++;
      const statusIcon = test.status === 'success' ? '✅' : 
                        test.status === 'warning' ? '⚠️' : '❌';
      
      console.log(`   ${statusIcon} ${test.name} (${test.method} ${test.url}) - ${test.message}`);
      
      if (test.status === 'success') successCount++;
      else if (test.status === 'warning') warningCount++;
      else errorCount++;
    });
  }
  
  console.log('\n📈 统计信息:');
  console.log(`   总测试数: ${totalTests}`);
  console.log(`   ✅ 成功: ${successCount}`);
  console.log(`   ⚠️  警告: ${warningCount}`);
  console.log(`   ❌ 错误: ${errorCount}`);
  
  const successRate = ((successCount / totalTests) * 100).toFixed(1);
  console.log(`   成功率: ${successRate}%`);
  
  // 建议
  console.log('\n💡 建议:');
  if (errorCount > 0) {
    console.log('   - 检查后端服务是否完全启动');
    console.log('   - 确认数据库连接是否正常');
  }
  if (warningCount > 0) {
    console.log('   - 某些接口可能尚未实现或需要特定权限');
    console.log('   - 检查路由配置是否正确');
  }
  if (successCount === totalTests) {
    console.log('   - 🎉 所有API端点连接正常！');
  }
}

// 检查未连接的功能
function checkUnconnectedFeatures() {
  console.log('\n🔍 检查可能未连接的功能...');
  
  const potentialIssues = [];
  
  // 检查是否有404错误
  for (const [category, tests] of Object.entries(testResults)) {
    const notFoundTests = tests.filter(test => test.httpStatus === 404);
    if (notFoundTests.length > 0) {
      potentialIssues.push(`${category}: ${notFoundTests.length}个接口返回404`);
    }
  }
  
  // 检查是否有连接错误
  for (const [category, tests] of Object.entries(testResults)) {
    const errorTests = tests.filter(test => test.status === 'error');
    if (errorTests.length > 0) {
      potentialIssues.push(`${category}: ${errorTests.length}个接口连接失败`);
    }
  }
  
  if (potentialIssues.length > 0) {
    console.log('⚠️  发现的问题:');
    potentialIssues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('✅ 未发现明显的连接问题');
  }
}

// 主执行函数
async function main() {
  try {
    await runAllTests();
    await analyzeFrontendApiUsage();
    generateDetailedReport();
    checkUnconnectedFeatures();
    
    console.log('\n🏁 测试完成！');
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  }
}

// 启动测试
main();