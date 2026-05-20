/**
 * 前后端连接分析报告
 * 分析前端API调用与后端接口的匹配情况
 */

const fs = require('fs');
const path = require('path');

console.log('📊 前后端连接分析报告');
console.log('='.repeat(60));

// 从搜索结果中提取的前端API调用
const frontendApiCalls = [
  // 认证相关
  { service: 'auth.ts', method: 'POST', url: '/auth/login', description: '用户登录' },
  { service: 'auth.ts', method: 'POST', url: '/auth/refresh', description: '刷新令牌' },
  { service: 'auth.ts', method: 'POST', url: '/auth/logout', description: '用户登出' },
  { service: 'auth.ts', method: 'GET', url: '/auth/me', description: '获取当前用户' },
  
  // 用户管理
  { service: 'user.ts', method: 'GET', url: '/auth/me', description: '获取当前用户信息' },
  { service: 'user.ts', method: 'POST', url: '/auth/login', description: '用户登录' },
  { service: 'user.ts', method: 'POST', url: '/auth/logout', description: '用户登出' },
  { service: 'user.ts', method: 'GET', url: '/users', description: '获取用户列表' },
  { service: 'user.ts', method: 'POST', url: '/users', description: '创建用户' },
  { service: 'user.ts', method: 'PUT', url: '/users/{id}', description: '更新用户' },
  { service: 'user.ts', method: 'DELETE', url: '/users/{id}', description: '删除用户' },
  
  // 工作流管理
  { service: 'workflow.ts', method: 'GET', url: '/workflows', description: '获取工作流列表' },
  { service: 'workflow.ts', method: 'GET', url: '/workflows/{id}', description: '获取工作流详情' },
  { service: 'workflow.ts', method: 'POST', url: '/workflows', description: '创建工作流' },
  { service: 'workflow.ts', method: 'PUT', url: '/workflows/{id}', description: '更新工作流' },
  { service: 'workflow.ts', method: 'DELETE', url: '/workflows/{id}', description: '删除工作流' },
  { service: 'workflow.ts', method: 'GET', url: '/tasks', description: '获取任务列表' },
  { service: 'workflow.ts', method: 'GET', url: '/tasks/{id}', description: '获取任务详情' },
  { service: 'workflow.ts', method: 'POST', url: '/tasks/{id}/assign', description: '分配任务' },
  { service: 'workflow.ts', method: 'POST', url: '/tasks/{id}/complete', description: '完成任务' },
  
  // 样品管理
  { service: 'sample.ts', method: 'GET', url: '/samples', description: '获取样品列表' },
  { service: 'sample.ts', method: 'GET', url: '/samples/{id}', description: '获取样品详情' },
  { service: 'sample.ts', method: 'POST', url: '/samples', description: '创建样品' },
  { service: 'sample.ts', method: 'PUT', url: '/samples/{id}', description: '更新样品' },
  { service: 'sample.ts', method: 'DELETE', url: '/samples/{id}', description: '删除样品' },
  { service: 'sample.ts', method: 'POST', url: '/samples/batch', description: '批量操作样品' },
  { service: 'sample.ts', method: 'GET', url: '/samples/statistics', description: '样品统计' },
  { service: 'sample.ts', method: 'GET', url: '/samples/search', description: '搜索样品' },
  { service: 'sample.ts', method: 'GET', url: '/samples/{id}/results', description: '获取样品结果' },
  
  // 检测结果
  { service: 'result.ts', method: 'POST', url: '/results', description: '创建检测结果' },
  { service: 'result.ts', method: 'GET', url: '/results/{id}', description: '获取结果详情' },
  { service: 'result.ts', method: 'GET', url: '/results', description: '查询结果列表' },
  { service: 'result.ts', method: 'PUT', url: '/results/{id}', description: '更新结果' },
  { service: 'result.ts', method: 'DELETE', url: '/results/{id}', description: '删除结果' },
  { service: 'result.ts', method: 'POST', url: '/results/{id}/retest', description: '申请复测' },
  { service: 'result.ts', method: 'POST', url: '/results/import', description: '导入结果' },
  
  // 审核管理
  { service: 'auditService.ts', method: 'GET', url: '/api/audits', description: '获取审核列表' },
  { service: 'auditService.ts', method: 'GET', url: '/api/audits/{id}', description: '获取审核详情' },
  { service: 'auditService.ts', method: 'POST', url: '/api/audits/{id}/review', description: '执行审核' },
  { service: 'auditService.ts', method: 'GET', url: '/api/audits/statistics', description: '审核统计' },
  { service: 'auditService.ts', method: 'POST', url: '/api/audits/batch-review', description: '批量审核' },
  { service: 'auditService.ts', method: 'DELETE', url: '/api/audits/{taskId}/attachments/{fileId}', description: '删除审核附件' }
];

