# Design Document: AI智能洞察卡片增强

## Overview

### 设计目标

本设计文档定义了 AIInsightCard.vue 组件的完整技术架构，旨在实现从真实数据库获取数据并进行智能分析展示的功能。该组件将为实验室管理系统提供实时的数据洞察、异常告警和智能建议，帮助用户更高效地管理样品、仪器和审核任务。

### 技术栈

- **前端框架**: Vue 3 (Composition API)
- **UI组件库**: Element Plus 2.x
- **状态管理**: Pinia 3.x
- **HTTP客户端**: Axios 1.x
- **路由管理**: Vue Router 4.x
- **类型系统**: TypeScript 5.x
- **后端框架**: FastAPI (Python)
- **数据库**: PostgreSQL (通过 SQLAlchemy ORM)

### 设计原则

1. **关注点分离**: 将数据获取、业务逻辑和UI展示分离
2. **可测试性**: 所有核心逻辑都可独立测试
3. **容错性**: API失败时优雅降级，不影响其他功能
4. **性能优化**: 并行请求、响应式渲染、避免不必要的重渲染
5. **用户体验**: 清晰的加载状态、友好的错误提示、流畅的交互

## Architecture

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     AIInsightCard.vue                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              UI Layer (Template)                      │  │
│  │  - 智能问候区域                                        │  │
│  │  - 数据分析区域                                        │  │
│  │  - 告警信息区域                                        │  │
│  │  - 智能建议区域                                        │  │
│  │  - 快捷操作区域                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↕                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Component Logic (Script Setup)                │  │
│  │  - refreshInsights()                                  │  │
│  │  - handleAlertAction()                                │  │
│  │  - openAIAssistant()                                  │  │
│  │  - viewDetailedAnalysis()                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│              AI Context Service Layer                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         aiContextService (Singleton)                  │  │
│  │  - collectDashboardContext()                          │  │
│  │  - generateInsights()                                 │  │
│  │  - generateGreeting()                                 │  │
│  │  - generateDataAnalysis()                             │  │
│  │  - generateAlerts()                                   │  │
│  │  - generateRecommendations()                          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                  HTTP Client Layer                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              http (Axios Instance)                    │  │
│  │  - Request Interceptor (认证、追踪)                   │  │
│  │  - Response Interceptor (错误处理)                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                   Backend API Layer                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              FastAPI Routers                          │  │
│  │  - /api/v1/dashboard/stats                            │  │
│  │  - /api/v1/dashboard/todos                            │  │
│  │  - /api/v1/instruments (可选)                         │  │
│  │  - /api/v1/results (可选)                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              PostgreSQL Database                      │  │
│  │  - samples 表                                         │  │
│  │  - tasks 表                                           │  │
│  │  - results 表                                         │  │
│  │  - instruments 表                                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 组件层次结构

```
AIInsightCard (主组件)
├── 智能问候区域 (greeting-section)
│   ├── 问候图标 (el-icon)
│   └── 问候文本 (greeting-text)
├── 数据分析区域 (analysis-grid)
│   └── 分析项 (analysis-item) × N
│       ├── 指标标签 (analysis-label)
│       ├── 指标值 (analysis-value)
│       └── 洞察文本 (analysis-insight)
├── 告警信息区域 (alerts-list)
│   └── 告警项 (alert-item) × N
│       ├── 告警图标 (alert-icon)
│       └── 告警内容 (alert-content)
│           ├── 告警消息 (alert-message)
│           └── 告警操作 (alert-action)
├── 智能建议区域 (suggestions-list)
│   └── 建议项 (suggestion-item) × N
│       ├── 建议图标 (suggestion-icon)
│       └── 建议文本 (suggestion-text)
└── 快捷操作区域 (insight-actions)
    ├── 与AI助手对话按钮
    └── 查看详细分析按钮
```

## Data Models

### TypeScript 类型定义

```typescript
// 仪表盘上下文数据
export interface DashboardContext {
  metrics: {
    totalSamples: number          // 样品总数
    totalSamplesTrend: number     // 样品总数趋势 (%)
    pendingTasks: number          // 待处理任务数
    pendingTasksTrend: number     // 待处理任务趋势 (%)
    qualityRate: number           // 合格率 (%)
    qualityRateTrend: number      // 合格率趋势 (%)
    abnormalSamples: number       // 异常样品数
    abnormalSamplesTrend: number  // 异常样品趋势 (%)
  }
  todoItems: TodoItem[]           // 待办事项列表
  recentActivities: any[]         // 最近活动 (暂未使用)
  timestamp: number               // 数据时间戳
  page: string                    // 页面标识
}

// 待办事项
export interface TodoItem {
  type: 'audit' | 'entry' | 'report'  // 任务类型
  description: string                  // 任务描述
  count: number                        // 任务数量
  urgent: boolean                      // 是否紧急
}

// AI洞察数据
export interface AIInsights {
  greeting: {
    message: string      // 问候消息
    timeOfDay: string    // 时段问候
  }
  dataAnalysis: DataAnalysisItem[]  // 数据分析项
  alerts: Alert[]                   // 告警列表
  suggestions: string[]             // 建议列表
  timestamp: number                 // 生成时间戳
}

// 数据分析项
export interface DataAnalysisItem {
  metric: string                    // 指标名称
  value: string                     // 指标值
  trend: 'up' | 'down' | 'stable'  // 趋势方向
  insight: string                   // 洞察文本
}

// 告警信息
export interface Alert {
  id: string                        // 告警ID
  severity: 'high' | 'medium' | 'low'  // 严重程度
  message: string                   // 告警消息
  action?: string                   // 操作文本
  actionPath?: string               // 操作路径
}
```

