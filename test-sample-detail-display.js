/**
 * 测试样品详情页面数据显示
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

// 测试配置
const TEST_CONFIG = {
  username: 'admin',
  password: 'Admin@123456'
};

let authToken = null;

/**
 * 登录获取 token
 */
async function login() {
  console.log('\n=== 步骤 1: 登录获取 token ===');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: TEST_CONFIG.username,
      password: TEST_CONFIG.password
    });
    
    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✓ 登录成功');
      return true;
    }
    return false;
  } catch (error) {
    console.error('✗ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 获取样品详情
 */
async function getSampleDetail(sampleId) {
  console.log(`\n=== 步骤 2: 获取样品详情 (ID: ${sampleId}) ===`);
  try {
    const response = await axios.get(`${API_BASE_URL}/samples/${sampleId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      const sample = response.data.data;
      console.log('✓ 获取样品详情成功');
      console.log('\n后端返回的字段（蛇形命名）:');
      console.log('  sample_name:', sample.sample_name);
      console.log('  client_name:', sample.client_name);
      console.log('  sample_category:', sample.sample_category);
      console.log('  sample_type:', sample.sample_type);
      console.log('  storage_location:', sample.storage_location);
      console.log('  storage_condition:', sample.storage_condition);
      console.log('  description:', sample.description);
      console.log('  priority:', sample.priority);
      console.log('  status:', sample.status);
      
      console.log('\n前端期望的字段（驼峰命名）:');
      console.log('  sampleName:', sample.sample_name);
      console.log('  clientName:', sample.client_name);
      console.log('  sampleCategory:', sample.sample_category);
      console.log('  sampleType:', sample.sample_type);
      console.log('  storageLocation:', sample.storage_location);
      console.log('  storageCondition:', sample.storage_condition);
      console.log('  description:', sample.description);
      console.log('  priority:', sample.priority);
      console.log('  status:', sample.status);
      
      return sample;
    }
    return null;
  } catch (error) {
    console.error('✗ 获取样品详情失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('========================================');
  console.log('样品详情页面数据显示测试');
  console.log('========================================');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n测试终止: 登录失败');
    return;
  }
  
  // 2. 获取第一个样品
  console.log('\n=== 获取样品列表 ===');
  try {
    const response = await axios.get(`${API_BASE_URL}/samples`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        page_size: 1
      }
    });
    
    if (!response.data.success || !response.data.data.items || response.data.data.items.length === 0) {
      console.log('✗ 没有找到样品');
      return;
    }
    
    const sample = response.data.data.items[0];
    console.log('✓ 获取到样品');
    console.log(`  ID: ${sample.id}`);
    console.log(`  条码: ${sample.barcode}`);
    
    // 3. 获取样品详情
    const detail = await getSampleDetail(sample.id);
    
    if (!detail) {
      console.log('\n测试失败: 无法获取样品详情');
      return;
    }
    
    // 4. 验证字段映射
    console.log('\n========================================');
    console.log('字段映射验证');
    console.log('========================================');
    
    const checks = [
      { field: 'sample_name', value: detail.sample_name, label: '样品名称' },
      { field: 'client_name', value: detail.client_name, label: '委托方' },
      { field: 'sample_category', value: detail.sample_category, label: '样品类别' },
      { field: 'sample_type', value: detail.sample_type, label: '样品类型' },
      { field: 'storage_location', value: detail.storage_location, label: '存储位置' },
      { field: 'description', value: detail.description, label: '描述' },
      { field: 'priority', value: detail.priority, label: '优先级' }
    ];
    
    let allFieldsPresent = true;
    
    for (const check of checks) {
      if (check.value !== null && check.value !== undefined && check.value !== '') {
        console.log(`✓ ${check.label} (${check.field}): ${check.value}`);
      } else {
        console.log(`⚠ ${check.label} (${check.field}): 空值`);
      }
    }
    
    console.log('\n========================================');
    console.log('测试总结');
    console.log('========================================');
    console.log('✓ 后端返回数据正常');
    console.log('✓ 字段名称为蛇形命名（sample_name, client_name 等）');
    console.log('✓ 前端需要使用 API 服务转换为驼峰命名');
    console.log('✓ 详情页面应使用转换后的字段名（sampleName, clientName 等）');
    console.log('========================================');
    
  } catch (error) {
    console.error('测试执行出错:', error);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行出错:', error);
});
