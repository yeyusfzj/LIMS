# 实验室智能管理系统

> 基于 Vue 3 + TypeScript + Element Plus 的实验室管理系统前端架构展示版

[![Vue](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-Latest-409EFF.svg)](https://element-plus.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg)](https://vitejs.dev/)

## 📋 项目简介

实验室智能管理系统是一个全面的实验室信息管理解决方案，涵盖样品管理、工作流管理、结果管理、审核判定、报告生成、统计分析等核心功能模块。

本项目为**前端架构展示版**，专注于展示系统的整体结构、页面布局和交互流程，使用模拟数据进行演示。

## ✨ 主要特性

### 🎯 核心功能
- **样品全生命周期管理** - 从登记、流转、检测到留样的完整管理
- **灵活的工作流引擎** - 可视化工作流设计器，支持自定义检测流程
- **智能结果管理** - 支持手工录入、文件导入、公式计算和异常检测
- **多级审核机制** - 可配置的审核流程，确保数据质量
- **报告自动生成** - 模板化报告生成，支持电子签名和分发
- **实时统计分析** - 多维度数据统计和可视化展示
- **完善的权限管理** - 基于角色的权限控制和审计日志

### 💎 用户体验
- **响应式设计** - 完美适配桌面、平板和移动设备
- **直观的导航** - 清晰的菜单结构和面包屑导航
- **全局搜索** - 跨模块快速搜索样品、任务和报告
- **实时通知** - 智能通知中心，及时提醒待办事项
- **快捷操作** - 首页快捷入口，一键直达常用功能

### 🎨 技术亮点
- **现代化技术栈** - Vue 3 Composition API + TypeScript
- **组件化开发** - 高度可复用的组件设计
- **统一样式系统** - CSS 变量管理，支持主题定制
- **性能优化** - 路由懒加载、代码分割
- **开发体验** - 热重载、TypeScript 类型检查

## 🚀 快速开始

### 环境要求

- Node.js 16.x 或更高版本
- npm 7.x 或更高版本

### 安装

```bash
# 进入项目目录
cd vue-project

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173 查看应用。

详细说明请参考 [快速开始指南](./GETTING_STARTED.md)。

## 📦 项目结构

```
vue-project/
├── src/
│   ├── assets/              # 静态资源
│   │   └── styles/          # 全局样式
│   │       ├── variables.css    # CSS 变量
│   │       ├── global.css       # 全局样式
│   │       └── responsive.css   # 响应式样式
│   ├── components/          # 公共组件
│   │   ├── BarcodeDisplay.vue       # 条码显示
│   │   ├── ChainOfCustody.vue       # 监管链
│   │   ├── ElectronicSignature.vue  # 电子签名
│   │   ├── FormulaEditor.vue        # 公式编辑器
│   │   ├── GlobalSearch.vue         # 全局搜索
│   │   ├── NotificationCenter.vue   # 通知中心
│   │   ├── SampleMerge.vue          # 样品合并
│   │   ├── SampleReturn.vue         # 样品退回
│   │   ├── SampleSplit.vue          # 样品分样
│   │   ├── SampleTransfer.vue       # 样品流转
│   │   ├── SideMenu.vue             # 侧边菜单
│   │   └── workflow/
│   │       └── NodeConfig.vue       # 工作流节点配置
│   ├── layouts/             # 布局组件
│   │   └── MainLayout.vue           # 主布局
│   ├── mock/                # 模拟数据
│   │   ├── index.ts                 # 数据定义
│   │   └── README.md                # 使用说明
│   ├── router/              # 路由配置
│   │   └── index.ts
│   ├── types/               # TypeScript 类型
│   │   └── index.ts
│   ├── utils/               # 工具函数
│   │   └── exportUtils.ts           # 导出工具
│   ├── views/               # 页面组件
│   │   ├── audit/           # 审核模块
│   │   ├── method/          # 方法管理
│   │   ├── quality/         # 质量判定
│   │   ├── report/          # 报告管理
│   │   ├── result/          # 结果管理
│   │   ├── sample/          # 样品管理
│   │   ├── statistics/      # 统计分析
│   │   ├── system/          # 系统管理
│   │   ├── workflow/        # 工作流管理
│   │   ├── Dashboard.vue    # 首页
│   │   └── NotFound.vue     # 404 页面
│   ├── App.vue              # 根组件
│   └── main.ts              # 入口文件
├── public/                  # 公共资源
├── GETTING_STARTED.md       # 快速开始指南
├── PROJECT_STATUS.md        # 项目状态文档
├── UX_GUIDELINES.md         # 用户体验指南
├── index.html               # HTML 模板
├── package.json             # 项目配置
├── tsconfig.json            # TypeScript 配置
└── vite.config.ts           # Vite 配置
```

## 🎯 功能模块

### 1. 样品管理
- 样品登记与条码生成
- 样品信息查询与详情查看
- 样品流转与监管链追踪
- 样品分样与合样操作
- 留样管理与到期提醒
- 样品放行与退回

### 2. 工作流管理
- 检测方法库管理
- 可视化工作流设计器
- 工作流模板配置
- 任务自动分配与派工
- 任务进度跟踪

### 3. 结果管理
- 多种方式结果录入
- 批量结果导入
- 公式自动计算
- 异常结果标记与复测
- 结果查询与导出

### 4. 审核与质量判定
- 多级审核流程配置
- 审核任务管理
- 质量判定规则配置
- 自动判定与人工复核

### 5. 报告管理
- 报告模板设计
- 报告自动生成
- 电子签名管理
- 报告分发与回收

### 6. 统计分析
- 实时数据统计
- 多维度数据分析
- 自定义报表配置
- 数据可视化展示

### 7. 系统管理
- 用户管理
- 角色权限配置
- 审计日志查看
- 系统参数配置

## 🛠️ 技术栈

### 核心框架
- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - JavaScript 的超集，提供类型安全
- **Vite** - 下一代前端构建工具

### UI 组件
- **Element Plus** - 基于 Vue 3 的组件库
- **@element-plus/icons-vue** - Element Plus 图标库

### 路由管理
- **Vue Router 4** - Vue.js 官方路由管理器

### 开发工具
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化

## 📱 浏览器支持

| Chrome | Firefox | Safari | Edge |
|--------|---------|--------|------|
| ✅ Latest | ✅ Latest | ✅ Latest | ✅ Latest |

## 📚 文档

- [快速开始指南](./GETTING_STARTED.md) - 项目安装和启动
- [项目状态文档](./PROJECT_STATUS.md) - 功能完成情况
- [用户体验指南](./UX_GUIDELINES.md) - UX 最佳实践
- [模拟数据说明](./src/mock/README.md) - 模拟数据使用

## 🔧 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 代码检查
npm run lint

# 类型检查
npm run type-check
```

## 📝 开发说明

### 使用模拟数据

项目使用模拟数据进行展示，无需后端服务：

```typescript
import { mockSamples, mockTasks } from '@/mock'

// 在组件中使用
const samples = ref(mockSamples)
const tasks = ref(mockTasks)
```

### 添加新页面

1. 在 `src/views` 对应模块下创建页面组件
2. 在 `src/router/index.ts` 添加路由配置
3. 在 `src/components/SideMenu.vue` 添加菜单项

### 样式定制

全局样式变量定义在 `src/assets/styles/variables.css`：

```css
:root {
  --primary-color: #409EFF;
  --success-color: #67C23A;
  --warning-color: #E6A23C;
  --danger-color: #F56C6C;
  /* ... */
}
```

## 🚧 后续计划

### 功能增强
- [ ] 集成真实后端 API
- [ ] 实现完整的权限控制
- [ ] 添加数据导入导出功能
- [ ] 集成图表库（ECharts）
- [ ] 添加富文本编辑器

### 性能优化
- [ ] 实现虚拟滚动
- [ ] 添加骨架屏
- [ ] 图片懒加载
- [ ] 组件懒加载优化

### 测试
- [ ] 单元测试
- [ ] 端到端测试
- [ ] 组件测试

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目仅用于展示和学习目的。

## 📞 联系方式

如有问题或建议，欢迎联系。

---

**开发状态**: ✅ 前端架构展示版已完成

**最后更新**: 2024-01-23
