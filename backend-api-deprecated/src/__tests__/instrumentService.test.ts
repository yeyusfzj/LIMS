// 仪器服务单元测试

import { describe, it, expect, beforeEach } from 'vitest'
import { InstrumentService } from '../services/instrumentService'
import { InstrumentStatus } from '@prisma/client'
import type { CreateInstrumentDto, UpdateInstrumentDto } from '../types/instrument'

describe('InstrumentService', () => {
  let service: InstrumentService

  beforeEach(() => {
    service = new InstrumentService()
  })

  describe('基本功能测试', () => {
    it('应该能够实例化服务', () => {
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(InstrumentService)
    })

    it('应该有 createInstrument 方法', () => {
      expect(service.createInstrument).toBeDefined()
      expect(typeof service.createInstrument).toBe('function')
    })

    it('应该有 getInstruments 方法', () => {
      expect(service.getInstruments).toBeDefined()
      expect(typeof service.getInstruments).toBe('function')
    })

    it('应该有 getInstrumentById 方法', () => {
      expect(service.getInstrumentById).toBeDefined()
      expect(typeof service.getInstrumentById).toBe('function')
    })

    it('应该有 getInstrumentByCode 方法', () => {
      expect(service.getInstrumentByCode).toBeDefined()
      expect(typeof service.getInstrumentByCode).toBe('function')
    })

    it('应该有 updateInstrument 方法', () => {
      expect(service.updateInstrument).toBeDefined()
      expect(typeof service.updateInstrument).toBe('function')
    })

    it('应该有 deleteInstrument 方法', () => {
      expect(service.deleteInstrument).toBeDefined()
      expect(typeof service.deleteInstrument).toBe('function')
    })

    it('应该有 validateInstrumentCode 方法', () => {
      expect(service.validateInstrumentCode).toBeDefined()
      expect(typeof service.validateInstrumentCode).toBe('function')
    })

    it('应该有 updateInstrumentStatus 方法', () => {
      expect(service.updateInstrumentStatus).toBeDefined()
      expect(typeof service.updateInstrumentStatus).toBe('function')
    })

    it('应该有 batchDeleteInstruments 方法', () => {
      expect(service.batchDeleteInstruments).toBeDefined()
      expect(typeof service.batchDeleteInstruments).toBe('function')
    })
  })

  describe('数据验证', () => {
    it('CreateInstrumentDto 应该包含必需字段', () => {
      const mockData: CreateInstrumentDto = {
        code: 'INS-2024-001',
        name: '高效液相色谱仪'
      }

      expect(mockData.code).toBeDefined()
      expect(mockData.name).toBeDefined()
    })

    it('CreateInstrumentDto 应该支持可选字段', () => {
      const mockData: CreateInstrumentDto = {
        code: 'INS-2024-001',
        name: '高效液相色谱仪',
        model: 'LC-2030C',
        manufacturer: '岛津',
        serialNumber: 'C12345678',
        purchaseDate: '2024-01-15',
        purchasePrice: 350000,
        technicalParams: {
          measurementRange: '190-800nm',
          precision: '±0.5%'
        },
        status: InstrumentStatus.IN_USE,
        currentLocation: '检测室A',
        currentDepartment: '理化检测部',
        currentResponsible: '张三',
        description: '用于水质检测',
        remarks: '新购设备'
      }

      expect(mockData.model).toBe('LC-2030C')
      expect(mockData.manufacturer).toBe('岛津')
      expect(mockData.technicalParams).toBeDefined()
    })

    it('UpdateInstrumentDto 所有字段都应该是可选的', () => {
      const mockData: UpdateInstrumentDto = {
        name: '更新后的名称'
      }

      expect(mockData.name).toBe('更新后的名称')

      const fullData: UpdateInstrumentDto = {
        name: '完整更新',
        model: '新型号',
        manufacturer: '新制造商',
        status: InstrumentStatus.MAINTENANCE
      }

      expect(fullData.status).toBe(InstrumentStatus.MAINTENANCE)
    })
  })

  describe('状态枚举', () => {
    it('应该包含所有仪器状态', () => {
      expect(InstrumentStatus.IN_USE).toBe('IN_USE')
      expect(InstrumentStatus.STANDBY).toBe('STANDBY')
      expect(InstrumentStatus.MAINTENANCE).toBe('MAINTENANCE')
      expect(InstrumentStatus.CALIBRATING).toBe('CALIBRATING')
      expect(InstrumentStatus.PENDING_DISPOSAL).toBe('PENDING_DISPOSAL')
      expect(InstrumentStatus.DISPOSED).toBe('DISPOSED')
    })
  })
})
