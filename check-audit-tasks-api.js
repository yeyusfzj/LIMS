const http = require('http');

// 先登录获取token
const loginData = JSON.stringify({
  username: 'admin',
  password: 'Admin@123456'
});

const loginOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('1. 登录获取token...');

const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const loginResult = JSON.parse(data);
      console.log('登录响应:', JSON.stringify(loginResult, null, 2));
      
      if (loginResult.token || loginResult.data?.token || loginResult.data?.accessToken) {
        const token = loginResult.token || loginResult.data?.token || loginResult.data?.accessToken;
        console.log('使用token:', token.substring(0, 50) + '...');
        // 获取审核任务列表
        console.log('\n2. 获取审核任务列表...');
        
        const tasksOptions = {
          hostname: 'localhost',
          port: 3000,
          path: '/api/audits?page=1&pageSize=10',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };
        
        const tasksReq = http.request(tasksOptions, (res) => {
          let tasksData = '';
          
          res.on('data', (chunk) => {
            tasksData += chunk;
          });
          
          res.on('end', () => {
            try {
              const tasksResult = JSON.parse(tasksData);
              console.log('\n审核任务列表响应:');
              console.log(JSON.stringify(tasksResult, null, 2));
              console.log('\n成功:', tasksResult.success);
              console.log('任务数量:', tasksResult.data ? tasksResult.data.length : 0);
              
              if (tasksResult.data && tasksResult.data.length > 0) {
                console.log('\n第一个任务信息:');
                const task = tasksResult.data[0];
                console.log('- ID:', task.id);
                console.log('- 状态:', task.status);
                console.log('- 级别:', task.level);
                console.log('- 样品条码:', task.sampleBarcode);
                console.log('- 审核人:', task.auditor);
              } else {
                console.log('\n没有审核任务数据');
              }
            } catch (error) {
              console.error('解析任务列表失败:', error.message);
              console.log('原始响应:', tasksData);
            }
          });
        });
        
        tasksReq.on('error', (error) => {
          console.error('获取任务列表失败:', error.message);
        });
        
        tasksReq.end();
      } else {
        console.log('登录响应中没有token');
      }
    } catch (error) {
      console.error('解析登录响应失败:', error.message);
      console.log('原始响应:', data);
    }
  });
});

loginReq.on('error', (error) => {
  console.error('登录失败:', error.message);
});

loginReq.write(loginData);
loginReq.end();
