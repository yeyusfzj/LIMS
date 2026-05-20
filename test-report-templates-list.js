/**
 * 测试报告模板列表
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testReportTemplatesList() {
  try {
    console.log('=== 测试报告模板列表 ===\n');

    // 1. 登录获取token
    console.log('1. 登录系统...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✓ 登录成功\n');

    // 2. 获取所有报告模板
    console.log('2. 获取所有报告模板...');
    const templatesResponse = await axios.get(`${API_BASE_URL}/report-templates`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const templates = templatesResponse.data.data;
    console.log(`✓ 获取成功，共 ${templates.length} 个模板\n`);

    // 3. 显示模板列表
    console.log('3. 模板列表:');
    console.log('─'.repeat(80));
    templates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.name}`);
      console.log(`   分类: ${template.category}`);
      console.log(`   描述: ${template.description}`);
      console.log(`   状态: ${template.isActive ? '启用' : '禁用'}`);
      console.log(`   版本: v${template.version}`);
      console.log(`   变量数: ${template.variables.length}`);
      console.log('─'.repeat(80));
    });

    // 4. 按分类统计
    console.log('\n4. 按分类统计:');
    const categoryStats = templates.reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + 1;
      return acc;
    }, {});

    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} 个模板`);
    });

    console.log('\n✓ 测试完成!');

  } catch (error) {
    console.error('✗ 测试失败:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testReportTemplatesList();
