/**
 * 质量判定控制器
 * 处理质量判定相关的 HTTP 请求
 */

import { Request, Response, NextFunction } from 'express'
import { judgmentService } from '../services/judgmentService'
import { JudgmentResult } from '@prisma/client'
import { logger } from '../config/logger'

export class JudgmentController {
  /**
   * 创建判定规则
   * POST /api/judgment-rules
   */
  async createJudgmentRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, testItemType, conditions, priority } = req.body
      const createdBy = req.user?.id

      if (!createdBy) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
      }

      if (!name || !testItemType || !conditions) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '规则名称、检测项类型和判定条件不能为空'
          }
        })
      }

      const rule = await judgmentService.createJudgmentRule(
        { name, description, testItemType, conditions, priority },
        createdBy
      )

      res.status(201).json({
        message: '创建判定规则成功',
        data: rule
      })
    } catch (error: any) {
      logger.error('创建判定规则失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 更新判定规则
   * PUT /api/judgment-rules/:id
   */
  async updateJudgmentRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: ruleId } = req.params
      const { name, description, conditions, priority, isActive } = req.body

      const rule = await judgmentService.updateJudgmentRule(ruleId, {
        name,
        description,
        conditions,
        priority,
        isActive
      })

      res.json({
        message: '更新判定规则成功',
        data: rule
      })
    } catch (error: any) {
      logger.error('更新判定规则失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 查询判定规则列表
   * GET /api/judgment-rules
   */
  async listJudgmentRules(req: Request, res: Response, next: NextFunction) {
    try {
      const { testItemType, isActive, page, pageSize } = req.query

      const result = await judgmentService.listJudgmentRules({
        testItemType: testItemType as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined
      })

      res.json({
        message: '查询成功',
        data: result
      })
    } catch (error: any) {
      logger.error('查询判定规则失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 获取判定规则详情
   * GET /api/judgment-rules/:id
   */
  async getJudgmentRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: ruleId } = req.params

      const rule = await judgmentService.getJudgmentRule(ruleId)

      res.json({
        message: '查询成功',
        data: rule
      })
    } catch (error: any) {
      logger.error('获取判定规则详情失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 删除判定规则
   * DELETE /api/judgment-rules/:id
   */
  async deleteJudgmentRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: ruleId } = req.params

      await judgmentService.deleteJudgmentRule(ruleId)

      res.json({
        message: '删除判定规则成功'
      })
    } catch (error: any) {
      logger.error('删除判定规则失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 执行质量判定
   * POST /api/samples/:id/judgment
   */
  async performQualityJudgment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: sampleId } = req.params
      const { ruleIds } = req.body
      const performedBy = req.user?.id

      if (!performedBy) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
      }

      const judgment = await judgmentService.performQualityJudgment({
        sampleId,
        ruleIds,
        performedBy
      })

      res.status(201).json({
        message: '质量判定完成',
        data: judgment
      })
    } catch (error: any) {
      logger.error('执行质量判定失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 人工复核判定结果
   * POST /api/judgments/:id/review
   */
  async reviewJudgment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: judgmentId } = req.params
      const { newResult, reason } = req.body
      const reviewedBy = req.user?.id

      if (!reviewedBy) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
      }

      if (!newResult || !reason) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '新判定结果和复核原因不能为空'
          }
        })
      }

      if (!Object.values(JudgmentResult).includes(newResult)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '无效的判定结果'
          }
        })
      }

      const judgment = await judgmentService.reviewJudgment({
        judgmentId,
        newResult,
        reason,
        reviewedBy
      })

      res.json({
        message: '判定结果复核完成',
        data: judgment
      })
    } catch (error: any) {
      logger.error('复核判定结果失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 获取判定结果
   * GET /api/samples/:id/judgment
   */
  async getJudgment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: sampleId } = req.params

      const judgment = await judgmentService.getJudgment(sampleId)

      if (!judgment) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '未找到判定结果'
          }
        })
      }

      res.json({
        message: '查询成功',
        data: judgment
      })
    } catch (error: any) {
      logger.error('获取判定结果失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 查询判定历史
   * GET /api/judgment-history
   */
  async listJudgmentHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { sampleId, judgmentId, page, pageSize } = req.query

      const result = await judgmentService.listJudgmentHistory({
        sampleId: sampleId as string,
        judgmentId: judgmentId as string,
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined
      })

      res.json({
        message: '查询成功',
        data: result
      })
    } catch (error: any) {
      logger.error('查询判定历史失败', { error: error.message })
      next(error)
    }
  }

  /**
   * 批量判定
   * POST /api/judgments/batch
   */
  async batchJudgment(req: Request, res: Response, next: NextFunction) {
    try {
      const { sampleIds } = req.body
      const performedBy = req.user?.id

      if (!performedBy) {
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

      const result = await judgmentService.batchJudgment({
        sampleIds,
        performedBy
      })

      res.json({
        message: '批量判定完成',
        data: result
      })
    } catch (error: any) {
      logger.error('批量判定失败', { error: error.message })
      next(error)
    }
  }
}

export const judgmentController = new JudgmentController()
