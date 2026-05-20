/**
 * 检测方法服务
 * 
 * 提供检测方法的业务逻辑处理
 */

import { PrismaClient } from '@prisma/client'
import type { CreateMethodRequest, UpdateMethodRequest, MethodFilters } from '../types/method'

const prisma = new PrismaClient()

export class MethodService {
  /**
   * 获取检测方法列表
   */
  async getMethodList(filters: MethodFilters, userId: string) {
    const { keyword, category, status, page = 1, pageSize = 10 } = filters

    // 构建查询条件
    const where: any = {}

    if (keyword) {
      where.OR = [
        { code: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } }
      ]
    }

    if (category) {
      where.category = category
    }

    if (status) {
      where.status = status.toUpperCase()
    }

    // 查询总数
    const total = await prisma.testMethod.count({ where })

    // 查询数据
    const methods = await prisma.testMethod.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' }
    })

    return {
      data: methods,
      total,
      page,
      pageSize
    }
  }

  /**
   * 获取检测方法详情
   */
  async getMethodById(id: string, userId: string) {
    const method = await prisma.testMethod.findUnique({
      where: { id }
    })

    if (!method) {
      throw new Error('检测方法不存在')
    }

    return method
  }

  /**
   * 创建检测方法
   */
  async createMethod(data: CreateMethodRequest, userId: string) {
    // 检查方法编号是否已存在
    const existing = await prisma.testMethod.findUnique({
      where: { code: data.code }
    })

    if (existing) {
      throw new Error('方法编号已存在')
    }

    // 创建检测方法
    const method = await prisma.testMethod.create({
      data: {
        ...data,
        status: data.status.toUpperCase() as any,
        equipment: data.equipment as any,
        steps: data.steps as any,
        createdBy: userId
      }
    })

    return method
  }

  /**
   * 更新检测方法
   */
  async updateMethod(id: string, data: UpdateMethodRequest, userId: string) {
    // 检查方法是否存在
    const existing = await prisma.testMethod.findUnique({
      where: { id }
    })

    if (!existing) {
      throw new Error('检测方法不存在')
    }

    // 如果更新了方法编号，检查新编号是否已被使用
    if (data.code && data.code !== existing.code) {
      const codeExists = await prisma.testMethod.findUnique({
        where: { code: data.code }
      })

      if (codeExists) {
        throw new Error('方法编号已存在')
      }
    }

    // 更新检测方法
    const method = await prisma.testMethod.update({
      where: { id },
      data: {
        ...data,
        status: data.status ? (data.status.toUpperCase() as any) : undefined,
        equipment: data.equipment as any,
        steps: data.steps as any
      }
    })

    return method
  }

  /**
   * 删除检测方法
   */
  async deleteMethod(id: string, userId: string) {
    // 检查方法是否存在
    const existing = await prisma.testMethod.findUnique({
      where: { id }
    })

    if (!existing) {
      throw new Error('检测方法不存在')
    }

    // 删除检测方法
    await prisma.testMethod.delete({
      where: { id }
    })
  }

  /**
   * 获取检测方法版本历史
   */
  async getMethodHistory(id: string, userId: string) {
    const method = await prisma.testMethod.findUnique({
      where: { id }
    })

    if (!method) {
      throw new Error('检测方法不存在')
    }

    // 查询同一方法编号的所有版本
    const history = await prisma.testMethod.findMany({
      where: {
        code: method.code
      },
      orderBy: { createdAt: 'desc' }
    })

    return history
  }

  /**
   * 复制检测方法
   */
  async copyMethod(id: string, newVersion: string, userId: string) {
    const original = await prisma.testMethod.findUnique({
      where: { id }
    })

    if (!original) {
      throw new Error('检测方法不存在')
    }

    // 创建新版本
    const method = await prisma.testMethod.create({
      data: {
        code: original.code,
        name: original.name,
        category: original.category,
        version: newVersion,
        status: 'DRAFT',
        scope: original.scope,
        description: original.description,
        equipment: original.equipment,
        steps: original.steps,
        precision: original.precision,
        accuracy: original.accuracy,
        detectionLimit: original.detectionLimit,
        measurementRange: original.measurementRange,
        qualityControl: original.qualityControl,
        safetyNotes: original.safetyNotes,
        operationNotes: original.operationNotes,
        createdBy: userId
      }
    })

    return method
  }

  /**
   * 归档检测方法
   */
  async archiveMethod(id: string, userId: string) {
    const method = await prisma.testMethod.findUnique({
      where: { id }
    })

    if (!method) {
      throw new Error('检测方法不存在')
    }

    await prisma.testMethod.update({
      where: { id },
      data: { status: 'ARCHIVED' }
    })
  }

  /**
   * 激活检测方法
   */
  async activateMethod(id: string, userId: string) {
    const method = await prisma.testMethod.findUnique({
      where: { id }
    })

    if (!method) {
      throw new Error('检测方法不存在')
    }

    await prisma.testMethod.update({
      where: { id },
      data: { status: 'ACTIVE' }
    })
  }
}

export const methodService = new MethodService()
