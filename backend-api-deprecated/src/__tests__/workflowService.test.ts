/**
 * 工作流服务单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import workflowService from '../services/workflowService'
import { NodeType, WorkflowConfig } from '../types/workflow'

const prisma = new PrismaClient()

describe('WorkflowService', () => {
  const testUserId = 'test-user-id'

  // 清理测试数据
  afterEach(async () => {
    await prisma.workflow.deleteMany({
      where: {
        name: {
          startsWith: 'test-',
        },
      },
    })
  })

  describe('工作流配置验证', () => {
    it('应该验证通过有效的工作流配置', () => {
      const config: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'end' },
        ],
      }

      const result = workflowService.validateWorkflow(config)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测缺少开始节点', () => {
      const config: WorkflowConfig = {
        nodes: [
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [{ id: 'e1', source: 'task1', target: 'end' }],
      }

      const result = workflowService.validateWorkflow(config)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'MISSING_START')).toBe(true)
    })

    it('应该检测缺少结束节点', () => {
      const config: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
        ],
        edges: [{ id: 'e1', source: 'start', target: 'task1' }],
      }

      const result = workflowService.validateWorkflow(config)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'MISSING_END')).toBe(true)
    })

    it('应该检测重复的节点 ID', () => {
      const config: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
          { id: 'task1', type: NodeType.TASK, name: '任务2' }, // 重复 ID
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'end' },
        ],
      }

      const result = workflowService.validateWorkflow(config)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'DUPLICATE_NODE')).toBe(true)
    })

    it('应该检测无效的边（源节点或目标节点不存在）', () => {
      const config: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'nonexistent' }, // 目标节点不存在
        ],
      }

      const result = workflowService.validateWorkflow(config)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'INVALID_EDGE')).toBe(true)
    })

    it('应该检测孤立节点', () => {
      const config: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
          { id: 'task2', type: NodeType.TASK, name: '任务2' }, // 孤立节点
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'end' },
        ],
      }

      const result = workflowService.validateWorkflow(config)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'ISOLATED_NODE')).toBe(true)
      expect(result.errors.find(e => e.type === 'ISOLATED_NODE')?.nodeIds).toContain('task2')
    })

    it('应该检测死循环', () => {
      const config: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
          { id: 'task2', type: NodeType.TASK, name: '任务2' },
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'task2' },
          { id: 'e3', source: 'task2', target: 'task1' }, // 形成循环
          { id: 'e4', source: 'task2', target: 'end' },
        ],
      }

      const result = workflowService.validateWorkflow(config)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'DEAD_LOOP')).toBe(true)
    })
  })

  describe('工作流创建和更新', () => {
    it('应该成功创建工作流', async () => {
      const config: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'end' },
        ],
      }

      const workflow = await workflowService.createWorkflow(
        {
          name: 'test-workflow-1',
          description: '测试工作流',
          config,
        },
        testUserId
      )

      expect(workflow).toBeDefined()
      expect(workflow.name).toBe('test-workflow-1')
      expect(workflow.version).toBe(1)
      expect(workflow.status).toBe('DRAFT')
      expect(workflow.isActive).toBe(false)
    })

    it('应该拒绝创建无效的工作流', async () => {
      const config: WorkflowConfig = {
        nodes: [
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
        ],
        edges: [],
      }

      await expect(
        workflowService.createWorkflow(
          {
            name: 'test-invalid-workflow',
            config,
          },
          testUserId
        )
      ).rejects.toThrow('工作流配置验证失败')
    })

    it('应该在配置变更时创建新版本', async () => {
      const config: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'end' },
        ],
      }

      // 创建工作流
      const workflow = await workflowService.createWorkflow(
        {
          name: 'test-workflow-version',
          config,
        },
        testUserId
      )

      // 更新配置
      const newConfig: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
          { id: 'task2', type: NodeType.TASK, name: '任务2' },
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'task2' },
          { id: 'e3', source: 'task2', target: 'end' },
        ],
      }

      const updatedWorkflow = await workflowService.updateWorkflow(
        workflow.id,
        { config: newConfig },
        testUserId
      )

      expect(updatedWorkflow.version).toBe(2)
    })

    it('应该在仅更新名称时不创建新版本', async () => {
      const config: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'end' },
        ],
      }

      const workflow = await workflowService.createWorkflow(
        {
          name: 'test-workflow-name-update',
          config,
        },
        testUserId
      )

      const updatedWorkflow = await workflowService.updateWorkflow(
        workflow.id,
        { name: 'test-workflow-name-updated' },
        testUserId
      )

      expect(updatedWorkflow.version).toBe(1)
      expect(updatedWorkflow.name).toBe('test-workflow-name-updated')
    })
  })

  describe('工作流激活和停用', () => {
    it('应该成功激活工作流', async () => {
      const config: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'end' },
        ],
      }

      const workflow = await workflowService.createWorkflow(
        {
          name: 'test-workflow-activate',
          config,
        },
        testUserId
      )

      const activatedWorkflow = await workflowService.activateWorkflow(workflow.id, testUserId)

      expect(activatedWorkflow.isActive).toBe(true)
      expect(activatedWorkflow.status).toBe('ACTIVE')
      expect(activatedWorkflow.activatedAt).toBeDefined()
    })

    it('应该在激活新工作流时停用同名的旧工作流', async () => {
      const config: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'end' },
        ],
      }

      // 创建并激活第一个工作流
      const workflow1 = await workflowService.createWorkflow(
        {
          name: 'test-workflow-replace',
          config,
        },
        testUserId
      )
      await workflowService.activateWorkflow(workflow1.id, testUserId)

      // 创建并激活第二个同名工作流
      const workflow2 = await workflowService.createWorkflow(
        {
          name: 'test-workflow-replace',
          config,
        },
        testUserId
      )
      await workflowService.activateWorkflow(workflow2.id, testUserId)

      // 检查第一个工作流是否被停用
      const oldWorkflow = await workflowService.getWorkflow(workflow1.id)
      expect(oldWorkflow?.isActive).toBe(false)
      expect(oldWorkflow?.status).toBe('INACTIVE')

      // 检查第二个工作流是否激活
      const newWorkflow = await workflowService.getWorkflow(workflow2.id)
      expect(newWorkflow?.isActive).toBe(true)
      expect(newWorkflow?.status).toBe('ACTIVE')
    })

    it('应该成功停用工作流', async () => {
      const config: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'end' },
        ],
      }

      const workflow = await workflowService.createWorkflow(
        {
          name: 'test-workflow-deactivate',
          config,
        },
        testUserId
      )

      await workflowService.activateWorkflow(workflow.id, testUserId)
      const deactivatedWorkflow = await workflowService.deactivateWorkflow(workflow.id, testUserId)

      expect(deactivatedWorkflow.isActive).toBe(false)
      expect(deactivatedWorkflow.status).toBe('INACTIVE')
    })
  })

  describe('工作流查询', () => {
    beforeEach(async () => {
      // 创建测试数据
      const config: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '任务1' },
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'end' },
        ],
      }

      await workflowService.createWorkflow(
        { name: 'test-workflow-query-1', config },
        testUserId
      )
      await workflowService.createWorkflow(
        { name: 'test-workflow-query-2', config },
        testUserId
      )
    })

    it('应该成功查询工作流列表', async () => {
      const result = await workflowService.listWorkflows({})

      expect(result.items.length).toBeGreaterThanOrEqual(2)
      expect(result.total).toBeGreaterThanOrEqual(2)
    })

    it('应该支持按状态过滤', async () => {
      const result = await workflowService.listWorkflows({ status: 'DRAFT' })

      expect(result.items.every(w => w.status === 'DRAFT')).toBe(true)
    })

    it('应该支持搜索', async () => {
      const result = await workflowService.listWorkflows({ search: 'query-1' })

      expect(result.items.some(w => w.name.includes('query-1'))).toBe(true)
    })

    it('应该支持分页', async () => {
      const result = await workflowService.listWorkflows({ page: 1, pageSize: 1 })

      expect(result.items.length).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(1)
    })
  })

  describe('工作流实例管理', () => {
    let testWorkflowId: string
    let testSampleId: string

    beforeEach(async () => {
      // 创建测试工作流
      const config: WorkflowConfig = {
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始' },
          { id: 'task1', type: NodeType.TASK, name: '检测任务' },
          { id: 'task2', type: NodeType.TASK, name: '审核任务' },
          { id: 'end', type: NodeType.END, name: '结束' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'task2' },
          { id: 'e3', source: 'task2', target: 'end' },
        ],
      }

      const workflow = await workflowService.createWorkflow(
        {
          name: 'test-workflow-instance',
          config,
        },
        testUserId
      )
      await workflowService.activateWorkflow(workflow.id, testUserId)
      testWorkflowId = workflow.id

      // 创建测试样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `TEST-${Date.now()}`,
          sampleNumber: `SN-${Date.now()}`,
          clientName: '测试客户',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          status: 'REGISTERED',
          createdBy: testUserId,
        },
      })
      testSampleId = sample.id
    })

    afterEach(async () => {
      // 清理测试数据
      await prisma.task.deleteMany({
        where: {
          instance: {
            sampleId: testSampleId,
          },
        },
      })
      await prisma.workflowInstance.deleteMany({
        where: {
          sampleId: testSampleId,
        },
      })
      await prisma.sample.deleteMany({
        where: {
          id: testSampleId,
        },
      })
    })

    it('应该成功启动工作流实例', async () => {
      const instance = await workflowService.startWorkflowInstance(
        testSampleId,
        testWorkflowId,
        testUserId
      )

      expect(instance).toBeDefined()
      expect(instance.workflowId).toBe(testWorkflowId)
      expect(instance.sampleId).toBe(testSampleId)
      expect(instance.status).toBe('RUNNING')
      expect(instance.currentNodes).toContain('start')
    })

    it('应该拒绝为已有实例的样品启动新实例', async () => {
      await workflowService.startWorkflowInstance(testSampleId, testWorkflowId, testUserId)

      await expect(
        workflowService.startWorkflowInstance(testSampleId, testWorkflowId, testUserId)
      ).rejects.toThrow('样品已有工作流实例')
    })

    it('应该在启动实例时创建开始节点的任务', async () => {
      const instance = await workflowService.startWorkflowInstance(
        testSampleId,
        testWorkflowId,
        testUserId
      )

      const tasks = await prisma.task.findMany({
        where: {
          instanceId: instance.id,
        },
      })

      expect(tasks.length).toBeGreaterThan(0)
      expect(tasks.some(t => t.nodeId === 'start')).toBe(true)
    })

    it('应该成功完成节点并推进到下一个节点', async () => {
      const instance = await workflowService.startWorkflowInstance(
        testSampleId,
        testWorkflowId,
        testUserId
      )

      // 完成开始节点
      const updatedInstance = await workflowService.completeNode(
        instance.id,
        'start',
        testUserId
      )

      expect(updatedInstance.currentNodes).not.toContain('start')
      expect(updatedInstance.currentNodes).toContain('task1')
    })

    it('应该在完成节点时创建下一个节点的任务', async () => {
      const instance = await workflowService.startWorkflowInstance(
        testSampleId,
        testWorkflowId,
        testUserId
      )

      await workflowService.completeNode(instance.id, 'start', testUserId)

      const tasks = await prisma.task.findMany({
        where: {
          instanceId: instance.id,
          nodeId: 'task1',
        },
      })

      expect(tasks.length).toBeGreaterThan(0)
    })

    it('应该在到达结束节点时完成工作流实例', async () => {
      const instance = await workflowService.startWorkflowInstance(
        testSampleId,
        testWorkflowId,
        testUserId
      )

      // 依次完成所有节点
      await workflowService.completeNode(instance.id, 'start', testUserId)
      await workflowService.completeNode(instance.id, 'task1', testUserId)
      const finalInstance = await workflowService.completeNode(instance.id, 'task2', testUserId)

      expect(finalInstance.status).toBe('COMPLETED')
      expect(finalInstance.completedAt).toBeDefined()
    })

    it('应该成功获取当前节点', async () => {
      const instance = await workflowService.startWorkflowInstance(
        testSampleId,
        testWorkflowId,
        testUserId
      )

      const currentNodes = await workflowService.getCurrentNodes(instance.id)

      expect(currentNodes.length).toBeGreaterThan(0)
      expect(currentNodes[0].id).toBe('start')
    })

    it('应该成功更新工作流变量', async () => {
      const instance = await workflowService.startWorkflowInstance(
        testSampleId,
        testWorkflowId,
        testUserId
      )

      const variables = { testKey: 'testValue', count: 42 }
      const updatedInstance = await workflowService.updateWorkflowVariables(
        instance.id,
        variables
      )

      expect(updatedInstance.variables).toMatchObject(variables)
    })

    it('应该成功获取工作流变量', async () => {
      const instance = await workflowService.startWorkflowInstance(
        testSampleId,
        testWorkflowId,
        testUserId
      )

      const variables = { testKey: 'testValue' }
      await workflowService.updateWorkflowVariables(instance.id, variables)

      const retrievedVariables = await workflowService.getWorkflowVariables(instance.id)

      expect(retrievedVariables).toMatchObject(variables)
    })

    it('应该成功暂停工作流实例', async () => {
      const instance = await workflowService.startWorkflowInstance(
        testSampleId,
        testWorkflowId,
        testUserId
      )

      const suspendedInstance = await workflowService.suspendWorkflowInstance(
        instance.id,
        testUserId
      )

      expect(suspendedInstance.status).toBe('SUSPENDED')
    })

    it('应该成功恢复工作流实例', async () => {
      const instance = await workflowService.startWorkflowInstance(
        testSampleId,
        testWorkflowId,
        testUserId
      )

      await workflowService.suspendWorkflowInstance(instance.id, testUserId)
      const resumedInstance = await workflowService.resumeWorkflowInstance(
        instance.id,
        testUserId
      )

      expect(resumedInstance.status).toBe('RUNNING')
    })

    it('应该成功终止工作流实例', async () => {
      const instance = await workflowService.startWorkflowInstance(
        testSampleId,
        testWorkflowId,
        testUserId
      )

      const terminatedInstance = await workflowService.terminateWorkflowInstance(
        instance.id,
        testUserId,
        '测试终止'
      )

      expect(terminatedInstance.status).toBe('TERMINATED')
      expect(terminatedInstance.completedAt).toBeDefined()
    })

    it('应该在终止实例时取消所有未完成的任务', async () => {
      const instance = await workflowService.startWorkflowInstance(
        testSampleId,
        testWorkflowId,
        testUserId
      )

      await workflowService.terminateWorkflowInstance(instance.id, testUserId)

      const tasks = await prisma.task.findMany({
        where: {
          instanceId: instance.id,
          status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
        },
      })

      expect(tasks.length).toBe(0)
    })
  })
})
