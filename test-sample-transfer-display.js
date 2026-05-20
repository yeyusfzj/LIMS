/**
 * 样品流转显示功能测试
 * 
 * 测试目标：
 * 1. 验证流转记录列表API是否正常返回数据
 * 2. 验证字段命名转换是否正确
 * 3. 验证前端能否正确显示流转记录
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';
const FRONTEND_URL = 'http://localhost:5173';

// 测试配置
let authToken = '';
let testSampleId = '';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// 1. 登录获取token
async function login() {
  logSection('步骤 1: 用户登录');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      logSuccess('登录成功');
      logInfo(`用户: ${response.data.data.user.username} (${response.data.data.user.fullName})`);
      logInfo(`Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      logError('登录失败：响应格式不正确');
      console.log('响应数据:', response.data);
      return false;
    }
  } catch (error) {
    logError(`登录失败: ${error.message}`);
    if (error.response) {
      console.log('响应数据:', error.response.data);
    }
    return false;
  }
}

// 2. 获取样品列表
async function getSamples() {
  logSection('步骤 2: 获取样品列表');
  try {
    const response = await axios.get(`${BASE_URL}/samples`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        page_size: 10
      }
    });

    if (response.data.success && response.data.data.items) {
      const samples = response.data.data.items;
      logSuccess(`获取到 ${samples.length} 个样品`);
      
      if (samples.length > 0) {
        testSampleId = samples[0].id;
        logInfo(`选择测试样品: ${samples[0].sample_number} - ${samples[0].sample_name}`);
        logInfo(`样品ID: ${testSampleId}`);
        return true;
      } else {
        logWarning('没有可用的样品数据');
        return false;
      }
    } else {
      logError('获取样品列表失败：响应格式不正确');
      return false;
    }
  } catch (error) {
    logError(`获取样品列表失败: ${error.message}`);
    if (error.response) {
      console.log('响应数据:', error.response.data);
    }
    return false;
  }
}

// 3. 获取流转记录列表
async function getTransferList() {
  logSection('步骤 3: 获取流转记录列表');
  try {
    const response = await axios.get(`${BASE_URL}/samples/transfers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        page_size: 20
      }
    });

    if (response.data.success && response.data.data) {
      const data = response.data.data;
      logSuccess(`获取流转记录成功`);
      logInfo(`总记录数: ${data.pagination.total}`);
      logInfo(`当前页记录数: ${data.items.length}`);
      
      if (data.items.length > 0) {
        console.log('\n流转记录示例（第一条）:');
        const firstItem = data.items[0];
        console.log(JSON.stringify(firstItem, null, 2));
        
        // 验证字段命名
        console.log('\n字段命名验证:');
        const requiredFields = [
          'id', 'sample_id', 'from_location', 'to_location',
          'from_person', 'to_person', 'transfer_date', 'status',
          'sender_confirmed', 'receiver_confirmed'
        ];
        
        let allFieldsPresent = true;
        for (const field of requiredFields) {
          if (field in firstItem) {
            logSuccess(`字段 ${field} 存在`);
          } else {
            logError(`字段 ${field} 缺失`);
            allFieldsPresent = false;
          }
        }
        
        // 检查样品信息
        if (firstItem.sample) {
          logSuccess('样品信息存在');
          if (firstItem.sample.sample_number) {
            logSuccess(`样品编号: ${firstItem.sample.sample_number}`);
          }
          if (firstItem.sample.sample_name) {
            logSuccess(`样品名称: ${firstItem.sample.sample_name}`);
          }
        } else {
          logWarning('样品信息为空');
        }
        
        return allFieldsPresent;
      } else {
        logWarning('没有流转记录');
        return true; // 没有记录不算错误
      }
    } else {
      logError('获取流转记录失败：响应格式不正确');
      return false;
    }
  } catch (error) {
    logError(`获取流转记录失败: ${error.message}`);
    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', error.response.data);
    }
    return false;
  }
}

// 4. 测试前端页面访问
async function testFrontendAccess() {
  logSection('步骤 4: 测试前端页面访问');
  try {
    const response = await axios.get(FRONTEND_URL, {
      timeout: 5000
    });
    
    if (response.status === 200) {
      logSuccess('前端页面可访问');
      logInfo(`前端地址: ${FRONTEND_URL}`);
      logInfo('请在浏览器中访问以下页面测试流转功能:');
      logInfo(`  - 登录页面: ${FRONTEND_URL}/login`);
      logInfo(`  - 样品流转: ${FRONTEND_URL}/sample/transfer`);
      return true;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logError('前端服务未启动');
    } else {
      logWarning(`前端访问测试: ${error.message}`);
    }
    return false;
  }
}

// 5. 数据库连接测试
async function testDatabaseConnection() {
  logSection('步骤 5: 数据库连接测试');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    
    if (response.data.status === 'healthy') {
      logSuccess('数据库连接正常');
      if (response.data.database) {
        logInfo(`数据库状态: ${response.data.database}`);
      }
      return true;
    } else {
      logError('数据库连接异常');
      return false;
    }
  } catch (error) {
    logError(`数据库连接测试失败: ${error.message}`);
    return false;
  }
}

// 主测试流程
async function runTests() {
  console.log('\n');
  log('样品流转显示功能测试', 'cyan');
  log('测试时间: ' + new Date().toLocaleString('zh-CN'), 'cyan');
  
  const results = {
    login: false,
    samples: false,
    transfers: false,
    frontend: false,
    database: false
  };

  // 执行测试
  results.database = await testDatabaseConnection();
  results.login = await login();
  
  if (results.login) {
    results.samples = await getSamples();
    results.transfers = await getTransferList();
  }
  
  results.frontend = await testFrontendAccess();

  // 测试总结
  logSection('测试总结');
  
  const testItems = [
    { name: '数据库连接', result: results.database },
    { name: '用户登录', result: results.login },
    { name: '样品列表', result: results.samples },
    { name: '流转记录', result: results.transfers },
    { name: '前端访问', result: results.frontend }
  ];

  let passCount = 0;
  testItems.forEach(item => {
    if (item.result) {
      logSuccess(`${item.name}: 通过`);
      passCount++;
    } else {
      logError(`${item.name}: 失败`);
    }
  });

  console.log('\n' + '='.repeat(60));
  log(`测试完成: ${passCount}/${testItems.length} 项通过`, passCount === testItems.length ? 'green' : 'yellow');
  console.log('='.repeat(60) + '\n');

  // 手动测试指引
  if (results.frontend && results.login) {
    logSection('手动测试指引');
    logInfo('1. 打开浏览器访问: http://localhost:5173');
    logInfo('2. 使用以下凭证登录:');
    logInfo('   用户名: admin');
    logInfo('   密码: admin123');
    logInfo('3. 导航到"样品管理" -> "样品流转"');
    logInfo('4. 检查流转记录是否正确显示');
    logInfo('5. 验证以下字段是否显示正确:');
    logInfo('   - 样品编号、样品名称');
    logInfo('   - 发出地点、接收地点');
    logInfo('   - 发出人、接收人');
    logInfo('   - 流转日期、状态');
    logInfo('   - 确认状态（发送方、接收方）');
  }
}

// 运行测试
runTests().catch(error => {
  logError(`测试执行失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
