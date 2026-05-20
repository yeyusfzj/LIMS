# 快速开始指南

欢迎使用实验室智能管理系统！本指南将帮助您快速启动和运行项目。

## 前置要求

在开始之前，请确保您的开发环境已安装：

- **Node.js**: 版本 16.x 或更高
- **npm**: 版本 7.x 或更高（通常随 Node.js 一起安装）

检查版本：
```bash
node --version
npm --version
```

## 安装步骤

### 1. 进入项目目录

```bash
cd vue-project
```

### 2. 安装依赖

```bash
npm install
```

这将安装所有必需的依赖包，包括：
- Vue 3
- TypeScript
- Element Plus
- Vue Router
- Vite

### 3. 启动开发服务器

```bash
npm run dev
```

开发服务器将在 `http://localhost:5173` 启动（端口可能不同）。

### 4. 在浏览器中打开

打开浏览器访问显示的地址，通常是：
```
http://localhost:5173
```

## 项目结构概览

```
vue-project/
├── src/
│   ├── assets/          # 静态资源和样式
│   ├── components/      # 可复用组件
│   ├── layouts/         # 布局组件
│   ├── mock/            # 模拟数据
│   ├── router/          # 路由配置
│   ├── types/           # TypeScript 类型
│   ├── utils/           # 工具函数
│   ├── views/           # 页面组件
│   ├── App.vue          # 根组件
│   └── main.ts          # 入口文件
├── public/              # 公共资源
└── index.html           # HTML 模板
```

## 主要功能模块

### 1. 首页仪表板
- 路径: `/dashboard`
- 功能: 显示系统概览、关键指标、快捷入口、待办事项

### 2. 样品管理
- 样品列表: `/sample/management`
- 样品登记: `/sample/registration`
- 样品详情: `/sample/detail/:id`
- 留样管理: `/sample/retention`

### 3. 工作流管理
- 检测方法库: `/method/library`
- 工作流设计器: `/workflow/designer`
- 任务列表: `/workflow/tasks`
- 任务派工: `/workflow/assignment`

### 4. 结果管理
- 结果录入: `/result/entry`
- 结果导入: `/result/import`
- 结果查询: `/result/list`

### 5. 审核与质量判定
- 审核任务: `/audit/tasks`
- 质量判定: `/quality/judgment`
- 样品放行: `/sample/release`

### 6. 报告管理
- 报告模板: `/report/templates`
- 报告生成: `/report/generator`
- 报告分发: `/report/distribution`

### 7. 统计分析
- 统计仪表板: `/statistics/dashboard`
- 自定义报表: `/statistics/custom-report`

### 8. 系统管理
- 用户管理: `/system/users`
- 角色权限: `/system/roles`
- 审计日志: `/system/audit-log`
- 系统配置: `/system/settings`

## 使用模拟数据

项目使用模拟数据进行展示，无需后端服务即可运行。

### 查看模拟数据

模拟数据位于 `src/mock/index.ts`，包括：
- 样品数据
- 任务数据
- 报告数据
- 用户数据
- 统计数据

### 在组件中使用

```typescript
import { mockSamples } from '@/mock'

// 使用样品数据
const samples = ref(mockSamples)
```

详细说明请参考 `src/mock/README.md`。

## 开发技巧

### 1. 热重载

开发服务器支持热重载，修改代码后会自动刷新浏览器。

### 2. 使用 Vue DevTools

安装 Vue DevTools 浏览器扩展以便调试：
- [Chrome](https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)

### 3. TypeScript 支持

项目使用 TypeScript，享受类型检查和智能提示：

```typescript
// 定义接口
interface Sample {
  id: number
  name: string
  status: string
}

// 使用类型
const sample: Sample = {
  id: 1,
  name: '样品名称',
  status: '检测中'
}
```

### 4. Element Plus 组件

使用 Element Plus 组件库：

```vue
<template>
  <el-button type="primary">主要按钮</el-button>
  <el-input v-model="input" placeholder="请输入" />
  <el-table :data="tableData">
    <el-table-column prop="name" label="名称" />
  </el-table>
</template>
```

查看完整文档: https://element-plus.org/

### 5. 路由导航

使用 Vue Router 进行页面导航：

```typescript
import { useRouter } from 'vue-router'

const router = useRouter()

// 编程式导航
router.push('/sample/management')
router.push({ name: 'sample-detail', params: { id: 1 } })
router.back()
```

## 常用命令

### 开发

```bash
# 启动开发服务器
npm run dev

# 启动开发服务器（指定端口）
npm run dev -- --port 3000
```

### 构建

```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

### 代码检查

```bash
# 运行 ESLint
npm run lint

# 自动修复
npm run lint -- --fix
```

### 类型检查

```bash
# TypeScript 类型检查
npm run type-check
```

## 常见问题

### 1. 端口被占用

如果默认端口 5173 被占用，Vite 会自动使用下一个可用端口。

或者手动指定端口：
```bash
npm run dev -- --port 3000
```

### 2. 依赖安装失败

尝试清除缓存后重新安装：
```bash
rm -rf node_modules package-lock.json
npm install
```

### 3. 页面空白

检查浏览器控制台是否有错误信息。确保：
- Node.js 版本正确
- 依赖已正确安装
- 没有语法错误

### 4. 样式不生效

确保已正确导入样式文件：
- Element Plus 样式已在 `main.ts` 中导入
- 全局样式已在 `main.ts` 中导入

## 浏览器兼容性

推荐使用以下浏览器的最新版本：
- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge

## 下一步

现在您已经成功启动项目，可以：

1. 📖 阅读 [项目状态文档](./PROJECT_STATUS.md) 了解项目完成情况
2. 🎨 查看 [用户体验指南](./UX_GUIDELINES.md) 了解 UX 最佳实践
3. 💻 开始探索各个功能模块
4. 🔧 根据需求修改和扩展功能

## 获取帮助

如果遇到问题：

1. 查看项目文档
2. 检查浏览器控制台错误
3. 查看 Element Plus 官方文档
4. 查看 Vue 3 官方文档

## 相关资源

- [Vue 3 文档](https://cn.vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Vite 文档](https://cn.vitejs.dev/)
- [Vue Router 文档](https://router.vuejs.org/)

---

祝您开发愉快！🚀
