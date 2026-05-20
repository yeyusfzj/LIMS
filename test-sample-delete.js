/**
 * 测试样品删除功能
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// 测试用户凭证
const testUser = {
  username: 'admin',
  password: 'Admin123!'
};

let authToken = '';
let testSampleId = '';

// 登录获取token
async function login() {
  try {
    console.log('1. 登录系统...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, testUser);
    authToken = response.data.data.accessToken;
    console.log('✓ 登录成功');
    console.log(`Token: ${authToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error('✗ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

// 创建测试样品
async function createTestSample() {
  try {
    console.log('\n2. 创建测试样品...');
    const sampleData = {
      clientName: '测试客户-删除测试',
      clientContact: '13800138000',
      sampleName: '测试样品-待删除',
      sampleType: '水质',
      sampleCategory: '地表水',
      quantity: 500,
      unit: 'mL',
      receivedDate: new Date().toISOString(),
      samplingDate: new Date().toISOString(),
      samplingLocation: '测试地点',
      storageLocation: '测试存储位置',
      priority: 'NORMAL',
      description: '这是一个用于测试删除功能的样品'
    };

    const response = await axios.post(`${API_BASE_URL}/samples`, sampleData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    testSampleId = response.data.data.id;
    console.log('✓ 样品创建成功');
    console.log(`样品ID: ${testSampleId}`);
    console.log(`样品条码: ${response.data.data.barcode}`);
    return true;
  } catch (error) {
    console.error('✗ 创建样品失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试删除样品
async function deleteSample() {
  try {
    console.log('\n3. 删除样品...');
    const response = await axios.delete(`${API_BASE_URL}/samples/${testSampleId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✓ 样品删除成功');
    console.log(`响应: ${response.data.message}`);
    return true;
  } catch (error) {
    console.error('✗ 删除样品失败:', error.response?.data || error.message);
    return false;
  }
}

// 验证样品已被删除(状态变为ARCHIVED)
async function verifySampleDeleted() {
  try {
    console.log('\n4. 验证样品状态...');
    const response = await axios.get(`${API_BASE_URL}/samples/${testSampleId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const sample = response.data.data;
    if (sample.status === 'ARCHIVED') {
      console.log('✓ 样品状态已更新为 ARCHIVED');
      return true;
    } else {
      console.log(`✗ 样品状态异常: ${sample.status}`);
      return false;
    }
  } catch (error) {
    console.error('✗ 验证失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试批量删除
async function testBatchDelete() {
  try {
    console.log('\n5. 测试批量删除...');
    
    // 创建多个测试样品
    const sampleIds = [];
    for (let i = 1; i <= 3; i++) {
      const sampleData = {
        clientName: `测试客户-批量删除${i}`,
        clientContact: '13800138000',
        sampleName: `批量删除测试样品${i}`,
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 100,
        unit: 'mL',
        receivedDate: new Date().toISOString(),
        samplingDate: new Date().toISOString(),
        samplingLocation: '测试地点',
        storageLocation: '测试存储位置',
        priority: 'NORMAL'
      };

      const response = await axios.post(`${API_BASE_URL}/samples`, sampleData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      sampleIds.push(response.data.data.id);
    }

    console.log(`✓ 创建了 ${sampleIds.length} 个测试样品`);

    // 批量删除
    const response = await axios.post(
      `${API_BASE_URL}/samples/batch-delete`,
      { ids: sampleIds },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('✓ 批量删除成功');
    console.log(`结果: ${response.data.message}`);
    console.log(`详情:`, response.data.data);
    return true;
  } catch (error) {
    console.error('✗ 批量删除失败:', error.response?.data || error.message);
    return false;
  }
}

// 主测试流程
async function runTests() {
  console.log('========================================');
  console.log('样品删除功能测试');
  console.log('========================================');

  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n测试终止: 登录失败');
    return;
  }

  const createSuccess = await createTestSample();
  if (!createSuccess) {
    console.log('\n测试终止: 创建样品失败');
    return;
  }

  const deleteSuccess = await deleteSample();
  if (!deleteSuccess) {
    console.log('\n测试终止: 删除样品失败');
    return;
  }

  await verifySampleDeleted();
  await testBatchDelete();

  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

// 运行测试
runTests().catch(console.error);
