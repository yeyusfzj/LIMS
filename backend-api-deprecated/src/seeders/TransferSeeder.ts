/**
 * 流转数据生成器
 */

import { ISeeder, SeedContext, SeedResult } from './types';
import { DataFactory } from './DataFactory';
import { Validator } from './Validator';

export class TransferSeeder implements ISeeder {
  name = 'TransferSeeder';
  dependencies = ['SampleSeeder'];

  private factory = new DataFactory();

  async seed(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let recordsCreated = 0;
    const errors: string[] = [];

    try {
      const { prisma, config, cache } = context;
      const { transferPerSample } = config;

      console.log(`\n🔄 开始生成流转记录数据...`);

      // 从缓存获取样品
      const samples = cache.get('samples');
      if (!samples || samples.length === 0) {
        throw new Error('没有找到样品数据,请先运行 SampleSeeder');
      }

      // 获取已有用户
      const users = await prisma.user.findMany({ take: 20 });
      if (users.length === 0) {
        throw new Error('没有找到用户数据');
      }

      const transfers = [];

      // 流转状态分布
      const statuses = [
        { status: 'PENDING', weight: 0.15 },
        { status: 'IN_TRANSIT', weight: 0.20 },
        { status: 'RECEIVED', weight: 0.60 },
        { status: 'REJECTED', weight: 0.05 },
      ];

      for (const sample of samples) {
        // 每个样品生成 2-4 条流转记录
        const transferCount = Math.floor(Math.random() * 3) + 2;

        let lastTransferDate = new Date(sample.receivedDate);

        for (let i = 0; i < transferCount; i++) {
          // 随机选择状态
          const statusInfo = this.factory.weightedChoice(
            statuses,
            statuses.map(s => s.weight)
          );

          // 流转日期递增
          const transferDate = new Date(lastTransferDate);
          transferDate.setHours(transferDate.getHours() + Math.floor(Math.random() * 24) + 1);

          // 接收日期在流转日期后 1-3 天
          let receivedDate = null;
          if (statusInfo.status === 'RECEIVED') {
            receivedDate = new Date(transferDate);
            receivedDate.setDate(receivedDate.getDate() + Math.floor(Math.random() * 3) + 1);
          }

          const fromLocation = this.factory.generateLabLocation();
          let toLocation = this.factory.generateLabLocation();
          
          // 确保发出地点和接收地点不同
          while (toLocation === fromLocation) {
            toLocation = this.factory.generateLabLocation();
          }

          const transferData = {
            sampleId: sample.id,
            fromLocation,
            toLocation,
            fromPerson: this.factory.randomChoice(users).fullName,
            toPerson: this.factory.randomChoice(users).fullName,
            transferDate,
            receivedDate,
            status: statusInfo.status,
            remarks: Math.random() > 0.8 ? '加急流转' : null,
            senderConfirmed: statusInfo.status !== 'PENDING',
            receiverConfirmed: statusInfo.status === 'RECEIVED',
            createdAt: transferDate,
          };

          // 验证数据
          if (!Validator.validateTransferData(transferData)) {
            errors.push(`样品 ${sample.sampleNumber} 的流转记录 ${i + 1} 验证失败`);
            continue;
          }

          transfers.push(transferData);
          lastTransferDate = transferDate;
        }
      }

      // 批量创建流转记录
      const createdTransfers = await prisma.transfer.createMany({
        data: transfers,
      });

      recordsCreated = createdTransfers.count;

      console.log(`✅ 流转记录数据生成完成: ${recordsCreated} 条记录`);

      // 更新统计
      context.stats.totalRecords += recordsCreated;
      context.stats.recordsByModule['transfers'] = recordsCreated;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      console.error(`❌ 流转记录数据生成失败: ${errorMsg}`);
    }

    return {
      seederName: this.name,
      recordsCreated,
      duration: Date.now() - startTime,
      errors,
    };
  }

  async clear(context: SeedContext): Promise<void> {
    console.log(`🗑️  清除流转记录数据...`);
    await context.prisma.transfer.deleteMany({});
    console.log(`✅ 流转记录数据已清除`);
  }
}
