/**
 * 报告API调试测试脚本
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function test() {
  try {
    // 1. 登录
    console.log('1. 登录...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    const token = loginRes.data.data.accessToken;
    console.log('✓ 登录成功');
    console.log('Token:', token.substring(0, 50) + '...');
    console.log('User:', JSON.stringify(loginRes.data.data.user, null, 2));
    
    // 2. 测试认证是否工作 - 获取样品列表
    console.log('\n2. 测试认证 - 获取样品列表...');
    const samplesRes = await axios.get(`${BASE_URL}/samples?page=1&pageSize=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✓ 样品列表获取成功，认证工作正常');
    console.log('样品数量:', samplesRes.data.data.total);
    
    // 3. 获取报告模板列表
    console.log('\n3. 获取报告模板列表...');
    const templatesRes = await axios.get(`${BASE_URL}/report-templates`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✓ 报告模板列表获取成功');
    console.log('模板数量:', templatesRes.data.data.length);
    
    // 4. 测试报告生成API
    console.log('\n4. 测试报告生成API...');
    const sampleId = samplesRes.data.data.items[0]?.id;
    const templateId = templatesRes.data.data[0]?.id;
    
    console.log('样品ID:', sampleId);
    console.log('模板ID:', templateId);
    
    if (!sampleId || !templateId) {
      console.log('✗ 缺少样品或模板数据');
      return;
    }
    
    try {
      const reportRes = await axios.post(`${BASE_URL}/reports`, {
        sampleId: sampleId,
        templateId: templateId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✓ 报告生成成功');
      console.log('报告:', JSON.stringify(reportRes.data, null, 2));
    } catch (error) {
      console.log('✗ 报告生成失败');
      console.log('状态码:', error.response?.status);
      console.log('错误信息:', JSON.stringify(error.response?.data, null, 2));
      console.log('请求头:', JSON.stringify(error.config?.headers, null, 2));
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

test();
