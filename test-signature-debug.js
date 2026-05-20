/**
 * 电子签名调试测试脚本
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testSignature() {
  try {
    // 1. 登录
    console.log('1. 登录...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    const token = loginRes.data.data.accessToken;
    console.log('✓ 登录成功');

    // 2. 获取样品ID
    console.log('\n2. 获取样品ID...');
    const samplesRes = await axios.get(`${BASE_URL}/samples?page=1&pageSize=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const sampleId = samplesRes.data.data.items[0].id;
    console.log(`✓ 样品ID: ${sampleId}`);

    // 3. 获取模板ID
    console.log('\n3. 获取模板ID...');
    const templatesRes = await axios.get(`${BASE_URL}/report-templates`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const templateId = templatesRes.data.data[0].id;
    console.log(`✓ 模板ID: ${templateId}`);

    // 4. 生成报告
    console.log('\n4. 生成报告...');
    const reportRes = await axios.post(`${BASE_URL}/reports`, {
      sampleId,
      templateId
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const reportId = reportRes.data.data.id;
    console.log(`✓ 报告ID: ${reportId}`);
    console.log(`  报告编号: ${reportRes.data.data.reportNumber}`);

    // 5. 测试签名
    console.log('\n5. 测试电子签名...');
    console.log('请求数据:', JSON.stringify({
      signatureData: 'encrypted_signature_data_placeholder',
      signerRole: '审核人'
    }, null, 2));
    
    try {
      const signRes = await axios.post(`${BASE_URL}/reports/${reportId}/sign`, {
        signatureData: 'encrypted_signature_data_placeholder',
        signerRole: '审核人'
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✓ 签名成功');
      console.log('响应数据:', JSON.stringify(signRes.data, null, 2));
    } catch (error) {
      console.log('✗ 签名失败');
      console.log('错误状态码:', error.response?.status);
      console.log('错误响应:', JSON.stringify(error.response?.data, null, 2));
      
      // 如果是500错误，尝试获取更多信息
      if (error.response?.status === 500) {
        console.log('\n详细错误信息:');
        console.log('  消息:', error.response.data.error?.message);
        console.log('  代码:', error.response.data.error?.code);
        console.log('  路径:', error.response.data.error?.path);
      }
    }

  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

testSignature();
