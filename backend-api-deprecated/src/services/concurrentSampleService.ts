/**
 * 并发控制增强的样品服务
 * 在原有样品服务基础上添加乐观锁和事务管理
 */

import { PrismaClient, Sample, SampleStatus } from '@prisma/client';
import { UpdateSampleDto, TransferSampleDto, SplitSampleDto, MergeSamplesDto } from '../types/sample';
import {
  OptimisticLockManager,
  TransactionManager,
  ConcurrencyConflictError
} from '../utils/concurrencyControl';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export class ConcurrentSampleService {
  private lockManager: OptimisticLockManager;
  private transactionManager: TransactionManager;

  constructor() {
    this.lockManager = new OptimisticLockManager(prisma);
    this.transactionManager = new TransactionManager(prisma);
  }

  /**
   * 使用乐观锁更新样品
   * 防止并发修改导致的数据覆盖
   */
  async updateSampleWithLock(
    id: string,
    version: number,
    data: UpdateSampleDto,
    userId: string
  ): Promise<Sample> {
    try {
      logger.info('Updating sample with optimistic lock', { id, version, userId });

      const sample = await this.lockManager.updateSampleWithLock({
        id,
        version,
        data: {
          clientName: data.clientName,
          clientContact: data.clientContact,
          sampleName: data.sampleName,
          sampleType: data.sampleType,
          sampleCategory: data.sampleCategory,
          quantity: data.quantity,
          unit: data.unit,
          samplingDate: data.samplingDate,
          samplingLocation: data.samplingLocation,
          samplingPerson: data.samplingPerson,
          storageLocation: data.storageLocation,
          storageCondition: data.storageCondition,
          priority: data.priority,
          description: data.description,
          remarks: data.remarks,
          status: data.status,
          updatedAt: new Date()
        }
      });

      logger.info('Sample updated successfully with lock', { id: sample.id, newVersion: sample.version });

      return sample;
    } catch (error) {
      if (error instanceof ConcurrencyConflictError) {
        logger.warn('Concurrency conflict detected during sample update', {
          id,
          requestedVersion: version,
          currentVersion: error.currentVersion
        });
      } else {
        logger.error('Failed to update sample with lock', { error, id });
      }
      throw error;
    }
  }

  /**
   * 在事务中执行样品流转
   * 确保流转记录创建和样品位置更新的原子性
   */
  async transferSampleInTransaction(
    sampleId: string,
    transferData: TransferSampleDto,
    userId: string
  ): Promise<{ transfer: any; sample: Sample }> {
    try {
      logger.info('Executing sample transfer in transaction', { sampleId, userId });

      const result = await this.transactionManager.executeSampleTransfer(
        sampleId,
        {
          sampleId,
          fromLocation: transferData.fromLocation,
          toLocation: transferData.toLocation,
          fromPerson: transferData.fromPerson,
          toPerson: transferData.toPerson,
          transferDate: new Date(),
          status: 'PENDING',
          remarks: transferData.remarks,
          senderConfirmed: false,
          receiverConfirmed: false
        },
        {
          storageLocation: transferData.toLocation,
          updatedAt: new Date()
        }
      );

      logger.info('Sample transfer completed successfully', {
        sampleId,
        transferId: result.transfer.id
      });

      return result;
    } catch (error) {
      logger.error('Failed to execute sample transfer', { error, sampleId });
      throw error;
    }
  }

  /**
   * 在事务中执行分样操作
   * 确保子样品创建和母样品更新的原子性
   */
  async splitSampleInTransaction(
    parentId: string,
    splitData: SplitSampleDto,
    userId: string
  ): Promise<{ parentSample: Sample; childSamples: Sample[] }> {
    try {
      logger.info('Executing sample split in transaction', { parentId, userId });

      // 获取母样品信息
      const parentSample = await prisma.sample.findUnique({
        where: { id: parentId }
      });

      if (!parentSample) {
        throw new Error('Parent sample not found');
      }

      // 准备子样品数据
      const childSamplesData = splitData.childSamples.map((child, index) => ({
        barcode: `${parentSample.barcode}-${index + 1}`,
        sampleNumber: `${parentSample.sampleNumber}-${index + 1}`,
        clientName: parentSample.clientName,
        clientContact: parentSample.clientContact,
        sampleName: child.sampleName || parentSample.sampleName,
        sampleType: parentSample.sampleType,
        sampleCategory: parentSample.sampleCategory,
        quantity: child.quantity,
        unit: parentSample.unit,
        receivedDate: parentSample.receivedDate,
        samplingDate: parentSample.samplingDate,
        samplingLocation: parentSample.samplingLocation,
        samplingPerson: parentSample.samplingPerson,
        storageLocation: child.storageLocation || parentSample.storageLocation,
        storageCondition: parentSample.storageCondition,
        status: 'REGISTERED' as SampleStatus,
        priority: parentSample.priority,
        description: child.description,
        remarks: child.remarks,
        parentSampleId: parentId,
        createdBy: userId
      }));

      // 执行事务
      const result = await this.transactionManager.executeSampleSplit(
        parentId,
        childSamplesData,
        {
          updatedAt: new Date()
        }
      );

      logger.info('Sample split completed successfully', {
        parentId,
        childCount: result.childSamples.length
      });

      return result;
    } catch (error) {
      logger.error('Failed to execute sample split', { error, parentId });
      throw error;
    }
  }

  /**
   * 在事务中执行合样操作
   * 确保合并样品创建和来源样品更新的原子性
   */
  async mergeSamplesInTransaction(
    mergeData: MergeSamplesDto,
    userId: string
  ): Promise<{ mergedSample: Sample; sourceSamples: Sample[] }> {
    try {
      logger.info('Executing sample merge in transaction', {
        sourceSampleIds: mergeData.sourceSampleIds,
        userId
      });

      // 获取来源样品信息
      const sourceSamples = await prisma.sample.findMany({
        where: {
          id: { in: mergeData.sourceSampleIds }
        }
      });

      if (sourceSamples.length !== mergeData.sourceSampleIds.length) {
        throw new Error('Some source samples not found');
      }

      // 计算合并后的数量
      const totalQuantity = sourceSamples.reduce((sum, s) => sum + s.quantity, 0);

      // 准备合并样品数据
      const mergedSampleData = {
        barcode: mergeData.barcode,
        sampleNumber: mergeData.sampleNumber,
        clientName: sourceSamples[0].clientName,
        clientContact: sourceSamples[0].clientContact,
        sampleName: mergeData.sampleName || sourceSamples[0].sampleName,
        sampleType: sourceSamples[0].sampleType,
        sampleCategory: sourceSamples[0].sampleCategory,
        quantity: totalQuantity,
        unit: sourceSamples[0].unit,
        receivedDate: new Date(),
        samplingDate: sourceSamples[0].samplingDate,
        samplingLocation: sourceSamples[0].samplingLocation,
        samplingPerson: sourceSamples[0].samplingPerson,
        storageLocation: mergeData.storageLocation || sourceSamples[0].storageLocation,
        storageCondition: sourceSamples[0].storageCondition,
        status: 'REGISTERED' as SampleStatus,
        priority: sourceSamples[0].priority,
        description: mergeData.description,
        remarks: mergeData.remarks,
        mergedFromIds: mergeData.sourceSampleIds,
        createdBy: userId
      };

      // 执行事务
      const result = await this.transactionManager.executeSampleMerge(
        mergedSampleData,
        mergeData.sourceSampleIds,
        {
          status: 'ARCHIVED' as SampleStatus,
          updatedAt: new Date()
        }
      );

      logger.info('Sample merge completed successfully', {
        mergedSampleId: result.mergedSample.id,
        sourceCount: result.sourceSamples.length
      });

      return result;
    } catch (error) {
      logger.error('Failed to execute sample merge', { error });
      throw error;
    }
  }

  /**
   * 批量更新样品状态（在事务中）
   * 确保所有样品状态更新的原子性
   */
  async batchUpdateSampleStatus(
    sampleIds: string[],
    status: SampleStatus,
    userId: string
  ): Promise<Sample[]> {
    try {
      logger.info('Batch updating sample status in transaction', {
        sampleIds,
        status,
        userId
      });

      const samples = await this.transactionManager.executeTransaction(async (tx) => {
        return await Promise.all(
          sampleIds.map(id =>
            tx.sample.update({
              where: { id },
              data: {
                status,
                updatedAt: new Date(),
                version: { increment: 1 }
              }
            })
          )
        );
      });

      logger.info('Batch sample status update completed', {
        count: samples.length,
        status
      });

      return samples;
    } catch (error) {
      logger.error('Failed to batch update sample status', { error, sampleIds });
      throw error;
    }
  }

  /**
   * 检查样品版本
   * 用于验证客户端持有的版本是否最新
   */
  async checkSampleVersion(id: string, version: number): Promise<boolean> {
    try {
      const sample = await prisma.sample.findUnique({
        where: { id },
        select: { version: true }
      });

      if (!sample) {
        throw new Error('Sample not found');
      }

      return sample.version === version;
    } catch (error) {
      logger.error('Failed to check sample version', { error, id });
      throw error;
    }
  }
}

export default new ConcurrentSampleService();
