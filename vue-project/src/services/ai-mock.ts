/**
 * AI Mock数据生成器
 * 模拟AI响应,用于演示和开发
 */

import type { AIResponse, QuickAction } from '@/types/ai'

/**
 * 快捷操作列表
 */
export const quickActions: QuickAction[] = [
  {
    id: 'sample-analysis',
    label: '样品数据分析',
    icon: 'DataAnalysis',
    prompt: '分析最近一周的样品数据趋势',
    category: 'analysis',
    color: '#409EFF'
  },
  {
    id: 'anomaly-detection',
    label: '异常检测',
    icon: 'Warning',
    prompt: '检测最近的异常数据和潜在问题',
    category: 'detection',
    color: '#F56C6C'
  },
  {
    id: 'trend-forecast',
    label: '趋势预测',
    icon: 'TrendCharts',
    prompt: '预测下周的样品量和资源需求',
    category: 'forecast',
    color: '#E6A23C'
  },
  {
    id: 'report-generate',
    label: '报告生成',
    icon: 'Document',
    prompt: '生成本月的质量分析报告',
    category: 'report',
    color: '#909399'
  },
  {
    id: 'method-recommend',
    label: '方法推荐',
    icon: 'MagicStick',
    prompt: '推荐适合当前样品的检测方法',
    category: 'recommend',
    color: '#9C27B0'
  },
  {
    id: 'resource-optimize',
    label: '资源优化',
    icon: 'Setting',
    prompt: '分析当前资源使用情况并提供优化建议',
    category: 'optimize',
    color: '#67C23A'
  }
]

/**
 * Mock AI响应生成器
 */
export function mockAIResponse(message: string, context?: any): Promise<AIResponse> {
  return new Promise((resolve) => {
    // 模拟延迟 (1-2秒)
    const delay = 1000 + Math.random() * 1000

    setTimeout(() => {
      const response = generateResponse(message, context)
      resolve(response)
    }, delay)
  })
}

/**
 * 根据消息内容生成响应
 */
function generateResponse(message: string, context?: any): AIResponse {
  const lowerMessage = message.toLowerCase()

  // 关键词匹配
  if (lowerMessage.includes('样品') || lowerMessage.includes('sample')) {
    return generateSampleAnalysis()
  }

  if (lowerMessage.includes('异常') || lowerMessage.includes('anomaly') || lowerMessage.includes('问题')) {
    return generateAnomalyDetection()
  }

  if (lowerMessage.includes('趋势') || lowerMessage.includes('预测') || lowerMessage.includes('forecast')) {
    return generateTrendForecast()
  }

  if (lowerMessage.includes('报告') || lowerMessage.includes('report')) {
    return generateReportSummary()
  }

  if (lowerMessage.includes('推荐') || lowerMessage.includes('方法') || lowerMessage.includes('recommend')) {
    return generateMethodRecommendation()
  }

  if (lowerMessage.includes('优化') || lowerMessage.includes('资源') || lowerMessage.includes('optimize')) {
    return generateResourceOptimization()
  }

  if (lowerMessage.includes('工作') || lowerMessage.includes('重点') || lowerMessage.includes('today')) {
    return generateTodayFocus(context)
  }

  if (lowerMessage.includes('效率') || lowerMessage.includes('提高') || lowerMessage.includes('improve')) {
    return generateEfficiencyTips()
  }

  // 默认响应
  return generateDefaultResponse()
}

/**
 * 生成样品分析响应
 */
