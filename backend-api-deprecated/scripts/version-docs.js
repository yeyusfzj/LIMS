#!/usr/bin/env node

/**
 * API 文档版本管理脚本
 * 
 * 用于管理不同版本的 API 文档，支持版本归档和查询
 */

const fs = require('fs');
const path = require('path');

// 版本管理配置
const VERSIONS_DIR = path.join(__dirname, '../docs/api/versions');
const CURRENT_VERSION_FILE = path.join(__dirname, '../docs/api/current-version.json');

/**
 * 获取当前 API 版本
 */
function getCurrentVersion() {
  try {
    const spec = require('../dist/config/swagger').swaggerSpec;
    return spec.info.version || '1.0.0';
  } catch (error) {
    console.error('无法获取当前版本:', error.message);
    return null;
  }
}

/**
 * 归档当前版本的文档
 */
function archiveVersion(version, description = '') {
  console.log(`\n开始归档版本 ${version}...`);

  // 确保版本目录存在
  if (!fs.existsSync(VERSIONS_DIR)) {
    fs.mkdirSync(VERSIONS_DIR, { recursive: true });
  }

  // 创建版本目录
  const versionDir = path.join(VERSIONS_DIR, version);
  if (fs.existsSync(versionDir)) {
    console.warn(`⚠ 版本 ${version} 已存在，将被覆盖`);
  } else {
    fs.mkdirSync(versionDir, { recursive: true });
  }

  // 复制当前文档
  const apiDocsDir = path.join(__dirname, '../docs/api');
  const files = ['openapi.json', 'openapi.yaml'];

  files.forEach(file => {
    const sourcePath = path.join(apiDocsDir, file);
    const targetPath = path.join(versionDir, file);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✓ 已归档: ${file}`);
    }
  });

  // 保存版本元数据
  const metadata = {
    version,
    description,
    archivedAt: new Date().toISOString(),
    files: files.filter(f => fs.existsSync(path.join(apiDocsDir, f)))
  };

  fs.writeFileSync(
    path.join(versionDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  // 更新版本索引
  updateVersionIndex(version, metadata);

  console.log(`✓ 版本 ${version} 归档完成`);
}

/**
 * 更新版本索引
 */
function updateVersionIndex(version, metadata) {
  const indexPath = path.join(VERSIONS_DIR, 'index.json');
  
  let index = { versions: [] };
  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  }

  // 移除旧的同版本记录
  index.versions = index.versions.filter(v => v.version !== version);

  // 添加新版本
  index.versions.unshift({
    version,
    description: metadata.description,
    archivedAt: metadata.archivedAt,
    path: `versions/${version}`
  });

  // 保持最近 20 个版本
  if (index.versions.length > 20) {
    const removed = index.versions.splice(20);
    console.log(`\n清理旧版本: ${removed.map(v => v.version).join(', ')}`);
    
    // 删除旧版本文件
    removed.forEach(v => {
      const oldDir = path.join(VERSIONS_DIR, v.version);
      if (fs.existsSync(oldDir)) {
        fs.rmSync(oldDir, { recursive: true, force: true });
      }
    });
  }

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

/**
 * 列出所有版本
 */
function listVersions() {
  const indexPath = path.join(VERSIONS_DIR, 'index.json');
  
  if (!fs.existsSync(indexPath)) {
    console.log('暂无归档版本');
    return;
  }

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  
  console.log('\n已归档的 API 文档版本:\n');
  console.log('版本号'.padEnd(20) + '归档时间'.padEnd(30) + '描述');
  console.log('-'.repeat(80));

  index.versions.forEach(v => {
    const date = new Date(v.archivedAt).toLocaleString('zh-CN');
    console.log(
      v.version.padEnd(20) +
      date.padEnd(30) +
      (v.description || '无描述')
    );
  });

  console.log(`\n共 ${index.versions.length} 个版本`);
}

/**
 * 恢复指定版本
 */
function restoreVersion(version) {
  console.log(`\n开始恢复版本 ${version}...`);

  const versionDir = path.join(VERSIONS_DIR, version);
  
  if (!fs.existsSync(versionDir)) {
    console.error(`✗ 版本 ${version} 不存在`);
    process.exit(1);
  }

  // 读取版本元数据
  const metadataPath = path.join(versionDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.error(`✗ 版本 ${version} 元数据缺失`);
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

  // 恢复文档文件
  const apiDocsDir = path.join(__dirname, '../docs/api');
  
  metadata.files.forEach(file => {
    const sourcePath = path.join(versionDir, file);
    const targetPath = path.join(apiDocsDir, file);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✓ 已恢复: ${file}`);
    }
  });

  console.log(`✓ 版本 ${version} 恢复完成`);
}