// 后端API端点（从之前的测试中获得）
const backendApiEndpoints = [
  { category: '认证管理', method: 'POST', url: '/auth/login', status: 'warning' },
  { category: '认证管理', method: 'POST', url: '/auth/register', status: 'success' },
  { category: '认证管理', method: 'GET', url: '/auth/me', status: 'success' },
  { category: '用户管理', method: 'GET', url: '/users', status: 'success' },
  { category: '用户管理', method: 'POST', url: '/users', status: 'success' },
  { category: '角色管理', method: 'GET', url: '/roles', status: 'success' },
  { category: '角色管理', method: 'POST', url: '/roles', status: 'success' },
  { category: '样品管理', method: 'GET', url: '/samples', status: 'success' },
  { category: '样品管理', method: 'POST', url: '/samples', status: 'success' },
  { category: '样品管理', method: 'GET', url: '/samples/1', status: 'success' },
  { category: '工作流管理', method: 'GET', url: '/workflows', status: 'success' },
  { category: '工作流管理', method: 'POST', url: '/workflows', status: 'success' },
  { category: '任务管理', method: 'GET', url: '/tasks', status: 'success' },
  { category: '任务管理', method: 'POST', url: '/tasks', status: 'success' },
  { category: '检测结果', method: 'GET', url: '/results', status: 'success' },
  { category: '检测结果', method: 'POST', url: '/results', status: 'success' },
  { category: '审核管理', method: 'GET', url: '/audits', status: 'success' },
  { category: '审核管理', method: 'POST', url: '/audits', status: 'success' },
  { category: '报告管理', method: 'GET', url: '/report-templates', status: 'success' },
  { category: '报告管理', method: 'GET', url: '/reports', status: 'success' },
  { category: '统计分析', method: 'GET', url: '/statistics/dashboard', status: 'success' },
  { category: '审计日志', method: 'GET', url: '/audit-logs', status: 'success' },
  { category: '系统管理', method: 'GET', url: '/backups', status: 'success' },
  { category: '系统管理', method: 'GET', url: '/performance/metrics', status: 'success' }
];

// 分析匹配情况
function analyzeApiMatching() {
  console.log('\n🔍 API匹配分析');
  console.log('-'.repeat(40));
  
  const matched = [];
  const unmatched = [];
  const potentialIssues = [];
  
  frontendApiCalls.forEach(frontendCall => {
    // 标准化URL进行比较
    const normalizedFrontendUrl = frontendCall.url
      .replace(/\{[^}]+\}/g, '*')  // 替换参数占位符
      .replace(/\/api/, '');       // 移除/api前缀
    
    const matchingBackend = backendApiEndpoints.find(backendCall => {
      const normalizedBackendUrl = backendCall.url.replace(/\/\d+$/, '/*');
      return backendCall.method === frontendCall.method && 
             (normalizedBackendUrl === normalizedFrontendUrl || 
              backendCall.url === frontendCall.url.replace(/\/api/, ''));
    });
    
    if (matchingBackend) {
      matched.push({
        frontend: frontendCall,
        backend: matchingBackend,
        status: matchingBackend.status
      });
    } else {
      unmatched.push(frontendCall);
    }
  });
  
  console.log(`✅ 匹配的API: ${matched.length}`);
  console.log(`⚠️  未匹配的API: ${unmatched.length}`);
  
  return { matched, unmatched };
}

