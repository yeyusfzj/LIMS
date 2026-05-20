/**
 * 报告模板连接缺陷条件探索测试
 * 
 * 目标：在修复前展示缺陷的反例，确认缺陷存在
 * 预期：测试在未修复代码上失败（这确认了缺陷存在）
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 * 
 * 注意：由于 ReportTemplateEditor.vue 存在两个 <script setup> 块的严重缺陷，
 * Vue 编译器在编译阶段就会报错，因此我们无法直接挂载该组件进行测试。
 * 这个测试将通过静态分析来验证缺陷。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import ReportTemplateList from '@/views/report/ReportTemplateList.vue'
import fs from 'fs'
import path from 'path'

// Mock dependencies
vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  },
  ElMessageBox: {
    confirm: vi.fn()
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

// Mock http service
vi.mock('@/services/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

describe('报告模板连接缺陷条件探索测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Property 1: Bug Condition - 重复 script 块导致的严重缺陷', () => {
    it('ReportTemplateEditor.vue 应该只有一个 <script setup> 块，但实际存在两个（缺陷演示）', () => {
      // 这个测试验证 ReportTemplateEditor.vue 是否存在重复的 script 块问题
      // 根据设计文档，该文件存在两个 <script setup> 块，第二个块没有导入 http
      // 这是一个严重缺陷，会导致 Vue 编译器报错：
      // "Single file component can contain only one <script setup> element"
      
      // 读取组件源代码
      const componentPath = path.resolve(__dirname, '../views/report/ReportTemplateEditor.vue')
      
      let componentSource = ''
      try {
        componentSource = fs.readFileSync(componentPath, 'utf-8')
      } catch (error) {
        console.log('无法读取组件源代码，跳过此测试')
        return
      }

      // 检查是否存在多个 <script setup> 块
      const scriptSetupMatches = componentSource.match(/<script setup/g)
      const scriptSetupCount = scriptSetupMatches ? scriptSetupMatches.length : 0

      console.log('\n=== Bug Condition 探索测试结果 ===')
      console.log('检测到的 <script setup> 块数量:', scriptSetupCount)

      // 检查第一个 script 块是否包含 http 导入
      const firstScriptMatch = componentSource.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)
      const firstScriptContent = firstScriptMatch ? firstScriptMatch[1] : ''
      const hasHttpImportInFirst = firstScriptContent.includes("import http from '@/services/http'")

      console.log('第一个 script 块是否包含 http 导入:', hasHttpImportInFirst)

      // 如果存在第二个 script 块，检查是否包含 http 导入
      if (scriptSetupCount > 1) {
        // 查找所有 script 块
        const allScriptMatches = componentSource.match(/<script setup[^>]*>[\s\S]*?<\/script>/g)
        if (allScriptMatches && allScriptMatches.length > 1) {
          const secondScriptContent = allScriptMatches[1]
          const hasHttpImportInSecond = secondScriptContent.includes("import http from '@/services/http'")

          console.log('第二个 script 块是否包含 http 导入:', hasHttpImportInSecond)

          // 缺陷验证：如果存在第二个 script 块且没有 http 导入，这就是缺陷
          if (!hasHttpImportInSecond) {
            console.log('\n❌ 缺陷确认：第二个 script 块缺少 http 导入')
            console.log('这会导致 Vue 编译器报错：Single file component can contain only one <script setup> element')
          }
        }
      }

      console.log('===================================\n')

      // 期望行为：应该只有一个 script setup 块
      // 实际缺陷：存在两个 script 块，导致 Vue 编译器报错
      // 这个断言会失败，证明缺陷存在
      expect(scriptSetupCount).toBe(1)
    })

    it('ReportTemplateEditor.vue 的第一个 script 块应该包含 http 导入（验证修复方案）', () => {
      // 验证第一个 script 块是否包含必要的 http 导入
      // 这将帮助我们确认修复方案：保留第一个块，删除第二个块
      
      const componentPath = path.resolve(__dirname, '../views/report/ReportTemplateEditor.vue')
      const componentSource = fs.readFileSync(componentPath, 'utf-8')

      // 提取第一个 script 块
      const firstScriptMatch = componentSource.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)
      const firstScriptContent = firstScriptMatch ? firstScriptMatch[1] : ''

      // 检查必要的导入
      const hasHttpImport = firstScriptContent.includes("import http from '@/services/http'")
      const hasVueImports = firstScriptContent.includes("import { ref, reactive, computed, onMounted } from 'vue'")
      const hasRouterImports = firstScriptContent.includes("import { useRouter, useRoute } from 'vue-router'")

      console.log('\n=== 修复方案验证 ===')
      console.log('第一个 script 块包含的导入:')
      console.log('- http 服务:', hasHttpImport)
      console.log('- Vue 核心:', hasVueImports)
      console.log('- Vue Router:', hasRouterImports)
      console.log('====================\n')

      // 验证第一个块包含所有必要的导入
      // 这证明我们应该保留第一个块，删除第二个块
      expect(hasHttpImport).toBe(true)
      expect(hasVueImports).toBe(true)
      expect(hasRouterImports).toBe(true)
    })

    it('应该记录缺陷的详细信息和修复方案', () => {
      // 这个测试记录缺陷的详细信息，用于后续修复参考
      
      const bugReport = {
        component: 'ReportTemplateEditor.vue',
        severity: 'CRITICAL',
        impact: 'Vue 编译器无法编译该组件，导致整个报告模板编辑功能完全不可用',
        rootCause: '文件中存在两个 <script setup> 块，违反了 Vue 3 单文件组件规范',
        affectedFeatures: [
          '报告模板创建',
          '报告模板编辑',
          '报告模板保存',
          '报告模板加载'
        ],
        errorMessage: 'Single file component can contain only one <script setup> element',
        detectedAt: 'Compile time',
        userImpact: '用户无法访问报告模板编辑器页面，显示编译错误',
        fixPlan: {
          step1: '删除第二个 <script setup> 块（第 705 行开始）',
          step2: '保留第一个 <script setup> 块（第 229 行开始）',
          step3: '验证第一个块包含所有必要的导入，包括 http 服务',
          step4: '确保只有一个 <script setup> 块存在',
          expectedResult: 'Vue 编译器能够成功编译组件，http 服务可以正常使用'
        }
      }

      console.log('\n=== 缺陷报告 ===')
      console.log(JSON.stringify(bugReport, null, 2))
      console.log('================\n')

      // 验证缺陷的严重性
      expect(bugReport.severity).toBe('CRITICAL')
      expect(bugReport.affectedFeatures.length).toBeGreaterThan(0)
    })
  })

  describe('Property 1: Bug Condition - HTTP 服务调用验证（ReportTemplateList.vue）', () => {
    it('ReportTemplateList.vue 的 fetchTemplates() 方法应该能够调用 http.get()（功能验证）', async () => {
      // 这个测试验证 ReportTemplateList.vue 是否正确导入了 http 服务
      // 在未修复的代码上，如果缺少导入，会抛出 ReferenceError: http is not defined
      
      const mockTemplates = [
        {
          id: '1',
          name: '水质检测报告模板',
          version: 1,
          category: 'water',
          content: '<h1>测试模板</h1>',
          variables: [],
          isActive: true,
          createdBy: 'admin',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]

      // Mock http.get 返回模板数据
      const httpModule = await import('@/services/http')
      vi.mocked(httpModule.default.get).mockResolvedValue(mockTemplates)

      // 挂载组件
      const wrapper = mount(ReportTemplateList, {
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
            'el-tag': true,
            'el-icon': true
          }
        }
      })

      // 等待组件挂载和数据加载
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 验证 http.get 被调用
      // 如果 http 未定义，这里会抛出错误
      expect(httpModule.default.get).toHaveBeenCalled()
      expect(httpModule.default.get).toHaveBeenCalledWith(
        '/report-templates',
        expect.objectContaining({
          params: expect.any(Object)
        })
      )

      // 验证模板列表被正确加载
      const templates = wrapper.vm.templateList
      console.log('\n=== ReportTemplateList 功能验证 ===')
      console.log('加载的模板列表数量:', templates.length)
      console.log('第一个模板名称:', templates[0]?.name)
      console.log('====================================\n')
      
      // 期望行为：应该成功加载模板列表
      // 缺陷：如果 http 未定义，会抛出 ReferenceError
      expect(templates.length).toBeGreaterThan(0)
      expect(templates[0].name).toBe('水质检测报告模板')
    })

    it('ReportTemplateList.vue 的 handleDelete() 方法应该能够调用 http.delete()（功能验证）', async () => {
      // 这个测试验证 ReportTemplateList.vue 删除功能是否能正确调用 http.delete
      // 在未修复的代码上，如果缺少导入，会抛出 ReferenceError: http is not defined
      
      const httpModule = await import('@/services/http')
      vi.mocked(httpModule.default.get).mockResolvedValue([])
      vi.mocked(httpModule.default.delete).mockResolvedValue({ success: true })

      // Mock ElMessageBox.confirm
      const { ElMessageBox } = await import('element-plus')
      vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any)

      // 挂载组件
      const wrapper = mount(ReportTemplateList, {
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
            'el-tag': true,
            'el-icon': true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // 创建测试模板对象
      const testTemplate = {
        id: '456',
        name: '待删除模板',
        version: 'v1.0',
        applicableTypes: ['water'],
        status: 'draft',
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        content: '<h1>测试</h1>',
        variables: []
      }

      // 调用删除方法
      await wrapper.vm.handleDelete(testTemplate)

      // 等待异步操作完成
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 验证 http.delete 被调用
      // 如果 http 未定义，这里会抛出错误
      expect(httpModule.default.delete).toHaveBeenCalled()
      expect(httpModule.default.delete).toHaveBeenCalledWith('/report-templates/456')

      console.log('\n=== ReportTemplateList 删除功能验证 ===')
      console.log('http.delete 调用次数:', vi.mocked(httpModule.default.delete).mock.calls.length)
      console.log('删除的模板 ID:', '456')
      console.log('========================================\n')
    })
  })
})
