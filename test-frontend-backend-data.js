/**
 * 前后端数据连接测试脚本
 * 测试各个数据展示列表的数据库连接和数据获取
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

// 测试用的管理员凭证
const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

let accessToken = '';

/**
 * 登录并获取访问令牌
 */
async function login() {
  try {
    console.log('\n========== 1. 测试登录 ==========');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_CREDENTIALS);
    
    if (response.data.success && response.data.data.accessToken) {
      accessToken = response.data.data.accessToken;
      console.log('✅ 登录成功');
      console.log('用户信息:', response.data.data.user);
      return true;
    } else {
      console.log('❌ 登录失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试样品列表
 */
async function testSampleList() {
  try {
    console.log('\n========== 2. 测试样品列表 ==========');
    const response = await axios.get(`${API_BASE_URL}/samples`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page: 1, pageSize: 10 }
    });
    
    if (response.data.success) {
      const { items, total, page, pageSize } = response.data.data;
      console.log('✅ 样品列表获取成功');
      console.log(`总数: ${total}, 当前页: ${page}, 每页: ${pageSize}, 当前页数据: ${items.length}`);
      if (items.length > 0) {
        console.log('第一条样品:', items[0]);
      }
    } else {
      console.log('❌ 样品列表获取失败:', response.data);
    }
  } catch (error) {
    console.error('❌ 样品列表错误:', error.response?.data || error.message);
  }
}

/**
 * 测试工作流列表
 */
async function testWorkflowList() {
  try {
    console.log('\n========== 3. 测试工作流列表 ==========');
    const response = await axios.get(`${API_BASE_URL}/workflows`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page: 1, pageSize: 10 }
    });
    
    if (response.data.success) {
      const { items, total, page, pageSize } = response.data.data;
      console.log('✅ 工作流列表获取成功');
      console.log(`总数: ${total}, 当前页: ${page}, 每页: ${pageSize}, 当前页数据: ${items.length}`);
      if (items.length > 0) {
        console.log('第一条工作流:', items[0]);
      }
    } else {
      console.log('❌ 工作流列表获取失败:', response.data);
    }
  } catch (error) {
    console.error('❌ 工作流列表错误:', error.response?.data || error.message);
  }
}

/**
 * 测试任务列表
 */
async function testTaskList() {
  try {
    console.log('\n========== 4. 测试任务列表 ==========');
    const response = await axios.get(`${API_BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page: 1, pageSize: 10 }
    });
    
    if (response.data.success) {
      const { items, total, page, pageSize } = response.data.data;
      console.log('✅ 任务列表获取成功');
      console.log(`总数: ${total}, 当前页: ${page}, 每页: ${pageSize}, 当前页数据: ${items.length}`);
      if (items.length > 0) {
        console.log('第一条任务:', items[0]);
      }
    } else {
      console.log('❌ 任务列表获取失败:', response.data);
    }
  } catch (error) {
    console.error('❌ 任务列表错误:', error.response?.data || error.message);
  }
}

/**
 * 测试检测结果列表
 */
async function testResultList() {
  try {
    console.log('\n========== 5. 测试检测结果列表 ==========');
    const response = await axios.get(`${API_BASE_URL}/results`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page: 1, pageSize: 10 }
    });
    
    if (response.data.success) {
      const { items, total, page, pageSize } = response.data.data;
      console.log('✅ 检测结果列表获取成功');
      console.log(`总数: ${total}, 当前页: ${page}, 每页: ${pageSize}, 当前页数据: ${items.length}`);
      if (items.length > 0) {
        console.log('第一条结果:', items[0]);
      }
    } else {
      console.log('❌ 检测结果列表获取失败:', response.data);
    }
  } catch (error) {
    console.error('❌ 检测结果列表错误:', error.response?.data || error.message);
  }
}

/**
 * 测试审核任务列表
 */
async function testAuditList() {
  try {
    console.log('\n========== 6. 测试审核任务列表 ==========');
    const response = await axios.get(`${API_BASE_URL}/audits`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page: 1, pageSize: 10 }
    });
    
    if (response.data.success) {
      const { items, total, page, pageSize } = response.data.data;
      console.log('✅ 审核任务列表获取成功');
      console.log(`总数: ${total}, 当前页: ${page}, 每页: ${pageSize}, 当前页数据: ${items.length}`);
      if (items.length > 0) {
        console.log('第一条审核任务:', items[0]);
      }
    } else {
      console.log('❌ 审核任务列表获取失败:', response.data);
    }
  } catch (error) {
    console.error('❌ 审核任务列表错误:', error.response?.data || error.message);
  }
}

/**
 * 测试报告模板列表
 */
async function testReportTemplateList() {
  try {
    console.log('\n========== 7. 测试报告模板列表 ==========');
    const response = await axios.get(`${API_BASE_URL}/report-templates`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page: 1, pageSize: 10 }
    });
    
    if (response.data.success) {
      const { items, total, page, pageSize } = response.data.data;
      console.log('✅ 报告模板列表获取成功');
      console.log(`总数: ${total}, 当前页: ${page}, 每页: ${pageSize}, 当前页数据: ${items.length}`);
      if (items.length > 0) {
        console.log('第一条模板:', items[0]);
      }
    } else {
      console.log('❌ 报告模板列表获取失败:', response.data);
    }
  } catch (error) {
    console.error('❌ 报告模板列表错误:', error.response?.data || error.message);
  }
}

/**
 * 测试用户列表
 */
async function testUserList() {
  try {
    console.log('\n========== 8. 测试用户列表 ==========');
    const response = await axios.get(`${API_BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page: 1, pageSize: 10 }
    });
    
    if (response.data.success) {
      const { items, total, page, pageSize } = response.data.data;
      console.log('✅ 用户列表获取成功');
      console.log(`总数: ${total}, 当前页: ${page}, 每页: ${pageSize}, 当前页数据: ${items.length}`);
      if (items.length > 0) {
        console.log('第一条用户:', items[0]);
      }
    } else {
      console.log('❌ 用户列表获取失败:', response.data);
    }
  } catch (error) {
    console.error('❌ 用户列表错误:', error.response?.data || error.message);
  }
}

/**
 * 测试检测方法列表
 */
async function testMethodList() {
  try {
    console.log('\n========== 9. 测试检测方法列表 ==========');
    const response = await axios.get(`${API_BASE_URL}/methods`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page: 1, pageSize: 10 }
    });
    
    if (response.data.success) {
      const { items, total, page, pageSize } = response.data.data;
      console.log('✅ 检测方法列表获取成功');
      console.log(`总数: ${total}, 当前页: ${page}, 每页: ${pageSize}, 当前页数据: ${items.length}`);
      if (items.length > 0) {
        console.log('第一条方法:', items[0]);
      }
    } else {
      console.log('❌ 检测方法列表获取失败:', response.data);
    }
  } catch (error) {
    console.error('❌ 检测方法列表错误:', error.response?.data || error.message);
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('========================================');
  console.log('前后端数据连接测试');
  console.log('========================================');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ 登录失败，无法继续测试');
    return;
  }
  
  // 2. 测试各个数据列表
  await testSampleList();
  await testWorkflowList();
  await testTaskList();
  await testResultList();
  await testAuditList();
  await testReportTemplateList();
  await testUserList();
  await testMethodList();
  
  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行错误:', error);
  process.exit(1);
});
