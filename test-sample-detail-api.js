/**
 * 测试样品详情 API
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
    console.log('\n========== 1. 测试登录 ==========');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_CREDENTIALS);
    
    if (response.data.success && response.data.data.accessToken) {
      accessToken = response.data.data.accessToken;
      console.log('✅ 登录成功');
      return true;
    } else {
      console.log('❌ 登录失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 获取样品列表（获取第一个样品ID）
 */
async function getSampleList() {
  try {
    console.log('\n========== 2. 获取样品列表 ==========');
    const response = await axios.get(`${API_BASE_URL}/samples`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page: 1, pageSize: 1 }
    });
    
    if (response.data.success && response.data.data.items.length > 0) {
      const firstSample = response.data.data.items[0];
      console.log('✅ 获取样品列表成功');
      console.log('第一个样品ID:', firstSample.id);
      console.log('样品条码:', firstSample.barcode);
      console.log('样品名称:', firstSample.sample_name);
      return firstSample.id;
    } else {
      console.log('❌ 没有找到样品');
      return null;
    }
  } catch (error) {
    console.error('❌ 获取样品列表错误:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试获取样品详情
 */
async function getSampleDetail(sampleId) {
  try {
    console.log('\n========== 3. 测试获取样品详情 ==========');
    console.log('样品ID:', sampleId);
    
    const response = await axios.get(`${API_BASE_URL}/samples/${sampleId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    console.log('\n响应状态:', response.status);
    console.log('响应数据结构:', {
      success: response.data.success,
      hasData: !!response.data.data,
      message: response.data.message
    });
    
    if (response.data.success && response.data.data) {
      console.log('\n✅ 获取样品详情成功');
      console.log('\n样品详情:');
      console.log('  ID:', response.data.data.id);
      console.log('  条码:', response.data.data.barcode);
      console.log('  样品编号:', response.data.data.sample_number);
      console.log('  客户名称:', response.data.data.client_name);
      console.log('  样品名称:', response.data.data.sample_name);
      console.log('  样品类型:', response.data.data.sample_type);
      console.log('  样品类别:', response.data.data.sample_category);
      console.log('  数量:', response.data.data.quantity, response.data.data.unit);
      console.log('  状态:', response.data.data.status);
      console.log('  接收日期:', response.data.data.received_date);
      console.log('  存储位置:', response.data.data.storage_location);
      console.log('  存储条件:', response.data.data.storage_condition);
      
      return response.data.data;
    } else {
      console.log('❌ 获取样品详情失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('\n❌ 获取样品详情错误:');
    console.error('状态码:', error.response?.status);
    console.error('错误信息:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('========================================');
  console.log('样品详情 API 测试');
  console.log('========================================');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ 登录失败，无法继续测试');
    return;
  }
  
  // 2. 获取样品列表（获取第一个样品ID）
  const sampleId = await getSampleList();
  if (!sampleId) {
    console.log('\n❌ 无法获取样品ID，无法继续测试');
    return;
  }
  
  // 3. 测试获取样品详情
  await getSampleDetail(sampleId);
  
  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行错误:', error);
  process.exit(1);
});