// 生成详细报告
function generateDetailedReport() {
  const { matched, unmatched } = analyzeApiMatching();
  
  console.log('\n📋 匹配的API列表');
  console.log('-'.repeat(40));
  matched.forEach(match => {
    const statusIcon = match.status === 'success' ? '✅' : 
                      match.status === 'warning' ? '⚠️' : '❌';
    console.log(`${statusIcon} ${match.frontend.method} ${match.frontend.url} (${match.frontend.service})`);
  });
  
  if (unmatched.length > 0) {
    console.log('\n⚠️  未匹配的前端API调用');
    console.log('-'.repeat(40));
    unmatched.forEach(call => {
      console.log(`❓ ${call.method} ${call.url} (${call.service}) - ${call.description}`);
    });
  }
  
  // 检查可能的问题
  console.log('\n🔍 潜在问题分析');
  console.log('-'.repeat(40));
  
  const issues = [];
  
  // 检查URL不一致
  const urlInconsistencies = unmatched.filter(call => 
    call.url.includes('/api/') && 
    !backendApiEndpoints.some(backend => backend.url === call.url.replace('/api', ''))
  );
  
  if (urlInconsistencies.length > 0) {
    issues.push(`URL路径不一致: ${urlInconsistencies.length}个`);
  }
  
  // 检查方法不匹配
  const methodMismatches = unmatched.filter(call => 
    backendApiEndpoints.some(backend => 
      backend.url === call.url.replace('/api', '') && 
      backend.method !== call.method
    )
  );
  
  if (methodMismatches.length > 0) {
    issues.push(`HTTP方法不匹配: ${methodMismatches.length}个`);
  }
  
  // 检查缺失的后端接口
  const missingBackendApis = unmatched.filter(call => 
    !backendApiEndpoints.some(backend => 
      backend.url.includes(call.url.replace('/api', '').split('/')[1])
    )
  );
  
  if (missingBackendApis.length > 0) {
    issues.push(`可能缺失的后端接口: ${missingBackendApis.length}个`);
  }
  
  if (issues.length > 0) {
    issues.forEach(issue => console.log(`⚠️  ${issue}`));
  } else {
    console.log('✅ 未发现明显问题');
  }
  
  return { matched, unmatched, issues };
}

// 生成建议
function generateRecommendations(analysis) {
  console.log('\n💡 改进建议');
  console.log('-'.repeat(40));
  
  const recommendations = [];
  
  if (analysis.unmatched.length > 0) {
    recommendations.push('检查未匹配的API调用，确认后端接口是否已实现');
    recommendations.push('统一前后端的URL路径规范');
    recommendations.push('确保HTTP方法的一致性');
  }
  
  if (analysis.issues.length > 0) {
    recommendations.push('修复发现的URL和方法不一致问题');
    recommendations.push('补充缺失的后端API接口');
  }
  
  // 通用建议
  recommendations.push('建议使用API文档生成工具（如Swagger）保持前后端接口同步');
  recommendations.push('实施API版本管理策略');
  recommendations.push('添加API集成测试确保前后端连接正常');
  
  if (recommendations.length > 0) {
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
}

// 生成总结
function generateSummary(analysis) {
  console.log('\n📊 总结');
  console.log('='.repeat(60));
  
  const totalApis = analysis.matched.length + analysis.unmatched.length;
  const matchRate = ((analysis.matched.length / totalApis) * 100).toFixed(1);
  
  console.log(`总API调用数: ${totalApis}`);
  console.log(`匹配成功: ${analysis.matched.length} (${matchRate}%)`);
  console.log(`需要检查: ${analysis.unmatched.length}`);
  console.log(`发现问题: ${analysis.issues.length}`);
  
  if (matchRate >= 90) {
    console.log('\n🎉 前后端连接状态良好！');
  } else if (matchRate >= 70) {
    console.log('\n⚠️  前后端连接基本正常，但有一些需要改进的地方');
  } else {
    console.log('\n❌ 前后端连接存在较多问题，需要重点关注');
  }
  
  console.log('\n🔗 后续步骤:');
  console.log('1. 修复未匹配的API调用');
  console.log('2. 进行端到端测试验证功能');
  console.log('3. 完善API文档和接口规范');
  console.log('4. 建立持续集成测试流程');
}

// 执行分析
function main() {
  const analysis = generateDetailedReport();
  generateRecommendations(analysis);
  generateSummary(analysis);
}

main();