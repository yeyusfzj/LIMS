/**
 * 测试报告生成功能
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testReportGeneration() {
  try {
    console.log('=== 测试报告生成功能 ===\n');

    // 1. 登录获取token
    console.log('1. 登录系统...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✓ 登录成功\n');

    // 2. 获取已完成的样品列表
    console.log('2. 获取已完成检测的样品列表...');
    const samplesResponse = await axios.get(`${API_BASE_URL}/samples`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        status: 'TESTING_COMPLETE',
        pageSize: 10
      }
    });

    const samples = samplesResponse.data?.items || [];
    console.log(`✓ 找到 ${samples.length} 个已完成检测的样品`);
    
    if (samples.length === 0) {
      console.log('⚠ 没有已完成的样品,无法测试报告生成');
      return;
    }

    const testSample = samples[0];
    console.log(`  使用样品: ${testSample.barcode} - ${testSample.sampleName}\n`);

    // 3. 获取启用的报告模板
    console.log('3. 获取启用的报告模板...');
    const templatesResponse = await axios.get(`${API_BASE_URL}/report-templates`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        isActive: 'true',
        pageSize: 10
      }
    });

    const templates = templatesResponse.data || [];
    console.log(`✓ 找到 ${templates.length} 个启用的模板`);
    
    if (templates.length === 0) {
      console.log('⚠ 没有启用的模板,无法测试报告生成');
      return;
    }

    const testTemplate = templates[0];
    console.log(`  使用模板: ${testTemplate.name} (v${testTemplate.version})\n`);

    // 4. 预览报告
    console.log('4. 预览报告...');
    try {
      const previewResponse = await axios.post(
        `${API_BASE_URL}/reports/generate`,
        {
          sampleId: testSample.id,
          templateId: testTemplate.id,
          preview: true
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('✓ 报告预览成功');
      console.log(`  内容长度: ${previewResponse.data.content.length} 字符\n`);
    } catch (error) {
      console.error('✗ 报告预览失败:', error.response?.data || error.message);
      console.log('');
    }

    // 5. 正式生成报告
    console.log('5. 正式生成报告...');
    try {
      const generateResponse = await axios.post(
        `${API_BASE_URL}/reports/generate`,
        {
          sampleId: testSample.id,
          templateId: testTemplate.id,
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
      console.log(`  内容长度: ${report.content.length} 字符\n`);

      // 6. 获取报告详情
      console.log('6. 获取报告详情...');
      const reportId = report.reportId || report.id;
      const detailResponse = await axios.get(`${API_BASE_URL}/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✓ 获取报告详情成功');
      console.log(`  报告编号: ${detailResponse.data.reportNumber}`);
      console.log(`  样品ID: ${detailResponse.data.sampleId}`);
      console.log(`  模板ID: ${detailResponse.data.templateId}`);
      console.log(`  状态: ${detailResponse.data.status}\n`);

      // 7. 查询报告列表
      console.log('7. 查询报告列表...');
      const listResponse = await axios.get(`${API_BASE_URL}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: 1,
          pageSize: 10
        }
      });

      console.log('✓ 查询报告列表成功');
      console.log(`  总数: ${listResponse.data.pagination.total}`);
      console.log(`  当前页: ${listResponse.data.pagination.page}`);
      console.log(`  每页数量: ${listResponse.data.pagination.pageSize}\n`);

    } catch (error) {
      console.error('✗ 报告生成失败:', error.response?.data || error.message);
      if (error.response?.data) {
        console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
      }
      console.log('');
    }

    console.log('=== 测试完成 ===');

  } catch (error) {
    console.error('✗ 测试失败:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testReportGeneration();
