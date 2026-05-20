// 测试429错误处理的脚本
const axios = require('axios');

async function testRateLimitError() {
  console.log('开始测试429错误处理...');
  
  try {
    // 发送登录请求到已经被限流的端点
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'test',
      password: 'test'
    });
    
    console.log('意外成功:', response.data);
  } catch (error) {
    console.log('捕获到错误:');
    console.log('- 状态码:', error.response?.status);
    console.log('- 响应头:', error.response?.headers);
    console.log('- 响应数据:', error.response?.data);
    console.log('- Retry-After头:', error.response?.headers['retry-after']);
    
    if (error.response?.status === 429) {
      console.log('✓ 成功捕获429错误');
      const data = error.response.data;
      if (data.error && data.error.retryAfter) {
        console.log('✓ 响应包含retryAfter字段:', data.error.retryAfter);
      }
      if (error.response.headers['retry-after']) {
        console.log('✓ 响应包含Retry-After头:', error.response.headers['retry-after']);
      }
    }
  }
}

testRateLimitError();