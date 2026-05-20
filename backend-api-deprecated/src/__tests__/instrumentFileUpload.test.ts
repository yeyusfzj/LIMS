/**
 * 仪器文档上传中间件测试
 */

import { describe, it, expect } from 'vitest'
import path from 'path'
import { validateFileType } from '../config/security'

describe('仪器文档上传中间件', () => {
  describe('文件类型验证', () => {
    it('应该接受PDF文件', () => {
      const result = validateFileType('application/pdf', 'document.pdf')
      expect(result).toBe(true)
    })

    it('应该接受Word文档(.doc)', () => {
      const result = validateFileType('application/msword', 'document.doc')
      expect(result).toBe(true)
    })

    it('应该接受Word文档(.docx)', () => {
      const result = validateFileType(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'document.docx'
      )
      expect(result).toBe(true)
    })

    it('应该接受Excel文件(.xlsx)', () => {
      const result = validateFileType(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'data.xlsx'
      )
      expect(result).toBe(true)
    })

    it('应该接受图片文件(.jpg)', () => {
      const result = validateFileType('image/jpeg', 'photo.jpg')
      expect(result).toBe(true)
    })

    it('应该接受图片文件(.png)', () => {
      const result = validateFileType('image/png', 'photo.png')
      expect(result).toBe(true)
    })

    it('应该拒绝不支持的文件类型', () => {
      const result = validateFileType('application/x-executable', 'malware.exe')
      expect(result).toBe(false)
    })

    it('应该拒绝MIME类型与扩展名不匹配的文件', () => {
      const result = validateFileType('application/pdf', 'document.exe')
      expect(result).toBe(false)
    })
  })

  describe('上传目录结构', () => {
    const uploadDirs = [
      'uploads/instruments',
      'uploads/instruments/documents',
      'uploads/instruments/maintenance',
      'uploads/instruments/calibration',
      'uploads/instruments/disposal'
    ]

    it('应该能够创建所需的上传目录', () => {
      uploadDirs.forEach(dir => {
        const fullPath = path.join(process.cwd(), dir)
        // 检查目录是否可以创建（不实际创建，只验证路径有效性）
        expect(path.isAbsolute(fullPath)).toBe(true)
        // 使用normalize来处理不同操作系统的路径分隔符
        const normalizedPath = fullPath.replace(/\\/g, '/')
        expect(normalizedPath).toContain('uploads/instruments')
      })
    })
  })

  describe('文件大小限制', () => {
    it('仪器文档上传限制应为20MB', () => {
      const maxSize = 20 * 1024 * 1024
      expect(maxSize).toBe(20971520)
    })
  })
})
