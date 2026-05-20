# 智能体辅助分析 - 设计文档

## 🎯 设计概述

本文档描述智能体辅助分析功能的详细设计方案,包括组件架构、交互流程、数据结构和实现细节。

**设计理念**:
- 参考ChatGPT的对话式交互体验
- 借鉴LabWare AI Assistant的功能布局
- 采用渐进式增强策略(先Mock后真实AI)

## 🏗️ 系统架构

### 整体架构
```
┌─────────────────────────────────────────────────────┐
│                   前端展示层                         │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ 悬浮助手按钮 │  │ 智能分析页面 │  │ 嵌入组件 │ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
│           │                │                │        │
│           └────────────────┴────────────────┘        │
│                          │                            │
├──────────────────────────┼────────────────────────────┤
│                   组件层  │                            │
├──────────────────────────┼────────────────────────────┤
│                          │                            │
│  ┌───────────────────────▼──────────────────────┐   │
│  │         AIAssistant 主组件                    │   │
│  ├───────────────────────────────────────────────┤   │
│  │  - ChatWindow (对话窗口)                     │   │
│  │  - MessageList (消息列表)                    │   │
│  │  - InputBox (输入框)                         │   │
│  │  - QuickActions (快捷操作)                   │   │
│  │  - AnalysisResult (结果展示)                 │   │
│  └───────────────────────────────────────────────┘   │
│                          │                            │
├──────────────────────────┼────────────────────────────┤
│                   服务层  │                            │
├──────────────────────────┼────────────────────────────┤
│                          │                            │
│  ┌───────────────────────▼──────────────────────┐   │
│  │         AI Service                            │   │
│  ├───────────────────────────────────────────────┤   │
│  │  - sendMessage() - 发送消息                  │   │
│  │  - analyzeData() - 数据分析                  │   │
│  │  - getRecommendation() - 获取推荐            │   │
│  │  - generateReport() - 生成报告               │   │
│  └───────────────────────────────────────────────┘   │
│                          │                            │
├──────────────────────────┼────────────────────────────┤
│                   数据层  │                            │
├──────────────────────────┼────────────────────────────┤
│                          │                            │
│  ┌───────────────────────▼──────────────────────┐   │
│  │      Mock Adapter (当前阶段)                 │   │
│  │      ↓                                        │   │
│  │      AI Backend API (预留接口)               │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
└─────────────────────────────────────────────────────┘
```

## 📦 组件设计

### 1. AIAssistantFloat.vue (悬浮助手)
**功能**: 全局悬浮的AI助手入口

**Props**:
```typescript
interface Props {
  position?: 'bottom-right' | 'bottom-left'  // 位置
  defaultOpen?: boolean                       // 默认是否展开
}
```

**State**:
```typescript
interface State {
  isOpen: boolean           // 是否展开
  unreadCount: number       // 未读消息数
  isDragging: boolean       // 是否正在拖拽
}
```

**UI结构**:
```vue
<div class="ai-assistant-float">
  <!-- 悬浮按钮 -->
  <el-badge :value="unreadCount" :hidden="unreadCount === 0">
    <el-button 
      circle 
      size="large" 
      type="primary"
      @click="toggleChat"
    >
      <el-icon><ChatDotRound /></el-icon>
    </el-button>
  </el-badge>
  
  <!-- 对话窗口 -->
  <transition name="slide-up">
    <div v-if="isOpen" class="chat-window">
      <AIAssistant @close="isOpen = false" />
    </div>
  </transition>
</div>
```

### 2. AIAssistant.vue (主组件)
**功能**: AI助手的核心交互组件

**Props**:
```typescript
interface Props {
  mode?: 'float' | 'page' | 'embed'  // 显示模式
  height?: string                      // 高度
  context?: any                        // 上下文数据
}
```

**State**:
```typescript
interface State {
  messages: Message[]       // 消息列表
  inputText: string         // 输入文本
  isTyping: boolean         // AI是否正在输入
  currentAnalysis: any      // 当前分析结果
}

interface Message {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  data?: any                // 附加数据(图表、表格等)
}
```

