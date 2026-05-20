/**
 * 测试报告模板 API 连接
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function testReportTemplateAPI() {
  console.log('=== 报告模板 API 连接测试 ===\n');
  
  try {
    // 1. 测试健康检查
    console.log('1. 测试 FastAPI 后端健康检查...');
    const healthResponse = await axios.get('http://localhost:8000/health');
    console.log('✅ FastAPI 后端运行正常');
    console.log('   状态:', healthResponse.data.status);
    console.log('   数据库:', healthResponse.data.database);
    console.log('');
    
    // 2. 测试登录获取 token
    console.log('2. 测试登录获取 token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.data.accessToken;
    console.log('✅ 登录成功，获取到 token');
    console.log('');
    
    // 3. 测试报告模板列表 API
    console.log('3. 测试报告模板列表 API...');
    const templatesResponse = await axios.get(`${API_BASE_URL}/report-templates`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page: 1,
        pageSize: 20
      }
    });
    
    console.log('✅ 报告模板 API 调用成功');
    console.log('   返回数据:', JSON.stringify(templatesResponse.data, null, 2));
    console.log('');
    
    console.log('=== 所有测试通过 ===');
    console.log('\n✅ 报告模板 API 连接正常！');
    console.log('   前端应该能够正常访问报告模板功能。');
    
  } catch (error) {
    console.error('\n❌ 测试失败:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   无法连接到 FastAPI 后端 (http://localhost:8000)');
      console.error('   请确保 FastAPI 后端正在运行。');
      console.error('\n启动 FastAPI 后端的命令:');
      console.error('   cd fastapi-backend');
      console.error('   uvicorn app.main:app --reload --port 8000');
    } else if (error.response) {
      console.error('   HTTP 状态码:', error.response.status);
      console.error('   错误信息:', error.response.data);
      
      if (error.response.status === 404) {
        console.error('\n可能的原因:');
        console.error('   - 报告模板路由未正确注册');
        console.error('   - API 路径不匹配');
      } else if (error.response.status === 401) {
        console.error('\n可能的原因:');
        console.error('   - Token 无效或过期');
        console.error('   - 认证配置问题');
      }
    } else {
      console.error('   错误:', error.message);
    }
    
    process.exit(1);
  }
}

testReportTemplateAPI();
