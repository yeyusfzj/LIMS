// 条码生成器单元测试

import { PrismaClient } from '@prisma/client'
import {
  generateBarcode,
  generateSampleNumber,
  validateBarcode,
  validateSampleNumber
} from '../utils/barcodeGenerator'

const prisma = new PrismaClient()

describe('BarcodeGenerator', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })
  
  describe('generateBarcode', () => {
    it('应该生成正确格式的条码', async () => {
      const barcode = await generateBarcode()
      
      expect(barcode).toMatch(/^SP\d{14}$/)
      expect(barcode.length).toBe(16)
      expect(barcode.startsWith('SP')).toBe(true)
    })
    
    it('应该生成递增的条码序列号', async () => {
      const barcode1 = await generateBarcode()
      
      // 创建一个样品记录以便下次生成时序列号递增
      await prisma.sample.create({
        data: {
          barcode: barcode1,
          sampleNumber: '2024000001',
          clientName: 'TEST',
          sampleName: 'TEST',
          sampleType: 'TEST',
          sampleCategory: 'TEST',
          quantity: 1,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test'
        }
      })
      
      const barcode2 = await generateBarcode()
      
      // 清理测试数据
      await prisma.sample.deleteMany({
        where: { barcode: { in: [barcode1, barcode2] } }
      })
      
      expect(barcode1).not.toBe(barcode2)
      
      // 提取序列号并验证递增
      const seq1 = parseInt(barcode1.slice(-6))
      const seq2 = parseInt(barcode2.slice(-6))
      expect(seq2).toBe(seq1 + 1)
    })
    
    it('生成的条码应该包含当前日期', async () => {
      const barcode = await generateBarcode()
      const date = new Date()
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${year}${month}${day}`
      
      expect(barcode).toContain(dateStr)
    })
  })
  
  describe('generateSampleNumber', () => {
    it('应该生成正确格式的样品编号', async () => {
      const sampleNumber = await generateSampleNumber()
      
      expect(sampleNumber).toMatch(/^\d{10}$/)
      expect(sampleNumber.length).toBe(10)
    })
    
    it('应该生成递增的样品编号序列号', async () => {
      const number1 = await generateSampleNumber()
      const barcode1 = await generateBarcode()
      
      // 创建一个样品记录以便下次生成时序列号递增
      await prisma.sample.create({
        data: {
          barcode: barcode1,
          sampleNumber: number1,
          clientName: 'TEST',
          sampleName: 'TEST',
          sampleType: 'TEST',
          sampleCategory: 'TEST',
          quantity: 1,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test'
        }
      })
      
      const number2 = await generateSampleNumber()
      
      // 清理测试数据
      await prisma.sample.deleteMany({
        where: { sampleNumber: { in: [number1, number2] } }
      })
      
      expect(number1).not.toBe(number2)
      
      // 提取序列号并验证递增
      const seq1 = parseInt(number1.slice(-6))
      const seq2 = parseInt(number2.slice(-6))
      expect(seq2).toBe(seq1 + 1)
    })
    
    it('生成的样品编号应该包含当前年份', async () => {
      const sampleNumber = await generateSampleNumber()
      const year = new Date().getFullYear()
      
      expect(sampleNumber.startsWith(String(year))).toBe(true)
    })
  })
  
  describe('validateBarcode', () => {
    it('应该验证有效的条码格式', () => {
      expect(validateBarcode('SP20240115000001')).toBe(true)
      expect(validateBarcode('SP20231231999999')).toBe(true)
    })
    
    it('应该拒绝无效的条码格式', () => {
      expect(validateBarcode('SP2024011500001')).toBe(false) // 太短
      expect(validateBarcode('SP202401150000001')).toBe(false) // 太长
      expect(validateBarcode('XX20240115000001')).toBe(false) // 错误前缀
      expect(validateBarcode('SP2024011A000001')).toBe(false) // 包含字母
      expect(validateBarcode('20240115000001')).toBe(false) // 缺少前缀
      expect(validateBarcode('')).toBe(false) // 空字符串
    })
  })
  
  describe('validateSampleNumber', () => {
    it('应该验证有效的样品编号格式', () => {
      expect(validateSampleNumber('2024000001')).toBe(true)
      expect(validateSampleNumber('2023999999')).toBe(true)
    })
    
    it('应该拒绝无效的样品编号格式', () => {
      expect(validateSampleNumber('202400001')).toBe(false) // 太短
      expect(validateSampleNumber('20240000001')).toBe(false) // 太长
      expect(validateSampleNumber('202A000001')).toBe(false) // 包含字母
      expect(validateSampleNumber('000001')).toBe(false) // 太短
      expect(validateSampleNumber('')).toBe(false) // 空字符串
    })
  })
})