### API 响应格式

#### Dashboard Stats API (`GET /api/v1/dashboard/stats`)

```json
{
  "success": true,
  "data": {
    "totalSamples": 1250,
    "totalSamplesTrend": 12.5,
    "pendingTasks": 45,
    "pendingTasksTrend": -5.2,
    "qualityRate": 97.8,
    "qualityRateTrend": 1.2,
    "abnormalSamples": 8,
    "abnormalSamplesTrend": -15.3
  },
  "message": "Success"
}
```

#### Dashboard Todos API (`GET /api/v1/dashboard/todos`)

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "type": "audit",
        "description": "样品审核",
        "count": 12,
        "urgent": true
      },
      {
        "type": "entry",
        "description": "结果录入",
        "count": 8,
        "urgent": false
      }
    ]
  },
  "message": "Success"
}
```


## Components and Interfaces

### AI Context Service (ai-context.ts)

AI Context Service 是核心业务逻辑层，负责数据收集、分析和洞察生成。

#### 类结构

```typescript
class AIContextService {
  // 数据收集
  async collectDashboardContext(): Promise<DashboardContext>
  
  // 洞察生成
  generateInsights(context: DashboardContext): AIInsights
  generateGreeting(context: DashboardContext): { message: string; timeOfDay: string }
  generateDataAnalysis(context: DashboardContext): DataAnalysisItem[]
  generateAlerts(context: DashboardContext): Alert[]
  generateRecommendations(context: DashboardContext): string[]
}
```

#### collectDashboardContext() 方法

**职责**: 从后端 API 收集仪表盘数据

**实现逻辑**:
1. 并行调用 `/api/v1/dashboard/stats` 和 `/api/v1/dashboard/todos`
2. 使用 `Promise.all()` 或单独的 try-catch 确保容错
3. 如果 API 调用失败，返回默认空数据结构
4. 记录错误日志到控制台

**伪代码**:
```typescript
async collectDashboardContext(): Promise<DashboardContext> {
  try {
    // 并行调用两个 API
    const statsResponse = await http.get('/dashboard/stats')
    const todosResponse = await http.get('/dashboard/todos')
    
    // 构建上下文对象
    return {
      metrics: statsResponse.data || defaultMetrics,
      todoItems: todosResponse.data?.items || [],
      recentActivities: [],
      timestamp: Date.now(),
      page: 'dashboard'
    }
  } catch (error) {
    console.error('Failed to collect dashboard context:', error)
    // 返回默认空数据
    return defaultContext
  }
}
```

**性能要求**: 
- 总执行时间 < 200ms (需求 1.6)
- 使用并行请求减少等待时间

#### generateGreeting() 方法

**职责**: 根据时间和数据生成个性化问候语

**实现逻辑**:
1. 根据当前小时数确定时段问候 (0-12: 早上好, 12-18: 下午好, 18-24: 晚上好)
2. 分析关键指标生成洞察点:
   - 样品总数趋势 > 10% → 提及工作量变化
   - 存在紧急待办 → 提醒紧急任务
   - 异常样品趋势 < -10% → 肯定质量改进
   - 合格率 >= 98% → 表扬质量水平
3. 组合洞察点生成完整问候消息

**伪代码**:
```typescript
generateGreeting(context: DashboardContext): { message: string; timeOfDay: string } {
  const hour = new Date().getHours()
  let timeOfDay = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
  
  const insights: string[] = []
  
  // 分析样品趋势
  if (Math.abs(context.metrics.totalSamplesTrend) > 10) {
    insights.push(`样品总数较上周${context.metrics.totalSamplesTrend > 0 ? '增长' : '下降'}${Math.abs(context.metrics.totalSamplesTrend)}%`)
  }
  
  // 分析紧急待办
  const urgentTodos = context.todoItems.filter(item => item.urgent)
  if (urgentTodos.length > 0) {
    const totalCount = urgentTodos.reduce((sum, item) => sum + item.count, 0)
    insights.push(`有${urgentTodos.length}项紧急待办,共${totalCount}个任务需要处理`)
  }
  
  // 分析质量趋势
  if (context.metrics.abnormalSamplesTrend < -10) {
    insights.push(`异常样品数量下降${Math.abs(context.metrics.abnormalSamplesTrend)}%,质量控制效果显著`)
  }
  
  // 分析合格率
  if (context.metrics.qualityRate >= 98) {
    insights.push(`合格率达到${context.metrics.qualityRate}%,保持优秀水平`)
  }
  
  // 组合消息
  const message = insights.length > 0 
    ? `您好!我注意到:\n\n${insights.join('\n')}\n\n💬 您可以问我关于数据分析、工作建议或趋势预测的问题。`
    : '您好!我是实验室智能助手,有什么可以帮助您的吗?'
  
  return { message, timeOfDay }
}
```

#### generateDataAnalysis() 方法

**职责**: 生成数据分析项列表

**实现逻辑**:
1. 为每个核心指标创建分析项
2. 计算趋势方向 (up/down/stable)
3. 生成简短的洞察文本

**伪代码**:
```typescript
generateDataAnalysis(context: DashboardContext): DataAnalysisItem[] {
  const { metrics } = context
  
  return [
    {
      metric: '样品总数',
      value: metrics.totalSamples.toLocaleString(),
      trend: metrics.totalSamplesTrend > 0 ? 'up' : metrics.totalSamplesTrend < 0 ? 'down' : 'stable',
      insight: `较上周${metrics.totalSamplesTrend > 0 ? '增长' : '下降'}${Math.abs(metrics.totalSamplesTrend)}%`
    },
    {
      metric: '待处理任务',
      value: metrics.pendingTasks.toString(),
      trend: metrics.pendingTasksTrend > 0 ? 'up' : metrics.pendingTasksTrend < 0 ? 'down' : 'stable',
      insight: `较上周${metrics.pendingTasksTrend > 0 ? '增加' : '下降'}${Math.abs(metrics.pendingTasksTrend)}%`
    },
    {
      metric: '合格率',
      value: `${metrics.qualityRate}%`,
      trend: metrics.qualityRateTrend > 0 ? 'up' : metrics.qualityRateTrend < 0 ? 'down' : 'stable',
      insight: metrics.qualityRate >= 98 ? '保持优秀水平' : '需要关注'
    },
    {
      metric: '异常样品',
      value: metrics.abnormalSamples.toString(),
      trend: metrics.abnormalSamplesTrend > 0 ? 'up' : metrics.abnormalSamplesTrend < 0 ? 'down' : 'stable',
      insight: `较上周${metrics.abnormalSamplesTrend > 0 ? '增加' : '下降'}${Math.abs(metrics.abnormalSamplesTrend)}%`
    }
  ]
}
```

**性能要求**: 
- 执行时间 < 100ms (需求 12.4)

#### generateAlerts() 方法

**职责**: 根据数据阈值生成告警信息

**实现逻辑**:
1. 检查紧急待办事项 → 生成高优先级告警
2. 检查异常样品数量 → 根据数量生成不同级别告警
3. 检查待处理任务数量 → 生成中等级别告警
4. 按严重程度排序 (high → medium → low)

**告警规则**:
- 紧急待办任务 > 0 → high 级别告警
- 异常样品 > 10 → high 级别告警
- 异常样品 6-10 → medium 级别告警
- 异常样品 1-5 → low 级别告警
- 待处理任务 > 50 → medium 级别告警

**伪代码**:
```typescript
generateAlerts(context: DashboardContext): Alert[] {
  const { todoItems, metrics } = context
  const alerts: Alert[] = []
  
  // 紧急待办告警
  todoItems.forEach((item, index) => {
    if (item.urgent && item.count > 0) {
      alerts.push({
        id: `alert-${index}`,
        severity: 'high',
        message: `${item.description},建议优先处理`,
        action: '立即处理',
        actionPath: '/audit/tasks'
      })
    }
  })
  
  // 异常样品告警
  if (metrics.abnormalSamples > 0) {
    const severity = metrics.abnormalSamples > 10 ? 'high' 
                   : metrics.abnormalSamples > 5 ? 'medium' 
                   : 'low'
    alerts.push({
      id: 'alert-abnormal',
      severity,
      message: `当前有${metrics.abnormalSamples}个异常样品,建议及时处理`,
      action: '查看详情',
      actionPath: '/result/anomaly'
    })
  }
  
  // 待处理任务告警
  if (metrics.pendingTasks > 50) {
    alerts.push({
      id: 'alert-tasks',
      severity: 'medium',
      message: `待处理任务较多(${metrics.pendingTasks}个),建议合理分配资源`,
      action: '任务管理',
      actionPath: '/workflow/tasks'
    })
  }
  
  // 按严重程度排序
  return alerts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}
