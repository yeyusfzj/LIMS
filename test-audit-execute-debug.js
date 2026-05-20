/**
 * 审核执行页面调试测试
 * 测试从列表到执行页面的完整流程
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const FRONTEND_URL = 'http://localhost:5173';

// 测试用户凭证
const credentials = {
  username: 'admin',
  password: 'Admin@123456'
};

let authToken = '';

// 登录获取token
async function login() {
  try {
    console.log('\n=== 1. 登录系统 ===');
    const response = await axios.post(`${BASE_URL}/auth/login`, credentials);
    
    if (response.data.data && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✓ 登录成功');
      console.log('Token:', authToken.substring(0, 20) + '...');
      return true;
    } else {
      console.error('✗ 登录失败: 未获取到token');
      return false;
    }
  } catch (error) {
    console.error('✗ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

// 获取审核任务列表
async function getAuditTasks() {
  try {
    console.log('\n=== 2. 获取审核任务列表 ===');
    const response = await axios.get(`${BASE_URL}/audits`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        status: 'PENDING',
        page: 1,
        pageSize: 5
      }
    });
    
    console.log('✓ 获取任务列表成功');
    console.log('返回数据结构:', Object.keys(response.data));
    console.log('任务数量:', response.data.data?.items?.length || 0);
    
    if (response.data.data?.items && response.data.data.items.length > 0) {
      const firstTask = response.data.data.items[0];
      console.log('\n第一个任务详情:');
      console.log('- ID:', firstTask.id);
      console.log('- 状态:', firstTask.status);
      console.log('- 级别:', firstTask.level);
      console.log('- 样品ID:', firstTask.sampleId);
      console.log('- 审核人ID:', firstTask.auditorId);
      console.log('- 提交时间:', firstTask.submittedAt);
      
      if (firstTask.sample) {
        console.log('- 样品信息:');
        console.log('  * 条码:', firstTask.sample.barcode);
        console.log('  * 名称:', firstTask.sample.sampleName);
        console.log('  * 类型:', firstTask.sample.sampleType);
        console.log('  * 客户:', firstTask.sample.clientName);
        console.log('  * 检测结果数量:', firstTask.sample.results?.length || 0);
      }
      
      return firstTask;
    } else {
      console.log('⚠ 没有待审核任务');
      return null;
    }
  } catch (error) {
    console.error('✗ 获取任务列表失败:', error.response?.data || error.message);
    return null;
  }
}

// 获取单个审核任务详情
async function getAuditTaskDetail(taskId) {
  try {
    console.log('\n=== 3. 获取审核任务详情 ===');
    console.log('任务ID:', taskId);
    
    const response = await axios.get(`${BASE_URL}/audits/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('✓ 获取任务详情成功');
    console.log('返回数据结构:', Object.keys(response.data));
    
    const task = response.data.data;
    console.log('\n任务详情:');
    console.log('- ID:', task.id);
    console.log('- 状态:', task.status);
    console.log('- 级别:', task.level);
    console.log('- 样品ID:', task.sampleId);
    console.log('- 审核人ID:', task.auditorId);
    
    if (task.sample) {
      console.log('- 样品信息:');
      console.log('  * ID:', task.sample.id);
      console.log('  * 条码:', task.sample.barcode);
      console.log('  * 名称:', task.sample.sampleName);
      console.log('  * 类型:', task.sample.sampleType);
      console.log('  * 客户:', task.sample.clientName);
      console.log('  * 优先级:', task.sample.priority);
      console.log('  * 采样日期:', task.sample.samplingDate);
      console.log('  * 接收日期:', task.sample.receivedDate);
      
      if (task.sample.results && task.sample.results.length > 0) {
        console.log('  * 检测结果:');
        task.sample.results.forEach((result, index) => {
          console.log(`    ${index + 1}. ${result.parameter || '未知项目'}: ${result.value || result.textValue} ${result.unit || ''}`);
          console.log(`       来源: ${result.source}, 操作人: ${result.enteredBy}`);
          console.log(`       异常: ${result.isAbnormal ? '是' : '否'}`);
        });
      } else {
        console.log('  * 检测结果: 无');
      }
    } else {
      console.log('⚠ 没有样品信息');
    }
    
    return task;
  } catch (error) {
    console.error('✗ 获取任务详情失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    }
    return null;
  }
}

// 获取审核历史
async function getAuditHistory(taskId) {
  try {
    console.log('\n=== 4. 获取审核历史 ===');
    console.log('任务ID:', taskId);
    
    const response = await axios.get(`${BASE_URL}/audits/tasks/${taskId}/history`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('✓ 获取审核历史成功');
    console.log('历史记录数量:', response.data.data?.length || 0);
    
    if (response.data.data && response.data.data.length > 0) {
      response.data.data.forEach((record, index) => {
        console.log(`\n记录 ${index + 1}:`);
        console.log('- 操作:', record.action);
        console.log('- 结果:', record.result);
        console.log('- 操作人:', record.operator);
        console.log('- 时间:', record.timestamp);
        if (record.comments) {
          console.log('- 意见:', record.comments);
        }
      });
    } else {
      console.log('⚠ 没有审核历史记录');
    }
    
    return response.data.data;
  } catch (error) {
    console.error('✗ 获取审核历史失败:', error.response?.data || error.message);
    return null;
  }
}

// 前端数据转换测试
function testFrontendDataTransform(backendTask) {
  console.log('\n=== 5. 前端数据转换测试 ===');
  
  // 审核级别名称映射
  const levelNames = {
    1: '分析审核',
    2: '样品审核',
    3: '技术审核',
    4: '质量审核'
  };
  
  // 模拟前端转换
  const frontendTask = {
    ...backendTask,
    status: backendTask.status?.toLowerCase() || 'pending',
    auditor: backendTask.auditorId || 'UNASSIGNED',
    sampleName: backendTask.sample?.sampleName || '',
    sampleBarcode: backendTask.sample?.barcode || '',
    levelName: levelNames[backendTask.level] || `级别${backendTask.level}`,
    priority: backendTask.sample?.priority?.toLowerCase() || 'normal'
  };
  
  console.log('转换后的数据:');
  console.log('- status:', frontendTask.status, '(原始:', backendTask.status + ')');
  console.log('- auditor:', frontendTask.auditor);
  console.log('- sampleName:', frontendTask.sampleName);
  console.log('- sampleBarcode:', frontendTask.sampleBarcode);
  console.log('- levelName:', frontendTask.levelName);
  console.log('- priority:', frontendTask.priority);
  
  // 检测结果转换
  if (backendTask.sample?.results) {
    console.log('\n检测结果转换:');
    const testResults = backendTask.sample.results.map((result) => ({
      id: result.id,
      sampleId: result.sampleId,
      testItemName: result.parameter || '未知项目',
      value: result.value || result.textValue,
      unit: result.unit || '',
      method: result.method || '',
      source: result.source?.toLowerCase() || 'manual',
      operator: result.enteredBy || '',
      timestamp: result.enteredAt,
      isAnomaly: result.isAbnormal || false
    }));
    
    console.log('转换后的检测结果数量:', testResults.length);
    if (testResults.length > 0) {
      console.log('第一条结果:', testResults[0]);
    }
  }
  
  return frontendTask;
}

// 生成前端访问URL
function generateFrontendUrl(taskId) {
  console.log('\n=== 6. 前端访问URL ===');
  const url = `${FRONTEND_URL}/#/audit/execute?taskId=${taskId}`;
  console.log('审核执行页面URL:', url);
  console.log('\n请在浏览器中打开上述URL，并检查:');
  console.log('1. 页面是否正常加载（不是空白）');
  console.log('2. 是否显示任务基本信息');
  console.log('3. 是否显示样品信息');
  console.log('4. 是否显示检测结果表格');
  console.log('5. 是否显示审核意见表单');
  console.log('6. 浏览器控制台是否有错误');
  
  return url;
}

// 主测试流程
async function main() {
  console.log('========================================');
  console.log('审核执行页面调试测试');
  console.log('========================================');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('\n测试终止: 登录失败');
    return;
  }
  
  // 2. 获取任务列表
  const firstTask = await getAuditTasks();
  if (!firstTask) {
    console.error('\n测试终止: 没有可用的审核任务');
    return;
  }
  
  // 3. 获取任务详情
  const taskDetail = await getAuditTaskDetail(firstTask.id);
  if (!taskDetail) {
    console.error('\n测试终止: 无法获取任务详情');
    return;
  }
  
  // 4. 获取审核历史
  await getAuditHistory(firstTask.id);
  
  // 5. 测试前端数据转换
  const frontendTask = testFrontendDataTransform(taskDetail);
  
  // 6. 生成前端访问URL
  const frontendUrl = generateFrontendUrl(firstTask.id);
  
  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
  console.log('\n下一步操作:');
  console.log('1. 复制上面的URL在浏览器中打开');
  console.log('2. 打开浏览器开发者工具（F12）');
  console.log('3. 查看Console标签页的错误信息');
  console.log('4. 查看Network标签页的API请求');
  console.log('5. 检查页面是否正常显示内容');
}

// 运行测试
main().catch(error => {
  console.error('\n测试过程中发生错误:', error);
  process.exit(1);
});
