/**
 * 登录调试测试
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

async function testLogin() {
  console.log('测试登录API...\n');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    console.log('登录成功！');
    console.log('响应状态:', response.status);
    console.log('响应数据结构:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('登录失败:', error.message);
    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testLogin();
