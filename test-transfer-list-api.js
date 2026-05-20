/**
 * 测试流转记录列表 API
 * 
 * 测试新添加的 GET /api/v1/samples/transfers 端点
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

// 测试账号
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

let authToken = '';

/**
 * 登录获取 token
 */
async function login() {
  try {
    console.log('\n=== 1. 登录获取 Token ===');
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✓ 登录成功');
      console.log(`Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      console.error('✗ 登录失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('✗ 登录请求失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试获取流转记录列表（无筛选）
 */
async function testGetTransfersList() {
  try {
    console.log('\n=== 2. 获取流转记录列表（无筛选） ===');
    const response = await axios.get(`${BASE_URL}/samples/transfers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        page_size: 10
      }
    });
    
    if (response.data.success) {
      console.log('✓ 获取流转记录列表成功');
      console.log(`总记录数: ${response.data.data.pagination.total}`);
      console.log(`当前页: ${response.data.data.pagination.page}`);
      console.log(`每页数量: ${response.data.data.pagination.page_size}`);
      console.log(`总页数: ${response.data.data.pagination.total_pages}`);
      console.log(`返回记录数: ${response.data.data.items.length}`);
      
      if (response.data.data.items.length > 0) {
        console.log('\n第一条记录:');
        const first = response.data.data.items[0];
        console.log(`  ID: ${first.id}`);
        console.log(`  样品ID: ${first.sample_id}`);
        if (first.sample) {
          console.log(`  样品编号: ${first.sample.sample_number}`);
          console.log(`  样品名称: ${first.sample.sample_name}`);
        }
        console.log(`  从: ${first.from_location} -> 到: ${first.to_location}`);
        console.log(`  状态: ${first.status}`);
        console.log(`  发送方确认: ${first.sender_confirmed}`);
        console.log(`  接收方确认: ${first.receiver_confirmed}`);
      }
      return true;
    } else {
      console.error('✗ 获取流转记录列表失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('✗ 获取流转记录列表请求失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试获取流转记录列表（带筛选）
 */
async function testGetTransfersListWithFilters() {
  try {
    console.log('\n=== 3. 获取流转记录列表（带筛选） ===');
    const response = await axios.get(`${BASE_URL}/samples/transfers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        page_size: 10,
        status: 'PENDING'
      }
    });
    
    if (response.data.success) {
      console.log('✓ 获取流转记录列表成功（状态=PENDING）');
      console.log(`总记录数: ${response.data.data.pagination.total}`);
      console.log(`返回记录数: ${response.data.data.items.length}`);
      
      // 验证所有记录的状态都是 PENDING
      const allPending = response.data.data.items.every(item => item.status === 'PENDING');
      if (allPending) {
        console.log('✓ 所有记录的状态都是 PENDING');
      } else {
        console.log('✗ 存在非 PENDING 状态的记录');
      }
      return true;
    } else {
      console.error('✗ 获取流转记录列表失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('✗ 获取流转记录列表请求失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试分页功能
 */
async function testPagination() {
  try {
    console.log('\n=== 4. 测试分页功能 ===');
    
    // 获取第一页
    const page1Response = await axios.get(`${BASE_URL}/samples/transfers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        page_size: 5
      }
    });
    
    if (!page1Response.data.success) {
      console.error('✗ 获取第一页失败');
      return false;
    }
    
    console.log(`✓ 第一页: ${page1Response.data.data.items.length} 条记录`);
    
    // 如果有第二页，获取第二页
    if (page1Response.data.data.pagination.total_pages > 1) {
      const page2Response = await axios.get(`${BASE_URL}/samples/transfers`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        params: {
          page: 2,
          page_size: 5
        }
      });
      
      if (page2Response.data.success) {
        console.log(`✓ 第二页: ${page2Response.data.data.items.length} 条记录`);
        
        // 验证两页的记录不重复
        const page1Ids = page1Response.data.data.items.map(item => item.id);
        const page2Ids = page2Response.data.data.items.map(item => item.id);
        const hasDuplicate = page1Ids.some(id => page2Ids.includes(id));
        
        if (!hasDuplicate) {
          console.log('✓ 两页的记录没有重复');
        } else {
          console.log('✗ 两页的记录有重复');
        }
      }
    } else {
      console.log('总记录数不足，无法测试第二页');
    }
    
    return true;
  } catch (error) {
    console.error('✗ 分页测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('========================================');
  console.log('流转记录列表 API 测试');
  console.log('========================================');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n测试终止：登录失败');
    return;
  }
  
  // 2. 测试获取流转记录列表（无筛选）
  await testGetTransfersList();
  
  // 3. 测试获取流转记录列表（带筛选）
  await testGetTransfersListWithFilters();
  
  // 4. 测试分页功能
  await testPagination();
  
  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
