/**
 * 列出Express应用中注册的所有路由
 */

function listRoutes(app) {
  const routes = [];
  
  function extractRoutes(stack, prefix = '') {
    stack.forEach((middleware) => {
      if (middleware.route) {
        // 这是一个路由
        const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase());
        routes.push({
          path: prefix + middleware.route.path,
          methods: methods
        });
      } else if (middleware.name === 'router' && middleware.handle.stack) {
        // 这是一个子路由器
        const routerPath = middleware.regexp.source
          .replace('\\/?', '')
          .replace('(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/\^/g, '')
          .replace(/\$/g, '')
          .replace(/\\/g, '');
        
        extractRoutes(middleware.handle.stack, prefix + routerPath);
      }
    });
  }
  
  extractRoutes(app._router.stack);
  return routes;
}

// 加载应用
const app = require('./backend-api/dist/app').default;

console.log('========================================');
console.log('已注册的路由列表');
console.log('========================================\n');

const routes = listRoutes(app);

// 只显示 /api/samples 相关的路由
const sampleRoutes = routes.filter(r => r.path.includes('/api/samples'));

console.log('样品相关路由:');
console.log('----------------------------------------');
sampleRoutes.forEach(route => {
  console.log(`${route.methods.join(', ').padEnd(20)} ${route.path}`);
});

console.log('\n总计:', sampleRoutes.length, '个样品路由');
console.log('========================================');
