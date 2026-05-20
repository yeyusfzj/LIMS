/**
 * 测试 FastAPI 后端报告模板 API
 */

const axios = require('axios');

const FASTAPI_BASE_URL = 'http://localhost:8000/api/v1';

async function login() {
  console.log('1. 登录获取令牌...');
  try {
    const response = await axios.post(`${FASTAPI_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('✓ 登录成功');
    
    // FastAPI 返回的数据结构: { success, data: { accessToken, user, ... }, message }
    const data = response.data.data || response.data;
    const token = data.accessToken || data.access_token || data.token;
    
    if (!token) {
      console.error('  响应数据:', JSON.stringify(response.data, null, 2));
      throw new Error('未找到访问令牌');
    }
    
    console.log(`  - 用户: ${data.user?.username || '未知'}`);
    console.log(`  - 令牌: ${token.substring(0, 20)}...`);
    return token;
  } catch (error) {
    console.error('✗ 登录失败:', error.response?.data || error.message);
    throw error;
  }
}

async function getReportTemplates(token) {
  console.log('\n2. 获取报告模板列表...');
  try {
    const response = await axios.get(`${FASTAPI_BASE_URL}/report-templates`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page: 1,
        pageSize: 10
      }
    });
    
    console.log('✓ 获取成功');
    const data = response.data.data || response.data;
    console.log(`  - 总数: ${data.total}`);
    console.log(`  - 当前页: ${data.page}`);
    console.log(`  - 每页数量: ${data.pageSize}`);
    console.log(`  - 返回记录数: ${data.items.length}`);
    
    if (data.items.length > 0) {
      console.log('\n  前 3 个模板:');
      data.items.slice(0, 3).forEach((item, index) => {
        console.log(`    ${index + 1}. ${item.name}`);
        console.log(`       - ID: ${item.id}`);
        console.log(`       - 分类: ${item.category}`);
        console.log(`       - 版本: ${item.version}`);
        console.log(`       - 激活: ${item.isActive}`);
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('✗ 获取失败:', error.response?.data || error.message);
    throw error;
  }
}

async function getReportTemplateById(token, templateId) {
  console.log(`\n3. 获取报告模板详情 (ID: ${templateId})...`);
  try {
    const response = await axios.get(`${FASTAPI_BASE_URL}/report-templates/${templateId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = response.data.data || response.data;
    console.log('✓ 获取成功');
    console.log(`  - 名称: ${data.name}`);
    console.log(`  - 描述: ${data.description || '无'}`);
    console.log(`  - 分类: ${data.category}`);
    console.log(`  - 版本: ${data.version}`);
    console.log(`  - 变量数量: ${data.variables.length}`);
    
    return data;
  } catch (error) {
    console.error('✗ 获取失败:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('FastAPI 后端报告模板 API 测试');
  console.log('='.repeat(60));
  
  try {
    // 1. 登录
    const token = await login();
    
    // 2. 获取报告模板列表
    const templates = await getReportTemplates(token);
    
    // 3. 如果有模板，获取第一个模板的详情
    if (templates.items && templates.items.length > 0) {
      await getReportTemplateById(token, templates.items[0].id);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✓ 所有测试通过！');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('✗ 测试失败');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

main();
