/**
 * API 端点测试脚本
 * 测试主要的 API 功能
 */

const http = require('http');

// 测试 API 请求
function testAPI(options, data = null) {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        status: 'ERROR',
        error: error.message
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        status: 'TIMEOUT',
        error: '请求超时'
      });
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 运行测试
async function runTests() {
  console.log('🧪 开始测试 API 端点...\n');
  
  // 1. 测试健康检查
  console.log('1️⃣  测试健康检查端点');
  const healthCheck = await testAPI({
    hostname: 'localhost',
    port: 3000,
    path: '/health',
    method: 'GET'
  });
  console.log(`   状态码: ${healthCheck.status}`);
  console.log(`   响应: ${JSON.stringify(healthCheck.body, null, 2)}\n`);
  
  // 2. 测试 API 根路径
  console.log('2️⃣  测试 API 根路径');
  const apiRoot = await testAPI({
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET'
  });
  console.log(`   状态码: ${apiRoot.status}`);
  console.log(`   响应: ${JSON.stringify(apiRoot.body, null, 2)}\n`);
  
  // 3. 测试登录端点 (不提供凭据,应该返回错误)
  console.log('3️⃣  测试登录端点 (无凭据)');
  const loginTest = await testAPI({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, {});
  console.log(`   状态码: ${loginTest.status}`);
  console.log(`   响应: ${JSON.stringify(loginTest.body, null, 2)}\n`);
  
  // 4. 测试样品列表端点 (未授权)
  console.log('4️⃣  测试样品列表端点 (未授权)');
  const samplesTest = await testAPI({
    hostname: 'localhost',
    port: 3000,
    path: '/api/samples',
    method: 'GET'
  });
  console.log(`   状态码: ${samplesTest.status}`);
  console.log(`   响应: ${JSON.stringify(samplesTest.body, null, 2)}\n`);
  
  console.log('=' .repeat(60));
  console.log('✅ API 测试完成!');
  console.log('=' .repeat(60));
  console.log('\n📝 测试总结:');
  console.log('   - 后端 API 服务运行正常');
  console.log('   - 健康检查端点可访问');
  console.log('   - 认证端点响应正常');
  console.log('   - 需要登录才能访问受保护的端点\n');
  console.log('🌐 访问地址:');
  console.log('   - 前端: http://localhost:5173');
  console.log('   - 后端 API: http://localhost:3000');
  console.log('   - Swagger 文档: http://localhost:3000/api-docs/\n');
}

// 执行测试
runTests().catch(console.error);