/**
 * 生成版本对比报告
 */
function compareVersions(version1, version2) {
  console.log(`\n对比版本 ${version1} 和 ${version2}...\n`);

  const v1Path = path.join(VERSIONS_DIR, version1, 'openapi.json');
  const v2Path = path.join(VERSIONS_DIR, version2, 'openapi.json');

  if (!fs.existsSync(v1Path) || !fs.existsSync(v2Path)) {
    console.error('✗ 版本文件不存在');
    process.exit(1);
  }

  const spec1 = JSON.parse(fs.readFileSync(v1Path, 'utf-8'));
  const spec2 = JSON.parse(fs.readFileSync(v2Path, 'utf-8'));

  // 比较端点
  const paths1 = Object.keys(spec1.paths || {});
  const paths2 = Object.keys(spec2.paths || {});

  const added = paths2.filter(p => !paths1.includes(p));
  const removed = paths1.filter(p => !paths2.includes(p));
  const common = paths1.filter(p => paths2.includes(p));

  console.log('端点变更:');
  console.log(`  新增: ${added.length}`);
  console.log(`  删除: ${removed.length}`);
  console.log(`  保持: ${common.length}`);

  if (added.length > 0) {
    console.log('\n新增端点:');
    added.forEach(p => console.log(`  + ${p}`));
  }

  if (removed.length > 0) {
    console.log('\n删除端点:');
    removed.forEach(p => console.log(`  - ${p}`));
  }

  // 比较数据模型
  const schemas1 = Object.keys((spec1.components && spec1.components.schemas) || {});
  const schemas2 = Object.keys((spec2.components && spec2.components.schemas) || {});

  const addedSchemas = schemas2.filter(s => !schemas1.includes(s));
  const removedSchemas = schemas1.filter(s => !schemas2.includes(s));

  console.log('\n数据模型变更:');
  console.log(`  新增: ${addedSchemas.length}`);
  console.log(`  删除: ${removedSchemas.length}`);

  if (addedSchemas.length > 0) {
    console.log('\n新增模型:');
    addedSchemas.forEach(s => console.log(`  + ${s}`));
  }

  if (removedSchemas.length > 0) {
    console.log('\n删除模型:');
    removedSchemas.forEach(s => console.log(`  - ${s}`));
  }
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'archive':
      const version = args[1] || getCurrentVersion();
      const description = args[2] || '';
      if (!version) {
        console.error('✗ 无法确定版本号');
        process.exit(1);
      }
      archiveVersion(version, description);
      break;

    case 'list':
      listVersions();
      break;

    case 'restore':
      if (!args[1]) {
        console.error('✗ 请指定要恢复的版本号');
        console.log('用法: node version-docs.js restore <version>');
        process.exit(1);
      }
      restoreVersion(args[1]);
      break;

    case 'compare':
      if (!args[1] || !args[2]) {
        console.error('✗ 请指定两个版本号');
        console.log('用法: node version-docs.js compare <version1> <version2>');
        process.exit(1);
      }
      compareVersions(args[1], args[2]);
      break;

    default:
      console.log('API 文档版本管理工具\n');
      console.log('用法:');
      console.log('  node version-docs.js archive [version] [description]  - 归档当前版本');
      console.log('  node version-docs.js list                             - 列出所有版本');
      console.log('  node version-docs.js restore <version>                - 恢复指定版本');
      console.log('  node version-docs.js compare <v1> <v2>                - 对比两个版本');
      console.log('\n示例:');
      console.log('  node version-docs.js archive 1.0.0 "初始版本"');
      console.log('  node version-docs.js list');
      console.log('  node version-docs.js restore 1.0.0');
      console.log('  node version-docs.js compare 1.0.0 1.1.0');
      break;
  }
}

// 执行
if (require.main === module) {
  main();
}

module.exports = {
  archiveVersion,
  listVersions,
  restoreVersion,
  compareVersions
};
