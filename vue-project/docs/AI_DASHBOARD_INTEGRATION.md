# AI助手与主页联动方案

## 🎯 联动目标

让AI助手能够智能感知主页数据,提供上下文相关的分析和建议,实现真正的"智能化"体验。

---

## 📊 主页现有功能分析

### 当前主页包含的数据模块

1. **关键指标** (4个)
   - 样品总数: 1,234 (↑12.5%)
   - 待处理任务: 56 (↓8.3%)
   - 合格率: 98.5% (↑2.1%)
   - 异常样品: 8 (↓15.2%)

2. **快捷入口** (6个)
   - 样品登记、样品管理、任务列表
   - 结果录入、报告生成、统计分析

3. **待办事项** (4个)
   - 样品审核、结果录入、报告签发、留样到期提醒

4. **最近操作记录** (5条)
   - 时间线展示最近的操作历史

---

## 🔗 联动方案设计

### 方案一: 主页AI洞察卡片 (推荐) ⭐⭐⭐⭐⭐

在主页添加一个"AI智能洞察"卡片,实时分析主页数据并提供建议。

#### 界面设计
```
┌─────────────────────────────────────────────────────┐
│  🤖 AI智能洞察                    [展开详情] [×]    │
├─────────────────────────────────────────────────────┤
│                                                       │
│  📊 今日数据分析                                     │
│  ─────────────────────────────────────────────────  │
│  • 样品总数较上周增长12.5%,处于正常增长趋势         │
│  • 待处理任务下降8.3%,工作效率有所提升 ✅           │
│  • 异常样品数量下降15.2%,质量控制效果显著 🎉        │
│                                                       │
│  ⚠️ 需要关注                                         │
│  ─────────────────────────────────────────────────  │
│  • 5个样品等待审核,建议优先处理                     │
│  • 12个检测结果待录入,可能影响报告生成时效          │
│                                                       │
│  💡 智能建议                                         │
│  ─────────────────────────────────────────────────  │
│  • 建议在下午3点前完成样品审核任务                  │
│  • 可以使用批量录入功能提高结果录入效率             │
│                                                       │
│  [与AI对话] [查看详细分析]                          │
│                                                       │
└─────────────────────────────────────────────────────┘
```

#### 实现方式
```vue
<!-- Dashboard.vue 中添加 -->
<el-row :gutter="20">
  <el-col :span="24">
    <AIInsightCard 
      :metrics="metrics"
      :todoItems="todoItems"
      :recentActivities="recentActivities"
      @open-chat="openAIChat"
    />
  </el-col>
</el-row>
```

---

### 方案二: 指标卡片AI分析按钮 ⭐⭐⭐⭐

在每个关键指标卡片上添加"AI分析"按钮,点击后打开AI助手并自动分析该指标。

#### 界面设计
```
┌─────────────────────────────┐
│  📦                          │
│  样品总数                    │
│  1,234                       │
│  ↑ 12.5% 较上周              │
│  ─────────────────────────  │
│  [🤖 AI分析]                │ ← 新增按钮
└─────────────────────────────┘
```

#### 点击后效果
```
AI助手自动打开并显示:

AI: 我已分析了样品总数数据:

📊 数据概览
• 当前样品总数: 1,234
• 较上周增长: 12.5% (↑ 137个样品)
• 增长趋势: 稳定上升

📈 趋势分析
[折线图: 最近7天样品数量变化]

💡 智能建议
• 样品量持续增长,建议评估人力资源配置
• 预计下周样品量将达到1,350左右
• 建议提前准备检测试剂和耗材
```

---

### 方案三: 待办事项智能提醒 ⭐⭐⭐⭐

AI助手主动分析待办事项,提供优先级建议和处理策略。

#### 界面设计
```
待办事项卡片右上角添加:
┌─────────────────────────────┐
│  📋 待办事项        [🤖 智能排序] │ ← 新增按钮
├─────────────────────────────┤
│  [待办列表]                  │
└─────────────────────────────┘
```

#### 点击后效果
```
AI: 我已分析您的待办事项,建议按以下顺序处理:

🔴 高优先级 (今天必须完成)
1. 样品审核 (5个) - 影响后续流程
   建议: 先审核紧急样品,使用快速审核模式

2. 结果录入 (12个) - 影响报告生成
   建议: 使用批量录入功能,预计耗时30分钟

🟡 中优先级 (明天完成)
3. 报告签发 (3份) - 客户等待中
   建议: 下午完成,避免延期

🟢 低优先级 (本周完成)
4. 留样到期提醒 (8个) - 还有3天到期
   建议: 周五统一处理

⏱️ 预计总耗时: 2小时15分钟
```

