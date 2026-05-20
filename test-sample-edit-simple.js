/**
 * 简单的样品编辑测试
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function test() {
  console.log('='.repeat(60));
  console.log('样品编辑功能测试');
  console.log('='.repeat(60));
  
  try {
    // 1. 登录
    console.log('\n1. 登录...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ 登录成功');
    if (token) {
      console.log('Token:', token.substring(0, 50) + '...');
    } else {
      console.log('⚠️  Token 为空');
      console.log('登录响应:', JSON.stringify(loginResponse.data, null, 2));
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. 获取样品列表
    console.log('\n2. 获取样品列表...');
    const listResponse = await axios.get(`${API_BASE_URL}/samples`, {
      params: { page: 1, pageSize: 1 },
      headers
    });
    
    if (!listResponse.data.data.items || listResponse.data.data.items.length === 0) {
      console.log('❌ 没有可用的样品数据');
      return;
    }
    
    const sample = listResponse.data.data.items[0];
    console.log('✅ 获取到样品:', {
      id: sample.id,
      sample_name: sample.sample_name,
      version: sample.version
    });
    
    // 3. 更新样品
    console.log('\n3. 更新样品名称...');
    const originalName = sample.sample_name;
    const newName = `测试样品_${Date.now()}`;
    
    console.log(`原名称: ${originalName}`);
    console.log(`新名称: ${newName}`);
    
    const updateData = {
      sample_name: newName
    };
    
    console.log('发送更新请求:', updateData);
    
    const updateResponse = await axios.patch(
      `${API_BASE_URL}/samples/${sample.id}`,
      updateData,
      { headers }
    );
    
    console.log('✅ 更新响应:', {
      success: updateResponse.data.success,
      sample_name: updateResponse.data.data.sample_name,
      version: updateResponse.data.data.version
    });
    
    // 4. 验证更新
    console.log('\n4. 验证更新结果...');
    const verifyResponse = await axios.get(
      `${API_BASE_URL}/samples/${sample.id}`,
      { headers }
    );
    
    const updatedSample = verifyResponse.data.data;
    console.log('当前样品信息:', {
      sample_name: updatedSample.sample_name,
      version: updatedSample.version
    });
    
    if (updatedSample.sample_name === newName) {
      console.log('\n✅ 测试通过：样品名称已成功更新！');
      console.log(`   ${originalName} → ${newName}`);
    } else {
      console.log('\n❌ 测试失败：样品名称未更新');
      console.log(`   期望: ${newName}`);
      console.log(`   实际: ${updatedSample.sample_name}`);
    }
    
    // 5. 恢复原名称
    console.log('\n5. 恢复原名称...');
    await axios.patch(
      `${API_BASE_URL}/samples/${sample.id}`,
      { sample_name: originalName },
      { headers }
    );
    console.log('✅ 已恢复原名称');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

test();
