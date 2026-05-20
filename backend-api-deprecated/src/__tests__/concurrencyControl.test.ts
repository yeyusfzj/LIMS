/**
 * 并发控制测试
 * 测试乐观锁、事务管理和并发冲突检测
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  OptimisticLockManager,
  TransactionManager,
  ConcurrencyConflictError,
  RetryStrategy
} from '../utils/concurrencyControl';

const prisma = new PrismaClient();
const lockManager = new OptimisticLockManager(prisma);
const transactionManager = new TransactionManager(prisma);

describe('并发控制测试', () => {
  let testSampleId: string;
  let testUserId: string;

  beforeAll(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'concurrency_test_user',
        email: 'concurrency@test.com',
        passwordHash: 'hash',
        fullName: '并发测试用户',
        status: 'ACTIVE'
      }
    });
    testUserId = user.id;
  });

  beforeEach(async () => {
    // 创建测试样品
    const sample = await prisma.sample.create({
      data: {
        barcode: `TEST-CONC-${Date.now()}`,
        sampleNumber: `SN-CONC-${Date.now()}`,
        clientName: '测试客户',
        sampleName: '测试样品',
        sampleType: '水质',
        sampleCategory: '环境',
        quantity: 100,
        unit: 'ml',
        receivedDate: new Date(),
        status: 'REGISTERED',
        createdBy: testUserId
        // version 字段有默认值，不需要手动设置
      }
    });
    testSampleId = sample.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.sample.deleteMany({
      where: { barcode: { startsWith: 'TEST-CONC-' } }
    });
    await prisma.user.deleteMany({
      where: { username: 'concurrency_test_user' }
    });
    await prisma.$disconnect();
  });

  describe('乐观锁机制', () => {
    it('应该成功更新具有正确版本号的样品', async () => {
      const sample = await prisma.sample.findUnique({
        where: { id: testSampleId }
      });

      expect(sample).toBeTruthy();
      expect(sample!.version).toBe(1);

      const updated = await lockManager.updateSampleWithLock({
        id: testSampleId,
        version: 1,
        data: {
          sampleName: '更新后的样品名称',
          quantity: 150
        }
      });

      expect(updated.sampleName).toBe('更新后的样品名称');
      expect(updated.quantity).toBe(150);
      expect(updated.version).toBe(2); // 版本号应该递增
    });

    it('应该拒绝使用过期版本号的更新', async () => {
      // 先更新一次，使版本号变为 2
      await lockManager.updateSampleWithLock({
        id: testSampleId,
        version: 1,
        data: { quantity: 150 }
      });

      // 尝试使用旧版本号更新，应该失败
      await expect(
        lockManager.updateSampleWithLock({
          id: testSampleId,
          version: 1, // 使用过期的版本号
          data: { quantity: 200 }
        })
      ).rejects.toThrow(ConcurrencyConflictError);
    });

    it('应该在并发冲突时返回正确的版本信息', async () => {
      // 先更新一次
      await lockManager.updateSampleWithLock({
        id: testSampleId,
        version: 1,
        data: { quantity: 150 }
      });

      try {
        await lockManager.updateSampleWithLock({
          id: testSampleId,
          version: 1,
          data: { quantity: 200 }
        });
        expect.fail('应该抛出并发冲突错误');
      } catch (error) {
        expect(error).toBeInstanceOf(ConcurrencyConflictError);
        const conflictError = error as ConcurrencyConflictError;
        expect(conflictError.currentVersion).toBe(2);
        expect(conflictError.requestedVersion).toBe(1);
      }
    });

    it('应该支持多次连续更新', async () => {
      let currentVersion = 1;

      for (let i = 0; i < 5; i++) {
        const updated = await lockManager.updateSampleWithLock({
          id: testSampleId,
          version: currentVersion,
          data: { quantity: 100 + i * 10 }
        });
        currentVersion = updated.version;
        expect(updated.version).toBe(i + 2);
      }

      const final = await prisma.sample.findUnique({
        where: { id: testSampleId }
      });
      expect(final!.version).toBe(6);
      expect(final!.quantity).toBe(140);
    });
  });

  describe('事务管理', () => {
    it('应该在事务中原子性地执行样品流转', async () => {
      const result = await transactionManager.executeSampleTransfer(
        testSampleId,
        {
          sampleId: testSampleId,
          fromLocation: '仓库A',
          toLocation: '实验室B',
          fromPerson: '张三',
          toPerson: '李四',
          transferDate: new Date(),
          status: 'PENDING',
          senderConfirmed: false,
          receiverConfirmed: false
        },
        {
          storageLocation: '实验室B'
        }
      );

      expect(result.transfer).toBeTruthy();
      expect(result.sample.storageLocation).toBe('实验室B');
      expect(result.sample.version).toBe(2); // 版本号应该递增

      // 验证流转记录已创建
      const transfer = await prisma.transfer.findUnique({
        where: { id: result.transfer.id }
      });
      expect(transfer).toBeTruthy();
      expect(transfer!.toLocation).toBe('实验室B');
    });

    it('应该在事务中原子性地执行分样操作', async () => {
      const childSamplesData = [
        {
          barcode: `${testSampleId}-1`,
          sampleNumber: `SN-${testSampleId}-1`,
          clientName: '测试客户',
          sampleName: '子样品1',
          sampleType: '水质',
          sampleCategory: '环境',
          quantity: 50,
          unit: 'ml',
          receivedDate: new Date(),
          status: 'REGISTERED' as const,
          priority: 'NORMAL' as const,
          parentSampleId: testSampleId,
          createdBy: testUserId
        },
        {
          barcode: `${testSampleId}-2`,
          sampleNumber: `SN-${testSampleId}-2`,
          clientName: '测试客户',
          sampleName: '子样品2',
          sampleType: '水质',
          sampleCategory: '环境',
          quantity: 50,
          unit: 'ml',
          receivedDate: new Date(),
          status: 'REGISTERED' as const,
          priority: 'NORMAL' as const,
          parentSampleId: testSampleId,
          createdBy: testUserId
        }
      ];

      const result = await transactionManager.executeSampleSplit(
        testSampleId,
        childSamplesData,
        {}
      );

      expect(result.childSamples).toHaveLength(2);
      expect(result.parentSample.version).toBe(2);

      // 验证子样品已创建
      const childSamples = await prisma.sample.findMany({
        where: { parentSampleId: testSampleId }
      });
      expect(childSamples).toHaveLength(2);
    });

    it('应该在事务失败时回滚所有操作', async () => {
      const initialSample = await prisma.sample.findUnique({
        where: { id: testSampleId }
      });

      try {
        await transactionManager.executeTransaction(async (tx) => {
          // 更新样品
          await tx.sample.update({
            where: { id: testSampleId },
            data: { quantity: 999 }
          });

          // 故意抛出错误以触发回滚
          throw new Error('测试回滚');
        });
        expect.fail('应该抛出错误');
      } catch (error) {
        expect((error as Error).message).toBe('测试回滚');
      }

      // 验证样品未被修改
      const finalSample = await prisma.sample.findUnique({
        where: { id: testSampleId }
      });
      expect(finalSample!.quantity).toBe(initialSample!.quantity);
      expect(finalSample!.version).toBe(initialSample!.version);
    });

    it('应该支持批量操作的事务性', async () => {
      // 创建多个测试样品
      const samples = await Promise.all([
        prisma.sample.create({
          data: {
            barcode: `TEST-CONC-BATCH-1-${Date.now()}`,
            sampleNumber: `SN-BATCH-1-${Date.now()}`,
            clientName: '测试客户',
            sampleName: '批量样品1',
            sampleType: '水质',
            sampleCategory: '环境',
            quantity: 100,
            unit: 'ml',
            receivedDate: new Date(),
            status: 'REGISTERED',
            createdBy: testUserId
          }
        }),
        prisma.sample.create({
          data: {
            barcode: `TEST-CONC-BATCH-2-${Date.now()}`,
            sampleNumber: `SN-BATCH-2-${Date.now()}`,
            clientName: '测试客户',
            sampleName: '批量样品2',
            sampleType: '水质',
            sampleCategory: '环境',
            quantity: 100,
            unit: 'ml',
            receivedDate: new Date(),
            status: 'REGISTERED',
            createdBy: testUserId
          }
        })
      ]);

      const sampleIds = samples.map(s => s.id);

      // 批量更新状态
      const updated = await transactionManager.executeBatchSampleRelease(
        sampleIds,
        {
          status: 'RELEASED',
          releasedAt: new Date(),
          releasedBy: testUserId
        }
      );

      expect(updated).toHaveLength(2);
      updated.forEach(sample => {
        expect(sample.status).toBe('RELEASED');
        expect(sample.releasedAt).toBeTruthy();
        expect(sample.version).toBe(2);
      });
    });
  });

  describe('重试策略', () => {
    it('应该在并发冲突时自动重试', async () => {
      let attemptCount = 0;

      const result = await RetryStrategy.executeWithRetry(async () => {
        attemptCount++;

        // 获取当前版本
        const sample = await prisma.sample.findUnique({
          where: { id: testSampleId },
          select: { version: true }
        });

        // 第一次尝试使用错误的版本号，触发重试
        if (attemptCount === 1) {
          throw new ConcurrencyConflictError(
            'Test conflict',
            sample!.version,
            sample!.version - 1
          );
        }

        // 第二次尝试成功
        return await lockManager.updateSampleWithLock({
          id: testSampleId,
          version: sample!.version,
          data: { quantity: 200 }
        });
      }, 3, 10);

      expect(attemptCount).toBe(2);
      expect(result.quantity).toBe(200);
    });

    it('应该在达到最大重试次数后抛出错误', async () => {
      let attemptCount = 0;

      await expect(
        RetryStrategy.executeWithRetry(async () => {
          attemptCount++;
          throw new ConcurrencyConflictError('Persistent conflict', 2, 1);
        }, 3, 10)
      ).rejects.toThrow(ConcurrencyConflictError);

      expect(attemptCount).toBe(3);
    });

    it('应该对非并发冲突错误立即抛出', async () => {
      let attemptCount = 0;

      await expect(
        RetryStrategy.executeWithRetry(async () => {
          attemptCount++;
          throw new Error('Other error');
        }, 3, 10)
      ).rejects.toThrow('Other error');

      expect(attemptCount).toBe(1); // 不应该重试
    });
  });

  describe('并发场景模拟', () => {
    it('应该正确处理两个用户同时更新同一样品', async () => {
      const sample = await prisma.sample.findUnique({
        where: { id: testSampleId }
      });

      // 用户1和用户2同时获取样品（版本号都是1）
      const version = sample!.version;

      // 用户1先更新成功
      const user1Update = await lockManager.updateSampleWithLock({
        id: testSampleId,
        version,
        data: { quantity: 150 }
      });
      expect(user1Update.version).toBe(2);

      // 用户2使用相同的版本号更新，应该失败
      await expect(
        lockManager.updateSampleWithLock({
          id: testSampleId,
          version, // 仍然是旧版本号
          data: { quantity: 200 }
        })
      ).rejects.toThrow(ConcurrencyConflictError);

      // 用户2获取最新版本后重新更新
      const latestSample = await prisma.sample.findUnique({
        where: { id: testSampleId }
      });
      const user2Update = await lockManager.updateSampleWithLock({
        id: testSampleId,
        version: latestSample!.version,
        data: { quantity: 200 }
      });
      expect(user2Update.version).toBe(3);
      expect(user2Update.quantity).toBe(200);
    });
  });
});
