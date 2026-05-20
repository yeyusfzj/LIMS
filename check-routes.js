/**
 * 检查后端路由是否正确注册
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function checkRoutes() {
  console.log('检查后端路由...\n');

  try {
    // 1. 检查健康检查端点
    console.log('1. 检查健康检查端点...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✓ 健康检查正常:', healthResponse.data);

    // 2. 检查API基础路径
    console.log('\n2. 检查API基础路径...');
    try {
      await axios.get(`${API_BASE_URL}/api`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✓ /api 返回404(正常,因为没有根路由)');
      }
    }

    // 3. 检查样品路由(不带认证,应该返回401)
    console.log('\n3. 检查样品路由(GET /api/samples)...');
    try {
      await axios.get(`${API_BASE_URL}/api/samples`);
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          console.log('✓ 样品路由存在(返回401未认证,这是正常的)');
        } else if (error.response.status === 404) {
          console.log('✗ 样品路由不存在(返回404)');
        } else {
          console.log(`? 样品路由返回: ${error.response.status}`);
        }
      }
    }

    // 4. 检查DELETE路由(不带认证,应该返回401而不是404)
    console.log('\n4. 检查DELETE路由(DELETE /api/samples/test-id)...');
    try {
      await axios.delete(`${API_BASE_URL}/api/samples/550e8400-e29b-41d4-a716-446655440000`);
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          console.log('✓ DELETE路由存在(返回401未认证,这是正常的)');
          console.log('✅ 删除路由已正确注册!');
        } else if (error.response.status === 404) {
          console.log('✗ DELETE路由不存在(返回404)');
          console.log('❌ 删除路由未注册或被其他路由覆盖!');
        } else if (error.response.status === 400) {
          console.log('✓ DELETE路由存在(返回400验证错误)');
        } else {
          console.log(`? DELETE路由返回: ${error.response.status}`, error.response.data);
        }
      } else {
        console.log('✗ 网络错误:', error.message);
      }
    }

    console.log('\n========================================');
    console.log('路由检查完成');
    console.log('========================================');

  } catch (error) {
    console.error('\n✗ 检查失败:', error.message);
    console.error('\n请确认:');
    console.error('1. 后端服务正在运行');
    console.error('2. 后端服务地址是 http://localhost:3000');
    console.error('3. 后端服务已重启并加载了最新代码');
  }
}

checkRoutes();
