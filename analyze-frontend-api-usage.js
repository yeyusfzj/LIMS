/**
 * 分析前端API使用情况
 * 扫描前端代码,找出所有API调用并验证后端是否实现
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 扫描目录中的所有文件
function scanDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 跳过node_modules和dist目录
      if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('.git')) {
        scanDirectory(filePath, fileList);
      }
    } else if (file.endsWith('.vue') || file.endsWith('.ts') || file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// 提取API调用
function extractApiCalls(content) {
  const apiCalls = [];
  
  // 匹配各种API调用模式
  const patterns = [
    // http.get('/api/xxx')
    /http\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    // axios.get('/api/xxx')
    /axios\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    // fetch('/api/xxx')
    /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
    // '/api/xxx' 字符串
    /['"`](\/api\/[^'"`]+)['"`]/g
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[2]) {
        apiCalls.push({
          method: match[1] ? match[1].toUpperCase() : 'GET',
          path: match[2]
        });
      } else if (match[1] && match[1].startsWith('/api/')) {
        apiCalls.push({
          method: 'GET',
          path: match[1]
        });
      }
    }
  });
  
  return apiCalls;
}

// 分析前端文件
function analyzeFrontendFiles() {
  log('\n╔════════════════════════════════════════════╗', 'cyan');
  log('║     前端API使用分析                         ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');
  
  const frontendDir = path.join(__dirname, 'vue-project', 'src');
  const files = scanDirectory(frontendDir);
  
  log(`\n扫描到 ${files.length} 个前端文件`, 'blue');
  
  const apiCallsMap = new Map();
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const apiCalls = extractApiCalls(content);
    
    if (apiCalls.length > 0) {
      const relativePath = path.relative(__dirname, file);
      apiCalls.forEach(call => {
        const key = `${call.method} ${call.path}`;
        if (!apiCallsMap.has(key)) {
          apiCallsMap.set(key, []);
        }
        apiCallsMap.get(key).push(relativePath);
      });
    }
  });
  
  return apiCallsMap;
}

// 检查后端路由实现
function checkBackendRoutes() {
  const routesFile = path.join(__dirname, 'backend-api', 'src', 'routes', 'index.ts');
  
  if (!fs.existsSync(routesFile)) {
    log('⚠ 未找到后端路由文件', 'yellow');
    return new Set();
  }
  
  const content = fs.readFileSync(routesFile, 'utf-8');
  const implementedRoutes = new Set();
  
  // 提取路由注册
  const routePatterns = [
    /router\.use\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /app\.use\s*\(\s*['"`]([^'"`]+)['"`]/g
  ];
  
  routePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      implementedRoutes.add(match[1]);
    }
  });
  
  return implementedRoutes;
}

// 分组API调用
function groupApiCalls(apiCallsMap) {
  const groups = {
    auth: [],
    samples: [],
    workflows: [],
    audit: [],
    results: [],
    reports: [],
    statistics: [],
    users: [],
    methods: [],
    other: []
  };
  
  apiCallsMap.forEach((files, apiCall) => {
    const [method, path] = apiCall.split(' ');
    
    if (path.includes('/auth/')) {
      groups.auth.push({ method, path, files });
    } else if (path.includes('/sample')) {
      groups.samples.push({ method, path, files });
    } else if (path.includes('/workflow')) {
      groups.workflows.push({ method, path, files });
    } else if (path.includes('/audit')) {
      groups.audit.push({ method, path, files });
    } else if (path.includes('/result')) {
      groups.results.push({ method, path, files });
    } else if (path.includes('/report')) {
      groups.reports.push({ method, path, files });
    } else if (path.includes('/statistic')) {
      groups.statistics.push({ method, path, files });
    } else if (path.includes('/user')) {
      groups.users.push({ method, path, files });
    } else if (path.includes('/method')) {
      groups.methods.push({ method, path, files });
    } else {
      groups.other.push({ method, path, files });
    }
  });
  
  return groups;
}

// 主函数
function main() {
  const apiCallsMap = analyzeFrontendFiles();
  const implementedRoutes = checkBackendRoutes();
  
  log(`\n发现 ${apiCallsMap.size} 个不同的API调用`, 'blue');
  log(`后端实现了 ${implementedRoutes.size} 个路由前缀`, 'blue');
  
  const groups = groupApiCalls(apiCallsMap);
  
  // 显示分组结果
  log('\n╔════════════════════════════════════════════╗', 'cyan');
  log('║     API调用分组统计                         ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');
  
  Object.entries(groups).forEach(([groupName, calls]) => {
    if (calls.length > 0) {
      log(`\n【${groupName.toUpperCase()}】 - ${calls.length} 个API调用`, 'magenta');
      
      calls.forEach(call => {
        log(`  ${call.method.padEnd(6)} ${call.path}`, 'blue');
        log(`         使用文件: ${call.files.length} 个`, 'yellow');
        call.files.slice(0, 3).forEach(file => {
          log(`           - ${file}`, 'yellow');
        });
        if (call.files.length > 3) {
          log(`           ... 还有 ${call.files.length - 3} 个文件`, 'yellow');
        }
      });
    }
  });
  
  // 检查未连接的API
  log('\n╔════════════════════════════════════════════╗', 'cyan');
  log('║     潜在问题检查                            ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');
  
  const allCalls = [...apiCallsMap.keys()];
  const potentialIssues = [];
  
  allCalls.forEach(apiCall => {
    const [method, path] = apiCall.split(' ');
    
    // 检查路径是否包含变量
    if (path.includes('${') || path.includes('`')) {
      potentialIssues.push({
        type: 'dynamic_path',
        apiCall,
        message: '使用了动态路径,需要手动验证'
      });
    }
    
    // 检查是否使用了非标准路径
    if (!path.startsWith('/api/')) {
      potentialIssues.push({
        type: 'non_standard_path',
        apiCall,
        message: '未使用标准/api/前缀'
      });
    }
  });
  
  if (potentialIssues.length > 0) {
    log(`\n发现 ${potentialIssues.length} 个潜在问题:`, 'yellow');
    potentialIssues.forEach(issue => {
      log(`  ⚠ ${issue.apiCall}`, 'yellow');
      log(`    ${issue.message}`, 'yellow');
    });
  } else {
    log('\n✓ 未发现明显问题', 'green');
  }
  
  // 总结
  log('\n╔════════════════════════════════════════════╗', 'cyan');
  log('║     分析总结                                ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');
  
  const totalCalls = apiCallsMap.size;
  const totalFiles = new Set([...apiCallsMap.values()].flat()).size;
  
  log(`\n总API调用数: ${totalCalls}`, 'blue');
  log(`涉及文件数: ${totalFiles}`, 'blue');
  log(`\n主要模块:`, 'blue');
  Object.entries(groups).forEach(([groupName, calls]) => {
    if (calls.length > 0) {
      log(`  - ${groupName.padEnd(15)}: ${calls.length} 个API`, 'blue');
    }
  });
  
  log('\n建议:', 'cyan');
  log('  1. 检查所有API端点是否在后端正确实现', 'yellow');
  log('  2. 验证API请求参数和响应格式是否匹配', 'yellow');
  log('  3. 测试错误处理和边界情况', 'yellow');
  log('  4. 确保所有需要认证的API都有正确的token处理', 'yellow');
}

// 运行分析
try {
  main();
} catch (error) {
  log(`\n分析失败: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
}
