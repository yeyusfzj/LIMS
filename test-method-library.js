/**
 * 检测方法库功能测试脚本
 * 测试前后端集成和API对接
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 1. 登录获取token
async function login() {
  try {
    log('\n=== 1. 用户登录 ===', 'blue');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    authToken = response.data.data?.accessToken || response.data.accessToken;
    log('✓ 登录成功', 'green');
    log(`Token: ${authToken ? authToken.substring(0, 20) + '...' : '未获取到token'}`, 'yellow');
    return true;
  } catch (error) {
    log(`✗ 登录失败: ${error.message}`, 'red');
    if (error.response) {
      log(`响应状态: ${error.response.status}`, 'red');
      log(`响应数据: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

// 2. 获取检测方法列表
async function getMethodList() {
  try {
    log('\n=== 2. 获取检测方法列表 ===', 'blue');
    const response = await axios.get(`${API_BASE_URL}/methods`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        pageSize: 10
      }
    });
    
    log('✓ 获取列表成功', 'green');
    log(`总数: ${response.data.total}`, 'yellow');
    log(`当前页数据: ${response.data.data.length}`, 'yellow');
    
    if (response.data.data.length > 0) {
      log('\n前3条数据:', 'yellow');
      response.data.data.slice(0, 3).forEach((method, index) => {
        log(`  ${index + 1}. ${method.code} - ${method.name} (${method.category})`, 'yellow');
      });
    }
    
    return response.data;
  } catch (error) {
    log(`✗ 获取列表失败: ${error.message}`, 'red');
    if (error.response) {
      log(`响应状态: ${error.response.status}`, 'red');
      log(`响应数据: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

// 3. 按类别筛选
async function filterByCategory(category) {
  try {
    log(`\n=== 3. 按类别筛选: ${category} ===`, 'blue');
    const response = await axios.get(`${API_BASE_URL}/methods`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        category: category,
        page: 1,
        pageSize: 10
      }
    });
    
    log('✓ 筛选成功', 'green');
    log(`找到 ${response.data.total} 条${category}数据`, 'yellow');
    
    return response.data;
  } catch (error) {
    log(`✗ 筛选失败: ${error.message}`, 'red');
    return null;
  }
}

// 4. 按状态筛选
async function filterByStatus(status) {
  try {
    log(`\n=== 4. 按状态筛选: ${status} ===`, 'blue');
    const response = await axios.get(`${API_BASE_URL}/methods`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        status: status,
        page: 1,
        pageSize: 10
      }
    });
    
    log('✓ 筛选成功', 'green');
    log(`找到 ${response.data.total} 条${status}状态数据`, 'yellow');
    
    return response.data;
  } catch (error) {
    log(`✗ 筛选失败: ${error.message}`, 'red');
    return null;
  }
}

// 5. 关键词搜索
async function searchByKeyword(keyword) {
  try {
    log(`\n=== 5. 关键词搜索: ${keyword} ===`, 'blue');
    const response = await axios.get(`${API_BASE_URL}/methods`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        keyword: keyword,
        page: 1,
        pageSize: 10
      }
    });
    
    log('✓ 搜索成功', 'green');
    log(`找到 ${response.data.total} 条包含"${keyword}"的数据`, 'yellow');
    
    return response.data;
  } catch (error) {
    log(`✗ 搜索失败: ${error.message}`, 'red');
    return null;
  }
}

// 6. 获取单个检测方法详情
async function getMethodDetail(methodId) {
  try {
    log(`\n=== 6. 获取检测方法详情 ===`, 'blue');
    const response = await axios.get(`${API_BASE_URL}/methods/${methodId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    log('✓ 获取详情成功', 'green');
    log(`方法编号: ${response.data.code}`, 'yellow');
    log(`方法名称: ${response.data.name}`, 'yellow');
    log(`检测类别: ${response.data.category}`, 'yellow');
    log(`版本: ${response.data.version}`, 'yellow');
    log(`状态: ${response.data.status}`, 'yellow');
    
    return response.data;
  } catch (error) {
    log(`✗ 获取详情失败: ${error.message}`, 'red');
    return null;
  }
}

// 主测试流程
async function runTests() {
  log('========================================', 'blue');
  log('   检测方法库功能测试', 'blue');
  log('========================================', 'blue');
  
  // 等待服务启动
  log('\n等待服务启动...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    log('\n测试终止：登录失败', 'red');
    return;
  }
  
  // 2. 获取列表
  const listData = await getMethodList();
  if (!listData || listData.data.length === 0) {
    log('\n警告：没有检测方法数据', 'yellow');
    return;
  }
  
  // 3. 按类别筛选
  await filterByCategory('水质检测');
  
  // 4. 按状态筛选
  await filterByStatus('ACTIVE');
  
  // 5. 关键词搜索
  await searchByKeyword('pH');
  
  // 6. 获取详情
  if (listData.data.length > 0) {
    await getMethodDetail(listData.data[0].id);
  }
  
  log('\n========================================', 'blue');
  log('   测试完成', 'blue');
  log('========================================', 'blue');
}

// 运行测试
runTests().catch(error => {
  log(`\n测试过程出错: ${error.message}`, 'red');
  console.error(error);
});
