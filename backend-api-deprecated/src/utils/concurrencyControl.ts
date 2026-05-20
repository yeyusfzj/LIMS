/**
 * 并发控制工具类
 * 提供乐观锁、事务管理和并发冲突检测功能
 */

import { PrismaClient } from '@prisma/client';

/**
 * 并发冲突错误
 */
export class ConcurrencyConflictError extends Error {
  constructor(
    message: string,
    public readonly currentVersion: number,
    public readonly requestedVersion: number
  ) {
    super(message);
    this.name = 'ConcurrencyConflictError';
  }
}

/**
 * 乐观锁更新选项
 */
export interface OptimisticLockOptions {
  id: string;
  version: number;
  data: any;
}

/**
 * 乐观锁管理器
 */
export class OptimisticLockManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * 使用乐观锁更新样品
   */
  async updateSampleWithLock(options: OptimisticLockOptions) {
    const { id, version, data } = options;

    // 查询当前版本
    const current = await this.prisma.sample.findUnique({
      where: { id },
      select: { version: true }
    });

    if (!current) {
      throw new Error('Sample not found');
    }

    // 检查版本冲突
    if (current.version !== version) {
      throw new ConcurrencyConflictError(
        'Sample has been modified by another user',
        current.version,
        version
      );
    }

    // 更新数据并递增版本号
    return await this.prisma.sample.update({
      where: { id, version },
      data: {
        ...data,
        version: { increment: 1 }
      }
    });
  }

  /**
   * 使用乐观锁更新检测结果
   */
  async updateResultWithLock(options: OptimisticLockOptions) {
    const { id, version, data } = options;

    const current = await this.prisma.result.findUnique({
      where: { id },
      select: { version: true }
    });

    if (!current) {
      throw new Error('Result not found');
    }

    if (current.version !== version) {
      throw new ConcurrencyConflictError(
        'Result has been modified by another user',
        current.version,
        version
      );
    }

    return await this.prisma.result.update({
      where: { id, version },
      data: {
        ...data,
        version: { increment: 1 }
      }
    });
  }

  /**
   * 使用乐观锁更新报告
   */
  async updateReportWithLock(options: OptimisticLockOptions) {
    const { id, version, data } = options;

    const current = await this.prisma.report.findUnique({
      where: { id },
      select: { version: true }
    });

    if (!current) {
      throw new Error('Report not found');
    }

    if (current.version !== version) {
      throw new ConcurrencyConflictError(
        'Report has been modified by another user',
        current.version,
        version
      );
    }

    return await this.prisma.report.update({
      where: { id, version },
      data: {
        ...data,
        version: { increment: 1 }
      }
    });
  }

  /**
   * 使用乐观锁更新质量判定
   */
  async updateQualityJudgmentWithLock(options: OptimisticLockOptions) {
    const { id, version, data } = options;

    const current = await this.prisma.qualityJudgment.findUnique({
      where: { id },
      select: { version: true }
    });

    if (!current) {
      throw new Error('Quality judgment not found');
    }

    if (current.version !== version) {
      throw new ConcurrencyConflictError(
        'Quality judgment has been modified by another user',
        current.version,
        version
      );
    }

    return await this.prisma.qualityJudgment.update({
      where: { id, version },
      data: {
        ...data,
        version: { increment: 1 }
      }
    });
  }
}

/**
 * 事务管理器
 */
