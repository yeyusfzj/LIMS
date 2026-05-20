/**
 * 测试前端工作流API调用
 * 模拟前端调用后端API获取工作流列表
 */

const axios = require('axios');

async function testWorkflowFrontendApi() {
  console.log('🚀 开始测试前端工作流API调用...');
  
  try {
    // 1. 先登录获取token
    console.log('1. 执行登录获取token...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('登录失败: ' + loginResponse.data.error?.message);
    }
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ 登录成功，获取到token');
    
    // 2. 调用工作流列表API（模拟前端调用）
    console.log('2. 调用工作流列表API...');
    const workflowResponse = await axios.get('http://localhost:3000/api/workflows', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 API响应状态:', workflowResponse.status);
    console.log('📡 API响应数据:', JSON.stringify(workflowResponse.data, null, 2));
    
    // 3. 检查响应数据格式
    const responseData = workflowResponse.data;
    
    if (responseData.success) {
      const workflowList = responseData.data?.items || responseData.data || [];
      console.log(`✅ 成功获取工作流列表，共 ${workflowList.length} 个工作流`);
      
      if (workflowList.length > 0) {
        console.log('📋 工作流列表:');
        workflowList.forEach((workflow, index) => {
          console.log(`  ${index + 1}. ${workflow.name} (v${workflow.version}) - ${workflow.status}`);
          console.log(`     描述: ${workflow.description || '无描述'}`);
          console.log(`     节点数: ${workflow.config?.nodes?.length || 0}`);
          console.log(`     创建者: ${workflow.createdBy || '未知'}`);
          console.log('');
        });
        
        console.log('✅ 前端应该能够正确显示这些工作流模板！');
      } else {
        console.log('⚠️  工作流列表为空，可能还没有保存任何工作流模板');
      }
    } else {
      console.log('❌ API调用失败:', responseData.error?.message);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testWorkflowFrontendApi().catch(console.error);