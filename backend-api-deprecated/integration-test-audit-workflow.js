/**
 * 审核管理集成测试
 * 测试完整的审核流程：任务创建 → 提交审核 → 审核批准 → 任务完成
 */

const { PrismaClient, AuditStatus, AuditDecision } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api';

// 测试用户
const TEST_USER = {
  username: 'test_auditor',
  password: 'Test123!@#'
};

// 测试结果
const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

/**
 * 登录并获取令牌
 */
async function login() {
  const response = await axios.post(`${API_URL}/auth/login`, TEST_USER);
  return response.data.data.accessToken;
}

/**
 * 创建 API 客户端
 */
function createApiClient(token) {
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * 测试用例：记录结果
 */
function recordTest(name, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`   ✓ ${name}`);
  } else {
    testResults.failed++;
    console.log(`   ✗ ${name}`);
    if (error) {
      console.log(`      错误: ${error.message || error}`);
    }
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  console.log('清理测试数据...');
  
  // 删除测试创建的审核任务
  await prisma.auditTask.deleteMany({
    where: {
      task: {
        nodeName: {
          contains: '集成测试'
        }
      }
    }
  });
  
  // 删除测试创建的任务
  await prisma.task.deleteMany({
    where: {
      nodeName: {
        contains: '集成测试'
      }
    }
  });
  
  // 删除测试创建的工作流实例
  await prisma.workflowInstance.deleteMany({
    where: {
      sample: {
        sampleName: {
          contains: '集成测试'
        }
      }
    }
  });
  
  // 删除测试创建的样品
  await prisma.sample.deleteMany({
    where: {
      sampleName: {
        contains: '集成测试'
      }
    }
  });
  
  console.log('✓ 测试数据清理完成\n');
}

/**
 * 创建测试数据
 */
async function createTestData() {
  console.log('创建测试数据...');
  
  const timestamp = Date.now();
  
  // 1. 创建样品
  const sample = await prisma.sample.create({
    data: {
      barcode: `INT-TEST-${timestamp}`,
      sampleNumber: `SN-INT-${timestamp}`,
      sampleName: '集成测试样品',
      sampleType: '水质',
      sampleCategory: '环境监测',
      clientName: '集成测试客户',
      quantity: 500,
      unit: 'mL',
      receivedDate: new Date(),
      status: 'IN_TESTING',
      priority: 'NORMAL',
      createdBy: 'admin'
    }
  });
  
  // 2. 创建工作流
  const workflow = await prisma.workflow.findFirst({
    where: { isActive: true }
  });
  
  let workflowId;
  if (workflow) {
    workflowId = workflow.id;
  } else {
    const newWorkflow = await prisma.workflow.create({
      data: {
        name: '集成测试工作流',
        version: 1,
        config: { nodes: [], edges: [] },
        status: 'ACTIVE',
        isActive: true,
        createdBy: 'admin'
      }
    });
    workflowId = newWorkflow.id;
  }
  
  // 3. 创建工作流实例
  const instance = await prisma.workflowInstance.create({
    data: {
      workflowId,
      sampleId: sample.id,
      status: 'RUNNING',
      currentNodes: ['node-int-test']
    }
  });
  
  // 4. 更新样品的 workflowInstanceId
  await prisma.sample.update({
    where: { id: sample.id },
    data: { workflowInstanceId: instance.id }
  });
  
  // 5. 创建任务
  const task = await prisma.task.create({
    data: {
      instanceId: instance.id,
      nodeId: 'node-int-test',
      nodeName: '集成测试任务',
      nodeType: 'TASK',
      assignedTo: 'analyst-001',
      status: 'COMPLETED',
      priority: 'NORMAL'
    }
  });
  
  console.log(`✓ 测试数据创建完成`);
  console.log(`  样品ID: ${sample.id}`);
  console.log(`  任务ID: ${task.id}\n`);
  
  return { sample, task, instance };
}

/**
 * 测试场景1: 提交审核
 */
async function testSubmitAudit(api, taskId, auditorId) {
  console.log('场景1: 提交审核');
  
  try {
    // 提交审核
    const response = await api.post('/audits', {
      taskId,
      auditConfig: {
        levels: [
          { level: 1, name: '初审', auditorIds: [auditorId], autoAssign: true },
          { level: 2, name: '复审', auditorIds: [auditorId], autoAssign: true }
        ]
      }
    });
    
    recordTest('提交审核成功', response.status === 201);
    recordTest('创建了2个审核任务', response.data.data.length === 2);
    recordTest('审核任务关联到 taskId', response.data.data[0].taskId === taskId);
    
    return response.data.data;
  } catch (error) {
    recordTest('提交审核', false, error);
    throw error;
  }
}

/**
 * 测试场景2: 查询审核任务
 */
async function testQueryAuditTasks(api, taskId) {
  console.log('\n场景2: 查询审核任务');
  
  try {
    // 查询审核任务列表
    const listResponse = await api.get('/audits', {
      params: { taskId }
    });
    
    recordTest('查询审核任务列表成功', listResponse.status === 200);
    recordTest('筛选结果正确', listResponse.data.data.items.length === 2);
    
    const auditTaskId = listResponse.data.data.items[0].id;
    
    // 查询审核任务详情
    const detailResponse = await api.get(`/audits/${auditTaskId}`);
    
    recordTest('查询审核任务详情成功', detailResponse.status === 200);
    recordTest('包含关联任务信息', !!detailResponse.data.data.task);
    recordTest('包含关联样品信息', !!detailResponse.data.data.task.instance.sample);
    recordTest('样品信息正确', detailResponse.data.data.task.instance.sample.sampleName === '集成测试样品');
    
    return listResponse.data.data.items;
  } catch (error) {
    recordTest('查询审核任务', false, error);
    throw error;
  }
}

