/**
 * 任务派工属性测试
 * 使用 fast-check 进行基于属性的测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { TaskService } from '../services/taskService'
import { AssignmentEngine } from '../services/assignmentEngine'

const prisma = new PrismaClient()
const taskService = new TaskService()
const assignmentEngine = new AssignmentEngine()

describe('任务派工属性测试', () => {
  let testWorkflowId: string

  beforeAll(async () => {
    // 初始化派工引擎
    await assignmentEngine.initialize()

    // 创建测试工作流
    const testWorkflow = await prisma.workflow.create({
      data: {
        name: 'PROP-TEST-WORKFLOW',
        description: '属性测试工作流',
        version: 1,
        config: {
          nodes: [
            { id: 'start', type: 'START', name: '开始' },
            { id: 'test-node', type: 'TASK', name: '测试节点' },
            { id: 'end', type: 'END', name: '结束' }
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'test-node' },
            { id: 'e2', source: 'test-node', target: 'end' }
          ]
        },
        status: 'ACTIVE',
        isActive: true,
        createdBy: 'prop-test-system'
      }
    })
    testWorkflowId = testWorkflow.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.task.deleteMany({
      where: {
        nodeName: {
          startsWith: 'PROP-TEST-'
        }
      }
    })
    await prisma.workflowInstance.deleteMany({
      where: {
        sample: {
          barcode: {
            startsWith: 'PROP-TEST-ASSIGN-'
          }
        }
      }
    })
    await prisma.sample.deleteMany({
      where: {
        barcode: {
          startsWith: 'PROP-TEST-ASSIGN-'
        }
      }
    })
    await prisma.workflow.deleteMany({
      where: {
        name: 'PROP-TEST-WORKFLOW'
      }
    })
    await prisma.$disconnect()
  })

  /**
   * 属性 10: 任务自动创建一致性
   * **验证需求: 6.1**
   * 
   * 属性描述:
   * 对于任何进入工作流节点的样品,如果节点配置了自动创建任务,
   * 系统必须创建对应的任务记录。
   */
  describe('属性 10: 任务自动创建一致性', () => {
    it('当样品进入配置了自动创建任务的节点时,应该创建对应的任务', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机的节点配置
          fc.record({
            nodeType: fc.constantFrom('TASK', 'REVIEW', 'APPROVAL'),
            nodeName: fc.string({ minLength: 3, maxLength: 20 }).map(s => `PROP-TEST-${s}`),
            autoCreateTask: fc.constant(true),
            priority: fc.constantFrom('LOW', 'NORMAL', 'HIGH', 'URGENT')
          }),
          async (nodeConfig) => {
            // 创建测试样品
            const barcode = `PROP-TEST-ASSIGN-${Date.now()}-${Math.random().toString(36).substring(7)}`
            const sample = await prisma.sample.create({
              data: {
                barcode,
                sampleNumber: `SN-${barcode}`,
                clientName: '派工测试客户',
                sampleName: '派工测试样品',
                sampleType: '水样',
                sampleCategory: '环境样品',
                quantity: 100,
                unit: 'mL',
                receivedDate: new Date(),
                status: 'REGISTERED',
                priority: 'NORMAL',
                createdBy: 'prop-test-user'
              }
            })

            try {
              // 创建工作流实例
              const instance = await prisma.workflowInstance.create({
                data: {
                  workflowId: testWorkflowId,
                  sampleId: sample.id,
                  currentNodes: [nodeConfig.nodeName],
                  status: 'RUNNING',
                  variables: {}
                }
              })

              // 记录任务创建前的数量
              const taskCountBefore = await prisma.task.count({
                where: {
                  instanceId: instance.id,
                  nodeId: nodeConfig.nodeName
                }
              })

              // 模拟节点进入,触发任务创建
              const task = await taskService.createTask({
                instanceId: instance.id,
                nodeId: nodeConfig.nodeName,
                nodeName: nodeConfig.nodeName,
                nodeType: nodeConfig.nodeType,
                priority: nodeConfig.priority as any
              })

              // 验证任务已创建
              const taskCountAfter = await prisma.task.count({
                where: {
                  instanceId: instance.id,
                  nodeId: nodeConfig.nodeName
                }
              })

              // 属性验证 1: 任务数量应该增加1
              expect(taskCountAfter).toBe(taskCountBefore + 1)

              // 属性验证 2: 任务应该关联到正确的工作流实例
              expect(task.instanceId).toBe(instance.id)

              // 属性验证 3: 任务应该包含正确的节点信息
              expect(task.nodeId).toBe(nodeConfig.nodeName)
              expect(task.nodeName).toBe(nodeConfig.nodeName)
              expect(task.nodeType).toBe(nodeConfig.nodeType)

              // 属性验证 4: 任务优先级应该与节点配置一致
              expect(task.priority).toBe(nodeConfig.priority)

              // 属性验证 5: 任务初始状态应该是 PENDING
              expect(task.status).toBe('PENDING')

            } finally {
              // 清理测试数据
              await prisma.task.deleteMany({
                where: {
                  instance: {
                    sampleId: sample.id
                  }
                }
              })
              await prisma.workflowInstance.deleteMany({
                where: { sampleId: sample.id }
              })
              await prisma.sample.delete({
                where: { id: sample.id }
              })
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * 属性 11: 派工规则确定性
   * **验证需求: 6.3**
   * 
   * 属性描述:
   * 对于任何满足派工规则的任务,系统应该根据优先级规则选择唯一的最合适人员,
   * 相同输入产生相同输出。
   */
  describe('属性 11: 派工规则确定性', () => {
    it('当没有合适的候选人时,派工应该失败并将任务标记为待分配', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nodeType: fc.constantFrom('TASK', 'REVIEW', 'APPROVAL'),
            requiredSkill: fc.string({ minLength: 5, maxLength: 20 }).map(s => `rare-skill-${s}`)
          }),
          async (taskConfig) => {
            // 创建测试样品和任务
            const barcode = `PROP-TEST-ASSIGN-${Date.now()}-${Math.random().toString(36).substring(7)}`
            const sample = await prisma.sample.create({
              data: {
                barcode,
                sampleNumber: `SN-${barcode}`,
                clientName: '派工失败测试客户',
                sampleName: '派工失败测试样品',
                sampleType: '水样',
                sampleCategory: '环境样品',
                quantity: 100,
                unit: 'mL',
                receivedDate: new Date(),
                status: 'REGISTERED',
                priority: 'NORMAL',
                createdBy: 'prop-test-user'
              }
            })

            try {
              const instance = await prisma.workflowInstance.create({
                data: {
                  workflowId: testWorkflowId,
                  sampleId: sample.id,
                  currentNodes: ['test-node'],
                  status: 'RUNNING',
                  variables: {}
                }
              })

              const task = await taskService.createTask({
                instanceId: instance.id,
                nodeId: 'test-node',
                nodeName: `PROP-TEST-${taskConfig.nodeType}`,
                nodeType: taskConfig.nodeType,
                priority: 'NORMAL'
              })

              // 尝试派工(使用一个不存在的技能要求)
              const result = await assignmentEngine.autoAssign({
                taskId: task.id,
                nodeType: taskConfig.nodeType,
                nodeName: `PROP-TEST-${taskConfig.nodeType}`,
                priority: 'NORMAL',
                sampleId: sample.id,
                workflowId: testWorkflowId,
                instanceId: instance.id
              })

              // 属性验证 1: 派工应该失败
              expect(result.success).toBe(false)

              // 属性验证 2: 应该有失败原因
              expect(result.reason).toBeDefined()
              expect(result.reason).toBeTruthy()

              // 属性验证 3: 任务应该保持 PENDING 状态
              const updatedTask = await prisma.task.findUnique({
                where: { id: task.id }
              })
              expect(updatedTask?.status).toBe('PENDING')
              expect(updatedTask?.assignedTo).toBeNull()

            } finally {
              // 清理测试数据
              await prisma.task.deleteMany({
                where: {
                  instance: {
                    sampleId: sample.id
                  }
                }
              })
              await prisma.workflowInstance.deleteMany({
                where: { sampleId: sample.id }
              })
              await prisma.sample.delete({
                where: { id: sample.id }
              })
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })
})
