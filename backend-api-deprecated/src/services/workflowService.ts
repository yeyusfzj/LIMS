/**
 * 工作流服务
 * 实现工作流配置管理、验证和版本控制
 */

import { PrismaClient, Workflow, WorkflowStatus } from '@prisma/client'
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowConfig,
  WorkflowNode,
  ValidationResult,
  ValidationError,
  NodeType,
  WorkflowQuery,
} from '../types/workflow'
import logger from '../config/logger'

const prisma = new PrismaClient()

export class WorkflowService {
  /**
   * 创建工作流配置
   */
  async createWorkflow(data: CreateWorkflowDto, userId: string): Promise<Workflow> {
    // 验证工作流配置
    const validation = this.validateWorkflow(data.config)
    if (!validation.isValid) {
      throw new Error(`工作流配置验证失败: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // 创建工作流
    const workflow = await prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        config: data.config as any,
        version: 1,
        status: WorkflowStatus.DRAFT,
        isActive: false,
        createdBy: userId,
      },
    })

    logger.info(`工作流已创建: ${workflow.id}`, { workflowId: workflow.id, userId })
    return workflow
  }

  /**
   * 更新工作流配置（创建新版本）
   */
  async updateWorkflow(id: string, data: UpdateWorkflowDto, userId: string): Promise<Workflow> {
    // 获取当前工作流
    const currentWorkflow = await prisma.workflow.findUnique({
      where: { id },
    })

    if (!currentWorkflow) {
      throw new Error('工作流不存在')
    }

    // 如果更新了配置，需要验证
    if (data.config) {
      const validation = this.validateWorkflow(data.config)
      if (!validation.isValid) {
        throw new Error(`工作流配置验证失败: ${validation.errors.map(e => e.message).join(', ')}`)
      }
    }

    // 如果配置有变化，创建新版本
    const shouldCreateNewVersion = data.config && JSON.stringify(data.config) !== JSON.stringify(currentWorkflow.config)

    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        config: data.config as any,
        status: data.status,
        isActive: data.isActive,
        version: shouldCreateNewVersion ? currentWorkflow.version + 1 : currentWorkflow.version,
        updatedAt: new Date(),
      },
    })

    logger.info(`工作流已更新: ${workflow.id}`, {
      workflowId: workflow.id,
      userId,
      newVersion: workflow.version,
    })

    return workflow
  }

  /**
   * 激活工作流
   */
  async activateWorkflow(id: string, userId: string): Promise<Workflow> {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    })

    if (!workflow) {
      throw new Error('工作流不存在')
    }

    // 验证工作流配置
    const validation = this.validateWorkflow(workflow.config as WorkflowConfig)
    if (!validation.isValid) {
      throw new Error(`无法激活工作流，配置验证失败: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // 停用其他同名工作流
    await prisma.workflow.updateMany({
      where: {
        name: workflow.name,
        isActive: true,
        id: { not: id },
      },
      data: {
        isActive: false,
        status: WorkflowStatus.INACTIVE,
      },
    })

    // 激活当前工作流
    const updatedWorkflow = await prisma.workflow.update({
      where: { id },
      data: {
        isActive: true,
        status: WorkflowStatus.ACTIVE,
        activatedAt: new Date(),
      },
    })

    logger.info(`工作流已激活: ${updatedWorkflow.id}`, { workflowId: updatedWorkflow.id, userId })
    return updatedWorkflow
  }

  /**
   * 停用工作流
   */
  async deactivateWorkflow(id: string, userId: string): Promise<Workflow> {
    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        isActive: false,
        status: WorkflowStatus.INACTIVE,
      },
    })