function generateSampleAnalysis(): AIResponse {
  return {
    success: true,
    data: {
      message: '我已完成最近一周的样品数据分析,以下是关键发现:',
      type: 'analysis',
      analysis: {
        type: 'mixed',
        title: '样品数据分析报告',
        summary: '本周样品总量稳步增长,整体质量控制良好',
        metrics: [
          {
            label: '总样品数',
            value: 156,
            trend: 'up',
            change: '+12%',
            icon: '📦',
            color: '#409EFF'
          },
          {
            label: '完成率',
            value: '87%',
            trend: 'stable',
            change: '0%',
            icon: '✅',
            color: '#67C23A'
          },
          {
            label: '平均周转时间',
            value: '2.3天',
            trend: 'down',
            change: '-0.2天',
            icon: '⏱️',
            color: '#67C23A'
          },
          {
            label: '异常样品',
            value: 3,
            trend: 'down',
            change: '-2',
            icon: '⚠️',
            color: '#67C23A'
          }
        ],
        charts: [
          {
            type: 'line',
            title: '每日样品趋势',
            data: {
              labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
              datasets: [{
                label: '样品数量',
                data: [18, 22, 25, 20, 28, 24, 19],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
              }]
            }
          }
        ],
        recommendations: [
          '周四和周五样品量较大,建议提前安排人力资源',
          '平均周转时间有所改善,继续保持当前工作流程',
          '异常样品数量下降,质量控制措施有效'
        ]
      }
    },
    timestamp: Date.now()
  }
}

/**
 * 生成异常检测响应
 */
function generateAnomalyDetection(): AIResponse {
  return {
    success: true,
    data: {
      message: '我已完成异常检测分析,发现以下需要关注的问题:',
      type: 'analysis',
      analysis: {
        type: 'mixed',
        title: '异常检测报告',
        metrics: [
          {
            label: '检测到异常',
            value: 3,
            icon: '⚠️',
            color: '#E6A23C'
          },
          {
            label: '高优先级',
            value: 1,
            icon: '🔴',
            color: '#F56C6C'
          },
          {
            label: '中优先级',
            value: 2,
            icon: '🟡',
            color: '#E6A23C'
          }
        ],
        tables: [
          {
            title: '异常样品列表',
            columns: [
              { prop: 'id', label: '样品编号', width: 150 },
              { prop: 'type', label: '异常类型', width: 120 },
              { prop: 'level', label: '优先级', width: 100 },
              { prop: 'suggestion', label: '处理建议' }
            ],
            data: [
              {
                id: 'S20240131-001',
                type: '数据超标',
                level: '高',
                suggestion: '立即复检,确认数据准确性'
              },
              {
                id: 'S20240131-015',
                type: '周转超时',
                level: '中',
                suggestion: '加快处理流程,避免延期'
              },
              {
                id: 'S20240131-023',
                type: '结果异常',
                level: '中',
                suggestion: '核查检测方法和仪器状态'
              }
            ]
          }
        ],
        recommendations: [
          '建议优先处理高优先级异常样品',
          '对超时样品加快审核和签发流程',
          '定期检查仪器状态,确保数据准确性'
        ]
      }
    },
    timestamp: Date.now()
  }
}

/**
 * 生成趋势预测响应
 */
function generateTrendForecast(): AIResponse {
  return {
    success: true,
    data: {
      message: '基于历史数据,我为您预测了下周的工作趋势:',
      type: 'analysis',
      analysis: {
        type: 'mixed',
        title: '趋势预测报告',
        metrics: [
          {
            label: '预计样品量',
            value: '175',
            trend: 'up',
            change: '+12%',
            icon: '📈'
          },
          {
            label: '预计工作时长',
            value: '42小时',
            trend: 'up',
            change: '+8%',
            icon: '⏰'
          },
          {
            label: '资源利用率',
            value: '85%',
            trend: 'stable',
            icon: '📊'
          }
        ],
        charts: [
          {
            type: 'bar',
            title: '下周每日预测样品量',
            data: {
              labels: ['周一', '周二', '周三', '周四', '周五'],
              datasets: [{
                label: '预测样品量',
                data: [30, 35, 38, 42, 30],
                backgroundColor: 'rgba(102, 126, 234, 0.6)'
              }]
            }
          }
        ],
        recommendations: [
          '周四预计样品量最大(42个),建议提前安排2-3名检测人员',
          '预计需要额外准备15%的试剂和耗材',
          '建议周三下午进行仪器维护,确保周四高峰期正常运行'
        ]
      }
    },
    timestamp: Date.now()
  }
}

/**
 * 生成报告总结响应
 */
