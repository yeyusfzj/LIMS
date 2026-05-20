const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('1. 访问登录页面...');
    await page.goto('http://localhost:5173/login');
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    
    console.log('2. 输入登录凭证...');
    await page.type('input[type="text"]', 'admin');
    await page.type('input[type="password"]', 'Admin@123456');
    
    console.log('3. 点击登录...');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 10000 });
    
    console.log('4. 访问审核任务列表...');
    await page.goto('http://localhost:5173/audit/tasks');
    await page.waitForSelector('.audit-task-list', { timeout: 5000 });
    
    // 等待表格加载
    await page.waitForTimeout(2000);
    
    console.log('5. 检查表格数据...');
    const hasData = await page.evaluate(() => {
      const table = document.querySelector('.el-table__body');
      return table && table.querySelectorAll('tr').length > 0;
    });
    
    console.log('表格是否有数据:', hasData);
    
    if (hasData) {
      // 检查第一行的所有信息
      const taskInfo = await page.evaluate(() => {
        const firstRow = document.querySelector('.el-table__body tr');
        if (!firstRow) return null;
        
        const cells = Array.from(firstRow.querySelectorAll('td'));
        const statusCell = cells[5]; // 审核状态列
        const actionCell = cells[cells.length - 1]; // 操作列
        
        const buttons = Array.from(actionCell.querySelectorAll('button'));
        
        return {
          status: statusCell ? statusCell.textContent.trim() : null,
          buttons: buttons.map(btn => ({
            text: btn.textContent.trim(),
            visible: btn.offsetParent !== null,
            disabled: btn.disabled,
            classes: btn.className,
            style: btn.style.cssText
          }))
        };
      });
      
      console.log('\n任务信息:');
      console.log('状态:', taskInfo.status);
      console.log('按钮数量:', taskInfo.buttons.length);
      console.log('\n按钮详情:');
      taskInfo.buttons.forEach((btn, index) => {
        console.log(`按钮 ${index + 1}:`, btn);
      });
      
      // 截图
      await page.screenshot({ path: 'audit-task-list-screenshot.png', fullPage: true });
      console.log('\n已保存截图: audit-task-list-screenshot.png');
      
    } else {
      console.log('表格中没有数据，可能需要先创建审核任务');
    }
    
  } catch (error) {
    console.error('检查失败:', error.message);
    await page.screenshot({ path: 'audit-task-list-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
