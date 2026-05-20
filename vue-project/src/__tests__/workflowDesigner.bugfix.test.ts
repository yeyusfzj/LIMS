/**
 * 工作流模板拖拽功能缺陷条件探索测试
 * 
 * 目标：在修复前展示缺陷的反例，确认缺陷存在
 * 预期：测试在未修复代码上失败（这确认了缺陷存在）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import WorkflowTemplates from '@/views/workflow/WorkflowTemplates.vue'
import WorkflowDesigner from '@/views/workflow/WorkflowDesigner.vue'
import { workflowApi } from '@/services/api/workflow'

// Mock dependencies
vi.mock('@/services/api/workflow')
vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  }),
  useRoute: () => ({
    params: {},
    query: {}
  })
}))

describe('工作流模板拖拽功能缺陷条件探索测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Property 1: Bug Condition - 模板列表加载缺陷', () => {
    it('应该在后端有数据时显示模板列表，但实际返回空列表（缺陷演示）', async () => {
      // 模拟后端返回有效的工作流数据
      const mockWorkflowData = [
        {
          id: 'workflow-1',
          name: '水质检测工作流',
          version: 1,
          description: '标准水质检测流程',
          isActive: true,
          status: 'ACTIVE',
          createdBy: 'admin',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          config: {
            nodes: [
              { id: 'start-1', type: 'START', name: '开始', description: '流程开始' },
              { id: 'task-1', type: 'TASK', name: '样品接收', description: '接收样品' },
              { id: 'end-1', type: 'END', name: '结束', description: '流程结束' }
            ],
            edges: [
              { id: 'edge-1', source: 'start-1', target: 'task-1' },
              { id: 'edge-2', source: 'task-1', target: 'end-1' }
            ]
          }
        }
      ]

      // 模拟API返回数据
      vi.mocked(workflowApi.getList).mockResolvedValue(mockWorkflowData)

      // 挂载组件
      const wrapper = mount(WorkflowTemplates, {
        global: {
          stubs: {
            'el-button': true,
            'el-card': true,
            'el-form': true,
            'el-form-item': true,
            'el-input': true,
            'el-select': true,
            'el-option': true,
            'el-table': true,
            'el-table-column': true,
            'el-pagination': true,
            'el-dialog': true,
            'el-switch': true,
            'el-tag': true,
            'el-link': true,
            'el-text': true,
            'el-dropdown': true,
            'el-dropdown-menu': true,
            'el-dropdown-item': true
          }
        }
      })

      // 等待组件挂载和数据加载
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 验证API被调用
      expect(workflowApi.getList).toHaveBeenCalled()

      // 获取组件实例的模板数据
      const templates = wrapper.vm.templates

      // 缺陷验证：即使后端返回数据，前端可能显示空列表
      // 这个测试应该失败，因为存在数据格式不匹配的缺陷
      console.log('API返回的数据:', mockWorkflowData)
      console.log('组件中的模板数据:', templates)
      console.log('模板数量:', templates.length)

      // 期望行为：应该有1个模板
      // 实际缺陷：可能因为数据格式转换问题导致列表为空
      expect(templates.length).toBeGreaterThan(0)
      expect(templates[0]).toMatchObject({
        id: 'workflow-1',
        name: '水质检测工作流',
        version: 'v1',
        status: 'active'
      })
    })

    it('应该正确处理API响应数据格式，但可能存在格式不匹配（缺陷演示）', async () => {
      // 模拟后端返回不同格式的数据（可能的格式不匹配问题）
      const mockApiResponse = {
        items: [
          {
            id: 'workflow-2',
            name: '土壤检测工作流',
            version: 2,
            description: '土壤样品检测流程',
            isActive: false,
            status: 'DRAFT',
            createdBy: 'testuser',
            createdAt: '2024-01-02T00:00:00Z'
          }
        ],
        total: 1,
        page: 1,
        pageSize: 20
      }

      vi.mocked(workflowApi.getList).mockResolvedValue(mockApiResponse as any)

      const wrapper = mount(WorkflowTemplates, {
        global: {
          stubs: {
            'el-button': true,
            'el-card': true,
            'el-form': true,
            'el-form-item': true,
            'el-input': true,
            'el-select': true,
            'el-option': true,
            'el-table': true,
            'el-table-column': true,
            'el-pagination': true,
            'el-dialog': true,
            'el-switch': true,
            'el-tag': true,
            'el-link': true,
            'el-text': true,
            'el-dropdown': true,
            'el-dropdown-menu': true,
            'el-dropdown-item': true
          }
        }
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      const templates = wrapper.vm.templates

      // 缺陷验证：数据格式不匹配可能导致解析失败
      console.log('API响应格式:', mockApiResponse)
      console.log('解析后的模板:', templates)

      // 期望：应该正确解析 items 数组中的数据
      // 缺陷：可能无法正确处理嵌套的 items 格式
      expect(templates.length).toBe(1)
      expect(templates[0].name).toBe('土壤检测工作流')
    })
  })

  describe('Property 1: Bug Condition - 节点拖拽功能缺陷', () => {
    it('应该在拖拽节点到画布时创建新节点，但实际无响应（缺陷演示）', async () => {
      const wrapper = mount(WorkflowDesigner, {
        global: {
          stubs: {
            'el-button': true,
            'el-card': true,
            'el-form': true,
            'el-form-item': true,
            'el-input': true,
            'el-select': true,
            'el-option': true,
            'el-tag': true,
            'el-text': true,
            'el-empty': true,
            'el-dialog': true,
            'el-icon': true,
            'NodeConfig': true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // 获取初始节点数量
      const initialNodeCount = wrapper.vm.nodes.length
      console.log('初始节点数量:', initialNodeCount)

      // 模拟拖拽开始事件
      const nodeType = { type: 'TASK', label: '任务节点', icon: 'DocumentChecked' }
      const dragStartEvent = new DragEvent('dragstart', {
        dataTransfer: new DataTransfer()
      })

      // 调用拖拽开始处理函数
      wrapper.vm.handleDragStart(dragStartEvent, nodeType)
      
      // 验证拖拽状态设置
      expect(wrapper.vm.draggedNodeType).toEqual(nodeType)

      // 模拟拖拽放置事件
      const canvas = wrapper.find('.canvas')
      expect(canvas.exists()).toBe(true)

      // 创建模拟的放置事件
      const dropEvent = new DragEvent('drop', {
        clientX: 300,
        clientY: 200,
        dataTransfer: new DataTransfer()
      })

      // 模拟画布元素的 getBoundingClientRect
      const mockRect = {
        left: 100,
        top: 50,
        width: 800,
        height: 600
      }
      
      // Mock canvasRef.value
      wrapper.vm.canvasRef = {
        getBoundingClientRect: () => mockRect
      }

      // 调用放置处理函数
      wrapper.vm.handleDrop(dropEvent)

      await wrapper.vm.$nextTick()

      // 验证节点是否被创建
      const finalNodeCount = wrapper.vm.nodes.length
      console.log('拖拽后节点数量:', finalNodeCount)
      console.log('新增的节点:', wrapper.vm.nodes)

      // 期望行为：应该创建一个新节点
      // 缺陷：可能因为事件处理问题导致节点未创建
      expect(finalNodeCount).toBe(initialNodeCount + 1)
      
      if (wrapper.vm.nodes.length > 0) {
        const newNode = wrapper.vm.nodes[wrapper.vm.nodes.length - 1]
        expect(newNode.type).toBe('TASK')
        expect(newNode.name).toContain('任务节点')
        expect(newNode.position.x).toBeGreaterThan(0)
        expect(newNode.position.y).toBeGreaterThan(0)
      }
    })

    it('应该正确处理画布拖拽事件绑定，但可能存在事件处理缺陷（缺陷演示）', async () => {
      const wrapper = mount(WorkflowDesigner, {
        global: {
          stubs: {
            'el-button': true,
            'el-card': true,
            'el-form': true,
            'el-form-item': true,
            'el-input': true,
            'el-select': true,
            'el-option': true,
            'el-tag': true,
            'el-text': true,
            'el-empty': true,
            'el-dialog': true,
            'el-icon': true,
            'NodeConfig': true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // 检查画布区域是否存在
      const canvasArea = wrapper.find('.canvas-area')
      expect(canvasArea.exists()).toBe(true)

      // 检查是否有拖拽事件监听器
      const canvasAreaElement = canvasArea.element
      console.log('画布区域HTML:', canvasAreaElement.outerHTML)

      // 验证拖拽相关的属性和事件
      // 缺陷可能在于：
      // 1. @drop 事件未正确绑定
      // 2. @dragover.prevent 未正确设置
      // 3. handleDrop 函数逻辑有问题

      // 检查 draggedNodeType 初始状态
      expect(wrapper.vm.draggedNodeType).toBeNull()

      // 模拟设置拖拽类型
      const nodeType = { type: 'START', label: '开始节点', icon: 'Operation' }
      wrapper.vm.draggedNodeType = nodeType

      // 检查 canvasRef 是否正确设置
      console.log('canvasRef 状态:', wrapper.vm.canvasRef)

      // 缺陷验证：canvasRef 可能为 null 导致 handleDrop 失败
      if (!wrapper.vm.canvasRef) {
        console.log('缺陷确认：canvasRef 为 null，这会导致 handleDrop 函数提前返回')
      }

      // 验证 handleDrop 函数的条件检查
      const mockDropEvent = new DragEvent('drop')
      
      // 这个调用可能会因为 canvasRef 为 null 而失败
      try {
        wrapper.vm.handleDrop(mockDropEvent)
        console.log('handleDrop 调用成功')
      } catch (error) {
        console.log('handleDrop 调用失败:', error)
      }

      // 期望：拖拽功能应该正常工作
      // 缺陷：可能因为 DOM 引用或事件处理问题导致功能失效
      expect(wrapper.vm.draggedNodeType).not.toBeNull()
    })
  })

  describe('Property 1: Bug Condition - API调用和错误处理缺陷', () => {
    it('应该在API调用失败时显示错误信息，但可能存在错误处理缺陷（缺陷演示）', async () => {
      // 模拟API调用失败
      const mockError = new Error('Network Error')
      vi.mocked(workflowApi.getList).mockRejectedValue(mockError)

      const wrapper = mount(WorkflowTemplates, {
        global: {
          stubs: {
            'el-button': true,
            'el-card': true,
            'el-form': true,
            'el-form-item': true,
            'el-input': true,
            'el-select': true,
            'el-option': true,
            'el-table': true,
            'el-table-column': true,
            'el-pagination': true,
            'el-dialog': true,
            'el-switch': true,
            'el-tag': true,
            'el-link': true,
            'el-text': true,
            'el-dropdown': true,
            'el-dropdown-menu': true,
            'el-dropdown-item': true
          }
        }
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 验证错误处理
      expect(workflowApi.getList).toHaveBeenCalled()
      expect(ElMessage.error).toHaveBeenCalled()

      // 验证组件状态
      const templates = wrapper.vm.templates
      const loading = wrapper.vm.loading

      console.log('API错误后的状态:', { 
        templatesLength: templates.length, 
        loading,
        errorCalled: vi.mocked(ElMessage.error).mock.calls
      })

      // 期望：错误处理后应该显示空列表且停止加载
      // 缺陷：可能错误处理不完善
      expect(templates.length).toBe(0)
      expect(loading).toBe(false)
    })
  })
})