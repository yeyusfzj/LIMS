/**
 * 工作流验证器
 */

import Joi from 'joi'
import { NodeType } from '../types/workflow'

/**
 * 工作流节点验证 schema
 */
const nodeSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string()
    .valid(...Object.values(NodeType))
    .required(),
  name: Joi.string().required(),
  description: Joi.string().optional(),
  config: Joi.object().optional(),
})

/**
 * 工作流边验证 schema
 */
const edgeSchema = Joi.object({
  id: Joi.string().required(),
  source: Joi.string().required(),
  target: Joi.string().required(),
  condition: Joi.string().optional(),
  label: Joi.string().optional(),
})

/**
 * 工作流配置验证 schema
 */
const workflowConfigSchema = Joi.object({
  nodes: Joi.array().items(nodeSchema).min(2).required(),
  edges: Joi.array().items(edgeSchema).min(1).required(),
})

/**
 * 创建工作流验证 schema
 */
export const createWorkflowSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  config: workflowConfigSchema.required(),
})

/**
 * 更新工作流验证 schema
 */
export const updateWorkflowSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  config: workflowConfigSchema.optional(),
  status: Joi.string().valid('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED').optional(),
  isActive: Joi.boolean().optional(),
})

/**
 * 工作流查询验证 schema
 */
export const workflowQuerySchema = Joi.object({
  status: Joi.string().valid('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED').optional(),
  isActive: Joi.string().valid('true', 'false').optional(),
  search: Joi.string().optional(),
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(100).optional(),
})
