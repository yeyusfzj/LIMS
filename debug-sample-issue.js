/**
 * 调试样品登记问题
 * 检查API调用和数据流
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
    console.log('步骤1: 登录系统...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✓ 登录成功');
      console.log('  Token:', authToken.substring(0, 20) + '...');
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
 * 创建样品（模拟前端调用）
 */
async function createSampleLikeFrontend() {
  try {
    console.log('\n步骤2: 创建样品（模拟前端）...');
    
    const formData = {
      name: '测试样品-前端模拟',
      source: '测试来源',
      client: '测试委托方',
      receivedDate: new Date().toISOString().split('T')[0],
      sampleType: '水质',
      quantity: 500,
      unit: 'ml',
      currentLocation: '实验室A-01',
      description: '这是前端模拟的样品数据',
      temperature: 4,
      humidity: 60,
      specialRequirements: '避光保存'
    };
    
    // 转换为后端API格式
    const apiData = {
      clientName: formData.client,
      clientContact: '',
      sampleName: formData.name,
      sampleType: formData.sampleType,
      sampleCategory: formData.source,
      quantity: formData.quantity,
      unit: formData.unit,
      receivedDate: new Date(formData.receivedDate).toISOString(),
      samplingDate: new Date(formData.receivedDate).toISOString(),
      samplingLocation: formData.source,
      storageLocation: formData.currentLocation,
      storageCondition: JSON.stringify({
        temperature: formData.temperature,
        humidity: formData.humidity,
        specialRequirements: formData.specialRequirements
      }),
      priority: 'NORMAL',
      description: formData.description
    };
    
    console.log('  发送数据:', JSON.stringify(apiData, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/samples`, apiData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('  响应状态:', response.status);
    console.log('  响应数据:', JSON.stringify(response.data, null, 2));
    
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
    console.error('✗ 创建样品请求失败:');
    console.error('  状态码:', error.response?.status);
    console.error('  错误信息:', error.response?.data || error.message);
    console.error('  完整错误:', error);
    return null;
  }
}

/**
 * 获取样品列表（检查是否能看到）
 */
async function checkSampleList(sampleId) {
  try {
    console.log('\n步骤3: 检查样品列表...');
    
    const response = await axios.get(`${API_BASE_URL}/samples`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        pageSize: 20
      }
    });
    
    console.log('  响应状态:', response.status);
    
    if (response.data.message === '查询成功' && response.data.data) {
      const result = response.data.data;
      console.log('✓ 获取样品列表成功');
      console.log('  - 总数:', result.total);
      console.log('  - 当前页样品数:', result.items.length);
      
      // 检查新创建的样品是否在列表中
      const foundSample = result.items.find(s => s.id === sampleId);
      
      if (foundSample) {
        console.log('\n✓✓✓ 新创建的样品在列表中找到了！');
        console.log('  - 条码:', foundSample.barcode);
        console.log('  - 名称:', foundSample.sampleName);
        console.log('  - 状态:', foundSample.status);
        return true;
      } else {
        console.log('\n✗✗✗ 新创建的样品未在列表中找到！');
        console.log('  列表中的样品ID:');
        result.items.forEach((s, i) => {
          console.log(`    ${i + 1}. ${s.id} - ${s.sampleName}`);
        });
        return false;
      }
    } else {
      console.error('✗ 获取样品列表失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('✗ 获取样品列表请求失败:');
    console.error('  状态码:', error.response?.status);
    console.error('  错误信息:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 检查后端服务状态
 */
async function checkBackendStatus() {
  try {
    console.log('\n步骤0: 检查后端服务状态...');
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    console.log('✓ 后端服务正常运行');
    console.log('  健康状态:', response.data);
    return true;
  } catch (error) {
    console.error('✗ 后端服务无法访问');
    console.error('  请确保后端服务在 http://localhost:3000 运行');
    console.error('  错误:', error.message);
    return false;
  }
}

/**
 * 主调试流程
 */
async function runDebug() {
  console.log('========================================');
  console.log('样品登记问题调试');
  console.log('========================================\n');
  
  // 0. 检查后端服务
  const backendOk = await checkBackendStatus();
  if (!backendOk) {
    console.log('\n调试终止：后端服务未运行');
    return;
  }
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n调试终止：无法登录');
    return;
  }
  
  // 2. 创建样品
  const createdSample = await createSampleLikeFrontend();
  if (!createdSample) {
    console.log('\n调试终止：无法创建样品');
    return;
  }
  
  // 3. 检查列表
  const foundInList = await checkSampleList(createdSample.id);
  
  console.log('\n========================================');
  console.log('调试结果:');
  console.log('========================================');
  console.log('1. 后端服务:', backendOk ? '✓ 正常' : '✗ 异常');
  console.log('2. 用户登录:', loginSuccess ? '✓ 成功' : '✗ 失败');
  console.log('3. 样品创建:', createdSample ? '✓ 成功' : '✗ 失败');
  console.log('4. 列表显示:', foundInList ? '✓ 正常' : '✗ 异常');
  console.log('========================================\n');
  
  if (foundInList) {
    console.log('✓✓✓ 所有测试通过！样品可以正常创建和显示。');
    console.log('\n如果前端依然看不到，请检查：');
    console.log('1. 前端是否正确调用了 sampleStore.createSample()');
    console.log('2. 前端是否正确调用了 sampleStore.fetchSamples()');
    console.log('3. 浏览器控制台是否有错误信息');
    console.log('4. 前端的 API_BASE_URL 配置是否正确');
  } else {
    console.log('✗✗✗ 问题：样品创建成功但未在列表中显示');
    console.log('\n可能的原因：');
    console.log('1. 分页问题：样品可能在其他页');
    console.log('2. 排序问题：样品可能不在最前面');
    console.log('3. 筛选问题：可能被筛选条件过滤了');
  }
}

// 运行调试
runDebug().catch(error => {
  console.error('\n调试执行出错:', error);
});
