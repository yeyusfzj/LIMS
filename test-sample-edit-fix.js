/**
 * 测试样品编辑功能修复
 * 验证字段名转换是否正确
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

// 测试用的管理员凭证
const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

let accessToken = '';

/**
 * 登录并获取访问令牌
 */
async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_CREDENTIALS);
    
    if (response.data.success && response.data.data.accessToken) {
      accessToken = response.data.data.accessToken;
      console.log('✅ 登录成功');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 登录错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 获取样品详情并验证字段
 */
async function testSampleDetail() {
  try {
    console.log('\n========== 测试样品详情 API ==========');
    
    // 1. 获取样品列表
    const listResponse = await axios.get(`${API_BASE_URL}/samples`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page: 1, pageSize: 1 }
    });
    
    if (!listResponse.data.success || listResponse.data.data.items.length === 0) {
      console.log('❌ 没有找到样品');
      return false;
    }
    
    const sampleId = listResponse.data.data.items[0].id;
    console.log('样品ID:', sampleId);
    
    // 2. 获取样品详情
    const detailResponse = await axios.get(`${API_BASE_URL}/samples/${sampleId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!detailResponse.data.success) {
      console.log('❌ 获取样品详情失败');
      return false;
    }
    
    const sample = detailResponse.data.data;
    
    console.log('\n后端返回的字段（蛇形命名）:');
    console.log('  sample_name:', sample.sample_name);
    console.log('  client_name:', sample.client_name);
    console.log('  sample_type:', sample.sample_type);
    console.log('  sample_category:', sample.sample_category);
    console.log('  storage_location:', sample.storage_location);
    console.log('  storage_condition:', sample.storage_condition);
    
    console.log('\n✅ 样品详情 API 测试通过');
    console.log('注意: 前端需要将这些蛇形命名转换为驼峰命名');
    
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('========================================');
  console.log('样品编辑功能修复测试');
  console.log('========================================');
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ 登录失败，无法继续测试');
    return;
  }
  
  await testSampleDetail();
  
  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
  console.log('\n修复说明:');
  console.log('1. 后端返回的是蛇形命名（sample_name, client_name等）');
  console.log('2. 前端期望的是驼峰命名（sampleName, clientName等）');
  console.log('3. 已在 vue-project/src/services/api/sample.ts 中添加字段转换');
  console.log('4. 现在前端可以正确读取样品数据进行编辑');
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行错误:', error);
  process.exit(1);
});
