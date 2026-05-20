const axios = require('axios');

async function testLogin() {
  try {
    console.log('测试登录: admin / admin123');
    const response = await axios.post('http://localhost:8000/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('✓ 登录成功!');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('✗ 登录失败');
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('错误信息:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('错误:', error.message);
    }
  }
}

testLogin();
