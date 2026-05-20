/**
 * 测试路由注册情况
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testRouteRegistration() {
  console.log('========================================');
  console.log('测试路由注册');
  console.log('========================================\n');

  try {
    // 1. 登录
    console.log('1. 登录...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    const token = loginResponse.data.data.accessToken;
    console.log('✓ 登录成功\n');

    // 2. 创建样品
    console.log('2. 创建测试样品...');
    const sampleData = {
      clientName: '测试客户',
      clientContact: '13800138000',
      sampleName: '路由测试样品',
      sampleType: '水质',
      sampleCategory: '地表水',
      quantity: 100,
      unit: 'mL',
      receivedDate: new Date().toISOString(),
      samplingDate: new Date().toISOString(),
      samplingLocation: '测试地点',
      storageLocation: '测试位置',
      priority: 'NORMAL'
    };

    const createResponse = await axios.post(`${API_BASE_URL}/samples`, sampleData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const sampleId = createResponse.data.data.id;
    console.log(`✓ 样品创建成功: ${sampleId}\n`);

    // 3. 测试不同的HTTP方法
    console.log('3. 测试路由响应...\n');

    // GET /:id
    try {
      const getResponse = await axios.get(`${API_BASE_URL}/samples/${sampleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✓ GET /samples/${sampleId} - 状态码: ${getResponse.status}`);
    } catch (error) {
      console.log(`✗ GET /samples/${sampleId} - 错误: ${error.response?.status || error.message}`);
    }

    // PUT /:id
    try {
      const putResponse = await axios.put(
        `${API_BASE_URL}/samples/${sampleId}`,
        { sampleName: '更新后的名称' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(`✓ PUT /samples/${sampleId} - 状态码: ${putResponse.status}`);
    } catch (error) {
      console.log(`✗ PUT /samples/${sampleId} - 错误: ${error.response?.status || error.message}`);
    }

    // PATCH /:id/status
    try {
      const patchResponse = await axios.patch(
        `${API_BASE_URL}/samples/${sampleId}/status`,
        { status: 'IN_TESTING' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(`✓ PATCH /samples/${sampleId}/status - 状态码: ${patchResponse.status}`);
    } catch (error) {
      console.log(`✗ PATCH /samples/${sampleId}/status - 错误: ${error.response?.status || error.message}`);
    }

    // DELETE /:id
    console.log('\n4. 测试DELETE路由...');
    try {
      const deleteResponse = await axios.delete(`${API_BASE_URL}/samples/${sampleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✓ DELETE /samples/${sampleId} - 状态码: ${deleteResponse.status}`);
      console.log(`  响应: ${deleteResponse.data.message}`);
    } catch (error) {
      console.log(`✗ DELETE /samples/${sampleId} - 错误:`);
      console.log(`  状态码: ${error.response?.status}`);
      console.log(`  错误信息:`, error.response?.data);
      
      // 尝试使用OPTIONS方法查看支持的方法
      console.log('\n5. 检查支持的HTTP方法...');
      try {
        const optionsResponse = await axios.options(`${API_BASE_URL}/samples/${sampleId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`  Allow header:`, optionsResponse.headers.allow);
      } catch (optError) {
        console.log(`  无法获取OPTIONS信息`);
      }
    }

    console.log('\n========================================');
    console.log('测试完成');
    console.log('========================================');

  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    if (error.response) {
      console.error('  响应:', error.response.data);
    }
  }
}

testRouteRegistration();