---

### 方案四: 快捷入口智能推荐 ⭐⭐⭐

根据用户习惯和当前数据,AI推荐最应该使用的功能。

#### 界面设计
```
快捷入口卡片顶部添加:
┌─────────────────────────────┐
│  🎯 快捷入口                 │
│  💡 AI推荐: 结果录入 (12个待录入) │ ← 新增推荐
├─────────────────────────────┤
│  [快捷入口网格]              │
└─────────────────────────────┘
```

---

### 方案五: 悬浮助手上下文感知 ⭐⭐⭐⭐⭐

悬浮AI助手自动感知主页数据,提供智能问候和建议。

#### 打开AI助手时自动显示
```
AI: 您好!我注意到:

📊 今日概况
• 样品总数增长12.5%,工作量增加
• 有5个样品等待审核,建议优先处理
• 异常样品下降15.2%,质量控制效果好 👍

💬 您可以问我:
• "分析今天的工作重点"
• "如何提高审核效率"
• "预测明天的样品量"

或点击下方快捷操作 👇
[今日分析] [工作建议] [趋势预测]
```

---

## 🔧 技术实现方案

### 1. 创建AI上下文服务

```typescript
// src/services/ai-context.ts

/**
 * AI上下文服务
 * 收集主页数据,为AI提供分析上下文
 */
export class AIContextService {
  /**
   * 收集主页数据
   */
  static collectDashboardContext() {
    return {
      metrics: {
        totalSamples: 1234,
        totalSamplesTrend: 12.5,
        pendingTasks: 56,
        pendingTasksTrend: -8.3,
        qualityRate: 98.5,
        qualityRateTrend: 2.1,
        abnormalSamples: 8,
        abnormalSamplesTrend: -15.2
      },
      todoItems: [
        { type: 'audit', count: 5, urgent: true },
        { type: 'entry', count: 12, urgent: true },
        { type: 'report', count: 3, urgent: false },
        { type: 'retention', count: 8, urgent: false }
      ],
      recentActivities: [
        // 最近操作记录
      ],
      timestamp: Date.now(),
      page: 'dashboard'
    }
  }

  /**
   * 生成AI问候语
   */
  static generateGreeting(context: any): string {
    const { metrics, todoItems } = context
    
    let greeting = '您好!我注意到:\n\n'
    
    // 分析指标趋势
    if (metrics.totalSamplesTrend > 10) {
      greeting += `📊 样品总数增长${metrics.totalSamplesTrend}%,工作量增加\n`
    }
    
    // 分析待办事项
    const urgentTodos = todoItems.filter(item => item.urgent)
    if (urgentTodos.length > 0) {
      greeting += `⚠️ 有${urgentTodos.length}项紧急待办,建议优先处理\n`
    }
    
    // 分析质量趋势
    if (metrics.abnormalSamplesTrend < -10) {
      greeting += `✅ 异常样品下降${Math.abs(metrics.abnormalSamplesTrend)}%,质量控制效果好\n`
    }
    
    return greeting
  }

  /**
   * 生成智能建议
   */
  static generateRecommendations(context: any): string[] {
    const recommendations: string[] = []
    const { metrics, todoItems } = context
    
    // 基于待办事项的建议
    todoItems.forEach(item => {
      if (item.urgent && item.count > 0) {
        switch (item.type) {
          case 'audit':
            recommendations.push(`建议优先完成${item.count}个样品审核,避免影响后续流程`)
            break
          case 'entry':
            recommendations.push(`有${item.count}个结果待录入,可使用批量录入功能提高效率`)
            break
        }
      }
    })
    
    // 基于指标趋势的建议
    if (metrics.totalSamplesTrend > 15) {
      recommendations.push('样品量增长较快,建议评估人力资源配置')
    }
    
    return recommendations
  }
}
```

---

### 2. 修改Dashboard组件