```

#### generateRecommendations() 方法

**职责**: 基于数据分析生成智能建议

**实现逻辑**:
1. 检查紧急审核任务 → 建议时间管理
2. 检查紧急录入任务 → 建议批量操作
3. 检查样品增长趋势 → 建议资源规划
4. 检查合格率 → 建议质量控制
5. 检查异常样品趋势 → 肯定质量改进
6. 如果没有特殊情况 → 通用鼓励建议

**建议规则**:
- 紧急审核任务 > 0 → 时间管理建议
- 紧急录入任务 > 5 → 批量操作建议
- 样品趋势 > 15% → 资源规划建议
- 合格率 < 95% → 质量控制建议
- 异常样品趋势 < -10% → 质量改进肯定
- 合格率 >= 98% → 质量保持鼓励

**伪代码**:
```typescript
generateRecommendations(context: DashboardContext): string[] {
  const { todoItems, metrics } = context
  const recommendations: string[] = []
  
  // 基于待办事项的建议
  const auditTodo = todoItems.find(item => item.type === 'audit' && item.urgent)
  if (auditTodo && auditTodo.count > 0) {
    recommendations.push(`建议在今天下午3点前完成${auditTodo.count}个样品审核,避免影响后续流程`)
  }
  
  const entryTodo = todoItems.find(item => item.type === 'entry' && item.urgent)
  if (entryTodo && entryTodo.count > 5) {
    recommendations.push(`有${entryTodo.count}个检测结果待录入,建议使用批量录入功能提高效率`)
  }
  
  // 基于指标趋势的建议
  if (metrics.totalSamplesTrend > 15) {
    recommendations.push('样品量增长较快,建议提前评估人力资源和试剂耗材需求')
  }
  
  if (metrics.qualityRate < 95) {
    recommendations.push('合格率有所下降,建议加强质量控制和人员培训')
  }
  
  if (metrics.abnormalSamplesTrend < -10) {
    recommendations.push('异常样品数量持续下降,质量控制措施效果显著,继续保持')
  }
  
  if (metrics.qualityRate >= 98) {
    recommendations.push('合格率保持优秀水平,团队工作质量值得肯定')
  }
  
  // 通用建议
  if (recommendations.length === 0) {
    recommendations.push('当前工作进展顺利,继续保持良好的工作状态')
  }
  
  return recommendations
}
```

### HTTP Client (http.ts)

HTTP Client 已经实现，提供以下功能：
- 请求/响应拦截器
- 自动添加认证令牌
- 统一错误处理
- 请求追踪ID
- 防缓存时间戳

**关键配置**:
```typescript
baseURL: 'http://localhost:8000/api/v1'
timeout: 30000  // 30秒
headers: { 'Content-Type': 'application/json' }
```

### 4.3 AIInsightCard 组件 (AIInsightCard.vue)

#### 4.3.1 组件状态

```typescript
const loading = ref(false)              // 加载状态
const insights = ref<AIInsights | null>(null)  // 洞察数据
```

#### 4.3.2 核心方法

**refreshInsights()**

```typescript
const refreshInsights = async () => {
  loading.value = true
  try {
    // 1. 收集上下文数据
    const context = await aiContextService.collectDashboardContext()
    
    // 2. 生成洞察
    insights.value = aiContextService.generateInsights(context)
  } catch (error) {
    console.error('Failed to refresh insights:', error)
    // 不显示错误提示，静默失败
  } finally {
    loading.value = false
  }
}
```

**handleAlertAction(alert)**

```typescript
const handleAlertAction = (alert: Alert) => {
  if (alert.actionPath) {
    router.push(alert.actionPath)
  }
}
```

**openAIAssistant()**

```typescript
const openAIAssistant = () => {
  // 触发自定义事件，由父组件或全局监听器处理
  window.dispatchEvent(new CustomEvent('open-ai-assistant'))
}
```

**viewDetailedAnalysis()**

```typescript
const viewDetailedAnalysis = () => {
  router.push('/ai/analysis')
}
```

#### 4.3.3 生命周期

```typescript
onMounted(() => {
  refreshInsights()  // 组件挂载时自动加载数据
})
```


## 5. UI/UX 设计

### 5.1 布局设计

#### 5.1.1 整体布局

```
┌─────────────────────────────────────────────────────────┐
│  🪄 AI智能洞察                              [刷新]      │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │  ☀️  您好!我注意到:                               │  │
│  │      • 样品总数较上周增长12.5%                    │  │
│  │      • 有2项紧急待办,共20个任务需要处理           │  │
│  │      早上好                                        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  📊 数据分析                                             │
│  ┌──────────┬──────────┬──────────┬──────────┐         │
│  │ 样品总数 │ 待处理   │ 合格率   │ 异常样品 │         │
│  │ 1,250 ↑ │ 45 ↓    │ 97.8% ↑ │ 8 ↓     │         │
│  │ 较上周   │ 较上周   │ 保持优秀 │ 较上周   │         │
│  │ 增长12.5%│ 下降5.2% │ 水平     │ 下降15.3%│         │
│  └──────────┴──────────┴──────────┴──────────┘         │
│                                                          │
│  ⚠️ 重要提醒                                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ⚠️ 样品审核,建议优先处理          [立即处理]      │  │
│  │ ⚠️ 当前有8个异常样品,建议及时处理  [查看详情]      │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  💡 智能建议                                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ✓ 建议在今天下午3点前完成12个样品审核             │  │
│  │ ✓ 样品量增长较快,建议提前评估人力资源需求         │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  [💬 与AI助手对话]  [查看详细分析]                      │
└─────────────────────────────────────────────────────────┘
```

#### 5.1.2 响应式布局

**桌面端 (>= 768px)**:
- 数据分析区域: 4列网格布局
- 告警和建议: 单列布局
- 快捷操作: 水平排列

**移动端 (< 768px)**:
- 数据分析区域: 2列网格布局
- 告警和建议: 单列布局
- 快捷操作: 垂直堆叠

**CSS Grid 实现**:
```css
.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
```

### 5.2 颜色系统

#### 5.2.1 主题色

- **主色调**: 紫色渐变 `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **背景色**: 白色 `#ffffff`
- **文本色**: 
  - 主文本: `#303133`
  - 次要文本: `#606266`
  - 辅助文本: `#909399`

