/**
 * 测试样品登记修复
 * 验证样品登记后能否在列表中显示
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// 测试用户登录凭证
const TEST_USER = {
  username: 'admin',
  password: 'Admin123!'
};

let authToken = '';

/**
 * 登录获取Token
 */
async function login() {
  try {
    console.log('1. 登录系统...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✓ 登录成功');
      return true;
    } else {
      console.error('✗ 登录失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('✗ 登录请求失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 创建测试样品
 */
async function createSample() {
  try {
    console.log('\n2. 创建测试样品...');
    
    const sampleData = {
      clientName: '测试委托方',
      clientContact: '13800138000',
      sampleName: '测试样品-' + Date.now(),
      sampleType: '水质',
      sampleCategory: '地表水',
      quantity: 500,
      unit: 'ml',
      receivedDate: new Date().toISOString(),
      samplingDate: new Date().toISOString(),
      samplingLocation: '测试采样点',
      samplingPerson: '测试人员',
      storageLocation: '实验室A-01',
      storageCondition: JSON.stringify({
        temperature: 4,
        humidity: 60,
        specialRequirements: '避光保存'
      }),
      priority: 'NORMAL',
      description: '这是一个测试样品，用于验证登记后列表显示功能'
    };
    
    const response = await axios.post(`${API_BASE_URL}/samples`, sampleData, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.message === '样品创建成功' && response.data.data) {
      const sample = response.data.data;
      console.log('✓ 样品创建成功');
      console.log('  - ID:', sample.id);
      console.log('  - 条码:', sample.barcode);
      console.log('  - 样品编号:', sample.sampleNumber);
      console.log('  - 样品名称:', sample.sampleName);
      return sample;
    } else {
      console.error('✗ 样品创建失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('✗ 创建样品请求失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 获取样品列表
 */
async function getSampleList() {
  try {
    console.log('\n3. 获取样品列表...');
    
    const response = await axios.get(`${API_BASE_URL}/samples`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        pageSize: 20
      }
    });
    
    if (response.data.message === '查询成功' && response.data.data) {
      const result = response.data.data;
      console.log('✓ 获取样品列表成功');
      console.log('  - 总数:', result.total);
      console.log('  - 当前页:', result.page);
      console.log('  - 每页数量:', result.pageSize);
      console.log('  - 样品数量:', result.items.length);
      
      if (result.items.length > 0) {
        console.log('\n  最新的5个样品:');
        result.items.slice(0, 5).forEach((sample, index) => {
          console.log(`  ${index + 1}. ${sample.barcode} - ${sample.sampleName} (${sample.status})`);
        });
      }
      
      return result;
    } else {
      console.error('✗ 获取样品列表失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('✗ 获取样品列表请求失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 验证样品是否在列表中
 */
async function verifySampleInList(sampleId) {
  try {
    console.log('\n4. 验证样品是否在列表中...');
    
    const response = await axios.get(`${API_BASE_URL}/samples`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        pageSize: 100 // 获取更多数据以确保能找到
      }
    });
    
    if (response.data.message === '查询成功' && response.data.data) {
      const result = response.data.data;
      const foundSample = result.items.find(s => s.id === sampleId);
      
      if (foundSample) {
        console.log('✓ 样品在列表中找到了！');
        console.log('  - 条码:', foundSample.barcode);
        console.log('  - 名称:', foundSample.sampleName);
        console.log('  - 状态:', foundSample.status);
        return true;
      } else {
        console.log('✗ 样品未在列表中找到');
        return false;
      }
    } else {
      console.error('✗ 验证失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('✗ 验证请求失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 主测试流程
 */
async function runTest() {
  console.log('========================================');
  console.log('样品登记修复测试');
  console.log('========================================\n');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n测试失败：无法登录');
    return;
  }
  
  // 2. 创建样品
  const createdSample = await createSample();
  if (!createdSample) {
    console.log('\n测试失败：无法创建样品');
    return;
  }
  
  // 3. 获取样品列表
  const sampleList = await getSampleList();
  if (!sampleList) {
    console.log('\n测试失败：无法获取样品列表');
    return;
  }
  
  // 4. 验证样品是否在列表中
  const verified = await verifySampleInList(createdSample.id);
  
  console.log('\n========================================');
  if (verified) {
    console.log('✓ 测试通过：样品登记后成功显示在列表中');
  } else {
    console.log('✗ 测试失败：样品登记后未在列表中显示');
  }
  console.log('========================================\n');
}

// 运行测试
runTest().catch(error => {
  console.error('测试执行出错:', error);
});
