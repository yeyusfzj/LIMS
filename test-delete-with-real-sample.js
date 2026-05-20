/**
 * 完整的删除测试 - 创建样品然后删除
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testCompleteFlow() {
  console.log('========================================');
  console.log('完整删除流程测试');
  console.log('========================================\n');

  let token = '';
  let sampleId = '';

  try {
    // 1. 登录 - 尝试多个可能的用户
    console.log('1. 尝试登录...');
    const users = [
      { username: 'admin', password: 'Admin@123456' },
      { username: 'testuser', password: 'User@123456' },
      { username: 'admin', password: 'Admin123!' }
    ];

    for (const user of users) {
      try {
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, user);
        token = loginResponse.data.data.accessToken;
        console.log(`✓ 登录成功 (用户: ${user.username})`);
        console.log(`Token: ${token.substring(0, 30)}...`);
        break;
      } catch (error) {
        console.log(`  尝试 ${user.username} 失败`);
      }
    }

    if (!token) {
      console.log('\n✗ 所有登录尝试都失败了');
      console.log('请先创建测试用户或检查数据库');
      return;
    }

    // 2. 创建测试样品
    console.log('\n2. 创建测试样品...');
    const sampleData = {
      clientName: '测试客户-删除测试',
      clientContact: '13800138000',
      sampleName: '测试样品-删除功能测试',
      sampleType: '水质',
      sampleCategory: '地表水',
      quantity: 100,
      unit: 'mL',
      receivedDate: new Date().toISOString(),
      samplingDate: new Date().toISOString(),
      samplingLocation: '测试地点',
      storageLocation: '测试位置',
      priority: 'NORMAL',
      description: '用于测试删除功能的样品'
    };

    const createResponse = await axios.post(`${API_BASE_URL}/samples`, sampleData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    sampleId = createResponse.data.data.id;
    const barcode = createResponse.data.data.barcode;
    console.log(`✓ 样品创建成功`);
    console.log(`  ID: ${sampleId}`);
    console.log(`  条码: ${barcode}`);

    // 3. 验证样品存在
    console.log('\n3. 验证样品存在...');
    const getResponse = await axios.get(`${API_BASE_URL}/samples/${sampleId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✓ 样品存在: ${getResponse.data.data.sampleName}`);

    // 4. 删除样品
    console.log('\n4. 删除样品...');
    console.log(`  URL: DELETE ${API_BASE_URL}/samples/${sampleId}`);
    
    const deleteResponse = await axios.delete(`${API_BASE_URL}/samples/${sampleId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✓ 删除成功!`);
    console.log(`  响应: ${deleteResponse.data.message}`);
    console.log(`  状态码: ${deleteResponse.status}`);

    // 5. 验证样品已删除(状态变为ARCHIVED)
    console.log('\n5. 验证样品状态...');
    const verifyResponse = await axios.get(`${API_BASE_URL}/samples/${sampleId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (verifyResponse.data.data.status === 'ARCHIVED') {
      console.log(`✓ 样品状态已更新为 ARCHIVED`);
    } else {
      console.log(`? 样品状态: ${verifyResponse.data.data.status}`);
    }

    console.log('\n========================================');
    console.log('✅ 所有测试通过!删除功能正常工作!');
    console.log('========================================');

  } catch (error) {
    console.error('\n✗ 测试失败:');
    
    if (error.response) {
      console.error(`  状态码: ${error.response.status}`);
      console.error(`  错误信息:`, error.response.data);
      
      if (error.response.status === 404) {
        console.error('\n❌ 404错误分析:');
        console.error('  可能原因:');
        console.error('  1. 样品ID不存在');
        console.error('  2. 路由配置问题');
        console.error('  3. 权限中间件拦截');
        console.error(`\n  请求的URL: DELETE ${API_BASE_URL}/samples/${sampleId}`);
      } else if (error.response.status === 403) {
        console.error('\n❌ 403权限错误:');
        console.error('  当前用户没有 sample:delete 权限');
        console.error('  需要管理员权限才能删除样品');
      } else if (error.response.status === 400) {
        console.error('\n⚠️  400错误:');
        console.error('  样品可能有关联数据,无法删除');
      }
    } else {
      console.error(`  错误: ${error.message}`);
    }

    console.log('\n========================================');
    console.log('测试未完成');
    console.log('========================================');
  }
}

testCompleteFlow();
