/**
 * 检查前端审核菜单和路由配置
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('前端审核功能配置检查');
console.log('========================================\n');

// 检查路由配置
console.log('1. 检查路由配置 (vue-project/src/router/index.ts)');
const routerPath = path.join(__dirname, 'vue-project/src/router/index.ts');
const routerContent = fs.readFileSync(routerPath, 'utf-8');

const auditRoutes = [
  '/audit/tasks',
  '/audit/task/:id',
  '/quality/judgment'
];

auditRoutes.forEach(route => {
  if (routerContent.includes(route)) {
    console.log(`  ✓ 路由已配置: ${route}`);
  } else {
    console.log(`  ✗ 路由缺失: ${route}`);
  }
});

// 检查菜单配置
console.log('\n2. 检查菜单配置 (vue-project/src/components/SideMenu.vue)');
const menuPath = path.join(__dirname, 'vue-project/src/components/SideMenu.vue');
const menuContent = fs.readFileSync(menuPath, 'utf-8');

const menuItems = [
  { path: '/audit/tasks', name: '审核任务' },
  { path: '/quality/judgment', name: '质量判定' },
  { path: '/sample/release', name: '样品放行' }
];

menuItems.forEach(item => {
  if (menuContent.includes(item.path) && menuContent.includes(item.name)) {
    console.log(`  ✓ 菜单项已配置: ${item.name} (${item.path})`);
  } else {
    console.log(`  ✗ 菜单项缺失: ${item.name} (${item.path})`);
  }
});

// 检查审核页面组件
console.log('\n3. 检查审核页面组件');
const auditPages = [
  'vue-project/src/views/audit/AuditTaskList.vue',
  'vue-project/src/views/audit/AuditTaskDetail.vue',
  'vue-project/src/views/quality/QualityJudgment.vue',
  'vue-project/src/views/sample/SampleRelease.vue'
];

auditPages.forEach(pagePath => {
  const fullPath = path.join(__dirname, pagePath);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✓ 页面组件存在: ${path.basename(pagePath)}`);
  } else {
    console.log(`  ✗ 页面组件缺失: ${path.basename(pagePath)}`);
  }
});

// 检查审核服务
console.log('\n4. 检查审核服务 (vue-project/src/services/auditService.ts)');
const servicePath = path.join(__dirname, 'vue-project/src/services/auditService.ts');
if (fs.existsSync(servicePath)) {
  const serviceContent = fs.readFileSync(servicePath, 'utf-8');
  const methods = [
    'getAuditTasks',
    'getAuditTaskDetail',
    'performAudit',
    'getAuditTemplates',
    'getWorkflowConfigs'
  ];
  
  methods.forEach(method => {
    if (serviceContent.includes(method)) {
      console.log(`  ✓ 服务方法存在: ${method}`);
    } else {
      console.log(`  ✗ 服务方法缺失: ${method}`);
    }
  });
} else {
  console.log('  ✗ 审核服务文件不存在');
}

console.log('\n========================================');
console.log('配置检查完成');
console.log('========================================\n');

console.log('访问说明:');
console.log('1. 确保前端服务正在运行: http://localhost:5173/');
console.log('2. 登录系统: admin / Admin@123456');
console.log('3. 在左侧菜单中找到 "审核管理" 菜单');
console.log('4. 点击 "审核任务" 查看审核任务列表\n');

console.log('如果看不到审核菜单，请尝试:');
console.log('1. 刷新浏览器页面 (Ctrl+F5 或 Cmd+Shift+R)');
console.log('2. 清除浏览器缓存');
console.log('3. 检查浏览器控制台是否有错误信息');
