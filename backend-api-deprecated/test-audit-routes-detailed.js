/**
 * 详细测试审核管理路由
 * 验证路由功能是否正常工作
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testRoutes() {
  try {
    log('\n========================================', 'blue');
    log('审核管理路由详细测试', 'blue');
    log('========================================\n', 'blue');

    // 1. 登录
    log('步骤 1: 登录获取 Token', 'blue');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    const token = loginResponse.data.data?.accessToken || loginResponse.data.data?.token || loginResponse.data.token;
    if (!token) {
      log('✗ 登录失败：未获取到 token', 'red');
      log(`响应数据: ${JSON.stringify(loginResponse.data)}`, 'yellow');
      return;
    }
    log(`✓ 登录成功，Token: ${token.substring(0, 20)}...`, 'green');

    const headers = {
      'Authorization': `Bearer ${token}`
    };

    // 2. 测试获取模板列表
    log('\n步骤 2: 测试获取审核意见模板列表', 'blue');
    try {
      const templatesResponse = await axios.get(`${BASE_URL}/audits/templates`, { headers });
      log(`✓ GET /api/audits/templates 成功 (${templatesResponse.status})`, 'green');
      log(`  返回数据: ${JSON.stringify(templatesResponse.data).substring(0, 100)}...`, 'yellow');
    } catch (error) {
      if (error.response) {
        log(`✗ GET /api/audits/templates 失败 (${error.response.status}): ${error.response.data?.error?.message || error.message}`, 'red');
      } else {
        log(`✗ GET /api/audits/templates 失败: ${error.message}`, 'red');
      }
    }

    // 3. 测试获取流程配置列表
    log('\n步骤 3: 测试获取审核流程配置列表', 'blue');
    try {
      const configsResponse = await axios.get(`${BASE_URL}/audits/workflow-configs`, { headers });
      log(`✓ GET /api/audits/workflow-configs 成功 (${configsResponse.status})`, 'green');
      log(`  返回数据: ${JSON.stringify(configsResponse.data).substring(0, 100)}...`, 'yellow');
    } catch (error) {
      if (error.response) {
        log(`✗ GET /api/audits/workflow-configs 失败 (${error.response.status}): ${error.response.data?.error?.message || error.message}`, 'red');
      } else {
        log(`✗ GET /api/audits/workflow-configs 失败: ${error.message}`, 'red');
      }
    }

    // 4. 测试创建模板
    log('\n步骤 4: 测试创建审核意见模板', 'blue');
    try {
      const createTemplateResponse = await axios.post(`${BASE_URL}/audits/templates`, {
        name: '测试模板',
        type: 'APPROVED',
        content: '审核通过，符合要求',
        isDefault: false
      }, { headers });
      log(`✓ POST /api/audits/templates 成功 (${createTemplateResponse.status})`, 'green');
      log(`  创建的模板 ID: ${createTemplateResponse.data.data?.id}`, 'yellow');
      
      // 保存模板 ID 用于后续测试
      const templateId = createTemplateResponse.data.data?.id;
      
      // 5. 测试获取单个模板
      if (templateId) {
        log('\n步骤 5: 测试获取单个审核意见模板', 'blue');
        try {
          const getTemplateResponse = await axios.get(`${BASE_URL}/audits/templates/${templateId}`, { headers });
          log(`✓ GET /api/audits/templates/:id 成功 (${getTemplateResponse.status})`, 'green');
          log(`  模板名称: ${getTemplateResponse.data.data?.name}`, 'yellow');
        } catch (error) {
          if (error.response) {
            log(`✗ GET /api/audits/templates/:id 失败 (${error.response.status}): ${error.response.data?.error?.message || error.message}`, 'red');
          } else {
            log(`✗ GET /api/audits/templates/:id 失败: ${error.message}`, 'red');
          }
        }

        // 6. 测试更新模板
        log('\n步骤 6: 测试更新审核意见模板', 'blue');
        try {
          const updateTemplateResponse = await axios.put(`${BASE_URL}/audits/templates/${templateId}`, {
            content: '审核通过，完全符合要求（已更新）'
          }, { headers });
          log(`✓ PUT /api/audits/templates/:id 成功 (${updateTemplateResponse.status})`, 'green');
        } catch (error) {
          if (error.response) {
            log(`✗ PUT /api/audits/templates/:id 失败 (${error.response.status}): ${error.response.data?.error?.message || error.message}`, 'red');
          } else {
            log(`✗ PUT /api/audits/templates/:id 失败: ${error.message}`, 'red');
          }
        }

        // 7. 测试删除模板
        log('\n步骤 7: 测试删除审核意见模板', 'blue');
        try {
          const deleteTemplateResponse = await axios.delete(`${BASE_URL}/audits/templates/${templateId}`, { headers });
          log(`✓ DELETE /api/audits/templates/:id 成功 (${deleteTemplateResponse.status})`, 'green');
        } catch (error) {
          if (error.response) {
            log(`✗ DELETE /api/audits/templates/:id 失败 (${error.response.status}): ${error.response.data?.error?.message || error.message}`, 'red');
          } else {
            log(`✗ DELETE /api/audits/templates/:id 失败: ${error.message}`, 'red');
          }
        }
      }
    } catch (error) {
      if (error.response) {
        log(`✗ POST /api/audits/templates 失败 (${error.response.status}): ${error.response.data?.error?.message || error.message}`, 'red');
      } else {
        log(`✗ POST /api/audits/templates 失败: ${error.message}`, 'red');
      }
    }

    // 8. 测试获取审核历史（使用一个不存在的 ID）
    log('\n步骤 8: 测试获取审核历史记录', 'blue');
    try {
      const historyResponse = await axios.get(`${BASE_URL}/audits/tasks/test-task-id/history`, { headers });
      log(`✓ GET /api/audits/tasks/:id/history 成功 (${historyResponse.status})`, 'green');
      log(`  历史记录数量: ${historyResponse.data.data?.length || 0}`, 'yellow');
    } catch (error) {
      if (error.response) {
        log(`✗ GET /api/audits/tasks/:id/history 失败 (${error.response.status}): ${error.response.data?.error?.message || error.message}`, 'red');
      } else {
        log(`✗ GET /api/audits/tasks/:id/history 失败: ${error.message}`, 'red');
      }
    }

    // 9. 验证现有路由未受影响
    log('\n步骤 9: 验证现有审核路由未受影响', 'blue');
    try {
      const auditsResponse = await axios.get(`${BASE_URL}/audits`, { headers });
      log(`✓ GET /api/audits 成功 (${auditsResponse.status})`, 'green');
      log(`  审核任务数量: ${auditsResponse.data.data?.items?.length || 0}`, 'yellow');
    } catch (error) {
      if (error.response) {
        log(`✗ GET /api/audits 失败 (${error.response.status}): ${error.response.data?.error?.message || error.message}`, 'red');
      } else {
        log(`✗ GET /api/audits 失败: ${error.message}`, 'red');
      }
    }

    log('\n========================================', 'blue');
    log('测试完成', 'blue');
    log('========================================\n', 'blue');

  } catch (error) {
    log(`\n测试执行出错: ${error.message}`, 'red');
    if (error.response) {
      log(`响应状态: ${error.response.status}`, 'red');
      log(`响应数据: ${JSON.stringify(error.response.data)}`, 'red');
    }
  }
}

testRoutes();
