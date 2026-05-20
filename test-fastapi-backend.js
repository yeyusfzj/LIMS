/**
 * FastAPI 后端连接测试脚本
 * 
 * 测试 FastAPI 后端的主要功能：
 * 1. 健康检查
 * 2. API 文档访问
 * 3. 登录功能
 * 4. 样品列表查询
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8000';
const API_BASE = `${BASE_URL}/api/v1`;

// 测试结果统计
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// 记录测试结果
function recordTest(name, passed, message, data = null) {
  results.total++;
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
  results.tests.push({ name, passed, message, data });
  
  const status = passed ? '✅ 通过' : '❌ 失败';
  console.log(`\n${status}: ${name}`);
  console.log(`   ${message}`);
  if (data) {
    console.log(`   数据:`, JSON.stringify(data, null, 2));
  }
}

// 测试 1: 健康检查
async function testHealthCheck() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    const data = response.data;
    
    if (data.status === 'healthy' && data.database === 'connected') {
      recordTest(
        '健康检查',
        true,
        `服务状态: ${data.status}, 数据库: ${data.database}`,
        data
      );
    } else {
      recordTest(
        '健康检查',
        false,
        `服务状态异常: ${data.status}`,
        data
      );
    }
  } catch (error) {
    recordTest(
      '健康检查',
      false,
      `请求失败: ${error.message}`
    );
  }
}

// 测试 2: API 文档访问
async function testApiDocs() {
  try {
    const response = await axios.get(`${BASE_URL}/docs`);
    
    if (response.status === 200) {
      recordTest(
        'API 文档访问',
        true,
        'Swagger 文档可以正常访问'
      );
    } else {
      recordTest(
        'API 文档访问',
        false,
        `状态码: ${response.status}`
      );
    }
  } catch (error) {
    recordTest(
      'API 文档访问',
      false,
      `请求失败: ${error.message}`
    );
  }
}

// 测试 3: 登录功能
async function testLogin() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    const data = response.data;
    
    if (data.data && data.data.token) {
      recordTest(
        '登录功能',
        true,
        `登录成功，用户: ${data.data.user.username}`,
        { username: data.data.user.username, roles: data.data.user.roles }
      );
      return data.data.token;
    } else {
      recordTest(
        '登录功能',
        false,
        '登录响应格式错误',
        data
      );
      return null;
    }
  } catch (error) {
    recordTest(
      '登录功能',
      false,
      `登录失败: ${error.response?.data?.message || error.message}`
    );
    return null;
  }
}

// 测试 4: 样品列表查询
async function testSamplesList(token) {
  if (!token) {
    recordTest(
      '样品列表查询',
      false,
      '跳过测试：未获取到认证令牌'
    );
    return;
  }
  
  try {
    const response = await axios.get(`${API_BASE}/samples`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page: 1,
        page_size: 10
      }
    });
    
    const data = response.data;
    
    if (data.data && data.data.items) {
      recordTest(
        '样品列表查询',
        true,
        `查询成功，共 ${data.data.pagination.total} 条记录`,
        { 
          total: data.data.pagination.total,
          page: data.data.pagination.page,
          page_size: data.data.pagination.page_size
        }
      );
    } else {
      recordTest(
        '样品列表查询',
        false,
        '响应格式错误',
        data
      );
    }
  } catch (error) {
    recordTest(
      '样品列表查询',
      false,
      `查询失败: ${error.response?.data?.message || error.message}`
    );
  }
}

// 测试 5: 健康检查端点（v1）
async function testHealthCheckV1(token) {
  if (!token) {
    recordTest(
      '健康检查端点（v1）',
      false,
      '跳过测试：未获取到认证令牌'
    );
    return;
  }
  
  try {
    const response = await axios.get(`${API_BASE}/health`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = response.data;
    
    if (data.data && data.data.status) {
      recordTest(
        '健康检查端点（v1）',
        true,
        `服务状态: ${data.data.status}`,
        data.data
      );
    } else {
      recordTest(
        '健康检查端点（v1）',
        false,
        '响应格式错误',
        data
      );
    }
  } catch (error) {
    recordTest(
      '健康检查端点（v1）',
      false,
      `请求失败: ${error.response?.data?.message || error.message}`
    );
  }
}

// 打印测试报告
function printReport() {
  console.log('\n' + '='.repeat(60));
  console.log('测试报告');
  console.log('='.repeat(60));
  console.log(`总测试数: ${results.total}`);
  console.log(`通过: ${results.passed} (${(results.passed / results.total * 100).toFixed(1)}%)`);
  console.log(`失败: ${results.failed} (${(results.failed / results.total * 100).toFixed(1)}%)`);
  console.log('='.repeat(60));
  
  if (results.failed > 0) {
    console.log('\n失败的测试:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  - ${t.name}: ${t.message}`);
      });
  }
}

// 主测试流程
async function runTests() {
  console.log('开始测试 FastAPI 后端...\n');
  console.log(`后端地址: ${BASE_URL}`);
  console.log(`API 基础路径: ${API_BASE}`);
  
  // 执行测试
  await testHealthCheck();
  await testApiDocs();
  const token = await testLogin();
  await testSamplesList(token);
  await testHealthCheckV1(token);
  
  // 打印报告
  printReport();
  
  // 返回退出码
  process.exit(results.failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行出错:', error);
  process.exit(1);
});
