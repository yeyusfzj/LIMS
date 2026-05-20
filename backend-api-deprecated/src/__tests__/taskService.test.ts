/**
 * 任务管理服务单元测试
 */

import { PrismaClient, TaskStatus, Priority } from '@prisma/client'
import taskService from '../services/taskService'

const prisma = new PrismaClient()

describe('TaskService', () => {
  let testWorkflowId: string
  let testInstanceId: string
  let testUserId: string
  let testTaskId: string

  beforeAll(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'tasktest',
        passwordHash: 'hash',
        email: 'tasktest@example.com',
        fullName: '任务测试用户',
      },
    })
    testUserId = user.id

    // 创建测试工作流
    const workflow = await prisma.workflow.create({
      data: {
        name: '任务测试工作流',
        config: {
          nodes: [
            { id: 'start', type: 'START', name: '开始' },
            { id: 'task1', type: 'TASK', name: '任务1' },
            { id: 'end', type: 'END', name: '结束' },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'task1' },
            { id: 'e2', source: 'task1', target: 'end' },
          ],
        },
        status: 'ACTIVE',
        isActive: true,
        createdBy: testUserId,
      },
    })
    testWorkflowId = workflow.id

    // 创建测试样品
    const sample = await prisma.sample.create({
      data: {
        barcode: 'TASK-TEST-001',
        sampleNumber: 'TASK-001',
        clientName: '测试客户',
        sampleName: '测试样品',
        sampleType: '水样',
        sampleCategory: '环境',
        quantity: 100,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: testUserId,
      },
    })

    // 创建测试工作流实例
    const instance = await prisma.workflowInstance.create({
      data: {
        workflowId: testWorkflowId,
        sampleId: sample.id,
        currentNodes: ['task1'],
        status: 'RUNNING',
      },
    })
    testInstanceId = instance.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.task.deleteMany({
      where: { instanceId: testInstanceId },
    })
    await prisma.workflowInstance.deleteMany({
      where: { id: testInstanceId },
    })
    await prisma.sample.deleteMany({
      where: { barcode: 'TASK-TEST-001' },
    })
    await prisma.workflow.deleteMany({
      where: { id: testWorkflowId },
    })
    await prisma.user.deleteMany({
      where: { username: 'tasktest' },
    })
    await prisma.$disconnect()
  })

  describe('createTask', () => {
    it('应该成功创建任务', async () => {
      const taskData = {
        instanceId: testInstanceId,
        nodeId: 'task1',
        nodeName: '任务1',
        nodeType: 'TASK',
        priority: Priority.NORMAL,
      }

      const task = await taskService.createTask(taskData)
      testTaskId = task.id

      expect(task).toBeDefined()
      expect(task.instanceId).toBe(testInstanceId)
      expect(task.nodeId).toBe('task1')
      expect(task.nodeName).toBe('任务1')
      expect(task.status).toBe(TaskStatus.PENDING)
      expect(task.priority).toBe(Priority.NORMAL)
    })

    it('应该创建已分配的任务', async () => {
      const taskData = {
        instanceId: testInstanceId,
        nodeId: 'task2',
        nodeName: '任务2',
        nodeType: 'TASK',
        assignedTo: testUserId,
      }

      const task = await taskService.createTask(taskData)

      expect(task.assignedTo).toBe(testUserId)
      expect(task.status).toBe(TaskStatus.ASSIGNED)
      expect(task.assignedAt).toBeDefined()

      // 清理
      await prisma.task.delete({ where: { id: task.id } })
    })

    it('工作流实例不存在时应该抛出错误', async () => {
      const taskData = {
        instanceId: 'non-existent-id',
        nodeId: 'task1',
        nodeName: '任务1',
        nodeType: 'TASK',
      }

      await expect(taskService.createTask(taskData)).rejects.toThrow('工作流实例不存在')
    })
  })

  describe('getTask', () => {
    it('应该成功获取任务详情', async () => {
      const task = await taskService.getTask(testTaskId)

      expect(task).toBeDefined()
      expect(task!.id).toBe(testTaskId)
      expect(task!.instance).toBeDefined()
      expect(task!.instance.workflow).toBeDefined()
      expect(task!.instance.sample).toBeDefined()
    })

    it('任务不存在时应该返回 null', async () => {
      const task = await taskService.getTask('non-existent-id')
      expect(task).toBeNull()
    })
  })

  describe('listTasks', () => {
    it('应该成功查询任务列表', async () => {
      const result = await taskService.listTasks({
        page: 1,
        pageSize: 10,
      })

      expect(result).toBeDefined()
      expect(result.items).toBeInstanceOf(Array)
      expect(result.total).toBeGreaterThan(0)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(10)
    })

    it('应该支持按实例ID过滤', async () => {
      const result = await taskService.listTasks({
        instanceId: testInstanceId,
      })

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items.every(t => t.instanceId === testInstanceId)).toBe(true)
    })

    it('应该支持按状态过滤', async () => {
      const result = await taskService.listTasks({
        status: TaskStatus.PENDING,
      })

      expect(result.items.every(t => t.status === TaskStatus.PENDING)).toBe(true)
    })

    it('应该支持按优先级过滤', async () => {
      const result = await taskService.listTasks({
        priority: Priority.NORMAL,
      })

      expect(result.items.every(t => t.priority === Priority.NORMAL)).toBe(true)
    })
  })

  describe('assignTask', () => {
    it('应该成功分配任务', async () => {
      const task = await taskService.assignTask(testTaskId, {
        userId: testUserId,
      })

      expect(task.assignedTo).toBe(testUserId)
      expect(task.status).toBe(TaskStatus.ASSIGNED)
      expect(task.assignedAt).toBeDefined()
    })

    it('任务不存在时应该抛出错误', async () => {
      await expect(
        taskService.assignTask('non-existent-id', { userId: testUserId })
      ).rejects.toThrow('任务不存在')
    })

    it('用户不存在时应该抛出错误', async () => {
      await expect(
        taskService.assignTask(testTaskId, { userId: 'non-existent-user' })
      ).rejects.toThrow('用户不存在')
    })
  })

  describe('startTask', () => {
    it('应该成功开始任务', async () => {
      const task = await taskService.startTask(testTaskId, testUserId)

      expect(task.status).toBe(TaskStatus.IN_PROGRESS)
    })

    it('任务不存在时应该抛出错误', async () => {
      await expect(
        taskService.startTask('non-existent-id', testUserId)
      ).rejects.toThrow('任务不存在')
    })
  })

  describe('completeTask', () => {
    it('应该成功完成任务', async () => {
      const result = { output: 'test result' }
      const task = await taskService.completeTask(
        testTaskId,
        { result },
        testUserId
      )

      expect(task.status).toBe(TaskStatus.COMPLETED)
      expect(task.completedAt).toBeDefined()
      expect(task.result).toEqual(result)
    })

    it('任务不存在时应该抛出错误', async () => {
      await expect(
        taskService.completeTask('non-existent-id', {}, testUserId)
      ).rejects.toThrow('任务不存在')
    })

    it('已完成的任务应该抛出错误', async () => {
      await expect(
        taskService.completeTask(testTaskId, {}, testUserId)
      ).rejects.toThrow('任务已完成')
    })
  })

  describe('rejectTask', () => {
    let rejectTaskId: string

    beforeAll(async () => {
      // 创建一个新任务用于拒绝测试
      const task = await prisma.task.create({
        data: {
          instanceId: testInstanceId,
          nodeId: 'reject-task',
          nodeName: '拒绝测试任务',
          nodeType: 'TASK',
          status: TaskStatus.ASSIGNED,
          assignedTo: testUserId,
          assignedAt: new Date(),
        },
      })
      rejectTaskId = task.id
    })

    afterAll(async () => {
      await prisma.task.delete({ where: { id: rejectTaskId } })
    })

    it('应该成功拒绝任务', async () => {
      const reason = '无法完成此任务'
      const task = await taskService.rejectTask(rejectTaskId, reason, testUserId)

      expect(task.status).toBe(TaskStatus.REJECTED)
      expect(task.completedAt).toBeDefined()
      expect(task.result).toEqual({ reason })
    })
  })

  describe('getUserPendingTasks', () => {
    let pendingTaskId: string

    beforeAll(async () => {
      // 创建一个待办任务
      const task = await prisma.task.create({
        data: {
          instanceId: testInstanceId,
          nodeId: 'pending-task',
          nodeName: '待办任务',
          nodeType: 'TASK',
          status: TaskStatus.ASSIGNED,
          assignedTo: testUserId,
          assignedAt: new Date(),
        },
      })
      pendingTaskId = task.id
    })

    afterAll(async () => {
      await prisma.task.delete({ where: { id: pendingTaskId } })
    })

    it('应该成功获取用户的待办任务', async () => {
      const result = await taskService.getUserPendingTasks(testUserId)

      expect(result.items).toBeInstanceOf(Array)
      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items.every(t => t.assignedTo === testUserId)).toBe(true)
      expect(
        result.items.every(
          t => t.status === TaskStatus.ASSIGNED || t.status === TaskStatus.IN_PROGRESS
        )
      ).toBe(true)
    })
  })

  describe('getTaskStatistics', () => {
    it('应该成功获取任务统计信息', async () => {
      const stats = await taskService.getTaskStatistics()

      expect(stats).toBeDefined()
      expect(stats.total).toBeGreaterThanOrEqual(0)
      expect(stats.pending).toBeGreaterThanOrEqual(0)
      expect(stats.assigned).toBeGreaterThanOrEqual(0)
      expect(stats.inProgress).toBeGreaterThanOrEqual(0)
      expect(stats.completed).toBeGreaterThanOrEqual(0)
      expect(stats.rejected).toBeGreaterThanOrEqual(0)
    })

    it('应该支持按用户过滤统计', async () => {
      const stats = await taskService.getTaskStatistics(testUserId)

      expect(stats).toBeDefined()
      expect(typeof stats.total).toBe('number')
    })
  })

  describe('batchAssignTasks', () => {
    let batchTaskIds: string[]

    beforeAll(async () => {
      // 创建多个待分配的任务
      const tasks = await Promise.all([
        prisma.task.create({
          data: {
            instanceId: testInstanceId,
            nodeId: 'batch-1',
            nodeName: '批量任务1',
            nodeType: 'TASK',
            status: TaskStatus.PENDING,
          },
        }),
        prisma.task.create({
          data: {
            instanceId: testInstanceId,
            nodeId: 'batch-2',
            nodeName: '批量任务2',
            nodeType: 'TASK',
            status: TaskStatus.PENDING,
          },
        }),
      ])
      batchTaskIds = tasks.map(t => t.id)
    })

    afterAll(async () => {
      await prisma.task.deleteMany({
        where: { id: { in: batchTaskIds } },
      })
    })

    it('应该成功批量分配任务', async () => {
      const count = await taskService.batchAssignTasks(batchTaskIds, testUserId)

      expect(count).toBe(batchTaskIds.length)

      // 验证任务已分配
      const tasks = await prisma.task.findMany({
        where: { id: { in: batchTaskIds } },
      })

      expect(tasks.every(t => t.assignedTo === testUserId)).toBe(true)
      expect(tasks.every(t => t.status === TaskStatus.ASSIGNED)).toBe(true)
    })

    it('用户不存在时应该抛出错误', async () => {
      await expect(
        taskService.batchAssignTasks(batchTaskIds, 'non-existent-user')
      ).rejects.toThrow('用户不存在')
    })
  })
})
