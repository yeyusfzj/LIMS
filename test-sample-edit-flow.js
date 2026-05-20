/**
 * 测试样品编辑完整流程
 * 验证：编辑 -> 保存 -> 跳转 -> 刷新
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000';

// 测试用户凭证
const TEST_USER = {
  username: 'admin',
  password: 'Admin123!@#'
};

let authToken = '';

// 登录获取token
async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, TEST_USER);
    authToken = response.data.data.token;
    console.log('✓ 登录成功');
    return true;
  } catch (error) {
    console.error('✗ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

// 获取样品列表
async function getSampleList() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/samples`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, pageSize: 10 }
    });
    
    const samples = response.data.data.items;
    console.log(`✓ 获取样品列表成功，共 ${samples.length} 条`);
    
    if (samples.length > 0) {
      console.log('  第一个样品:', {
        id: samples[0].id,
        barcode: samples[0].barcode,
        sampleName: samples[0].sample_name,
        version: samples[0].version
      });
      return samples[0];
    }
    return null;
  } catch (error) {
    console.error('✗ 获取样品列表失败:', error.response?.data || error.message);
    return null;
  }
}

// 获取样品详情（编辑前）
async function getSampleDetail(sampleId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/samples/${sampleId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const sample = response.data.data;
    console.log('✓ 获取样品详情成功（编辑前）:', {
      id: sample.id,
      sampleName: sample.sample_name,
      quantity: sample.quantity,
      version: sample.version,
      updatedAt: sample.updated_at
    });
    return sample;
  } catch (error) {
    console.error('✗ 获取样品详情失败:', error.response?.data || error.message);
    return null;
  }
}

// 更新样品
async function updateSample(sampleId, originalData) {
  try {
    const updateData = {
      sample_name: originalData.sample_name + ' (已编辑)',
      quantity: originalData.quantity + 10,
      description: `测试编辑 - ${new Date().toISOString()}`
    };
    
    console.log('→ 准备更新样品:', updateData);
    
    const response = await axios.patch(
      `${API_BASE_URL}/api/samples/${sampleId}`,
      updateData,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const updated = response.data.data;
    console.log('✓ 样品更新成功:', {
      id: updated.id,
      sampleName: updated.sample_name,
      quantity: updated.quantity,
      version: updated.version,
      updatedAt: updated.updated_at
    });
    return updated;
  } catch (error) {
    console.error('✗ 样品更新失败:', error.response?.data || error.message);
    return null;
  }
}

// 再次获取样品详情（验证更新）
async function verifySampleUpdate(sampleId, expectedVersion) {
  try {
    // 等待一小段时间确保数据库已更新
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const response = await axios.get(`${API_BASE_URL}/api/samples/${sampleId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const sample = response.data.data;
    console.log('✓ 验证样品更新（编辑后）:', {
      id: sample.id,
      sampleName: sample.sample_name,
      quantity: sample.quantity,
      version: sample.version,
      updatedAt: sample.updated_at
    });
    
    // 验证版本号是否递增
    if (sample.version === expectedVersion + 1) {
      console.log('✓ 版本号正确递增');
    } else {
      console.log(`✗ 版本号异常: 期望 ${expectedVersion + 1}, 实际 ${sample.version}`);
    }
    
    return sample;
  } catch (error) {
    console.error('✗ 验证样品更新失败:', error.response?.data || error.message);
    return null;
  }
}

// 主测试流程
async function runTest() {
  console.log('========================================');
  console.log('测试样品编辑完整流程');
  console.log('========================================\n');

  // 1. 登录
  console.log('步骤 1: 登录');
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n测试失败：无法登录');
    return;
  }
  console.log();

  // 2. 获取样品列表
  console.log('步骤 2: 获取样品列表');
  const sample = await getSampleList();
  if (!sample) {
    console.log('\n测试失败：没有可用的样品');
    return;
  }
  console.log();

  // 3. 获取样品详情（编辑前）
  console.log('步骤 3: 获取样品详情（模拟进入详情页）');
  const beforeEdit = await getSampleDetail(sample.id);
  if (!beforeEdit) {
    console.log('\n测试失败：无法获取样品详情');
    return;
  }
  console.log();

  // 4. 更新样品（模拟编辑保存）
  console.log('步骤 4: 更新样品（模拟编辑保存）');
  const updated = await updateSample(sample.id, beforeEdit);
  if (!updated) {
    console.log('\n测试失败：无法更新样品');
    return;
  }
  console.log();

  // 5. 验证更新（模拟跳转回详情页并刷新）
  console.log('步骤 5: 验证更新（模拟跳转回详情页并刷新）');
  const afterEdit = await verifySampleUpdate(sample.id, beforeEdit.version);
  if (!afterEdit) {
    console.log('\n测试失败：无法验证更新');
    return;
  }
  console.log();

  // 6. 对比结果
  console.log('========================================');
  console.log('测试结果对比');
  console.log('========================================');
  console.log('编辑前:');
  console.log(`  样品名称: ${beforeEdit.sample_name}`);
  console.log(`  数量: ${beforeEdit.quantity}`);
  console.log(`  版本: ${beforeEdit.version}`);
  console.log(`  更新时间: ${beforeEdit.updated_at}`);
  console.log();
  console.log('编辑后:');
  console.log(`  样品名称: ${afterEdit.sample_name}`);
  console.log(`  数量: ${afterEdit.quantity}`);
  console.log(`  版本: ${afterEdit.version}`);
  console.log(`  更新时间: ${afterEdit.updated_at}`);
  console.log();

  // 验证数据是否真的改变了
  const nameChanged = afterEdit.sample_name !== beforeEdit.sample_name;
  const quantityChanged = afterEdit.quantity !== beforeEdit.quantity;
  const versionIncremented = afterEdit.version === beforeEdit.version + 1;
  const timeUpdated = new Date(afterEdit.updated_at) > new Date(beforeEdit.updated_at);

  console.log('验证结果:');
  console.log(`  ${nameChanged ? '✓' : '✗'} 样品名称已更新`);
  console.log(`  ${quantityChanged ? '✓' : '✗'} 数量已更新`);
  console.log(`  ${versionIncremented ? '✓' : '✗'} 版本号已递增`);
  console.log(`  ${timeUpdated ? '✓' : '✗'} 更新时间已改变`);
  console.log();

  if (nameChanged && quantityChanged && versionIncremented && timeUpdated) {
    console.log('✓✓✓ 所有测试通过！后端功能完全正常！');
    console.log();
    console.log('如果前端页面显示的信息没有变化，可能的原因：');
    console.log('1. 浏览器缓存了旧的前端代码');
    console.log('2. 前端开发服务器需要重启');
    console.log('3. 需要硬刷新浏览器（Ctrl+Shift+R 或 Cmd+Shift+R）');
  } else {
    console.log('✗✗✗ 部分测试失败');
  }
}

// 运行测试
runTest().catch(error => {
  console.error('测试执行出错:', error);
});
