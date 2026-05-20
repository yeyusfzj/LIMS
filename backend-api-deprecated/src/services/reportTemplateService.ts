/**
 * 报告模板服务
 */

import { PrismaClient } from '@prisma/client'
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQuery,
  TemplateValidationResult,
  TemplateValidationError,
  TemplateVariable
} from '../types/reportTemplate'
import logger from '../config/logger'

const prisma = new PrismaClient()

export class ReportTemplateService {
  /**
   * 创建报告模板
   */
  async createTemplate(data: CreateTemplateDto, userId: string) {
    try {
      // 验证模板格式
      const validation = this.validateTemplateFormat(data.content, data.variables)
      if (!validation.isValid) {
        throw new Error(`模板验证失败: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      // 验证模板变量
      const variableValidation = this.validateTemplateVariables(data.variables)
      if (!variableValidation.isValid) {
        throw new Error(`变量验证失败: ${variableValidation.errors.map(e => e.message).join(', ')}`)
      }

      // 创建模板
      const template = await prisma.reportTemplate.create({
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          content: data.content,
          variables: data.variables as any,
          version: 1,
          isActive: true,
          createdBy: userId
        }
      })

      logger.info('报告模板创建成功', { templateId: template.id, name: template.name })
      return template
    } catch (error) {
      logger.error('创建报告模板失败', { error, data })
      throw error
    }
  }

  /**
   * 更新报告模板（创建新版本）
   */
  async updateTemplate(id: string, data: UpdateTemplateDto, userId: string) {
    try {
      // 获取当前模板
      const currentTemplate = await prisma.reportTemplate.findUnique({
        where: { id }
      })

      if (!currentTemplate) {
        throw new Error('模板不存在')
      }

      // 如果更新了内容或变量，需要验证
      if (data.content || data.variables) {
        const content = data.content || currentTemplate.content
        const variables = data.variables || (currentTemplate.variables as TemplateVariable[])

        const validation = this.validateTemplateFormat(content, variables)
        if (!validation.isValid) {
          throw new Error(`模板验证失败: ${validation.errors.map(e => e.message).join(', ')}`)
        }

        if (data.variables) {
          const variableValidation = this.validateTemplateVariables(data.variables)
          if (!variableValidation.isValid) {
            throw new Error(`变量验证失败: ${variableValidation.errors.map(e => e.message).join(', ')}`)
          }
        }
      }

      // 如果更新了内容或变量，创建新版本
      const shouldCreateNewVersion = data.content || data.variables
      const newVersion = shouldCreateNewVersion ? currentTemplate.version + 1 : currentTemplate.version

      // 更新模板
      const updatedTemplate = await prisma.reportTemplate.update({
        where: { id },
        data: {
          ...data,
          variables: data.variables ? (data.variables as any) : undefined,
          version: newVersion,
          updatedAt: new Date()
        }
      })

      logger.info('报告模板更新成功', {
        templateId: id,
        version: newVersion,
        updatedBy: userId
      })

      return updatedTemplate
    } catch (error) {
      logger.error('更新报告模板失败', { error, id, data })
      throw error
    }
  }

  /**
   * 获取模板详情
   */
  async getTemplate(id: string) {
    try {
      const template = await prisma.reportTemplate.findUnique({
        where: { id }
      })

      if (!template) {
        throw new Error('模板不存在')
      }

      return template
    } catch (error) {
      logger.error('获取报告模板失败', { error, id })
      throw error
    }
  }

  /**
   * 查询模板列表
   */
  async listTemplates(query: TemplateQuery) {
    try {
      const { category, isActive, search, page = 1, pageSize = 20 } = query
      const skip = (page - 1) * pageSize

      // 构建查询条件
      const where: any = {}

      if (category) {
        where.category = category
      }

      if (isActive !== undefined) {
        where.isActive = isActive
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }

      // 查询总数和数据
      const [total, items] = await Promise.all([
        prisma.reportTemplate.count({ where }),
        prisma.reportTemplate.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' }
        })
      ])

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    } catch (error) {
      logger.error('查询报告模板列表失败', { error, query })
      throw error
    }
  }

  /**
   * 激活模板
   */
  async activateTemplate(id: string, userId: string) {
    try {
      const template = await prisma.reportTemplate.update({
        where: { id },
        data: { isActive: true }
      })

      logger.info('报告模板已激活', { templateId: id, activatedBy: userId })
      return template
    } catch (error) {
      logger.error('激活报告模板失败', { error, id })
      throw error
    }
  }

  /**
   * 停用模板
   */
  async deactivateTemplate(id: string, userId: string) {
    try {
      const template = await prisma.reportTemplate.update({
        where: { id },
        data: { isActive: false }
      })

      logger.info('报告模板已停用', { templateId: id, deactivatedBy: userId })
      return template
    } catch (error) {
      logger.error('停用报告模板失败', { error, id })
      throw error
    }
  }

  /**
   * 删除模板
   */
  async deleteTemplate(id: string, userId: string) {
    try {
      // 检查是否有关联的报告
      const reportCount = await prisma.report.count({
        where: { templateId: id }
      })

      if (reportCount > 0) {
        throw new Error('该模板已被使用，无法删除。请先停用模板。')
      }

      await prisma.reportTemplate.delete({
        where: { id }
      })

      logger.info('报告模板已删除', { templateId: id, deletedBy: userId })
    } catch (error) {
      logger.error('删除报告模板失败', { error, id })
      throw error
    }
  }

  /**
   * 验证模板格式
   */
  validateTemplateFormat(content: string, variables: TemplateVariable[]): TemplateValidationResult {
    const errors: TemplateValidationError[] = []

    // 检查内容是否为空
    if (!content || content.trim().length === 0) {
      errors.push({
        type: 'format',
        message: '模板内容不能为空'
      })
      return { isValid: false, errors }
    }

    // 提取模板中使用的变量
    const variablePattern = /\{\{(\s*[\w.]+\s*)\}\}/g
    const usedVariables = new Set<string>()
    let match

    while ((match = variablePattern.exec(content)) !== null) {
      const varName = match[1].trim()
      usedVariables.add(varName)
    }

    // 检查模板中使用的变量是否都已定义
    const definedVariables = new Set(variables.map(v => v.name))

    for (const usedVar of usedVariables) {
      // 支持嵌套属性，如 sample.name
      const rootVar = usedVar.split('.')[0]
      if (!definedVariables.has(rootVar)) {
        errors.push({
          type: 'variable',
          message: `模板中使用了未定义的变量: ${usedVar}`,
          location: usedVar
        })
      }
    }

    // 检查是否有定义但未使用的变量（警告，不影响验证结果）
    for (const definedVar of definedVariables) {
      let isUsed = false
      for (const usedVar of usedVariables) {
        if (usedVar === definedVar || usedVar.startsWith(definedVar + '.')) {
          isUsed = true
          break
        }
      }
      if (!isUsed) {
        logger.warn('模板中定义了未使用的变量', { variable: definedVar })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证模板变量
   */
  validateTemplateVariables(variables: TemplateVariable[]): TemplateValidationResult {
    const errors: TemplateValidationError[] = []

    // 检查变量名是否重复
    const variableNames = new Set<string>()
    for (const variable of variables) {
      if (variableNames.has(variable.name)) {
        errors.push({
          type: 'variable',
          message: `变量名重复: ${variable.name}`,
          location: variable.name
        })
      }
      variableNames.add(variable.name)
    }

    // 检查必填变量是否有默认值
    for (const variable of variables) {
      if (variable.required && variable.defaultValue !== undefined) {
        logger.warn('必填变量不应设置默认值', { variable: variable.name })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 获取模板版本历史
   */
  async getTemplateVersions(id: string) {
    try {
      // 注意：当前实现中，我们在同一条记录上更新版本号
      // 如果需要完整的版本历史，应该创建一个单独的版本历史表
      const template = await prisma.reportTemplate.findUnique({
        where: { id },
        select: {
          id: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true
        }
      })

      if (!template) {
        throw new Error('模板不存在')
      }

      return {
        templateId: template.id,
        currentVersion: template.version,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        createdBy: template.createdBy
      }
    } catch (error) {
      logger.error('获取模板版本历史失败', { error, id })
      throw error
    }
  }
}

export default new ReportTemplateService()
