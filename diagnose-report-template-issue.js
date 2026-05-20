/**
 * 诊断报告模板问题
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function diagnose() {
  console.log('=== 报告模板问题诊断 ===\n');
  
  try {
    // 1. 检查 FastAPI 后端状态
    console.log('1. 检查 FastAPI 后端状态...');
    const healthResponse = await axios.get('http://localhost:8000/health');
    console.log('✅ FastAPI 后端运行正常');
    console.log('   数据库状态:', healthResponse.data.database);
    console.log('');
    
    // 2. 登录获取 token
    console.log('2. 登录获取 token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.data.accessToken;
    console.log('✅ 登录成功');
    console.log('');
    
    // 3. 测试报告模板 API（捕获详细错误）
    console.log('3. 测试报告模板 API...');
    try {
      const response = await axios.get(`${API_BASE_URL}/report-templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          page: 1,
          pageSize: 20
        }
      });
      
      console.log('✅ 报告模板 API 调用成功');
      console.log('   返回的模板数量:', response.data.pagination?.total || 0);
      
    } catch (error) {
      console.log('❌ 报告模板 API 调用失败');
      console.log('   HTTP 状态码:', error.response?.status);
      console.log('   错误响应:', JSON.stringify(error.response?.data, null, 2));
      console.log('');
      
      console.log('可能的原因:');
      console.log('   1. FastAPI 后端的数据库没有 report_templates 表');
      console.log('   2. 报告模板服务实现有问题');
      console.log('   3. 数据库查询失败');
      console.log('');
      
      console.log('解决方案:');
      console.log('   1. 检查 FastAPI 后端是否使用了正确的数据库');
      console.log('   2. 确认数据库中是否有 report_templates 表');
      console.log('   3. 查看 FastAPI 后端的日志获取详细错误信息');
      console.log('');
      
      console.log('临时解决方案:');
      console.log('   前端可以暂时使用 Mock 数据，等待后端修复');
    }
    
    // 4. 测试其他 API（对比）
    console.log('4. 测试其他 API（对比）...');
    try {
      const samplesResponse = await axios.get(`${API_BASE_URL}/samples`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          page: 1,
          pageSize: 20
        }
      });
      console.log('✅ 样品 API 正常工作');
      console.log('   这说明问题特定于报告模板 API');
    } catch (error) {
      console.log('⚠️  样品 API 也失败了');
      console.log('   这可能是更广泛的后端问题');
    }
    
  } catch (error) {
    console.error('\n❌ 诊断过程失败:', error.message);
  }
}

diagnose();
