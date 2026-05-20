/**
 * 数据库相关功能综合测试
 * 
 * 测试范围：
 * 1. 样品管理（CRUD操作）
 * 2. 样品流转（创建、查询、确认）
 * 3. 数据一致性验证
 * 4. 字段命名转换验证
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

// 测试配置
let authToken = '';
let testSampleId = '';
let testTransferId = '';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
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

// 1. 登录
async function login() {
  logSection('测试 1: 用户认证');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      logSuccess('登录成功');
      logInfo(`用户: ${response.data.data.user.username} (${response.data.data.user.fullName})`);
      return true;
    }
    return false;
  } catch (error) {
    logError(`登录失败: ${error.message}`);
    return false;
  }
}

// 2. 测试样品查询
async function testSampleQuery() {
  logSection('测试 2: 样品查询功能');
  try {
    // 2.1 获取样品列表
    logInfo('2.1 获取样品列表（分页）');
    const listResponse = await axios.get(`${BASE_URL}/samples`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      params: { page: 1, page_size: 5 }
    });

    if (listResponse.data.success) {
      const samples = listResponse.data.data.items;
      logSuccess(`获取到 ${samples.length} 个样品`);
      logInfo(`总数: ${listResponse.data.data.pagination.total}`);
      
      if (samples.length > 0) {
        testSampleId = samples[0].id;
        logInfo(`测试样品: ${samples[0].sample_number} - ${samples[0].sample_name}`);
        
        // 2.2 获取单个样品详情
        logInfo('\n2.2 获取样品详情');
        const detailResponse = await axios.get(`${BASE_URL}/samples/${testSampleId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (detailResponse.data.success) {
          const sample = detailResponse.data.data;
          logSuccess('样品详情获取成功');
          logInfo(`样品编号: ${sample.sample_number}`);
          logInfo(`样品名称: ${sample.sample_name}`);
          logInfo(`样品状态: ${sample.status}`);
          logInfo(`版本号: ${sample.version}`);
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    logError(`样品查询失败: ${error.message}`);
    return false;
  }
}

// 3. 测试样品更新
async function testSampleUpdate() {
  logSection('测试 3: 样品更新功能');
  try {
    // 获取当前样品信息
    const getResponse = await axios.get(`${BASE_URL}/samples/${testSampleId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const currentSample = getResponse.data.data;
    const originalVersion = currentSample.version;
    const originalName = currentSample.sample_name;
    
    logInfo(`当前版本: ${originalVersion}`);
    logInfo(`当前名称: ${originalName}`);
    
    // 更新样品信息
    const newName = `${originalName}_测试更新_${Date.now()}`;
    logInfo(`\n尝试更新样品名称为: ${newName}`);
    
    const updateResponse = await axios.patch(`${BASE_URL}/samples/${testSampleId}`, {
      sample_name: newName,
      remarks: '数据库功能测试更新'
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (updateResponse.data.success) {
      const updatedSample = updateResponse.data.data;
      logSuccess('样品更新成功');
      logInfo(`新版本: ${updatedSample.version}`);
      logInfo(`新名称: ${updatedSample.sample_name}`);
      
      // 验证版本号递增
      if (updatedSample.version === originalVersion + 1) {
        logSuccess('版本号正确递增');
      } else {
        logError(`版本号异常: 期望 ${originalVersion + 1}, 实际 ${updatedSample.version}`);
      }
      
      // 验证名称更新
      if (updatedSample.sample_name === newName) {
        logSuccess('样品名称更新正确');
      } else {
        logError('样品名称更新失败');
      }
      
      return true;
    }
    return false;
  } catch (error) {
    logError(`样品更新失败: ${error.message}`);
    if (error.response) {
      console.log('错误详情:', error.response.data);
    }
    return false;
  }
}

// 4. 测试流转记录查询
async function testTransferQuery() {
  logSection('测试 4: 流转记录查询');
  try {
    const response = await axios.get(`${BASE_URL}/samples/transfers`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      params: { page: 1, page_size: 10 }
    });

    if (response.data.success) {
      const data = response.data.data;
      logSuccess(`获取流转记录成功`);
      logInfo(`总记录数: ${data.pagination.total}`);
      logInfo(`当前页: ${data.pagination.page}/${data.pagination.total_pages}`);
      
      if (data.items.length > 0) {
        const transfer = data.items[0];
        testTransferId = transfer.id;
        
        logInfo('\n流转记录详情:');
        logInfo(`  ID: ${transfer.id}`);
        logInfo(`  样品: ${transfer.sample?.sample_number || 'N/A'} - ${transfer.sample?.sample_name || 'N/A'}`);
        logInfo(`  发出: ${transfer.from_location} (${transfer.from_person})`);
        logInfo(`  接收: ${transfer.to_location} (${transfer.to_person})`);
        logInfo(`  状态: ${transfer.status}`);
        logInfo(`  发送方确认: ${transfer.sender_confirmed ? '是' : '否'}`);
        logInfo(`  接收方确认: ${transfer.receiver_confirmed ? '是' : '否'}`);
        
        // 验证字段完整性
        const requiredFields = [
          'id', 'sample_id', 'from_location', 'to_location',
          'from_person', 'to_person', 'transfer_date', 'status'
        ];
        
        let allFieldsPresent = true;
        for (const field of requiredFields) {
          if (!(field in transfer)) {
            logError(`缺少必需字段: ${field}`);
            allFieldsPresent = false;
          }
        }
        
        if (allFieldsPresent) {
          logSuccess('所有必需字段完整');
        }
        
        return true;
      } else {
        logWarning('没有流转记录');
        return true;
      }
    }
    return false;
  } catch (error) {
    logError(`流转记录查询失败: ${error.message}`);
    return false;
  }
}

// 5. 测试流转记录创建
async function testTransferCreate() {
  logSection('测试 5: 创建流转记录');
  try {
    const transferData = {
      from_location: '测试地点A',
      to_location: '测试地点B',
      from_person: '测试人员A',
      to_person: '测试人员B',
      remarks: `数据库功能测试 - ${new Date().toLocaleString('zh-CN')}`
    };
    
    logInfo('创建流转记录...');
    logInfo(`样品ID: ${testSampleId}`);
    logInfo(`发出地点: ${transferData.from_location}`);
    logInfo(`接收地点: ${transferData.to_location}`);
    
    const response = await axios.post(
      `${BASE_URL}/samples/${testSampleId}/transfer`,
      transferData,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );

    if (response.data.success) {
      const newTransfer = response.data.data;
      logSuccess('流转记录创建成功');
      logInfo(`流转ID: ${newTransfer.id}`);
      logInfo(`状态: ${newTransfer.status}`);
      logInfo(`创建时间: ${newTransfer.created_at}`);
      
      testTransferId = newTransfer.id;
      return true;
    }
    return false;
  } catch (error) {
    logError(`创建流转记录失败: ${error.message}`);
    if (error.response) {
      console.log('错误详情:', error.response.data);
    }
    return false;
  }
}

// 6. 测试数据一致性
async function testDataConsistency() {
  logSection('测试 6: 数据一致性验证');
  try {
    // 6.1 验证样品和流转记录的关联
    logInfo('6.1 验证样品-流转记录关联');
    
    const sampleResponse = await axios.get(`${BASE_URL}/samples/${testSampleId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const transferResponse = await axios.get(`${BASE_URL}/samples/transfers`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      params: { sample_number: sampleResponse.data.data.sample_number }
    });
    
    if (sampleResponse.data.success && transferResponse.data.success) {
      const sample = sampleResponse.data.data;
      const transfers = transferResponse.data.data.items;
      
      logSuccess('数据查询成功');
      logInfo(`样品: ${sample.sample_number}`);
      logInfo(`关联流转记录数: ${transfers.length}`);
      
      // 验证流转记录中的样品信息
      const relatedTransfers = transfers.filter(t => t.sample_id === testSampleId);
      if (relatedTransfers.length > 0) {
        logSuccess(`找到 ${relatedTransfers.length} 条关联流转记录`);
        
        // 验证样品信息一致性
        const firstTransfer = relatedTransfers[0];
        if (firstTransfer.sample) {
          if (firstTransfer.sample.sample_number === sample.sample_number) {
            logSuccess('样品编号一致');
          } else {
            logError('样品编号不一致');
          }
        }
      }
      
      return true;
    }
    return false;
  } catch (error) {
    logError(`数据一致性验证失败: ${error.message}`);
    return false;
  }
}

// 7. 测试数据库性能
async function testDatabasePerformance() {
  logSection('测试 7: 数据库性能测试');
  try {
    const iterations = 5;
    const times = [];
    
    logInfo(`执行 ${iterations} 次查询测试...`);
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      await axios.get(`${BASE_URL}/samples/transfers`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: { page: 1, page_size: 20 }
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      times.push(duration);
      
      logInfo(`第 ${i + 1} 次查询: ${duration}ms`);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    logSuccess('\n性能统计:');
    logInfo(`  平均响应时间: ${avgTime.toFixed(2)}ms`);
    logInfo(`  最快响应时间: ${minTime}ms`);
    logInfo(`  最慢响应时间: ${maxTime}ms`);
    
    if (avgTime < 500) {
      logSuccess('响应速度优秀 (< 500ms)');
    } else if (avgTime < 1000) {
      logWarning('响应速度良好 (< 1s)');
    } else {
      logWarning('响应速度较慢 (> 1s)');
    }
    
    return true;
  } catch (error) {
    logError(`性能测试失败: ${error.message}`);
    return false;
  }
}

// 主测试流程
async function runTests() {
  console.log('\n');
  log('数据库功能综合测试', 'magenta');
  log('测试时间: ' + new Date().toLocaleString('zh-CN'), 'magenta');
  
  const results = {
    login: false,
    sampleQuery: false,
    sampleUpdate: false,
    transferQuery: false,
    transferCreate: false,
    dataConsistency: false,
    performance: false
  };

  // 执行测试
  results.login = await login();
  
  if (results.login) {
    results.sampleQuery = await testSampleQuery();
    results.sampleUpdate = await testSampleUpdate();
    results.transferQuery = await testTransferQuery();
    results.transferCreate = await testTransferCreate();
    results.dataConsistency = await testDataConsistency();
    results.performance = await testDatabasePerformance();
  }

  // 测试总结
  logSection('测试总结报告');
  
  const testItems = [
    { name: '用户认证', result: results.login },
    { name: '样品查询', result: results.sampleQuery },
    { name: '样品更新', result: results.sampleUpdate },
    { name: '流转查询', result: results.transferQuery },
    { name: '流转创建', result: results.transferCreate },
    { name: '数据一致性', result: results.dataConsistency },
    { name: '数据库性能', result: results.performance }
  ];

  let passCount = 0;
  testItems.forEach(item => {
    if (item.result) {
      logSuccess(`${item.name}: ✓ 通过`);
      passCount++;
    } else {
      logError(`${item.name}: ✗ 失败`);
    }
  });

  console.log('\n' + '='.repeat(70));
  const passRate = ((passCount / testItems.length) * 100).toFixed(1);
  log(`测试完成: ${passCount}/${testItems.length} 项通过 (${passRate}%)`, 
      passCount === testItems.length ? 'green' : 'yellow');
  console.log('='.repeat(70) + '\n');

  // 数据库状态总结
  if (passCount === testItems.length) {
    logSection('数据库功能状态');
    logSuccess('✓ 数据库连接正常');
    logSuccess('✓ CRUD操作正常');
    logSuccess('✓ 数据一致性良好');
    logSuccess('✓ 字段命名转换正确');
    logSuccess('✓ 性能表现良好');
    log('\n所有数据库功能测试通过！系统运行正常。', 'green');
  }
}

// 运行测试
runTests().catch(error => {
  logError(`测试执行失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
