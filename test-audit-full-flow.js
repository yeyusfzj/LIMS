/**
 * 测试完整的审核操作流程
 * 1. 创建样品
 * 2. 提交审核
 * 3. 执行审核操作
 * 4. 查看审核历史
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

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

// 登录
async function login() {
  try {
    log('\n=== 1. 用户登录 ===', 'blue');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    authToken = response.data.data.accessToken;
    log('✓ 登录成功', 'green');
    return true;
  } catch (error) {
    log(`✗ 登录失败: ${error.message}`, 'red');
    return false;
  }
}

// 创建样品
async function createSample() {
  try {
    log('\n=== 2. 创建测试样品 ===', 'blue');
    const response = await axios.post(
      `${BASE_URL}/samples`,
      {
        sampleNumber: `TEST-${Date.now()}`,
        sampleName: '测试水样',
        sampleType: '水质',
        sampleCategory: '环境水',
        clientName: '测试客户',
        source: '测试来源',
        collectionDate: new Date().toISOString(),
        receivedDate: new Date().toISOString(),
        collectedBy: 'admin',
        quantity: 1000,
        unit: 'ml',
        storageCondition: '常温',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const sampleId = response.data.data?.id || response.data.id;
    log(`✓ 样品创建成功`, 'green');
    log(`  样品 ID: ${sampleId}`, 'yellow');
    log(`  样品编号: ${response.data.data?.sampleNumber || response.data.sampleNumber}`, 'yellow');
    
    return sampleId;
  } catch (error) {
    log(`✗ 创建样品失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  响应: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

// 提交审核
async function submitAudit(sampleId) {
  try {
    log('\n=== 3. 提交样品审核 ===', 'blue');
    const response = await axios.post(
      `${BASE_URL}/audits`,
      {
        sampleId: sampleId
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const tasks = response.data.data || response.data;
    const taskId = Array.isArray(tasks) ? tasks[0]?.id : tasks?.id;
    
    log(`✓ 审核提交成功`, 'green');
    log(`  审核任务 ID: ${taskId}`, 'yellow');
    
    return taskId;
  } catch (error) {
    log(`✗ 提交审核失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  响应: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

// 获取审核任务详情
async function getAuditTaskDetail(taskId) {
  try {
    log('\n=== 4. 获取审核任务详情 ===', 'blue');
    const response = await axios.get(
      `${BASE_URL}/audits/${taskId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const task = response.data.data || response.data;
    log(`✓ 获取成功`, 'green');
    log(`  任务 ID: ${task.id}`, 'yellow');
    log(`  样品编号: ${task.sampleNumber}`, 'yellow');
    log(`  状态: ${task.status}`, 'yellow');
    log(`  优先级: ${task.priority}`, 'yellow');
    
    return task;
  } catch (error) {
    log(`✗ 获取失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
    }
    return null;
  }
}

// 执行审核操作
async function performAudit(taskId) {
  try {
    log('\n=== 5. 执行审核操作 ===', 'blue');
    const response = await axios.post(
      `${BASE_URL}/audits/${taskId}/review`,
      {
        result: 'approved',
        comment: '检测数据准确，符合标准要求，审核通过',
        reviewedBy: 'admin'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const result = response.data.data || response.data;
    log('✓ 审核操作成功', 'green');
    log(`  审核结果: ${result.result}`, 'yellow');
    log(`  审核意见: ${result.comment}`, 'yellow');
    log(`  审核人: ${result.reviewedBy}`, 'yellow');
    
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
    const response = await axios.get(
      `${BASE_URL}/audits/tasks/${taskId}/history`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const history = response.data.data || response.data;
    log(`✓ 获取成功，共 ${history.length} 条历史记录`, 'green');
    
    if (history.length > 0) {
      history.forEach((record, index) => {
        log(`  记录 ${index + 1}:`, 'yellow');
        log(`    操作: ${record.action}`, 'yellow');
        log(`    操作人: ${record.performedBy}`, 'yellow');
        log(`    时间: ${new Date(record.performedAt).toLocaleString('zh-CN')}`, 'yellow');
        if (record.comment) {
          log(`    备注: ${record.comment}`, 'yellow');
        }
      });
    }
    
    return history;
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
async function runFullTest() {
  log('========================================', 'blue');
  log('审核操作完整流程测试', 'blue');
  log('========================================', 'blue');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    log('\n测试终止：登录失败', 'red');
    return;
  }
  
  // 2. 创建样品
  const sampleId = await createSample();
  if (!sampleId) {
    log('\n测试终止：创建样品失败', 'red');
    return;
  }
  
  // 3. 提交审核
  const taskId = await submitAudit(sampleId);
  if (!taskId) {
    log('\n测试终止：提交审核失败', 'red');
    return;
  }
  
  // 4. 获取审核任务详情
  await getAuditTaskDetail(taskId);
  
  // 5. 执行审核操作
  const auditSuccess = await performAudit(taskId);
  if (!auditSuccess) {
    log('\n测试终止：审核操作失败', 'red');
    return;
  }
  
  // 6. 获取审核历史记录
  await getAuditHistory(taskId);
  
  log('\n========================================', 'blue');
  log('✓ 所有测试通过！审核操作功能正常', 'green');
  log('========================================', 'blue');
}

// 运行测试
runFullTest().catch(error => {
  log(`\n测试执行出错: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
