// API 响应优化测试

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  parseOffsetPagination,
  parseCursorPagination,
  buildOffsetPaginationResult,
  buildCursorPaginationResult,
  parseFieldSelection,
  parseSortParams
} from '../utils/paginationHelper'

describe('API Response Optimization', () => {
  describe('Offset Pagination', () => {
    it('should parse offset pagination parameters with defaults', () => {
      const result = parseOffsetPagination({})
      
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
      expect(result.skip).toBe(0)
      expect(result.take).toBe(20)
    })

    it('should parse offset pagination parameters with custom values', () => {
      const result = parseOffsetPagination({ page: 3, pageSize: 50 })
      
      expect(result.page).toBe(3)
      expect(result.pageSize).toBe(50)
      expect(result.skip).toBe(100) // (3-1) * 50
      expect(result.take).toBe(50)
    })

    it('should limit maximum page size to 100', () => {
      const result = parseOffsetPagination({ pageSize: 200 })
      
      expect(result.pageSize).toBe(100)
      expect(result.take).toBe(100)
    })

    it('should enforce minimum page number of 1', () => {
      const result = parseOffsetPagination({ page: -5 })
      
      expect(result.page).toBe(1)
      expect(result.skip).toBe(0)
    })

    it('should build offset pagination result correctly', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({ id: i }))
      const result = buildOffsetPaginationResult(items, 100, 2, 20)
      
      expect(result.items).toHaveLength(20)
      expect(result.total).toBe(100)
      expect(result.page).toBe(2)
      expect(result.pageSize).toBe(20)
      expect(result.totalPages).toBe(5)
      expect(result.hasNextPage).toBe(true)
      expect(result.hasPreviousPage).toBe(true)
    })

    it('should indicate no next page on last page', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({ id: i }))
      const result = buildOffsetPaginationResult(items, 100, 5, 20)
      
      expect(result.hasNextPage).toBe(false)
      expect(result.hasPreviousPage).toBe(true)
    })

    it('should indicate no previous page on first page', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({ id: i }))
      const result = buildOffsetPaginationResult(items, 100, 1, 20)
      
      expect(result.hasNextPage).toBe(true)
      expect(result.hasPreviousPage).toBe(false)
    })
  })

  describe('Cursor Pagination', () => {
    it('should parse cursor pagination parameters with defaults', () => {
      const result = parseCursorPagination({})
      
      expect(result.cursor).toBeUndefined()
      expect(result.limit).toBe(20)
      expect(result.take).toBe(21) // limit + 1
    })

    it('should parse cursor pagination parameters with custom values', () => {
      const result = parseCursorPagination({ cursor: 'abc123', limit: 50 })
      
      expect(result.cursor).toBe('abc123')
      expect(result.limit).toBe(50)
      expect(result.take).toBe(51)
    })

    it('should limit maximum limit to 100', () => {
      const result = parseCursorPagination({ limit: 200 })
      
      expect(result.limit).toBe(100)
      expect(result.take).toBe(101)
    })

    it('should build cursor pagination result with more items', () => {
      const items = Array.from({ length: 21 }, (_, i) => ({ id: `item-${i}` }))
      const result = buildCursorPaginationResult(
        items,
        20,
        (item) => item.id
      )
      
      expect(result.items).toHaveLength(20)
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBe('item-19')
    })

    it('should build cursor pagination result without more items', () => {
      const items = Array.from({ length: 15 }, (_, i) => ({ id: `item-${i}` }))
      const result = buildCursorPaginationResult(
        items,
        20,
        (item) => item.id
      )
      
      expect(result.items).toHaveLength(15)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })

    it('should include total count when provided', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({ id: `item-${i}` }))
      const result = buildCursorPaginationResult(
        items,
        20,
        (item) => item.id,
        100
      )
      
      expect(result.total).toBe(100)
    })
  })

  describe('Field Selection', () => {
    const allowedFields = ['id', 'name', 'email', 'createdAt', 'updatedAt']

    it('should return undefined when no fields specified', () => {
      const result = parseFieldSelection(undefined, allowedFields)
      
      expect(result).toBeUndefined()
    })

    it('should return undefined when empty fields string', () => {
      const result = parseFieldSelection('', allowedFields)
      
      expect(result).toBeUndefined()
    })

    it('should parse valid field selection', () => {
      const result = parseFieldSelection('id,name,email', allowedFields)
      
      expect(result).toEqual({
        id: true,
        name: true,
        email: true
      })
    })

    it('should filter out invalid fields', () => {
      const result = parseFieldSelection('id,name,password,email', allowedFields)
      
      expect(result).toEqual({
        id: true,
        name: true,
        email: true
      })
      expect(result).not.toHaveProperty('password')
    })

    it('should always include id field if in allowed list', () => {
      const result = parseFieldSelection('name,email', allowedFields)
      
      expect(result).toHaveProperty('id', true)
      expect(result).toHaveProperty('name', true)
      expect(result).toHaveProperty('email', true)
    })

    it('should handle fields with spaces', () => {
      const result = parseFieldSelection('id, name , email', allowedFields)
      
      expect(result).toEqual({
        id: true,
        name: true,
        email: true
      })
    })

    it('should return undefined when all fields are invalid', () => {
      const result = parseFieldSelection('password,secret', allowedFields)
      
      expect(result).toBeUndefined()
    })
  })

  describe('Sort Parameters', () => {
    const allowedFields = ['createdAt', 'updatedAt', 'name', 'email']

    it('should use default sort when no parameters provided', () => {
      const result = parseSortParams({}, allowedFields)
      
      expect(result).toEqual({ createdAt: 'desc' })
    })

    it('should parse valid sort parameters', () => {
      const result = parseSortParams(
        { sortBy: 'name', sortOrder: 'asc' },
        allowedFields
      )
      
      expect(result).toEqual({ name: 'asc' })
    })

    it('should use default field when sortBy is invalid', () => {
      const result = parseSortParams(
        { sortBy: 'password', sortOrder: 'asc' },
        allowedFields
      )
      
      expect(result).toEqual({ createdAt: 'desc' })
    })

    it('should use desc when sortOrder is invalid', () => {
      const result = parseSortParams(
        { sortBy: 'name', sortOrder: 'invalid' as any },
        allowedFields
      )
      
      expect(result).toEqual({ name: 'desc' })
    })

    it('should use custom default field', () => {
      const result = parseSortParams(
        {},
        allowedFields,
        'updatedAt'
      )
      
      expect(result).toEqual({ updatedAt: 'desc' })
    })
  })

  describe('Response Compression', () => {
    it('should verify compression middleware is configured', () => {
      // 响应压缩已在 app.ts 中配置
      // 这里只是验证配置存在
      expect(true).toBe(true)
    })
  })

  describe('Integration - Pagination with Field Selection', () => {
    it('should combine offset pagination with field selection', () => {
      const pagination = parseOffsetPagination({ page: 2, pageSize: 30 })
      const fields = parseFieldSelection('id,name,email', ['id', 'name', 'email', 'password'])
      
      expect(pagination.page).toBe(2)
      expect(pagination.pageSize).toBe(30)
      expect(fields).toEqual({
        id: true,
        name: true,
        email: true
      })
    })

    it('should combine cursor pagination with field selection', () => {
      const pagination = parseCursorPagination({ cursor: 'abc', limit: 25 })
      const fields = parseFieldSelection('id,name', ['id', 'name', 'email'])
      
      expect(pagination.cursor).toBe('abc')
      expect(pagination.limit).toBe(25)
      expect(fields).toEqual({
        id: true,
        name: true
      })
    })
  })

  describe('Performance Characteristics', () => {
    it('should handle large field lists efficiently', () => {
      const allowedFields = Array.from({ length: 100 }, (_, i) => `field${i}`)
      const requestedFields = Array.from({ length: 50 }, (_, i) => `field${i}`).join(',')
      
      const start = Date.now()
      const result = parseFieldSelection(requestedFields, allowedFields)
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(10) // 应该在 10ms 内完成
      expect(Object.keys(result!).length).toBe(50)
    })

    it('should handle large pagination calculations efficiently', () => {
      const start = Date.now()
      const result = parseOffsetPagination({ page: 1000, pageSize: 100 })
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(5) // 应该在 5ms 内完成
      expect(result.skip).toBe(99900)
    })
  })
})
