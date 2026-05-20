/**
 * 报告模板服务单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { ReportTemplateService } from '../services/reportTemplateService'
import { CreateTemplateDto, UpdateTemplateDto, TemplateVariable } from '../types/reportTemplate'

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    reportTemplate: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn()
    },
    report: {
      count: vi.fn()
    }
  }
  return {
    PrismaClient: vi.fn(() => mockPrisma)
  }
})

describe('ReportTemplateService', () => {
  let service: ReportTemplateService
  let mockPrisma: any

  beforeEach(() => {
    service = new ReportTemplateService()
    mockPrisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('createTemplate', () => {
    it('应该成功创建报告模板', async () => {
      const createDto: CreateTemplateDto = {
        name: '检测报告模板',
        description: '标准检测报告模板',
        category: '检测报告',
        content: '<html><body>样品名称: {{sampleName}}, 检测结果: {{result}}</body></html>',
        variables: [
          { name: 'sampleName', type: 'string', required: true },
          { name: 'result', type: 'string', required: true }
        ]
      }

      const mockTemplate = {
        id: 'template-1',
        ...createDto,
        variables: createDto.variables,
        version: 1,
        isActive: true,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.reportTemplate.create.mockResolvedValue(mockTemplate)

      const result = await service.createTemplate(createDto, 'user-1')

      expect(result).toEqual(mockTemplate)
      expect(mockPrisma.reportTemplate.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          description: createDto.description,
          category: createDto.category,
          content: createDto.content,
          variables: createDto.variables,
          version: 1,
          isActive: true,
          createdBy: 'user-1'
        }
      })
    })

    it('应该在模板格式验证失败时抛出错误', async () => {
      const createDto: CreateTemplateDto = {
        name: '无效模板',
        category: '测试',
        content: '<html><body>{{undefinedVariable}}</body></html>',
        variables: [
          { name: 'sampleName', type: 'string', required: true }
        ]
      }

      await expect(service.createTemplate(createDto, 'user-1')).rejects.toThrow('模板验证失败')
    })

    it('应该在变量名重复时抛出错误', async () => {
      const createDto: CreateTemplateDto = {
        name: '重复变量模板',
        category: '测试',
        content: '<html><body>{{sampleName}}</body></html>',
        variables: [
          { name: 'sampleName', type: 'string', required: true },
          { name: 'sampleName', type: 'string', required: true }
        ]
      }

      await expect(service.createTemplate(createDto, 'user-1')).rejects.toThrow('变量验证失败')
    })
  })

  describe('updateTemplate', () => {
    it('应该成功更新报告模板并增加版本号', async () => {
      const currentTemplate = {
        id: 'template-1',
        name: '旧模板名称',
        description: '旧描述',
        category: '检测报告',
        content: '<html><body>{{oldVar}}</body></html>',
        variables: [{ name: 'oldVar', type: 'string', required: true }],
        version: 1,
        isActive: true,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const updateDto: UpdateTemplateDto = {
        content: '<html><body>{{newVar}}</body></html>',
        variables: [{ name: 'newVar', type: 'string', required: true }]
      }

      const updatedTemplate = {
        ...currentTemplate,
        ...updateDto,
        version: 2,
        updatedAt: new Date()
      }

      mockPrisma.reportTemplate.findUnique.mockResolvedValue(currentTemplate)
      mockPrisma.reportTemplate.update.mockResolvedValue(updatedTemplate)

      const result = await service.updateTemplate('template-1', updateDto, 'user-1')

      expect(result.version).toBe(2)
      expect(mockPrisma.reportTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: expect.objectContaining({
          content: updateDto.content,
          variables: updateDto.variables,
          version: 2
        })
      })
    })

    it('应该在更新非内容字段时不增加版本号', async () => {
      const currentTemplate = {
        id: 'template-1',
        name: '旧模板名称',
        description: '旧描述',
        category: '检测报告',
        content: '<html><body>{{var1}}</body></html>',
        variables: [{ name: 'var1', type: 'string', required: true }],
        version: 1,
        isActive: true,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const updateDto: UpdateTemplateDto = {
        name: '新模板名称',
        description: '新描述'
      }

      const updatedTemplate = {
        ...currentTemplate,
        ...updateDto,
        updatedAt: new Date()
      }

      mockPrisma.reportTemplate.findUnique.mockResolvedValue(currentTemplate)
      mockPrisma.reportTemplate.update.mockResolvedValue(updatedTemplate)

      const result = await service.updateTemplate('template-1', updateDto, 'user-1')

      expect(result.version).toBe(1)
    })

    it('应该在模板不存在时抛出错误', async () => {
      mockPrisma.reportTemplate.findUnique.mockResolvedValue(null)

      await expect(
        service.updateTemplate('non-existent', { name: '新名称' }, 'user-1')
      ).rejects.toThrow('模板不存在')
    })
  })

  describe('listTemplates', () => {
    it('应该成功查询模板列表', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: '模板1',
          category: '检测报告',
          isActive: true,
          version: 1,
          createdAt: new Date()
        },
        {
          id: 'template-2',
          name: '模板2',
          category: '检测报告',
          isActive: true,
          version: 1,
          createdAt: new Date()
        }
      ]

      mockPrisma.reportTemplate.count.mockResolvedValue(2)
      mockPrisma.reportTemplate.findMany.mockResolvedValue(mockTemplates)

      const result = await service.listTemplates({
        category: '检测报告',
        isActive: true,
        page: 1,
        pageSize: 20
      })

      expect(result.items).toEqual(mockTemplates)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })

    it('应该支持搜索功能', async () => {
      mockPrisma.reportTemplate.count.mockResolvedValue(1)
      mockPrisma.reportTemplate.findMany.mockResolvedValue([])

      await service.listTemplates({
        search: '检测',
        page: 1,
        pageSize: 20
      })

      expect(mockPrisma.reportTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: '检测', mode: 'insensitive' } },
              { description: { contains: '检测', mode: 'insensitive' } }
            ])
          })
        })
      )
    })
  })

  describe('activateTemplate', () => {
    it('应该成功激活模板', async () => {
      const mockTemplate = {
        id: 'template-1',
        isActive: true
      }

      mockPrisma.reportTemplate.update.mockResolvedValue(mockTemplate)

      const result = await service.activateTemplate('template-1', 'user-1')

      expect(result.isActive).toBe(true)
      expect(mockPrisma.reportTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: { isActive: true }
      })
    })
  })

  describe('deactivateTemplate', () => {
    it('应该成功停用模板', async () => {
      const mockTemplate = {
        id: 'template-1',
        isActive: false
      }

      mockPrisma.reportTemplate.update.mockResolvedValue(mockTemplate)

      const result = await service.deactivateTemplate('template-1', 'user-1')

      expect(result.isActive).toBe(false)
      expect(mockPrisma.reportTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: { isActive: false }
      })
    })
  })

  describe('deleteTemplate', () => {
    it('应该成功删除未使用的模板', async () => {
      mockPrisma.report.count.mockResolvedValue(0)
      mockPrisma.reportTemplate.delete.mockResolvedValue({})

      await service.deleteTemplate('template-1', 'user-1')

      expect(mockPrisma.reportTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'template-1' }
      })
    })

    it('应该在模板已被使用时拒绝删除', async () => {
      mockPrisma.report.count.mockResolvedValue(5)

      await expect(service.deleteTemplate('template-1', 'user-1')).rejects.toThrow(
        '该模板已被使用，无法删除'
      )

      expect(mockPrisma.reportTemplate.delete).not.toHaveBeenCalled()
    })
  })

  describe('validateTemplateFormat', () => {
    it('应该验证有效的模板格式', () => {
      const content = '<html><body>样品: {{sampleName}}, 结果: {{result}}</body></html>'
      const variables: TemplateVariable[] = [
        { name: 'sampleName', type: 'string', required: true },
        { name: 'result', type: 'string', required: true }
      ]

      const result = service.validateTemplateFormat(content, variables)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测未定义的变量', () => {
      const content = '<html><body>{{undefinedVar}}</body></html>'
      const variables: TemplateVariable[] = [
        { name: 'sampleName', type: 'string', required: true }
      ]

      const result = service.validateTemplateFormat(content, variables)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('variable')
      expect(result.errors[0].message).toContain('undefinedVar')
    })

    it('应该支持嵌套属性访问', () => {
      const content = '<html><body>{{sample.name}}, {{sample.type}}</body></html>'
      const variables: TemplateVariable[] = [
        { name: 'sample', type: 'object', required: true }
      ]

      const result = service.validateTemplateFormat(content, variables)

      expect(result.isValid).toBe(true)
    })

    it('应该在内容为空时返回错误', () => {
      const content = ''
      const variables: TemplateVariable[] = []

      const result = service.validateTemplateFormat(content, variables)

      expect(result.isValid).toBe(false)
      expect(result.errors[0].message).toContain('不能为空')
    })
  })

  describe('validateTemplateVariables', () => {
    it('应该验证有效的变量定义', () => {
      const variables: TemplateVariable[] = [
        { name: 'var1', type: 'string', required: true },
        { name: 'var2', type: 'number', required: false }
      ]

      const result = service.validateTemplateVariables(variables)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测重复的变量名', () => {
      const variables: TemplateVariable[] = [
        { name: 'sampleName', type: 'string', required: true },
        { name: 'sampleName', type: 'string', required: true }
      ]

      const result = service.validateTemplateVariables(variables)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('重复')
    })
  })
})
