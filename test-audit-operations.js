/**
 * 测试审核操作功能
 * 验证审核任务的审核操作是否正常工作
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// 测试用户凭证
let authToken = '';

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 登录获取 token
async function login() {
  try {
    log('\n=== 1. 用户登录 ===', 'blue');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    // 检查返回的数据结构
    log(`  返回数据: ${JSON.stringify(response.data)}`, 'yellow');
    
    authToken = response.data.data?.accessToken || response.data.accessToken;
    log('✓ 登录成功', 'green');
    log(`  Token: ${authToken.substring(0, 20)}...`, 'yellow');
    return true;
  } catch (error) {
    log(`✗ 登录失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  响应: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

// 获取审核任务列表
async function getAuditTasks() {
  try {
    log('\n=== 2. 获取审核任务列表 ===', 'blue');
    const response = await axios.get(`${BASE_URL}/audits`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    log(`✓ 获取成功，共 ${response.data.tasks?.length || 0} 个任务`, 'green');
    
    if (response.data.tasks && response.data.tasks.length > 0) {
      const task = response.data.tasks[0];
      log(`  第一个任务 ID: ${task.id}`, 'yellow');
      log(`  样品编号: ${task.sampleNumber}`, 'yellow');
      log(`  状态: ${task.status}`, 'yellow');
      return task.id;
    } else {
      log('  当前没有审核任务', 'yellow');
      return null;
    }
  } catch (error) {
    log(`✗ 获取失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
    }
    return null;
  }
}

// 获取审核意见模板列表
async function getAuditTemplates() {
  try {
    log('\n=== 3. 获取审核意见模板列表 ===', 'blue');
    const response = await axios.get(`${BASE_URL}/audits/templates`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const templates = response.data.data || response.data;
    log(`✓ 获取成功，共 ${templates.length} 个模板`, 'green');
    
    if (templates.length > 0) {
      templates.forEach((template, index) => {
        log(`  模板 ${index + 1}: ${template.name} (${template.type})`, 'yellow');
      });
    }
    
    return templates;
  } catch (error) {
    log(`✗ 获取失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  响应: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return [];
  }
}

// 获取审核流程配置列表
async function getWorkflowConfigs() {
  try {
    log('\n=== 4. 获取审核流程配置列表 ===', 'blue');
    const response = await axios.get(`${BASE_URL}/audits/workflow-configs`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const configs = response.data.data || response.data;
    log(`✓ 获取成功，共 ${configs.length} 个配置`, 'green');
    
    if (configs.length > 0) {
      configs.forEach((config, index) => {
        log(`  配置 ${index + 1}: ${config.name} (状态: ${config.status})`, 'yellow');
      });
    }
    
    return configs;
  } catch (error) {
    log(`✗ 获取失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  响应: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return [];
  }
}

// 执行审核操作
async function performAudit(taskId) {
  try {
    log('\n=== 5. 执行审核操作 ===', 'blue');
    log(`  审核任务 ID: ${taskId}`, 'yellow');
    
    const response = await axios.post(
      `${BASE_URL}/audits/${taskId}/review`,
      {
        result: 'approved',
        comment: '测试审核通过',
        reviewedBy: 'admin'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    log('✓ 审核操作成功', 'green');
    log(`  审核结果: ${response.data.result}`, 'yellow');
    log(`  审核意见: ${response.data.comment}`, 'yellow');
    
    return true;
  } catch (error) {
    log(`✗ 审核操作失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  响应: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

// 获取审核历史记录
async function getAuditHistory(taskId) {
  try {
    log('\n=== 6. 获取审核历史记录 ===', 'blue');
    log(`  审核任务 ID: ${taskId}`, 'yellow');
    
    const response = await axios.get(
      `${BASE_URL}/audits/tasks/${taskId}/history`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    log(`✓ 获取成功，共 ${response.data.length} 条历史记录`, 'green');
    
    if (response.data.length > 0) {
      response.data.forEach((record, index) => {
        log(`  记录 ${index + 1}: ${record.action} by ${record.performedBy} at ${record.performedAt}`, 'yellow');
      });
    }
    
    return response.data;
  } catch (error) {
    log(`✗ 获取失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  响应: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return [];
  }
}

// 主测试流程
async function runTests() {
  log('========================================', 'blue');
  log('审核操作功能测试', 'blue');
  log('========================================', 'blue');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    log('\n测试终止：登录失败', 'red');
    return;
  }
  
  // 2. 获取审核任务列表
  const taskId = await getAuditTasks();
  
  // 3. 获取审核意见模板列表
  await getAuditTemplates();
  
  // 4. 获取审核流程配置列表
  await getWorkflowConfigs();
  
  // 5. 如果有审核任务，执行审核操作
  if (taskId) {
    const auditSuccess = await performAudit(taskId);
    
    // 6. 如果审核成功，获取审核历史记录
    if (auditSuccess) {
      await getAuditHistory(taskId);
    }
  } else {
    log('\n跳过审核操作测试：没有可用的审核任务', 'yellow');
    log('提示：可以先创建样品并提交审核，然后再测试审核操作', 'yellow');
  }
  
  log('\n========================================', 'blue');
  log('测试完成', 'blue');
  log('========================================', 'blue');
}

// 运行测试
runTests().catch(error => {
  log(`\n测试执行出错: ${error.message}`, 'red');
  process.exit(1);
});
