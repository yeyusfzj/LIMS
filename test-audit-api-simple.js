/**
 * 简单的审核API测试
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testAuditApi() {
  try {
    // 1. 登录
    console.log('1. 登录...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    console.log('登录响应:', JSON.stringify(loginResponse.data, null, 2));
    
    const token = loginResponse.data.data?.accessToken || loginResponse.data.accessToken;
    if (!token) {
      console.error('未获取到token');
      return;
    }
    
    console.log('Token:', token.substring(0, 30) + '...\n');
    
    // 2. 获取审核任务列表
    console.log('2. 获取审核任务列表...');
    const listResponse = await axios.get(`${BASE_URL}/audits`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { status: 'PENDING', page: 1, pageSize: 1 }
    });
    
    console.log('列表响应结构:', Object.keys(listResponse.data));
    console.log('列表响应:', JSON.stringify(listResponse.data, null, 2));
    
    const tasks = listResponse.data.data?.items || [];
    if (tasks.length === 0) {
      console.log('没有待审核任务');
      return;
    }
    
    const taskId = tasks[0].id;
    console.log('\n任务ID:', taskId);
    
    // 3. 获取单个任务详情
    console.log('\n3. 获取任务详情...');
    const detailResponse = await axios.get(`${BASE_URL}/audits/${taskId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('详情响应结构:', Object.keys(detailResponse.data));
    console.log('详情响应:', JSON.stringify(detailResponse.data, null, 2));
    
  } catch (error) {
    console.error('错误:', error.response?.data || error.message);
  }
}

testAuditApi();
