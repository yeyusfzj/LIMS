/**
 * 工作流路由
 */

import { Router } from 'express'
import workflowController from '../controllers/workflowController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'
import { validateRequest } from '../middleware/validateRequest'
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  workflowQuerySchema,
} from '../validators/workflowValidator'

const router = Router()

// 所有工作流路由都需要认证
router.use(authenticate)

/**
 * POST /api/workflows
 * 创建工作流
 */
router.post(
  '/',
  requirePermission('workflow', 'create'),
  validateRequest(createWorkflowSchema),
  workflowController.createWorkflow
)

/**
 * GET /api/workflows
 * 查询工作流列表
 */
router.get(
  '/',
  requirePermission('workflow', 'read'),
  validateRequest(workflowQuerySchema, 'query'),
  workflowController.listWorkflows
)

/**
 * GET /api/workflows/:id
 * 获取工作流详情
 */
router.get(
  '/:id',
  requirePermission('workflow', 'read'),
  workflowController.getWorkflow
)

/**
 * PUT /api/workflows/:id
 * 更新工作流
 */
router.put(
  '/:id',
  requirePermission('workflow', 'update'),
  validateRequest(updateWorkflowSchema),
  workflowController.updateWorkflow
)

/**
 * POST /api/workflows/:id/validate
 * 验证工作流配置
 */
router.post(
  '/:id/validate',
  requirePermission('workflow', 'read'),
  workflowController.validateWorkflow
)

/**
 * POST /api/workflows/:id/activate
 * 激活工作流
 */
router.post(
  '/:id/activate',
  requirePermission('workflow', 'update'),
  workflowController.activateWorkflow
)

/**
 * POST /api/workflows/:id/deactivate
 * 停用工作流
 */
router.post(
  '/:id/deactivate',
  requirePermission('workflow', 'update'),
  workflowController.deactivateWorkflow
)

/**
 * GET /api/workflows/versions/:name
 * 获取工作流历史版本
 */
router.get(
  '/versions/:name',
  requirePermission('workflow', 'read'),
  workflowController.getWorkflowVersions
)

/**
 * POST /api/workflows/:id/instances
 * 启动工作流实例
 */
router.post(
  '/:id/instances',
  requirePermission('workflow', 'execute'),
  workflowController.startWorkflowInstance
)

/**
 * GET /api/workflow-instances/:id
 * 获取工作流实例详情
 */
router.get(
  '/instances/:id',
  requirePermission('workflow', 'read'),
  workflowController.getWorkflowInstance
)

/**
 * GET /api/workflow-instances/:id/current-nodes
 * 获取当前节点
 */
router.get(
  '/instances/:id/current-nodes',
  requirePermission('workflow', 'read'),
  workflowController.getCurrentNodes
)

/**
 * POST /api/workflow-instances/:id/nodes/:nodeId/complete
 * 完成节点
 */
router.post(
  '/instances/:id/nodes/:nodeId/complete',
  requirePermission('workflow', 'execute'),
  workflowController.completeNode
)

/**
 * GET /api/workflow-instances/:id/variables
 * 获取工作流变量
 */
router.get(
  '/instances/:id/variables',
  requirePermission('workflow', 'read'),
  workflowController.getWorkflowVariables
)

/**
 * PUT /api/workflow-instances/:id/variables
 * 更新工作流变量
 */
router.put(
  '/instances/:id/variables',
  requirePermission('workflow', 'execute'),
  workflowController.updateWorkflowVariables
)

/**
 * POST /api/workflow-instances/:id/suspend
 * 暂停工作流实例
 */
router.post(
  '/instances/:id/suspend',
  requirePermission('workflow', 'execute'),
  workflowController.suspendWorkflowInstance
)

/**
 * POST /api/workflow-instances/:id/resume
 * 恢复工作流实例
 */
router.post(
  '/instances/:id/resume',
  requirePermission('workflow', 'execute'),
  workflowController.resumeWorkflowInstance
)

/**
 * POST /api/workflow-instances/:id/terminate
 * 终止工作流实例
 */
router.post(
  '/instances/:id/terminate',
  requirePermission('workflow', 'execute'),
  workflowController.terminateWorkflowInstance
)

export default router
