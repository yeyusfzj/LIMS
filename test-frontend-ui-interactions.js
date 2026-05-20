/**
 * 前端UI交互测试脚本
 * 测试前端页面的按钮点击、表单提交等功能
 */

const puppeteer = require('puppeteer');

// 配置
const FRONTEND_URL = 'http://localhost:5173';
const TEST_TIMEOUT = 30000;

// 颜色输出函数
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

// 通用测试函数
async function runTest(testName, testFunction) {
  testResults.total++;
  try {
    log(`\n🧪 测试: ${testName}`, 'blue');
    await testFunction();
    testResults.passed++;
    testResults.details.push({ name: testName, status: 'PASS', error: null });
    log(`✅ ${testName} - 通过`, 'green');
  } catch (error) {
    testResults.failed++;
    testResults.details.push({ name: testName, status: 'FAIL', error: error.message });
    log(`❌ ${testName} - 失败: ${error.message}`, 'red');
  }
}

// 等待函数
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1. 测试登录页面功能
async function testLoginPage(page) {
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
  
  // 检查登录表单是否存在
  const loginForm = await page.$('form');
  if (!loginForm) {
    throw new Error('登录表单未找到');
  }
  
  // 检查用户名和密码输入框
  const usernameInput = await page.$('input[type="text"], input[placeholder*="用户名"], input[placeholder*="账号"]');
  const passwordInput = await page.$('input[type="password"]');
  
  if (!usernameInput) {
    throw new Error('用户名输入框未找到');
  }
  
  if (!passwordInput) {
    throw new Error('密码输入框未找到');
  }
  
  // 填写登录信息
  await usernameInput.type('admin');
  await passwordInput.type('Admin@123456');
  
  // 查找登录按钮
  const loginButton = await page.$('button[type="submit"], button:contains("登录"), .el-button--primary');
  if (!loginButton) {
    throw new Error('登录按钮未找到');
  }
  
  // 点击登录按钮
  await loginButton.click();
  
  // 等待页面跳转或响应
  await wait(3000);
  
  // 检查是否成功登录（通过URL变化或页面内容判断）
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    // 检查是否有错误消息
    const errorMessage = await page.$('.el-message--error, .error-message');
    if (errorMessage) {
      const errorText = await page.evaluate(el => el.textContent, errorMessage);
      throw new Error(`登录失败: ${errorText}`);
    }
    throw new Error('登录后仍在登录页面，可能登录失败');
  }
  
  log('登录功能正常，成功跳转到主页面', 'green');
}

// 2. 测试样品管理页面
async function testSampleManagement(page) {
  await page.goto(`${FRONTEND_URL}/sample/management`, { waitUntil: 'networkidle2' });
  
  // 检查页面标题
  const pageTitle = await page.$('h1, .page-title, .el-page-header__title');
  if (pageTitle) {
    const titleText = await page.evaluate(el => el.textContent, pageTitle);
    log(`样品管理页面标题: ${titleText}`, 'green');
  }
  
  // 检查新建按钮
  const addButton = await page.$('button:contains("新建"), button:contains("添加"), .el-button--primary');
  if (!addButton) {
    throw new Error('新建样品按钮未找到');
  }
  
  // 点击新建按钮
  await addButton.click();
  await wait(1000);
  
  // 检查是否弹出对话框或跳转到新建页面
  const dialog = await page.$('.el-dialog, .el-drawer');
  const isNewPage = page.url().includes('/create') || page.url().includes('/add');
  
  if (!dialog && !isNewPage) {
    throw new Error('点击新建按钮后没有弹出对话框或跳转页面');
  }
  
  log('样品管理新建功能正常', 'green');
}

// 3. 测试工作流设计器页面
async function testWorkflowDesigner(page) {
  await page.goto(`${FRONTEND_URL}/workflow/designer`, { waitUntil: 'networkidle2' });
  
  // 检查工作流设计器画布
  const canvas = await page.$('.workflow-canvas, .designer-canvas, #workflow-canvas');
  if (!canvas) {
    throw new Error('工作流设计器画布未找到');
  }
  
  // 检查节点面板
  const nodePanel = await page.$('.node-panel, .tool-panel, .palette');
  if (!nodePanel) {
    throw new Error('节点面板未找到');
  }
  
  // 检查保存按钮
  const saveButton = await page.$('button:contains("保存"), .save-btn');
  if (!saveButton) {
    throw new Error('保存按钮未找到');
  }
  
  // 尝试点击保存按钮
  await saveButton.click();
  await wait(1000);
  
  log('工作流设计器页面功能正常', 'green');
}

// 4. 测试结果录入页面
async function testResultEntry(page) {
  await page.goto(`${FRONTEND_URL}/result/entry`, { waitUntil: 'networkidle2' });
  
  // 检查结果录入表单
  const resultForm = await page.$('form, .result-form');
  if (!resultForm) {
    throw new Error('结果录入表单未找到');
  }
  
  // 检查保存按钮
  const saveButton = await page.$('button:contains("保存"), button[type="submit"]');
  if (!saveButton) {
    throw new Error('保存按钮未找到');
  }
  
  log('结果录入页面功能正常', 'green');
}

