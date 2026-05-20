/**
 * 任务控制器
 */

import { Request, Response, NextFunction } from 'express'
import taskService from '../services/taskService'
import {
  CreateTaskDto,
  UpdateTaskDto,
  CompleteTaskDto,
  TaskQuery,
  AssignTaskDto,
} from '../types/task'
import logger from '../config/logger'

export class TaskController {
  /**
   * 创建任务
   */
  async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreateTaskDto = req.body

      const task = await taskService.createTask(data)

      res.status(201).json({
        success: true,
        data: task,
      })
    } catch (error) {
      logger.error('创建任务失败', { error })
      next(error)
    }
  }

  /**
   * 获取任务详情
   */
  async getTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const task = await taskService.getTask(id)

      if (!task) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: '任务不存在',
          },
        })
      }

      res.json({
        success: true,
        data: task,
      })
    } catch (error) {
      logger.error('获取任务失败', { error, taskId: req.params.id })
      next(error)
    }
  }

  /**
   * 查询任务列表
   */
  async listTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const query: TaskQuery = {
        instanceId: req.query.instanceId as string,
        assignedTo: req.query.assignedTo as string,
        status: req.query.status as any,
        priority: req.query.priority as any,
        nodeType: req.query.nodeType as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      }

      const result = await taskService.listTasks(query)

      res.json({
        success: true,
        data: result,
      })
    } catch (error) {
      logger.error('查询任务列表失败', { error })
      next(error)
    }
  }

  /**
   * 分配任务
   */
  async assignTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const data: AssignTaskDto = req.body

      const task = await taskService.assignTask(id, data)

      res.json({
        success: true,
        data: task,
      })
    } catch (error) {
      logger.error('分配任务失败', { error, taskId: req.params.id })
      next(error)
    }
  }

  /**
   * 更新任务
   */
  async updateTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const data: UpdateTaskDto = req.body

      const task = await taskService.updateTask(id, data)

      res.json({
        success: true,
        data: task,
      })
    } catch (error) {
      logger.error('更新任务失败', { error, taskId: req.params.id })
      next(error)
    }
  }

  /**
   * 完成任务
   */
  async completeTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const data: CompleteTaskDto = req.body
      const userId = req.user!.id

      const task = await taskService.completeTask(id, data, userId)

      res.json({
        success: true,
        data: task,
      })
    } catch (error) {
      logger.error('完成任务失败', { error, taskId: req.params.id })
      next(error)
    }
  }

  /**
   * 开始任务
   */
  async startTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user!.id

      const task = await taskService.startTask(id, userId)

      res.json({
        success: true,
        data: task,
      })
    } catch (error) {
      logger.error('开始任务失败', { error, taskId: req.params.id })
      next(error)
    }
  }

  /**
   * 拒绝任务
   */
  async rejectTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { reason } = req.body
      const userId = req.user!.id

      const task = await taskService.rejectTask(id, reason, userId)

      res.json({
        success: true,
        data: task,
      })
    } catch (error) {
      logger.error('拒绝任务失败', { error, taskId: req.params.id })
      next(error)
    }
  }

  /**
   * 获取用户的待办任务
   */
  async getUserPendingTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const page = req.query.page ? parseInt(req.query.page as string) : 1
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20

      const result = await taskService.getUserPendingTasks(userId, page, pageSize)

      res.json({
        success: true,
        data: result,
      })
    } catch (error) {
      logger.error('获取待办任务失败', { error })
      next(error)
    }
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.query.userId as string | undefined

      const statistics = await taskService.getTaskStatistics(userId)

      res.json({
        success: true,
        data: statistics,
      })
    } catch (error) {
      logger.error('获取任务统计失败', { error })
      next(error)
    }
  }

  /**
   * 批量分配任务
   */
  async batchAssignTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskIds, userId } = req.body

      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: '任务ID列表不能为空',
          },
        })
      }

      const count = await taskService.batchAssignTasks(taskIds, userId)

      res.json({
        success: true,
        data: {
          count,
          message: `成功分配 ${count} 个任务`,
        },
      })
    } catch (error) {
      logger.error('批量分配任务失败', { error })
      next(error)
    }
  }

  /**
   * 触发自动派工
   */
  async triggerAutoAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const result = await taskService.triggerAutoAssignment(id)

      res.json({
        success: true,
        data: result,
      })
    } catch (error) {
      logger.error('触发自动派工失败', { error, taskId: req.params.id })
      next(error)
    }
  }

  /**
   * 获取派工候选人
   */
  async getAssignmentCandidates(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const result = await taskService.getAssignmentCandidates(id)

      res.json({
        success: true,
        data: result,
      })
    } catch (error) {
      logger.error('获取派工候选人失败', { error, taskId: req.params.id })
      next(error)
    }
  }
}

export default new TaskController()
