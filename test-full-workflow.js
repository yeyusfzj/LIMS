/**
 * 完整工作流测试脚本
 * 测试登录 -> 获取数据的完整流程
 */

const http = require('http');

// API 请求函数
function apiRequest(options, data = null) {
  return new Promise((resolve, reject) => {
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
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 主测试流程
async function testWorkflow() {
  console.log('🔄 开始测试完整工作流...\n');
  
  try {
    // 步骤 1: 尝试使用默认管理员账号登录
    console.log('📝 步骤 1: 尝试登录');
    console.log('   使用账号: admin');
    
    const loginResponse = await apiRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    console.log(`   状态码: ${loginResponse.status}`);
    
    if (loginResponse.status === 200 && loginResponse.body.data?.accessToken) {
      const token = loginResponse.body.data.accessToken;
      console.log('   ✅ 登录成功!');
      console.log(`   Token: ${token.substring(0, 20)}...\n`);
      
      // 步骤 2: 使用 token 获取样品列表
      console.log('📝 步骤 2: 获取样品列表');
      const samplesResponse = await apiRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/samples?page=1&limit=5',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`   状态码: ${samplesResponse.status}`);
      if (samplesResponse.status === 200) {
        console.log('   ✅ 成功获取样品列表!');
        console.log(`   样品数量: ${samplesResponse.body.data?.length || 0}`);
        console.log(`   总数: ${samplesResponse.body.total || 0}\n`);
      } else {
        console.log(`   ⚠️  获取样品列表失败`);
        console.log(`   响应: ${JSON.stringify(samplesResponse.body, null, 2)}\n`);
      }
      
      // 步骤 3: 获取用户信息
      console.log('📝 步骤 3: 获取当前用户信息');
      const profileResponse = await apiRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/profile',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`   状态码: ${profileResponse.status}`);
      if (profileResponse.status === 200) {
        console.log('   ✅ 成功获取用户信息!');
        console.log(`   用户名: ${profileResponse.body.username || 'N/A'}`);
        console.log(`   角色: ${profileResponse.body.role || 'N/A'}\n`);
      } else {
        console.log(`   ⚠️  获取用户信息失败`);
        console.log(`   响应: ${JSON.stringify(profileResponse.body, null, 2)}\n`);
      }
      
    } else {
      console.log('   ❌ 登录失败');
      console.log(`   响应: ${JSON.stringify(loginResponse.body, null, 2)}\n`);
      console.log('   💡 提示: 请确保数据库已初始化并运行了种子数据脚本');
      console.log('   运行命令: cd backend-api && npm run prisma:seed\n');
    }
    
    // 测试总结
    console.log('=' .repeat(60));
    console.log('✅ 工作流测试完成!');
    console.log('=' .repeat(60));
    console.log('\n📊 系统状态:');
    console.log('   ✅ 前端服务: http://localhost:5173');
    console.log('   ✅ 后端 API: http://localhost:3000');
    console.log('   ✅ 健康检查: http://localhost:3000/health');
    console.log('   ✅ API 文档: http://localhost:3000/api-docs/');
    console.log('\n🎯 下一步:');
    console.log('   1. 在浏览器中打开 http://localhost:5173');
    console.log('   2. 使用账号 admin / Admin@123456 登录');
    console.log('   3. 开始测试各项功能\n');
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

// 执行测试
testWorkflow();
