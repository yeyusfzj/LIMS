/**
 * 测试前端工作流模板列表功能
 * 验证前端是否能正确调用后端API并显示保存的工作流
 */

const puppeteer = require('puppeteer');

async function testWorkflowTemplateList() {
  console.log('🚀 开始测试前端工作流模板列表功能...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // 监听控制台输出
    page.on('console', msg => {
      console.log(`🖥️  浏览器控制台: ${msg.text()}`);
    });
    
    // 监听网络请求
    page.on('request', request => {
      if (request.url().includes('/api/workflows')) {
        console.log(`📡 API请求: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/workflows')) {
        console.log(`📡 API响应: ${response.status()} ${response.url()}`);
      }
    });
    
    console.log('1. 访问登录页面...');
    await page.goto('http://localhost:5173/login');
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    
    console.log('2. 执行登录...');
    await page.type('input[type="text"]', 'admin');
    await page.type('input[type="password"]', 'Admin@123456');
    await page.click('button[type="submit"]');
    
    // 等待登录成功并跳转
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    console.log('✅ 登录成功');
    
    console.log('3. 导航到工作流模板页面...');
    // 等待页面加载完成
    await page.waitForTimeout(2000);
    
    // 点击工作流菜单
    await page.waitForSelector('text=工作流管理', { timeout: 5000 });
    await page.click('text=工作流管理');
    await page.waitForTimeout(1000);
    
    // 点击模板管理子菜单
    await page.waitForSelector('text=模板管理', { timeout: 5000 });
    await page.click('text=模板管理');
    
    console.log('4. 等待工作流模板列表加载...');
    await page.waitForTimeout(3000);
    
    // 检查是否有API调用
    console.log('5. 检查页面内容...');
    
    // 等待表格加载
    await page.waitForSelector('.el-table', { timeout: 10000 });
    
    // 获取表格行数
    const tableRows = await page.$$('.el-table tbody tr');
    console.log(`📊 表格中有 ${tableRows.length} 行数据`);
    
    if (tableRows.length > 0) {
      console.log('✅ 成功加载工作流模板列表！');
      
      // 获取第一行的数据
      const firstRowData = await page.evaluate(() => {
        const firstRow = document.querySelector('.el-table tbody tr');
        if (firstRow) {
          const cells = firstRow.querySelectorAll('td');
          return {
            name: cells[0]?.textContent?.trim(),
            version: cells[1]?.textContent?.trim(),
            description: cells[2]?.textContent?.trim(),
            status: cells[5]?.textContent?.trim()
          };
        }
        return null;
      });
      
      if (firstRowData) {
        console.log('📋 第一行数据:', firstRowData);
      }
    } else {
      console.log('⚠️  表格中没有数据，可能是API调用失败或数据为空');
    }
    
    // 检查是否有错误消息
    const errorMessages = await page.$$('.el-message--error');
    if (errorMessages.length > 0) {
      console.log('❌ 发现错误消息');
    }
    
    console.log('6. 测试刷新功能...');
    await page.click('text=刷新');
    await page.waitForTimeout(2000);
    
    console.log('✅ 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    // 保持浏览器打开以便查看结果
    console.log('🔍 浏览器将保持打开状态，请手动检查页面...');
    // await browser.close();
  }
}

// 运行测试
testWorkflowTemplateList().catch(console.error);