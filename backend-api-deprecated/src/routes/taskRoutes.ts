/**
 * 任务路由
 */

import { Router } from 'express'
import taskController from '../controllers/taskController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'
import { validateRequest } from '../middleware/validateRequest'
import {
  createTaskSchema,
  updateTaskSchema,
  completeTaskSchema,
  assignTaskSchema,
  rejectTaskSchema,
  taskQuerySchema,
  batchAssignTasksSchema,
} from '../validators/taskValidator'

const router = Router()

// 所有任务路由都需要认证
router.use(authenticate)

/**
 * POST /api/tasks
 * 创建任务
 */
router.post(
  '/',
  requirePermission('task', 'create'),
  validateRequest(createTaskSchema),
  taskController.createTask
)

/**
 * GET /api/tasks
 * 查询任务列表
 */
router.get(
  '/',
  requirePermission('task', 'read'),
  validateRequest(taskQuerySchema, 'query'),
  taskController.listTasks
)

/**
 * GET /api/tasks/pending
 * 获取当前用户的待办任务
 */
router.get(
  '/pending',
  authenticate,
  taskController.getUserPendingTasks
)

/**
 * GET /api/tasks/statistics
 * 获取任务统计信息
 */
router.get(
  '/statistics',
  requirePermission('task', 'read'),
  taskController.getTaskStatistics
)

/**
 * GET /api/tasks/:id
 * 获取任务详情
 */
router.get(
  '/:id',
  requirePermission('task', 'read'),
  taskController.getTask
)

/**
 * PUT /api/tasks/:id
 * 更新任务
 */
router.put(
  '/:id',
  requirePermission('task', 'update'),
  validateRequest(updateTaskSchema),
  taskController.updateTask
)

/**
 * POST /api/tasks/:id/assign
 * 分配任务
 */
router.post(
  '/:id/assign',
  requirePermission('task', 'assign'),
  validateRequest(assignTaskSchema),
  taskController.assignTask
)

/**
 * POST /api/tasks/:id/start
 * 开始任务
 */
router.post(
  '/:id/start',
  authenticate,
  taskController.startTask
)

/**
 * POST /api/tasks/:id/complete
 * 完成任务
 */
router.post(
  '/:id/complete',
  authenticate,
  validateRequest(completeTaskSchema),
  taskController.completeTask
)

/**
 * POST /api/tasks/:id/reject
 * 拒绝任务
 */
router.post(
  '/:id/reject',
  authenticate,
  validateRequest(rejectTaskSchema),
  taskController.rejectTask
)

/**
 * POST /api/tasks/batch-assign
 * 批量分配任务
 */
router.post(
  '/batch-assign',
  requirePermission('task', 'assign'),
  validateRequest(batchAssignTasksSchema),
  taskController.batchAssignTasks
)

/**
 * POST /api/tasks/:id/auto-assign
 * 触发自动派工
 */
router.post(
  '/:id/auto-assign',
  requirePermission('task', 'assign'),
  taskController.triggerAutoAssignment
)

/**
 * GET /api/tasks/:id/candidates
 * 获取派工候选人
 */
router.get(
  '/:id/candidates',
  requirePermission('task', 'read'),
  taskController.getAssignmentCandidates
)

export default router
