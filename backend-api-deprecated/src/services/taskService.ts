/**
 * 任务管理服务
 * 实现任务创建、查询、分配和完成功能
 */

import { PrismaClient, Task, TaskStatus, Priority } from '@prisma/client'
import {
  CreateTaskDto,
  UpdateTaskDto,
  CompleteTaskDto,
  TaskQuery,
  AssignTaskDto,
} from '../types/task'
import { AssignmentContext } from '../types/assignment'
import logger from '../config/logger'
import assignmentEngine from './assignmentEngine'

const prisma = new PrismaClient()

export class TaskService {
  /**
   * 创建任务
   */
  async createTask(data: CreateTaskDto): Promise<Task> {
    // 验证工作流实例是否存在
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: data.instanceId },
      include: {
        sample: true,
      },
    })

    if (!instance) {
      throw new Error('工作流实例不存在')
    }

    // 创建任务
    const task = await prisma.task.create({
      data: {
        instanceId: data.instanceId,
        nodeId: data.nodeId,
        nodeName: data.nodeName,
        nodeType: data.nodeType,
        assignedTo: data.assignedTo,
        assignedAt: data.assignedTo ? new Date() : null,
        status: data.assignedTo ? TaskStatus.ASSIGNED : TaskStatus.PENDING,
        priority: data.priority || Priority.NORMAL,
      },
    })

    logger.info(`任务已创建: ${task.id}`, {
      taskId: task.id,
      instanceId: data.instanceId,
      nodeId: data.nodeId,
      assignedTo: data.assignedTo,
    })

    // 如果没有指定分配人员，尝试自动派工
    if (!data.assignedTo) {
      try {
        const assignmentContext: AssignmentContext = {
          taskId: task.id,
          nodeType: data.nodeType,
          nodeName: data.nodeName,
          priority: data.priority || Priority.NORMAL,
          sampleId: instance.sampleId,
          sampleType: instance.sample?.sampleType,
          sampleCategory: instance.sample?.sampleCategory,
          workflowId: instance.workflowId,
          instanceId: instance.id,
        }

        const result = await assignmentEngine.autoAssign(assignmentContext)
        
        if (result.success) {
          logger.info(`任务自动派工成功: ${task.id} -> ${result.assignedUser?.username}`)
        } else {
          logger.warn(`任务自动派工失败: ${task.id}`, { reason: result.reason })
        }
      } catch (error) {
        logger.error(`任务自动派工异常: ${task.id}`, { error })
      }
    }

    return task
  }

  /**
   * 获取任务详情
   */
  async getTask(id: string): Promise<Task | null> {
    return prisma.task.findUnique({
      where: { id },
      include: {
        instance: {
          include: {
            workflow: true,
            sample: true,
          },
        },
      },
    })
  }

  /**
   * 查询任务列表（支持分页和过滤）
   */
  async listTasks(query: TaskQuery) {
    const {
      instanceId,
      assignedTo,
      status,
      priority,
      nodeType,
      page = 1,
      pageSize = 20,
    } = query

    const skip = (page - 1) * pageSize

    // 构建查询条件
    const where: any = {}

    if (instanceId) {
      where.instanceId = instanceId
    }

    if (assignedTo) {
      where.assignedTo = assignedTo
    }

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (nodeType) {
      where.nodeType = nodeType
    }

    // 查询任务列表和总数
    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { priority: 'desc' }, // 优先级高的在前
          { createdAt: 'desc' }, // 创建时间新的在前
        ],
        include: {
          instance: {
            include: {
              workflow: true,
              sample: true,
            },
          },
        },
      }),
      prisma.task.count({ where }),
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
   * 分配任务
   */
  async assignTask(id: string, data: AssignTaskDto): Promise<Task> {
    // 获取任务
    const task = await prisma.task.findUnique({
      where: { id },
    })

    if (!task) {
      throw new Error('任务不存在')
    }

    // 检查任务状态
    if (task.status === TaskStatus.COMPLETED) {
      throw new Error('任务已完成，无法重新分配')
    }

    if (task.status === TaskStatus.REJECTED) {
      throw new Error('任务已拒绝，无法重新分配')
    }

    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    // 更新任务分配
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        assignedTo: data.userId,
        assignedAt: new Date(),
        status: TaskStatus.ASSIGNED,
      },
      include: {
        instance: {
          include: {
            workflow: true,
            sample: true,
          },
        },
      },
    })

    logger.info(`任务已分配: ${id}`, {
      taskId: id,
      assignedTo: data.userId,
    })

    return updatedTask
  }

  /**
   * 更新任务
   */
  async updateTask(id: string, data: UpdateTaskDto): Promise<Task> {
    // 获取任务
    const task = await prisma.task.findUnique({
      where: { id },
    })

    if (!task) {
      throw new Error('任务不存在')
    }

    // 检查任务状态
    if (task.status === TaskStatus.COMPLETED) {
      throw new Error('任务已完成，无法修改')
    }

    // 更新任务
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        assignedTo: data.assignedTo,
        assignedAt: data.assignedTo && !task.assignedTo ? new Date() : task.assignedAt,
        status: data.status,
        priority: data.priority,
        result: data.result as any,
      },
      include: {
        instance: {
          include: {
            workflow: true,
            sample: true,
          },
        },
      },
    })

    logger.info(`任务已更新: ${id}`, {
      taskId: id,
      updates: data,
    })

    return updatedTask
  }

  /**
   * 完成任务
   */
  async completeTask(id: string, data: CompleteTaskDto, userId: string): Promise<Task> {
    // 获取任务
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        instance: true,
      },
    })

    if (!task) {
      throw new Error('任务不存在')
    }

    // 检查任务状态
    if (task.status === TaskStatus.COMPLETED) {
      throw new Error('任务已完成')
    }

    if (task.status === TaskStatus.REJECTED) {
      throw new Error('任务已拒绝，无法完成')
    }

    // 检查任务是否分配给当前用户
    if (task.assignedTo && task.assignedTo !== userId) {
      throw new Error('任务未分配给当前用户')
    }

    // 更新任务状态为完成
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.COMPLETED,
        result: data.result as any,
        completedAt: new Date(),
      },
      include: {
        instance: {
          include: {
            workflow: true,
            sample: true,
          },
        },
      },
    })

    logger.info(`任务已完成: ${id}`, {
      taskId: id,
      userId,
      result: data.result,
    })

    return updatedTask
  }

  /**
   * 开始任务（将状态从 ASSIGNED 改为 IN_PROGRESS）
   */
  async startTask(id: string, userId: string): Promise<Task> {
    // 获取任务
    const task = await prisma.task.findUnique({
      where: { id },
    })

    if (!task) {
      throw new Error('任务不存在')
    }

    // 检查任务状态
    if (task.status !== TaskStatus.ASSIGNED && task.status !== TaskStatus.PENDING) {
      throw new Error('任务状态不正确，无法开始')
    }

    // 检查任务是否分配给当前用户
    if (task.assignedTo && task.assignedTo !== userId) {
      throw new Error('任务未分配给当前用户')
    }

    // 如果任务未分配，先分配给当前用户
    const updateData: any = {
      status: TaskStatus.IN_PROGRESS,
    }

    if (!task.assignedTo) {
      updateData.assignedTo = userId
      updateData.assignedAt = new Date()
    }

    // 更新任务状态
    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        instance: {
          include: {
            workflow: true,
            sample: true,
          },
        },
      },
    })

    logger.info(`任务已开始: ${id}`, {
      taskId: id,
      userId,
    })

    return updatedTask
  }

  /**
   * 拒绝任务
   */
  async rejectTask(id: string, reason: string, userId: string): Promise<Task> {
    // 获取任务
    const task = await prisma.task.findUnique({
      where: { id },
    })

    if (!task) {
      throw new Error('任务不存在')
    }

    // 检查任务状态
    if (task.status === TaskStatus.COMPLETED) {
      throw new Error('任务已完成，无法拒绝')
    }

    if (task.status === TaskStatus.REJECTED) {
      throw new Error('任务已拒绝')
    }

    // 检查任务是否分配给当前用户
    if (task.assignedTo && task.assignedTo !== userId) {
      throw new Error('任务未分配给当前用户')
    }

    // 更新任务状态为拒绝
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.REJECTED,
        result: { reason } as any,
        completedAt: new Date(),
      },
      include: {
        instance: {
          include: {
            workflow: true,
            sample: true,
          },
        },
      },
    })

    logger.info(`任务已拒绝: ${id}`, {
      taskId: id,
      userId,
      reason,
    })

    return updatedTask
  }

  /**
   * 获取用户的待办任务
   */
  async getUserPendingTasks(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize

    const where = {
      assignedTo: userId,
      status: {
        in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS],
      },
    }

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          instance: {
            include: {
              workflow: true,
              sample: true,
            },
          },
        },
      }),
      prisma.task.count({ where }),
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
   * 获取任务统计信息
   */
  async getTaskStatistics(userId?: string) {
    const where: any = userId ? { assignedTo: userId } : {}

    const [
      totalTasks,
      pendingTasks,
      assignedTasks,
      inProgressTasks,
      completedTasks,
      rejectedTasks,
    ] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: TaskStatus.PENDING } }),
      prisma.task.count({ where: { ...where, status: TaskStatus.ASSIGNED } }),
      prisma.task.count({ where: { ...where, status: TaskStatus.IN_PROGRESS } }),
      prisma.task.count({ where: { ...where, status: TaskStatus.COMPLETED } }),
      prisma.task.count({ where: { ...where, status: TaskStatus.REJECTED } }),
    ])

    return {
      total: totalTasks,
      pending: pendingTasks,
      assigned: assignedTasks,
      inProgress: inProgressTasks,
      completed: completedTasks,
      rejected: rejectedTasks,
    }
  }

  /**
   * 批量分配任务
   */
  async batchAssignTasks(taskIds: string[], userId: string): Promise<number> {
    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    // 批量更新任务
    const result = await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        status: { in: [TaskStatus.PENDING, TaskStatus.ASSIGNED] },
      },
      data: {
        assignedTo: userId,
        assignedAt: new Date(),
        status: TaskStatus.ASSIGNED,
      },
    })

    logger.info(`批量分配任务: ${result.count} 个任务`, {
      taskIds,
      assignedTo: userId,
      count: result.count,
    })

    return result.count
  }

  /**
   * 手动触发自动派工
   */
  async triggerAutoAssignment(taskId: string): Promise<any> {
    // 获取任务详情
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        instance: {
          include: {
            sample: true,
          },
        },
      },
    })

    if (!task) {
      throw new Error('任务不存在')
    }

    // 检查任务状态
    if (task.status !== TaskStatus.PENDING) {
      throw new Error('只能对待分配状态的任务进行自动派工')
    }

    if (task.assignedTo) {
      throw new Error('任务已分配，无需自动派工')
    }

    // 构建派工上下文
    const assignmentContext: AssignmentContext = {
      taskId: task.id,
      nodeType: task.nodeType,
      nodeName: task.nodeName,
      priority: task.priority,
      sampleId: task.instance.sampleId,
      sampleType: task.instance.sample?.sampleType,
      sampleCategory: task.instance.sample?.sampleCategory,
      workflowId: task.instance.workflowId,
      instanceId: task.instanceId,
    }

    // 执行自动派工
    const result = await assignmentEngine.autoAssign(assignmentContext)

    logger.info(`手动触发自动派工: ${taskId}`, {
      taskId,
      success: result.success,
      assignedTo: result.assignedTo,
    })

    return result
  }

  /**
   * 获取任务的派工候选人
   */
  async getAssignmentCandidates(taskId: string): Promise<any> {
    // 获取任务详情
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        instance: {
          include: {
            sample: true,
          },
        },
      },
    })

    if (!task) {
      throw new Error('任务不存在')
    }

    // 构建派工上下文
    const assignmentContext: AssignmentContext = {
      taskId: task.id,
      nodeType: task.nodeType,
      nodeName: task.nodeName,
      priority: task.priority,
      sampleId: task.instance.sampleId,
      sampleType: task.instance.sample?.sampleType,
      sampleCategory: task.instance.sample?.sampleCategory,
      workflowId: task.instance.workflowId,
      instanceId: task.instanceId,
    }

    // 获取候选人（不实际分配）
    const result = await assignmentEngine.autoAssign(assignmentContext)

    return {
      taskId,
      candidates: result.candidates || [],
      recommendedUser: result.assignedUser,
    }
  }
}

export default new TaskService()
