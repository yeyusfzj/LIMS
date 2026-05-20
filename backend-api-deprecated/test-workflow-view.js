/**
 * 测试工作流查看功能
 * 验证点击查看按钮后是否能正确显示工作流内容
 */

const axios = require('axios');

async function testWorkflowView() {
  console.log('🚀 开始测试工作流查看功能...');
  
  try {
    // 1. 登录获取token
    console.log('1. 执行登录...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('登录失败');
    }
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ 登录成功');
    
    // 2. 获取工作流列表
    console.log('2. 获取工作流列表...');
    const listResponse = await axios.get('http://localhost:3000/api/workflows', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const workflows = listResponse.data.data?.items || [];
    if (workflows.length === 0) {
      console.log('❌ 没有找到工作流，无法测试查看功能');
      return;
    }
    
    const firstWorkflow = workflows[0];
    console.log(`✅ 找到工作流: ${firstWorkflow.name} (ID: ${firstWorkflow.id})`);
    
    // 3. 测试获取单个工作流详情
    console.log('3. 测试获取工作流详情...');
    const detailResponse = await axios.get(`http://localhost:3000/api/workflows/${firstWorkflow.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const workflowDetail = detailResponse.data.data;
    console.log('✅ 成功获取工作流详情');
    console.log('📋 工作流信息:');
    console.log(`   名称: ${workflowDetail.name}`);
    console.log(`   版本: v${workflowDetail.version}`);
    console.log(`   描述: ${workflowDetail.description || '无描述'}`);
    console.log(`   状态: ${workflowDetail.status}`);
    console.log(`   节点数量: ${workflowDetail.config?.nodes?.length || 0}`);
    console.log(`   连接数量: ${workflowDetail.config?.edges?.length || 0}`);
    
    if (workflowDetail.config?.nodes?.length > 0) {
      console.log('📋 节点列表:');
      workflowDetail.config.nodes.forEach((node, index) => {
        console.log(`   ${index + 1}. ${node.name} (${node.type})`);
      });
    }
    
    console.log('');
    console.log('🎉 工作流查看功能测试完成！');
    console.log('');
    console.log('📋 现在可以手动测试前端查看功能：');
    console.log('1. 打开浏览器访问: http://localhost:5173/login');
    console.log('2. 登录后进入工作流模板管理页面');
    console.log('3. 点击任意工作流的"查看"按钮');
    console.log('4. 应该能看到工作流的节点和连接线，而不是空白页面');
    console.log('5. 查看模式下应该显示"查看模式"标签，且无法编辑');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testWorkflowView().catch(console.error);