/**
 * 测试报告模板管理功能的前后端连接
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// 测试用的token（使用admin账号登录后获取）
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

// 1. 登录获取token
async function login() {
  try {
    log('\n=== 步骤1: 登录获取Token ===', 'cyan');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    authToken = response.data.data.accessToken;
    log('✓ 登录成功', 'green');
    log(`Token: ${authToken.substring(0, 20)}...`, 'blue');
    return true;
  } catch (error) {
    log(`✗ 登录失败: ${error.message}`, 'red');
    if (error.response) {
      log(`响应状态: ${error.response.status}`, 'red');
      log(`响应数据: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

// 2. 获取报告模板列表
async function getTemplateList() {
  try {
    log('\n=== 步骤2: 获取报告模板列表 ===', 'cyan');
    const response = await axios.get(`${API_BASE_URL}/report-templates`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        pageSize: 20
      }
    });
    
    log('✓ 获取模板列表成功', 'green');
    log(`模板数量: ${response.data.data.length}`, 'blue');
    
    if (response.data.data.length > 0) {
      log('\n模板列表:', 'yellow');
      response.data.data.forEach((template, index) => {
        log(`  ${index + 1}. ${template.name} (${template.category}) - ${template.isActive ? '启用' : '草稿'}`, 'blue');
      });
    }
    
    return response.data.data;
  } catch (error) {
    log(`✗ 获取模板列表失败: ${error.message}`, 'red');
    if (error.response) {
      log(`响应状态: ${error.response.status}`, 'red');
      log(`响应数据: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return [];
  }
}

// 3. 获取单个模板详情
async function getTemplateDetail(templateId) {
  try {
    log(`\n=== 步骤3: 获取模板详情 (ID: ${templateId}) ===`, 'cyan');
    const response = await axios.get(`${API_BASE_URL}/report-templates/${templateId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    log('✓ 获取模板详情成功', 'green');
    log(`模板名称: ${response.data.data.name}`, 'blue');
    log(`版本: v${response.data.data.version}`, 'blue');
    log(`分类: ${response.data.data.category}`, 'blue');
    log(`状态: ${response.data.data.isActive ? '启用' : '草稿'}`, 'blue');
    log(`内容长度: ${response.data.data.content.length} 字符`, 'blue');
    
    return response.data.data;
  } catch (error) {
    log(`✗ 获取模板详情失败: ${error.message}`, 'red');
    if (error.response) {
      log(`响应状态: ${error.response.status}`, 'red');
      log(`响应数据: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

// 4. 创建新模板
async function createTemplate() {
  try {
    log('\n=== 步骤4: 创建新模板 ===', 'cyan');
    const newTemplate = {
      name: '测试报告模板',
      category: 'general',
      content: '<h1>测试报告</h1><p>样品编号：{{sample.barcode}}</p><p>检测结果：{{result.values}}</p>',
      variables: [
        {
          name: 'sample.barcode',
          type: 'string',
          description: '{{sample.barcode}}',
          required: false
        },
        {
          name: 'result.values',
          type: 'string',
          description: '{{result.values}}',
          required: false
        }
      ],
      isActive: false
    };
    
    const response = await axios.post(`${API_BASE_URL}/report-templates`, newTemplate, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    log('✓ 创建模板成功', 'green');
    log(`新模板ID: ${response.data.data.id}`, 'blue');
    log(`模板名称: ${response.data.data.name}`, 'blue');
    
    return response.data.data;
  } catch (error) {
    log(`✗ 创建模板失败: ${error.message}`, 'red');
    if (error.response) {
      log(`响应状态: ${error.response.status}`, 'red');
      log(`响应数据: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

// 5. 更新模板
async function updateTemplate(templateId) {
  try {
    log(`\n=== 步骤5: 更新模板 (ID: ${templateId}) ===`, 'cyan');
    const updateData = {
      name: '测试报告模板（已更新）',
      category: 'general',
      content: '<h1>测试报告（更新版）</h1><p>样品编号：{{sample.barcode}}</p><p>检测结果：{{result.values}}</p><p>更新时间：{{system.generateDate}}</p>',
      variables: [
        {
          name: 'sample.barcode',
          type: 'string',
          description: '{{sample.barcode}}',
          required: false
        },
        {
          name: 'result.values',
          type: 'string',
          description: '{{result.values}}',
          required: false
        },
        {
          name: 'system.generateDate',
          type: 'string',
          description: '{{system.generateDate}}',
          required: false
        }
      ],
      isActive: true
    };
    
    const response = await axios.put(`${API_BASE_URL}/report-templates/${templateId}`, updateData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    log('✓ 更新模板成功', 'green');
    log(`模板名称: ${response.data.data.name}`, 'blue');
    log(`状态: ${response.data.data.isActive ? '启用' : '草稿'}`, 'blue');
    
    return response.data.data;
  } catch (error) {
    log(`✗ 更新模板失败: ${error.message}`, 'red');
    if (error.response) {
      log(`响应状态: ${error.response.status}`, 'red');
      log(`响应数据: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

// 6. 删除模板
async function deleteTemplate(templateId) {
  try {
    log(`\n=== 步骤6: 删除模板 (ID: ${templateId}) ===`, 'cyan');
    const response = await axios.delete(`${API_BASE_URL}/report-templates/${templateId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    log('✓ 删除模板成功', 'green');
    return true;
  } catch (error) {
    log(`✗ 删除模板失败: ${error.message}`, 'red');
    if (error.response) {
      log(`响应状态: ${error.response.status}`, 'red');
      log(`响应数据: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

// 主测试流程
async function runTests() {
  log('========================================', 'cyan');
  log('  报告模板管理功能连接测试', 'cyan');
  log('========================================', 'cyan');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    log('\n测试终止：登录失败', 'red');
    return;
  }
  
  // 2. 获取模板列表
  const templates = await getTemplateList();
  
  // 3. 如果有模板，获取第一个模板的详情
  if (templates.length > 0) {
    await getTemplateDetail(templates[0].id);
  }
  
  // 4. 创建新模板
  const newTemplate = await createTemplate();
  
  if (newTemplate) {
    // 5. 更新刚创建的模板
    await updateTemplate(newTemplate.id);
    
    // 6. 删除测试模板
    await deleteTemplate(newTemplate.id);
  }
  
  log('\n========================================', 'cyan');
  log('  测试完成', 'cyan');
  log('========================================', 'cyan');
}

// 运行测试
runTests().catch(error => {
  log(`\n测试过程中发生错误: ${error.message}`, 'red');
  console.error(error);
});
