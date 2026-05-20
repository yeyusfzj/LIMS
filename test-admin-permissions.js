/**
 * 测试admin用户的权限
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function testAdminPermissions() {
  try {
    console.log('========================================');
    console.log('测试Admin用户权限');
    console.log('========================================\n');
    
    // 1. 登录
    console.log('1. 登录admin用户...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (!loginResponse.data || !loginResponse.data.data) {
      console.error('✗ 登录失败: 响应格式不正确');
      return;
    }
    
    const token = loginResponse.data.data.accessToken;
    const user = loginResponse.data.data.user;
    
    console.log('✓ 登录成功');
    console.log(`  用户ID: ${user.id}`);
    console.log(`  用户名: ${user.username}`);
    console.log(`  邮箱: ${user.email}`);
    console.log(`  全名: ${user.fullName}`);
    console.log(`  角色数量: ${user.roles.length}`);
    console.log(`  角色列表:`);
    user.roles.forEach((role, index) => {
      console.log(`    ${index + 1}. ${role}`);
    });
    console.log();
    
    // 2. 测试访问审核任务列表
    console.log('2. 测试访问审核任务列表...');
    try {
      const auditsResponse = await axios.get(`${API_BASE_URL}/audits`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          page: 1,
          pageSize: 5
        }
      });
      
      if (auditsResponse.data && auditsResponse.data.data) {
        const tasks = auditsResponse.data.data.items || [];
        console.log(`✓ 成功访问审核任务列表 (${tasks.length} 个任务)`);
      } else {
        console.log('⚠ 访问成功但响应格式异常');
      }
    } catch (error) {
      console.error(`✗ 访问审核任务列表失败: ${error.response?.status} ${error.response?.statusText}`);
    }
    console.log();
    
    // 3. 测试访问样品列表
    console.log('3. 测试访问样品列表...');
    try {
      const samplesResponse = await axios.get(`${API_BASE_URL}/samples`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          page: 1,
          pageSize: 5
        }
      });
      
      if (samplesResponse.data && samplesResponse.data.data) {
        const samples = samplesResponse.data.data.items || [];
        console.log(`✓ 成功访问样品列表 (${samples.length} 个样品)`);
      } else {
        console.log('⚠ 访问成功但响应格式异常');
      }
    } catch (error) {
      console.error(`✗ 访问样品列表失败: ${error.response?.status} ${error.response?.statusText}`);
    }
    console.log();
    
    // 4. 测试访问审核统计
    console.log('4. 测试访问审核统计...');
    try {
      const statsResponse = await axios.get(`${API_BASE_URL}/audits/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (statsResponse.data && statsResponse.data.data) {
        const stats = statsResponse.data.data;
        console.log('✓ 成功访问审核统计');
        console.log(`  待审核: ${stats.pending}`);
        console.log(`  今日完成: ${stats.todayCompleted}`);
        console.log(`  本周完成: ${stats.weekCompleted}`);
        console.log(`  本月完成: ${stats.monthCompleted}`);
      } else {
        console.log('⚠ 访问成功但响应格式异常');
      }
    } catch (error) {
      console.error(`✗ 访问审核统计失败: ${error.response?.status} ${error.response?.statusText}`);
    }
    console.log();
    
    console.log('========================================');
    console.log('✓✓✓ Admin用户权限测试完成 ✓✓✓');
    console.log('========================================');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testAdminPermissions();
