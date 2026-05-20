/**
 * 任务验证器
 */

import Joi from 'joi'
import { TaskStatus, Priority } from '@prisma/client'

/**
 * 创建任务验证规则
 */
export const createTaskSchema = Joi.object({
  instanceId: Joi.string().uuid().required().messages({
    'string.empty': '工作流实例ID不能为空',
    'string.guid': '工作流实例ID格式不正确',
    'any.required': '工作流实例ID是必填项',
  }),
  nodeId: Joi.string().required().messages({
    'string.empty': '节点ID不能为空',
    'any.required': '节点ID是必填项',
  }),
  nodeName: Joi.string().required().messages({
    'string.empty': '节点名称不能为空',
    'any.required': '节点名称是必填项',
  }),
  nodeType: Joi.string().required().messages({
    'string.empty': '节点类型不能为空',
    'any.required': '节点类型是必填项',
  }),
  assignedTo: Joi.string().uuid().optional().messages({
    'string.guid': '用户ID格式不正确',
  }),
  priority: Joi.string()
    .valid(...Object.values(Priority))
    .optional()
    .messages({
      'any.only': '优先级必须是 LOW, NORMAL, HIGH, URGENT 之一',
    }),
})

/**
 * 更新任务验证规则
 */
export const updateTaskSchema = Joi.object({
  assignedTo: Joi.string().uuid().optional().messages({
    'string.guid': '用户ID格式不正确',
  }),
  status: Joi.string()
    .valid(...Object.values(TaskStatus))
    .optional()
    .messages({
      'any.only': '任务状态必须是有效值',
    }),
  priority: Joi.string()
    .valid(...Object.values(Priority))
    .optional()
    .messages({
      'any.only': '优先级必须是 LOW, NORMAL, HIGH, URGENT 之一',
    }),
  result: Joi.object().optional(),
})

/**
 * 完成任务验证规则
 */
export const completeTaskSchema = Joi.object({
  result: Joi.object().optional(),
})

/**
 * 分配任务验证规则
 */
export const assignTaskSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    'string.empty': '用户ID不能为空',
    'string.guid': '用户ID格式不正确',
    'any.required': '用户ID是必填项',
  }),
})

/**
 * 拒绝任务验证规则
 */
export const rejectTaskSchema = Joi.object({
  reason: Joi.string().required().messages({
    'string.empty': '拒绝原因不能为空',
    'any.required': '拒绝原因是必填项',
  }),
})

/**
 * 任务查询验证规则
 */
export const taskQuerySchema = Joi.object({
  instanceId: Joi.string().uuid().optional(),
  assignedTo: Joi.string().uuid().optional(),
  status: Joi.string()
    .valid(...Object.values(TaskStatus))
    .optional(),
  priority: Joi.string()
    .valid(...Object.values(Priority))
    .optional(),
  nodeType: Joi.string().optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  pageSize: Joi.number().integer().min(1).max(100).optional().default(20),
})

/**
 * 批量分配任务验证规则
 */
export const batchAssignTasksSchema = Joi.object({
  taskIds: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .required()
    .messages({
      'array.min': '至少需要一个任务ID',
      'any.required': '任务ID列表是必填项',
    }),
  userId: Joi.string().uuid().required().messages({
    'string.empty': '用户ID不能为空',
    'string.guid': '用户ID格式不正确',
    'any.required': '用户ID是必填项',
  }),
})
