/**
 * 自动派工引擎测试
 */

import { PrismaClient, Priority, TaskStatus, UserStatus } from '@prisma/client'
import assignmentEngine from '../services/assignmentEngine'
import {
  AssignmentStrategy,
  AssignmentContext,
  AssignmentRule,
  UserSkill,
} from '../types/assignment'

const prisma = new PrismaClient()

describe('AssignmentEngine', () => {
  let testUsers: any[] = []
  let testWorkflowInstance: any
  let testSample: any
  let testWorkflow: any

  beforeAll(async () => {
    // 创建测试用户
    testUsers = await Promise.all([
      prisma.user.create({
        data: {
          username: 'chemist1',
          passwordHash: 'hash',
          email: 'chemist1@test.com',
          fullName: '化学分析师1',
          department: '化学分析室',
          position: '分析师',
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          username: 'chemist2',
          passwordHash: 'hash',
          email: 'chemist2@test.com',
          fullName: '化学分析师2',
          department: '化学分析室',
          position: '高级分析师',
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          username: 'microbiologist',
          passwordHash: 'hash',
          email: 'micro@test.com',
          fullName: '微生物检测员',
          department: '微生物室',
          position: '检测员',
          status: UserStatus.ACTIVE,
        },
      }),
    ])

    // 创建测试样品
    testSample = await prisma.sample.create({
      data: {
        barcode: 'TEST-AUTO-ASSIGN-001',
        sampleNumber: 'S-AUTO-001',
        clientName: '测试客户',
        sampleName: '测试样品',
        sampleType: '水样',
        sampleCategory: 'chemical',
        quantity: 100,
        unit: 'ml',
        receivedDate: new Date(),
        status: 'REGISTERED',
        priority: Priority.NORMAL,
        createdBy: testUsers[0].id,
      },
    })

    // 创建测试工作流
    testWorkflow = await prisma.workflow.create({
      data: {
        name: '测试工作流-自动派工',
        config: {
          nodes: [
            { id: 'start', name: '开始', type: 'START' },
            { id: 'analysis', name: '化学分析', type: 'chemical_analysis' },
            { id: 'end', name: '结束', type: 'END' },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'analysis' },
            { id: 'e2', source: 'analysis', target: 'end' },
          ],
        },
        status: 'ACTIVE',
        isActive: true,
        createdBy: testUsers[0].id,
      },
    })

    // 创建测试工作流实例
    testWorkflowInstance = await prisma.workflowInstance.create({
      data: {
        workflowId: testWorkflow.id,
        sampleId: testSample.id,
        currentNodes: ['analysis'],
        status: 'RUNNING',
      },
    })

    // 初始化派工引擎
    await assignmentEngine.initialize()
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.task.deleteMany({
      where: {
        instanceId: testWorkflowInstance.id,
      },
    })

    await prisma.workflowInstance.deleteMany({
      where: {
        id: testWorkflowInstance.id,
      },
    })

    await prisma.workflow.deleteMany({
      where: {
        id: testWorkflow.id,
      },
    })

    await prisma.sample.deleteMany({
      where: {
        id: testSample.id,
      },
    })

    await prisma.user.deleteMany({
      where: {
        id: { in: testUsers.map(u => u.id) },
      },
    })

    await prisma.$disconnect()
  })

  describe('基于技能的派工', () => {
    it('应该根据技能匹配分配任务', async () => {
      // 创建化学分析任务
      const task = await prisma.task.create({
        data: {
          instanceId: testWorkflowInstance.id,
          nodeId: 'analysis',
          nodeName: '化学分析',
          nodeType: 'chemical_analysis',
          status: TaskStatus.PENDING,
          priority: Priority.NORMAL,
        },
      })

      const context: AssignmentContext = {
        taskId: task.id,
        nodeType: 'chemical_analysis',
        nodeName: '化学分析',
        priority: Priority.NORMAL,
        sampleId: testSample.id,
        sampleType: testSample.sampleType,
        sampleCategory: testSample.sampleCategory,
        workflowId: testWorkflow.id,
        instanceId: testWorkflowInstance.id,
      }

      const result = await assignmentEngine.autoAssign(context)

      expect(result.success).toBe(true)
      expect(result.assignedTo).toBeDefined()
      expect(result.strategy).toBe(AssignmentStrategy.SKILL_BASED)

      // 验证任务已分配
      const updatedTask = await prisma.task.findUnique({
        where: { id: task.id },
      })

      expect(updatedTask?.assignedTo).toBe(result.assignedTo)
      expect(updatedTask?.status).toBe(TaskStatus.ASSIGNED)

      // 清理
      await prisma.task.delete({ where: { id: task.id } })
    })

    it('应该返回候选人列表', async () => {
      const task = await prisma.task.create({
        data: {
          instanceId: testWorkflowInstance.id,
          nodeId: 'analysis',
          nodeName: '化学分析',
          nodeType: 'chemical_analysis',
          status: TaskStatus.PENDING,
          priority: Priority.NORMAL,
        },
      })

      const context: AssignmentContext = {
        taskId: task.id,
        nodeType: 'chemical_analysis',
        nodeName: '化学分析',
        priority: Priority.NORMAL,
        sampleId: testSample.id,
        sampleType: testSample.sampleType,
        sampleCategory: testSample.sampleCategory,
        workflowId: testWorkflow.id,
        instanceId: testWorkflowInstance.id,
      }

      const result = await assignmentEngine.autoAssign(context)

      expect(result.candidates).toBeDefined()
      expect(result.candidates!.length).toBeGreaterThan(0)

      // 验证候选人按分数排序
      const scores = result.candidates!.map(c => c.score)
      const sortedScores = [...scores].sort((a, b) => b - a)
      expect(scores).toEqual(sortedScores)

      // 清理
      await prisma.task.delete({ where: { id: task.id } })
    })
  })

  describe('基于工作负载的派工', () => {
    it('应该优先分配给负载较低的用户', async () => {
      // 给第一个用户分配多个任务
      const busyUserTasks = await Promise.all([
        prisma.task.create({
          data: {
            instanceId: testWorkflowInstance.id,
            nodeId: 'analysis',
            nodeName: '化学分析',
            nodeType: 'chemical_analysis',
            status: TaskStatus.IN_PROGRESS,
            priority: Priority.NORMAL,
            assignedTo: testUsers[0].id,
            assignedAt: new Date(),
          },
        }),
        prisma.task.create({
          data: {
            instanceId: testWorkflowInstance.id,
            nodeId: 'analysis',
            nodeName: '化学分析',
            nodeType: 'chemical_analysis',
            status: TaskStatus.IN_PROGRESS,
            priority: Priority.NORMAL,
            assignedTo: testUsers[0].id,
            assignedAt: new Date(),
          },
        }),
      ])

      // 创建紧急任务（使用工作负载策略）
      const urgentTask = await prisma.task.create({
        data: {
          instanceId: testWorkflowInstance.id,
          nodeId: 'analysis',
          nodeName: '化学分析',
          nodeType: 'chemical_analysis',
          status: TaskStatus.PENDING,
          priority: Priority.URGENT,
        },
      })

      const context: AssignmentContext = {
        taskId: urgentTask.id,
        nodeType: 'chemical_analysis',
        nodeName: '化学分析',
        priority: Priority.URGENT,
        sampleId: testSample.id,
        sampleType: testSample.sampleType,
        sampleCategory: testSample.sampleCategory,
        workflowId: testWorkflow.id,
        instanceId: testWorkflowInstance.id,
      }

      const result = await assignmentEngine.autoAssign(context)

      expect(result.success).toBe(true)
      // 应该分配给负载较低的用户（不是第一个用户）
      expect(result.assignedTo).not.toBe(testUsers[0].id)

      // 清理
      await prisma.task.deleteMany({
        where: {
          id: { in: [...busyUserTasks.map(t => t.id), urgentTask.id] },
        },
      })
    })
  })

  describe('派工规则管理', () => {
    it('应该能够添加派工规则', () => {
      const newRule: AssignmentRule = {
        id: 'test-rule-1',
        name: '测试规则',
        nodeType: 'test_node',
        strategy: AssignmentStrategy.ROUND_ROBIN,
        priority: 50,
        isActive: true,
      }

      assignmentEngine.addRule(newRule)

      const rules = assignmentEngine.getRules()
      const addedRule = rules.find(r => r.id === 'test-rule-1')

      expect(addedRule).toBeDefined()
      expect(addedRule?.name).toBe('测试规则')

      // 清理
      assignmentEngine.removeRule('test-rule-1')
    })

    it('应该能够更新派工规则', () => {
      const rule: AssignmentRule = {
        id: 'test-rule-2',
        name: '测试规则2',
        nodeType: 'test_node',
        strategy: AssignmentStrategy.SKILL_BASED,
        priority: 50,
        isActive: true,
      }

      assignmentEngine.addRule(rule)

      const updated = assignmentEngine.updateRule('test-rule-2', {
        priority: 100,
        isActive: false,
      })

      expect(updated).toBe(true)

      const rules = assignmentEngine.getRules()
      const updatedRule = rules.find(r => r.id === 'test-rule-2')

      expect(updatedRule?.priority).toBe(100)
      expect(updatedRule?.isActive).toBe(false)

      // 清理
      assignmentEngine.removeRule('test-rule-2')
    })

    it('应该能够删除派工规则', () => {
      const rule: AssignmentRule = {
        id: 'test-rule-3',
        name: '测试规则3',
        nodeType: 'test_node',
        strategy: AssignmentStrategy.ROUND_ROBIN,
        priority: 50,
        isActive: true,
      }

      assignmentEngine.addRule(rule)

      const removed = assignmentEngine.removeRule('test-rule-3')
      expect(removed).toBe(true)

      const rules = assignmentEngine.getRules()
      const deletedRule = rules.find(r => r.id === 'test-rule-3')

      expect(deletedRule).toBeUndefined()
    })
  })

  describe('用户技能管理', () => {
    it('应该能够设置用户技能', () => {
      const userSkill: UserSkill = {
        userId: testUsers[0].id,
        skills: ['chemical_analysis', 'sample_preparation', 'review'],
        maxConcurrentTasks: 5,
      }

      assignmentEngine.setUserSkill(testUsers[0].id, userSkill)

      const retrievedSkill = assignmentEngine.getUserSkill(testUsers[0].id)

      expect(retrievedSkill).toBeDefined()
      expect(retrievedSkill?.skills).toContain('chemical_analysis')
      expect(retrievedSkill?.maxConcurrentTasks).toBe(5)
    })
  })

  describe('派工失败处理', () => {
    it('当没有合适候选人时应该标记为待手动分配', async () => {
      // 禁用自动派工引擎
      assignmentEngine.setAutoAssignmentEnabled(false)

      // 创建任务
      const task = await prisma.task.create({
        data: {
          instanceId: testWorkflowInstance.id,
          nodeId: 'analysis',
          nodeName: '化学分析',
          nodeType: 'chemical_analysis',
          status: TaskStatus.PENDING,
          priority: Priority.NORMAL,
        },
      })

      const context: AssignmentContext = {
        taskId: task.id,
        nodeType: 'chemical_analysis',
        nodeName: '化学分析',
        priority: Priority.NORMAL,
        sampleId: testSample.id,
        sampleType: testSample.sampleType,
        sampleCategory: testSample.sampleCategory,
        workflowId: testWorkflow.id,
        instanceId: testWorkflowInstance.id,
      }

      const result = await assignmentEngine.autoAssign(context)

      expect(result.success).toBe(false)
      expect(result.reason).toBeDefined()
      expect(result.reason).toContain('自动派工功能已禁用')

      // 验证任务仍为待分配状态
      const updatedTask = await prisma.task.findUnique({
        where: { id: task.id },
      })

      expect(updatedTask?.status).toBe(TaskStatus.PENDING)
      expect(updatedTask?.assignedTo).toBeNull()

      // 恢复自动派工
      assignmentEngine.setAutoAssignmentEnabled(true)

      // 清理
      await prisma.task.delete({ where: { id: task.id } })
    })
  })

  describe('派工统计', () => {
    it('应该能够获取派工统计信息', async () => {
      const statistics = await assignmentEngine.getAssignmentStatistics()

      expect(statistics).toBeDefined()
      expect(statistics.totalTasks).toBeGreaterThanOrEqual(0)
      expect(statistics.assignedTasks).toBeGreaterThanOrEqual(0)
      expect(statistics.pendingTasks).toBeGreaterThanOrEqual(0)
      expect(statistics.assignmentRate).toBeGreaterThanOrEqual(0)
      expect(statistics.assignmentRate).toBeLessThanOrEqual(100)
    })
  })
})
