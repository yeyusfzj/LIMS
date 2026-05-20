/**
 * 系统启动测试脚本
 * 测试前后端服务是否正常运行
 */

const http = require('http');
const https = require('https');

// 测试配置
const tests = [
  {
    name: '前端服务',
    url: 'http://localhost:5173',
    expectedStatus: 200
  },
  {
    name: '后端 API 健康检查',
    url: 'http://localhost:3000/health',
    expectedStatus: 200
  },
  {
    name: '后端 API Swagger 文档',
    url: 'http://localhost:3000/api-docs',
    expectedStatus: 200
  }
];

// 测试函数
function testEndpoint(test) {
  return new Promise((resolve) => {
    const url = new URL(test.url);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.get(test.url, (res) => {
      const success = res.statusCode === test.expectedStatus;
      resolve({
        name: test.name,
        url: test.url,
        status: res.statusCode,
        expected: test.expectedStatus,
        success: success,
        message: success ? '✅ 通过' : `❌ 失败 (期望 ${test.expectedStatus}, 实际 ${res.statusCode})`
      });
    });
    
    req.on('error', (error) => {
      resolve({
        name: test.name,
        url: test.url,
        status: 'ERROR',
        expected: test.expectedStatus,
        success: false,
        message: `❌ 连接失败: ${error.message}`
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        name: test.name,
        url: test.url,
        status: 'TIMEOUT',
        expected: test.expectedStatus,
        success: false,
        message: '❌ 超时'
      });
    });
  });
}

// 运行所有测试
async function runTests() {
  console.log('🚀 开始测试系统启动状态...\n');
  
  const results = [];
  for (const test of tests) {
    console.log(`测试: ${test.name}...`);
    const result = await testEndpoint(test);
    results.push(result);
    console.log(`  ${result.message}`);
    console.log(`  URL: ${result.url}\n`);
  }
  
  // 汇总结果
  console.log('=' .repeat(50));
  console.log('测试汇总:');
  console.log('=' .repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`总计: ${results.length} 个测试`);
  console.log(`通过: ${passed} 个`);
  console.log(`失败: ${failed} 个`);
  
  if (failed === 0) {
    console.log('\n✅ 所有测试通过! 系统运行正常。');
  } else {
    console.log('\n⚠️  部分测试失败，请检查服务状态。');
  }
}

// 执行测试
runTests().catch(console.error);
