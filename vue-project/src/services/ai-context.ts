/**
 * AI上下文服务
 * 收集页面数据,为AI提供分析上下文
 */

import type { DashboardContext, AIInsights, Alert, TodoItem } from '@/types/ai'
import http from './http'

class AIContextService {
  /**
   * 收集Dashboard页面上下文
   * 从真实的 Dashboard API 获取数据
   */
  async collectDashboardContext(): Promise<DashboardContext> {
    try {
      // 从真实的 Dashboard API 获取统计数据
      const statsResponse = await http.get('/dashboard/stats')
      
      // 从真实的待办事项 API 获取数据
      const todosResponse = await http.get('/dashboard/todos')
      
      // 构建真实的指标数据
      const metrics = {
        totalSamples: statsResponse.data?.totalSamples || 0,
        totalSamplesTrend: statsResponse.data?.totalSamplesTrend || 0,
        pendingTasks: statsResponse.data?.pendingTasks || 0,
        pendingTasksTrend: statsResponse.data?.pendingTasksTrend || 0,
        qualityRate: statsResponse.data?.qualityRate || 0,
        qualityRateTrend: statsResponse.data?.qualityRateTrend || 0,
        abnormalSamples: statsResponse.data?.abnormalSamples || 0,
        abnormalSamplesTrend: statsResponse.data?.abnormalSamplesTrend || 0
      }

      // 构建真实的待办事项
      const todoItems: TodoItem[] = todosResponse.data?.items || []

      return {
        metrics,
        todoItems,
        recentActivities: [],
        timestamp: Date.now(),
        page: 'dashboard'
      }
    } catch (error) {
      console.error('Failed to collect dashboard context:', error)
      
      // 如果 API 失败，返回空数据
      return {
        metrics: {
          totalSamples: 0,
          totalSamplesTrend: 0,
          pendingTasks: 0,
          pendingTasksTrend: 0,
          qualityRate: 0,
          qualityRateTrend: 0,
          abnormalSamples: 0,
          abnormalSamplesTrend: 0
        },
        todoItems: [],
        recentActivities: [],
        timestamp: Date.now(),
        page: 'dashboard'
      }
    }
  }

  /**
   * 生成AI问候语
   */
  generateGreeting(context: DashboardContext): { message: string; timeOfDay: string } {
    const hour = new Date().getHours()
    let timeOfDay = '早上好'
    if (hour >= 12 && hour < 18) {
      timeOfDay = '下午好'
    } else if (hour >= 18) {
      timeOfDay = '晚上好'
    }
    const { metrics, todoItems } = context
    let greeting = '您好!我注意到:\n\n'

    const insights: string[] = []

    // 分析样品总数趋势
    if (Math.abs(metrics.totalSamplesTrend) > 10) {
      if (metrics.totalSamplesTrend > 0) {
        insights.push(`📊 样品总数较上周增长${metrics.totalSamplesTrend}%,工作量有所增加`)
      } else {
        insights.push(`📊 样品总数较上周下降${Math.abs(metrics.totalSamplesTrend)}%`)
      }
    }

    // 分析待处理任务
    const urgentTodos = todoItems.filter(item => item.urgent)
    if (urgentTodos.length > 0) {
      const totalCount = urgentTodos.reduce((sum, item) => sum + (item.count || 0), 0)
      insights.push(`⚠️ 有${urgentTodos.length}项紧急待办,共${totalCount}个任务需要处理`)
    }

    // 分析质量趋势
    if (metrics.abnormalSamplesTrend < -10) {
      insights.push(`✅ 异常样品数量下降${Math.abs(metrics.abnormalSamplesTrend)}%,质量控制效果显著`)
    }

    // 分析合格率
    if (metrics.qualityRate >= 98) {
      insights.push(`🎉 合格率达到${metrics.qualityRate}%,保持优秀水平`)
    }

    if (insights.length === 0) {
      return {
        message: '您好!我是实验室智能助手,有什么可以帮助您的吗?',
        timeOfDay
      }
    }

    greeting += insights.join('\n')
    greeting += '\n\n💬 您可以问我关于数据分析、工作建议或趋势预测的问题。'

    return {
      message: greeting,
      timeOfDay
    }
  }

  /**
   * 生成数据分析洞察
   */
  generateDataAnalysis(context: DashboardContext) {
    const { metrics } = context
    const items = []

    // 样品总数分析
    items.push({
      metric: '样品总数',
      value: metrics.totalSamples.toLocaleString(),
      trend: (metrics.totalSamplesTrend > 0 ? 'up' : metrics.totalSamplesTrend < 0 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      insight: `较上周${metrics.totalSamplesTrend > 0 ? '增长' : '下降'}${Math.abs(metrics.totalSamplesTrend)}%`
    })

    // 待处理任务分析
    items.push({
      metric: '待处理任务',
      value: metrics.pendingTasks.toString(),
      trend: (metrics.pendingTasksTrend > 0 ? 'up' : metrics.pendingTasksTrend < 0 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      insight: `较上周${metrics.pendingTasksTrend > 0 ? '增加' : '下降'}${Math.abs(metrics.pendingTasksTrend)}%`
    })

    // 合格率分析
    items.push({
      metric: '合格率',
      value: `${metrics.qualityRate}%`,
      trend: (metrics.qualityRateTrend > 0 ? 'up' : metrics.qualityRateTrend < 0 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      insight: metrics.qualityRate >= 98 ? '保持优秀水平' : '需要关注'
    })

    // 异常样品分析
    items.push({
      metric: '异常样品',
      value: metrics.abnormalSamples.toString(),
      trend: (metrics.abnormalSamplesTrend > 0 ? 'up' : metrics.abnormalSamplesTrend < 0 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      insight: `较上周${metrics.abnormalSamplesTrend > 0 ? '增加' : '下降'}${Math.abs(metrics.abnormalSamplesTrend)}%`
    })

    return items
  }

  /**
   * 生成告警信息
   */
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
    if (metrics.abnormalSamples > 5) {
      alerts.push({
        id: 'alert-abnormal',
        severity: metrics.abnormalSamples > 10 ? 'high' : 'medium',
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

    return alerts
  }

  /**
   * 生成智能建议
   */
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

    // 通用建议
    if (recommendations.length === 0) {
      recommendations.push('当前工作进展顺利,继续保持良好的工作状态')
    }

    return recommendations
  }

  /**
   * 生成完整的AI洞察
   */
  generateInsights(context: DashboardContext): AIInsights {
    return {
      greeting: this.generateGreeting(context),
      dataAnalysis: this.generateDataAnalysis(context),
      alerts: this.generateAlerts(context),
      suggestions: this.generateRecommendations(context),
      timestamp: Date.now()
    }
  }
}

// 导出单例实例
export const aiContextService = new AIContextService()
