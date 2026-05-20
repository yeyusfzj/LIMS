/**
 * 检测方法控制器
 */

import { Request, Response, NextFunction } from 'express'
import { methodService } from '../services/methodService'
import type { CreateMethodRequest, UpdateMethodRequest, MethodFilters } from '../types/method'

export class MethodController {
  /**
   * 获取检测方法列表
   */
  async getMethodList(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: MethodFilters = {
        keyword: req.query.keyword as string,
        category: req.query.category as string,
        status: req.query.status as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 10
      }

      const userId = (req as any).user.userId
      const result = await methodService.getMethodList(filters, userId)

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取检测方法详情
   */
  async getMethodById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = (req as any).user.userId

      const method = await methodService.getMethodById(id, userId)

      res.json({
        success: true,
        data: method
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 创建检测方法
   */
  async createMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreateMethodRequest = req.body
      const userId = (req as any).user.userId

      const method = await methodService.createMethod(data, userId)

      res.status(201).json({
        success: true,
        data: method
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 更新检测方法
   */
  async updateMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const data: UpdateMethodRequest = req.body
      const userId = (req as any).user.userId

      const method = await methodService.updateMethod(id, data, userId)

      res.json({
        success: true,
        data: method
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 删除检测方法
   */
  async deleteMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = (req as any).user.userId

      await methodService.deleteMethod(id, userId)

      res.json({
        success: true,
        message: '删除成功'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取检测方法版本历史
   */
  async getMethodHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = (req as any).user.userId

      const history = await methodService.getMethodHistory(id, userId)

      res.json({
        success: true,
        data: history
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 复制检测方法
   */
  async copyMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { version } = req.body
      const userId = (req as any).user.userId

      const method = await methodService.copyMethod(id, version, userId)

      res.status(201).json({
        success: true,
        data: method
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 归档检测方法
   */
  async archiveMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = (req as any).user.userId

      await methodService.archiveMethod(id, userId)

      res.json({
        success: true,
        message: '归档成功'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 激活检测方法
   */
  async activateMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = (req as any).user.userId

      await methodService.activateMethod(id, userId)

      res.json({
        success: true,
        message: '激活成功'
      })
    } catch (error) {
      next(error)
    }
  }
}

export const methodController = new MethodController()
