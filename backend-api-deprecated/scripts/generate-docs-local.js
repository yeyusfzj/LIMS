#!/usr/bin/env node

/**
 * 本地文档生成脚本
 * 
 * 用于在本地环境生成 API 文档，无需 CI/CD
 */

const fs = require('fs');
const path = require('path');

function main() {
  console.log('开始生成 API 文档...\n');

  try {
    // 加载 Swagger 规范
    const spec = require('../dist/config/swagger').swaggerSpec;

    // 添加版本信息
    const version = spec.info.version || '1.0.0';
    const timestamp = new Date().toISOString();
    
    spec.info['x-build-info'] = {
      buildTime: timestamp,
      environment: 'local'
    };

    // 创建输出目录
    const outputDir = path.join(__dirname, '../docs/api');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 保存 JSON 格式
    const jsonPath = path.join(outputDir, 'openapi.json');
    fs.writeFileSync(jsonPath, JSON.stringify(spec, null, 2));
    console.log('✓ 生成 JSON 文档:', jsonPath);

    // 保存 YAML 格式
    try {
      const yaml = require('js-yaml');
      const yamlPath = path.join(outputDir, 'openapi.yaml');
      fs.writeFileSync(yamlPath, yaml.dump(spec));
      console.log('✓ 生成 YAML 文档:', yamlPath);
    } catch (error) {
      console.warn('⚠ 无法生成 YAML 文档（需要安装 js-yaml）');
    }

    // 生成简单的 HTML 索引页
    const htmlPath = path.join(outputDir, 'index.html');
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>实验室管理系统 API 文档</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 { color: #333; }
    .info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .links { margin: 30px 0; }
    .links a {
      display: inline-block;
      margin: 10px 10px 10px 0;
      padding: 10px 20px;
      background: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 5px;
    }
    .links a:hover { background: #0056b3; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 5px;
      padding: 15px;
      text-align: center;
    }
    .stat-number {
      font-size: 2em;
      font-weight: bold;
      color: #007bff;
    }
    .stat-label {
      color: #6c757d;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <h1>实验室管理系统 API 文档</h1>
  
  <div class="info">
    <p><strong>版本:</strong> ${version}</p>
    <p><strong>生成时间:</strong> ${new Date(timestamp).toLocaleString('zh-CN')}</p>
    <p><strong>环境:</strong> 本地开发</p>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-number">${Object.keys(spec.paths || {}).length}</div>
      <div class="stat-label">API 端点</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${Object.keys((spec.components && spec.components.schemas) || {}).length}</div>
      <div class="stat-label">数据模型</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${(spec.tags || []).length}</div>
      <div class="stat-label">API 分类</div>
    </div>
  </div>

  <div class="links">
    <a href="openapi.json" target="_blank">OpenAPI JSON</a>
    <a href="openapi.yaml" target="_blank">OpenAPI YAML</a>
    <a href="http://localhost:3000/api-docs" target="_blank">在线查看文档</a>
  </div>

  <h2>使用说明</h2>
  <ol>
    <li>启动开发服务器: <code>npm run dev</code></li>
    <li>访问交互式文档: <a href="http://localhost:3000/api-docs">http://localhost:3000/api-docs</a></li>
    <li>下载 JSON 或 YAML 文件导入到 Postman</li>
    <li>使用 OpenAPI Generator 生成客户端 SDK</li>
  </ol>

  <h2>API 分类</h2>
  <ul>
    ${(spec.tags || []).map(tag => `<li><strong>${tag.name}</strong>: ${tag.description || ''}</li>`).join('\n    ')}
  </ul>
</body>
</html>`;

    fs.writeFileSync(htmlPath, html);
    console.log('✓ 生成 HTML 索引:', htmlPath);

    // 统计信息
    console.log('\n文档统计:');
    console.log(`  API 端点: ${Object.keys(spec.paths || {}).length}`);
    console.log(`  数据模型: ${Object.keys((spec.components && spec.components.schemas) || {}).length}`);
    console.log(`  API 分类: ${(spec.tags || []).length}`);
    
    console.log('\n✓ 文档生成完成！');
    console.log(`\n查看文档:`);
    console.log(`  - 本地文件: file://${htmlPath}`);
    console.log(`  - 在线文档: http://localhost:3000/api-docs`);

  } catch (error) {
    console.error('✗ 文档生成失败:', error.message);
    console.error('\n请确保:');
    console.error('  1. 已运行 npm run build');
    console.error('  2. Swagger 配置文件正确');
    process.exit(1);
  }
}

// 执行
if (require.main === module) {
  main();
}

module.exports = { main };