#### 5.2.2 状态色

- **成功/上升**: 绿色 `#67c23a`
- **警告/中等**: 橙色 `#e6a23c`
- **危险/下降**: 红色 `#f56c6c`
- **信息/稳定**: 蓝色 `#409eff`

#### 5.2.3 告警色

- **高优先级**: 红色背景 `#fef0f0`, 红色边框 `#f56c6c`
- **中优先级**: 橙色背景 `#fdf6ec`, 橙色边框 `#e6a23c`
- **低优先级**: 蓝色背景 `#f0f9ff`, 蓝色边框 `#409eff`

### 5.3 图标系统

使用 Element Plus Icons:
- **AI图标**: `MagicStick`
- **刷新**: `Refresh`
- **问候**: `Sunny`
- **数据分析**: `DataAnalysis`
- **告警**: `Warning`, `WarningFilled`
- **建议**: `Opportunity`, `Check`
- **对话**: `ChatDotRound`
- **趋势**: `CaretTop`, `CaretBottom`
- **信息**: `InfoFilled`

### 5.4 动画效果

#### 5.4.1 加载动画

使用 Element Plus 的 `v-loading` 指令:
```vue
<div v-loading="loading" class="insights-content">
  <!-- 内容 -->
</div>
```

#### 5.4.2 卡片悬停效果

