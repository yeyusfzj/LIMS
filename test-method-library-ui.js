/**
 * 检测方法库UI测试脚本
 * 测试前端页面是否正常显示数据
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const FRONTEND_URL = 'http://localhost:5173';

// 从登录响应中获取的token（需要先登录）
let authToken = '';

async function login() {
  console.log('\n=== 1. 登录测试 ===');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    console.log('登录响应结构:', JSON.stringify(response.data, null, 2));
    
    // 尝试不同的token路径
    authToken = response.data.data?.token || response.data.token || response.data.data?.accessToken;
    
    if (authToken) {
      console.log('✓ 登录成功');
      console.log('Token:', authToken.substring(0, 30) + '...');
      return true;
    } else {
      console.error('✗ 未找到token');
      return false;
    }
  } catch (error) {
    console.error('✗ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

async function testMethodListAPI() {
  console.log('\n=== 2. 测试检测方法列表API ===');
  try {
    const response = await axios.get(`${API_BASE_URL}/methods`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        pageSize: 10
      }
    });
    
    console.log('✓ API调用成功');
    console.log('完整响应数据:', JSON.stringify(response.data, null, 2));
    console.log('返回数据数量:', response.data.data?.data?.length || response.data.data?.length || 0);
    console.log('总记录数:', response.data.data?.total || response.data.total);
    
    const methods = response.data.data?.data || response.data.data || [];
    if (methods.length > 0) {
      console.log('\n检测方法示例:');
      methods.forEach((method, index) => {
        console.log(`${index + 1}. ${method.code} - ${method.name} (${method.category})`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('✗ API调用失败:', error.response?.data || error.message);
    return false;
  }
}

async function testSearchWithFilters() {
  console.log('\n=== 3. 测试搜索筛选功能 ===');
  
  // 测试关键词搜索
  try {
    console.log('\n3.1 测试关键词搜索 (keyword: "水质")');
    const response = await axios.get(`${API_BASE_URL}/methods`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        keyword: '水质',
        page: 1,
        pageSize: 10
      }
    });
    
    console.log('✓ 关键词搜索成功');
    console.log('返回数据数量:', response.data.data?.length || 0);
  } catch (error) {
    console.error('✗ 关键词搜索失败:', error.response?.data || error.message);
  }
  
  // 测试类别筛选
  try {
    console.log('\n3.2 测试类别筛选 (category: "水质检测")');
    const response = await axios.get(`${API_BASE_URL}/methods`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        category: '水质检测',
        page: 1,
        pageSize: 10
      }
    });
    
    console.log('✓ 类别筛选成功');
    console.log('返回数据数量:', response.data.data?.length || 0);
  } catch (error) {
    console.error('✗ 类别筛选失败:', error.response?.data || error.message);
  }
  
  // 测试状态筛选
  try {
    console.log('\n3.3 测试状态筛选 (status: "ACTIVE")');
    const response = await axios.get(`${API_BASE_URL}/methods`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        status: 'ACTIVE',
        page: 1,
        pageSize: 10
      }
    });
    
    console.log('✓ 状态筛选成功');
    console.log('返回数据数量:', response.data.data?.length || 0);
  } catch (error) {
    console.error('✗ 状态筛选失败:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('========================================');
  console.log('检测方法库UI测试');
  console.log('========================================');
  console.log('前端地址:', FRONTEND_URL);
  console.log('后端API:', API_BASE_URL);
  console.log('========================================');
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n测试终止：登录失败');
    return;
  }
  
  await testMethodListAPI();
  await testSearchWithFilters();
  
  console.log('\n========================================');
  console.log('测试完成！');
  console.log('========================================');
  console.log('\n请在浏览器中访问以下地址进行手动测试:');
  console.log(`1. 打开浏览器访问: ${FRONTEND_URL}`);
  console.log('2. 使用以下凭据登录:');
  console.log('   用户名: admin');
  console.log('   密码: Admin@123456');
  console.log('3. 点击左侧菜单"检测方法库"');
  console.log('4. 应该能看到检测方法列表');
  console.log('5. 测试搜索和筛选功能');
  console.log('========================================');
}

runTests().catch(console.error);
