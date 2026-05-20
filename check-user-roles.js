/**
 * 检查用户角色脚本
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function checkRoles() {
  try {
    // 登录
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    const token = loginRes.data.data.accessToken;
    console.log('✓ 登录成功\n');

    // 获取所有角色
    console.log('系统中的角色列表:');
    const rolesRes = await axios.get(`${BASE_URL}/roles`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    rolesRes.data.data.forEach(role => {
      console.log(`  - ${role.name} (${role.description})`);
    });

    // 获取当前用户信息
    console.log('\n当前用户的角色:');
    const userRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (userRes.data.data.roles) {
      userRes.data.data.roles.forEach(userRole => {
        console.log(`  - ${userRole.role.name}`);
      });
    }

  } catch (error) {
    console.error('错误:', error.message);
    if (error.response) {
      console.error('响应:', error.response.data);
    }
  }
}

checkRoles();
