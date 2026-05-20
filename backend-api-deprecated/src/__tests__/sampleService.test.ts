// 样品服务单元测试

import { PrismaClient } from '@prisma/client'
import { SampleService } from '../services/sampleService'
import { CreateSampleDto } from '../types/sample'

const prisma = new PrismaClient()
const sampleService = new SampleService()

describe('SampleService', () => {
  // 清理测试数据
  afterEach(async () => {
    await prisma.sample.deleteMany({
      where: {
        clientName: { contains: 'TEST_' }
      }
    })
  })
  
  afterAll(async () => {
    await prisma.$disconnect()
  })
  
  describe('createSample', () => {
    it('应该成功创建样品并生成唯一条码和编号', async () => {
      const data: CreateSampleDto = {
        clientName: 'TEST_客户A',
        sampleName: '测试样品',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 500,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      }
      
      const sample = await sampleService.createSample(data)
      
      expect(sample).toBeDefined()
      expect(sample.id).toBeDefined()
      expect(sample.barcode).toMatch(/^SP\d{14}$/)
      expect(sample.sampleNumber).toMatch(/^\d{10}$/)
      expect(sample.clientName).toBe(data.clientName)
      expect(sample.sampleName).toBe(data.sampleName)
      expect(sample.status).toBe('REGISTERED')
      expect(sample.priority).toBe('NORMAL')
    })
    
    it('应该为多个样品生成不同的条码', async () => {
      const data1: CreateSampleDto = {
        clientName: 'TEST_客户B',
        sampleName: '样品1',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 500,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      }
      
      const data2: CreateSampleDto = {
        clientName: 'TEST_客户C',
        sampleName: '样品2',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 500,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      }
      
      const sample1 = await sampleService.createSample(data1)
      const sample2 = await sampleService.createSample(data2)
      
      expect(sample1.barcode).not.toBe(sample2.barcode)
      expect(sample1.sampleNumber).not.toBe(sample2.sampleNumber)
    })
    
    it('应该正确设置可选字段', async () => {
      const data: CreateSampleDto = {
        clientName: 'TEST_客户D',
        clientContact: '13800138000',
        sampleName: '测试样品',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 500,
        unit: 'ml',
        receivedDate: new Date(),
        samplingDate: new Date('2024-01-01'),
        samplingLocation: '采样点A',
        samplingPerson: '张三',
        storageLocation: '冷藏室1',
        storageCondition: '4℃冷藏',
        priority: 'HIGH',
        description: '重要样品',
        remarks: '需要加急处理',
        createdBy: 'test-user-id'
      }
      
      const sample = await sampleService.createSample(data)
      
      expect(sample.clientContact).toBe(data.clientContact)
      expect(sample.samplingLocation).toBe(data.samplingLocation)
      expect(sample.samplingPerson).toBe(data.samplingPerson)
      expect(sample.storageLocation).toBe(data.storageLocation)
      expect(sample.storageCondition).toBe(data.storageCondition)
      expect(sample.priority).toBe('HIGH')
      expect(sample.description).toBe(data.description)
      expect(sample.remarks).toBe(data.remarks)
    })
  })
  
  describe('listSamples', () => {
    beforeEach(async () => {
      // 创建测试数据
      await sampleService.createSample({
        clientName: 'TEST_客户E',
        sampleName: '样品E',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 500,
        unit: 'ml',
        receivedDate: new Date(),
        priority: 'HIGH',
        createdBy: 'test-user-id'
      })
      
      await sampleService.createSample({
        clientName: 'TEST_客户F',
        sampleName: '样品F',
        sampleType: '土壤',
        sampleCategory: '农田土壤',
        quantity: 1000,
        unit: 'g',
        receivedDate: new Date(),
        priority: 'NORMAL',
        createdBy: 'test-user-id'
      })
    })
    
    it('应该返回分页的样品列表', async () => {
      const result = await sampleService.listSamples({
        page: 1,
        pageSize: 10
      })
      
      expect(result).toBeDefined()
      expect(result.items).toBeInstanceOf(Array)
      expect(result.total).toBeGreaterThanOrEqual(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(10)
      expect(result.totalPages).toBeGreaterThanOrEqual(1)
    })
    
    it('应该支持按客户名称过滤', async () => {
      const result = await sampleService.listSamples({
        clientName: 'TEST_客户E',
        page: 1,
        pageSize: 10
      })
      
      expect(result.items.length).toBeGreaterThanOrEqual(1)
      expect(result.items[0].clientName).toContain('TEST_客户E')
    })
    
    it('应该支持按样品类型过滤', async () => {
      const result = await sampleService.listSamples({
        sampleType: '水质',
        page: 1,
        pageSize: 10
      })
      
      expect(result.items.length).toBeGreaterThanOrEqual(1)
      result.items.forEach(item => {
        expect(item.sampleType).toBe('水质')
      })
    })
    
    it('应该支持按优先级过滤', async () => {
      const result = await sampleService.listSamples({
        priority: 'HIGH',
        page: 1,
        pageSize: 10
      })
      
      expect(result.items.length).toBeGreaterThanOrEqual(1)
      result.items.forEach(item => {
        expect(item.priority).toBe('HIGH')
      })
    })
  })
  
  describe('getSample', () => {
    it('应该返回样品详情', async () => {
      const created = await sampleService.createSample({
        clientName: 'TEST_客户G',
        sampleName: '样品G',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 500,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      const sample = await sampleService.getSample(created.id)
      
      expect(sample).toBeDefined()
      expect(sample?.id).toBe(created.id)
      expect(sample?.barcode).toBe(created.barcode)
    })
    
    it('应该在样品不存在时返回 null', async () => {
      const sample = await sampleService.getSample('00000000-0000-0000-0000-000000000000')
      
      expect(sample).toBeNull()
    })
  })
  
  describe('getSampleByBarcode', () => {
    it('应该通过条码返回样品', async () => {
      const created = await sampleService.createSample({
        clientName: 'TEST_客户H',
        sampleName: '样品H',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 500,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      const sample = await sampleService.getSampleByBarcode(created.barcode)
      
      expect(sample).toBeDefined()
      expect(sample?.id).toBe(created.id)
      expect(sample?.barcode).toBe(created.barcode)
    })
    
    it('应该在条码不存在时返回 null', async () => {
      const sample = await sampleService.getSampleByBarcode('SP00000000000000')
      
      expect(sample).toBeNull()
    })
  })
  
  describe('updateSample', () => {
    it('应该成功更新样品信息', async () => {
      const created = await sampleService.createSample({
        clientName: 'TEST_客户I',
        sampleName: '样品I',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 500,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      const updated = await sampleService.updateSample(created.id, {
        sampleName: '更新后的样品名称',
        quantity: 1000,
        storageLocation: '冷藏室2'
      })
      
      expect(updated.sampleName).toBe('更新后的样品名称')
      expect(updated.quantity).toBe(1000)
      expect(updated.storageLocation).toBe('冷藏室2')
      expect(updated.barcode).toBe(created.barcode) // 条码不应改变
    })
  })
  
  describe('updateSampleStatus', () => {
    it('应该成功更新样品状态', async () => {
      const created = await sampleService.createSample({
        clientName: 'TEST_客户J',
        sampleName: '样品J',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 500,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      expect(created.status).toBe('REGISTERED')
      
      const updated = await sampleService.updateSampleStatus(created.id, 'IN_TESTING')
      
      expect(updated.status).toBe('IN_TESTING')
    })
  })
  
  describe('barcodeExists', () => {
    it('应该正确检测条码是否存在', async () => {
      const created = await sampleService.createSample({
        clientName: 'TEST_客户K',
        sampleName: '样品K',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 500,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      const exists = await sampleService.barcodeExists(created.barcode)
      expect(exists).toBe(true)
      
      const notExists = await sampleService.barcodeExists('SP00000000000000')
      expect(notExists).toBe(false)
    })
  })
  
  describe('sampleNumberExists', () => {
    it('应该正确检测样品编号是否存在', async () => {
      const created = await sampleService.createSample({
        clientName: 'TEST_客户L',
        sampleName: '样品L',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 500,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      const exists = await sampleService.sampleNumberExists(created.sampleNumber)
      expect(exists).toBe(true)
      
      const notExists = await sampleService.sampleNumberExists('0000000000')
      expect(notExists).toBe(false)
    })
  })
  
  describe('splitSample', () => {
    it('应该成功分样并创建子样品', async () => {
      // 创建母样品
      const parentSample = await sampleService.createSample({
        clientName: 'TEST_客户M',
        sampleName: '母样品',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 1000,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      // 分样
      const childSamples = await sampleService.splitSample({
        parentSampleId: parentSample.id,
        childSamples: [
          {
            sampleName: '子样品1',
            quantity: 300,
            unit: 'ml',
            description: '用于检测项目A'
          },
          {
            sampleName: '子样品2',
            quantity: 400,
            unit: 'ml',
            description: '用于检测项目B'
          }
        ],
        createdBy: 'test-user-id'
      })
      
      expect(childSamples).toHaveLength(2)
      expect(childSamples[0].parentSampleId).toBe(parentSample.id)
      expect(childSamples[1].parentSampleId).toBe(parentSample.id)
      expect(childSamples[0].sampleName).toBe('子样品1')
      expect(childSamples[1].sampleName).toBe('子样品2')
      expect(childSamples[0].quantity).toBe(300)
      expect(childSamples[1].quantity).toBe(400)
      
      // 验证子样品继承了母样品的信息
      expect(childSamples[0].clientName).toBe(parentSample.clientName)
      expect(childSamples[0].sampleType).toBe(parentSample.sampleType)
      expect(childSamples[0].sampleCategory).toBe(parentSample.sampleCategory)
      
      // 验证生成了唯一的条码和编号
      expect(childSamples[0].barcode).not.toBe(parentSample.barcode)
      expect(childSamples[1].barcode).not.toBe(parentSample.barcode)
      expect(childSamples[0].barcode).not.toBe(childSamples[1].barcode)
    })
    
    it('应该在母样品不存在时抛出错误', async () => {
      await expect(
        sampleService.splitSample({
          parentSampleId: 'non-existent-id',
          childSamples: [
            {
              sampleName: '子样品',
              quantity: 100,
              unit: 'ml'
            }
          ],
          createdBy: 'test-user-id'
        })
      ).rejects.toThrow('母样品不存在')
    })
    
    it('应该在母样品已归档时抛出错误', async () => {
      // 创建并归档样品
      const parentSample = await sampleService.createSample({
        clientName: 'TEST_客户N',
        sampleName: '已归档样品',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 1000,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      await sampleService.updateSampleStatus(parentSample.id, 'ARCHIVED')
      
      await expect(
        sampleService.splitSample({
          parentSampleId: parentSample.id,
          childSamples: [
            {
              sampleName: '子样品',
              quantity: 100,
              unit: 'ml'
            }
          ],
          createdBy: 'test-user-id'
        })
      ).rejects.toThrow('已归档的样品不能进行分样操作')
    })
  })
  
  describe('mergeSamples', () => {
    it('应该成功合样并创建合并样品', async () => {
      // 创建多个来源样品
      const source1 = await sampleService.createSample({
        clientName: 'TEST_客户O',
        sampleName: '来源样品1',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 300,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      const source2 = await sampleService.createSample({
        clientName: 'TEST_客户O',
        sampleName: '来源样品2',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 400,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      const source3 = await sampleService.createSample({
        clientName: 'TEST_客户O',
        sampleName: '来源样品3',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 300,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      // 合样
      const mergedSample = await sampleService.mergeSamples({
        sourceSampleIds: [source1.id, source2.id, source3.id],
        mergedSample: {
          sampleName: '合并样品',
          sampleType: '水质',
          sampleCategory: '地表水',
          quantity: 1000,
          unit: 'ml',
          description: '三个样品合并'
        },
        createdBy: 'test-user-id'
      })
      
      expect(mergedSample).toBeDefined()
      expect(mergedSample.sampleName).toBe('合并样品')
      expect(mergedSample.quantity).toBe(1000)
      expect(mergedSample.mergedFromIds).toHaveLength(3)
      expect(mergedSample.mergedFromIds).toContain(source1.id)
      expect(mergedSample.mergedFromIds).toContain(source2.id)
      expect(mergedSample.mergedFromIds).toContain(source3.id)
      
      // 验证继承了第一个来源样品的客户信息
      expect(mergedSample.clientName).toBe(source1.clientName)
      
      // 验证生成了唯一的条码和编号
      expect(mergedSample.barcode).not.toBe(source1.barcode)
      expect(mergedSample.barcode).not.toBe(source2.barcode)
      expect(mergedSample.barcode).not.toBe(source3.barcode)
    })
    
    it('应该在来源样品不存在时抛出错误', async () => {
      const source1 = await sampleService.createSample({
        clientName: 'TEST_客户P',
        sampleName: '来源样品',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 300,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      await expect(
        sampleService.mergeSamples({
          sourceSampleIds: [source1.id, 'non-existent-id'],
          mergedSample: {
            sampleName: '合并样品',
            sampleType: '水质',
            sampleCategory: '地表水',
            quantity: 500,
            unit: 'ml'
          },
          createdBy: 'test-user-id'
        })
      ).rejects.toThrow('部分来源样品不存在')
    })
    
    it('应该在来源样品已归档时抛出错误', async () => {
      const source1 = await sampleService.createSample({
        clientName: 'TEST_客户Q',
        sampleName: '来源样品1',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 300,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      const source2 = await sampleService.createSample({
        clientName: 'TEST_客户Q',
        sampleName: '来源样品2',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 400,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      // 归档其中一个样品
      await sampleService.updateSampleStatus(source2.id, 'ARCHIVED')
      
      await expect(
        sampleService.mergeSamples({
          sourceSampleIds: [source1.id, source2.id],
          mergedSample: {
            sampleName: '合并样品',
            sampleType: '水质',
            sampleCategory: '地表水',
            quantity: 700,
            unit: 'ml'
          },
          createdBy: 'test-user-id'
        })
      ).rejects.toThrow('已归档的样品不能进行合样操作')
    })
    
    it('应该在事务中完成所有操作', async () => {
      // 创建来源样品
      const source1 = await sampleService.createSample({
        clientName: 'TEST_客户R',
        sampleName: '来源样品1',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 300,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      const source2 = await sampleService.createSample({
        clientName: 'TEST_客户R',
        sampleName: '来源样品2',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 400,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: 'test-user-id'
      })
      
      // 合样
      const mergedSample = await sampleService.mergeSamples({
        sourceSampleIds: [source1.id, source2.id],
        mergedSample: {
          sampleName: '合并样品',
          sampleType: '水质',
          sampleCategory: '地表水',
          quantity: 700,
          unit: 'ml'
        },
        createdBy: 'test-user-id'
      })
      
      // 验证合并样品已创建
      const retrieved = await sampleService.getSample(mergedSample.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.mergedFromIds).toHaveLength(2)
    })
  })
})
