/**
 * 样品流转功能测试
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function test() {
  console.log('='.repeat(60));
  console.log('样品流转功能测试');
  console.log('='.repeat(60));
  
  try {
    // 1. 登录
    console.log('\n1. 登录...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ 登录成功');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. 获取流转记录列表
    console.log('\n2. 获取流转记录列表...');
    const listResponse = await axios.get(`${API_BASE_URL}/samples/transfers`, {
      params: { page: 1, pageSize: 10 },
      headers
    });
    
    console.log('✅ 获取成功');
    console.log('流转记录数量:', listResponse.data.data.items.length);
    console.log('总记录数:', listResponse.data.data.pagination.total);
    
    if (listResponse.data.data.items.length > 0) {
      const firstTransfer = listResponse.data.data.items[0];
      console.log('\n第一条流转记录:');
      console.log('  ID:', firstTransfer.id);
      console.log('  样品ID:', firstTransfer.sample_id);
      console.log('  样品信息:', firstTransfer.sample);
      console.log('  起始位置:', firstTransfer.from_location);
      console.log('  目标位置:', firstTransfer.to_location);
      console.log('  状态:', firstTransfer.status);
    }
    
    console.log('\n✅ 测试通过：样品流转记录列表加载正常！');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

test();
