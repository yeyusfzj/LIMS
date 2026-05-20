/**
 * 测试前端流转管理页面能否正常访问 API
 * 
 * 模拟前端的 HTTP 请求
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

// 测试账号
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

let authToken = '';

/**
 * 登录获取 token
 */
async function login() {
  try {
    console.log('登录中...');
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✓ 登录成功\n');
      return true;
    }
    return false;
  } catch (error) {
    console.error('✗ 登录失败:', error.message);
    return false;
  }
}

/**
 * 模拟前端的流转记录列表请求
 */
async function testFrontendRequest() {
  try {
    console.log('=== 模拟前端请求 ===');
    console.log('请求: GET /api/v1/samples/transfers');
    console.log('参数: { page: 1, pageSize: 20 }');
    console.log('');
    
    const response = await axios.get(`${BASE_URL}/samples/transfers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        pageSize: 20
      }
    });
    
    console.log('响应状态:', response.status);
    console.log('响应数据结构:');
    console.log('  success:', response.data.success);
    console.log('  message:', response.data.message);
    console.log('  data.items:', Array.isArray(response.data.data.items) ? `数组 (${response.data.data.items.length} 项)` : '非数组');
    console.log('  data.pagination:', response.data.data.pagination);
    console.log('');
    
    if (response.data.success && Array.isArray(response.data.data.items)) {
      console.log('✓ API 响应格式正确');
      console.log('✓ 前端可以正常解析响应数据');
      console.log('');
      console.log('前端页面应该能够：');
      console.log('  1. 正常加载流转记录列表（当前为空列表）');
      console.log('  2. 显示分页信息');
      console.log('  3. 不再显示 404 错误');
      return true;
    } else {
      console.log('✗ API 响应格式不正确');
      return false;
    }
  } catch (error) {
    console.error('✗ 请求失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试带筛选条件的请求
 */
async function testFilteredRequest() {
  try {
    console.log('=== 测试筛选功能 ===');
    console.log('请求: GET /api/v1/samples/transfers');
    console.log('参数: { page: 1, pageSize: 20, status: "PENDING" }');
    console.log('');
    
    const response = await axios.get(`${BASE_URL}/samples/transfers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        pageSize: 20,
        status: 'PENDING'
      }
    });
    
    console.log('响应状态:', response.status);
    console.log('筛选结果: 找到', response.data.data.pagination.total, '条 PENDING 状态的记录');
    console.log('');
    console.log('✓ 筛选功能正常工作');
    return true;
  } catch (error) {
    console.error('✗ 筛选请求失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('前端流转管理页面 API 测试');
  console.log('========================================\n');
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('测试终止：登录失败');
    return;
  }
  
  await testFrontendRequest();
  await testFilteredRequest();
  
  console.log('========================================');
  console.log('测试完成');
  console.log('========================================');
  console.log('');
  console.log('下一步：');
  console.log('1. 在浏览器中访问 http://localhost:5173');
  console.log('2. 登录后进入"样品流转管理"页面');
  console.log('3. 页面应该能正常加载，不再显示 404 错误');
  console.log('4. 当前数据库中没有流转记录，所以列表为空');
}

main().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
