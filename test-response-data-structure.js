/**
 * 测试响应数据结构
 * 验证 API 响应的数据结构是否正确
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000';

// 测试用户凭证
const TEST_USER = {
  username: 'admin',
  password: 'Admin123!@#'
};

let authToken = '';

// 登录获取token
async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, TEST_USER);
    authToken = response.data.data.token;
    console.log('✓ 登录成功');
    return true;
  } catch (error) {
    console.error('✗ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试获取样品详情的响应结构
async function testGetSampleResponse() {
  try {
    // 先获取样品列表
    const listResponse = await axios.get(`${API_BASE_URL}/api/samples`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, pageSize: 1 }
    });
    
    console.log('\n========================================');
    console.log('样品列表响应结构:');
    console.log('========================================');
    console.log('完整响应:', JSON.stringify(listResponse.data, null, 2));
    
    if (!listResponse.data.data || !listResponse.data.data.items || listResponse.data.data.items.length === 0) {
      console.log('没有样品数据');
      return null;
    }
    
    const sampleId = listResponse.data.data.items[0].id;
    console.log('\n使用样品ID:', sampleId);
    
    // 获取样品详情
    const detailResponse = await axios.get(`${API_BASE_URL}/api/samples/${sampleId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('\n========================================');
    console.log('样品详情响应结构:');
    console.log('========================================');
    console.log('完整响应:', JSON.stringify(detailResponse.data, null, 2));
    
    console.log('\n========================================');
    console.log('数据结构分析:');
    console.log('========================================');
    console.log('response.data:', typeof detailResponse.data);
    console.log('response.data.success:', detailResponse.data.success);
    console.log('response.data.data:', typeof detailResponse.data.data);
    console.log('response.data.data.sample_name:', detailResponse.data.data?.sample_name);
    
    return { sampleId, originalData: detailResponse.data.data };
  } catch (error) {
    console.error('✗ 测试失败:', error.response?.data || error.message);
    return null;
  }
}

// 测试更新样品的响应结构
async function testUpdateSampleResponse(sampleId, originalData) {
  try {
    const updateData = {
      sample_name: originalData.sample_name + ' (测试更新)',
      quantity: originalData.quantity + 1
    };
    
    console.log('\n========================================');
    console.log('更新样品:');
    console.log('========================================');
    console.log('样品ID:', sampleId);
    console.log('更新数据:', updateData);
    
    const updateResponse = await axios.patch(
      `${API_BASE_URL}/api/samples/${sampleId}`,
      updateData,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    console.log('\n========================================');
    console.log('更新响应结构:');
    console.log('========================================');
    console.log('完整响应:', JSON.stringify(updateResponse.data, null, 2));
    
    console.log('\n========================================');
    console.log('数据结构分析:');
    console.log('========================================');
    console.log('response.data:', typeof updateResponse.data);
    console.log('response.data.success:', updateResponse.data.success);
    console.log('response.data.data:', typeof updateResponse.data.data);
    console.log('response.data.data.sample_name:', updateResponse.data.data?.sample_name);
    console.log('response.data.data.quantity:', updateResponse.data.data?.quantity);
    
    // 验证更新是否成功
    if (updateResponse.data.data.sample_name === updateData.sample_name) {
      console.log('\n✓ 样品名称更新成功');
    } else {
      console.log('\n✗ 样品名称更新失败');
      console.log('  期望:', updateData.sample_name);
      console.log('  实际:', updateResponse.data.data.sample_name);
    }
    
    if (updateResponse.data.data.quantity === updateData.quantity) {
      console.log('✓ 数量更新成功');
    } else {
      console.log('✗ 数量更新失败');
      console.log('  期望:', updateData.quantity);
      console.log('  实际:', updateResponse.data.data.quantity);
    }
    
    return sampleId;
  } catch (error) {
    console.error('✗ 更新失败:', error.response?.data || error.message);
    return null;
  }
}

// 测试再次获取样品详情
async function testGetUpdatedSample(sampleId) {
  try {
    console.log('\n========================================');
    console.log('再次获取样品详情（验证更新）:');
    console.log('========================================');
    
    const detailResponse = await axios.get(`${API_BASE_URL}/api/samples/${sampleId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('完整响应:', JSON.stringify(detailResponse.data, null, 2));
    
    console.log('\n========================================');
    console.log('前端代码应该这样处理:');
    console.log('========================================');
    console.log('const response = await http.get(`/samples/${id}`)');
    console.log('// 响应拦截器返回: { success: true, data: {...} }');
    console.log('const data = response.data  // 直接使用 response.data');
    console.log('// 然后转换字段名: sample_name -> sampleName');
    
  } catch (error) {
    console.error('✗ 获取失败:', error.response?.data || error.message);
  }
}

// 主测试流程
async function runTest() {
  console.log('========================================');
  console.log('测试响应数据结构');
  console.log('========================================\n');

  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n测试失败：无法登录');
    return;
  }

  // 2. 测试获取样品详情的响应结构
  const result = await testGetSampleResponse();
  if (!result) {
    console.log('\n测试失败：无法获取样品');
    return;
  }

  // 3. 测试更新样品的响应结构
  const sampleId = await testUpdateSampleResponse(result.sampleId, result.originalData);
  if (!sampleId) {
    console.log('\n测试失败：无法更新样品');
    return;
  }

  // 4. 测试再次获取样品详情
  await testGetUpdatedSample(sampleId);
  
  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

// 运行测试
runTest().catch(error => {
  console.error('测试执行出错:', error);
});