// 5. 测试报告生成页面
async function testReportGeneration(page) {
  await page.goto(`${FRONTEND_URL}/report/generator`, { waitUntil: 'networkidle2' });
  
  // 检查报告生成表单
  const reportForm = await page.$('form, .report-form');
  if (!reportForm) {
    throw new Error('报告生成表单未找到');
  }
  
  // 检查生成按钮
  const generateButton = await page.$('button:contains("生成"), button:contains("创建")');
  if (!generateButton) {
    throw new Error('生成报告按钮未找到');
  }
  
  log('报告生成页面功能正常', 'green');
}

// 6. 测试系统设置页面
async function testSystemSettings(page) {
  await page.goto(`${FRONTEND_URL}/system/settings`, { waitUntil: 'networkidle2' });
  
  // 检查设置表单
  const settingsForm = await page.$('form, .settings-form');
  if (!settingsForm) {
    throw new Error('系统设置表单未找到');
  }
  
  // 检查保存按钮
  const saveButton = await page.$('button:contains("保存"), button[type="submit"]');
  if (!saveButton) {
    throw new Error('保存设置按钮未找到');
  }
  
  log('系统设置页面功能正常', 'green');
}

// 7. 测试导航菜单
async function testNavigation(page) {
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
  
  // 检查侧边栏菜单
  const sidebar = await page.$('.sidebar, .side-menu, .el-menu');
  if (!sidebar) {
    throw new Error('侧边栏菜单未找到');
  }
  
  // 检查主要菜单项
  const menuItems = await page.$$('.el-menu-item, .menu-item');
  if (menuItems.length === 0) {
    throw new Error('菜单项未找到');
  }
  
  // 测试点击第一个菜单项
  if (menuItems.length > 0) {
    await menuItems[0].click();
    await wait(1000);
    log(`成功点击菜单项，共找到 ${menuItems.length} 个菜单项`, 'green');
  }
}

// 8. 测试搜索功能
async function testSearchFunction(page) {
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
  
  // 检查全局搜索框
  const searchInput = await page.$('input[placeholder*="搜索"], .search-input, .el-input__inner');
  if (!searchInput) {
    throw new Error('搜索输入框未找到');
  }
  
  // 输入搜索内容
  await searchInput.type('测试');
  await wait(500);
  
  // 检查搜索按钮或回车搜索
  const searchButton = await page.$('button:contains("搜索"), .search-btn');
  if (searchButton) {
    await searchButton.click();
  } else {
    await searchInput.press('Enter');
  }
  
  await wait(1000);
  log('搜索功能正常', 'green');
}

// 主测试函数
async function runUITests() {
  log('🚀 开始前端UI交互测试', 'blue');
  log('='.repeat(50), 'blue');
  
  let browser;
  let page;
  
  try {
    // 启动浏览器
    browser = await puppeteer.launch({
      headless: false, // 设置为false可以看到浏览器操作
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // 设置超时时间
    page.setDefaultTimeout(TEST_TIMEOUT);
    
    // 监听控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        log(`浏览器控制台错误: ${msg.text()}`, 'red');
      }
    });
    
    // 运行各项测试
    await runTest('登录页面功能', () => testLoginPage(page));
    await runTest('导航菜单功能', () => testNavigation(page));
    await runTest('搜索功能', () => testSearchFunction(page));
    await runTest('样品管理页面', () => testSampleManagement(page));
    await runTest('工作流设计器页面', () => testWorkflowDesigner(page));
    await runTest('结果录入页面', () => testResultEntry(page));
    await runTest('报告生成页面', () => testReportGeneration(page));
    await runTest('系统设置页面', () => testSystemSettings(page));
    
  } catch (error) {
    log(`测试执行出错: ${error.message}`, 'red');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // 输出测试结果
  log('\n' + '='.repeat(50), 'blue');
  log('📊 UI测试结果汇总', 'blue');
  log('='.repeat(50), 'blue');
  
  log(`总测试数: ${testResults.total}`, 'blue');
  log(`通过: ${testResults.passed}`, 'green');
  log(`失败: ${testResults.failed}`, 'red');
  log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`, 
      testResults.failed === 0 ? 'green' : 'yellow');
  
  if (testResults.failed > 0) {
    log('\n❌ 失败的测试:', 'red');
    testResults.details
      .filter(test => test.status === 'FAIL')
      .forEach(test => {
        log(`  - ${test.name}: ${test.error}`, 'red');
      });
  }
  
  log('\n✅ 通过的测试:', 'green');
  testResults.details
    .filter(test => test.status === 'PASS')
    .forEach(test => {
      log(`  - ${test.name}`, 'green');
    });
  
  if (testResults.failed === 0) {
    log('\n🎉 所有UI测试通过！前端界面功能正常！', 'green');
  } else {
    log('\n⚠️  部分UI测试失败，请检查相关页面功能', 'yellow');
  }
}

// 运行测试
if (require.main === module) {
  runUITests().catch(error => {
    log(`\n💥 UI测试执行出错: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runUITests,
  testResults
};