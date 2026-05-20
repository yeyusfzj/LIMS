/**
 * 工作流控制器
 */

import { Request, Response, NextFunction } from 'express'
import workflowService from '../services/workflowService'
import { CreateWorkflowDto, UpdateWorkflowDto, WorkflowQuery } from '../types/workflow'
import logger from '../config/logger'

export class WorkflowController {
  /**
   * 创建工作流
   */
  async createWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreateWorkflowDto = req.body
      const userId = (req as any).user.userId

      const workflow = await workflowService.createWorkflow(data, userId)

      res.status(201).json({
        success: true,
        data: workflow,
      })
    } catch (error) {
      logger.error('创建工作流失败', { error })
      next(error)
    }
  }

  /**
   * 更新工作流
   */
  async updateWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const data: UpdateWorkflowDto = req.body
      const userId = (req as any).user.userId

      const workflow = await workflowService.updateWorkflow(id, data, userId)

      res.json({
        success: true,
        data: workflow,
      })
    } catch (error) {
      logger.error('更新工作流失败', { error, workflowId: req.params.id })
      next(error)
    }
  }

  /**
   * 获取工作流详情
   */
  async getWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const workflow = await workflowService.getWorkflow(id)

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: '工作流不存在',
          },
        })
      }

      res.json({
        success: true,
        data: workflow,
      })
    } catch (error) {
      logger.error('获取工作流失败', { error, workflowId: req.params.id })
      next(error)
    }
  }

  /**
   * 查询工作流列表
   */
  async listWorkflows(req: Request, res: Response, next: NextFunction) {
    try {
      const query: WorkflowQuery = {
        status: req.query.status as any,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      }

      const result = await workflowService.listWorkflows(query)

      res.json({
        success: true,
        data: result,
      })
    } catch (error) {
      logger.error('查询工作流列表失败', { error })
      next(error)
    }
  }

  /**
   * 验证工作流配置
   */
  async validateWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const { config } = req.body

      const validation = workflowService.validateWorkflow(config)

      res.json({
        success: true,
        data: validation,
      })
    } catch (error) {
      logger.error('验证工作流配置失败', { error })
      next(error)
    }
  }

  /**
   * 激活工作流
   */
  async activateWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = (req as any).user.userId

      const workflow = await workflowService.activateWorkflow(id, userId)

      res.json({
        success: true,
        data: workflow,
      })
    } catch (error) {
      logger.error('激活工作流失败', { error, workflowId: req.params.id })
      next(error)
    }
  }

  /**
   * 停用工作流
   */
  async deactivateWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = (req as any).user.userId

      const workflow = await workflowService.deactivateWorkflow(id, userId)

      res.json({
        success: true,
        data: workflow,
      })
    } catch (error) {
      logger.error('停用工作流失败', { error, workflowId: req.params.id })
      next(error)
    }
  }

  /**
   * 获取工作流历史版本
   */
  async getWorkflowVersions(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.params

      const versions = await workflowService.getWorkflowVersions(name)

      res.json({
        success: true,
        data: versions,
      })
    } catch (error) {
      logger.error('获取工作流版本失败', { error, workflowName: req.params.name })
      next(error)
    }
  }

  /**
   * 启动工作流实例
   */
  async startWorkflowInstance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: workflowId } = req.params
      const { sampleId } = req.body
      const userId = (req as any).user.userId

      const instance = await workflowService.startWorkflowInstance(sampleId, workflowId, userId)

      res.status(201).json({
        success: true,
        data: instance,
      })
    } catch (error) {
      logger.error('启动工作流实例失败', { error, workflowId: req.params.id })
      next(error)
    }
  }

  /**
   * 获取工作流实例详情
   */
  async getWorkflowInstance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const instance = await workflowService.getWorkflowInstance(id)

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'INSTANCE_NOT_FOUND',
            message: '工作流实例不存在',
          },
        })
      }

      res.json({
        success: true,
        data: instance,
      })
    } catch (error) {
      logger.error('获取工作流实例失败', { error, instanceId: req.params.id })
      next(error)
    }
  }

  /**
   * 获取当前节点
   */
  async getCurrentNodes(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const currentNodes = await workflowService.getCurrentNodes(id)

      res.json({
        success: true,
        data: currentNodes,
      })
    } catch (error) {
      logger.error('获取当前节点失败', { error, instanceId: req.params.id })
      next(error)
    }
  }

  /**
   * 完成节点
   */
  async completeNode(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: instanceId, nodeId } = req.params
      const { result } = req.body
      const userId = (req as any).user.userId

      const instance = await workflowService.completeNode(instanceId, nodeId, userId, result)

      res.json({
        success: true,
        data: instance,
      })
    } catch (error) {
      logger.error('完成节点失败', { error, instanceId: req.params.id, nodeId: req.params.nodeId })
      next(error)
    }
  }

  /**
   * 获取工作流变量
   */
  async getWorkflowVariables(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const variables = await workflowService.getWorkflowVariables(id)

      res.json({
        success: true,
        data: variables,
      })
    } catch (error) {
      logger.error('获取工作流变量失败', { error, instanceId: req.params.id })
      next(error)
    }
  }

  /**
   * 更新工作流变量
   */
  async updateWorkflowVariables(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { variables } = req.body

      const instance = await workflowService.updateWorkflowVariables(id, variables)

      res.json({
        success: true,
        data: instance,
      })
    } catch (error) {
      logger.error('更新工作流变量失败', { error, instanceId: req.params.id })
      next(error)
    }
  }

  /**
   * 暂停工作流实例
   */
  async suspendWorkflowInstance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = (req as any).user.userId

      const instance = await workflowService.suspendWorkflowInstance(id, userId)

      res.json({
        success: true,
        data: instance,
      })
    } catch (error) {
      logger.error('暂停工作流实例失败', { error, instanceId: req.params.id })
      next(error)
    }
  }

  /**
   * 恢复工作流实例
   */
  async resumeWorkflowInstance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = (req as any).user.userId

      const instance = await workflowService.resumeWorkflowInstance(id, userId)

      res.json({
        success: true,
        data: instance,
      })
    } catch (error) {
      logger.error('恢复工作流实例失败', { error, instanceId: req.params.id })
      next(error)
    }
  }

  /**
   * 终止工作流实例
   */
  async terminateWorkflowInstance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { reason } = req.body
      const userId = (req as any).user.userId

      const instance = await workflowService.terminateWorkflowInstance(id, userId, reason)

      res.json({
        success: true,
        data: instance,
      })
    } catch (error) {
      logger.error('终止工作流实例失败', { error, instanceId: req.params.id })
      next(error)
    }
  }
}

export default new WorkflowController()
