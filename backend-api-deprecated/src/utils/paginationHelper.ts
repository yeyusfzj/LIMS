// 分页辅助工具

/**
 * 偏移分页参数
 */
export interface OffsetPaginationParams {
  page?: number
  pageSize?: number
}

/**
 * 游标分页参数
 */
export interface CursorPaginationParams {
  cursor?: string
  limit?: number
}

/**
 * 偏移分页结果
 */
export interface OffsetPaginationResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/**
 * 游标分页结果
 */
export interface CursorPaginationResult<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
  total?: number
}

/**
 * 解析偏移分页参数
 */
export function parseOffsetPagination(params: OffsetPaginationParams): {
  page: number
  pageSize: number
  skip: number
  take: number
} {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20)) // 限制最大 100 条
  const skip = (page - 1) * pageSize
  const take = pageSize

  return { page, pageSize, skip, take }
}

/**
 * 解析游标分页参数
 */
export function parseCursorPagination(params: CursorPaginationParams): {
  cursor: string | undefined
  limit: number
  take: number
} {
  const limit = Math.min(100, Math.max(1, params.limit || 20)) // 限制最大 100 条
  const take = limit + 1 // 多取一条用于判断是否有下一页

  return {
    cursor: params.cursor,
    limit,
    take
  }
}

/**
 * 构建偏移分页结果
 */
export function buildOffsetPaginationResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): OffsetPaginationResult<T> {
  const totalPages = Math.ceil(total / pageSize)

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  }
}

/**
 * 构建游标分页结果
 */
export function buildCursorPaginationResult<T>(
  items: T[],
  limit: number,
  getCursor: (item: T) => string,
  total?: number
): CursorPaginationResult<T> {
  const hasMore = items.length > limit
  const resultItems = hasMore ? items.slice(0, limit) : items
  const nextCursor = hasMore ? getCursor(resultItems[resultItems.length - 1]) : null

  return {
    items: resultItems,
    nextCursor,
    hasMore,
    total
  }
}

/**
 * 字段选择参数
 */
export interface FieldSelectionParams {
  fields?: string
}

/**
 * 解析字段选择参数
 * @param fields 逗号分隔的字段列表，如 "id,name,email"
 * @param allowedFields 允许选择的字段列表（白名单）
 * @returns Prisma select 对象或 undefined（返回所有字段）
 */
export function parseFieldSelection(
  fields: string | undefined,
  allowedFields: string[]
): Record<string, boolean> | undefined {
  if (!fields) {
    return undefined
  }

  const requestedFields = fields.split(',').map(f => f.trim()).filter(f => f)
  
  if (requestedFields.length === 0) {
    return undefined
  }

  // 过滤出允许的字段
  const validFields = requestedFields.filter(field => allowedFields.includes(field))
  
  if (validFields.length === 0) {
    return undefined
  }

  // 构建 Prisma select 对象
  const select: Record<string, boolean> = {}
  validFields.forEach(field => {
    select[field] = true
  })

  // 始终包含 id 字段（如果在允许列表中）
  if (allowedFields.includes('id') && !select.id) {
    select.id = true
  }

  return select
}

/**
 * 排序参数
 */
export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 解析排序参数
 * @param params 排序参数
 * @param allowedFields 允许排序的字段列表（白名单）
 * @param defaultField 默认排序字段
 * @returns Prisma orderBy 对象
 */
export function parseSortParams(
  params: SortParams,
  allowedFields: string[],
  defaultField: string = 'createdAt'
): Record<string, 'asc' | 'desc'> {
  const sortBy = params.sortBy || defaultField
  const sortOrder = params.sortOrder || 'desc'

  // 验证排序字段是否在允许列表中
  if (!allowedFields.includes(sortBy)) {
    return { [defaultField]: 'desc' }
  }

  // 验证排序顺序
  if (sortOrder !== 'asc' && sortOrder !== 'desc') {
    return { [sortBy]: 'desc' }
  }

  return { [sortBy]: sortOrder }
}
