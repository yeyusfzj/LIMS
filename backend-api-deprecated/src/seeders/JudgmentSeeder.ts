/**
 * 质量判定生成器
 */

import { ISeeder, SeedContext, SeedResult } from './types';
import { DataFactory } from './DataFactory';
import { Validator } from './Validator';

export class JudgmentSeeder implements ISeeder {
  name = 'JudgmentSeeder';
  dependencies = ['SampleSeeder', 'ResultSeeder'];

  private factory = new DataFactory();

  async seed(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let recordsCreated = 0;
    const errors: string[] = [];

    try {
      const { prisma, cache } = context;

      console.log(`\n🔄 开始生成质量判定数据...`);

      // 从缓存获取样品
      const samples = cache.get('samples');
      if (!samples || samples.length === 0) {
        throw new Error('没有找到样品数据,请先运行 SampleSeeder');
      }

      // 从缓存获取检测结果
      const results = cache.get('results');

      // 获取已有用户
      const users = await prisma.user.findMany({ take: 10 });
      if (users.length === 0) {
        throw new Error('没有找到用户数据');
      }

      const judgments = [];

      // 判定结果分布
      const judgmentResults = [
        { result: 'QUALIFIED', weight: 0.75 },
        { result: 'UNQUALIFIED', weight: 0.20 },
        { result: 'PENDING', weight: 0.05 },
      ];

      // 只为状态 >= TESTING_COMPLETE 的样品生成判定记录
      const samplesNeedingJudgment = samples.filter((s: any) => 
        ['TESTING_COMPLETE', 'IN_AUDIT', 'AUDIT_COMPLETE', 'RELEASED'].includes(s.status)
      );

      for (const sample of samplesNeedingJudgment) {
        // 随机选择判定结果
        const resultInfo = this.factory.weightedChoice(
          judgmentResults,
          judgmentResults.map(r => r.weight)
        );

        // 80% 概率自动判定
        const isAutomatic = Math.random() < 0.8;

        // 获取该样品的检测结果
        const sampleResults = results 
          ? results.filter((r: any) => r.sampleId === sample.id)
          : [];

        // 生成判定依据
        const basis = this.factory.generateJudgmentBasis(
          sampleResults.map((r: any) => ({
            parameter: r.parameter,
            value: r.value,
            unit: r.unit,
            isAbnormal: r.isAbnormal,
          }))
        );

        const judgedAt = new Date(sample.updatedAt);
        judgedAt.setHours(judgedAt.getHours() + Math.floor(Math.random() * 24));

        const judgmentData = {
          sampleId: sample.id,
          result: resultInfo.result,
          basis,
          isAutomatic,
          judgedBy: isAutomatic ? 'SYSTEM' : this.factory.randomChoice(users).id,
          judgedAt,
          reviewedBy: Math.random() > 0.5 ? this.factory.randomChoice(users).id : null,
          reviewedAt: Math.random() > 0.5 ? new Date(judgedAt.getTime() + 3600000) : null,
        };

        // 验证数据
        if (!Validator.validateJudgmentData(judgmentData)) {
          errors.push(`样品 ${sample.sampleNumber} 的质量判定验证失败`);
          continue;
        }

        judgments.push(judgmentData);
      }

      // 批量创建质量判定
      if (judgments.length > 0) {
        const createdJudgments = await prisma.qualityJudgment.createMany({
          data: judgments,
        });

        recordsCreated = createdJudgments.count;
      }

      console.log(`✅ 质量判定数据生成完成: ${recordsCreated} 条记录`);

      // 更新统计
      context.stats.totalRecords += recordsCreated;
      context.stats.recordsByModule['qualityJudgments'] = recordsCreated;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      console.error(`❌ 质量判定数据生成失败: ${errorMsg}`);
    }

    return {
      seederName: this.name,
      recordsCreated,
      duration: Date.now() - startTime,
      errors,
    };
  }

  async clear(context: SeedContext): Promise<void> {
    console.log(`🗑️  清除质量判定数据...`);
    await context.prisma.qualityJudgment.deleteMany({});
    console.log(`✅ 质量判定数据已清除`);
  }
}
