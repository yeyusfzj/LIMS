/**
 * 样品编辑功能最终测试
 * 测试完整的编辑流程，验证数据是否正确更新和返回
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

// 测试用户凭证
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

let authToken = '';

// 登录获取token
async function login() {
  try {
    console.log('🔐 正在登录...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✅ 登录成功');
      return true;
    } else {
      console.error('❌ 登录失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录错误:', error.response?.data || error.message);
    return false;
  }
}

// 获取样品列表
async function getSampleList() {
  try {
    console.log('\n📋 获取样品列表...');
    const response = await axios.get(`${API_BASE_URL}/samples`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, page_size: 10 }
    });
    
    if (response.data.success && response.data.data.items.length > 0) {
      const sample = response.data.data.items[0];
      console.log('✅ 找到样品:', {
        id: sample.id,
        sample_name: sample.sample_name,
        quantity: sample.quantity,
        version: sample.version
      });
      return sample;
    } else {
      console.error('❌ 没有找到样品');
      return null;
    }
  } catch (error) {
    console.error('❌ 获取样品列表失败:', error.response?.data || error.message);
    return null;
  }
}

// 获取样品详情
async function getSampleDetail(sampleId) {
  try {
    console.log(`\n🔍 获取样品详情 (ID: ${sampleId})...`);
    const response = await axios.get(`${API_BASE_URL}/samples/${sampleId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ 样品详情响应:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      const sample = response.data.data;
      console.log('📊 样品信息:', {
        id: sample.id,
        sample_name: sample.sample_name,
        quantity: sample.quantity,
        version: sample.version,
        updated_at: sample.updated_at
      });
      return sample;
    } else {
      console.error('❌ 获取样品详情失败');
      return null;
    }
  } catch (error) {
    console.error('❌ 获取样品详情错误:', error.response?.data || error.message);
    return null;
  }
}

// 更新样品
async function updateSample(sampleId, originalName, newName) {
  try {
    console.log(`\n💾 更新样品 (ID: ${sampleId})...`);
    console.log(`   原名称: ${originalName}`);
    console.log(`   新名称: ${newName}`);
    
    const updateData = {
      sample_name: newName,
      quantity: 600  // 同时修改数量以便观察
    };
    
    console.log('📤 发送更新请求:', JSON.stringify(updateData, null, 2));
    
    const response = await axios.patch(
      `${API_BASE_URL}/samples/${sampleId}`,
      updateData,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    console.log('✅ 更新响应:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      const updatedSample = response.data.data;
      console.log('📊 更新后的样品信息:', {
        id: updatedSample.id,
        sample_name: updatedSample.sample_name,
        quantity: updatedSample.quantity,
        version: updatedSample.version,
        updated_at: updatedSample.updated_at
      });
      
      // 验证更新是否成功
      if (updatedSample.sample_name === newName && updatedSample.quantity === 600) {
        console.log('✅ 验证通过：样品名称和数量已正确更新');
        return updatedSample;
      } else {
        console.error('❌ 验证失败：返回的数据与预期不符');
        console.error('   预期名称:', newName, '实际名称:', updatedSample.sample_name);
        console.error('   预期数量: 600, 实际数量:', updatedSample.quantity);
        return null;
      }
    } else {
      console.error('❌ 更新失败');
      return null;
    }
  } catch (error) {
    console.error('❌ 更新样品错误:', error.response?.data || error.message);
    return null;
  }
}

// 再次获取样品详情验证
async function verifySampleUpdate(sampleId, expectedName, expectedQuantity) {
  try {
    console.log(`\n🔍 验证更新结果 (ID: ${sampleId})...`);
    const response = await axios.get(`${API_BASE_URL}/samples/${sampleId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      const sample = response.data.data;
      console.log('📊 当前样品信息:', {
        id: sample.id,
        sample_name: sample.sample_name,
        quantity: sample.quantity,
        version: sample.version,
        updated_at: sample.updated_at
      });
      
      // 验证数据
      if (sample.sample_name === expectedName && sample.quantity === expectedQuantity) {
        console.log('✅ 最终验证通过：数据库中的数据已正确更新');
        return true;
      } else {
        console.error('❌ 最终验证失败：数据库中的数据与预期不符');
        console.error('   预期名称:', expectedName, '实际名称:', sample.sample_name);
        console.error('   预期数量:', expectedQuantity, '实际数量:', sample.quantity);
        return false;
      }
    } else {
      console.error('❌ 验证失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 验证错误:', error.response?.data || error.message);
    return false;
  }
}

// 主测试流程
async function runTest() {
  console.log('🚀 开始样品编辑功能测试\n');
  console.log('=' .repeat(60));
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ 测试失败：无法登录');
    return;
  }
  
  // 2. 获取样品列表
  const sample = await getSampleList();
  if (!sample) {
    console.log('\n❌ 测试失败：无法获取样品');
    return;
  }
  
  const sampleId = sample.id;
  const originalName = sample.sample_name;
  const newName = `${originalName}_测试${Date.now()}`;
  
  // 3. 获取样品详情（更新前）
  const beforeUpdate = await getSampleDetail(sampleId);
  if (!beforeUpdate) {
    console.log('\n❌ 测试失败：无法获取样品详情');
    return;
  }
  
  // 4. 更新样品
  const updated = await updateSample(sampleId, originalName, newName);
  if (!updated) {
    console.log('\n❌ 测试失败：更新样品失败');
    return;
  }
  
  // 5. 验证更新结果
  const verified = await verifySampleUpdate(sampleId, newName, 600);
  
  console.log('\n' + '='.repeat(60));
  if (verified) {
    console.log('✅ 测试成功：样品编辑功能正常工作');
    console.log('   - API 正确接收更新请求');
    console.log('   - 数据库正确保存更新数据');
    console.log('   - API 正确返回更新后的数据');
  } else {
    console.log('❌ 测试失败：样品编辑功能存在问题');
  }
  console.log('='.repeat(60));
}

// 运行测试
runTest().catch(error => {
  console.error('💥 测试过程中发生错误:', error);
});
