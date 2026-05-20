/**
 * 综合功能测试脚本
 * 测试系统的主要功能模块
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
async function testComprehensive() {
  console.log('🧪 开始综合功能测试...\n');
  console.log('=' .repeat(60));
  
  let token = null;
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    // 测试 1: 登录
    console.log('\n📝 测试 1: 用户登录');
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
    
    if (loginResponse.status === 200 && loginResponse.body.data?.accessToken) {
      token = loginResponse.body.data.accessToken;
      console.log('   ✅ 通过 - 登录成功');
      console.log(`   用户: ${loginResponse.body.data.user.fullName}`);
      console.log(`   角色: ${loginResponse.body.data.user.roles.join(', ')}`);
      results.passed++;
      results.tests.push({ name: '用户登录', status: 'passed' });
    } else {
      console.log('   ❌ 失败 - 登录失败');
      results.failed++;
      results.tests.push({ name: '用户登录', status: 'failed' });
      return;
    }
    
    // 测试 2: 获取样品列表
    console.log('\n📝 测试 2: 获取样品列表');
    const samplesResponse = await apiRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/samples?page=1&limit=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (samplesResponse.status === 200) {
      console.log('   ✅ 通过 - 成功获取样品列表');
      console.log(`   样品总数: ${samplesResponse.body.total || 0}`);
      results.passed++;
      results.tests.push({ name: '获取样品列表', status: 'passed' });
    } else {
      console.log('   ❌ 失败 - 获取样品列表失败');
      results.failed++;
      results.tests.push({ name: '获取样品列表', status: 'failed' });
    }
    
    // 测试 3: 获取工作流模板列表
    console.log('\n📝 测试 3: 获取工作流模板列表');
    const workflowsResponse = await apiRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/workflows/templates',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (workflowsResponse.status === 200) {
      console.log('   ✅ 通过 - 成功获取工作流模板');
      console.log(`   模板数量: ${workflowsResponse.body.data?.length || 0}`);
      results.passed++;
      results.tests.push({ name: '获取工作流模板', status: 'passed' });
    } else {
      console.log('   ❌ 失败 - 获取工作流模板失败');
      results.failed++;
      results.tests.push({ name: '获取工作流模板', status: 'failed' });
    }
    
    // 测试 4: 获取检测方法列表
    console.log('\n📝 测试 4: 获取检测方法列表');
    const methodsResponse = await apiRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/methods?page=1&limit=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (methodsResponse.status === 200) {
      console.log('   ✅ 通过 - 成功获取检测方法');
      console.log(`   方法总数: ${methodsResponse.body.total || 0}`);
      results.passed++;
      results.tests.push({ name: '获取检测方法', status: 'passed' });
    } else {
      console.log('   ❌ 失败 - 获取检测方法失败');
      results.failed++;
      results.tests.push({ name: '获取检测方法', status: 'failed' });
    }
    
    // 测试 5: 获取审核任务列表
    console.log('\n📝 测试 5: 获取审核任务列表');
    const auditsResponse = await apiRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/audits?page=1&limit=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (auditsResponse.status === 200) {
      console.log('   ✅ 通过 - 成功获取审核任务');
      console.log(`   任务总数: ${auditsResponse.body.total || 0}`);
      results.passed++;
      results.tests.push({ name: '获取审核任务', status: 'passed' });
    } else {
      console.log('   ❌ 失败 - 获取审核任务失败');
      results.failed++;
      results.tests.push({ name: '获取审核任务', status: 'failed' });
    }
    
    // 测试 6: 获取用户列表
    console.log('\n📝 测试 6: 获取用户列表');
    const usersResponse = await apiRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/users?page=1&limit=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (usersResponse.status === 200) {
      console.log('   ✅ 通过 - 成功获取用户列表');
      console.log(`   用户总数: ${usersResponse.body.total || 0}`);
      results.passed++;
      results.tests.push({ name: '获取用户列表', status: 'passed' });
    } else {
      console.log('   ❌ 失败 - 获取用户列表失败');
      results.failed++;
      results.tests.push({ name: '获取用户列表', status: 'failed' });
    }
    
    // 测试 7: 获取角色列表
    console.log('\n📝 测试 7: 获取角色列表');
    const rolesResponse = await apiRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/roles',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (rolesResponse.status === 200) {
      console.log('   ✅ 通过 - 成功获取角色列表');
      console.log(`   角色数量: ${rolesResponse.body.data?.length || 0}`);
      results.passed++;
      results.tests.push({ name: '获取角色列表', status: 'passed' });
    } else {
      console.log('   ❌ 失败 - 获取角色列表失败');
      results.failed++;
      results.tests.push({ name: '获取角色列表', status: 'failed' });
    }
    
    // 测试总结
    console.log('\n' + '=' .repeat(60));
    console.log('📊 测试总结');
    console.log('=' .repeat(60));
    console.log(`总测试数: ${results.passed + results.failed}`);
    console.log(`✅ 通过: ${results.passed}`);
    console.log(`❌ 失败: ${results.failed}`);
    console.log(`通过率: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    console.log('\n📋 详细结果:');
    results.tests.forEach((test, index) => {
      const icon = test.status === 'passed' ? '✅' : '❌';
      console.log(`   ${index + 1}. ${icon} ${test.name}`);
    });
    
    console.log('\n🌐 访问地址:');
    console.log('   - 前端界面: http://localhost:5173');
    console.log('   - 后端 API: http://localhost:3000');
    console.log('   - API 文档: http://localhost:3000/api-docs/');
    console.log('   - 健康检查: http://localhost:3000/health');
    
    console.log('\n🔑 登录信息:');
    console.log('   - 管理员账号: admin / Admin@123456');
    console.log('   - 测试账号: testuser / User@123456');
    
    console.log('\n✨ 系统已就绪，可以开始使用！\n');
    
  } catch (error) {
    console.error('\n❌ 测试过程中出错:', error.message);
  }
}

// 执行测试
testComprehensive();
