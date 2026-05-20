/**
 * 测试 FastAPI 后端登录
 */
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function testLogin() {
  console.log('='.repeat(60));
  console.log('测试 FastAPI 后端登录');
  console.log('='.repeat(60));
  
  const credentials = [
    { username: 'admin', password: 'admin123' },
    { username: 'admin', password: 'Admin@123456' },
    { username: 'testuser', password: 'test123' },
    { username: 'testuser', password: 'User@123456' }
  ];
  
  for (const cred of credentials) {
    console.log(`\n测试登录: ${cred.username} / ${cred.password}`);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, cred);
      
      console.log('✓ 登录成功!');
      console.log('状态码:', response.status);
      console.log('响应数据:', JSON.stringify(response.data, null, 2));
      
      if (response.data.data) {
        console.log('用户信息:', response.data.data.user);
        console.log('Token:', response.data.data.accessToken ? '已获取' : '未获取');
      }
      
      return; // 成功后退出
      
    } catch (error) {
      console.log('✗ 登录失败');
      console.log('状态码:', error.response?.status);
      console.log('错误消息:', error.response?.data?.error?.message || error.message);
      
      if (error.response?.data) {
        console.log('完整响应:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('所有登录尝试均失败');
  console.log('='.repeat(60));
  console.log('\n建议检查:');
  console.log('1. FastAPI 后端是否正在运行 (端口 8000)');
  console.log('2. 数据库是否已初始化');
  console.log('3. 运行: cd fastapi-backend && python scripts/create_auth_tables.py');
}

testLogin().catch(console.error);
