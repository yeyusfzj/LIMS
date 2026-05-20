/**
 * 模拟前端调用检测方法API
 * 测试响应数据结构
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// 模拟前端 http 服务的响应拦截器
function processResponse(response) {
  const responseData = response.data;
  
  console.log('\n原始响应数据结构:');
  console.log(JSON.stringify(responseData, null, 2));
  
  // 模拟前端 http.ts 的响应拦截器逻辑
  if (responseData && responseData.success && responseData.data) {
    console.log('\n✓ 响应拦截器: 检测到 success=true 和 data 字段，返回 responseData.data');
    return responseData.data;
  }
  
  if (responseData && (responseData.success === true || response.status === 200)) {
    console.log('\n✓ 响应拦截器: 检测到 success=true 或 status=200，返回 responseData.data 或 responseData');
    return responseData.data || responseData;
  }
  
  return responseData;
}

async function test() {
  console.log('========================================');
  console.log('模拟前端调用检测方法API');
  console.log('========================================');
  
  // 1. 登录
  console.log('\n1. 登录...');
  const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
    username: 'admin',
    password: 'Admin@123456'
  });
  
  authToken = loginResponse.data.data.accessToken;
  console.log('✓ 登录成功');
  
  // 2. 获取检测方法列表
  console.log('\n2. 获取检测方法列表...');
  const response = await axios.get(`${API_BASE_URL}/methods`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    params: {
      page: 1,
      pageSize: 10
    }
  });
  
  // 3. 处理响应（模拟前端拦截器）
  const processedData = processResponse(response);
  
  console.log('\n处理后的数据结构:');
  console.log('typeof processedData:', typeof processedData);
  console.log('processedData.data:', processedData.data ? '存在' : '不存在');
  console.log('processedData.total:', processedData.total);
  console.log('processedData.page:', processedData.page);
  console.log('processedData.pageSize:', processedData.pageSize);
  
  if (processedData.data) {
    console.log('\n✓ 数据数组长度:', processedData.data.length);
    if (processedData.data.length > 0) {
      console.log('\n检测方法示例:');
      processedData.data.slice(0, 2).forEach((method, index) => {
        console.log(`${index + 1}. ${method.code} - ${method.name}`);
      });
    }
  }
  
  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

test().catch(console.error);