```css
.ai-insight-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.ai-insight-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

#### 5.4.3 按钮交互

```css
.el-button {
  transition: all 0.3s ease;
}

.el-button:hover {
  transform: scale(1.05);
}
```

### 5.5 可访问性设计

#### 5.5.1 语义化HTML

```html
<section aria-label="AI智能洞察">
  <header>
    <h2>AI智能洞察</h2>
  </header>
  <article aria-label="智能问候">...</article>
  <article aria-label="数据分析">...</article>
  <article aria-label="重要提醒">...</article>
  <article aria-label="智能建议">...</article>
</section>
```

#### 5.5.2 键盘导航

- 所有按钮和链接支持 Tab 键导航
- 支持 Enter 和 Space 键触发操作
- 焦点样式清晰可见

#### 5.5.3 屏幕阅读器支持

- 为图标提供 `aria-label` 属性
- 为加载状态提供 `aria-busy` 属性
- 为告警提供 `role="alert"` 属性

## 6. 数据流设计

### 6.1 数据流向图

```
用户操作 (刷新/挂载)
    ↓
AIInsightCard.refreshInsights()
    ↓
aiContextService.collectDashboardContext()
    ↓
并行调用 API
    ├─→ GET /api/v1/dashboard/stats
    └─→ GET /api/v1/dashboard/todos
    ↓
构建 DashboardContext
    ↓
aiContextService.generateInsights()
    ├─→ generateGreeting()
    ├─→ generateDataAnalysis()
    ├─→ generateAlerts()
    └─→ generateRecommendations()
    ↓
返回 AIInsights
    ↓
更新组件状态 (insights.value)
    ↓
Vue 响应式系统触发重渲染
    ↓
UI 更新
```

### 6.2 错误处理流程

```
API 调用失败
    ↓
HTTP Client 拦截器捕获错误
    ↓
记录错误日志
    ↓
返回默认空数据
    ↓
aiContextService 继续处理
    ↓
生成基于默认数据的洞察
    ↓
UI 显示空状态或默认内容
```

### 6.3 状态管理

组件使用 Vue 3 Composition API 的 `ref` 管理本地状态:

```typescript
const loading = ref(false)              // 加载状态
const insights = ref<AIInsights | null>(null)  // 洞察数据
```

**不使用 Pinia** 的原因:
- 数据仅在当前组件使用，无需全局共享
- 避免过度设计，保持组件独立性
- 简化测试和维护

## 7. API 集成方案

### 7.1 API 端点

| 端点 | 方法 | 用途 | 响应时间 |
|------|------|------|----------|
| `/api/v1/dashboard/stats` | GET | 获取统计数据 | < 100ms |
| `/api/v1/dashboard/todos` | GET | 获取待办事项 | < 100ms |

### 7.2 请求配置

```typescript
// 默认配置
{
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer {token}'
  }
}
```

### 7.3 错误处理策略

#### 7.3.1 网络错误

```typescript
if (error.request && !error.response) {
  console.error('Network error:', error)
  return defaultContext
}
```

#### 7.3.2 服务器错误 (5xx)

```typescript
if (error.response?.status >= 500) {
  console.error('Server error:', error)
  return defaultContext
}
```

#### 7.3.3 客户端错误 (4xx)

```typescript
if (error.response?.status >= 400 && error.response?.status < 500) {
  console.error('Client error:', error)
  return defaultContext
}
```

### 7.4 重试机制

**不实现自动重试**的原因:
- Dashboard 数据不是关键业务数据
- 用户可以手动点击刷新按钮
- 避免增加服务器负载

### 7.5 缓存策略

**不实现缓存**的原因:
- Dashboard 数据需要实时性
- 数据量小，请求成本低
- 用户期望看到最新数据

## 8. 智能分析算法

### 8.1 趋势计算算法

```typescript
function calculateTrend(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100
  }
  return ((current - previous) / previous) * 100
}
```

### 8.2 趋势方向判断

```typescript
function getTrendDirection(trendValue: number): 'up' | 'down' | 'stable' {
  if (trendValue > 0) return 'up'
  if (trendValue < 0) return 'down'
  return 'stable'
}
```

### 8.3 告警优先级算法

```typescript
function calculateAlertSeverity(abnormalCount: number): 'high' | 'medium' | 'low' {
  if (abnormalCount > 10) return 'high'
  if (abnormalCount > 5) return 'medium'
  return 'low'
}
```

### 8.4 建议生成规则引擎

```typescript
interface RecommendationRule {
  condition: (context: DashboardContext) => boolean
  message: string
  priority: number
}

const rules: RecommendationRule[] = [
  {
    condition: (ctx) => ctx.todoItems.some(item => item.type === 'audit' && item.urgent),
    message: '建议优先处理紧急审核任务',
    priority: 1
  },
  {
    condition: (ctx) => ctx.metrics.totalSamplesTrend > 15,
    message: '样品量增长较快,建议提前评估资源需求',
    priority: 2
  },
  // ... 更多规则
]

