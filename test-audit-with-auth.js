/**
 * 测试带认证的审核任务API
 */

const http = require('http');

// 步骤1: 登录获取令牌
function login() {
  return new Promise((resolve, reject) => {
    const loginData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    console.log('🔐 步骤1: 登录系统...');
    console.log(`请求: POST http://localhost:3000/api/auth/login`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`状态码: ${res.statusCode}\n`);
        
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            if (jsonData.data && jsonData.data.accessToken) {
              console.log('✅ 登录成功！');
              console.log(`令牌: ${jsonData.data.accessToken.substring(0, 20)}...\n`);
              resolve(jsonData.data.accessToken);
            } else {
              reject(new Error('登录响应中没有找到accessToken'));
            }
          } catch (error) {
            reject(new Error(`解析登录响应失败: ${error.message}`));
          }
        } else {
          reject(new Error(`登录失败，状态码: ${res.statusCode}, 响应: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`登录请求失败: ${error.message}`));
    });

    req.write(loginData);
    req.end();
  });
}

// 步骤2: 使用令牌获取审核任务列表
function getAuditTasks(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/audits',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    console.log('📋 步骤2: 获取审核任务列表...');
    console.log(`请求: GET http://localhost:3000/api/audits`);
    console.log(`认证: Bearer ${token.substring(0, 20)}...\n`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`状态码: ${res.statusCode}`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`\n响应数据:`);
          console.log(JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode === 200) {
            // 检查不同的响应格式
            let items = [];
            let total = 0;
            
            if (jsonData.data && jsonData.data.items) {
              items = jsonData.data.items;
              total = jsonData.data.total;
            } else if (jsonData.items) {
              items = jsonData.items;
              total = jsonData.total;
            } else if (Array.isArray(jsonData.data)) {
              items = jsonData.data;
              total = items.length;
            }
            
            console.log(`\n✅ 成功获取审核任务列表！`);
            console.log(`总数: ${total} 条`);
            console.log(`返回: ${items.length} 条\n`);
            
            if (items.length > 0) {
              console.log('前3条记录:');
              items.slice(0, 3).forEach((task, index) => {
                console.log(`\n${index + 1}. 任务ID: ${task.id}`);
                console.log(`   样品: ${task.sample?.sampleName || task.sampleName || 'N/A'}`);
                console.log(`   条码: ${task.sample?.barcode || task.sampleBarcode || 'N/A'}`);
                console.log(`   级别: ${task.level} - ${task.levelName || ''}`);
                console.log(`   状态: ${task.status}`);
                console.log(`   审核人: ${task.auditorId || task.auditor}`);
              });
            }
            
            resolve(jsonData);
          } else {
            reject(new Error(`获取审核任务失败，状态码: ${res.statusCode}`));
          }
        } catch (error) {
          console.log(`\n原始响应: ${data}`);
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`请求失败: ${error.message}`));
    });

    req.end();
  });
}

// 执行测试
async function runTest() {
  try {
    const token = await login();
    await getAuditTasks(token);
    console.log('\n🎉 测试完成！');
  } catch (error) {
    console.error(`\n❌ 测试失败: ${error.message}`);
    console.log(`\n提示: 请确保后端服务正在运行 (npm run dev)`);
  }
}

runTest();
