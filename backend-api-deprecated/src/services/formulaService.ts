/**
 * 公式计算服务
 * 
 * 实现公式配置管理、表达式解析、计算执行和错误处理
 * 验证需求：7.3, 7.4, 7.5
 */

import { PrismaClient } from '@prisma/client'
import {
  CreateFormulaDto,
  UpdateFormulaDto,
  FormulaQuery,
  FormulaResponse,
  PaginatedFormulaResponse,
  FormulaCalculationInput,
  FormulaCalculationResult,
  FormulaValidationResult,
  FormulaParameter
} from '../types/formula'
import { logger } from '../config/logger'

const prisma = new PrismaClient()

/**
 * 公式服务类
 */
export class FormulaService {
  /**
   * 创建公式配置
   * 
   * 需求 7.3: 支持常见数学函数和自定义公式表达式
   * 
   * @param data 公式创建数据
   * @returns 创建的公式
   */
  async createFormula(data: CreateFormulaDto): Promise<FormulaResponse> {
    try {
      // 验证公式表达式
      const validation = this.validateExpression(data.expression, data.parameters)
      if (!validation.valid) {
        throw new Error(`公式表达式验证失败: ${validation.errors.join(', ')}`)
      }

      // 创建公式记录
      const formula = await prisma.formula.create({
        data: {
          name: data.name,
          description: data.description,
          expression: data.expression,
          parameters: data.parameters as any,
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdBy: data.createdBy
        }
      })

      logger.info('Formula created', {
        formulaId: formula.id,
        name: formula.name,
        expression: formula.expression
      })

      return this.mapToResponse(formula)
    } catch (error) {
      logger.error('Failed to create formula', { error, data })
      throw error
    }
  }

  /**
   * 根据 ID 获取公式
   * 
   * @param id 公式 ID
   * @returns 公式详情
   */
  async getFormulaById(id: string): Promise<FormulaResponse | null> {
    try {
      const formula = await prisma.formula.findUnique({
        where: { id }
      })

      if (!formula) {
        return null
      }

      return this.mapToResponse(formula)
    } catch (error) {
      logger.error('Failed to get formula by id', { error, id })
      throw error
    }
  }

  /**
   * 查询公式列表
   * 
   * @param query 查询参数
   * @returns 分页公式列表
   */
  async listFormulas(query: FormulaQuery): Promise<PaginatedFormulaResponse> {
    try {
      const {
        name,
        isActive,
        createdBy,
        page = 1,
        pageSize = 20
      } = query

      // 构建查询条件
      const where: any = {}

      if (name) {
        where.name = {
          contains: name,
          mode: 'insensitive'
        }
      }

      if (typeof isActive === 'boolean') {
        where.isActive = isActive
      }

      if (createdBy) {
        where.createdBy = createdBy
      }

      // 计算分页参数
      const skip = (page - 1) * pageSize
      const take = pageSize

      // 并行查询数据和总数
      const [formulas, total] = await Promise.all([
        prisma.formula.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.formula.count({ where })
      ])

      const totalPages = Math.ceil(total / pageSize)

      return {
        items: formulas.map(f => this.mapToResponse(f)),
        total,
        page,
        pageSize,
        totalPages
      }
    } catch (error) {
      logger.error('Failed to list formulas', { error, query })
      throw error
    }
  }

