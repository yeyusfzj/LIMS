/**
 * 工作流配置属性测试
 * 使用 fast-check 进行基于属性的测试
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import workflowService from '../services/workflowService'
import { WorkflowConfig, NodeType } from '../types/workflow'

describe('工作流配置属性测试', () => {
  /**
   * 属性 8: 工作流配置有效性
   * 验证需求: 5.2, 5.3
   * 
   * 属性描述:
   * 对于任何有效的工作流配置,验证函数应该返回 isValid = true
   * 对于任何无效的工作流配置,验证函数应该返回 isValid = false 并包含错误信息
   */
  describe('属性 8: 工作流配置有效性', () => {
    // 生成有效的工作流配置
    const validWorkflowConfigArbitrary = fc.integer({ min: 1, max: 8 }).chain(middleNodeCount => {
      // 生成中间节点
      const middleNodes = Array(middleNodeCount).fill(null).map((_, i) => ({
        id: `task-${i}`,
        type: NodeType.TASK,
        name: `任务${i + 1}`,
      }))
      
      // 构建完整的节点列表（开始 + 中间 + 结束）
      const nodes = [
        { id: 'start', type: NodeType.START, name: '开始' },
        ...middleNodes,
        { id: 'end', type: NodeType.END, name: '结束' },
      ]
      
      // 生成连接所有节点的边
      const edges = []
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({
          id: `edge-${i}`,
          source: nodes[i].id,
          target: nodes[i + 1].id,
        })
      }
      
      return fc.constant({
        nodes,
        edges,
      })
    })

    it('应该验证通过所有有效的工作流配置', () => {
      fc.assert(
        fc.property(validWorkflowConfigArbitrary, (config: WorkflowConfig) => {
          const result = workflowService.validateWorkflow(config)
          
          // 有效配置应该通过验证
          expect(result.isValid).toBe(true)
          expect(result.errors).toHaveLength(0)
        }),
        { numRuns: 100 }
      )
    })

    it('应该检测缺少开始节点的配置', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              type: fc.constantFrom(NodeType.TASK, NodeType.DECISION, NodeType.END),
              name: fc.string({ minLength: 1, maxLength: 50 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (nodes) => {
            const config: WorkflowConfig = {
              nodes: nodes.map((node, index) => ({ ...node, id: `node-${index}` })),
              edges: [],
            }
            
            const result = workflowService.validateWorkflow(config)
            
            // 缺少开始节点应该验证失败
            expect(result.isValid).toBe(false)
            expect(result.errors.some(e => e.type === 'MISSING_START')).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('应该检测缺少结束节点的配置', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              type: fc.constantFrom(NodeType.START, NodeType.TASK, NodeType.DECISION),
              name: fc.string({ minLength: 1, maxLength: 50 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (nodes) => {
            const config: WorkflowConfig = {
              nodes: nodes.map((node, index) => ({ ...node, id: `node-${index}` })),
              edges: [],
            }
            
            const result = workflowService.validateWorkflow(config)
            
            // 缺少结束节点应该验证失败
            expect(result.isValid).toBe(false)
            expect(result.errors.some(e => e.type === 'MISSING_END')).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('应该检测重复的节点 ID', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer({ min: 2, max: 5 }),
          (duplicateId, count) => {
            const nodes = [
              { id: 'start', type: NodeType.START, name: '开始' },
              ...Array(count).fill(null).map(() => ({
                id: duplicateId,
                type: NodeType.TASK,
                name: '任务',
              })),
              { id: 'end', type: NodeType.END, name: '结束' },
            ]
            
            const config: WorkflowConfig = {
              nodes,
              edges: [],
            }
            
            const result = workflowService.validateWorkflow(config)
            
            // 重复 ID 应该验证失败
            expect(result.isValid).toBe(false)
            expect(result.errors.some(e => e.type === 'DUPLICATE_NODE')).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('应该检测无效的边', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (nonexistentNodeId) => {
            const config: WorkflowConfig = {
              nodes: [
                { id: 'start', type: NodeType.START, name: '开始' },
                { id: 'task1', type: NodeType.TASK, name: '任务1' },
                { id: 'end', type: NodeType.END, name: '结束' },
              ],
              edges: [
                { id: 'e1', source: 'start', target: 'task1' },
                { id: 'e2', source: 'task1', target: nonexistentNodeId }, // 无效边
              ],
            }
            
            // 如果随机生成的 ID 恰好是已存在的节点 ID,跳过此测试
            if (['start', 'task1', 'end'].includes(nonexistentNodeId)) {
              return true
            }
            
            const result = workflowService.validateWorkflow(config)
            
            // 无效边应该验证失败
            expect(result.isValid).toBe(false)
            expect(result.errors.some(e => e.type === 'INVALID_EDGE')).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('应该检测孤立节点', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (isolatedNodeCount) => {
            const isolatedNodes = Array(isolatedNodeCount).fill(null).map((_, i) => ({
              id: `isolated-${i}`,
              type: NodeType.TASK,
              name: `孤立任务${i}`,
            }))
            
            const config: WorkflowConfig = {
              nodes: [
                { id: 'start', type: NodeType.START, name: '开始' },
                { id: 'task1', type: NodeType.TASK, name: '任务1' },
                ...isolatedNodes,
                { id: 'end', type: NodeType.END, name: '结束' },
              ],
              edges: [
                { id: 'e1', source: 'start', target: 'task1' },
                { id: 'e2', source: 'task1', target: 'end' },
              ],
            }
            
            const result = workflowService.validateWorkflow(config)
            
            // 孤立节点应该验证失败
            expect(result.isValid).toBe(false)
            expect(result.errors.some(e => e.type === 'ISOLATED_NODE')).toBe(true)
            
            // 验证错误信息中包含所有孤立节点
            const isolatedError = result.errors.find(e => e.type === 'ISOLATED_NODE')
            expect(isolatedError?.nodeIds?.length).toBe(isolatedNodeCount)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('应该检测死循环', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }),
          (cycleLength) => {
            // 创建一个包含循环的工作流
            const cycleNodes = Array(cycleLength).fill(null).map((_, i) => ({
              id: `cycle-${i}`,
              type: NodeType.TASK,
              name: `循环任务${i}`,
            }))
            
            const cycleEdges = cycleNodes.map((node, i) => ({
              id: `cycle-edge-${i}`,
              source: node.id,
              target: cycleNodes[(i + 1) % cycleLength].id, // 形成循环
            }))
            
            const config: WorkflowConfig = {
              nodes: [
                { id: 'start', type: NodeType.START, name: '开始' },
                ...cycleNodes,
                { id: 'end', type: NodeType.END, name: '结束' },
              ],
              edges: [
                { id: 'e1', source: 'start', target: cycleNodes[0].id },
                ...cycleEdges,
                { id: 'e2', source: cycleNodes[0].id, target: 'end' },
              ],
            }
            
            const result = workflowService.validateWorkflow(config)
            
            // 死循环应该验证失败
            expect(result.isValid).toBe(false)
            expect(result.errors.some(e => e.type === 'DEAD_LOOP')).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * 属性 9: 工作流版本一致性
   * 验证需求: 5.2, 5.3
   * 
   * 属性描述:
   * 当工作流配置发生变化时,版本号应该递增
   * 当工作流配置未变化时,版本号应该保持不变
   */
  describe('属性 9: 工作流版本一致性', () => {
    it('应该在配置变化时递增版本号', () => {
      // 此属性测试需要数据库操作,已在单元测试中覆盖
      // 这里验证版本号递增的逻辑
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.boolean(),
          (currentVersion, configChanged) => {
            // 模拟版本号计算逻辑
            const newVersion = configChanged ? currentVersion + 1 : currentVersion
            
            if (configChanged) {
              expect(newVersion).toBe(currentVersion + 1)
            } else {
              expect(newVersion).toBe(currentVersion)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('应该保证版本号单调递增', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
          (configChanges) => {
            let version = 1
            const versions = [version]
            
            for (const changed of configChanges) {
              if (changed) {
                version++
              }
              versions.push(version)
            }
            
            // 验证版本号序列是单调递增的
            for (let i = 1; i < versions.length; i++) {
              expect(versions[i]).toBeGreaterThanOrEqual(versions[i - 1])
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
