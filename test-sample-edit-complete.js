/**
 * 完整的样品编辑测试
 * 测试从查看 -> 编辑 -> 保存 -> 查看的完整流程
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
  console.log('\n=== 步骤 1: 登录 ===');
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
async function getSampleDetail(sampleId) {
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
  console.log('样品编辑完整流程测试');
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
    
    // 3. 查看样品详情（模拟点击"查看"按钮）
    console.log('\n=== 步骤 3: 查看样品详情 ===');
    const beforeEdit = await getSampleDetail(sample.id);
    
    if (!beforeEdit) {
      console.log('✗ 获取样品详情失败');
      return;
    }
    
    console.log('✓ 获取样品详情成功');
    console.log('  样品名称:', beforeEdit.sample_name);
    console.log('  委托方:', beforeEdit.client_name);
    console.log('  描述:', beforeEdit.description);
    console.log('  存储条件:', beforeEdit.storage_condition);
    
    // 4. 编辑样品（模拟点击"编辑"按钮并修改）
    console.log('\n=== 步骤 4: 编辑样品 ===');
    const timestamp = new Date().toISOString();
    const updateData = {
      description: `完整测试 - ${timestamp}`,
      storage_condition: JSON.stringify({
        temperature: 25,
        humidity: 50,
        specialRequirements: '常温保存'
      })
    };
    
    console.log('更新数据:');
    console.log('  新描述:', updateData.description);
    console.log('  新存储条件:', updateData.storage_condition);
    
    const updated = await updateSample(sample.id, updateData);
    
    if (!updated) {
      console.log('✗ 更新失败');
      return;
    }
    
    console.log('✓ 更新成功');
    console.log('  返回的描述:', updated.description);
    console.log('  返回的存储条件:', updated.storage_condition);
    console.log('  版本号:', `${beforeEdit.version} -> ${updated.version}`);
    
    // 5. 等待数据库提交
    console.log('\n=== 步骤 5: 等待数据库提交 ===');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✓ 等待完成');
    
    // 6. 重新查看样品详情（模拟保存后返回详情页面）
    console.log('\n=== 步骤 6: 重新查看样品详情 ===');
    const afterEdit = await getSampleDetail(sample.id);
    
    if (!afterEdit) {
      console.log('✗ 重新获取样品详情失败');
      return;
    }
    
    console.log('✓ 重新获取样品详情成功');
    console.log('  样品名称:', afterEdit.sample_name);
    console.log('  委托方:', afterEdit.client_name);
    console.log('  描述:', afterEdit.description);
    console.log('  存储条件:', afterEdit.storage_condition);
    
    // 7. 验证结果
    console.log('\n========================================');
    console.log('测试结果');
    console.log('========================================');
    
    const checks = [
      {
        name: '描述更新',
        expected: updateData.description,
        actual: afterEdit.description,
        pass: afterEdit.description === updateData.description
      },
      {
        name: '存储条件更新',
        expected: updateData.storage_condition,
        actual: afterEdit.storage_condition,
        pass: afterEdit.storage_condition === updateData.storage_condition
      },
      {
        name: '版本号递增',
        expected: beforeEdit.version + 1,
        actual: afterEdit.version,
        pass: afterEdit.version === beforeEdit.version + 1
      }
    ];
    
    let allPassed = true;
    for (const check of checks) {
      if (check.pass) {
        console.log(`✓ ${check.name}: 通过`);
      } else {
        console.log(`✗ ${check.name}: 失败`);
        console.log(`  期望: ${check.expected}`);
        console.log(`  实际: ${check.actual}`);
        allPassed = false;
      }
    }
    
    console.log('\n========================================');
    if (allPassed) {
      console.log('✓✓✓ 所有测试通过！');
      console.log('✓ 样品编辑功能正常');
      console.log('✓ 数据库更新成功');
      console.log('✓ 数据刷新正常');
    } else {
      console.log('✗✗✗ 部分测试失败');
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
