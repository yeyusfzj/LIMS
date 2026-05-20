/**
 * 报告模板类型定义
 */

export interface ReportTemplate {
  id: string
  name: string
  description?: string
  category: string
  content: string
  variables: TemplateVariable[]
  version: number
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface TemplateVariable {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object'
  description?: string
  required?: boolean
  defaultValue?: any
  format?: string // 用于日期格式化等
}

export interface CreateTemplateDto {
  name: string
  description?: string
  category: string
  content: string
  variables: TemplateVariable[]
}

export interface UpdateTemplateDto {
  name?: string
  description?: string
  category?: string
  content?: string
  variables?: TemplateVariable[]
  isActive?: boolean
}

export interface TemplateQuery {
  category?: string
  isActive?: boolean
  search?: string
  page?: number
  pageSize?: number
}

export interface TemplateValidationResult {
  isValid: boolean
  errors: TemplateValidationError[]
}

export interface TemplateValidationError {
  type: 'format' | 'variable' | 'syntax'
  message: string
  location?: string
}

export interface TemplateVersionInfo {
  templateId: string
  version: number
  createdAt: Date
  createdBy: string
}