```vue
<!-- Dashboard.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AIContextService } from '@/services/ai-context'
import AIInsightCard from '@/components/ai/AIInsightCard.vue'

// ... 现有代码 ...

// AI洞察数据
const aiInsights = ref({
  greeting: '',
  recommendations: [],
  alerts: []
})

// 生成AI洞察
const generateAIInsights = () => {
  const context = AIContextService.collectDashboardContext()
  
  aiInsights.value = {
    greeting: AIContextService.generateGreeting(context),
    recommendations: AIContextService.generateRecommendations(context),
    alerts: [] // 可以添加更多告警
  }
}

// 打开AI对话
const openAIChat = (initialMessage?: string) => {
  // 触发全局AI助手打开
  // 可以通过事件总线或Pinia store实现
  window.dispatchEvent(new CustomEvent('open-ai-chat', {
    detail: {
      message: initialMessage,
      context: AIContextService.collectDashboardContext()
    }
  }))
}

// 分析指标
const analyzeMetric = (metricName: string, metricData: any) => {
  const message = `分析${metricName}的数据趋势和建议`
  openAIChat(message)
}

onMounted(() => {
  generateAIInsights()
})
</script>

<template>
  <div class="dashboard">
    <!-- 现有内容 ... -->
    
    <!-- 新增: AI智能洞察卡片 -->
    <el-row :gutter="20" class="ai-insight-section">
      <el-col :span="24">
        <AIInsightCard 
          :insights="aiInsights"
          :metrics="metrics"
          :todoItems="todoItems"
          @open-chat="openAIChat"
          @analyze="analyzeMetric"
        />
      </el-col>
    </el-row>
    
    <!-- 修改: 指标卡片添加AI分析按钮 -->
    <div class="metrics-section">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6" v-for="metric in metrics" :key="metric.title">
          <el-card shadow="hover" class="metric-card">
            <!-- 现有内容 ... -->
            
            <!-- 新增: AI分析按钮 -->
            <div class="metric-ai-action">
              <el-button 
                size="small" 
                type="primary" 
                text
                @click="analyzeMetric(metric.title, metric)"
              >
                <el-icon><Robot /></el-icon>
                AI分析
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
    
    <!-- 现有内容 ... -->
  </div>
</template>
```

---

### 3. 创建AI洞察卡片组件

