/**
 * 审核控制器
 * 处理审核相关的 HTTP 请求
 */

import { Request, Response, NextFunction } from 'express'
import { auditService } from '../services/auditService'
import { AuditDecision } from '@prisma/client'
import { logger } from '../config/logger'

export class AuditController {
  /**
   * 提交任务审核
   * POST /api/audits
   */
  async submitForAudit(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId, auditConfig } = req.body

      if (!taskId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '任务 ID 不能为空'
          }
        })
      }

      const tasks = await auditService.submitForAudit({
        taskId,
        auditConfig
      })

      res.status(201).json({
        message: '提交审核成功',
        data: tasks
      })
    } catch (error: any) {
      logger.error('提交审核失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 执行审核
   * POST /api/audits/:id/review
   */
  async performAudit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: taskId } = req.params
      const { decision, comments } = req.body
      const auditorId = req.user?.userId

      if (!auditorId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
      }

      if (!decision) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '审核决策不能为空'
          }
        })
      }

      if (!Object.values(AuditDecision).includes(decision)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '无效的审核决策'
          }
        })
      }

      const result = await auditService.performAudit({
        taskId,
        decision,
        comments,
        auditorId
      })

      res.json({
        message: '审核完成',
        data: result
      })
    } catch (error: any) {
      logger.error('执行审核失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 审核任务转交
   * POST /api/audits/:id/reassign
   */
  async reassignAuditTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: taskId } = req.params
      const { toAuditorId, reason } = req.body
      const fromAuditorId = req.user?.userId

      if (!fromAuditorId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
      }

      if (!toAuditorId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '目标审核人员 ID 不能为空'
          }
        })
      }

      if (!reason) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '转交原因不能为空'
          }
        })
      }

      const task = await auditService.reassignAuditTask({
        taskId,
        fromAuditorId,
        toAuditorId,
        reason
      })

      res.json({
        message: '审核任务转交成功',
        data: task
      })
    } catch (error: any) {
      logger.error('审核任务转交失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 查询审核任务列表
   * GET /api/audits
   */
  async listAuditTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        taskId,
        auditorId,
        status,
        level,
        page,
        pageSize
      } = req.query

      const result = await auditService.listAuditTasks({
        taskId: taskId as string,
        auditorId: auditorId as string,
        status: status as any,
        level: level ? parseInt(level as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined
      })

      res.json({
        message: '查询成功',
        data: result
      })
    } catch (error: any) {
      logger.error('查询审核任务失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 获取审核任务详情
   * GET /api/audits/:id
   */
  async getAuditTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: taskId } = req.params

      const task = await auditService.getAuditTask(taskId)

      res.json({
        message: '查询成功',
        data: task
      })
    } catch (error: any) {
      logger.error('获取审核任务详情失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 获取审核统计信息
   * GET /api/audits/statistics
   */
  async getAuditStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const statistics = await auditService.getAuditStatistics()

      res.json({
        message: '获取统计信息成功',
        data: statistics
      })
    } catch (error: any) {
      logger.error('获取审核统计信息失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 样品放行
   * POST /api/samples/:id/release
   */
  async releaseSample(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: sampleId } = req.params
      const releasedBy = req.user?.userId

      if (!releasedBy) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
      }

      const result = await auditService.releaseSample(sampleId, releasedBy)

      res.json({
        message: '样品放行成功',
        data: result
      })
    } catch (error: any) {
      logger.error('样品放行失败', { error: error.message })
      
      // 如果是业务规则错误，返回 422
      if (error.message.includes('放行条件不满足')) {
        return res.status(422).json({
          error: {
            code: 'BUSINESS_RULE_VIOLATION',
            message: error.message
          }
        })
      }
      
      next(error)
    }
  }

  /**
   * 批量样品放行
   * POST /api/samples/batch-release
   */
  async batchReleaseSamples(req: Request, res: Response, next: NextFunction) {
    try {
      const { sampleIds } = req.body
      const releasedBy = req.user?.userId

      if (!releasedBy) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
      }

      if (!sampleIds || !Array.isArray(sampleIds) || sampleIds.length === 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '样品 ID 列表不能为空'
          }
        })
      }

      const result = await auditService.batchReleaseSamples(sampleIds, releasedBy)

      res.json({
        message: '批量放行完成',
        data: result
      })
    } catch (error: any) {
      logger.error('批量样品放行失败', { error: error.message })
      next(error)
    }
  }

  // ============================================
  // 审核意见模板管理路由处理
  // ============================================

  /**
   * 获取审核意见模板列表
   * GET /api/audit/templates
   */
  async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, isDefault } = req.query

      const query: any = {}
      if (type) query.type = type as string
      if (isDefault !== undefined) query.isDefault = isDefault === 'true'

      const templates = await auditService.listTemplates(query)

      res.json({
        message: '获取审核意见模板列表成功',
        data: templates
      })
    } catch (error: any) {
      logger.error('获取审核意见模板列表失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 获取单个审核意见模板
   * GET /api/audit/templates/:id
   */
  async getTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const template = await auditService.getTemplateById(id)

      res.json({
        message: '获取审核意见模板成功',
        data: template
      })
    } catch (error: any) {
      logger.error('获取审核意见模板失败', { error: error.message })
      
      if (error.message.includes('不存在')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        })
      }
      
      next(error)
    }
  }

  /**
   * 创建审核意见模板
   * POST /api/audit/templates
   */
  async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, type, content, isDefault } = req.body

      if (!name || !type || !content) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '模板名称、类型和内容不能为空'
          }
        })
      }

      const template = await auditService.createTemplate({
        name,
        type,
        content,
        isDefault
      })

      res.status(201).json({
        message: '创建审核意见模板成功',
        data: template
      })
    } catch (error: any) {
      logger.error('创建审核意见模板失败', { error: error.message })
      
      if (error.message.includes('已存在')) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message
          }
        })
      }
      
      next(error)
    }
  }

  /**
   * 更新审核意见模板
   * PUT /api/audit/templates/:id
   */
  async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { name, type, content, isDefault } = req.body

      const template = await auditService.updateTemplate(id, {
        name,
        type,
        content,
        isDefault
      })

      res.json({
        message: '更新审核意见模板成功',
        data: template
      })
    } catch (error: any) {
      logger.error('更新审核意见模板失败', { error: error.message })
      
      if (error.message.includes('不存在')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        })
      }
      
      if (error.message.includes('已存在')) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message
          }
        })
      }
      
      next(error)
    }
  }

  /**
   * 删除审核意见模板
   * DELETE /api/audit/templates/:id
   */
  async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      await auditService.deleteTemplate(id)

      res.json({
        message: '删除审核意见模板成功'
      })
    } catch (error: any) {
      logger.error('删除审核意见模板失败', { error: error.message })
      
      if (error.message.includes('不存在')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        })
      }
      
      if (error.message.includes('已被使用')) {
        return res.status(422).json({
          error: {
            code: 'BUSINESS_RULE_VIOLATION',
            message: error.message
          }
        })
      }
      
      next(error)
    }
  }

  // ============================================
  // 审核流程配置管理路由处理
  // ============================================

  /**
   * 获取审核流程配置列表
   * GET /api/audit/workflow-configs
   */
  async listWorkflowConfigs(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, sampleType } = req.query

      const query: any = {}
      if (status) query.status = status as string
      if (sampleType) query.sampleType = sampleType as string

      const configs = await auditService.listWorkflowConfigs(query)

      res.json({
        message: '获取审核流程配置列表成功',
        data: configs
      })
    } catch (error: any) {
      logger.error('获取审核流程配置列表失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 获取单个审核流程配置
   * GET /api/audit/workflow-configs/:id
   */
  async getWorkflowConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const config = await auditService.getWorkflowConfigById(id)

      res.json({
        message: '获取审核流程配置成功',
        data: config
      })
    } catch (error: any) {
      logger.error('获取审核流程配置失败', { error: error.message })
      
      if (error.message.includes('不存在')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        })
      }
      
      next(error)
    }
  }

  /**
   * 创建审核流程配置
   * POST /api/audit/workflow-configs
   */
  async createWorkflowConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, sampleTypes, levels, parallelAudit } = req.body

      if (!name || !sampleTypes || !levels) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '配置名称、样品类型和审核级别不能为空'
          }
        })
      }

      const config = await auditService.createWorkflowConfig({
        name,
        sampleTypes,
        levels,
        parallelAudit
      })

      res.status(201).json({
        message: '创建审核流程配置成功',
        data: config
      })
    } catch (error: any) {
      logger.error('创建审核流程配置失败', { error: error.message })
      
      if (error.message.includes('已存在')) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message
          }
        })
      }
      
      if (error.message.includes('配置') || error.message.includes('字段')) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        })
      }
      
      next(error)
    }
  }

  /**
   * 更新审核流程配置
   * PUT /api/audit/workflow-configs/:id
   */
  async updateWorkflowConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { name, sampleTypes, levels, parallelAudit, status } = req.body

      const config = await auditService.updateWorkflowConfig(id, {
        name,
        sampleTypes,
        levels,
        parallelAudit,
        status
      })

      res.json({
        message: '更新审核流程配置成功',
        data: config
      })
    } catch (error: any) {
      logger.error('更新审核流程配置失败', { error: error.message })
      
      if (error.message.includes('不存在')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        })
      }
      
      if (error.message.includes('已存在')) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message
          }
        })
      }
      
      if (error.message.includes('配置') || error.message.includes('字段')) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        })
      }
      
      next(error)
    }
  }

  /**
   * 删除审核流程配置
   * DELETE /api/audit/workflow-configs/:id
   */
  async deleteWorkflowConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      await auditService.deleteWorkflowConfig(id)

      res.json({
        message: '删除审核流程配置成功'
      })
    } catch (error: any) {
      logger.error('删除审核流程配置失败', { error: error.message })
      
      if (error.message.includes('不存在')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        })
      }
      
      if (error.message.includes('使用中')) {
        return res.status(422).json({
          error: {
            code: 'BUSINESS_RULE_VIOLATION',
            message: error.message
          }
        })
      }
      
      next(error)
    }
  }

  // ============================================
  // 审核历史记录路由处理
  // ============================================

  /**
   * 获取审核任务历史记录
   * GET /api/audit/tasks/:id/history
   */
  async getAuditHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: taskId } = req.params

      const history = await auditService.getAuditHistory(taskId)

      res.json({
        message: '获取审核历史记录成功',
        data: history
      })
    } catch (error: any) {
      logger.error('获取审核历史记录失败', { error: error.message })
      next(error)
    }
  }
}

export const auditController = new AuditController()
