#!/usr/bin/env node

/**
 * API 文档变更日志生成脚本
 * 
 * 自动检测 API 端点的变更并生成变更日志
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取当前 Swagger 规范
function getCurrentSpec() {
  try {
    const spec = require('../dist/config/swagger').swaggerSpec;
    return spec;
  } catch (error) {
    console.error('无法加载 Swagger 规范:', error.message);
    process.exit(1);
  }
}

// 获取上一个版本的规范（从 git）
function getPreviousSpec() {
  try {
    // 尝试从上一次提交获取规范
    const previousContent = execSync('git show HEAD~1:docs/api/openapi.json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return JSON.parse(previousContent);
  } catch (error) {
    // 如果没有上一个版本，返回空规范
    return { paths: {}, components: { schemas: {} } };
  }
}

// 比较两个规范并生成变更
function compareSpecs(oldSpec, newSpec) {
  const changes = {
    added: [],
    modified: [],
    removed: [],
    schemas: {
      added: [],
      modified: [],
      removed: []
    }
  };

  const oldPaths = oldSpec.paths || {};
  const newPaths = newSpec.paths || {};

  // 检测新增和修改的端点
  for (const path in newPaths) {
    for (const method in newPaths[path]) {
      if (method === 'parameters') continue;
      
      const endpoint = `${method.toUpperCase()} ${path}`;
      
      if (!oldPaths[path] || !oldPaths[path][method]) {
        changes.added.push({
          endpoint,
          summary: newPaths[path][method].summary || '无描述'
        });
      } else {
        // 检查是否有修改
        const oldEndpoint = JSON.stringify(oldPaths[path][method]);
        const newEndpoint = JSON.stringify(newPaths[path][method]);
        
        if (oldEndpoint !== newEndpoint) {
          changes.modified.push({
            endpoint,
            summary: newPaths[path][method].summary || '无描述'
          });
        }
      }
    }
  }

  // 检测删除的端点
  for (const path in oldPaths) {
    for (const method in oldPaths[path]) {
      if (method === 'parameters') continue;
      
      if (!newPaths[path] || !newPaths[path][method]) {
        const endpoint = `${method.toUpperCase()} ${path}`;
        changes.removed.push({
          endpoint,
          summary: oldPaths[path][method].summary || '无描述'
        });
      }
    }
  }

  // 检测数据模型变更
  const oldSchemas = (oldSpec.components && oldSpec.components.schemas) || {};
  const newSchemas = (newSpec.components && newSpec.components.schemas) || {};

  for (const schema in newSchemas) {
    if (!oldSchemas[schema]) {
      changes.schemas.added.push(schema);
    } else if (JSON.stringify(oldSchemas[schema]) !== JSON.stringify(newSchemas[schema])) {
      changes.schemas.modified.push(schema);
    }
  }

  for (const schema in oldSchemas) {
    if (!newSchemas[schema]) {
      changes.schemas.removed.push(schema);
    }
  }

  return changes;
}

// 生成 Markdown 格式的变更日志
function generateMarkdown(changes, version, timestamp) {
  let markdown = `# API 文档变更日志\n\n`;
  markdown += `## 版本 ${version}\n\n`;
  markdown += `**发布时间:** ${timestamp}\n\n`;

  const hasChanges = 
    changes.added.length > 0 ||
    changes.modified.length > 0 ||
    changes.removed.length > 0 ||
    changes.schemas.added.length > 0 ||
    changes.schemas.modified.length > 0 ||
    changes.schemas.removed.length > 0;

  if (!hasChanges) {
    markdown += `*本次更新无 API 变更*\n\n`;
    return markdown;
  }

  // 新增端点
  if (changes.added.length > 0) {
    markdown += `### ✨ 新增端点 (${changes.added.length})\n\n`;
    changes.added.forEach(item => {
      markdown += `- **${item.endpoint}** - ${item.summary}\n`;
    });
    markdown += `\n`;
  }

  // 修改的端点
  if (changes.modified.length > 0) {
    markdown += `### 🔄 修改的端点 (${changes.modified.length})\n\n`;
    changes.modified.forEach(item => {
      markdown += `- **${item.endpoint}** - ${item.summary}\n`;
    });
    markdown += `\n`;
  }

  // 删除的端点
  if (changes.removed.length > 0) {
    markdown += `### ❌ 删除的端点 (${changes.removed.length})\n\n`;
    changes.removed.forEach(item => {
      markdown += `- **${item.endpoint}** - ${item.summary}\n`;
    });
    markdown += `\n`;
  }

  // 数据模型变更
  const hasSchemaChanges = 
    changes.schemas.added.length > 0 ||
    changes.schemas.modified.length > 0 ||
    changes.schemas.removed.length > 0;

  if (hasSchemaChanges) {
    markdown += `### 📦 数据模型变更\n\n`;
    
    if (changes.schemas.added.length > 0) {
      markdown += `**新增模型:** ${changes.schemas.added.join(', ')}\n\n`;
    }
    
    if (changes.schemas.modified.length > 0) {
      markdown += `**修改的模型:** ${changes.schemas.modified.join(', ')}\n\n`;
    }
    
    if (changes.schemas.removed.length > 0) {
      markdown += `**删除的模型:** ${changes.schemas.removed.join(', ')}\n\n`;
    }
  }

  return markdown;
}

// 主函数
function main() {
  console.log('开始生成 API 文档变更日志...');

  // 获取规范
  const currentSpec = getCurrentSpec();
  const previousSpec = getPreviousSpec();

  // 比较变更
  const changes = compareSpecs(previousSpec, currentSpec);

  // 生成版本信息
  const version = currentSpec.info.version || '1.0.0';
  const timestamp = new Date().toISOString();

  // 生成 Markdown
  const markdown = generateMarkdown(changes, version, timestamp);

  // 确保目录存在
  const docsDir = path.join(__dirname, '../docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // 保存变更日志
  const changelogPath = path.join(docsDir, 'CHANGELOG.md');
  
  // 如果已存在变更日志，追加到前面
  let existingChangelog = '';
  if (fs.existsSync(changelogPath)) {
    existingChangelog = fs.readFileSync(changelogPath, 'utf-8');
    // 移除标题
    existingChangelog = existingChangelog.replace(/^# API 文档变更日志\n\n/, '');
  }

  const fullChangelog = markdown + existingChangelog;
  fs.writeFileSync(changelogPath, fullChangelog);

  console.log('变更日志生成成功:', changelogPath);
  
  // 输出统计信息
  console.log('\n变更统计:');
  console.log(`  新增端点: ${changes.added.length}`);
  console.log(`  修改端点: ${changes.modified.length}`);
  console.log(`  删除端点: ${changes.removed.length}`);
  console.log(`  新增模型: ${changes.schemas.added.length}`);
  console.log(`  修改模型: ${changes.schemas.modified.length}`);
  console.log(`  删除模型: ${changes.schemas.removed.length}`);
}

// 执行
if (require.main === module) {
  main();
}

module.exports = { compareSpecs, generateMarkdown };
