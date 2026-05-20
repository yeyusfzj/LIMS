# 实验室智能管理系统 - 源代码目录结构

## 目录说明

```
src/
├── assets/          # 静态资源（图片、字体等）
├── components/      # 可复用的 Vue 组件
├── router/          # Vue Router 路由配置
├── services/        # API 服务层（后端接口调用）
├── stores/          # Pinia 状态管理
├── types/           # TypeScript 类型定义
├── utils/           # 工具函数和辅助类
├── views/           # 页面级组件
├── App.vue          # 根组件
├── main.ts          # 应用入口文件
└── vite-env.d.ts    # Vite 环境类型定义
```

## 技术栈

- **Vue 3**: 使用 Composition API
- **TypeScript**: 类型安全
- **Element Plus**: UI 组件库
- **Vue Router**: 路由管理
- **Vite**: 构建工具

## 开发指南

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 预览生产构建
```bash
npm run preview
```
