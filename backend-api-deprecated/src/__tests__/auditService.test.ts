/**
 * 审核服务单元测试
 */

import { PrismaClient, SampleStatus, AuditStatus, AuditDecision } from '@prisma/client'
import { auditService } from '../services/auditService'

const prisma = new PrismaClient()

describe('AuditService', () => {
  let testTaskId: string
  let testUserId: string
  let testSampleId: string
  let testWorkflowInstanceId: string

  beforeAll(async () => {
    // 清理可能存在的测试数据
    await prisma.sample.deleteMany({
      where: { barcode: { startsWith: 'TEST-AUDIT-' } }
    })
    await prisma.user.deleteMany({
      where: { username: { in: ['test_auditor', 'test_auditor_2'] } }
    })

    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'test_auditor',
        email: 'auditor@test.com',
        passwordHash: 'hash',
        fullName: '测试审核员'
      }
    })
    testUserId = user.id

    // 创建测试样品
    const sample = await prisma.sample.create({
      data: {
        barcode: 'TEST-AUDIT-001',
        sampleNumber: 'AUDIT-001',
        clientName: '测试客户',
        sampleName: '测试样品',
        sampleType: '水样',
        sampleCategory: '环境',
        quantity: 100,
        unit: 'ml',
        receivedDate: new Date(),
        status: SampleStatus.TESTING_COMPLETE,
        priority: 'NORMAL',
        createdBy: testUserId
      }
    })
    testSampleId = sample.id

    // 创建测试工作流模板
    const workflow = await prisma.workflow.create({
      data: {
        name: '测试审核工作流',
        description: '用于审核测试的工作流',
        config: {
          sampleTypes: ['水样'],
          nodes: [],
          edges: []
        },
        isActive: true,
        createdBy: testUserId
      }
    })

    // 创建工作流实例
    const instance = await prisma.workflowInstance.create({
      data: {
        workflowId: workflow.id,
        sampleId: sample.id,
        status: 'RUNNING',
        currentNodes: ['node-1'],
        variables: {}
      }
    })
    testWorkflowInstanceId = instance.id

    // 创建测试任务
    const task = await prisma.task.create({
      data: {
        instanceId: instance.id,
        nodeId: 'node-1',
        nodeName: '测试节点',
        nodeType: 'TASK',
        status: 'COMPLETED',
        assignedTo: testUserId
      }
    })
    testTaskId = task.id
  })

  afterAll(async () => {
    // 清理测试数据
    if (testTaskId) {
      await prisma.auditTask.deleteMany({
        where: { taskId: testTaskId }
      })
      await prisma.task.deleteMany({
        where: { id: testTaskId }
      })
    }
    if (testWorkflowInstanceId) {
      await prisma.workflowInstance.deleteMany({
        where: { id: testWorkflowInstanceId }
      })
    }
    await prisma.workflow.deleteMany({
      where: { name: { startsWith: '测试' } }
    })
    await prisma.sample.deleteMany({
      where: { barcode: { startsWith: 'TEST-AUDIT-' } }
    })
    await prisma.user.deleteMany({
      where: { username: { in: ['test_auditor', 'test_auditor_2'] } }
    })
    await prisma.$disconnect()
  })

  describe('submitForAudit', () => {
    it('应该成功创建多级审核任务', async () => {
      const auditConfig = {
        levels: [
          { level: 1, name: '初审', auditorIds: [testUserId] },
          { level: 2, name: '复审', auditorIds: [testUserId] }
        ]
      }

      const tasks = await auditService.submitForAudit({
        taskId: testTaskId,
        auditConfig
      })

      expect(tasks).toHaveLength(2)
      expect(tasks[0].level).toBe(1)
      expect(tasks[1].level).toBe(2)
      expect(tasks[0].status).toBe(AuditStatus.PENDING)

      // 验证审核任务已创建（任务状态保持为 COMPLETED）
      const task = await prisma.task.findUnique({
        where: { id: testTaskId }
      })
      expect(task?.status).toBe('COMPLETED')
    })

    it('应该拒绝状态不正确的任务', async () => {
      // 创建一个状态为 PENDING 的任务
      const sample = await prisma.sample.create({
        data: {
          barcode: 'TEST-AUDIT-002',
          sampleNumber: 'AUDIT-002',
          clientName: '测试客户',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          status: SampleStatus.REGISTERED,
          priority: 'NORMAL',
          createdBy: testUserId
        }
      })

      const workflow = await prisma.workflow.create({
        data: {
          name: '测试工作流2',
          description: '测试',
          config: {
            sampleTypes: ['水样'],
            nodes: [],
            edges: []
          },
          isActive: true,
          createdBy: testUserId
        }
      })

      const instance = await prisma.workflowInstance.create({
        data: {
          workflowId: workflow.id,
          sampleId: sample.id,
          status: 'RUNNING',
          currentNodes: ['node-1'],
          variables: {}
        }
      })

      const task = await prisma.task.create({
        data: {
          instanceId: instance.id,
          nodeId: 'node-1',
          nodeName: '测试节点',
          nodeType: 'TASK',
          status: 'PENDING',
          assignedTo: testUserId
        }
      })

      await expect(
        auditService.submitForAudit({
          taskId: task.id,
          auditConfig: {
            levels: [{ level: 1, name: '初审', auditorIds: [testUserId] }]
          }
        })
      ).rejects.toThrow('任务状态不正确')

      // 清理
      await prisma.task.delete({ where: { id: task.id } })
      await prisma.workflowInstance.delete({ where: { id: instance.id } })
      await prisma.workflow.delete({ where: { id: workflow.id } })
      await prisma.sample.delete({ where: { id: sample.id } })
    })

    it('应该拒绝已有审核任务的任务', async () => {
      // 先将任务状态重置为 COMPLETED
      await prisma.task.update({
        where: { id: testTaskId },
        data: { status: 'COMPLETED' }
      })

      await expect(
        auditService.submitForAudit({
          taskId: testTaskId,
          auditConfig: {
            levels: [{ level: 1, name: '初审', auditorIds: [testUserId] }]
          }
        })
      ).rejects.toThrow('该任务已有进行中的审核任务')
    })
  })

  describe('performAudit', () => {
    let auditTaskId: string

    beforeEach(async () => {
      // 清理之前的审核任务
      await prisma.auditTask.deleteMany({
        where: { taskId: testTaskId }
      })

      // 重置任务状态
      await prisma.task.update({
        where: { id: testTaskId },
        data: { status: 'COMPLETED' }
      })

      // 创建新的审核任务
      const tasks = await auditService.submitForAudit({
        taskId: testTaskId,
        auditConfig: {
          levels: [
            { level: 1, name: '初审', auditorIds: [testUserId] },
            { level: 2, name: '复审', auditorIds: [testUserId] }
          ]
        }
      })
      auditTaskId = tasks[0].id
    })

    it('应该成功通过第一级审核并激活第二级', async () => {
      const result = await auditService.performAudit({
        taskId: auditTaskId,
        decision: AuditDecision.APPROVE,
        comments: '初审通过',
        auditorId: testUserId
      })

      expect(result.decision).toBe(AuditDecision.APPROVE)
      expect(result.nextLevel).toBe(2)
      expect(result.isComplete).toBe(false)

      // 验证任务状态已更新
      const task = await prisma.auditTask.findUnique({
        where: { id: auditTaskId }
      })
      expect(task?.status).toBe(AuditStatus.APPROVED)
      expect(task?.completedAt).toBeTruthy()
    })

    it('应该拒绝跳级审核', async () => {
      // 获取第二级审核任务
      const tasks = await prisma.auditTask.findMany({
        where: { taskId: testTaskId, level: 2 }
      })
      const level2TaskId = tasks[0].id

      await expect(
        auditService.performAudit({
          taskId: level2TaskId,
          decision: AuditDecision.APPROVE,
          comments: '复审通过',
          auditorId: testUserId
        })
      ).rejects.toThrow('前一级审核尚未通过')
    })

    it('应该在最后一级审核通过后完成审核', async () => {
      // 先通过第一级
      await auditService.performAudit({
        taskId: auditTaskId,
        decision: AuditDecision.APPROVE,
        comments: '初审通过',
        auditorId: testUserId
      })

      // 获取第二级任务
      const tasks = await prisma.auditTask.findMany({
        where: { taskId: testTaskId, level: 2 }
      })
      const level2TaskId = tasks[0].id

      // 通过第二级
      const result = await auditService.performAudit({
        taskId: level2TaskId,
        decision: AuditDecision.APPROVE,
        comments: '复审通过',
        auditorId: testUserId
      })

      expect(result.isComplete).toBe(true)
      expect(result.nextLevel).toBeUndefined()

      // 验证任务状态保持为 COMPLETED（审核通过后不改变任务状态）
      const task = await prisma.task.findUnique({
        where: { id: testTaskId }
      })
      expect(task?.status).toBe('COMPLETED')
    })

    it('应该在审核拒绝时终止整个流程', async () => {
      const result = await auditService.performAudit({
        taskId: auditTaskId,
        decision: AuditDecision.REJECT,
        comments: '不符合要求',
        auditorId: testUserId
      })

      expect(result.decision).toBe(AuditDecision.REJECT)
      expect(result.isComplete).toBe(true)

      // 验证任务状态已退回
      const task = await prisma.task.findUnique({
        where: { id: testTaskId }
      })
      expect(task?.status).toBe('REJECTED')

      // 验证所有未完成的任务都被拒绝
      const allTasks = await prisma.auditTask.findMany({
        where: { taskId: testTaskId }
      })
      expect(allTasks.every(t => t.status === AuditStatus.REJECTED)).toBe(true)
    })
  })

  describe('reassignAuditTask', () => {
    let auditTaskId: string
    let anotherUserId: string

    beforeAll(async () => {
      // 创建另一个测试用户（使用 upsert 避免重复）
      const user = await prisma.user.upsert({
        where: { username: 'test_auditor_2' },
        update: {},
        create: {
          username: 'test_auditor_2',
          email: 'auditor2@test.com',
          passwordHash: 'hash',
          fullName: '测试审核员2'
        }
      })
      anotherUserId = user.id
    })

    afterAll(async () => {
      await prisma.user.delete({ where: { id: anotherUserId } })
    })

    beforeEach(async () => {
      // 清理并创建新的审核任务
      await prisma.auditTask.deleteMany({
        where: { taskId: testTaskId }
      })
      await prisma.task.update({
        where: { id: testTaskId },
        data: { status: 'COMPLETED' }
      })

      const tasks = await auditService.submitForAudit({
        taskId: testTaskId,
        auditConfig: {
          levels: [{ level: 1, name: '初审', auditorIds: [testUserId] }]
        }
      })
      auditTaskId = tasks[0].id
    })

    it('应该成功转交审核任务', async () => {
      const result = await auditService.reassignAuditTask({
        taskId: auditTaskId,
        fromAuditorId: testUserId,
        toAuditorId: anotherUserId,
        reason: '工作调整'
      })

      expect(result.auditorId).toBe(anotherUserId)

      // 验证任务已更新
      const task = await prisma.auditTask.findUnique({
        where: { id: auditTaskId }
      })
      expect(task?.auditorId).toBe(anotherUserId)
    })

    it('应该拒绝非任务所有者的转交请求', async () => {
      await expect(
        auditService.reassignAuditTask({
          taskId: auditTaskId,
          fromAuditorId: anotherUserId,
          toAuditorId: testUserId,
          reason: '工作调整'
        })
      ).rejects.toThrow('您没有权限转交此任务')
    })

    it('应该拒绝转交已完成的任务', async () => {
      // 先完成任务
      await auditService.performAudit({
        taskId: auditTaskId,
        decision: AuditDecision.APPROVE,
        comments: '审核通过',
        auditorId: testUserId
      })

      await expect(
        auditService.reassignAuditTask({
          taskId: auditTaskId,
          fromAuditorId: testUserId,
          toAuditorId: anotherUserId,
          reason: '工作调整'
        })
      ).rejects.toThrow('只能转交待审核或审核中的任务')
    })
  })

  describe('listAuditTasks', () => {
    beforeAll(async () => {
      // 清理并创建测试数据
      await prisma.auditTask.deleteMany({
        where: { taskId: testTaskId }
      })
      await prisma.task.update({
        where: { id: testTaskId },
        data: { status: 'COMPLETED' }
      })

      await auditService.submitForAudit({
        taskId: testTaskId,
        auditConfig: {
          levels: [
            { level: 1, name: '初审', auditorIds: [testUserId] },
            { level: 2, name: '复审', auditorIds: [testUserId] }
          ]
        }
      })
    })

    it('应该成功查询审核任务列表', async () => {
      const result = await auditService.listAuditTasks({
        taskId: testTaskId
      })

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.total).toBeGreaterThan(0)
    })

    it('应该支持按审核人员过滤', async () => {
      const result = await auditService.listAuditTasks({
        auditorId: testUserId
      })

      expect(result.items.every(t => t.auditorId === testUserId)).toBe(true)
    })

    it('应该支持按级别过滤', async () => {
      const result = await auditService.listAuditTasks({
        taskId: testTaskId,
        level: 1
      })

      expect(result.items.every(t => t.level === 1)).toBe(true)
    })

    it('应该支持分页', async () => {
      const result = await auditService.listAuditTasks({
        taskId: testTaskId,
        page: 1,
        pageSize: 1
      })

      expect(result.items.length).toBeLessThanOrEqual(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(1)
    })
  })
})
