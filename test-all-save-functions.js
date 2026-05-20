/**
 * 全面测试所有保存功能
 * 
 * 检测系统中所有可能存在保存问题的功能
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';
let authToken = null;

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

// 登录
async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (response.data.success) {
      authToken = response.data.data.access_token;
      log('✅ 登录成功', 'green');
      return true;
    }
    return false;
  } catch (error) {
    log(`❌ 登录失败: ${error.message}`, 'red');
    return false;
  }
}

// 获取认证头
function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
}

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

function recordTest(name, status, message = '') {
  testResults.total++;
  testResults[status]++;
  testResults.details.push({ name, status, message });
  
  const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
  const color = status === 'passed' ? 'green' : status === 'failed' ? 'red' : 'yellow';
  log(`${icon} ${name}: ${message}`, color);
}

// ============================================================================
// 1. 样品管理相关测试
// ============================================================================

async function testSampleUpdate() {
  log('\n📝 测试 1: 样品更新功能', 'cyan');
  
  try {
    // 获取第一个样品
    const listResponse = await axios.get(`${API_BASE_URL}/samples`, {
      params: { page: 1, pageSize: 1 },
      headers: getAuthHeaders()
    });
    
    if (!listResponse.data.data.items || listResponse.data.data.items.length === 0) {
      recordTest('样品更新', 'skipped', '没有可用的样品数据');
      return;
    }
    
    const sample = listResponse.data.data.items[0];
    const sampleId = sample.id;
    const originalName = sample.sample_name;
    const newName = `测试样品_${Date.now()}`;
    
    // 更新样品
    const updateResponse = await axios.patch(
      `${API_BASE_URL}/samples/${sampleId}`,
      { sample_name: newName },
      { headers: getAuthHeaders() }
    );
    
    // 验证更新
    const verifyResponse = await axios.get(
      `${API_BASE_URL}/samples/${sampleId}`,
      { headers: getAuthHeaders() }
    );
    
    if (verifyResponse.data.data.sample_name === newName) {
      recordTest('样品更新', 'passed', `成功更新: ${originalName} → ${newName}`);
      
      // 恢复原名称
      await axios.patch(
        `${API_BASE_URL}/samples/${sampleId}`,
        { sample_name: originalName },
        { headers: getAuthHeaders() }
      );
    } else {
      recordTest('样品更新', 'failed', `更新失败: 期望 ${newName}, 实际 ${verifyResponse.data.data.sample_name}`);
    }
  } catch (error) {
    recordTest('样品更新', 'failed', error.response?.data?.error?.message || error.message);
  }
}

async function testSampleCreate() {
  log('\n📝 测试 2: 样品创建功能', 'cyan');
  
  try {
    const newSample = {
      client_name: '测试客户',
      client_contact: '13800138000',
      sample_name: `测试样品_${Date.now()}`,
      sample_type: '食品',
      sample_category: '蔬菜',
      quantity: 500,
      unit: 'g',
      received_date: new Date().toISOString(),
      sampling_date: new Date().toISOString(),
      sampling_location: '测试地点',
      storage_location: '冷藏室A-01',
      storage_condition: '2-8°C',
      priority: 'NORMAL',
      description: '自动化测试样品'
    };
    
    const createResponse = await axios.post(
      `${API_BASE_URL}/samples`,
      newSample,
      { headers: getAuthHeaders() }
    );
    
    if (createResponse.data.success && createResponse.data.data.id) {
      const createdId = createResponse.data.data.id;
      recordTest('样品创建', 'passed', `成功创建样品 ID: ${createdId}`);
      
      // 清理：删除创建的样品
      try {
        await axios.delete(
          `${API_BASE_URL}/samples/${createdId}`,
          { headers: getAuthHeaders() }
        );
      } catch (e) {
        // 忽略删除错误
      }
    } else {
      recordTest('样品创建', 'failed', '创建响应格式不正确');
    }
  } catch (error) {
    recordTest('样品创建', 'failed', error.response?.data?.error?.message || error.message);
  }
}

// ============================================================================
// 2. 用户管理相关测试
// ============================================================================

async function testUserUpdate() {
  log('\n📝 测试 3: 用户更新功能', 'cyan');
  
  try {
    // 获取当前用户信息
    const meResponse = await axios.get(
      `${API_BASE_URL}/auth/me`,
      { headers: getAuthHeaders() }
    );
    
    const userId = meResponse.data.data.id;
    const originalFullName = meResponse.data.data.full_name;
    const newFullName = `测试用户_${Date.now()}`;
    
    // 更新用户
    const updateResponse = await axios.patch(
      `${API_BASE_URL}/users/${userId}`,
      { full_name: newFullName },
      { headers: getAuthHeaders() }
    );
    
    // 验证更新
    const verifyResponse = await axios.get(
      `${API_BASE_URL}/users/${userId}`,
      { headers: getAuthHeaders() }
    );
    
    if (verifyResponse.data.data.full_name === newFullName) {
      recordTest('用户更新', 'passed', `成功更新: ${originalFullName} → ${newFullName}`);
      
      // 恢复原名称
      await axios.patch(
        `${API_BASE_URL}/users/${userId}`,
        { full_name: originalFullName },
        { headers: getAuthHeaders() }
      );
    } else {
      recordTest('用户更新', 'failed', `更新失败: 期望 ${newFullName}, 实际 ${verifyResponse.data.data.full_name}`);
    }
  } catch (error) {
    recordTest('用户更新', 'failed', error.response?.data?.error?.message || error.message);
  }
}

// ============================================================================
// 3. 角色管理相关测试
// ============================================================================

async function testRoleUpdate() {
  log('\n📝 测试 4: 角色更新功能', 'cyan');
  
  try {
    // 获取角色列表
    const listResponse = await axios.get(
      `${API_BASE_URL}/roles`,
      { headers: getAuthHeaders() }
    );
    
    if (!listResponse.data.data || listResponse.data.data.length === 0) {
      recordTest('角色更新', 'skipped', '没有可用的角色数据');
      return;
    }
    
    // 找一个非系统角色
    const role = listResponse.data.data.find(r => !r.is_system);
    if (!role) {
      recordTest('角色更新', 'skipped', '没有可编辑的角色');
      return;
    }
    
    const roleId = role.id;
    const originalDescription = role.description;
    const newDescription = `测试描述_${Date.now()}`;
    
    // 更新角色
    await axios.patch(
      `${API_BASE_URL}/roles/${roleId}`,
      { description: newDescription },
      { headers: getAuthHeaders() }
    );
    
    // 验证更新
    const verifyResponse = await axios.get(
      `${API_BASE_URL}/roles/${roleId}`,
      { headers: getAuthHeaders() }
    );
    
    if (verifyResponse.data.data.description === newDescription) {
      recordTest('角色更新', 'passed', `成功更新角色描述`);
      
      // 恢复原描述
      await axios.patch(
        `${API_BASE_URL}/roles/${roleId}`,
        { description: originalDescription },
        { headers: getAuthHeaders() }
      );
    } else {
      recordTest('角色更新', 'failed', `更新失败`);
    }
  } catch (error) {
    recordTest('角色更新', 'failed', error.response?.data?.error?.message || error.message);
  }
}

// ============================================================================
// 4. 报告模板相关测试
// ============================================================================

async function testReportTemplateUpdate() {
  log('\n📝 测试 5: 报告模板更新功能', 'cyan');
  
  try {
    // 获取报告模板列表
    const listResponse = await axios.get(
      `${API_BASE_URL}/report-templates`,
      { 
        params: { page: 1, page_size: 1 },
        headers: getAuthHeaders() 
      }
    );
    
    if (!listResponse.data.data.items || listResponse.data.data.items.length === 0) {
      recordTest('报告模板更新', 'skipped', '没有可用的报告模板');
      return;
    }
    
    const template = listResponse.data.data.items[0];
    const templateId = template.id;
    const originalDescription = template.description;
    const newDescription = `测试描述_${Date.now()}`;
    
    // 更新模板
    await axios.patch(
      `${API_BASE_URL}/report-templates/${templateId}`,
      { description: newDescription },
      { headers: getAuthHeaders() }
    );
    
    // 验证更新
    const verifyResponse = await axios.get(
      `${API_BASE_URL}/report-templates/${templateId}`,
      { headers: getAuthHeaders() }
    );
    
    if (verifyResponse.data.data.description === newDescription) {
      recordTest('报告模板更新', 'passed', `成功更新模板描述`);
      
      // 恢复原描述
      await axios.patch(
        `${API_BASE_URL}/report-templates/${templateId}`,
        { description: originalDescription },
        { headers: getAuthHeaders() }
      );
    } else {
      recordTest('报告模板更新', 'failed', `更新失败`);
    }
  } catch (error) {
    recordTest('报告模板更新', 'failed', error.response?.data?.error?.message || error.message);
  }
}

// ============================================================================
// 5. 工作流模板相关测试
// ============================================================================

async function testWorkflowTemplateUpdate() {
  log('\n📝 测试 6: 工作流模板更新功能', 'cyan');
  
  try {
    // 获取工作流模板列表
    const listResponse = await axios.get(
      `${API_BASE_URL}/workflows/templates`,
      { 
        params: { page: 1, page_size: 1 },
        headers: getAuthHeaders() 
      }
    );
    
    if (!listResponse.data.data.items || listResponse.data.data.items.length === 0) {
      recordTest('工作流模板更新', 'skipped', '没有可用的工作流模板');
      return;
    }
    
    const template = listResponse.data.data.items[0];
    const templateId = template.id;
    const originalDescription = template.description;
    const newDescription = `测试描述_${Date.now()}`;
    
    // 更新模板
    await axios.patch(
      `${API_BASE_URL}/workflows/templates/${templateId}`,
      { description: newDescription },
      { headers: getAuthHeaders() }
    );
    
    // 验证更新
    const verifyResponse = await axios.get(
      `${API_BASE_URL}/workflows/templates/${templateId}`,
      { headers: getAuthHeaders() }
    );
    
    if (verifyResponse.data.data.description === newDescription) {
      recordTest('工作流模板更新', 'passed', `成功更新工作流模板描述`);
      
      // 恢复原描述
      await axios.patch(
        `${API_BASE_URL}/workflows/templates/${templateId}`,
        { description: originalDescription },
        { headers: getAuthHeaders() }
      );
    } else {
      recordTest('工作流模板更新', 'failed', `更新失败`);
    }
  } catch (error) {
    recordTest('工作流模板更新', 'failed', error.response?.data?.error?.message || error.message);
  }
}

// ============================================================================
// 6. 测试方法库相关测试
// ============================================================================

async function testMethodUpdate() {
  log('\n📝 测试 7: 测试方法更新功能', 'cyan');
  
  try {
    // 获取测试方法列表
    const listResponse = await axios.get(
      `${API_BASE_URL}/methods`,
      { 
        params: { page: 1, page_size: 1 },
        headers: getAuthHeaders() 
      }
    );
    
    if (!listResponse.data.data.items || listResponse.data.data.items.length === 0) {
      recordTest('测试方法更新', 'skipped', '没有可用的测试方法');
      return;
    }
    
    const method = listResponse.data.data.items[0];
    const methodId = method.id;
    const originalDescription = method.description;
    const newDescription = `测试描述_${Date.now()}`;
    
    // 更新方法
    await axios.patch(
      `${API_BASE_URL}/methods/${methodId}`,
      { description: newDescription },
      { headers: getAuthHeaders() }
    );
    
    // 验证更新
    const verifyResponse = await axios.get(
      `${API_BASE_URL}/methods/${methodId}`,
      { headers: getAuthHeaders() }
    );
    
    if (verifyResponse.data.data.description === newDescription) {
      recordTest('测试方法更新', 'passed', `成功更新测试方法描述`);
      
      // 恢复原描述
      await axios.patch(
        `${API_BASE_URL}/methods/${methodId}`,
        { description: originalDescription },
        { headers: getAuthHeaders() }
      );
    } else {
      recordTest('测试方法更新', 'failed', `更新失败`);
    }
  } catch (error) {
    recordTest('测试方法更新', 'failed', error.response?.data?.error?.message || error.message);
  }
}

// ============================================================================
// 主测试流程
// ============================================================================

async function runAllTests() {
  log('='.repeat(80), 'blue');
  log('全面保存功能测试', 'blue');
  log('='.repeat(80), 'blue');
  
  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    log('\n❌ 登录失败，无法继续测试', 'red');
    return;
  }
  
  // 运行所有测试
  await testSampleUpdate();
  await testSampleCreate();
  await testUserUpdate();
  await testRoleUpdate();
  await testReportTemplateUpdate();
  await testWorkflowTemplateUpdate();
  await testMethodUpdate();
  
  // 输出测试结果
  log('\n' + '='.repeat(80), 'blue');
  log('测试结果汇总', 'blue');
  log('='.repeat(80), 'blue');
  log(`总计: ${testResults.total} 个测试`, 'cyan');
  log(`通过: ${testResults.passed} 个`, 'green');
  log(`失败: ${testResults.failed} 个`, 'red');
  log(`跳过: ${testResults.skipped} 个`, 'yellow');
  
  if (testResults.failed > 0) {
    log('\n失败的测试:', 'red');
    testResults.details
      .filter(t => t.status === 'failed')
      .forEach(t => {
        log(`  - ${t.name}: ${t.message}`, 'red');
      });
  }
  
  log('\n' + '='.repeat(80), 'blue');
}

// 运行测试
runAllTests().catch(error => {
  log(`\n❌ 测试过程中发生错误: ${error.message}`, 'red');
  console.error(error);
});
