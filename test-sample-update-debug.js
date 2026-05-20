/**
 * 样品更新调试测试脚本
 * 
 * 用于测试前端发送的数据格式是否正确
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';
const SAMPLE_ID = 'c9a8a88e-4b51-4715-b290-52f8b052a46c'; // 替换为实际的样品ID

async function login() {
  console.log('🔐 正在登录...');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (response.data.success) {
      console.log('✅ 登录成功');
      return response.data.data.access_token;
    } else {
      throw new Error('登录失败');
    }
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    throw error;
  }
}

async function testUpdateWithSnakeCase(token) {
  console.log('\n📝 测试1: 使用蛇形命名（正确格式）');
  console.log('发送数据:', {
    sample_name: '测试样品_蛇形命名',
    client_name: '测试客户',
    quantity: 600,
    unit: 'g'
  });
  
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/samples/${SAMPLE_ID}`,
      {
        sample_name: '测试样品_蛇形命名',
        client_name: '测试客户',
        quantity: 600,
        unit: 'g'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ 更新成功');
    console.log('返回数据:', {
      sample_name: response.data.data.sample_name,
      client_name: response.data.data.client_name,
      version: response.data.data.version
    });
    return true;
  } catch (error) {
    console.error('❌ 更新失败:', error.response?.data || error.message);
    return false;
  }
}

async function testUpdateWithCamelCase(token) {
  console.log('\n📝 测试2: 使用驼峰命名（错误格式）');
  console.log('发送数据:', {
    sampleName: '测试样品_驼峰命名',
    clientName: '测试客户',
    quantity: 700,
    unit: 'g'
  });
  
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/samples/${SAMPLE_ID}`,
      {
        sampleName: '测试样品_驼峰命名',
        clientName: '测试客户',
        quantity: 700,
        unit: 'g'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ 更新成功（但数据可能没有更新）');
    console.log('返回数据:', {
      sample_name: response.data.data.sample_name,
      client_name: response.data.data.client_name,
      version: response.data.data.version
    });
    return true;
  } catch (error) {
    console.error('❌ 更新失败:', error.response?.data || error.message);
    return false;
  }
}

async function getSampleInfo(token) {
  console.log('\n🔍 获取样品当前信息');
  try {
    const response = await axios.get(
      `${API_BASE_URL}/samples/${SAMPLE_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('样品信息:', {
      id: response.data.data.id,
      sample_name: response.data.data.sample_name,
      client_name: response.data.data.client_name,
      quantity: response.data.data.quantity,
      version: response.data.data.version
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ 获取失败:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('样品更新调试测试');
  console.log('='.repeat(60));
  
  try {
    // 1. 登录
    const token = await login();
    
    // 2. 获取初始状态
    const initialInfo = await getSampleInfo(token);
    if (!initialInfo) {
      console.error('❌ 无法获取样品信息，请检查样品ID是否正确');
      return;
    }
    
    // 3. 测试蛇形命名（正确格式）
    await testUpdateWithSnakeCase(token);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    const afterSnakeCase = await getSampleInfo(token);
    
    if (afterSnakeCase && afterSnakeCase.sample_name === '测试样品_蛇形命名') {
      console.log('✅ 蛇形命名测试通过：数据已更新');
    } else {
      console.log('❌ 蛇形命名测试失败：数据未更新');
    }
    
    // 4. 测试驼峰命名（错误格式）
    await testUpdateWithCamelCase(token);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    const afterCamelCase = await getSampleInfo(token);
    
    if (afterCamelCase && afterCamelCase.sample_name === '测试样品_驼峰命名') {
      console.log('⚠️  驼峰命名测试：数据已更新（说明后端接受了驼峰命名）');
    } else {
      console.log('❌ 驼峰命名测试：数据未更新（后端不接受驼峰命名）');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('测试完成');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

main();
