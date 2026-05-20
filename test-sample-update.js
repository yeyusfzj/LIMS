/**
 * 测试样品更新功能
 * 验证 405 错误是否已修复
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
      console.log('Token:', authToken.substring(0, 20) + '...');
      return true;
    } else if (response.data.accessToken) {
      // 兼容不同的响应格式
      authToken = response.data.accessToken;
      console.log('✓ 登录成功');
      console.log('Token:', authToken.substring(0, 20) + '...');
      return true;
    } else {
      console.error('✗ 登录失败: 响应格式不正确');
      console.error('响应数据:', response.data);
      return false;
    }
  } catch (error) {
    console.error('✗ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 获取样品列表
 */
async function getSamples() {
  console.log('\n=== 步骤 2: 获取样品列表 ===');
  try {
    const response = await axios.get(`${API_BASE_URL}/samples`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        page_size: 5
      }
    });
    
    if (response.data.success && response.data.data.items) {
      const samples = response.data.data.items;
      console.log(`✓ 获取到 ${samples.length} 个样品`);
      
      if (samples.length > 0) {
        const sample = samples[0];
        console.log('\n第一个样品信息:');
        console.log('  ID:', sample.id);
        console.log('  条码:', sample.barcode);
        console.log('  样品编号:', sample.sample_number);
        console.log('  样品名称:', sample.name);
        console.log('  样品类型:', sample.type);
        console.log('  状态:', sample.status);
        return sample;
      } else {
        console.log('⚠ 没有找到样品，无法测试更新功能');
        return null;
      }
    } else {
      console.error('✗ 获取样品列表失败: 响应格式不正确');
      return null;
    }
  } catch (error) {
    console.error('✗ 获取样品列表失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试使用 PUT 方法更新样品（应该返回 405）
 */
async function testUpdateWithPUT(sampleId) {
  console.log('\n=== 步骤 3: 测试使用 PUT 方法更新样品 ===');
  try {
    const response = await axios.put(
      `${API_BASE_URL}/samples/${sampleId}`,
      {
        description: '测试更新 - 使用 PUT 方法'
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('✗ PUT 方法不应该成功（后端只支持 PATCH）');
    return false;
  } catch (error) {
    if (error.response?.status === 405) {
      console.log('✓ PUT 方法返回 405 错误（符合预期）');
      console.log('  错误信息:', error.response.data);
      return true;
    } else {
      console.error('✗ PUT 方法返回意外错误:', error.response?.status, error.response?.data || error.message);
      return false;
    }
  }
}

/**
 * 测试使用 PATCH 方法更新样品（应该成功）
 */
async function testUpdateWithPATCH(sampleId) {
  console.log('\n=== 步骤 4: 测试使用 PATCH 方法更新样品 ===');
  try {
    const updateData = {
      description: `测试更新 - 使用 PATCH 方法 - ${new Date().toISOString()}`
    };
    
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
      console.log('✓ PATCH 方法更新成功');
      console.log('  更新后的描述:', response.data.data.description);
      return true;
    } else {
      console.error('✗ PATCH 方法更新失败: 响应格式不正确');
      return false;
    }
  } catch (error) {
    console.error('✗ PATCH 方法更新失败:', error.response?.status, error.response?.data || error.message);
    return false;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('========================================');
  console.log('样品更新功能测试');
  console.log('测试目标: 验证前端使用 PATCH 方法更新样品');
  console.log('========================================');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n测试终止: 登录失败');
    return;
  }
  
  // 2. 获取样品列表
  const sample = await getSamples();
  if (!sample) {
    console.log('\n测试终止: 无法获取样品');
    return;
  }
  
  // 3. 测试 PUT 方法（应该失败）
  await testUpdateWithPUT(sample.id);
  
  // 4. 测试 PATCH 方法（应该成功）
  const patchSuccess = await testUpdateWithPATCH(sample.id);
  
  // 总结
  console.log('\n========================================');
  console.log('测试总结');
  console.log('========================================');
  if (patchSuccess) {
    console.log('✓ 样品更新功能正常');
    console.log('✓ 前端应使用 PATCH 方法更新样品');
  } else {
    console.log('✗ 样品更新功能存在问题');
  }
  console.log('========================================');
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行出错:', error);
});
