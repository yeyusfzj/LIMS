/**
 * API 服务修复验证测试
 * 
 * 测试所有 API 服务是否正确处理 FastAPI 的响应格式
 */

const axios = require('axios');

const FASTAPI_BASE_URL = 'http://localhost:8000/api/v1';
const VUE_BASE_URL = 'http://localhost:5173';

// 测试账号
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

let authToken = '';

async function login() {
  console.log('=== 1. 登录测试 ===\n');
  
  try {
    const response = await axios.post(`${FASTAPI_BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✓ 登录成功');
      console.log('  Token:', authToken.substring(0, 20) + '...');
      return true;
    } else {
      console.log('✗ 登录失败：响应格式不正确');
      return false;
    }
  } catch (error) {
    console.error('✗ 登录失败:', error.message);
    return false;
  }
}

async function testSampleList() {
  console.log('\n=== 2. 样品列表测试 ===\n');
  
  try {
    const response = await axios.get(`${FASTAPI_BASE_URL}/samples`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        pageSize: 10
      }
    });
    
    console.log('响应格式:', {
      success: response.data.success,
      hasData: !!response.data.data,
      dataType: typeof response.data.data,
      hasItems: response.data.data && Array.isArray(response.data.data.items)
    });
    
    if (response.data.success && response.data.data) {
      console.log('✓ 样品列表 API 响应格式正确');
      console.log('  总数:', response.data.data.total || 0);
      console.log('  当前页:', response.data.data.page || 1);
      return true;
    } else {
      console.log('✗ 样品列表 API 响应格式不正确');
      return false;
    }
  } catch (error) {
    console.error('✗ 样品列表测试失败:', error.message);
    if (error.response) {
      console.error('  状态码:', error.response.status);
      console.error('  响应数据:', error.response.data);
    }
    return false;
  }
}

async function testReportTemplateList() {
  console.log('\n=== 3. 报告模板列表测试 ===\n');
  
  try {
    const response = await axios.get(`${FASTAPI_BASE_URL}/report-templates`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        pageSize: 10
      }
    });
    
    console.log('响应格式:', {
      success: response.data.success,
      hasData: !!response.data.data,
      dataType: typeof response.data.data,
      hasItems: response.data.data && Array.isArray(response.data.data.items)
    });
    
    if (response.data.success && response.data.data) {
      console.log('✓ 报告模板列表 API 响应格式正确');
      console.log('  总数:', response.data.data.total || 0);
      console.log('  当前页:', response.data.data.page || 1);
      return true;
    } else {
      console.log('✗ 报告模板列表 API 响应格式不正确');
      return false;
    }
  } catch (error) {
    console.error('✗ 报告模板列表测试失败:', error.message);
    if (error.response) {
      console.error('  状态码:', error.response.status);
      console.error('  响应数据:', error.response.data);
    }
    return false;
  }
}

async function testWorkflowList() {
  console.log('\n=== 4. 工作流列表测试 ===\n');
  
  try {
    const response = await axios.get(`${FASTAPI_BASE_URL}/workflows`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        pageSize: 10
      }
    });
    
    console.log('响应格式:', {
      success: response.data.success,
      hasData: !!response.data.data,
      dataType: typeof response.data.data
    });
    
    if (response.data.success && response.data.data) {
      console.log('✓ 工作流列表 API 响应格式正确');
      return true;
    } else {
      console.log('✗ 工作流列表 API 响应格式不正确');
      return false;
    }
  } catch (error) {
    console.error('✗ 工作流列表测试失败:', error.message);
    if (error.response) {
      console.error('  状态码:', error.response.status);
      console.error('  响应数据:', error.response.data);
    }
    return false;
  }
}

async function runTests() {
  console.log('========================================');
  console.log('  API 服务修复验证测试');
  console.log('========================================\n');
  
  const results = {
    login: false,
    sampleList: false,
    reportTemplateList: false,
    workflowList: false
  };
  
  // 1. 登录
  results.login = await login();
  if (!results.login) {
    console.log('\n✗ 登录失败，无法继续测试');
    return;
  }
  
  // 2. 测试样品列表
  results.sampleList = await testSampleList();
  
  // 3. 测试报告模板列表
  results.reportTemplateList = await testReportTemplateList();
  
  // 4. 测试工作流列表
  results.workflowList = await testWorkflowList();
  
  // 总结
  console.log('\n========================================');
  console.log('  测试结果总结');
  console.log('========================================\n');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  console.log(`通过: ${passed}/${total}`);
  console.log('');
  
  Object.entries(results).forEach(([name, result]) => {
    console.log(`  ${result ? '✓' : '✗'} ${name}`);
  });
  
  console.log('');
  
  if (passed === total) {
    console.log('✓ 所有测试通过！');
  } else {
    console.log('✗ 部分测试失败，请检查修复');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
});