**UI结构**:
```vue
<div class="ai-assistant">
  <!-- 头部 -->
  <div class="ai-header">
    <div class="ai-title">
      <el-icon><Robot /></el-icon>
      <span>AI智能助手</span>
    </div>
    <el-button text @click="$emit('close')">
      <el-icon><Close /></el-icon>
    </el-button>
  </div>
  
  <!-- 消息列表 -->
  <div class="message-list" ref="messageListRef">
    <MessageItem 
      v-for="msg in messages" 
      :key="msg.id"
      :message="msg"
    />
    
    <!-- AI输入中提示 -->
    <div v-if="isTyping" class="typing-indicator">
      <span></span><span></span><span></span>
    </div>
  </div>
  
  <!-- 快捷操作 -->
  <QuickActions @select="handleQuickAction" />
  
  <!-- 输入框 -->
  <div class="input-area">
    <el-input
      v-model="inputText"
      type="textarea"
      :rows="2"
      placeholder="输入您的问题..."
      @keydown.enter.ctrl="sendMessage"
    />
    <el-button 
      type="primary" 
      @click="sendMessage"
      :loading="isTyping"
    >
      发送
    </el-button>
  </div>
</div>
```

### 3. QuickActions.vue (快捷操作)
**功能**: 提供常用分析的快捷入口

**数据结构**:
```typescript
interface QuickAction {
  id: string
  label: string
  icon: string
  prompt: string        // 自动填充的问题
  category: string      // 分类
}

const quickActions: QuickAction[] = [
  {
    id: 'sample-analysis',
    label: '样品数据分析',
    icon: 'DataAnalysis',
    prompt: '分析最近一周的样品数据趋势',
    category: 'analysis'
  },
  {
    id: 'anomaly-detection',
    label: '异常检测',
    icon: 'Warning',
    prompt: '检测最近的异常数据和潜在问题',
    category: 'detection'
  },
  {
    id: 'trend-forecast',
    label: '趋势预测',
    icon: 'TrendCharts',
    prompt: '预测下周的样品量和资源需求',
    category: 'forecast'
  },
  {
    id: 'report-generate',
    label: '报告生成',
    icon: 'Document',
    prompt: '生成本月的质量分析报告',
    category: 'report'
  },
  {
    id: 'method-recommend',
    label: '方法推荐',
    icon: 'MagicStick',
    prompt: '推荐适合当前样品的检测方法',
    category: 'recommend'
  },
  {
    id: 'resource-optimize',
    label: '资源优化',
    icon: 'Setting',
    prompt: '分析当前资源使用情况并提供优化建议',
    category: 'optimize'
  }
]
```

### 4. AnalysisResult.vue (分析结果展示)
**功能**: 展示AI分析结果,支持多种数据类型

**Props**:
```typescript
interface Props {
  result: AnalysisResult
}

interface AnalysisResult {
  type: 'text' | 'chart' | 'table' | 'mixed'
  title: string
  summary: string
  data: any
  recommendations?: string[]
  actions?: Action[]
}
```

## 🔄 交互流程

### 用户提问流程
```
用户输入问题
    ↓
前端验证(非空、长度)
    ↓
显示用户消息
    ↓
显示"AI思考中"动画
    ↓
调用AI Service
    ↓
Mock延迟(1-2秒)
    ↓
返回Mock响应
    ↓
解析响应数据
    ↓
渲染AI回复
    ↓
滚动到最新消息
```

### 快捷操作流程
```
点击快捷按钮
    ↓
自动填充问题到输入框
    ↓
自动发送(或等待用户确认)
    ↓
执行标准提问流程
```

## 💾 数据结构

### Mock响应数据结构
```typescript
interface MockResponse {
  success: boolean
  data: {
    message: string           // AI回复文本
    type: 'simple' | 'analysis' | 'recommendation'
    analysis?: {
      charts?: ChartData[]    // 图表数据
      tables?: TableData[]    // 表格数据
      metrics?: Metric[]      // 指标数据
    }
    recommendations?: string[]
    actions?: Action[]
  }
  timestamp: number
}

interface ChartData {
  type: 'line' | 'bar' | 'pie'
  title: string
  data: any
  options?: any
}

interface TableData {
  title: string
  columns: Column[]
  data: any[]
}

interface Metric {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'stable'
  change?: string
}

interface Action {
  label: string
  type: 'primary' | 'success' | 'warning'
  handler: string
}
```

## 🎨 样式设计

### 主题色彩
```css
/* AI助手专用色彩 */
--ai-primary: #667eea;        /* 主色 - 紫色 */
--ai-secondary: #764ba2;      /* 辅助色 */
--ai-success: #48bb78;        /* 成功 */
--ai-warning: #ed8936;        /* 警告 */
--ai-info: #4299e1;           /* 信息 */

/* 消息气泡 */
--ai-bubble-user: #667eea;    /* 用户消息 */
--ai-bubble-ai: #f7fafc;      /* AI消息 */
--ai-bubble-system: #edf2f7;  /* 系统消息 */
```

