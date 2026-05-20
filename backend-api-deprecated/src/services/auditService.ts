/**
 * 审核服务
 * 实现多级审核流程管理
 */

import { PrismaClient, AuditStatus, AuditDecision, SampleStatus } from '@prisma/client'
import {
  CreateAuditTaskDto,
  SubmitAuditDto,
  PerformAuditDto,
  ReturnAuditDto,
  ReassignAuditDto,
  AuditTaskQuery,
  AuditTaskResponse,
  AuditResult,
  AuditConfig,
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateWorkflowConfigDto,
  UpdateWorkflowConfigDto,
  RecordAuditActionDto
} from '../types/audit'
import { logger } from '../config/logger'

const prisma = new PrismaClient()

/**
 * 默认审核配置
 */
const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  levels: [
    { level: 1, name: '初审', auditorIds: [], autoAssign: true },
    { level: 2, name: '复审', auditorIds: [], autoAssign: true },
    { level: 3, name: '终审', auditorIds: [], autoAssign: true }
  ]
}

export class AuditService {
  /**
   * 提交任务审核
   * 根据配置创建多级审核任务
   */
  async submitForAudit(dto: SubmitAuditDto): Promise<AuditTaskResponse[]> {
    const { taskId, auditConfig = DEFAULT_AUDIT_CONFIG } = dto

    try {
      // 验证任务存在且状态正确
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          instance: {
            include: {
              sample: true
            }
          }
        }
      })

      if (!task) {
        throw new Error('任务不存在')
      }

      if (task.status !== 'COMPLETED') {
        throw new Error('任务状态不正确，只有已完成的任务才能提交审核')
      }

      // 检查是否已有审核任务
      const existingTasks = await prisma.auditTask.findMany({
        where: {
          taskId,
          status: { in: [AuditStatus.PENDING, AuditStatus.IN_PROGRESS] }
        }
      })

      if (existingTasks.length > 0) {
        throw new Error('该任务已有进行中的审核任务')
      }

      // 在事务中创建审核任务
      const tasks = await prisma.$transaction(async (tx) => {
        // 创建所有级别的审核任务
        const createdTasks = []
        for (const levelConfig of auditConfig.levels) {
          // 如果配置了审核人员，为每个审核人员创建任务
          if (levelConfig.auditorIds.length > 0) {
            for (const auditorId of levelConfig.auditorIds) {
              const auditTask = await tx.auditTask.create({
                data: {
                  taskId,
                  level: levelConfig.level,
                  auditorId,
                  status: levelConfig.level === 1 ? AuditStatus.PENDING : AuditStatus.PENDING
                }
              })
              createdTasks.push(auditTask)

              // 记录审核任务创建历史
              await tx.auditHistory.create({
                data: {
                  taskId: auditTask.id,
                  action: 'created',
                  changes: {
                    level: levelConfig.level,
                    auditorId,
                    status: auditTask.status
                  } as any,
                  performedBy: 'system'
                }
              })
            }
          } else {
            // 如果没有配置审核人员，创建待分配的任务
            const auditTask = await tx.auditTask.create({
              data: {
                taskId,
                level: levelConfig.level,
                auditorId: 'UNASSIGNED', // 待分配
                status: AuditStatus.PENDING
              }
            })
            createdTasks.push(auditTask)

            // 记录审核任务创建历史
            await tx.auditHistory.create({
              data: {
                taskId: auditTask.id,
                action: 'created',
                changes: {
                  level: levelConfig.level,
                  auditorId: 'UNASSIGNED',
                  status: auditTask.status
                } as any,
                performedBy: 'system'
              }
            })
          }
        }

        return createdTasks
      })

      logger.info(`任务 ${taskId} 提交审核成功，创建了 ${tasks.length} 个审核任务`)

      // 返回任务详情
      return this.getAuditTasksByIds(tasks.map(t => t.id))
    } catch (error) {
      logger.error('提交审核失败', { error, taskId })
      throw error
    }
  }

  /**
   * 执行审核
   * 处理审核决策并触发下一级审核
   */
  async performAudit(dto: PerformAuditDto): Promise<AuditResult> {
    const { taskId, decision, comments, auditorId } = dto

    try {
      // 获取审核任务
      const auditTask = await prisma.auditTask.findUnique({
        where: { id: taskId },
        include: { 
          task: {
            include: {
              instance: {
                include: {
                  sample: true
                }
              }
            }
          }
        }
      })

      if (!auditTask) {
        throw new Error('审核任务不存在')
      }

      // 验证审核人员
      if (auditTask.auditorId !== auditorId && auditTask.auditorId !== 'UNASSIGNED') {
        throw new Error('您没有权限审核此任务')
      }

      // 验证任务状态
      if (auditTask.status === AuditStatus.APPROVED || auditTask.status === AuditStatus.REJECTED) {
        throw new Error('该审核任务已完成')
      }

      // 验证审核顺序：检查前一级是否已通过
      if (auditTask.level > 1) {
        const previousLevelTasks = await prisma.auditTask.findMany({
          where: {
            taskId: auditTask.taskId,
            level: auditTask.level - 1
          }
        })

        const allPreviousApproved = previousLevelTasks.every(
          t => t.status === AuditStatus.APPROVED && t.decision === AuditDecision.APPROVE
        )

        if (!allPreviousApproved) {
          throw new Error('前一级审核尚未通过，无法进行当前级别审核')
        }
      }

      // 在事务中处理审核
      const result = await prisma.$transaction(async (tx) => {
        // 更新审核任务
        const updatedAuditTask = await tx.auditTask.update({
          where: { id: taskId },
          data: {
            status: decision === AuditDecision.APPROVE ? AuditStatus.APPROVED : AuditStatus.REJECTED,
            decision,
            comments,
            completedAt: new Date(),
            auditorId: auditTask.auditorId === 'UNASSIGNED' ? auditorId : auditTask.auditorId
          }
        })

        // 记录审核历史
        await tx.auditHistory.create({
          data: {
            taskId,
            action: 'review',
            changes: {
              decision,
              comments,
              previousStatus: auditTask.status,
              newStatus: updatedAuditTask.status
            } as any,
            performedBy: auditorId
          }
        })

        let isComplete = false
        let nextLevel: number | undefined

        if (decision === AuditDecision.APPROVE) {
          // 审核通过，检查是否还有下一级
          const nextLevelTasks = await tx.auditTask.findMany({
            where: {
              taskId: auditTask.taskId,
              level: auditTask.level + 1
            }
          })

          if (nextLevelTasks.length > 0) {
            // 有下一级，激活下一级审核任务
            nextLevel = auditTask.level + 1
            await tx.auditTask.updateMany({
              where: {
                taskId: auditTask.taskId,
                level: nextLevel
              },
              data: {
                status: AuditStatus.PENDING
              }
            })
          } else {
            // 没有下一级，审核完成
            isComplete = true
            // 审核通过后，任务状态保持为 COMPLETED
          }
        } else if (decision === AuditDecision.REJECT) {
          // 审核拒绝，整个审核流程结束
          isComplete = true
          // 审核拒绝后，任务状态改为 REJECTED
          await tx.task.update({
            where: { id: auditTask.taskId },
            data: { status: 'REJECTED' }
          })

          // 将所有未完成的审核任务标记为拒绝
          await tx.auditTask.updateMany({
            where: {
              taskId: auditTask.taskId,
              status: { in: [AuditStatus.PENDING, AuditStatus.IN_PROGRESS] }
            },
            data: {
              status: AuditStatus.REJECTED
            }
          })
        } else if (decision === AuditDecision.RETURN) {
          // 审核退回，需要重新处理
          await this.handleAuditReturn({
            taskId,
            reason: comments || '审核退回',
            auditorId,
            notifyUserId: auditTask.task.assignedTo || 'system'
          })
        }

        return {
          taskId: updatedAuditTask.id,
          auditTaskId: updatedAuditTask.id,
          relatedTaskId: updatedAuditTask.taskId,
          level: updatedAuditTask.level,
          decision: updatedAuditTask.decision!,
          nextLevel,
          isComplete,
          message: this.getAuditResultMessage(decision, isComplete, nextLevel)
        }
      })

      logger.info('审核完成', { taskId, decision, result })
      return result
    } catch (error) {
      logger.error('执行审核失败', { error, taskId })
      throw error
    }
  }

  /**
   * 处理审核退回
   * 通知原操作人员并记录退回原因
   */
  async handleAuditReturn(dto: ReturnAuditDto): Promise<void> {
    const { taskId, reason, auditorId, notifyUserId } = dto

    try {
      await prisma.$transaction(async (tx) => {
        // 更新审核任务状态
        const auditTask = await tx.auditTask.update({
          where: { id: taskId },
          data: {
            status: AuditStatus.REJECTED,
            decision: AuditDecision.RETURN,
            comments: reason,
            completedAt: new Date()
          }
        })

        // 更新任务状态为需要修改
        await tx.task.update({
          where: { id: auditTask.taskId },
          data: { status: 'PENDING' as any }
        })

        // 取消所有未完成的审核任务
        await tx.auditTask.updateMany({
          where: {
            taskId: auditTask.taskId,
            status: { in: [AuditStatus.PENDING, AuditStatus.IN_PROGRESS] }
          },
          data: {
            status: AuditStatus.REJECTED
          }
        })

        // TODO: 发送通知给原操作人员
        logger.info('审核退回通知', {
          taskId,
          relatedTaskId: auditTask.taskId,
          notifyUserId,
          reason
        })
      })

      logger.info('审核退回处理完成', { taskId, reason })
    } catch (error) {
      logger.error('处理审核退回失败', { error, taskId })
      throw error
    }
  }

  /**
   * 审核任务转交
   * 重新分配审核任务给其他审核人员
   */
  async reassignAuditTask(dto: ReassignAuditDto): Promise<AuditTaskResponse> {
    const { taskId, fromAuditorId, toAuditorId, reason } = dto

    try {
      // 验证任务存在且属于当前审核人员
      const task = await prisma.auditTask.findUnique({
        where: { id: taskId }
      })

      if (!task) {
        throw new Error('审核任务不存在')
      }

      if (task.auditorId !== fromAuditorId) {
        throw new Error('您没有权限转交此任务')
      }

      if (task.status !== AuditStatus.PENDING && task.status !== AuditStatus.IN_PROGRESS) {
        throw new Error('只能转交待审核或审核中的任务')
      }

      // 在事务中更新审核人员并记录历史
      const updatedTask = await prisma.$transaction(async (tx) => {
        // 更新审核人员
        const updated = await tx.auditTask.update({
          where: { id: taskId },
          data: {
            auditorId: toAuditorId,
            comments: `任务转交：${reason}`
          }
        })

        // 记录转交历史
        await tx.auditHistory.create({
          data: {
            taskId,
            action: 'reassigned',
            changes: {
              fromAuditorId,
              toAuditorId,
              reason
            } as any,
            performedBy: fromAuditorId
          }
        })

        return updated
      })

      logger.info('审核任务转交成功', {
        taskId,
        from: fromAuditorId,
        to: toAuditorId,
        reason
      })

      return this.formatAuditTask(updatedTask)
    } catch (error) {
      logger.error('审核任务转交失败', { error, taskId })
      throw error
    }
  }

  /**
   * 查询审核任务列表
   */
  async listAuditTasks(query: AuditTaskQuery): Promise<{
    items: AuditTaskResponse[]
    total: number
    page: number
    pageSize: number
  }> {
    const {
      taskId,
      auditorId,
      status,
      level,
      page = 1,
      pageSize = 20
    } = query

    const where: any = {}

    if (taskId) where.taskId = taskId
    if (auditorId) where.auditorId = auditorId
    if (status) where.status = status
    if (level) where.level = level

    const [tasks, total] = await Promise.all([
      prisma.auditTask.findMany({
        where,
        include: {
          task: {
            include: {
              instance: {
                include: {
                  sample: true
                }
              }
            }
          }
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.auditTask.count({ where })
    ])

    return {
      items: tasks.map(task => this.formatAuditTask(task)),
      total,
      page,
      pageSize
    }
  }

  /**
   * 获取审核任务详情
   */
  async getAuditTask(taskId: string): Promise<AuditTaskResponse> {
    const auditTask = await prisma.auditTask.findUnique({
      where: { id: taskId },
      include: {
        task: {
          include: {
            instance: {
              include: {
                sample: true
              }
            }
          }
        }
      }
    })

    if (!auditTask) {
      throw new Error('审核任务不存在')
    }

    return this.formatAuditTask(auditTask)
  }

  /**
   * 根据 ID 列表获取审核任务
   */
  private async getAuditTasksByIds(taskIds: string[]): Promise<AuditTaskResponse[]> {
    const tasks = await prisma.auditTask.findMany({
      where: { id: { in: taskIds } },
      include: {
        task: {
          include: {
            instance: {
              include: {
                sample: true
              }
            }
          }
        }
      }
    })

    return tasks.map(task => this.formatAuditTask(task))
  }

  /**
   * 格式化审核任务
   */
  private formatAuditTask(auditTask: any): AuditTaskResponse {
    return {
      id: auditTask.id,
      taskId: auditTask.taskId,
      level: auditTask.level,
      auditorId: auditTask.auditorId,
      status: auditTask.status,
      decision: auditTask.decision,
      comments: auditTask.comments,
      submittedAt: auditTask.submittedAt,
      completedAt: auditTask.completedAt,
      task: auditTask.task
    }
  }

  /**
   * 获取审核结果消息
   */
  private getAuditResultMessage(
    decision: AuditDecision,
    isComplete: boolean,
    nextLevel?: number
  ): string {
    if (decision === AuditDecision.APPROVE) {
      if (isComplete) {
        return '审核通过，所有审核流程已完成'
      } else if (nextLevel) {
        return `审核通过，已进入第 ${nextLevel} 级审核`
      }
      return '审核通过'
    } else if (decision === AuditDecision.REJECT) {
      return '审核拒绝，审核流程已终止'
    } else if (decision === AuditDecision.RETURN) {
      return '审核退回，样品需要重新检测'
    }
    return '审核完成'
  }

  /**
   * 验证任务审核完成前置条件
   * 检查审核完成等条件
   * @deprecated 此方法用于样品放行，现在审核基于任务，此方法保留用于兼容性
   */
  async validateReleaseConditions(sampleId: string): Promise<{
    canRelease: boolean
    violations: string[]
  }> {
    const violations: string[] = []

    try {
      // 获取样品信息
      const sample = await prisma.sample.findUnique({
        where: { id: sampleId },
        include: {
          qualityJudgment: true
        }
      })

      if (!sample) {
        violations.push('样品不存在')
        return { canRelease: false, violations }
      }

      // 检查样品状态
      if (sample.status !== SampleStatus.AUDIT_COMPLETE) {
        violations.push('样品审核未完成')
      }

      // 注意：由于审核现在基于任务而非样品，这里的逻辑需要调整
      // 需要检查与该样品相关的所有任务的审核状态
      violations.push('审核系统已迁移到基于任务的模式，请使用新的审核流程')

      // 检查质量判定结果
      if (!sample.qualityJudgment) {
        violations.push('样品未进行质量判定')
      } else if (sample.qualityJudgment.result !== 'QUALIFIED') {
        violations.push('样品质量判定不合格')
      }

      // 检查是否已放行
      if (sample.status === SampleStatus.RELEASED) {
        violations.push('样品已放行，不能重复放行')
      }

      const canRelease = violations.length === 0

      return { canRelease, violations }
    } catch (error) {
      logger.error('验证放行条件失败', { error, sampleId })
      throw error
    }
  }

  /**
   * 单个样品放行
   * @deprecated 此方法用于样品放行，现在审核基于任务，建议使用新的审核流程
   */
  async releaseSample(sampleId: string, releasedBy: string): Promise<{
    sampleId: string
    barcode: string
    sampleNumber: string
    releasedAt: Date
    releasedBy: string
    message: string
  }> {
    try {
      // 验证放行前置条件
      const { canRelease, violations } = await this.validateReleaseConditions(sampleId)

      if (!canRelease) {
        throw new Error(`样品放行条件不满足：${violations.join('；')}`)
      }

      // 执行放行操作
      const sample = await prisma.sample.update({
        where: { id: sampleId },
        data: {
          status: SampleStatus.RELEASED,
          releasedAt: new Date(),
          releasedBy
        }
      })

      logger.info('样品放行成功', {
        sampleId,
        barcode: sample.barcode,
        releasedBy
      })

      return {
        sampleId: sample.id,
        barcode: sample.barcode,
        sampleNumber: sample.sampleNumber,
        releasedAt: sample.releasedAt!,
        releasedBy: sample.releasedBy!,
        message: '样品放行成功'
      }
    } catch (error) {
      logger.error('样品放行失败', { error, sampleId })
      throw error
    }
  }

  /**
   * 获取审核统计信息
   */
  async getAuditStatistics(): Promise<{
    pending: number
    todayCompleted: number
    weekCompleted: number
    monthCompleted: number
    approvalRate: number
    averageProcessingTime: number
  }> {
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      // 获取待审核任务数量
      const pending = await prisma.auditTask.count({
        where: {
          status: AuditStatus.PENDING
        }
      })

      // 获取今日完成的审核任务
      const todayCompleted = await prisma.auditTask.count({
        where: {
          status: { in: [AuditStatus.APPROVED, AuditStatus.REJECTED] },
          completedAt: {
            gte: todayStart
          }
        }
      })

      // 获取本周完成的审核任务
      const weekCompleted = await prisma.auditTask.count({
        where: {
          status: { in: [AuditStatus.APPROVED, AuditStatus.REJECTED] },
          completedAt: {
            gte: weekStart
          }
        }
      })

      // 获取本月完成的审核任务
      const monthCompleted = await prisma.auditTask.count({
        where: {
          status: { in: [AuditStatus.APPROVED, AuditStatus.REJECTED] },
          completedAt: {
            gte: monthStart
          }
        }
      })

      // 计算审核通过率（本月）
      const monthApproved = await prisma.auditTask.count({
        where: {
          status: AuditStatus.APPROVED,
          decision: AuditDecision.APPROVE,
          completedAt: {
            gte: monthStart
          }
        }
      })

      const approvalRate = monthCompleted > 0 ? (monthApproved / monthCompleted) * 100 : 0

      // 计算平均处理时间（小时）
      const completedTasks = await prisma.auditTask.findMany({
        where: {
          status: { in: [AuditStatus.APPROVED, AuditStatus.REJECTED] },
          completedAt: {
            gte: monthStart
          }
        },
        select: {
          submittedAt: true,
          completedAt: true
        }
      })

      let totalProcessingTime = 0
      completedTasks.forEach(task => {
        if (task.completedAt) {
          const processingTime = task.completedAt.getTime() - task.submittedAt.getTime()
          totalProcessingTime += processingTime
        }
      })

      const averageProcessingTime = completedTasks.length > 0 
        ? totalProcessingTime / completedTasks.length / (1000 * 60 * 60) // 转换为小时
        : 0

      return {
        pending,
        todayCompleted,
        weekCompleted,
        monthCompleted,
        approvalRate: Math.round(approvalRate * 10) / 10, // 保留一位小数
        averageProcessingTime: Math.round(averageProcessingTime * 10) / 10 // 保留一位小数
      }
    } catch (error) {
      logger.error('获取审核统计信息失败', { error })
      throw error
    }
  }

  /**
   * 批量样品放行
   * 使用事务确保原子性
   * @deprecated 此方法用于样品放行，现在审核基于任务，建议使用新的审核流程
   */
  async batchReleaseSamples(sampleIds: string[], releasedBy: string): Promise<{
    total: number
    successful: number
    failed: number
    results: Array<{
      sampleId: string
      success: boolean
      barcode?: string
      sampleNumber?: string
      releasedAt?: Date
      error?: string
    }>
  }> {
    const results: Array<{
      sampleId: string
      success: boolean
      barcode?: string
      sampleNumber?: string
      releasedAt?: Date
      error?: string
    }> = []

    try {
      // 首先验证所有样品的放行条件
      const validationResults = await Promise.all(
        sampleIds.map(async (sampleId) => {
          const validation = await this.validateReleaseConditions(sampleId)
          return { sampleId, ...validation }
        })
      )

      // 过滤出可以放行的样品
      const releasableSampleIds = validationResults
        .filter(v => v.canRelease)
        .map(v => v.sampleId)

      // 记录验证失败的样品
      validationResults
        .filter(v => !v.canRelease)
        .forEach(v => {
          results.push({
            sampleId: v.sampleId,
            success: false,
            error: `放行条件不满足：${v.violations.join('；')}`
          })
        })

      // 在事务中批量放行可以放行的样品
      if (releasableSampleIds.length > 0) {
        const releasedSamples = await prisma.$transaction(
          releasableSampleIds.map(sampleId =>
            prisma.sample.update({
              where: { id: sampleId },
              data: {
                status: SampleStatus.RELEASED,
                releasedAt: new Date(),
                releasedBy
              }
            })
          )
        )

        // 记录成功放行的样品
        releasedSamples.forEach(sample => {
          results.push({
            sampleId: sample.id,
            success: true,
            barcode: sample.barcode,
            sampleNumber: sample.sampleNumber,
            releasedAt: sample.releasedAt!
          })
        })
      }

      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      logger.info('批量样品放行完成', {
        total: sampleIds.length,
        successful,
        failed
      })

      return {
        total: sampleIds.length,
        successful,
        failed,
        results
      }
    } catch (error) {
      logger.error('批量样品放行失败', { error, sampleIds })
      throw error
    }
  }

  // ============================================
  // 审核意见模板管理方法
  // ============================================

  /**
   * 获取审核意见模板列表
   */
  async listTemplates(query?: { type?: string; isDefault?: boolean }): Promise<any[]> {
    try {
      const where: any = {}

      if (query?.type) {
        where.type = query.type
      }

      if (query?.isDefault !== undefined) {
        where.isDefault = query.isDefault
      }

      const templates = await prisma.auditCommentTemplate.findMany({
        where,
        orderBy: [
          { isDefault: 'desc' },
          { usageCount: 'desc' },
          { createdAt: 'desc' }
        ]
      })

      logger.info('获取审核意见模板列表成功', { count: templates.length, query })
      return templates
    } catch (error) {
      logger.error('获取审核意见模板列表失败', { error, query })
      throw error
    }
  }

  /**
   * 根据 ID 获取审核意见模板
   */
  async getTemplateById(id: string): Promise<any> {
    try {
      const template = await prisma.auditCommentTemplate.findUnique({
        where: { id }
      })

      if (!template) {
        throw new Error('审核意见模板不存在')
      }

      logger.info('获取审核意见模板成功', { id })
      return template
    } catch (error) {
      logger.error('获取审核意见模板失败', { error, id })
      throw error
    }
  }

  /**
   * 创建审核意见模板
   */
  async createTemplate(dto: CreateTemplateDto): Promise<any> {
    try {
      // 验证模板名称唯一性
      const existingTemplate = await prisma.auditCommentTemplate.findUnique({
        where: { name: dto.name }
      })

      if (existingTemplate) {
        throw new Error('模板名称已存在')
      }

      // 转换类型为大写（数据库枚举是大写）
      const typeMapping: Record<string, string> = {
        'approved': 'APPROVED',
        'need_revision': 'NEED_REVISION',
        'rejected': 'REJECTED',
        'other': 'OTHER'
      }
      const dbType = typeMapping[dto.type.toLowerCase()] || dto.type.toUpperCase()

      // 创建模板
      const template = await prisma.auditCommentTemplate.create({
        data: {
          name: dto.name,
          type: dbType as any,
          content: dto.content,
          isDefault: dto.isDefault || false,
          createdBy: 'system', // TODO: 从上下文获取当前用户
          usageCount: 0
        }
      })

      logger.info('创建审核意见模板成功', { id: template.id, name: template.name })
      return template
    } catch (error) {
      logger.error('创建审核意见模板失败', { error, dto })
      throw error
    }
  }

  /**
   * 更新审核意见模板
   */
  async updateTemplate(id: string, dto: UpdateTemplateDto): Promise<any> {
    try {
      // 验证模板存在
      const existingTemplate = await prisma.auditCommentTemplate.findUnique({
        where: { id }
      })

      if (!existingTemplate) {
        throw new Error('审核意见模板不存在')
      }

      // 如果更新名称，验证名称唯一性
      if (dto.name && dto.name !== existingTemplate.name) {
        const duplicateTemplate = await prisma.auditCommentTemplate.findUnique({
          where: { name: dto.name }
        })

        if (duplicateTemplate) {
          throw new Error('模板名称已存在')
        }
      }

      // 转换类型为大写（数据库枚举是大写）
      const typeMapping: Record<string, string> = {
        'approved': 'APPROVED',
        'need_revision': 'NEED_REVISION',
        'rejected': 'REJECTED',
        'other': 'OTHER'
      }

      // 更新模板
      const updateData: any = {}
      if (dto.name) updateData.name = dto.name
      if (dto.type) updateData.type = typeMapping[dto.type.toLowerCase()] || dto.type.toUpperCase()
      if (dto.content) updateData.content = dto.content
      if (dto.isDefault !== undefined) updateData.isDefault = dto.isDefault

      const template = await prisma.auditCommentTemplate.update({
        where: { id },
        data: updateData
      })

      logger.info('更新审核意见模板成功', { id, updates: Object.keys(updateData) })
      return template
    } catch (error) {
      logger.error('更新审核意见模板失败', { error, id, dto })
      throw error
    }
  }

  /**
   * 删除审核意见模板
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      // 验证模板存在
      const template = await prisma.auditCommentTemplate.findUnique({
        where: { id }
      })

      if (!template) {
        throw new Error('审核意见模板不存在')
      }

      // 检查模板是否被使用（通过 usageCount）
      if (template.usageCount > 0) {
        throw new Error('该模板已被使用，无法删除')
      }

      // 删除模板
      await prisma.auditCommentTemplate.delete({
        where: { id }
      })

      logger.info('删除审核意见模板成功', { id, name: template.name })
    } catch (error) {
      logger.error('删除审核意见模板失败', { error, id })
      throw error
    }
  }

  /**
   * 增加模板使用次数
   */
  async incrementTemplateUsage(id: string): Promise<void> {
    try {
      await prisma.auditCommentTemplate.update({
        where: { id },
        data: {
          usageCount: {
            increment: 1
          }
        }
      })

      logger.info('增加模板使用次数成功', { id })
    } catch (error) {
      logger.error('增加模板使用次数失败', { error, id })
      throw error
    }
  }

  // ============================================
  // 审核流程配置管理方法
  // ============================================

  /**
   * 获取审核流程配置列表
   */
  async listWorkflowConfigs(query?: { status?: string; sampleType?: string }): Promise<any[]> {
    try {
      const where: any = {}

      if (query?.status) {
        where.status = query.status
      }

      // 如果指定了样品类型，筛选包含该类型的配置
      if (query?.sampleType) {
        where.sampleTypes = {
          has: query.sampleType
        }
      }

      const configs = await prisma.auditWorkflowConfig.findMany({
        where,
        orderBy: [
          { status: 'desc' },
          { createdAt: 'desc' }
        ]
      })

      logger.info('获取审核流程配置列表成功', { count: configs.length, query })
      return configs
    } catch (error) {
      logger.error('获取审核流程配置列表失败', { error, query })
      throw error
    }
  }

  /**
   * 根据 ID 获取审核流程配置
   */
  async getWorkflowConfigById(id: string): Promise<any> {
    try {
      const config = await prisma.auditWorkflowConfig.findUnique({
        where: { id }
      })

      if (!config) {
        throw new Error('审核流程配置不存在')
      }

      logger.info('获取审核流程配置成功', { id })
      return config
    } catch (error) {
      logger.error('获取审核流程配置失败', { error, id })
      throw error
    }
  }

  /**
   * 创建审核流程配置
   */
  async createWorkflowConfig(dto: CreateWorkflowConfigDto): Promise<any> {
    try {
      // 验证配置名称唯一性
      const existingConfig = await prisma.auditWorkflowConfig.findUnique({
        where: { name: dto.name }
      })

      if (existingConfig) {
        throw new Error('流程配置名称已存在')
      }

      // 验证 levels 数组格式
      this.validateWorkflowLevels(dto.levels)

      // 创建配置
      const config = await prisma.auditWorkflowConfig.create({
        data: {
          name: dto.name,
          sampleTypes: dto.sampleTypes,
          levels: dto.levels as any,
          parallelAudit: dto.parallelAudit,
          status: 'INACTIVE',
          createdBy: 'system' // TODO: 从上下文获取当前用户
        }
      })

      logger.info('创建审核流程配置成功', { id: config.id, name: config.name })
      return config
    } catch (error) {
      logger.error('创建审核流程配置失败', { error, dto })
      throw error
    }
  }

  /**
   * 更新审核流程配置
   */
  async updateWorkflowConfig(id: string, dto: UpdateWorkflowConfigDto): Promise<any> {
    try {
      // 验证配置存在
      const existingConfig = await prisma.auditWorkflowConfig.findUnique({
        where: { id }
      })

      if (!existingConfig) {
        throw new Error('审核流程配置不存在')
      }

      // 如果更新名称，验证名称唯一性
      if (dto.name && dto.name !== existingConfig.name) {
        const duplicateConfig = await prisma.auditWorkflowConfig.findUnique({
          where: { name: dto.name }
        })

        if (duplicateConfig) {
          throw new Error('流程配置名称已存在')
        }
      }

      // 如果更新 levels，验证格式
      if (dto.levels) {
        this.validateWorkflowLevels(dto.levels)
      }

      // 更新配置
      const updateData: any = {}
      if (dto.name) updateData.name = dto.name
      if (dto.sampleTypes) updateData.sampleTypes = dto.sampleTypes
      if (dto.levels) updateData.levels = dto.levels
      if (dto.parallelAudit !== undefined) updateData.parallelAudit = dto.parallelAudit
      if (dto.status) updateData.status = dto.status

      const config = await prisma.auditWorkflowConfig.update({
        where: { id },
        data: updateData
      })

      logger.info('更新审核流程配置成功', { id, updates: Object.keys(updateData) })
      return config
    } catch (error) {
      logger.error('更新审核流程配置失败', { error, id, dto })
      throw error
    }
  }

  /**
   * 删除审核流程配置
   */
  async deleteWorkflowConfig(id: string): Promise<void> {
    try {
      // 验证配置存在
      const config = await prisma.auditWorkflowConfig.findUnique({
        where: { id }
      })

      if (!config) {
        throw new Error('审核流程配置不存在')
      }

      // 检查配置是否正在使用（状态为 ACTIVE）
      if (config.status === 'ACTIVE') {
        throw new Error('该流程配置正在使用中，无法删除')
      }

      // TODO: 检查是否有关联的审核任务
      // 这里可以添加更复杂的关联检查逻辑

      // 删除配置
      await prisma.auditWorkflowConfig.delete({
        where: { id }
      })

      logger.info('删除审核流程配置成功', { id, name: config.name })
    } catch (error) {
      logger.error('删除审核流程配置失败', { error, id })
      throw error
    }
  }

  /**
   * 激活审核流程配置
   */
  async activateWorkflowConfig(id: string): Promise<any> {
    try {
      const config = await prisma.auditWorkflowConfig.update({
        where: { id },
        data: { status: 'ACTIVE' }
      })

      logger.info('激活审核流程配置成功', { id, name: config.name })
      return config
    } catch (error) {
      logger.error('激活审核流程配置失败', { error, id })
      throw error
    }
  }

  /**
   * 停用审核流程配置
   */
  async deactivateWorkflowConfig(id: string): Promise<any> {
    try {
      const config = await prisma.auditWorkflowConfig.update({
        where: { id },
        data: { status: 'INACTIVE' }
      })

      logger.info('停用审核流程配置成功', { id, name: config.name })
      return config
    } catch (error) {
      logger.error('停用审核流程配置失败', { error, id })
      throw error
    }
  }

  /**
   * 验证审核流程级别配置格式
   */
  private validateWorkflowLevels(levels: any[]): void {
    if (!Array.isArray(levels) || levels.length === 0) {
      throw new Error('审核级别配置不能为空')
    }

    // 验证每个级别包含必需字段
    const requiredFields = ['order', 'name', 'role', 'required', 'autoAssign']
    for (const level of levels) {
      for (const field of requiredFields) {
        if (!(field in level)) {
          throw new Error(`审核级别配置缺少必需字段: ${field}`)
        }
      }
    }

    // 验证 order 字段唯一性和连续性
    const orders = levels.map(l => l.order).sort((a, b) => a - b)
    const uniqueOrders = new Set(orders)

    if (uniqueOrders.size !== orders.length) {
      throw new Error('审核级别的 order 字段必须唯一')
    }

    // 验证 order 从 1 开始且连续
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        throw new Error('审核级别的 order 字段必须从 1 开始且连续')
      }
    }
  }

  // ============================================
  // 审核历史记录方法
  // ============================================

  /**
   * 获取审核任务的历史记录
   */
  async getAuditHistory(taskId: string): Promise<any[]> {
    try {
      const history = await prisma.auditHistory.findMany({
        where: { taskId },
        orderBy: { performedAt: 'asc' }
      })

      logger.info('获取审核历史记录成功', { taskId, count: history.length })
      return history
    } catch (error) {
      logger.error('获取审核历史记录失败', { error, taskId })
      throw error
    }
  }

  /**
   * 记录审核操作（内部方法）
   */
  async recordAuditAction(dto: RecordAuditActionDto): Promise<any> {
    try {
      const history = await prisma.auditHistory.create({
        data: {
          taskId: dto.taskId,
          action: dto.action,
          changes: dto.changes as any,
          performedBy: dto.performedBy
        }
      })

      logger.info('记录审核操作成功', { taskId: dto.taskId, action: dto.action })
      return history
    } catch (error) {
      logger.error('记录审核操作失败', { error, dto })
      throw error
    }
  }
}

export const auditService = new AuditService()