function generateRecommendations(context: DashboardContext): string[] {
  return rules
    .filter(rule => rule.condition(context))
    .sort((a, b) => a.priority - b.priority)
    .map(rule => rule.message)
}
```


## 9. 错误处理和容错设计

### 9.1 错误分类

#### 9.1.1 网络错误
- **场景**: 无法连接到后端服务器
- **处理**: 返回默认空数据，记录错误日志
- **用户体验**: 显示空状态，不阻塞UI

#### 9.1.2 API错误
- **场景**: API返回4xx或5xx错误
- **处理**: 返回默认空数据，记录错误日志
- **用户体验**: 显示空状态，不阻塞UI

#### 9.1.3 数据解析错误
- **场景**: API返回的数据格式不符合预期
- **处理**: 使用默认值填充缺失字段
- **用户体验**: 显示部分数据，不阻塞UI

### 9.2 容错策略

#### 9.2.1 优雅降级

```typescript
async collectDashboardContext(): Promise<DashboardContext> {
  try {
    const statsResponse = await http.get('/dashboard/stats')
    const todosResponse = await http.get('/dashboard/todos')
    
    return {
      metrics: statsResponse.data || defaultMetrics,
      todoItems: todosResponse.data?.items || [],
      recentActivities: [],
      timestamp: Date.now(),
      page: 'dashboard'
    }
  } catch (error) {
    console.error('Failed to collect dashboard context:', error)
    return {
      metrics: defaultMetrics,
      todoItems: [],
      recentActivities: [],
      timestamp: Date.now(),
      page: 'dashboard'
    }
  }
}
```

#### 9.2.2 默认数据结构

```typescript
const defaultMetrics = {
  totalSamples: 0,
  totalSamplesTrend: 0,
  pendingTasks: 0,
  pendingTasksTrend: 0,
  qualityRate: 0,
  qualityRateTrend: 0,
  abnormalSamples: 0,
  abnormalSamplesTrend: 0
}
```

#### 9.2.3 部分失败处理

如果某个API失败，不影响其他API的数据展示：

```typescript
// 方案1: 使用 Promise.allSettled
const [statsResult, todosResult] = await Promise.allSettled([
  http.get('/dashboard/stats'),
  http.get('/dashboard/todos')
])

const metrics = statsResult.status === 'fulfilled' 
  ? statsResult.value.data 
  : defaultMetrics

const todoItems = todosResult.status === 'fulfilled'
  ? todosResult.value.data?.items || []
  : []
```

### 9.3 错误日志

所有错误都记录到控制台，便于调试：

```typescript
console.error('Failed to collect dashboard context:', error)
console.error('API call failed:', {
  url: error.config?.url,
  method: error.config?.method,
  status: error.response?.status,
  message: error.message
})
```

## 10. 性能优化设计

### 10.1 并行请求

使用 `Promise.all` 或 `Promise.allSettled` 并行调用多个API：

```typescript
const [statsResponse, todosResponse] = await Promise.all([
  http.get('/dashboard/stats'),
  http.get('/dashboard/todos')
])
```

**性能提升**:
- 串行: 200ms (100ms + 100ms)
- 并行: 100ms (max(100ms, 100ms))

### 10.2 响应式优化

#### 10.2.1 避免不必要的重渲染

使用 `ref` 而不是 `reactive` 管理状态，减少响应式追踪开销：

```typescript
const insights = ref<AIInsights | null>(null)  // ✅ 推荐
// const insights = reactive<AIInsights>({})   // ❌ 不推荐
```

#### 10.2.2 计算属性缓存

对于复杂的计算，使用 `computed` 缓存结果：

```typescript
const hasAlerts = computed(() => insights.value?.alerts && insights.value.alerts.length > 0)
```

### 10.3 渲染优化

#### 10.3.1 条件渲染

使用 `v-if` 而不是 `v-show` 避免渲染不需要的内容：

```vue
<div v-if="insights?.alerts && insights.alerts.length > 0" class="insight-section">
  <!-- 告警内容 -->
</div>
```

#### 10.3.2 列表渲染优化

为列表项提供唯一的 `key`：

```vue
<div 
  v-for="alert in insights.alerts" 
  :key="alert.id"
  class="alert-item"
>
  <!-- 告警内容 -->
</div>
```

### 10.4 性能指标

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| 数据收集时间 | < 200ms | Performance API |
| 数据分析时间 | < 100ms | Performance API |
| 首次渲染时间 | < 1s | Lighthouse |
| 刷新响应时间 | < 500ms | Performance API |

## 11. 测试策略

### 11.1 单元测试

#### 11.1.1 AI Context Service 测试

```typescript
describe('AIContextService', () => {
  describe('generateGreeting', () => {
    it('should return "早上好" for morning hours', () => {
      // 测试早上时段
    })
    
    it('should include sample trend insight when trend > 10%', () => {
      // 测试样品趋势洞察
    })
  })
  
  describe('generateDataAnalysis', () => {
    it('should calculate trend direction correctly', () => {
      // 测试趋势方向计算
    })
  })
  
  describe('generateAlerts', () => {
    it('should generate high severity alert for abnormal samples > 10', () => {
      // 测试告警生成规则
    })
  })
})
```

#### 11.1.2 组件测试

```typescript
describe('AIInsightCard', () => {
  it('should call refreshInsights on mount', () => {
    // 测试组件挂载时的行为
  })
  
  it('should display loading state while fetching data', () => {
    // 测试加载状态
  })
  
  it('should handle API errors gracefully', () => {
    // 测试错误处理
  })
})
```

### 11.2 属性测试 (Property-Based Testing)

使用 fast-check 库进行属性测试：

```typescript
import fc from 'fast-check'

