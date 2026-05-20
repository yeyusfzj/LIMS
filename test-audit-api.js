/**
 * 测试审核任务API
 */

const http = require('http');

// 测试审核任务列表API
function testAuditTasksAPI() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/audits',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  console.log('🔍 测试审核任务列表API...');
  console.log(`请求: GET http://localhost:3000/api/audits`);

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`\n状态码: ${res.statusCode}`);
      console.log(`响应头:`, res.headers);
      
      try {
        const jsonData = JSON.parse(data);
        console.log(`\n响应数据:`);
        console.log(JSON.stringify(jsonData, null, 2));
        
        if (jsonData.data && jsonData.data.items) {
          console.log(`\n✅ 找到 ${jsonData.data.items.length} 条审核任务记录`);
        } else if (jsonData.items) {
          console.log(`\n✅ 找到 ${jsonData.items.length} 条审核任务记录`);
        } else {
          console.log(`\n⚠️  响应格式不符合预期`);
        }
      } catch (error) {
        console.log(`\n原始响应: ${data}`);
        console.error(`\n❌ 解析JSON失败:`, error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`\n❌ 请求失败:`, error.message);
    console.log(`\n提示: 请确保后端服务正在运行 (npm run dev)`);
  });

  req.end();
}

// 执行测试
testAuditTasksAPI();