```vue
<!-- src/components/ai/AIInsightCard.vue -->
<template>
  <el-card shadow="hover" class="ai-insight-card">
    <template #header>
      <div class="card-header">
        <span class="card-title">
          <el-icon class="ai-icon"><Robot /></el-icon>
          AI智能洞察
        </span>
        <div class="header-actions">
          <el-button size="small" type="primary" @click="openFullChat">
            展开详情
          </el-button>
          <el-button size="small" text @click="refresh">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </div>
    </template>
    
    <div class="insight-content">
      <!-- 今日数据分析 -->
      <div class="insight-section">
        <div class="section-title">
          <el-icon><DataAnalysis /></el-icon>
          今日数据分析
        </div>
        <div class="section-content">
          <div v-for="(item, index) in dataAnalysis" :key="index" class="insight-item">
            <el-icon :color="item.color">
              <component :is="item.icon" />
            </el-icon>
            <span>{{ item.text }}</span>
          </div>
        </div>
      </div>
      
      <!-- 需要关注 -->
      <div class="insight-section" v-if="alerts.length > 0">
        <div class="section-title warning">
          <el-icon><Warning /></el-icon>
          需要关注
        </div>
        <div class="section-content">
          <div v-for="(alert, index) in alerts" :key="index" class="insight-item alert">
            <el-icon color="#E6A23C"><Warning /></el-icon>
            <span>{{ alert }}</span>
          </div>
        </div>
      </div>
      
      <!-- 智能建议 -->
      <div class="insight-section" v-if="recommendations.length > 0">
        <div class="section-title">
          <el-icon><Lightbulb /></el-icon>
          智能建议
        </div>
        <div class="section-content">
          <div v-for="(rec, index) in recommendations" :key="index" class="insight-item">
            <el-icon color="#67C23A"><Check /></el-icon>
            <span>{{ rec }}</span>
          </div>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="insight-actions">
        <el-button type="primary" @click="openChat">
          <el-icon><ChatDotRound /></el-icon>
          与AI对话
        </el-button>
        <el-button @click="viewDetailedAnalysis">
          查看详细分析
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Robot, Refresh, DataAnalysis, Warning, Lightbulb, Check, ChatDotRound } from '@element-plus/icons-vue'

interface Props {
  insights: {
    greeting: string
    recommendations: string[]
    alerts: string[]
  }
  metrics: any[]
  todoItems: any[]
}

const props = defineProps<Props>()
const emit = defineEmits(['open-chat', 'analyze', 'refresh'])

// 数据分析项
const dataAnalysis = computed(() => {
  const items = []
  
  props.metrics.forEach(metric => {
    let icon = 'TrendCharts'
    let color = '#409EFF'
    let text = ''
    
    if (metric.trend > 0) {
      icon = 'CaretTop'
      color = metric.title.includes('异常') ? '#F56C6C' : '#67C23A'
      text = `${metric.title}较上周增长${metric.trend}%`
    } else if (metric.trend < 0) {
      icon = 'CaretBottom'
      color = metric.title.includes('异常') ? '#67C23A' : '#F56C6C'
      text = `${metric.title}较上周下降${Math.abs(metric.trend)}%`
    } else {
      text = `${metric.title}保持稳定`
    }
    
    items.push({ icon, color, text })
  })
  
  return items
})

// 告警项
const alerts = computed(() => {
  const alertList = []
  
  props.todoItems.forEach(item => {
    if (item.urgent) {
      alertList.push(`${item.description},建议优先处理`)
    }
  })
  
  return alertList
})

// 建议项
const recommendations = computed(() => {
  return props.insights.recommendations
})

// 打开对话
const openChat = () => {
  emit('open-chat', '分析今天的工作重点')
}

// 打开完整对话
const openFullChat = () => {
  emit('open-chat')
}

// 查看详细分析
const viewDetailedAnalysis = () => {
  emit('open-chat', '生成今日完整数据分析报告')
}

// 刷新
const refresh = () => {
  emit('refresh')
}
</script>

<style scoped>
.ai-insight-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border: 2px solid #667eea;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.ai-icon {
  color: #667eea;
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.insight-content {
  padding: 10px 0;
}

.insight-section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #E4E7ED;
}

.section-title.warning {
  color: #E6A23C;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.insight-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background-color: white;
  border-radius: 6px;
  font-size: 14px;
  color: #606266;
}

.insight-item.alert {
  background-color: #FEF0F0;
  border-left: 3px solid #E6A23C;
}

.insight-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #E4E7ED;
}

.insight-actions .el-button {
  flex: 1;
}
</style>
```

---

## 📱 用户体验流程

### 场景1: 用户打开主页
```
1. 主页加载完成
   ↓
2. AI自动分析主页数据
   ↓
3. 显示AI洞察卡片
   ↓
4. 用户看到智能建议
   ↓
5. 点击"与AI对话"
   ↓
6. AI助手打开,显示上下文相关的问候
```

### 场景2: 用户点击指标卡片的"AI分析"
```
1. 点击"样品总数"的AI分析按钮
   ↓
2. AI助手自动打开
   ↓
3. 自动发送"分析样品总数的数据趋势和建议"
   ↓
4. AI返回详细分析结果
   ↓
5. 显示图表、趋势、建议
```

### 场景3: 用户点击"智能排序"待办事项
```
1. 点击待办事项的"智能排序"
   ↓
2. AI分析所有待办事项
   ↓
3. 按优先级重新排序
   ↓
4. 显示处理建议和预计耗时
```

---

## 🎯 实施优先级

### P0 (必须实现)
1. ✅ AI上下文服务 - 收集主页数据
2. ✅ AI洞察卡片 - 显示智能分析
3. ✅ 悬浮助手上下文感知 - 智能问候

### P1 (重要)
4. ✅ 指标卡片AI分析按钮
5. ✅ 待办事项智能排序

### P2 (可选)
6. ⏳ 快捷入口智能推荐
7. ⏳ 操作记录智能总结

---

## 💡 未来扩展

1. **实时监控**: AI持续监控主页数据变化,主动提醒
2. **个性化**: 根据用户习惯定制AI建议
3. **预测分析**: 预测明天/下周的工作量和资源需求
4. **语音交互**: 语音播报AI洞察
5. **移动推送**: 重要建议推送到手机

---

**文档版本**: 1.0  
**创建日期**: 2025-01-31  
**设计参考**: LabWare AI Dashboard, Thermo Fisher智能仪表板