function generateReportSummary(): AIResponse {
  return {
    success: true,
    data: {
      message: '我已为您生成本月质量分析报告摘要:',
      type: 'analysis',
      analysis: {
        type: 'mixed',
        title: '月度质量分析报告',
        metrics: [
          {
            label: '总样品数',
            value: 624,
            icon: '📦'
          },
          {
            label: '平均合格率',
            value: '98.2%',
            icon: '✅'
          },
          {
            label: '平均周转时间',
            value: '2.5天',
            icon: '⏱️'
          }
        ],
        recommendations: [
          '本月整体质量控制良好,合格率保持在98%以上',
          '周转时间较上月缩短0.3天,工作效率有所提升',
          '建议继续保持当前的质量管理体系'
        ]
      },
      actions: [
        {
          label: '下载完整报告',
          type: 'primary',
          handler: 'downloadReport',
          icon: 'Download'
        },
        {
          label: '查看详细数据',
          type: 'default',
          handler: 'viewDetails',
          icon: 'View'
        }
      ]
    },
    timestamp: Date.now()
  }
}

/**
 * 生成方法推荐响应
 */
function generateMethodRecommendation(): AIResponse {
  return {
    success: true,
    data: {
      message: '根据样品特性,我为您推荐以下检测方法:',
      type: 'recommendation',
      recommendations: [
        '对于水质样品,推荐使用GB/T 5750标准方法',
        '对于食品样品,推荐使用GB 5009系列标准',
        '对于快速筛查,可以使用快速检测试剂盒',
        '对于精确定量,建议使用仪器分析方法(HPLC/GC-MS)'
      ],
      actions: [
        {
          label: '查看方法库',
          type: 'primary',
          handler: 'viewMethods'
        }
      ]
    },
    timestamp: Date.now()
  }
}

/**
 * 生成资源优化响应
 */
function generateResourceOptimization(): AIResponse {
  return {
    success: true,
    data: {
      message: '我已分析当前资源使用情况,以下是优化建议:',
      type: 'analysis',
      analysis: {
        type: 'mixed',
        title: '资源优化分析',
        metrics: [
          {
            label: '人员利用率',
            value: '78%',
            icon: '👥'
          },
          {
            label: '仪器利用率',
            value: '85%',
            icon: '🔬'
          },
          {
            label: '试剂库存',
            value: '充足',
            icon: '🧪'
          }
        ],
        recommendations: [
          '人员利用率较低,建议优化任务分配,提高工作效率',
          '仪器利用率良好,建议定期维护保养',
          '试剂库存充足,但建议建立自动预警机制',
          '可以考虑引入自动化设备,进一步提升效率'
        ]
      }
    },
    timestamp: Date.now()
  }
}

/**
 * 生成今日工作重点响应
 */
function generateTodayFocus(context?: any): AIResponse {
  return {
    success: true,
    data: {
      message: '根据当前数据,今天的工作重点是:',
      type: 'recommendation',
      recommendations: [
        '🔴 优先级1: 完成5个样品审核(预计耗时1小时)',
        '🟡 优先级2: 录入12个检测结果(预计耗时30分钟)',
        '🟢 优先级3: 签发3份报告(预计耗时45分钟)',
        '建议按照优先级顺序处理,确保关键任务按时完成'
      ]
    },
    timestamp: Date.now()
  }
}

/**
 * 生成效率提升建议
 */
function generateEfficiencyTips(): AIResponse {
  return {
    success: true,
    data: {
      message: '以下是提高工作效率的建议:',
      type: 'recommendation',
      recommendations: [
        '使用批量操作功能,一次处理多个样品',
        '设置快捷键,加快常用操作',
        '利用模板功能,减少重复录入',
        '定期整理工作流程,优化操作步骤',
        '使用AI助手快速查询和分析数据'
      ]
    },
    timestamp: Date.now()
  }
}

/**
 * 生成默认响应
 */
function generateDefaultResponse(): AIResponse {
  return {
    success: true,
    data: {
      message: '我理解您的问题了。作为AI助手,我可以帮您:\n\n• 分析样品数据和趋势\n• 检测异常和潜在问题\n• 预测工作负载和资源需求\n• 推荐最佳检测方法\n• 生成智能分析报告\n\n请告诉我您具体需要什么帮助?',
      type: 'simple'
    },
    timestamp: Date.now()
  }
}
