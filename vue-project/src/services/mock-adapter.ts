/**
 * Mock数据适配器
 * 
 * 设计目的:
 * 1. 在后端API未完成时,使用Mock数据进行前端开发
 * 2. 保持与真实API相同的接口签名
 * 3. 便于切换到真实API(只需修改环境变量)
 * 
 * 使用方式:
 * - 开发环境: 自动使用Mock数据
 * - 生产环境: 使用真实API
 */

import type { Sample } from '@/types'
import type { PageResponse, SampleListRequest } from '@/types/api'

// 模拟样品数据
const mockSamples: Sample[] = [
  {
    id: '1',
    barcode: 'S2024010001',
    name: '水质样品-A',
    source: '某河流',
    client: '环保局',
    receivedDate: new Date('2024-01-15'),
    sampleType: '水质',
    quantity: 500,
    unit: 'ml',
    status: 'in_progress',
    currentLocation: '实验室A-01',
    createdBy: '张三',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '2',
    barcode: 'S2024010002',
    name: '土壤样品-B',
    source: '某农田',
    client: '农业局',
    receivedDate: new Date('2024-01-16'),
    sampleType: '土壤',
    quantity: 1000,
    unit: 'g',
    status: 'registered',
    currentLocation: '样品室-02',
    createdBy: '李四',
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16')
  },
  {
    id: '3',
    barcode: 'S2024010003',
    name: '空气样品-C',
    source: '某工厂',
    client: '工业园区',
    receivedDate: new Date('2024-01-17'),
    sampleType: '空气',
    quantity: 10,
    unit: 'L',
    status: 'completed',
    currentLocation: '实验室B-03',
    createdBy: '王五',
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-18')
  },
  {
    id: '4',
    barcode: 'S2024010004',
    name: '水质样品-D',
    source: '某湖泊',
    client: '环保局',
    receivedDate: new Date('2024-01-18'),
    sampleType: '水质',
    quantity: 1000,
    unit: 'ml',
    status: 'released',
    currentLocation: '留样室-01',
    createdBy: '张三',
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-19')
  },
  {
    id: '5',
    barcode: 'S2024010005',
    name: '土壤样品-E',
    source: '某矿区',
    client: '矿业公司',
    receivedDate: new Date('2024-01-19'),
    sampleType: '土壤',
    quantity: 2000,
    unit: 'g',
    status: 'returned',
    currentLocation: '样品室-03',
    createdBy: '李四',
    createdAt: new Date('2024-01-19'),
    updatedAt: new Date('2024-01-20')
  }
]

/**
 * Mock样品API
 */
export class MockSampleApi {
  // 模拟网络延迟
  private delay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async getList(params: SampleListRequest): Promise<PageResponse<Sample>> {
    await this.delay()

    let filteredData = [...mockSamples]

    // 应用筛选
    if (params.filters) {
      const { barcode, name, status, sampleType, client, location, createdBy } = params.filters

      if (barcode) {
        filteredData = filteredData.filter(item =>
          item.barcode.toLowerCase().includes(barcode.toLowerCase())
        )
      }

      if (name) {
        filteredData = filteredData.filter(item =>
          item.name.toLowerCase().includes(name.toLowerCase())
        )
      }

      if (status && status.length > 0) {
        filteredData = filteredData.filter(item => status.includes(item.status))
      }

      if (sampleType) {
        filteredData = filteredData.filter(item => item.sampleType === sampleType)
      }

      if (client) {
        filteredData = filteredData.filter(item =>
          item.client.toLowerCase().includes(client.toLowerCase())
        )
      }

      if (location) {
        filteredData = filteredData.filter(item =>
          item.currentLocation.toLowerCase().includes(location.toLowerCase())
        )
      }

      if (createdBy) {
        filteredData = filteredData.filter(item =>
          item.createdBy.toLowerCase().includes(createdBy.toLowerCase())
        )
      }
    }

    // 排序
    if (params.sortBy) {
      filteredData.sort((a, b) => {
        const aVal = a[params.sortBy as keyof Sample]
        const bVal = b[params.sortBy as keyof Sample]

        if (aVal < bVal) return params.sortOrder === 'asc' ? -1 : 1
        if (aVal > bVal) return params.sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }

    // 分页
    const total = filteredData.length
    const start = (params.page - 1) * params.pageSize
    const end = start + params.pageSize
    const items = filteredData.slice(start, end)

    return {
      items,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize)
    }
  }

  async getById(id: string): Promise<Sample> {
    await this.delay()
    const sample = mockSamples.find(s => s.id === id)
    if (!sample) {
      throw new Error('样品不存在')
    }
    return sample
  }

  async create(data: any): Promise<Sample> {
    await this.delay()
    const newSample: Sample = {
      id: String(mockSamples.length + 1),
      barcode: `S${Date.now()}`,
      ...data,
      status: 'registered' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    mockSamples.push(newSample)
    return newSample
  }

  async update(data: any): Promise<Sample> {
    await this.delay()
    const index = mockSamples.findIndex(s => s.id === data.id)
    if (index === -1) {
      throw new Error('样品不存在')
    }
    mockSamples[index] = {
      ...mockSamples[index],
      ...data,
      updatedAt: new Date()
    }
    return mockSamples[index]
  }

  async delete(id: string): Promise<void> {
    await this.delay()
    const index = mockSamples.findIndex(s => s.id === id)
    if (index !== -1) {
      mockSamples.splice(index, 1)
    }
  }
}

// 判断是否使用Mock数据
export const useMock = import.meta.env.MODE === 'development' && !import.meta.env.VITE_USE_REAL_API

// 导出Mock实例
export const mockSampleApi = new MockSampleApi()
