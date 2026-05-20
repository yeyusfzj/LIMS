// 样品流转属性测试
// 使用 fast-check 进行基于属性的测试

import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { SampleService } from '../services/sampleService'
import { TransferSampleDto } from '../types/sample'

const prisma = new PrismaClient()
const sampleService = new SampleService()

describe('样品流转属性测试', () => {
  // 清理测试数据
  afterAll(async () => {
    await prisma.transfer.deleteMany({
      where: {
        sample: {
          barcode: {
            startsWith: 'PROP-TEST-TRANSFER-'
          }
        }
      }
    })
    await prisma.sample.deleteMany({
      where: {
        barcode: {
          startsWith: 'PROP-TEST-TRANSFER-'
        }
      }
    })
    await prisma.$disconnect()
  })

  /**
   * 属性 3: 样品流转事务完整性
   * 
   * 验证需求: 3.1, 3.2, 3.3, 3.4
   * 
   * 属性描述:
   * 对于任何有效的样品流转操作,要么完全成功(流转记录创建且样品位置更新),
   * 要么完全失败(流转记录未创建且样品位置未更新)。
   * 不应该出现部分成功的情况。
   */
  describe('属性 3: 样品流转事务完整性', () => {
    it('流转操作应该是原子性的 - 要么全部成功要么全部失败', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机的流转数据
          fc.record({
            fromLocation: fc.string({ minLength: 1, maxLength: 50 }),
            toLocation: fc.string({ minLength: 1, maxLength: 50 }),
            fromPerson: fc.string({ minLength: 1, maxLength: 50 }),
            toPerson: fc.string({ minLength: 1, maxLength: 50 }),
            remarks: fc.option(fc.string({ maxLength: 200 }), { nil: undefined })
          }),
          async (transferInput) => {
            // 创建测试样品
            const barcode = `PROP-TEST-TRANSFER-${Date.now()}-${Math.random().toString(36).substring(7)}`
            const sample = await prisma.sample.create({
              data: {
                barcode,
                sampleNumber: `SN-${barcode}`,
                clientName: '属性测试客户',
                sampleName: '属性测试样品',
                sampleType: '水样',
                sampleCategory: '环境样品',
                quantity: 100,
                unit: 'mL',
                receivedDate: new Date(),
                storageLocation: transferInput.fromLocation,
                status: 'REGISTERED',
                priority: 'NORMAL',
                createdBy: 'property-test-user'
              }
            })

            // 记录流转前的状态
            const transferCountBefore = await prisma.transfer.count({
              where: { sampleId: sample.id }
            })
            const sampleBefore = await prisma.sample.findUnique({
              where: { id: sample.id }
            })

            try {
              // 执行流转操作
              const transferData: TransferSampleDto = {
                sampleId: sample.id,
                fromLocation: transferInput.fromLocation,
                toLocation: transferInput.toLocation,
                fromPerson: transferInput.fromPerson,
                toPerson: transferInput.toPerson,
                remarks: transferInput.remarks,
                createdBy: 'property-test-user'
              }

              const transfer = await sampleService.transferSample(transferData)

              // 验证流转成功后的状态
              const transferCountAfter = await prisma.transfer.count({
                where: { sampleId: sample.id }
              })
              const sampleAfter = await prisma.sample.findUnique({
                where: { id: sample.id }
              })

              // 属性验证: 流转记录应该增加1条
              expect(transferCountAfter).toBe(transferCountBefore + 1)
              
              // 属性验证: 样品位置应该更新为目标位置
              expect(sampleAfter?.storageLocation).toBe(transferInput.toLocation)
              
              // 属性验证: 流转记录应该包含正确的信息
              expect(transfer.sampleId).toBe(sample.id)
              expect(transfer.fromLocation).toBe(transferInput.fromLocation)
              expect(transfer.toLocation).toBe(transferInput.toLocation)
              expect(transfer.status).toBe('PENDING')

            } catch (error) {
              // 如果流转失败,验证状态未改变
              const transferCountAfter = await prisma.transfer.count({
                where: { sampleId: sample.id }
              })
              const sampleAfter = await prisma.sample.findUnique({
                where: { id: sample.id }
              })

              // 属性验证: 流转记录数量应该不变
              expect(transferCountAfter).toBe(transferCountBefore)
              
              // 属性验证: 样品位置应该不变
              expect(sampleAfter?.storageLocation).toBe(sampleBefore?.storageLocation)
            } finally {
              // 清理测试数据
              await prisma.transfer.deleteMany({
                where: { sampleId: sample.id }
              })
              await prisma.sample.delete({
                where: { id: sample.id }
              })
            }
          }
        ),
        { numRuns: 50 } // 运行50次测试
      )
    })
  })

  /**
   * 属性 4: 监管链完整性
   * 
   * 验证需求: 3.1, 3.2, 3.3, 3.4
   * 
   * 属性描述:
   * 对于任何样品,其监管链应该:
   * 1. 包含所有的流转记录
   * 2. 按时间顺序排列
   * 3. 每条记录的toLocation应该等于下一条记录的fromLocation(如果存在)
   * 4. 最后一条记录的toLocation应该等于样品当前的storageLocation
   */
  describe('属性 4: 监管链完整性', () => {
    it('监管链应该完整且连续', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成一系列流转操作
          fc.array(
            fc.record({
              location: fc.string({ minLength: 1, maxLength: 50 }),
              person: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (transfers) => {
            // 创建测试样品
            const barcode = `PROP-TEST-CHAIN-${Date.now()}-${Math.random().toString(36).substring(7)}`
            const initialLocation = transfers[0].location
            
            const sample = await prisma.sample.create({
              data: {
                barcode,
                sampleNumber: `SN-${barcode}`,
                clientName: '监管链测试客户',
                sampleName: '监管链测试样品',
                sampleType: '水样',
                sampleCategory: '环境样品',
                quantity: 100,
                unit: 'mL',
                receivedDate: new Date(),
                storageLocation: initialLocation,
                status: 'REGISTERED',
                priority: 'NORMAL',
                createdBy: 'chain-test-user'
              }
            })

            try {
              // 执行一系列流转操作
              for (let i = 0; i < transfers.length - 1; i++) {
                const transferData: TransferSampleDto = {
                  sampleId: sample.id,
                  fromLocation: transfers[i].location,
                  toLocation: transfers[i + 1].location,
                  fromPerson: transfers[i].person,
                  toPerson: transfers[i + 1].person,
                  createdBy: 'chain-test-user'
                }

                await sampleService.transferSample(transferData)
                
                // 添加小延迟确保时间戳不同
                await new Promise(resolve => setTimeout(resolve, 10))
              }

              // 获取监管链
              const custody = await sampleService.getChainOfCustody(sample.id)

              // 属性验证 1: 监管链记录数量应该等于流转次数
              expect(custody.length).toBe(transfers.length - 1)

              // 属性验证 2: 监管链应该按时间顺序排列
              for (let i = 1; i < custody.length; i++) {
                expect(custody[i].transferDate.getTime())
                  .toBeGreaterThanOrEqual(custody[i - 1].transferDate.getTime())
              }

              // 属性验证 3: 每条记录的toLocation应该等于下一条记录的fromLocation
              for (let i = 0; i < custody.length - 1; i++) {
                expect(custody[i].toLocation).toBe(custody[i + 1].fromLocation)
              }

              // 属性验证 4: 最后一条记录的toLocation应该等于样品当前位置
              const currentSample = await prisma.sample.findUnique({
                where: { id: sample.id }
              })
              if (custody.length > 0) {
                expect(custody[custody.length - 1].toLocation)
                  .toBe(currentSample?.storageLocation)
              }

              // 属性验证 5: 第一条记录的fromLocation应该等于初始位置
              if (custody.length > 0) {
                expect(custody[0].fromLocation).toBe(initialLocation)
              }

            } finally {
              // 清理测试数据
              await prisma.transfer.deleteMany({
                where: { sampleId: sample.id }
              })
              await prisma.sample.delete({
                where: { id: sample.id }
              })
            }
          }
        ),
        { numRuns: 30 } // 运行30次测试
      )
    })

    it('双方确认后的流转应该保持监管链的完整性', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fromLocation: fc.string({ minLength: 1, maxLength: 50 }),
            toLocation: fc.string({ minLength: 1, maxLength: 50 }),
            fromPerson: fc.string({ minLength: 1, maxLength: 50 }),
            toPerson: fc.string({ minLength: 1, maxLength: 50 })
          }),
          async (transferInput) => {
            // 创建测试样品
            const barcode = `PROP-TEST-CONFIRM-${Date.now()}-${Math.random().toString(36).substring(7)}`
            const sample = await prisma.sample.create({
              data: {
                barcode,
                sampleNumber: `SN-${barcode}`,
                clientName: '确认测试客户',
                sampleName: '确认测试样品',
                sampleType: '水样',
                sampleCategory: '环境样品',
                quantity: 100,
                unit: 'mL',
                receivedDate: new Date(),
                storageLocation: transferInput.fromLocation,
                status: 'REGISTERED',
                priority: 'NORMAL',
                createdBy: 'confirm-test-user'
              }
            })

            try {
              // 创建流转
              const transferData: TransferSampleDto = {
                sampleId: sample.id,
                fromLocation: transferInput.fromLocation,
                toLocation: transferInput.toLocation,
                fromPerson: transferInput.fromPerson,
                toPerson: transferInput.toPerson,
                createdBy: 'confirm-test-user'
              }

              const transfer = await sampleService.transferSample(transferData)

              // 发送方确认
              await sampleService.confirmTransfer({
                transferId: transfer.id,
                confirmationType: 'sender',
                userId: 'confirm-test-user'
              })

              // 接收方确认
              await sampleService.confirmTransfer({
                transferId: transfer.id,
                confirmationType: 'receiver',
                userId: 'confirm-test-user'
              })

              // 获取监管链
              const custody = await sampleService.getChainOfCustody(sample.id)

              // 属性验证: 确认后的流转记录应该在监管链中
              expect(custody.length).toBe(1)
              expect(custody[0].status).toBe('RECEIVED')
              expect(custody[0].senderConfirmed).toBe(true)
              expect(custody[0].receiverConfirmed).toBe(true)
              expect(custody[0].receivedDate).toBeDefined()

            } finally {
              // 清理测试数据
              await prisma.transfer.deleteMany({
                where: { sampleId: sample.id }
              })
              await prisma.sample.delete({
                where: { id: sample.id }
              })
            }
          }
        ),
        { numRuns: 30 } // 运行30次测试
      )
    })
  })
})
