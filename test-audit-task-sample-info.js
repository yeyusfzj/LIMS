/**
 * 测试审核任务样品信息和检测结果
 * 验证修复后的 API 是否返回完整的样品信息和检测结果
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

// 测试用户凭证
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

let authToken = '';

/**
 * 登录获取 token
 */
async function login() {
  try {
    console.log('🔐 正在登录...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    authToken = response.data.data.accessToken;
    console.log('✅ 登录成功\n');
    return authToken;
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 获取审核任务列表
 */
async function getAuditTasks() {
  try {
    console.log('📋 获取审核任务列表...');
    const response = await axios.get(`${API_BASE_URL}/audits`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, pageSize: 10 }
    });
    
    const tasks = response.data.data.items;
    console.log(`✅ 获取到 ${tasks.length} 个审核任务\n`);
    return tasks;
  } catch (error) {
    console.error('❌ 获取审核任务列表失败:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 获取审核任务详情
 */
async function getAuditTaskDetail(taskId) {
  try {
    console.log(`📄 获取审核任务详情 (taskId: ${taskId})...`);
    const response = await axios.get(`${API_BASE_URL}/audits/${taskId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const task = response.data.data;
    console.log('✅ 获取审核任务详情成功\n');
    return task;
  } catch (error) {
    console.error('❌ 获取审核任务详情失败:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 验证样品信息完整性
 */
function validateSampleInfo(sample) {
  console.log('🔍 验证样品信息完整性...');
  
  const requiredFields = [
    'id', 'barcode', 'sampleNumber', 'sampleName', 'sampleType',
    'clientName', 'samplingDate', 'receivedDate', 'status'
  ];
  
  const missingFields = [];
  const presentFields = [];
  
  for (const field of requiredFields) {
    if (sample[field] === undefined || sample[field] === null) {
      missingFields.push(field);
    } else {
      presentFields.push(field);
    }
  }
  
  console.log(`✅ 存在的字段 (${presentFields.length}/${requiredFields.length}):`);
  presentFields.forEach(field => {
    console.log(`   - ${field}: ${sample[field]}`);
  });
  
  if (missingFields.length > 0) {
    console.log(`⚠️  缺失的字段 (${missingFields.length}):`);
    missingFields.forEach(field => {
      console.log(`   - ${field}`);
    });
  }
  
  console.log('');
  return missingFields.length === 0;
}

/**
 * 验证检测结果
 */
function validateTestResults(results) {
  console.log('🔍 验证检测结果...');
  
  if (!results || !Array.isArray(results)) {
    console.log('❌ 检测结果不存在或格式错误');
    return false;
  }
  
  if (results.length === 0) {
    console.log('⚠️  检测结果为空数组');
    return false;
  }
  
  console.log(`✅ 检测结果数量: ${results.length}`);
  
  // 显示前3条检测结果
  const displayCount = Math.min(3, results.length);
  console.log(`\n📊 前 ${displayCount} 条检测结果:`);
  
  for (let i = 0; i < displayCount; i++) {
    const result = results[i];
    console.log(`\n   结果 ${i + 1}:`);
    console.log(`   - 检测参数: ${result.parameter || '未知'}`);
    console.log(`   - 检测值: ${result.value || result.textValue || 'N/A'}`);
    console.log(`   - 单位: ${result.unit || 'N/A'}`);
    console.log(`   - 检测方法: ${result.method || 'N/A'}`);
    console.log(`   - 结果来源: ${result.source || 'N/A'}`);
    console.log(`   - 是否异常: ${result.isAbnormal ? '是' : '否'}`);
    console.log(`   - 录入人: ${result.enteredBy || 'N/A'}`);
  }
  
  console.log('');
  return true;
}

/**
 * 主测试流程
 */
async function main() {
  console.log('='.repeat(60));
  console.log('审核任务样品信息和检测结果测试');
  console.log('='.repeat(60));
  console.log('');
  
  try {
    // 1. 登录
    await login();
    
    // 2. 获取审核任务列表
    const tasks = await getAuditTasks();
    
    if (tasks.length === 0) {
      console.log('⚠️  没有审核任务可供测试');
      return;
    }
    
    // 3. 获取第一个审核任务的详情
    const firstTask = tasks[0];
    console.log(`📌 测试任务: ${firstTask.id}`);
    console.log(`   样品ID: ${firstTask.sampleId}`);
    console.log(`   审核级别: ${firstTask.level}`);
    console.log(`   状态: ${firstTask.status}\n`);
    
    const taskDetail = await getAuditTaskDetail(firstTask.id);
    
    // 4. 验证样品信息
    if (!taskDetail.sample) {
      console.log('❌ 样品信息不存在');
      return;
    }
    
    const sampleInfoValid = validateSampleInfo(taskDetail.sample);
    
    // 5. 验证检测结果
    const resultsValid = validateTestResults(taskDetail.sample.results);
    
    // 6. 总结
    console.log('='.repeat(60));
    console.log('测试结果总结');
    console.log('='.repeat(60));
    console.log(`样品信息完整性: ${sampleInfoValid ? '✅ 通过' : '❌ 失败'}`);
    console.log(`检测结果存在性: ${resultsValid ? '✅ 通过' : '❌ 失败'}`);
    console.log('');
    
    if (sampleInfoValid && resultsValid) {
      console.log('🎉 所有测试通过！审核任务样品信息和检测结果已正确返回。');
    } else {
      console.log('⚠️  部分测试失败，请检查后端实现。');
    }
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行测试
main();