### 动画效果
```css
/* 消息进入动画 */
@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* AI思考动画 */
@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

/* 悬浮按钮脉冲 */
@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(102, 126, 234, 0);
  }
}
```

## 🔌 API接口设计

### AI Service API
```typescript
class AIService {
  /**
   * 发送消息
   */
  async sendMessage(message: string, context?: any): Promise<AIResponse> {
    // 当前: 返回Mock数据
    // 未来: 调用真实AI API
    return mockAIResponse(message, context)
  }
  
  /**
   * 数据分析
   */
  async analyzeData(dataType: string, params: any): Promise<AnalysisResult> {
    // Mock实现
    return mockAnalysis(dataType, params)
  }
  
  /**
   * 获取推荐
   */
  async getRecommendation(type: string, context: any): Promise<Recommendation[]> {
    // Mock实现
    return mockRecommendations(type, context)
  }
  
  /**
   * 生成报告
   */
  async generateReport(template: string, data: any): Promise<Report> {
    // Mock实现
    return mockReport(template, data)
  }
}
```

### Mock数据生成器
```typescript
/**
 * Mock AI响应生成器
 */
function mockAIResponse(message: string, context?: any): AIResponse {
  // 关键词匹配
  const keywords = {
    '样品': () => generateSampleAnalysis(),
    '异常': () => generateAnomalyDetection(),
    '趋势': () => generateTrendForecast(),
    '报告': () => generateReportSummary(),
    '推荐': () => generateRecommendation(),
    '优化': () => generateOptimization()
  }
  
  // 匹配关键词
  for (const [keyword, generator] of Object.entries(keywords)) {
    if (message.includes(keyword)) {
      return generator()
    }
  }
  
  // 默认响应
  return {
    success: true,
    data: {
      message: '我理解您的问题了。作为AI助手,我可以帮您分析数据、检测异常、预测趋势等。请告诉我您具体需要什么帮助?',
      type: 'simple'
    },
    timestamp: Date.now()
  }
}

/**
 * 生成样品分析Mock数据
 */
function generateSampleAnalysis(): AIResponse {
  return {
    success: true,
    data: {
      message: '我已完成最近一周的样品数据分析,以下是关键发现:',
      type: 'analysis',
      analysis: {
        metrics: [
          { label: '总样品数', value: 156, trend: 'up', change: '+12%' },
          { label: '完成率', value: '87%', trend: 'stable', change: '0%' },
          { label: '平均周转时间', value: '2.3天', trend: 'down', change: '-0.2天' },
          { label: '异常样品', value: 3, trend: 'down', change: '-2' }
        ],
        charts: [
          {
            type: 'line',
            title: '每日样品趋势',
            data: {
              labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
              datasets: [{
                label: '样品数量',
                data: [18, 22, 25, 20, 28, 24, 19]
              }]
            }
          }
        ]
      },
      recommendations: [
        '周四和周五样品量较大,建议提前安排人力资源',
        '平均周转时间有所改善,继续保持当前工作流程',
        '异常样品数量下降,质量控制措施有效'
      ]
    },
    timestamp: Date.now()
  }
}
```

## 📱 响应式设计

### 桌面端
- 悬浮窗口: 400px × 600px
- 页面模式: 占据主内容区
- 支持拖拽调整大小

### 移动端
- 全屏显示
- 底部输入框固定
- 支持手势操作

## 🔐 安全考虑

1. **输入验证**: 限制输入长度,过滤特殊字符
2. **XSS防护**: 对AI响应内容进行转义
3. **权限控制**: 根据用户角色限制功能访问
4. **数据脱敏**: 敏感数据不发送到AI后端

## 📊 性能优化

1. **虚拟滚动**: 消息列表使用虚拟滚动
2. **懒加载**: 图表组件按需加载
3. **防抖**: 输入框防抖处理
4. **缓存**: 缓存常见问题的响应

## 🧪 测试策略

1. **单元测试**: 测试各组件功能
2. **集成测试**: 测试组件间交互
3. **Mock测试**: 验证Mock数据生成
4. **UI测试**: 测试界面响应和动画

---

**文档版本**: 1.0  
**创建日期**: 2025-01-31  
**设计参考**: ChatGPT UI, LabWare AI Assistant
