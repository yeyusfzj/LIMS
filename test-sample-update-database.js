/**
 * 测试样品更新是否真正保存到数据库
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
  console.log('\n=== 步骤 1: 登录获取 token ===');
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
 * 获取样品详情
 */
async function getSampleById(sampleId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/samples/${sampleId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('获取样品详情失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 更新样品
 */
async function updateSample(sampleId, updateData) {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/samples/${sampleId}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('更新样品失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('========================================');
  console.log('样品更新数据库持久化测试');
  console.log('========================================');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n测试终止: 登录失败');
    return;
  }
  
  // 2. 获取第一个样品
  console.log('\n=== 步骤 2: 获取样品列表 ===');
  try {
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
    console.log('✓ 获取到样品');
    console.log(`  ID: ${sample.id}`);
    console.log(`  条码: ${sample.barcode}`);
    console.log(`  样品编号: ${sample.sample_number}`);
    
    // 3. 记录更新前的描述
    console.log('\n=== 步骤 3: 记录更新前的状态 ===');
    const beforeUpdate = await getSampleById(sample.id);
    console.log('更新前的描述:', beforeUpdate.description || '(空)');
    console.log('更新前的版本:', beforeUpdate.version);
    
    // 4. 更新样品描述
    console.log('\n=== 步骤 4: 更新样品描述 ===');
    const newDescription = `测试更新 - ${new Date().toISOString()}`;
    console.log('新描述:', newDescription);
    
    const updated = await updateSample(sample.id, {
      description: newDescription
    });
    
    if (!updated) {
      console.log('✗ 更新失败');
      return;
    }
    
    console.log('✓ 更新请求成功');
    console.log('  返回的描述:', updated.description);
    console.log('  返回的版本:', updated.version);
    
    // 5. 等待一秒，确保数据库已提交
    console.log('\n=== 步骤 5: 等待数据库提交 ===');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✓ 等待完成');
    
    // 6. 重新查询样品，验证数据库是否真正更新
    console.log('\n=== 步骤 6: 重新查询样品验证 ===');
    const afterUpdate = await getSampleById(sample.id);
    
    if (!afterUpdate) {
      console.log('✗ 重新查询失败');
      return;
    }
    
    console.log('重新查询的描述:', afterUpdate.description);
    console.log('重新查询的版本:', afterUpdate.version);
    
    // 7. 对比结果
    console.log('\n========================================');
    console.log('测试结果');
    console.log('========================================');
    
    if (afterUpdate.description === newDescription) {
      console.log('✓ 数据库更新成功！');
      console.log('  更新前描述:', beforeUpdate.description || '(空)');
      console.log('  更新后描述:', afterUpdate.description);
      console.log('  版本变化:', `${beforeUpdate.version} -> ${afterUpdate.version}`);
    } else {
      console.log('✗ 数据库更新失败！');
      console.log('  期望描述:', newDescription);
      console.log('  实际描述:', afterUpdate.description);
      console.log('  更新前描述:', beforeUpdate.description || '(空)');
    }
    
    console.log('========================================');
    
  } catch (error) {
    console.error('测试执行出错:', error);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行出错:', error);
});
