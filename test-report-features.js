/**
 * 报告功能综合测试脚本
 * 测试报告模板、报告生成、电子签名、报告分发等功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// 测试配置
const config = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

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

// 登录获取token
async function login() {
  try {
    log('\n=== 登录系统 ===', 'blue');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    }, config);

    if (response.data.success && response.data.data.accessToken) {
      log('✓ 登录成功', 'green');
      return response.data.data.accessToken;
    } else {
      log('✗ 登录失败: 响应格式不正确', 'red');
      log(`  响应数据: ${JSON.stringify(response.data)}`, 'yellow');
      return null;
    }
  } catch (error) {
    log(`✗ 登录失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  响应数据: ${JSON.stringify(error.response.data)}`, 'yellow');
    }
    return null;
  }
}

// 测试报告模板列表
async function testReportTemplateList(token) {
  try {
    log('\n=== 测试报告模板列表 ===', 'blue');
    
    const response = await axios.get(`${BASE_URL}/report-templates`, {
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      },
      timeout: config.timeout
    });

    // 响应格式: {data: [...], pagination: {...}}
    if (response.data && response.data.data) {
      const templates = response.data.data;
      log(`✓ 获取报告模板列表成功`, 'green');
      log(`  模板数量: ${templates.length}`, 'cyan');
      
      if (templates.length > 0) {
        log(`  示例模板:`, 'cyan');
        templates.slice(0, 3).forEach(t => {
          log(`    - ${t.name} (${t.category})`, 'cyan');
        });
      }
      return { success: true, templates };
    } else {
      log('✗ 获取报告模板列表失败: 响应格式不正确', 'red');
      return { success: false };
    }
  } catch (error) {
    log(`✗ 报告模板列表API调用失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
    }
    return { success: false };
  }
}

// 测试创建报告模板
async function testCreateReportTemplate(token) {
  try {
    log('\n=== 测试创建报告模板 ===', 'blue');
    
    const templateData = {
      name: `测试报告模板_${Date.now()}`,
      description: '自动化测试创建的报告模板',
      category: '水质检测',
      content: JSON.stringify({
        title: '水质检测报告',
        sections: [
          { id: 'sample-info', title: '样品信息', order: 1 },
          { id: 'test-results', title: '检测结果', order: 2 },
          { id: 'conclusion', title: '检测结论', order: 3 }
        ]
      }),
      variables: [
        { name: 'sampleNumber', type: 'string', description: '样品编号', required: true },
        { name: 'testDate', type: 'date', description: '检测日期', required: true }
      ]
    };
    
    const response = await axios.post(`${BASE_URL}/report-templates`, templateData, {
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      },
      timeout: config.timeout
    });

    // 响应格式: {message: "...", data: {...}}
    if (response.data && response.data.data) {
      const template = response.data.data;
      log(`✓ 创建报告模板成功`, 'green');
      log(`  模板ID: ${template.id}`, 'cyan');
      log(`  模板名称: ${template.name}`, 'cyan');
      return { success: true, template };
    } else {
      log('✗ 创建报告模板失败: 响应格式不正确', 'red');
      return { success: false };
    }
  } catch (error) {
    log(`✗ 创建报告模板API调用失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  错误信息: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return { success: false };
  }
}

// 测试获取报告列表
async function testReportList(token) {
  try {
    log('\n=== 测试报告列表 ===', 'blue');
    
    const response = await axios.get(`${BASE_URL}/reports`, {
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      },
      timeout: config.timeout
    });

    // 响应格式: {data: [...], pagination: {...}}
    if (response.data && response.data.data !== undefined) {
      const reports = response.data.data;
      log(`✓ 获取报告列表成功`, 'green');
      log(`  报告数量: ${reports.length}`, 'cyan');
      
      if (reports.length > 0) {
        log(`  示例报告:`, 'cyan');
        reports.slice(0, 3).forEach(r => {
          log(`    - ${r.reportNumber} (状态: ${r.status})`, 'cyan');
        });
      }
      return { success: true, reports };
    } else {
      log('✗ 获取报告列表失败: 响应格式不正确', 'red');
      return { success: false };
    }
  } catch (error) {
    log(`✗ 报告列表API调用失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
    }
    return { success: false };
  }
}

// 测试生成报告
async function testGenerateReport(token, sampleId, templateId) {
  try {
    log('\n=== 测试生成报告 ===', 'blue');
    
    const reportData = {
      sampleId: sampleId,
      templateId: templateId
    };
    
    const response = await axios.post(`${BASE_URL}/reports`, reportData, {
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      },
      timeout: config.timeout
    });

    // 响应格式: {message: "...", data: {...}}
    if (response.data && response.data.data) {
      const report = response.data.data;
      log(`✓ 生成报告成功`, 'green');
      log(`  报告编号: ${report.reportNumber}`, 'cyan');
      log(`  报告ID: ${report.id}`, 'cyan');
      return { success: true, report };
    } else {
      log('✗ 生成报告失败: 响应格式不正确', 'red');
      return { success: false };
    }
  } catch (error) {
    log(`✗ 生成报告API调用失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  错误信息: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return { success: false };
  }
}

// 测试电子签名
async function testElectronicSignature(token, reportId) {
  try {
    log('\n=== 测试电子签名 ===', 'blue');
    
    const signatureData = {
      signatureData: 'encrypted_signature_data_placeholder',
      signerRole: 'admin'
    };
    
    const response = await axios.post(`${BASE_URL}/reports/${reportId}/sign`, signatureData, {
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      },
      timeout: config.timeout
    });

    // 响应格式: {message: "...", data: {...}}
    if (response.data && response.data.data) {
      const signature = response.data.data;
      log(`✓ 电子签名成功`, 'green');
      log(`  签名ID: ${signature.id}`, 'cyan');
      log(`  签名角色: ${signature.signerRole}`, 'cyan');
      return { success: true, signature };
    } else {
      log('✗ 电子签名失败: 响应格式不正确', 'red');
      return { success: false };
    }
  } catch (error) {
    log(`✗ 电子签名API调用失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  错误信息: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return { success: false };
  }
}

// 测试报告分发
async function testReportDistribution(token, reportId) {
  try {
    log('\n=== 测试报告分发 ===', 'blue');
    
    const distributionData = {
      method: 'EMAIL',
      recipient: '测试客户',
      recipientEmail: 'test@example.com'
    };
    
    const response = await axios.post(`${BASE_URL}/reports/${reportId}/distribute`, distributionData, {
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      },
      timeout: config.timeout
    });

    // 响应格式: {message: "...", data: {...}}
    if (response.data && response.data.data) {
      log(`✓ 报告分发成功`, 'green');
      log(`  分发方式: ${response.data.data.method}`, 'cyan');
      log(`  接收人: ${response.data.data.recipient}`, 'cyan');
      return { success: true };
    } else {
      log('✗ 报告分发失败: 响应格式不正确', 'red');
      return { success: false };
    }
  } catch (error) {
    log(`✗ 报告分发API调用失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  错误信息: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return { success: false };
  }
}

// 测试报告撤回
async function testReportRecall(token, reportId) {
  try {
    log('\n=== 测试报告撤回 ===', 'blue');
    
    const recallData = {
      reason: '发现数据错误，需要重新检测'
    };
    
    const response = await axios.post(`${BASE_URL}/reports/${reportId}/recall`, recallData, {
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      },
      timeout: config.timeout
    });

    if (response.data && response.data.message) {
      log(`✓ 报告撤回成功`, 'green');
      return { success: true };
    } else {
      log('✗ 报告撤回失败', 'red');
      return { success: false };
    }
  } catch (error) {
    log(`✗ 报告撤回API调用失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  错误信息: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return { success: false };
  }
}

// 获取样品ID用于测试
async function getSampleId(token) {
  try {
    const response = await axios.get(`${BASE_URL}/samples?page=1&pageSize=1`, {
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      },
      timeout: config.timeout
    });

    // 响应格式: {message: "...", data: {items: [...], total: ..., page: ..., pageSize: ...}}
    if (response.data && response.data.data && response.data.data.items && response.data.data.items.length > 0) {
      const sampleId = response.data.data.items[0].id;
      log(`✓ 获取样品ID成功: ${sampleId}`, 'green');
      return sampleId;
    }
    
    log('⚠ 未找到样品数据', 'yellow');
    log(`  响应数据: ${JSON.stringify(response.data)}`, 'yellow');
    return null;
  } catch (error) {
    log(`✗ 获取样品ID失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  响应数据: ${JSON.stringify(error.response.data)}`, 'yellow');
    }
    return null;
  }
}

// 主测试函数
async function runTests() {
  log('========================================', 'blue');
  log('  报告功能综合测试', 'blue');
  log('========================================', 'blue');

  // 登录
  const token = await login();
  if (!token) {
    log('\n✗ 无法获取认证token，测试终止', 'red');
    return;
  }

  const results = {
    templateList: false,
    createTemplate: false,
    reportList: false,
    generateReport: false,
    electronicSignature: false,
    reportDistribution: false,
    reportRecall: false
  };

  // 测试报告模板列表
  const templateListResult = await testReportTemplateList(token);
  results.templateList = templateListResult.success;

  // 测试创建报告模板
  const createTemplateResult = await testCreateReportTemplate(token);
  results.createTemplate = createTemplateResult.success;

  // 测试报告列表
  const reportListResult = await testReportList(token);
  results.reportList = reportListResult.success;

  // 获取样品ID和模板ID用于后续测试
  const sampleId = await getSampleId(token);
  const templateId = createTemplateResult.template?.id || 
                     (templateListResult.templates && templateListResult.templates[0]?.id);

  log(`\n调试信息:`, 'yellow');
  log(`  样品ID: ${sampleId || '未找到'}`, 'yellow');
  log(`  模板ID: ${templateId || '未找到'}`, 'yellow');

  if (sampleId && templateId) {
    // 测试生成报告
    const generateResult = await testGenerateReport(token, sampleId, templateId);
    results.generateReport = generateResult.success;

    if (generateResult.success && generateResult.report) {
      const reportId = generateResult.report.id;

      // 测试电子签名
      const signatureResult = await testElectronicSignature(token, reportId);
      results.electronicSignature = signatureResult.success;

      // 测试报告分发
      const distributionResult = await testReportDistribution(token, reportId);
      results.reportDistribution = distributionResult.success;

      // 测试报告撤回
      const recallResult = await testReportRecall(token, reportId);
      results.reportRecall = recallResult.success;
    }
  } else {
    log('\n⚠ 缺少样品或模板数据，跳过报告生成相关测试', 'yellow');
  }

  // 输出测试总结
  log('\n========================================', 'blue');
  log('  测试总结', 'blue');
  log('========================================', 'blue');
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  const failed = total - passed;

  log(`\n测试项目:`, 'cyan');
  Object.entries(results).forEach(([key, value]) => {
    const status = value ? '✓' : '✗';
    const color = value ? 'green' : 'red';
    const name = {
      templateList: '报告模板列表',
      createTemplate: '创建报告模板',
      reportList: '报告列表',
      generateReport: '生成报告',
      electronicSignature: '电子签名',
      reportDistribution: '报告分发',
      reportRecall: '报告撤回'
    }[key];
    log(`  ${status} ${name}`, color);
  });

  log(`\n总计: ${total} 个测试`, 'blue');
  log(`通过: ${passed} 个`, 'green');
  log(`失败: ${failed} 个`, failed > 0 ? 'red' : 'green');

  if (failed === 0) {
    log('\n✓ 所有测试通过！报告功能正常工作', 'green');
  } else {
    log('\n⚠ 部分测试失败，请检查相关功能', 'yellow');
  }
}

// 运行测试
runTests().catch(error => {
  log(`\n✗ 测试执行出错: ${error.message}`, 'red');
  console.error(error);
});
