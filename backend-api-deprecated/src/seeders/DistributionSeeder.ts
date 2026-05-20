/**
 * 分发数据生成器
 */

import { ISeeder, SeedContext, SeedResult } from './types';
import { DataFactory } from './DataFactory';
import { Validator } from './Validator';

export class DistributionSeeder implements ISeeder {
  name = 'DistributionSeeder';
  dependencies = ['ReportSeeder'];

  private factory = new DataFactory();

  async seed(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let recordsCreated = 0;
    const errors: string[] = [];

    try {
      const { prisma } = context;

      console.log(`\n🔄 开始生成分发记录数据...`);

      // 获取状态 >= SIGNED 的报告
      const reports = await prisma.report.findMany({
        where: {
          status: {
            in: ['SIGNED', 'DISTRIBUTED'],
          },
        },
        include: {
          sample: true,
        },
      });

      if (reports.length === 0) {
        console.log(`  没有需要分发的报告`);
        return {
          seederName: this.name,
          recordsCreated: 0,
          duration: Date.now() - startTime,
          errors: [],
        };
      }

      const distributions = [];

      // 分发方式分布
      const methods = [
        { method: 'EMAIL', weight: 0.6 },
        { method: 'DOWNLOAD', weight: 0.3 },
        { method: 'PRINT', weight: 0.1 },
      ];

      // 分发状态分布
      const statuses = [
        { status: 'PENDING', weight: 0.1 },
        { status: 'SENT', weight: 0.7 },
        { status: 'RECEIVED', weight: 0.15 },
        { status: 'FAILED', weight: 0.05 },
      ];

      for (const report of reports) {
        // 每个报告生成 1-3 条分发记录
        const distributionCount = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < distributionCount; i++) {
          // 随机选择分发方式
          const methodInfo = this.factory.weightedChoice(
            methods,
            methods.map(m => m.weight)
          );

          // 随机选择状态
          const statusInfo = this.factory.weightedChoice(
            statuses,
            statuses.map(s => s.weight)
          );

          const recipient = report.sample.clientName;
          const recipientEmail = methodInfo.method === 'EMAIL' 
            ? this.factory.generateEmail(recipient) 
            : null;

          const sentAt = statusInfo.status !== 'PENDING' 
            ? new Date(report.generatedAt.getTime() + (i + 1) * 3600000) 
            : null;

          const receivedAt = statusInfo.status === 'RECEIVED' && sentAt
            ? new Date(sentAt.getTime() + 86400000) 
            : null;

          const distributionData = {
            reportId: report.id,
            method: methodInfo.method,
            recipient,
            recipientEmail,
            status: statusInfo.status,
            sentAt,
            receivedAt,
          };

          // 验证数据
          if (!Validator.validateDistributionData(distributionData)) {
            errors.push(`报告 ${report.reportNumber} 的分发记录 ${i + 1} 验证失败`);
            continue;
          }

          distributions.push(distributionData);
        }
      }

      // 批量创建分发记录
      if (distributions.length > 0) {
        const createdDistributions = await prisma.distribution.createMany({
          data: distributions,
        });

        recordsCreated = createdDistributions.count;
      }

      console.log(`✅ 分发记录数据生成完成: ${recordsCreated} 条记录`);

      // 更新统计
      context.stats.totalRecords += recordsCreated;
      context.stats.recordsByModule['distributions'] = recordsCreated;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      console.error(`❌ 分发记录数据生成失败: ${errorMsg}`);
    }

    return {
      seederName: this.name,
      recordsCreated,
      duration: Date.now() - startTime,
      errors,
    };
  }

  async clear(context: SeedContext): Promise<void> {
    console.log(`🗑️  清除分发记录数据...`);
    await context.prisma.distribution.deleteMany({});
    console.log(`✅ 分发记录数据已清除`);
  }
}