export class TransactionManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * 在事务中执行样品流转操作
   * 确保流转记录创建和样品位置更新的原子性
   */
  async executeSampleTransfer(
    sampleId: string,
    transferData: any,
    sampleUpdateData: any
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 创建流转记录
      const transfer = await tx.transfer.create({
        data: transferData
      });

      // 更新样品位置
      const sample = await tx.sample.update({
        where: { id: sampleId },
        data: {
          ...sampleUpdateData,
          version: { increment: 1 }
        }
      });

      return { transfer, sample };
    });
  }

  /**
   * 在事务中执行分样操作
   * 确保子样品创建和母样品更新的原子性
   */
  async executeSampleSplit(
    parentId: string,
    childSamplesData: any[],
    parentUpdateData: any
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 创建子样品
      const childSamples = await Promise.all(
        childSamplesData.map(data => tx.sample.create({ data }))
      );

      // 更新母样品
      const parentSample = await tx.sample.update({
        where: { id: parentId },
        data: {
          ...parentUpdateData,
          version: { increment: 1 }
        }
      });

      return { parentSample, childSamples };
    });
  }

  /**
   * 在事务中执行合样操作
   * 确保合并样品创建和来源样品更新的原子性
   */
  async executeSampleMerge(
    mergedSampleData: any,
    sourceSampleIds: string[],
    sourceUpdateData: any
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 创建合并样品
      const mergedSample = await tx.sample.create({
        data: mergedSampleData
      });

      // 更新来源样品状态
      const sourceSamples = await Promise.all(
        sourceSampleIds.map(id =>
          tx.sample.update({
            where: { id },
            data: {
              ...sourceUpdateData,
              version: { increment: 1 }
            }
          })
        )
      );

      return { mergedSample, sourceSamples };
    });
  }

  /**
   * 在事务中执行批量结果导入
   * 确保所有结果要么全部插入成功，要么全部失败
   */
  async executeBatchResultImport(resultsData: any[]) {
    return await this.prisma.$transaction(async (tx) => {
      const results = await Promise.all(
        resultsData.map(data => tx.result.create({ data }))
      );
      return results;
    });
  }

  /**
   * 在事务中执行批量样品放行
   * 确保所有样品状态更新的原子性
   */
  async executeBatchSampleRelease(
    sampleIds: string[],
    releaseData: any
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const samples = await Promise.all(
        sampleIds.map(id =>
          tx.sample.update({
            where: { id },
            data: {
              ...releaseData,
              version: { increment: 1 }
            }
          })
        )
      );
      return samples;
    });
  }

  /**
   * 在事务中执行审核流程
   * 确保审核任务更新和样品状态更新的原子性
   */
  async executeAuditProcess(
    auditTaskId: string,
    auditUpdateData: any,
    sampleId: string,
    sampleUpdateData: any
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 更新审核任务
      const auditTask = await tx.auditTask.update({
        where: { id: auditTaskId },
        data: auditUpdateData
      });

      // 更新样品状态
      const sample = await tx.sample.update({
        where: { id: sampleId },
        data: {
          ...sampleUpdateData,
          version: { increment: 1 }
        }
      });

      return { auditTask, sample };
    });
  }

  /**
   * 通用事务执行方法
   * 允许执行自定义的事务操作
   */
  async executeTransaction<T>(
    callback: (tx: any) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(callback);
  }
}

/**
 * 并发冲突检测器
 */
export class ConcurrencyConflictDetector {
  /**
   * 检测并发冲突
   * 比较请求的版本号与当前版本号
   */
  static detectConflict(
    currentVersion: number,
    requestedVersion: number,
    resourceType: string
  ): void {
    if (currentVersion !== requestedVersion) {
      throw new ConcurrencyConflictError(
        `${resourceType} has been modified by another user`,
        currentVersion,
        requestedVersion
      );
    }
  }

  /**
   * 检查资源是否被锁定
   * 可以扩展为分布式锁检查
   */
  static checkResourceLock(resourceId: string, resourceType: string): boolean {
    // 这里可以实现基于 Redis 的分布式锁检查
    // 目前返回 false 表示未锁定
    return false;
  }
}

/**
 * 重试策略
 * 用于处理并发冲突时的重试逻辑
 */
export class RetryStrategy {
  /**
   * 执行带重试的操作
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 100
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // 只对并发冲突错误进行重试
        if (error instanceof ConcurrencyConflictError) {
          if (attempt < maxRetries - 1) {
            // 指数退避
            await this.delay(delayMs * Math.pow(2, attempt));
            continue;
          }
        }

        // 其他错误直接抛出
        throw error;
      }
    }

    throw lastError;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
