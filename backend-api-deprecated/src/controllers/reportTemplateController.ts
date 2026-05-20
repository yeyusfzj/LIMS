/**
 * 报告模板控制器
 */

import { Request, Response, NextFunction } from 'express'
import reportTemplateService from '../services/reportTemplateService'
import logger from '../config/logger'

export class ReportTemplateController {
  /**
   * 创建报告模板
   */
  async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的访问'
          }
        })
      }

      const template = await reportTemplateService.createTemplate(req.body, userId)

      res.status(201).json({
        message: '报告模板创建成功',
        data: template
      })
    } catch (error: any) {
      logger.error('创建报告模板失败', { error, body: req.body })
      next(error)
    }
  }

  /**
   * 更新报告模板
   */
  async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的访问'
          }
        })
      }

      const template = await reportTemplateService.updateTemplate(id, req.body, userId)

      res.json({
        message: '报告模板更新成功',
        data: template
      })
    } catch (error: any) {
      logger.error('更新报告模板失败', { error, id: req.params.id, body: req.body })
      next(error)
    }
  }

  /**
   * 获取模板详情
   */
  async getTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const template = await reportTemplateService.getTemplate(id)

      res.json({
        data: template
      })
    } catch (error: any) {
      logger.error('获取报告模板失败', { error, id: req.params.id })
      next(error)
    }
  }

  /**
   * 查询模板列表
   */
  async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const query = {
        category: req.query.category as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20
      }

      const result = await reportTemplateService.listTemplates(query)

      res.json({
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages
        }
      })
    } catch (error: any) {
      logger.error('查询报告模板列表失败', { error, query: req.query })
      next(error)
    }
  }

  /**
   * 激活模板
   */
  async activateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的访问'
          }
        })
      }

      const template = await reportTemplateService.activateTemplate(id, userId)

      res.json({
        message: '模板已激活',
        data: template
      })
    } catch (error: any) {
      logger.error('激活报告模板失败', { error, id: req.params.id })
      next(error)
    }
  }

  /**
   * 停用模板
   */
  async deactivateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的访问'
          }
        })
      }

      const template = await reportTemplateService.deactivateTemplate(id, userId)

      res.json({
        message: '模板已停用',
        data: template
      })
    } catch (error: any) {
      logger.error('停用报告模板失败', { error, id: req.params.id })
      next(error)
    }
  }

  /**
   * 删除模板
   */
  async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的访问'
          }
        })
      }

      await reportTemplateService.deleteTemplate(id, userId)

      res.json({
        message: '模板已删除'
      })
    } catch (error: any) {
      logger.error('删除报告模板失败', { error, id: req.params.id })
      next(error)
    }
  }

  /**
   * 获取模板版本信息
   */
  async getTemplateVersions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const versions = await reportTemplateService.getTemplateVersions(id)

      res.json({
        data: versions
      })
    } catch (error: any) {
      logger.error('获取模板版本信息失败', { error, id: req.params.id })
      next(error)
    }
  }
}

export default new ReportTemplateController()