describe('Trend Calculation Properties', () => {
  it('should always return a number between -100 and 100 for valid inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 10000 }),
        (current, previous) => {
          const trend = calculateTrend(current, previous)
          return trend >= -100 && trend <= 100
        }
      )
    )
  })
})
```

### 11.3 集成测试

```typescript
describe('Dashboard Integration', () => {
  it('should fetch and display real data from API', async () => {
    // 测试完整的数据流
  })
  
  it('should handle API timeout gracefully', async () => {
    // 测试超时处理
  })
})
```

### 11.4 E2E测试

```typescript
describe('AIInsightCard E2E', () => {
  it('should refresh data when clicking refresh button', () => {
    // 测试用户交互
  })
  
  it('should navigate to correct page when clicking alert action', () => {
    // 测试导航功能
  })
})
```

## 12. 部署和配置

### 12.1 环境变量

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8000/api/v1

# .env.production
VITE_API_BASE_URL=https://api.example.com/api/v1
```

### 12.2 构建配置

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
```

### 12.3 部署检查清单

- [ ] 环境变量配置正确
- [ ] API端点可访问
- [ ] 认证令牌机制正常
- [ ] 错误日志记录正常
- [ ] 性能指标达标
- [ ] 浏览器兼容性测试通过
- [ ] 可访问性测试通过


## 13. Correctness Properties

*属性（Property）是系统在所有有效执行中都应该保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### Property Reflection

在生成正确性属性之前，我们需要识别和消除冗余属性：

**识别的冗余模式**:
1. 需求 2.1-2.4 都是关于百分比计算的，可以合并为一个通用的百分比计算属性
2. 需求 2.5-2.7 都是关于趋势方向判断的，可以合并为一个趋势方向属性
3. 需求 3.2-3.4 都是关于仪器统计的，可以合并为一个仪器统计属性
4. 需求 4.2-4.4 都是关于告警级别判断的，可以合并为一个告警级别属性
5. 需求 5.2-5.3 都是关于任务统计的，可以合并为一个任务统计属性
6. 需求 7.2-7.4 都是关于时段判断的，可以合并为一个时段判断属性

**合并后的核心属性**:
- 百分比计算正确性
- 趋势方向判断正确性
- 数据统计正确性（仪器、任务）
- 告警级别判断正确性
- 时段判断正确性
- 问候语生成完整性
- 建议生成规则正确性

### Property 1: 百分比趋势计算正确性

*对于任意* 当前值和上周值，计算的百分比趋势应该等于 `((当前值 - 上周值) / 上周值) * 100`，当上周值为0时，如果当前值也为0则趋势为0，否则趋势为100。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 2: 趋势方向判断正确性

*对于任意* 趋势值，当趋势值大于0时应标记为"up"，当趋势值小于0时应标记为"down"，当趋势值等于0时应标记为"stable"。

**Validates: Requirements 2.5, 2.6, 2.7**

### Property 3: 数据统计正确性

*对于任意* 包含状态字段的数据列表，统计特定状态的数量应该等于列表中该状态项的实际数量。

**Validates: Requirements 3.2, 3.3, 3.4, 5.2, 5.3**

### Property 4: 告警级别判断正确性

*对于任意* 异常样品数量，当数量大于10时应生成"high"级别告警，当数量在6到10之间时应生成"medium"级别告警，当数量在1到5之间时应生成"low"级别告警。

**Validates: Requirements 4.2, 4.3, 4.4**

### Property 5: 告警消息包含数量信息

*对于任意* 异常样品数量，生成的告警消息应该包含该数量的字符串表示。

**Validates: Requirements 4.5**

### Property 6: 告警排序正确性

*对于任意* 告警列表，排序后的列表应该按照严重程度排序，顺序为 high → medium → low。

**Validates: Requirements 4.7**

### Property 7: 时段问候判断正确性

*对于任意* 小时数（0-23），当小时数在0到11之间时应返回"早上好"，当小时数在12到17之间时应返回"下午好"，当小时数在18到23之间时应返回"晚上好"。

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 8: 问候语包含样品趋势洞察

*对于任意* 样品总数趋势，当趋势绝对值大于10时，生成的问候语应该包含样品趋势相关的文本。

**Validates: Requirements 7.5**

### Property 9: 问候语包含紧急任务提醒

*对于任意* 待办任务列表，当列表中存在urgent为true的任务时，生成的问候语应该包含紧急任务提醒文本。

**Validates: Requirements 7.6**

### Property 10: 问候语包含质量改进肯定

*对于任意* 异常样品趋势，当趋势小于-10时，生成的问候语应该包含质量改进肯定文本。

**Validates: Requirements 7.7**

### Property 11: 问候语包含质量表扬

*对于任意* 合格率，当合格率大于等于98时，生成的问候语应该包含质量表扬文本。

**Validates: Requirements 7.8**

### Property 12: 建议生成规则 - 紧急审核任务

*对于任意* 待办任务列表，当列表中存在类型为"audit"且urgent为true的任务时，生成的建议列表应该包含时间管理建议。

**Validates: Requirements 6.1**

### Property 13: 建议生成规则 - 紧急录入任务

*对于任意* 待办任务列表，当列表中存在类型为"entry"且urgent为true且count大于5的任务时，生成的建议列表应该包含批量操作建议。

**Validates: Requirements 6.2**

### Property 14: 建议生成规则 - 样品增长趋势

*对于任意* 样品总数趋势，当趋势大于15时，生成的建议列表应该包含资源规划建议。

**Validates: Requirements 6.3**

### Property 15: 建议生成规则 - 合格率下降

*对于任意* 合格率，当合格率小于95时，生成的建议列表应该包含质量控制建议。

**Validates: Requirements 6.4**

### Property 16: 建议生成规则 - 异常样品下降

*对于任意* 异常样品趋势，当趋势小于-10时，生成的建议列表应该包含质量改进肯定建议。

**Validates: Requirements 6.5**

### Property 17: 建议生成规则 - 高合格率

*对于任意* 合格率，当合格率大于等于98时，生成的建议列表应该包含质量保持鼓励建议。

**Validates: Requirements 6.6**

### Property 18: 仪器告警生成规则

*对于任意* 离线仪器数量，当数量大于0时，生成的告警列表应该包含一个severity为"medium"的告警。

**Validates: Requirements 3.5**

### Property 19: 维护告警生成规则

*对于任意* 需要维护的仪器数量，当数量大于2时，生成的告警列表应该包含一个severity为"low"的告警。

**Validates: Requirements 3.6**

### Property 20: 紧急审核任务告警

*对于任意* 紧急审核任务数量，当数量大于0时，生成的告警列表应该包含一个severity为"high"的告警。

**Validates: Requirements 5.4**

### Property 21: 紧急录入任务告警

*对于任意* 紧急录入任务数量，当数量大于5时，生成的告警列表应该包含一个severity为"medium"的告警。

**Validates: Requirements 5.5**

### Property 22: 告警消息包含任务信息

*对于任意* 任务类型和数量，生成的告警消息应该包含任务类型和数量的字符串表示。

**Validates: Requirements 5.6**

### Property 23: 数据分析项生成完整性

*对于任意* 仪表盘上下文数据，生成的数据分析项列表应该包含4个项目，分别对应样品总数、待处理任务、合格率和异常样品。

**Validates: Requirements 2.8**

### Property 24: 洞察文本非空性

*对于任意* 数据分析项，生成的洞察文本应该非空且长度大于0。

**Validates: Requirements 2.8**

## 14. 实现计划

### 14.1 Phase 1: 核心功能实现 (Week 1)

**任务**:
1. 实现 AI Context Service 的数据收集功能
2. 实现数据分析逻辑
3. 实现告警生成逻辑
4. 实现建议生成逻辑
5. 实现问候语生成逻辑

**验收标准**:
- 所有核心方法实现完成
- 单元测试覆盖率 > 80%
- 属性测试通过

### 14.2 Phase 2: UI集成 (Week 2)

**任务**:
1. 更新 AIInsightCard 组件
2. 实现加载状态管理
3. 实现错误处理
4. 实现用户交互功能
5. 优化UI样式

**验收标准**:
- 组件功能完整
- UI符合设计规范
- 组件测试通过

### 14.3 Phase 3: 性能优化和测试 (Week 3)

**任务**:
1. 实现并行请求优化
2. 实现响应式优化
3. 完善错误处理
4. 编写集成测试
5. 编写E2E测试

**验收标准**:
- 性能指标达标
- 所有测试通过
- 代码审查通过

### 14.4 Phase 4: 部署和文档 (Week 4)

**任务**:
1. 配置生产环境
2. 编写用户文档
3. 编写开发文档
4. 进行UAT测试
5. 正式发布

**验收标准**:
- 生产环境运行正常
- 文档完整
- UAT测试通过

## 15. 风险和缓解措施

### 15.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| API性能不达标 | 高 | 中 | 实现缓存机制，优化数据库查询 |
| 数据格式变更 | 中 | 低 | 使用TypeScript类型检查，编写数据验证逻辑 |
| 浏览器兼容性问题 | 中 | 低 | 使用Polyfill，进行跨浏览器测试 |

### 15.2 业务风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 用户需求变更 | 中 | 中 | 采用敏捷开发，快速迭代 |
| 数据准确性问题 | 高 | 低 | 实现数据验证，编写完善的测试 |
| 用户体验不佳 | 中 | 低 | 进行用户测试，收集反馈 |

## 16. 附录

### 16.1 术语表

- **AI Context Service**: AI上下文服务，负责收集数据并生成智能分析
- **Dashboard Context**: 仪表盘上下文数据，包含统计指标和待办事项
- **AI Insights**: AI洞察数据，包含问候、分析、告警和建议
- **Property-Based Testing**: 属性测试，通过生成随机输入验证通用属性
- **Graceful Degradation**: 优雅降级，在部分功能失败时保持系统可用

### 16.2 参考资料

- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Element Plus Documentation](https://element-plus.org/)
- [Axios Documentation](https://axios-http.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Property-Based Testing with fast-check](https://github.com/dubzzz/fast-check)

### 16.3 变更历史

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.0 | 2024-01-XX | Kiro | 初始版本 |

