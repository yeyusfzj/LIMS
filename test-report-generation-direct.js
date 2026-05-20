/**
 * 直接测试报告生成功能(使用已知的样品ID)
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testReportGeneration() {
  try {
    console.log('=== 直接测试报告生成功能 ===\n');

    // 1. 登录
    console.log('1. 登录系统...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✓ 登录成功\n');

    // 使用已知的样品ID和模板ID
    const sampleId = 'd9b99c01-5265-4508-9685-0a4ed37461d5'; // SAMPLE-2024-003
    const templateId = '1'; // 假设第一个模板

    // 2. 获取模板列表
    console.log('2. 获取模板列表...');
    const templatesResponse = await axios.get(`${API_BASE_URL}/report-templates`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const templates = templatesResponse.data || [];
    console.log(`✓ 找到 ${templates.length} 个模板`);
    
    if (templates.length === 0) {
      console.log('⚠ 没有模板,无法测试');
      return;
    }

    const template = templates[0];
    console.log(`  使用模板: ${template.name}\n`);

    // 3. 预览报告
    console.log('3. 预览报告...');
    try {
      const previewResponse = await axios.post(
        `${API_BASE_URL}/reports/generate`,
        {
          sampleId: sampleId,
          templateId: template.id,
          preview: true
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('✓ 报告预览成功');
      console.log(`  内容长度: ${previewResponse.data.content?.length || 0} 字符\n`);
    } catch (error) {
      console.error('✗ 报告预览失败:', error.response?.data || error.message);
      console.log('');
    }

    // 4. 正式生成报告
    console.log('4. 正式生成报告...');
    try {
      const generateResponse = await axios.post(
        `${API_BASE_URL}/reports/generate`,
        {
          sampleId: sampleId,
          templateId: template.id,
          preview: false
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const report = generateResponse.data;
      console.log('✓ 报告生成成功');
      console.log(`  报告ID: ${report.reportId || report.id}`);
      console.log(`  报告编号: ${report.reportNumber}`);
      console.log(`  内容长度: ${report.content?.length || 0} 字符\n`);

      console.log('=== 测试成功 ===');

    } catch (error) {
      console.error('✗ 报告生成失败:', error.response?.data || error.message);
      if (error.response?.data) {
        console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
      }
    }

  } catch (error) {
    console.error('✗ 测试失败:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testReportGeneration();
