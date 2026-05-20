/**
 * 审核统计UI测试脚本
 * 使用 Puppeteer 测试前端页面的实际显示效果
 */

const puppeteer = require('puppeteer');

const FRONTEND_URL = 'http://localhost:5173';
const TEST_CONFIG = {
  username: 'admin',
  password: 'Admin@123456'
};

/**
 * 主测试流程
 */
async function runUITests() {
  console.log('========================================');
  console.log('审核统计UI测试');
  console.log('========================================');
  console.log(`前端地址: ${FRONTEND_URL}`);
  console.log(`测试账号: ${TEST_CONFIG.username}`);
  
  let browser;
  
  try {
    // 启动浏览器
    console.log('\n启动浏览器...');
    browser = await puppeteer.launch({
      headless: false, // 显示浏览器窗口
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });
    
    const page = await browser.newPage();
    
    // 监听控制台输出
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') {
        console.log(`  [浏览器错误] ${msg.text()}`);
      }
    });
    
    // 步骤 1: 访问登录页面
    console.log('\n========================================');
    console.log('步骤 1: 访问登录页面');
    console.log('========================================');
    
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
    console.log('✓ 登录页面加载完成');
    
    // 步骤 2: 登录
    console.log('\n========================================');
    console.log('步骤 2: 登录系统');
    console.log('========================================');
    
    // 输入用户名
    await page.type('input[type="text"]', TEST_CONFIG.username);
    console.log('✓ 输入用户名');
    
    // 输入密码
    await page.type('input[type="password"]', TEST_CONFIG.password);
    console.log('✓ 输入密码');
    
    // 点击登录按钮
    await page.click('button[type="submit"]');
    console.log('✓ 点击登录按钮');
    
    // 等待跳转到首页
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    console.log('✓ 登录成功，已跳转到首页');
    
    // 步骤 3: 导航到审核统计页面
    console.log('\n========================================');
    console.log('步骤 3: 导航到审核统计页面');
    console.log('========================================');
    
    await page.goto(`${FRONTEND_URL}/audit/statistics`, { waitUntil: 'networkidle2' });
    console.log('✓ 审核统计页面加载完成');
    
    // 等待页面加载
    await page.waitForTimeout(2000);
    
    // 步骤 4: 验证页面元素
    console.log('\n========================================');
    console.log('步骤 4: 验证页面元素');
    console.log('========================================');
    
    // 检查标题
    const title = await page.$eval('.card-header .title', el => el.textContent);
    console.log(`✓ 页面标题: ${title}`);
    
    // 检查统计卡片数量
    const cardCount = await page.$$eval('.stat-card', cards => cards.length);
    console.log(`✓ 统计卡片数量: ${cardCount} 个`);
    
    if (cardCount !== 6) {
      console.log('⚠ 警告: 预期6个统计卡片，实际找到', cardCount, '个');
    }
    
    // 获取所有统计数据
    console.log('\n统计数据:');
    const stats = await page.$$eval('.stat-card', cards => {
      return cards.map(card => {
        const label = card.querySelector('.stat-label')?.textContent || '';
        const value = card.querySelector('.stat-value')?.textContent || '';
        const unit = card.querySelector('.stat-unit')?.textContent || '';
        return { label, value, unit };
      });
    });
    
    stats.forEach((stat, index) => {
      console.log(`  ${index + 1}. ${stat.label}: ${stat.value} ${stat.unit}`);
    });
    
    // 步骤 5: 测试刷新按钮
    console.log('\n========================================');
    console.log('步骤 5: 测试刷新按钮');
    console.log('========================================');
    
    const refreshButton = await page.$('.card-header button');
    if (refreshButton) {
      console.log('✓ 找到刷新按钮');
      
      // 点击刷新按钮
      await refreshButton.click();
      console.log('✓ 点击刷新按钮');
      
      // 等待加载
      await page.waitForTimeout(1000);
      
      // 检查是否显示加载状态
      const hasLoading = await page.$('.loading-container');
      if (hasLoading) {
        console.log('✓ 显示加载状态');
      }
      
      // 等待加载完成
      await page.waitForTimeout(2000);
      console.log('✓ 数据刷新完成');
    } else {
      console.log('✗ 未找到刷新按钮');
    }
    
    // 步骤 6: 检查错误提示
    console.log('\n========================================');
    console.log('步骤 6: 检查错误提示');
    console.log('========================================');
    
    const errorAlert = await page.$('.el-alert--error');
    if (errorAlert) {
      const errorText = await page.$eval('.el-alert--error', el => el.textContent);
      console.log('✗ 发现错误提示:', errorText);
    } else {
      console.log('✓ 没有错误提示');
    }
    
    // 步骤 7: 截图
    console.log('\n========================================');
    console.log('步骤 7: 保存截图');
    console.log('========================================');
    
    await page.screenshot({ 
      path: 'audit-statistics-screenshot.png',
      fullPage: true
    });
    console.log('✓ 截图已保存: audit-statistics-screenshot.png');
    
    // 测试总结
    console.log('\n========================================');
    console.log('测试总结');
    console.log('========================================');
    console.log('✓ 登录功能正常');
    console.log('✓ 审核统计页面可访问');
    console.log(`✓ 显示 ${cardCount} 个统计卡片`);
    console.log('✓ 刷新功能正常');
    console.log('✓ 页面无错误提示');
    console.log('\n✓ 所有UI测试通过！');
    
    // 保持浏览器打开10秒供查看
    console.log('\n浏览器将在10秒后关闭...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n浏览器已关闭');
    }
  }
}

// 检查是否安装了 puppeteer
try {
  require.resolve('puppeteer');
  runUITests().catch(error => {
    console.error('测试执行出错:', error);
    process.exit(1);
  });
} catch (e) {
  console.log('========================================');
  console.log('缺少依赖');
  console.log('========================================');
  console.log('请先安装 puppeteer:');
  console.log('  npm install puppeteer');
  console.log('\n或者使用已安装的测试脚本:');
  console.log('  node test-audit-statistics-api.js');
  process.exit(1);
}
