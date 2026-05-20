# 前端服务重启指南

## 问题原因

当前的错误 `NS_ERROR_CORRUPTED_CONTENT` 通常是由以下原因引起的：

1. **Vite 热更新缓存问题** - 文件修改后缓存未正确更新
2. **浏览器缓存** - 浏览器缓存了旧的模块
3. **文件编码问题** - 文件保存时编码不正确

## 解决步骤

### 步骤1: 停止前端服务

在运行前端的终端中按 `Ctrl+C` 停止服务

### 步骤2: 清除 Vite 缓存

```bash
# 在 vue-project 目录下运行
cd vue-project

# 删除 node_modules/.vite 缓存目录
rm -rf node_modules/.vite

# Windows PowerShell
Remove-Item -Recurse -Force node_modules/.vite
```

### 步骤3: 清除浏览器缓存

在浏览器中：
1. 打开开发者工具 (F12)
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

或者：
1. 按 `Ctrl+Shift+Delete`
2. 选择"缓存的图片和文件"
3. 点击"清除数据"

### 步骤4: 重新启动前端服务

```bash
cd vue-project
npm run dev
```

### 步骤5: 在浏览器中打开新的无痕窗口

使用无痕模式可以避免缓存问题：
- Chrome/Edge: `Ctrl+Shift+N`
- Firefox: `Ctrl+Shift+P`

然后访问: `http://localhost:5173`

## 如果问题仍然存在

### 方法1: 完全重新安装依赖

```bash
cd vue-project

# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# Windows PowerShell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# 重新安装
npm install

# 启动服务
npm run dev
```

### 方法2: 检查文件编码

确保所有 `.vue` 文件使用 UTF-8 编码保存。

在 VS Code 中：
1. 打开文件
2. 查看右下角的编码显示
3. 如果不是 UTF-8，点击它并选择"通过编码保存" -> "UTF-8"

### 方法3: 检查语法错误

运行类型检查：

```bash
cd vue-project
npm run type-check
```

如果有错误，会显示具体的文件和行号。

## 验证修复

修复后，应该能够：

1. ✅ 正常访问样品登记页面
2. ✅ 正常访问样品列表页面
3. ✅ 浏览器控制台没有模块加载错误
4. ✅ 可以正常进行样品登记操作

## 快速重启命令

创建一个快速重启脚本：

**restart-frontend.sh** (Linux/Mac):
```bash
#!/bin/bash
cd vue-project
rm -rf node_modules/.vite
npm run dev
```

**restart-frontend.bat** (Windows):
```batch
@echo off
cd vue-project
rmdir /s /q node_modules\.vite
npm run dev
```

使用方法：
```bash
# Linux/Mac
chmod +x restart-frontend.sh
./restart-frontend.sh

# Windows
restart-frontend.bat
```
