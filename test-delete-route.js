/**
 * 快速测试删除路由是否存在
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testDeleteRoute() {
  console.log('测试删除路由...\n');

  try {
    // 1. 登录
    console.log('1. 登录...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin123!'
    });
    const token = loginResponse.data.data.accessToken;
    console.log('✓ 登录成功\n');

    // 2. 获取样品列表
    console.log('2. 获取样品列表...');
    const listResponse = await axios.get(`${API_BASE_URL}/samples`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, pageSize: 1 }
    });
    
    if (listResponse.data.data.items.length === 0) {
      console.log('✗ 没有样品可以测试删除');
      return;
    }

    const sampleId = listResponse.data.data.items[0].id;
    const sampleName = listResponse.data.data.items[0].sampleName;
    console.log(`✓ 找到样品: ${sampleName} (ID: ${sampleId})\n`);

    // 3. 尝试删除
    console.log('3. 测试删除API...');
    const deleteResponse = await axios.delete(`${API_BASE_URL}/samples/${sampleId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✓ 删除API响应:', deleteResponse.status, deleteResponse.data.message);
    console.log('\n✅ 删除功能正常工作!');

  } catch (error) {
    if (error.response) {
      console.error(`\n✗ API错误 (${error.response.status}):`, error.response.data);
      
      if (error.response.status === 404) {
        console.error('\n❌ 404错误 - 路由未找到!');
        console.error('可能原因:');
        console.error('1. 后端服务没有重启');
        console.error('2. 路由配置有问题');
        console.error('3. 样品ID不存在');
        console.error('\n请重启后端服务: cd backend-api && npm run dev');
      } else if (error.response.status === 400) {
        console.log('\n⚠️  样品有关联数据,无法删除(这是正常的保护机制)');
      }
    } else {
      console.error('\n✗ 网络错误:', error.message);
      console.error('请确认后端服务正在运行: http://localhost:3000');
    }
  }
}

testDeleteRoute();
