/**
 * 测试存储条件格式处理
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

// 测试配置
const TEST_CONFIG = {
  username: 'admin',
  password: 'Admin@123456'
};

let authToken = null;

/**
 * 登录获取 token
 */
async function login() {
  console.log('\n=== 登录 ===');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: TEST_CONFIG.username,
      password: TEST_CONFIG.password
    });
    
    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✓ 登录成功');
      return true;
    }
    return false;
  } catch (error) {
    console.error('✗ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试存储条件格式
 */
async function testStorageConditionFormat() {
  console.log('\n=== 测试存储条件格式 ===');
  
  try {
    // 获取第一个样品
    const response = await axios.get(`${API_BASE_URL}/samples`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        page_size: 1
      }
    });
    
    if (!response.data.success || !response.data.data.items || response.data.data.items.length === 0) {
      console.log('✗ 没有找到样品');
      return;
    }
    
    const sample = response.data.data.items[0];
    console.log('\n样品信息:');
    console.log('  ID:', sample.id);
    console.log('  条码:', sample.barcode);
    console.log('  存储条件:', sample.storage_condition);
    console.log('  存储条件类型:', typeof sample.storage_condition);
    
    // 测试解析
    console.log('\n测试解析存储条件:');
    if (sample.storage_condition) {
      try {
        const parsed = JSON.parse(sample.storage_condition);
        console.log('✓ 是 JSON 格式');
        console.log('  解析结果:', parsed);
      } catch (e) {
        console.log('✓ 是纯文本格式');
        console.log('  文本内容:', sample.storage_condition);
      }
    } else {
      console.log('⚠ 存储条件为空');
    }
    
    // 测试更新为 JSON 格式
    console.log('\n=== 测试更新为 JSON 格式 ===');
    const updateData = {
      storage_condition: JSON.stringify({
        temperature: 4,
        humidity: 60,
        specialRequirements: '避光保存'
      })
    };
    
    const updateResponse = await axios.patch(
      `${API_BASE_URL}/samples/${sample.id}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (updateResponse.data.success) {
      console.log('✓ 更新成功');
      console.log('  新的存储条件:', updateResponse.data.data.storage_condition);
      
      // 验证解析
      try {
        const parsed = JSON.parse(updateResponse.data.data.storage_condition);
        console.log('✓ 新格式可以正确解析');
        console.log('  温度:', parsed.temperature);
        console.log('  湿度:', parsed.humidity);
        console.log('  特殊要求:', parsed.specialRequirements);
      } catch (e) {
        console.log('✗ 新格式解析失败:', e.message);
      }
    }
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('========================================');
  console.log('存储条件格式测试');
  console.log('========================================');
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n测试终止: 登录失败');
    return;
  }
  
  await testStorageConditionFormat();
  
  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行出错:', error);
});
