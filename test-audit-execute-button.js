/**
 * 测试审核执行通过按钮功能
 * 
 * 验证:
 * 1. 审核通过操作是否成功执行
 * 2. 审核任务状态是否正确更新
 * 3. 审核历史是否正确记录
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

// 测试凭证
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

let authToken = '';

// 登录获取 token
async function login() {
  try {
    console.log('\n=== 1. 登录系统 ===');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data && response.data.data) {
      // FastAPI 后端返回的是 accessToken
      const token = response.data.data.accessToken || response.data.data.token;
      if (token) {
        authToken = token;
        console.log('✓ 登录成功');
        console.log('Token:', authToken.substring(0, 20) + '...');
        return true;
      }
    }
    
    console.error('✗ 登录失败: 响应格式不正确');
    console.error('响应:', JSON.stringify(response.data, null, 2));
    return false;
  } catch (error) {
    console.error('✗ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

// 获取待审核任务列表
async function getPendingAuditTasks() {
  try {
    console.log('\n=== 2. 获取待审核任务列表 ===');
    const response = await axios.get(`${API_BASE_URL}/audits`, {
      params: {
        status: 'PENDING',
        page: 1,
        pageSize: 20
      },
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data && response.data.data) {
      const tasks = response.data.data.items || [];
      console.log(`✓ 获取到 ${tasks.length} 个待审核任务`);
      
      if (tasks.length > 0) {
        console.log('\n待审核任务列表:');
        tasks.forEach((task, index) => {
          console.log(`  ${index + 1}. 任务ID: ${task.id}`);
          console.log(`     样品条码: ${task.sample?.barcode || 'N/A'}`);
          console.log(`     审核级别: ${task.level}`);
          console.log(`     状态: ${task.status}`);
          console.log(`     审核人: ${task.auditorId}`);
        });
        
        // 查找分配给当前用户(admin)的任务
        // admin 的 ID 是 6131a3e5-b3cb-4c39-9219-368da5de29b8
        const adminTask = tasks.find(t => t.auditorId === '6131a3e5-b3cb-4c39-9219-368da5de29b8');
        
        if (adminTask) {
          console.log(`\n✓ 找到分配给 admin 用户的任务: ${adminTask.id}`);
          return adminTask;
        } else {
          console.log('\n⚠ 没有找到分配给 admin 用户的任务，使用第一个任务');
          return tasks[0];
        }
      } else {
        console.log('⚠ 没有待审核任务');
        return null;
      }
    } else {
      console.error('✗ 获取任务列表失败: 响应格式不正确');
      return null;
    }
  } catch (error) {
    console.error('✗ 获取任务列表失败:', error.response?.data || error.message);
    return null;
  }
}

// 获取审核任务详情
async function getAuditTaskDetail(taskId) {
  try {
    console.log(`\n=== 3. 获取审核任务详情 (ID: ${taskId}) ===`);
    const response = await axios.get(`${API_BASE_URL}/audits/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data && response.data.data) {
      const task = response.data.data;
      console.log('✓ 获取任务详情成功');
      console.log('\n任务信息:');
      console.log(`  任务ID: ${task.id}`);
      console.log(`  样品ID: ${task.sampleId}`);
      console.log(`  样品条码: ${task.sample?.barcode || 'N/A'}`);
      console.log(`  样品名称: ${task.sample?.sampleName || 'N/A'}`);
      console.log(`  审核级别: ${task.level}`);
      console.log(`  状态: ${task.status}`);
      console.log(`  审核人: ${task.auditorId}`);
      
      // 检查样品信息完整性
      if (task.sample) {
        console.log('\n样品详细信息:');
        console.log(`  客户名称: ${task.sample.clientName || 'N/A'}`);
        console.log(`  采样日期: ${task.sample.samplingDate || 'N/A'}`);
        console.log(`  接收日期: ${task.sample.receivedDate || 'N/A'}`);
        console.log(`  检测结果数量: ${task.sample.results?.length || 0}`);
      }
      
      return task;
    } else {
      console.error('✗ 获取任务详情失败: 响应格式不正确');
      return null;
    }
  } catch (error) {
    console.error('✗ 获取任务详情失败:', error.response?.data || error.message);
    return null;
  }
}

// 执行审核通过操作
async function performAuditApprove(taskId) {
  try {
    console.log(`\n=== 4. 执行审核通过操作 (ID: ${taskId}) ===`);
    
    const auditDecision = {
      decision: 'APPROVE',
      comments: '审核通过，样品信息完整，检测结果符合要求。'
    };
    
    console.log('发送审核决策:', JSON.stringify(auditDecision, null, 2));
    
    const response = await axios.post(
      `${API_BASE_URL}/audits/${taskId}/execute`,
      auditDecision,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data) {
      console.log('✓ 审核通过操作成功');
      console.log('\n审核结果:');
      console.log(JSON.stringify(response.data, null, 2));
      
      if (response.data.data) {
        const result = response.data.data;
        console.log('\n详细结果:');
        console.log(`  任务ID: ${result.taskId}`);
        console.log(`  样品ID: ${result.sampleId}`);
        console.log(`  审核级别: ${result.level}`);
        console.log(`  决策: ${result.decision}`);
        console.log(`  是否完成: ${result.isComplete}`);
        console.log(`  下一级别: ${result.nextLevel || '无'}`);
        console.log(`  消息: ${result.message}`);
      }
      
      return true;
    } else {
      console.error('✗ 审核通过操作失败: 响应格式不正确');
      return false;
    }
  } catch (error) {
    console.error('✗ 审核通过操作失败');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('错误:', error.message);
    }
    return false;
  }
}

// 验证任务状态更新
async function verifyTaskStatusUpdate(taskId) {
  try {
    console.log(`\n=== 5. 验证任务状态更新 (ID: ${taskId}) ===`);
    
    // 等待一下让数据库更新
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await axios.get(`${API_BASE_URL}/audits/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data && response.data.data) {
      const task = response.data.data;
      console.log('✓ 获取更新后的任务状态');
      console.log(`  状态: ${task.status}`);
      console.log(`  决策: ${task.decision || 'N/A'}`);
      console.log(`  完成时间: ${task.completedAt || 'N/A'}`);
      console.log(`  审核意见: ${task.comments || 'N/A'}`);
      
      if (task.status === 'APPROVED' && task.decision === 'APPROVE') {
        console.log('✓ 任务状态已正确更新为 APPROVED');
        return true;
      } else {
        console.error(`✗ 任务状态未正确更新: 期望 APPROVED，实际 ${task.status}`);
        return false;
      }
    } else {
      console.error('✗ 获取任务状态失败');
      return false;
    }
  } catch (error) {
    console.error('✗ 验证任务状态失败:', error.response?.data || error.message);
    return false;
  }
}

// 检查审核历史记录
async function checkAuditHistory(taskId) {
  try {
    console.log(`\n=== 6. 检查审核历史记录 (ID: ${taskId}) ===`);
    const response = await axios.get(`${API_BASE_URL}/audits/${taskId}/history`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data && response.data.data) {
      const history = response.data.data;
      console.log(`✓ 获取到 ${history.length} 条审核历史记录`);
      
      if (history.length > 0) {
        console.log('\n审核历史:');
        history.forEach((record, index) => {
          console.log(`  ${index + 1}. 操作: ${record.action}`);
          console.log(`     操作人: ${record.performedBy}`);
          console.log(`     时间: ${record.performedAt}`);
          if (record.changes) {
            console.log(`     变更: ${JSON.stringify(record.changes)}`);
          }
        });
        
        // 检查是否有审核操作记录
        const reviewRecord = history.find(r => r.action === 'review');
        if (reviewRecord) {
          console.log('\n✓ 找到审核操作记录');
          return true;
        } else {
          console.log('\n⚠ 未找到审核操作记录');
          return false;
        }
      } else {
        console.log('⚠ 没有审核历史记录');
        return false;
      }
    } else {
      console.error('✗ 获取审核历史失败');
      return false;
    }
  } catch (error) {
    console.error('✗ 获取审核历史失败:', error.response?.data || error.message);
    return false;
  }
}

// 检查审核任务列表中的状态变化
async function checkTaskListStatusChange(taskId) {
  try {
    console.log(`\n=== 7. 检查审核任务列表中的状态变化 ===`);
    
    // 获取已完成的任务列表
    const response = await axios.get(`${API_BASE_URL}/audits`, {
      params: {
        status: 'APPROVED',
        page: 1,
        pageSize: 20
      },
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data && response.data.data) {
      const tasks = response.data.data.items || [];
      console.log(`✓ 获取到 ${tasks.length} 个已通过的审核任务`);
      
      // 查找我们刚才审核的任务
      const approvedTask = tasks.find(t => t.id === taskId);
      
      if (approvedTask) {
        console.log('\n✓ 在已通过任务列表中找到该任务');
        console.log(`  任务ID: ${approvedTask.id}`);
        console.log(`  状态: ${approvedTask.status}`);
        console.log(`  决策: ${approvedTask.decision}`);
        return true;
      } else {
        console.log('\n⚠ 在已通过任务列表中未找到该任务');
        console.log('可能原因: 任务可能在待审核列表中，或者需要刷新');
        return false;
      }
    } else {
      console.error('✗ 获取任务列表失败');
      return false;
    }
  } catch (error) {
    console.error('✗ 检查任务列表失败:', error.response?.data || error.message);
    return false;
  }
}

// 主测试流程
async function runTest() {
  console.log('========================================');
  console.log('审核执行通过按钮功能测试');
  console.log('========================================');
  
  try {
    // 1. 登录
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.error('\n测试失败: 无法登录');
      return;
    }
    
    // 2. 获取待审核任务
    const pendingTask = await getPendingAuditTasks();
    if (!pendingTask) {
      console.error('\n测试失败: 没有待审核任务');
      console.log('\n提示: 请先创建一些待审核的任务');
      return;
    }
    
    const taskId = pendingTask.id;
    
    // 3. 获取任务详情
    const taskDetail = await getAuditTaskDetail(taskId);
    if (!taskDetail) {
      console.error('\n测试失败: 无法获取任务详情');
      return;
    }
    
    // 4. 执行审核通过操作
    const approveSuccess = await performAuditApprove(taskId);
    if (!approveSuccess) {
      console.error('\n测试失败: 审核通过操作失败');
      return;
    }
    
    // 5. 验证任务状态更新
    const statusUpdated = await verifyTaskStatusUpdate(taskId);
    if (!statusUpdated) {
      console.error('\n测试失败: 任务状态未正确更新');
      return;
    }
    
    // 6. 检查审核历史
    const historyRecorded = await checkAuditHistory(taskId);
    if (!historyRecorded) {
      console.warn('\n警告: 审核历史记录可能不完整');
    }
    
    // 7. 检查任务列表状态变化
    const listUpdated = await checkTaskListStatusChange(taskId);
    if (!listUpdated) {
      console.warn('\n警告: 任务列表中的状态可能未及时更新');
    }
    
    // 测试总结
    console.log('\n========================================');
    console.log('测试总结');
    console.log('========================================');
    console.log('✓ 登录成功');
    console.log('✓ 获取待审核任务成功');
    console.log('✓ 获取任务详情成功');
    console.log(approveSuccess ? '✓ 审核通过操作成功' : '✗ 审核通过操作失败');
    console.log(statusUpdated ? '✓ 任务状态更新成功' : '✗ 任务状态更新失败');
    console.log(historyRecorded ? '✓ 审核历史记录成功' : '⚠ 审核历史记录可能不完整');
    console.log(listUpdated ? '✓ 任务列表状态更新成功' : '⚠ 任务列表状态可能未及时更新');
    
    if (approveSuccess && statusUpdated) {
      console.log('\n✓✓✓ 所有核心功能测试通过 ✓✓✓');
    } else {
      console.log('\n✗✗✗ 部分测试失败 ✗✗✗');
    }
    
  } catch (error) {
    console.error('\n测试过程中发生错误:', error.message);
  }
}

// 运行测试
runTest();