/**
 * 测试场景3: 执行审核（第1级）
 */
async function testPerformAudit(api, auditTasks) {
  console.log('\n场景3: 执行审核（第1级）');
  
  try {
    const level1Task = auditTasks.find(t => t.level === 1);
    
    // 执行审核 - 批准
    const response = await api.post(`/audits/${level1Task.id}/review`, {
      decision: 'APPROVE',
      comments: '集成测试：第1级审核通过'
    });
    
    recordTest('第1级审核成功', response.status === 200);
    recordTest('审核决策正确', response.data.data.decision === 'APPROVE');
    recordTest('进入下一级审核', response.data.data.nextLevel === 2);
    recordTest('审核未完成', !response.data.data.isComplete);
    
    return response.data.data;
  } catch (error) {
    recordTest('执行第1级审核', false, error);
    throw error;
  }
}

/**
 * 测试场景4: 执行审核（第2级）
 */
async function testPerformFinalAudit(api, auditTasks) {
  console.log('\n场景4: 执行审核（第2级）');
  
  try {
    const level2Task = auditTasks.find(t => t.level === 2);
    
    // 执行审核 - 批准
    const response = await api.post(`/audits/${level2Task.id}/review`, {
      decision: 'APPROVE',
      comments: '集成测试：第2级审核通过'
    });
    
    recordTest('第2级审核成功', response.status === 200);
    recordTest('审核决策正确', response.data.data.decision === 'APPROVE');
    recordTest('审核已完成', response.data.data.isComplete);
    recordTest('无下一级审核', !response.data.data.nextLevel);
    
    return response.data.data;
  } catch (error) {
    recordTest('执行第2级审核', false, error);
    throw error;
  }
}

/**
 * 测试场景5: 验证任务状态
 */
async function testVerifyTaskStatus(taskId) {
  console.log('\n场景5: 验证任务状态');
  
  try {
    // 查询任务状态
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });
    
    recordTest('任务状态保持为 COMPLETED', task.status === 'COMPLETED');
    
    // 查询审核任务状态
    const auditTasks = await prisma.auditTask.findMany({
      where: { taskId }
    });
    
    const allApproved = auditTasks.every(t => t.status === 'APPROVED');
    recordTest('所有审核任务状态为 APPROVED', allApproved);
    
    return { task, auditTasks };
  } catch (error) {
    recordTest('验证任务状态', false, error);
    throw error;
  }
}

/**
 * 测试场景6: 审核退回流程
 */
async function testAuditReturn(api, taskId, auditorId) {
  console.log('\n场景6: 审核退回流程');
  
  try {
    // 创建新的审核任务
    const submitResponse = await api.post('/audits', {
      taskId,
      auditConfig: {
        levels: [
          { level: 1, name: '初审', auditorIds: [auditorId], autoAssign: true }
        ]
      }
    });
    
    const auditTaskId = submitResponse.data.data[0].id;
    
    // 执行审核 - 退回
    const returnResponse = await api.post(`/audits/${auditTaskId}/review`, {
      decision: 'RETURN',
      comments: '集成测试：审核退回'
    });
    
    recordTest('审核退回成功', returnResponse.status === 200);
    recordTest('审核决策为 RETURN', returnResponse.data.data.decision === 'RETURN');
    
    // 验证任务状态改为 PENDING
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });
    
    recordTest('任务状态改为 PENDING', task.status === 'PENDING');
    
    return returnResponse.data.data;
  } catch (error) {
    recordTest('审核退回流程', false, error);
    throw error;
  }
}

/**
 * 主测试函数
 */
async function runIntegrationTests() {
  console.log('=== 审核管理集成测试 ===\n');
  console.log(`API 地址: ${API_URL}`);
  console.log(`测试用户: ${TEST_USER.username}\n`);
  
  let testData = null;
  
  try {
    // 清理旧的测试数据
    await cleanupTestData();
    
    // 创建测试数据
    testData = await createTestData();
    
    // 登录
    console.log('登录系统...');
    const token = await login();
    console.log('✓ 登录成功\n');
    
    const api = createApiClient(token);
    
    // 获取测试用户ID
    const user = await prisma.user.findUnique({
      where: { username: TEST_USER.username }
    });
    
    if (!user) {
      throw new Error('测试用户不存在');
    }
    
    const auditorId = user.id;
    console.log(`测试用户ID: ${auditorId}\n`);
    
    // 执行测试场景
    const auditTasks = await testSubmitAudit(api, testData.task.id, auditorId);
    await testQueryAuditTasks(api, testData.task.id);
    await testPerformAudit(api, auditTasks);
    await testPerformFinalAudit(api, auditTasks);
    await testVerifyTaskStatus(testData.task.id);
    await testAuditReturn(api, testData.task.id, auditorId);
    
    // 打印测试结果
    console.log('\n=== 测试结果 ===');
    console.log(`总计: ${testResults.total} 个测试`);
    console.log(`通过: ${testResults.passed} 个 ✓`);
    console.log(`失败: ${testResults.failed} 个 ✗`);
    console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed === 0) {
      console.log('\n✅ 所有集成测试通过！');
    } else {
      console.log('\n❌ 部分测试失败，请检查错误信息');
    }
    
  } catch (error) {
    console.error('\n❌ 集成测试失败:', error.message);
    console.error(error);
  } finally {
    // 清理测试数据
    if (testData) {
      console.log('\n清理测试数据...');
      await cleanupTestData();
    }
    
    await prisma.$disconnect();
  }
}

// 运行测试
runIntegrationTests();
