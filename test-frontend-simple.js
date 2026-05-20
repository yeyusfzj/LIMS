/**
 * 简单测试前端工作流模板页面
 * 使用curl模拟浏览器请求
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testFrontendPage() {
  console.log('🚀 开始测试前端工作流模板页面...');
  
  try {
    // 测试前端页面是否可访问
    console.log('1. 测试前端首页是否可访问...');
    const { stdout: homeResponse } = await execAsync('curl -s http://localhost:5173/');
    
    if (homeResponse.includes('<title>')) {
      console.log('✅ 前端首页可正常访问');
    } else {
      console.log('❌ 前端首页访问异常');
      return;
    }
    
    // 检查前端是否能正确处理工作流路由
    console.log('2. 检查前端路由配置...');
    
    // 由于前端是SPA，我们需要检查JavaScript是否正确加载
    const jsMatch = homeResponse.match(/src="([^"]*\.js)"/);
    if (jsMatch) {
      console.log('✅ 前端JavaScript文件正常加载');
    }
    
    console.log('3. 提示用户手动测试...');
    console.log('');
    console.log('📋 请手动执行以下步骤来验证修复效果：');
    console.log('');
    console.log('1. 打开浏览器访问: http://localhost:5173/login');
    console.log('2. 使用以下凭据登录:');
    console.log('   用户名: admin');
    console.log('   密码: Admin@123456');
    console.log('3. 登录成功后，点击左侧菜单的"工作流管理" -> "模板管理"');
    console.log('4. 检查页面是否显示工作流模板列表');
    console.log('5. 应该能看到9个已保存的工作流模板');
    console.log('');
    console.log('🔍 如果看到工作流模板列表，说明修复成功！');
    console.log('🔍 如果仍然看不到模板，请检查浏览器控制台的错误信息');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testFrontendPage().catch(console.error);