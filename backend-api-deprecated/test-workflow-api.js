/**
 * 工作流 API 测试脚本
 * 用于快速测试工作流保存功能和权限配置
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// 测试数据
const testWorkflow = {
  name: '测试工作流模板',
  description: '这是一个测试工作流模板',
  config: {
    nodes: [
      {
        id: 'node-start',
        type: 'START',
        name: '开始节点',
        description: '工作流开始节点',
        config: {}
      },
      {
        id: 'node-task1',
        type: 'TASK',
        name: '任务节点1',
        description: '第一个任务节点',
        config: {}
      },
      {
        id: 'node-end',
        type: 'END',
        name: '结束节点',
        description: '工作流结束节点',
        config: {}
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'node-start',
        target: 'node-task1',
        condition: '',
        label: ''
      },
      {
        id: 'edge-2',
        source: 'node-task1',
        target: 'node-end',
        condition: '',
        label: ''
      }
    ]
  }
};

async function testLogin(username, password) {
  try {
    console.log(`\n=== 测试登录: ${username} ===`);
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username,
      password
    });
    
    console.log('✅ 登录成功');
    console.log('完整响应:', JSON.stringify(response.data, null, 2));
    
    // 尝试不同的响应结构
    const token = response.data.accessToken || response.data.token || response.data.data?.accessToken;
    const user = response.data.user || response.data.data?.user;
    
    console.log('Token:', token?.substring(0, 20) + '...');
    console.log('用户信息:', user?.username, user?.fullName);
    
    return token;
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testCreateWorkflow(token) {
  try {
    console.log('\n=== 测试创建工作流 ===');
    
    const response = await axios.post(`${API_BASE_URL}/workflows`, testWorkflow, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 工作流创建成功');
    console.log('工作流ID:', response.data.id);
    console.log('工作流名称:', response.data.name);
    
    return response.data;
  } catch (error) {
    console.error('❌ 工作流创建失败');
    console.error('状态码:', error.response?.status);
    console.error('错误信息:', error.response?.data?.message || error.message);
    console.error('详细错误:', error.response?.data);
    return null;
  }
}

async function testUserPermissions(token) {
  try {
    console.log('\n=== 测试用户权限 ===');
    
    // 尝试直接查询用户权限
    const response = await axios.get(`${API_BASE_URL}/permissions/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ 获取用户权限成功');
    console.log('用户权限:', response.data);
    console.log('是否有 workflow:create 权限:', response.data.includes('workflow:create') ? '✅ 是' : '❌ 否');
    
    return response.data;
  } catch (error) {
    console.error('❌ 获取用户权限失败:', error.response?.status, error.response?.data?.message || error.message);
    
    // 尝试解码JWT token来查看用户信息
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      console.log('JWT payload:', payload);
      console.log('用户角色 (从JWT):', payload.roles);
    } catch (jwtError) {
      console.error('无法解码JWT:', jwtError.message);
    }
    
    return [];
  }
}

async function runTests() {
  console.log('🚀 开始测试工作流 API...\n');
  
  // 测试管理员账号
  console.log('📋 测试管理员账号');
  const adminToken = await testLogin('admin', 'Admin@123456');
  if (adminToken) {
    await testUserPermissions(adminToken);
    await testCreateWorkflow(adminToken);
  }
  
  // 测试普通用户账号
  console.log('\n📋 测试技术员账号');
  const userToken = await testLogin('testuser', 'User@123456');
  if (userToken) {
    await testUserPermissions(userToken);
    await testCreateWorkflow(userToken);
  }
  
  console.log('\n🎉 测试完成');
}

// 运行测试
runTests().catch(console.error);