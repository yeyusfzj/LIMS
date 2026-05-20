// 测试前端429错误处理
// 在浏览器控制台中运行此代码

async function testFrontend429() {
  console.log('开始测试前端429错误处理...');
  
  try {
    // 使用前端的HTTP客户端发送请求
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'test',
        password: 'test'
      })
    });
    
    console.log('响应状态:', response.status);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('响应数据:', data);
    
  } catch (error) {
    console.error('捕获到错误:', error);
    console.error('错误类型:', typeof error);
    console.error('错误属性:', Object.keys(error));
  }
}

// 运行测试
testFrontend429();