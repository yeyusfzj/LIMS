/**
 * 测试样品API响应格式
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testSamplesApi() {
  try {
    console.log('=== 测试样品API ===\n');

    // 1. 登录
    console.log('1. 登录...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✓ 登录成功\n');

    // 2. 获取所有样品
    console.log('2. 获取所有样品...');
    const allSamplesResponse = await axios.get(`${API_BASE_URL}/samples`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { pageSize: 5 }
    });

    console.log('响应结构:');
    console.log(JSON.stringify(allSamplesResponse.data, null, 2));
    console.log('');

    // 3. 获取已完成检测的样品
    console.log('3. 获取已完成检测的样品...');
    const completedSamplesResponse = await axios.get(`${API_BASE_URL}/samples`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        status: 'TESTING_COMPLETE',
        pageSize: 5
      }
    });

    console.log('响应结构:');
    console.log(JSON.stringify(completedSamplesResponse.data, null, 2));

  } catch (error) {
    console.error('✗ 测试失败:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSamplesApi();