    logger.info(`工作流已停用: ${workflow.id}`, { workflowId: workflow.id, userId })
    return workflow
  }

  /**
   * 获取工作流详情
   */
  async getWorkflow(id: string): Promise<Workflow | null> {
    return prisma.workflow.findUnique({
      where: { id },
    })
  }

  /**
   * 查询工作流列表
   */
  async listWorkflows(query: WorkflowQuery) {
    const { status, isActive, search, page = 1, pageSize = 20 } = query
    const skip = (page - 1) * pageSize

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.workflow.count({ where }),
    ])

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * 验证工作流配置
   * 检测死循环、孤立节点等问题
   */
  validateWorkflow(config: WorkflowConfig): ValidationResult {
    const errors: ValidationError[] = []
    const { nodes, edges } = config

    // 1. 检查是否有开始节点
    const startNodes = nodes.filter(n => n.type === NodeType.START)
    if (startNodes.length === 0) {
      errors.push({
        type: 'MISSING_START',
        message: '工作流必须包含至少一个开始节点',
      })
    }

    // 2. 检查是否有结束节点
    const endNodes = nodes.filter(n => n.type === NodeType.END)
    if (endNodes.length === 0) {
      errors.push({
        type: 'MISSING_END',
        message: '工作流必须包含至少一个结束节点',
      })
    }

    // 3. 检查节点 ID 是否唯一
    const nodeIds = nodes.map(n => n.id)
    const duplicateIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index)
    if (duplicateIds.length > 0) {
      errors.push({
        type: 'DUPLICATE_NODE',
        message: `存在重复的节点 ID: ${duplicateIds.join(', ')}`,
        nodeIds: duplicateIds,
      })
    }

    // 4. 检查边的有效性（源节点和目标节点必须存在）
    const nodeIdSet = new Set(nodeIds)
    const invalidEdges = edges.filter(e => !nodeIdSet.has(e.source) || !nodeIdSet.has(e.target))
    if (invalidEdges.length > 0) {
      errors.push({
        type: 'INVALID_EDGE',
        message: `存在无效的边（源节点或目标节点不存在）`,
        edgeIds: invalidEdges.map(e => e.id),
      })
    }

    // 5. 检测孤立节点（没有入边也没有出边的节点，除了开始和结束节点）
    const isolatedNodes = this.findIsolatedNodes(nodes, edges)
    if (isolatedNodes.length > 0) {
      errors.push({
        type: 'ISOLATED_NODE',
        message: `存在孤立节点（没有连接到工作流）: ${isolatedNodes.map(n => n.name).join(', ')}`,
        nodeIds: isolatedNodes.map(n => n.id),
      })
    }

    // 6. 检测死循环
    const cycles = this.detectCycles(nodes, edges)
    if (cycles.length > 0) {
      errors.push({
        type: 'DEAD_LOOP',
        message: `存在死循环: ${cycles.map(c => c.join(' -> ')).join('; ')}`,
        nodeIds: cycles.flat(),
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * 查找孤立节点
   */
  private findIsolatedNodes(nodes: any[], edges: any[]): any[] {
    const connectedNodeIds = new Set<string>()

    // 收集所有连接的节点
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source)
      connectedNodeIds.add(edge.target)
    })

    // 找出未连接的节点（排除开始和结束节点）
    return nodes.filter(
      node =>
        !connectedNodeIds.has(node.id) &&
        node.type !== NodeType.START &&
        node.type !== NodeType.END
    )
  }

  /**
   * 检测循环（使用 DFS）
   */
  private detectCycles(nodes: any[], edges: any[]): string[][] {
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const path: string[] = []

    // 构建邻接表
    const adjacencyList = new Map<string, string[]>()
    nodes.forEach(node => adjacencyList.set(node.id, []))
    edges.forEach(edge => {
      const neighbors = adjacencyList.get(edge.source) || []
      neighbors.push(edge.target)
      adjacencyList.set(edge.source, neighbors)
    })

    // DFS 检测循环
    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId)
      recursionStack.add(nodeId)
      path.push(nodeId)

      const neighbors = adjacencyList.get(nodeId) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true
          }
        } else if (recursionStack.has(neighbor)) {
          // 找到循环
          const cycleStartIndex = path.indexOf(neighbor)
          const cycle = path.slice(cycleStartIndex)
          cycles.push([...cycle, neighbor])
          return true
        }
      }

      recursionStack.delete(nodeId)
      path.pop()
      return false
    }

    // 对每个节点执行 DFS
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id)
      }
    }

    return cycles
  }

  /**
   * 获取工作流历史版本
   */
  async getWorkflowVersions(name: string) {
    return prisma.workflow.findMany({
      where: { name },
      orderBy: { version: 'desc' },
    })
  }

  /**
   * 启动工作流实例
   */
  async startWorkflowInstance(sampleId: string, workflowId: string, userId: string) {
    // 检查样品是否存在
    const sample = await prisma.sample.findUnique({
      where: { id: sampleId },
    })

    if (!sample) {
      throw new Error('样品不存在')
    }

    // 检查样品是否已有工作流实例
    const existingInstance = await prisma.workflowInstance.findUnique({
      where: { sampleId },
    })

    if (existingInstance) {
      throw new Error('样品已有工作流实例')
    }

    // 获取工作流配置
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    })

    if (!workflow) {
      throw new Error('工作流不存在')
    }

    if (!workflow.isActive) {
      throw new Error('工作流未激活')
    }

    const config = workflow.config as WorkflowConfig

    // 找到开始节点
    const startNodes = config.nodes.filter(n => n.type === NodeType.START)
    if (startNodes.length === 0) {
      throw new Error('工作流没有开始节点')
    }

    // 创建工作流实例
    const instance = await prisma.workflowInstance.create({
      data: {
        workflowId,
        sampleId,
        currentNodes: startNodes.map(n => n.id),
        status: 'RUNNING',
        variables: {},
        startedAt: new Date(),
      },
    })

    // 为开始节点创建任务
    for (const startNode of startNodes) {
      await this.createTaskForNode(instance.id, startNode, userId)
    }

    logger.info(`工作流实例已启动: ${instance.id}`, {
      instanceId: instance.id,
      workflowId,
      sampleId,
      userId,
    })

    return instance
  }

  /**
   * 为节点创建任务
   */
  private async createTaskForNode(instanceId: string, node: WorkflowNode, userId?: string) {
    const task = await prisma.task.create({
      data: {
        instanceId,
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        status: 'PENDING',
        priority: 'NORMAL',
        assignedTo: userId,
        assignedAt: userId ? new Date() : null,
      },
    })

    logger.info(`任务已创建: ${task.id}`, {
      taskId: task.id,
      instanceId,
      nodeId: node.id,
      nodeName: node.name,
    })

    return task
  }

  /**
   * 完成节点
   */
  async completeNode(instanceId: string, nodeId: string, userId: string, result?: any) {
    // 获取工作流实例
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: true,
        tasks: true,
      },
    })

    if (!instance) {
      throw new Error('工作流实例不存在')
    }

    if (instance.status !== 'RUNNING') {
      throw new Error('工作流实例未运行')
    }

    // 检查节点是否在当前节点列表中
    if (!instance.currentNodes.includes(nodeId)) {
      throw new Error('节点不在当前节点列表中')
    }

    // 完成该节点的任务
    await prisma.task.updateMany({
      where: {
        instanceId,
        nodeId,
        status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: result || {},
      },
    })

    const config = instance.workflow.config as WorkflowConfig

    // 找到当前节点
    const currentNode = config.nodes.find(n => n.id === nodeId)
    if (!currentNode) {
      throw new Error('节点不存在')
    }

    // 从当前节点列表中移除该节点
    const updatedCurrentNodes = instance.currentNodes.filter(id => id !== nodeId)

    // 找到下一个节点
    const nextNodeIds = this.getNextNodes(config, nodeId, result)

    // 添加下一个节点到当前节点列表
    updatedCurrentNodes.push(...nextNodeIds)

    // 检查是否到达结束节点
    const isCompleted = nextNodeIds.length === 0 || nextNodeIds.every(id => {
      const node = config.nodes.find(n => n.id === id)
      return node?.type === NodeType.END
    })

    // 更新工作流实例
    const updatedInstance = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        currentNodes: updatedCurrentNodes,
        status: isCompleted ? 'COMPLETED' : 'RUNNING',
        completedAt: isCompleted ? new Date() : null,
      },
    })

    // 为下一个节点创建任务
    for (const nextNodeId of nextNodeIds) {
      const nextNode = config.nodes.find(n => n.id === nextNodeId)
      if (nextNode && nextNode.type !== NodeType.END) {
        await this.createTaskForNode(instanceId, nextNode)
      }
    }

    logger.info(`节点已完成: ${nodeId}`, {
      instanceId,
      nodeId,
      nextNodeIds,
      isCompleted,
      userId,
    })

    return updatedInstance
  }

  /**
   * 获取下一个节点
   */
  private getNextNodes(config: WorkflowConfig, currentNodeId: string, result?: any): string[] {
    const outgoingEdges = config.edges.filter(e => e.source === currentNodeId)

    // 如果没有出边，说明到达结束
    if (outgoingEdges.length === 0) {
      return []
    }

    // 如果有条件边，需要评估条件
    const nextNodeIds: string[] = []
    for (const edge of outgoingEdges) {
      if (edge.condition) {
        // 简单的条件评估（实际应该使用更安全的表达式引擎）
        try {
          const conditionMet = this.evaluateCondition(edge.condition, result)
          if (conditionMet) {
            nextNodeIds.push(edge.target)
          }
        } catch (error) {
          logger.error(`条件评估失败: ${edge.condition}`, { error })
        }
      } else {
        // 无条件边，直接添加
        nextNodeIds.push(edge.target)
      }
    }

    return nextNodeIds
  }

  /**
   * 评估条件表达式
   * 简单实现，实际应该使用更安全的表达式引擎
   */
  private evaluateCondition(condition: string, context?: any): boolean {
    // 这里只是一个简单的实现
    // 实际应该使用 expr-eval 或其他安全的表达式引擎
    try {
      // 简单的相等判断
      if (condition.includes('==')) {
        const [left, right] = condition.split('==').map(s => s.trim())
        const leftValue = context?.[left]
        const rightValue = right.replace(/['"]/g, '')
        return leftValue === rightValue
      }
      return true
    } catch (error) {
      logger.error('条件评估错误', { condition, error })
      return false
    }
  }

  /**
   * 获取当前节点
   */
  async getCurrentNodes(instanceId: string) {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: true,
      },
    })

    if (!instance) {
      throw new Error('工作流实例不存在')
    }

    const config = instance.workflow.config as WorkflowConfig
    const currentNodes = config.nodes.filter(n => instance.currentNodes.includes(n.id))

    return currentNodes
  }

  /**
   * 获取工作流实例详情
   */
  async getWorkflowInstance(instanceId: string) {
    return prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: true,
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  /**
   * 更新工作流变量
   */
  async updateWorkflowVariables(instanceId: string, variables: Record<string, any>) {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    })

    if (!instance) {
      throw new Error('工作流实例不存在')
    }

    // 合并变量
    const currentVariables = (instance.variables as Record<string, any>) || {}
    const updatedVariables = { ...currentVariables, ...variables }

    const updatedInstance = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        variables: updatedVariables,
      },
    })

    logger.info(`工作流变量已更新: ${instanceId}`, {
      instanceId,
      variables: updatedVariables,
    })

    return updatedInstance
  }

  /**
   * 获取工作流变量
   */
  async getWorkflowVariables(instanceId: string): Promise<Record<string, any>> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      select: { variables: true },
    })

    if (!instance) {
      throw new Error('工作流实例不存在')
    }

    return (instance.variables as Record<string, any>) || {}
  }

  /**
   * 暂停工作流实例
   */
  async suspendWorkflowInstance(instanceId: string, userId: string) {
    const instance = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: 'SUSPENDED',
      },
    })

    logger.info(`工作流实例已暂停: ${instanceId}`, { instanceId, userId })
    return instance
  }

  /**
   * 恢复工作流实例
   */
  async resumeWorkflowInstance(instanceId: string, userId: string) {
    const instance = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: 'RUNNING',
      },
    })

    logger.info(`工作流实例已恢复: ${instanceId}`, { instanceId, userId })
    return instance
  }

  /**
   * 终止工作流实例
   */
  async terminateWorkflowInstance(instanceId: string, userId: string, reason?: string) {
    const instance = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: 'TERMINATED',
        completedAt: new Date(),
      },
    })

    // 取消所有未完成的任务
    await prisma.task.updateMany({
      where: {
        instanceId,
        status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
      },
      data: {
        status: 'REJECTED',
      },
    })

    logger.info(`工作流实例已终止: ${instanceId}`, { instanceId, userId, reason })
    return instance
  }
}

export default new WorkflowService()
