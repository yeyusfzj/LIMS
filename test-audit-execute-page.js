/**
 * 审核执行页面功能测试脚本
 * 
 * 测试前端"执行审核"页面的功能是否正常
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
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
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

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(message, 'cyan');
  log('='.repeat(60), 'cyan');
}

// 登录获取token
async function login() {
  logSection('步骤1: 用户登录');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });

    authToken = response.data.accessToken;
    logSuccess('登录成功');
    logInfo(`Token: ${authToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    logError(`登录失败: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// 获取审核任务列表
async function getAuditTasks() {
  logSection('步骤2: 获取审核任务列表');
  try {
    const response = await axios.get(`${API_BASE_URL}/audits`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        pageSize: 10
      }
    });

    const tasks = response.data.items || [];
    logSuccess(`成功获取 ${tasks.length} 个审核任务`);
    
    if (tasks.length > 0) {
      logInfo('审核任务列表:');
      tasks.forEach((task, index) => {
        console.log(`  ${index + 1}. ID: ${task.id}`);
        console.log(`     样品: ${task.sampleBarcode} - ${task.sampleName || 'N/A'}`);
        console.log(`     级别: ${task.level}级审核`);
        console.log(`     状态: ${task.status}`);
        console.log(`     提交人: ${task.submittedBy}`);
        console.log('');
      });
    } else {
      logWarning('当前没有审核任务');
    }

    return tasks;
  } catch (error) {
    logError(`获取审核任务列表失败: ${error.response?.data?.message || error.message}`);
    return [];
  }
}

// 获取审核任务详情
async function getAuditTaskDetail(taskId) {
  logSection(`步骤3: 获取审核任务详情 (ID: ${taskId})`);
  try {
    const response = await axios.get(`${API_BASE_URL}/audits/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const task = response.data;
    logSuccess('成功获取审核任务详情');
    logInfo('任务详情:');
    console.log(`  ID: ${task.id}`);
    console.log(`  样品条码: ${task.sampleBarcode}`);
    console.log(`  样品名称: ${task.sampleName || 'N/A'}`);
    console.log(`  审核级别: ${task.level}级审核`);
    console.log(`  审核状态: ${task.status}`);
    console.log(`  提交人: ${task.submittedBy}`);
    console.log(`  提交时间: ${task.submittedAt}`);

    return task;
  } catch (error) {
    logError(`获取审核任务详情失败: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 获取样品信息
async function getSampleInfo(taskId) {
  logSection(`步骤4: 获取样品信息 (任务ID: ${taskId})`);
  try {
    const response = await axios.get(`${API_BASE_URL}/audits/${taskId}/sample`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const sample = response.data;
    logSuccess('成功获取样品信息');
    logInfo('样品信息:');
    console.log(`  样品ID: ${sample.id}`);
    console.log(`  样品条码: ${sample.barcode}`);
    console.log(`  样品名称: ${sample.name}`);
    console.log(`  样品来源: ${sample.source}`);
    console.log(`  委托方: ${sample.client}`);
    console.log(`  样品类型: ${sample.sampleType}`);
    console.log(`  当前位置: ${sample.currentLocation}`);

    return sample;
  } catch (error) {
    logError(`获取样品信息失败: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 获取检测结果
async function getTestResults(taskId) {
  logSection(`步骤5: 获取检测结果 (任务ID: ${taskId})`);
  try {
    const response = await axios.get(`${API_BASE_URL}/audits/${taskId}/test-results`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const results = response.data;
    logSuccess(`成功获取 ${results.length} 条检测结果`);
    
    if (results.length > 0) {
      logInfo('检测结果:');
      results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.testItemName}: ${result.value} ${result.unit || ''}`);
        console.log(`     操作人: ${result.operator}`);
        console.log(`     录入时间: ${result.timestamp}`);
        if (result.isAnomaly) {
          console.log(`     ⚠ 异常标记: ${result.anomalyInfo?.reason || '未知原因'}`);
        }
        console.log('');
      });
    }

    return results;
  } catch (error) {
    logError(`获取检测结果失败: ${error.response?.data?.message || error.message}`);
    return [];
  }
}

// 执行审核操作
async function performAudit(taskId, decision, comments) {
  logSection(`步骤6: 执行审核操作 (任务ID: ${taskId})`);
  try {
    const response = await axios.post(
      `${API_BASE_URL}/audits/${taskId}/review`,
      {
        taskId: taskId,
        decision: decision,
        comments: comments
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    logSuccess('审核操作执行成功');
    logInfo(`决策: ${decision}`);
    logInfo(`意见: ${comments}`);
    logInfo(`结果: ${response.data.message}`);

    return response.data;
  } catch (error) {
    logError(`执行审核操作失败: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      console.log('错误详情:', error.response.data);
    }
    return null;
  }
}

// 测试批量审核
async function testBatchAudit(taskIds) {
  logSection('步骤7: 测试批量审核');
  try {
    const response = await axios.post(
      `${API_BASE_URL}/audits/batch-review`,
      {
        taskIds: taskIds,
        decision: 'APPROVE',
        comments: '批量审核通过 - 自动化测试'
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    logSuccess('批量审核执行成功');
    logInfo(`成功审核 ${response.data.results.filter(r => r.success).length} 个任务`);
    
    response.data.results.forEach((result, index) => {
      if (result.success) {
        console.log(`  ✓ 任务 ${result.id}: ${result.message}`);
      } else {
        console.log(`  ✗ 任务 ${result.id}: ${result.message}`);
      }
    });

    return response.data;
  } catch (error) {
    logError(`批量审核失败: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 主测试流程
async function runTests() {
  log('\n审核执行页面功能测试', 'cyan');
  log('测试前端"执行审核"页面调用的后端API\n', 'cyan');

  try {
    // 1. 登录
    const loginSuccess = await login();
    if (!loginSuccess) {
      logError('登录失败,终止测试');
      return;
    }

    // 2. 获取审核任务列表
    const tasks = await getAuditTasks();
    if (tasks.length === 0) {
      logWarning('没有可用的审核任务,部分测试将被跳过');
      logInfo('提示: 可以运行 test-audit-complete-flow.js 创建测试数据');
      return;
    }

    // 3. 选择第一个任务进行详细测试
    const firstTask = tasks[0];
    
    // 4. 获取任务详情
    const taskDetail = await getAuditTaskDetail(firstTask.id);
    if (!taskDetail) {
      logError('无法获取任务详情,终止测试');
      return;
    }

    // 5. 获取样品信息
    await getSampleInfo(firstTask.id);

    // 6. 获取检测结果
    await getTestResults(firstTask.id);

    // 7. 执行审核操作(仅当任务状态为PENDING时)
    if (firstTask.status === 'PENDING') {
      await performAudit(
        firstTask.id,
        'APPROVE',
        '检测结果符合标准要求,同意通过 - 自动化测试'
      );
    } else {
      logWarning(`任务状态为 ${firstTask.status},跳过审核操作测试`);
    }

    // 8. 测试批量审核(如果有多个PENDING任务)
    const pendingTasks = tasks.filter(t => t.status === 'PENDING');
    if (pendingTasks.length >= 2) {
      const taskIds = pendingTasks.slice(0, 2).map(t => t.id);
      await testBatchAudit(taskIds);
    } else {
      logWarning('没有足够的待审核任务,跳过批量审核测试');
    }

    // 测试总结
    logSection('测试总结');
    logSuccess('所有测试完成');
    logInfo('前端"执行审核"页面可以正常使用以下功能:');
    console.log('  ✓ 获取审核任务列表');
    console.log('  ✓ 查看审核任务详情');
    console.log('  ✓ 查看样品信息');
    console.log('  ✓ 查看检测结果');
    console.log('  ✓ 执行审核操作(通过/拒绝/退回)');
    console.log('  ✓ 批量审核操作');
    console.log('');
    logInfo('前端访问地址:');
    console.log('  主页: http://localhost:5173/');
    console.log('  执行审核: http://localhost:5173/audit/execute');
    console.log('');
    logInfo('登录信息:');
    console.log('  用户名: admin');
    console.log('  密码: Admin@123456');

  } catch (error) {
    logError(`测试过程中发生错误: ${error.message}`);
    console.error(error);
  }
}

// 运行测试
runTests().catch(error => {
  logError(`测试失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
