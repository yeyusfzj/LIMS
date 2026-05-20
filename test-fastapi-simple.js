/**
 * FastAPI 后端简单测试脚本
 * 
 * 测试 FastAPI 后端的基本功能（不需要认证）
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8000';
const API_BASE = `${BASE_URL}/api/v1`;

console.log('开始测试 FastAPI 后端...\n');
console.log(`后端地址: ${BASE_URL}`);
console.log(`API 基础路径: ${API_BASE}\n`);

async function runTests() {
  let passedTests = 0;
  let totalTests = 0;
  
  // 测试 1: 根路径
  totalTests++;
  try {
    const response = await axios.get(BASE_URL);
    console.log('✅ 测试 1: 根路径');
    console.log(`   响应: ${JSON.stringify(response.data)}\n`);
    passedTests++;
  } catch (error) {
    console.log('❌ 测试 1: 根路径失败');
    console.log(`   错误: ${error.message}\n`);
  }
  
  // 测试 2: 健康检查
  totalTests++;
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 测试 2: 健康检查');
    console.log(`   状态: ${response.data.status}`);
    console.log(`   数据库: ${response.data.database}`);
    console.log(`   版本: ${response.data.version}\n`);
    passedTests++;
  } catch (error) {
    console.log('❌ 测试 2: 健康检查失败');
    console.log(`   错误: ${error.message}\n`);
  }
  
  // 测试 3: API 文档
  totalTests++;
  try {
    const response = await axios.get(`${BASE_URL}/docs`);
    console.log('✅ 测试 3: API 文档访问');
    console.log(`   状态码: ${response.status}\n`);
    passedTests++;
  } catch (error) {
    console.log('❌ 测试 3: API 文档访问失败');
    console.log(`   错误: ${error.message}\n`);
  }
  
  // 测试 4: OpenAPI 规范
  totalTests++;
  try {
    const response = await axios.get(`${BASE_URL}/openapi.json`);
    console.log('✅ 测试 4: OpenAPI 规范');
    console.log(`   标题: ${response.data.info.title}`);
    console.log(`   版本: ${response.data.info.version}`);
    console.log(`   端点数量: ${Object.keys(response.data.paths).length}\n`);
    passedTests++;
  } catch (error) {
    console.log('❌ 测试 4: OpenAPI 规范失败');
    console.log(`   错误: ${error.message}\n`);
  }
  
  // 测试 5: 健康检查端点（v1）- 需要认证
  totalTests++;
  try {
    const response = await axios.get(`${API_BASE}/health`);
    console.log('✅ 测试 5: 健康检查端点（v1）');
    console.log(`   响应: ${JSON.stringify(response.data)}\n`);
    passedTests++;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('⚠️  测试 5: 健康检查端点（v1）需要认证');
      console.log(`   状态码: 401 (预期行为)\n`);
      passedTests++; // 这是预期的行为
    } else {
      console.log('❌ 测试 5: 健康检查端点（v1）失败');
      console.log(`   错误: ${error.message}\n`);
    }
  }
  
  // 打印总结
  console.log('='.repeat(60));
  console.log(`测试完成: ${passedTests}/${totalTests} 通过`);
  console.log(`成功率: ${(passedTests / totalTests * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  
  if (passedTests === totalTests) {
    console.log('\n✅ 所有测试通过！FastAPI 后端运行正常。');
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} 个测试失败。`);
  }
}

runTests().catch(error => {
  console.error('测试执行出错:', error);
  process.exit(1);
});