  /**
   * 更新公式
   * 
   * @param id 公式 ID
   * @param data 更新数据
   * @returns 更新后的公式
   */
  async updateFormula(
    id: string,
    data: UpdateFormulaDto
  ): Promise<FormulaResponse> {
    try {
      // 检查公式是否存在
      const existing = await prisma.formula.findUnique({
        where: { id }
      })

      if (!existing) {
        throw new Error('公式不存在')
      }

      // 如果更新了表达式或参数，需要验证
      if (data.expression || data.parameters) {
        const expression = data.expression || existing.expression
        const parameters = data.parameters || (existing.parameters as any)
        
        const validation = this.validateExpression(expression, parameters)
        if (!validation.valid) {
          throw new Error(`公式表达式验证失败: ${validation.errors.join(', ')}`)
        }
      }

      // 更新公式
      const updateData: any = {}

      if (data.name !== undefined) {
        updateData.name = data.name
      }

      if (data.description !== undefined) {
        updateData.description = data.description
      }

      if (data.expression !== undefined) {
        updateData.expression = data.expression
      }

      if (data.parameters !== undefined) {
        updateData.parameters = data.parameters
      }

      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive
      }

      const formula = await prisma.formula.update({
        where: { id },
        data: updateData
      })

      logger.info('Formula updated', {
        formulaId: formula.id,
        updates: Object.keys(updateData)
      })

      return this.mapToResponse(formula)
    } catch (error) {
      logger.error('Failed to update formula', { error, id, data })
      throw error
    }
  }

  /**
   * 删除公式
   * 
   * @param id 公式 ID
   */
  async deleteFormula(id: string): Promise<void> {
    try {
      await prisma.formula.delete({
        where: { id }
      })

      logger.info('Formula deleted', { formulaId: id })
    } catch (error) {
      logger.error('Failed to delete formula', { error, id })
      throw error
    }
  }

  /**
   * 执行公式计算
   * 
   * 需求 7.3: 自动执行关联的计算公式
   * 需求 7.5: 记录错误信息并通知用户
   * 
   * @param input 计算输入
   * @returns 计算结果
   */
  async calculateFormula(input: FormulaCalculationInput): Promise<FormulaCalculationResult> {
    try {
      // 获取公式配置
      const formula = await this.getFormulaById(input.formulaId)
      if (!formula) {
        return {
          success: false,
          error: '公式不存在'
        }
      }

      if (!formula.isActive) {
        return {
          success: false,
          error: '公式已停用'
        }
      }

      // 验证参数
      const paramValidation = this.validateParameters(
        formula.parameters,
        input.parameters
      )
      if (!paramValidation.valid) {
        return {
          success: false,
          error: `参数验证失败: ${paramValidation.errors.join(', ')}`
        }
      }

      // 执行计算
      const result = this.evaluateExpression(
        formula.expression,
        input.parameters
      )

      logger.info('Formula calculated', {
        formulaId: input.formulaId,
        parameters: input.parameters,
        result
      })

      return {
        success: true,
        value: result,
        expression: formula.expression,
        parameters: input.parameters
      }
    } catch (error: any) {
      logger.error('Formula calculation failed', { error, input })
      return {
        success: false,
        error: error.message || '计算失败',
        expression: undefined,
        parameters: input.parameters
      }
    }
  }

  /**
   * 验证公式表达式
   * 
   * 需求 7.4: 支持常见数学函数和自定义公式表达式
   * 
   * @param expression 公式表达式
   * @param parameters 参数定义
   * @returns 验证结果
   */
  private validateExpression(
    expression: string,
    parameters: FormulaParameter[]
  ): FormulaValidationResult {
    const errors: string[] = []

    // 检查表达式是否为空
    if (!expression || expression.trim() === '') {
      errors.push('公式表达式不能为空')
      return { valid: false, errors }
    }

    // 检查参数定义
    if (!parameters || parameters.length === 0) {
      errors.push('至少需要定义一个参数')
      return { valid: false, errors }
    }

    // 检查参数名称是否唯一
    const paramNames = parameters.map(p => p.name)
    const uniqueNames = new Set(paramNames)
    if (paramNames.length !== uniqueNames.size) {
      errors.push('参数名称必须唯一')
    }

    // 检查参数名称是否有效（只允许字母、数字和下划线）
    const validNamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/
    for (const param of parameters) {
      if (!validNamePattern.test(param.name)) {
        errors.push(`参数名称 "${param.name}" 无效，只允许字母、数字和下划线，且不能以数字开头`)
      }
    }

    // 检查表达式中是否包含危险字符或关键字
    const dangerousPatterns = [
      /require\s*\(/,
      /import\s+/,
      /eval\s*\(/,
      /Function\s*\(/,
      /process\./,
      /global\./,
      /__proto__/,
      /constructor/
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(expression)) {
        errors.push(`表达式包含不允许的内容: ${pattern.source}`)
      }
    }

    // 检查表达式中使用的变量是否都已定义
    const usedVariables = this.extractVariables(expression)
    const definedParams = new Set(parameters.map(p => p.name))
    
    for (const variable of usedVariables) {
      if (!definedParams.has(variable)) {
        errors.push(`表达式中使用了未定义的参数: ${variable}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证计算参数
   * 
   * @param paramDefs 参数定义
   * @param paramValues 参数值
   * @returns 验证结果
   */
  private validateParameters(
    paramDefs: FormulaParameter[],
    paramValues: Record<string, any>
  ): FormulaValidationResult {
    const errors: string[] = []

    for (const paramDef of paramDefs) {
      const value = paramValues[paramDef.name]

      // 检查必需参数
      if (paramDef.required && (value === undefined || value === null)) {
        errors.push(`缺少必需参数: ${paramDef.name}`)
        continue
      }

      // 如果参数有值，检查类型
      if (value !== undefined && value !== null) {
        const actualType = typeof value
        if (paramDef.type === 'number' && actualType !== 'number') {
          errors.push(`参数 ${paramDef.name} 类型错误，期望 number，实际 ${actualType}`)
        } else if (paramDef.type === 'string' && actualType !== 'string') {
          errors.push(`参数 ${paramDef.name} 类型错误，期望 string，实际 ${actualType}`)
        } else if (paramDef.type === 'boolean' && actualType !== 'boolean') {
          errors.push(`参数 ${paramDef.name} 类型错误，期望 boolean，实际 ${actualType}`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 执行公式表达式计算
   * 
   * 需求 7.3: 支持常见数学函数
   * 需求 7.5: 实现计算错误处理
   * 
   * @param expression 公式表达式
   * @param parameters 参数值
   * @returns 计算结果
   */
  private evaluateExpression(
    expression: string,
    parameters: Record<string, any>
  ): number {
    try {
      // 创建安全的计算上下文
      // 只允许使用 Math 对象的函数和提供的参数
      const context: Record<string, any> = {
        ...parameters,
        // 常用数学函数
        abs: Math.abs,
        acos: Math.acos,
        asin: Math.asin,
        atan: Math.atan,
        atan2: Math.atan2,
        ceil: Math.ceil,
        cos: Math.cos,
        exp: Math.exp,
        floor: Math.floor,
        log: Math.log,
        log10: Math.log10,
        max: Math.max,
        min: Math.min,
        pow: Math.pow,
        random: Math.random,
        round: Math.round,
        sin: Math.sin,
        sqrt: Math.sqrt,
        tan: Math.tan,
        // 常量
        PI: Math.PI,
        E: Math.E
      }

      // 构建函数参数列表
      const paramNames = Object.keys(context)
      const paramValues = Object.values(context)

      // 使用 Function 构造函数创建计算函数
      // 这比 eval 更安全，因为我们完全控制了作用域
      const func = new Function(...paramNames, `return (${expression})`)
      
      // 执行计算
      const result = func(...paramValues)

      // 验证结果
      if (typeof result !== 'number') {
        throw new Error(`计算结果类型错误，期望 number，实际 ${typeof result}`)
      }

      if (!isFinite(result)) {
        throw new Error('计算结果无效（无穷大或 NaN）')
      }

      return result
    } catch (error: any) {
      logger.error('Expression evaluation failed', {
        error,
        expression,
        parameters
      })
      throw new Error(`公式计算失败: ${error.message}`)
    }
  }

  /**
   * 从表达式中提取变量名
   * 
   * @param expression 公式表达式
   * @returns 变量名数组
   */
  private extractVariables(expression: string): string[] {
    // 匹配标识符（变量名）
    const identifierPattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g
    const matches = expression.match(identifierPattern) || []
    
    // 过滤掉 JavaScript 关键字和 Math 函数名
    const keywords = new Set([
      'true', 'false', 'null', 'undefined',
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'function', 'return', 'var', 'let', 'const',
      'abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor',
      'log', 'log10', 'max', 'min', 'pow', 'random', 'round', 'sin', 'sqrt', 'tan',
      'PI', 'E'
    ])
    
    const variables = matches.filter(name => !keywords.has(name))
    
    // 去重
    return Array.from(new Set(variables))
  }

  /**
   * 将数据库模型映射为响应 DTO
   * 
   * @param formula 数据库公式模型
   * @returns 公式响应 DTO
   */
  private mapToResponse(formula: any): FormulaResponse {
    return {
      id: formula.id,
      name: formula.name,
      description: formula.description,
      expression: formula.expression,
      parameters: formula.parameters as FormulaParameter[],
      isActive: formula.isActive,
      createdBy: formula.createdBy,
      createdAt: formula.createdAt,
      updatedAt: formula.updatedAt
    }
  }
}

export const formulaService = new FormulaService()
