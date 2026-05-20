/**
 * 样品创建功能测试
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

async function testSampleCreate() {
  console.log('测试样品创建功能...\n');
  
  try {
    // 1. 登录
    console.log('1. 登录...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✓ 登录成功\n');
    
    // 2. 创建样品
    console.log('2. 创建样品...');
    const sampleData = {
      client_name: '测试客户',
      client_contact: '13800138000',
      sample_name: '测试样品_' + Date.now(),
      sample_type: '水质',
      sample_category: '环境监测',
      quantity: 100,
      unit: 'ml',
      received_date: '2026-04-27',
      sampling_date: '2026-04-27',
      sampling_location: '测试地点',
      sampling_person: '测试人员',
      storage_location: '冷藏室A',
      storage_condition: '{"temperature": 4, "humidity": 60}',
      priority: 'NORMAL',
      description: '这是一个测试样品',
      remarks: '测试备注'
    };
    
    console.log('发送数据:', JSON.stringify(sampleData, null, 2));
    
    const createResponse = await axios.post(`${BASE_URL}/samples`, sampleData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n✓ 样品创建成功！');
    console.log('响应数据:', JSON.stringify(createResponse.data, null, 2));
    
    const createdSample = createResponse.data.data;
    console.log('\n创建的样品信息:');
    console.log('  ID:', createdSample.id);
    console.log('  条码:', createdSample.barcode);
    console.log('  样品编号:', createdSample.sample_number);
    console.log('  样品名称:', createdSample.sample_name);
    console.log('  样品类型:', createdSample.sample_type);
    console.log('  状态:', createdSample.status);
    console.log('  版本:', createdSample.version);
    
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSampleCreate();
