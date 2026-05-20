/**
 * 检测结果生成器
 */

import { ISeeder, SeedContext, SeedResult } from './types';
import { DataFactory } from './DataFactory';
import { Validator } from './Validator';

export class ResultSeeder implements ISeeder {
  name = 'ResultSeeder';
  dependencies = ['SampleSeeder'];

  private factory = new DataFactory();

  async seed(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let recordsCreated = 0;
    const errors: string[] = [];

    try {
      const { prisma, config, cache } = context;
      const { resultPerTestItem } = config;

      console.log(`\n🔄 开始生成检测结果数据...`);

      // 从缓存获取样品
      const samples = cache.get('samples');
      if (!samples || samples.length === 0) {
        throw new Error('没有找到样品数据,请先运行 SampleSeeder');
      }

      // 获取已有用户
      const users = await prisma.user.findMany({ take: 10 });
      if (users.length === 0) {
        throw new Error('没有找到用户数据');
      }

      // 首先为样品创建检测项
      const testItems = [];
      for (const sample of samples) {
        // 每个样品创建 1-2 个检测项
        const testItemCount = Math.floor(Math.random() * 2) + 1;
        
        for (let i = 0; i < testItemCount; i++) {
          testItems.push({
            sampleId: sample.id,
            testMethod: `GB/T ${5000 + Math.floor(Math.random() * 1000)}-2020`,
            testStandard: `国标 GB ${5000 + Math.floor(Math.random() * 1000)}`,
            testParameters: {},
            status: 'COMPLETED',
            assignedTo: this.factory.randomChoice(users).id,
            assignedAt: new Date(sample.createdAt),
            completedAt: new Date(sample.updatedAt),
            createdAt: new Date(sample.createdAt),
            updatedAt: new Date(sample.updatedAt),
          });
        }
      }

      // 批量创建检测项
      await prisma.testItem.createMany({ data: testItems });

      // 查询创建的检测项
      const createdTestItems = await prisma.testItem.findMany({
        include: { sample: true },
      });

      const results = [];

      // 结果来源分布
      const sources = [
        { source: 'MANUAL', weight: 0.4 },
        { source: 'INSTRUMENT', weight: 0.5 },
        { source: 'CALCULATED', weight: 0.1 },
      ];

      // 检测参数列表(根据样品类型)
      const parametersByType: Record<string, string[]> = {
        WATER: ['pH', '浊度', '溶解氧', '化学需氧量', '氨氮', '总磷', '总氮'],
        SOIL: ['pH', '有机质', '全氮', '全磷', '全钾', '重金属铅', '重金属镉'],
        FOOD: ['水分', '蛋白质', '脂肪', '碳水化合物', '农药残留', '微生物总数'],
        AIR: ['PM2.5', 'PM10', 'SO2', 'NO2', 'CO', 'O3'],
      };

      for (const testItem of createdTestItems) {
        const sampleType = testItem.sample.sampleType;
        const parameters = parametersByType[sampleType] || parametersByType.WATER;

        // 为每个检测项生成 3-6 个参数结果
        const paramCount = Math.floor(Math.random() * 4) + 3;
        const selectedParams = this.factory.randomChoice(parameters.slice(0, paramCount));

        for (let i = 0; i < paramCount; i++) {
          const parameter = parameters[i % parameters.length];

          // 随机选择来源
          const sourceInfo = this.factory.weightedChoice(
            sources,
            sources.map(s => s.weight)
          );

          // 生成检测值
          const value = this.factory.generateParameterValue(parameter, sampleType);

          // 5% 概率异常
          const isAbnormal = Math.random() < 0.05;

          // 2% 概率复测
          const isRetest = Math.random() < 0.02;

          const resultData = {
            sampleId: testItem.sampleId,
            testItemId: testItem.id,
            parameter,
            value,
            textValue: null,
            unit: this.getUnit(parameter),
            method: testItem.testMethod,
            source: sourceInfo.source,
            instrumentId: sourceInfo.source === 'INSTRUMENT' ? `INST-${Math.floor(Math.random() * 100)}` : null,
            formulaId: sourceInfo.source === 'CALCULATED' ? `FORMULA-${Math.floor(Math.random() * 10)}` : null,
            isCalculated: sourceInfo.source === 'CALCULATED',
            isAbnormal,
            abnormalReason: isAbnormal ? '检测值超出正常范围' : null,
            isRetest,
            originalResultId: null,
            retestReason: isRetest ? '初次检测结果异常,需要复测' : null,
            enteredBy: this.factory.randomChoice(users).id,
            enteredAt: testItem.completedAt || testItem.createdAt,
            reviewedBy: Math.random() > 0.3 ? this.factory.randomChoice(users).id : null,
            reviewedAt: Math.random() > 0.3 ? testItem.completedAt : null,
          };

          // 验证数据
          if (!Validator.validateResultData(resultData)) {
            errors.push(`检测项 ${testItem.id} 的结果 ${parameter} 验证失败`);
            continue;
          }

          results.push(resultData);
        }
      }

      // 批量创建检测结果
      if (results.length > 0) {
        const createdResults = await prisma.result.createMany({
          data: results,
        });

        recordsCreated = createdResults.count;
      }

      // 缓存检测结果供后续使用
      const allResults = await prisma.result.findMany({
        include: { sample: true },
      });
      cache.set('results', allResults);

      console.log(`✅ 检测结果数据生成完成: ${recordsCreated} 条记录`);

      // 更新统计
      context.stats.totalRecords += recordsCreated;
      context.stats.recordsByModule['results'] = recordsCreated;
      context.stats.recordsByModule['testItems'] = createdTestItems.length;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      console.error(`❌ 检测结果数据生成失败: ${errorMsg}`);
    }

    return {
      seederName: this.name,
      recordsCreated,
      duration: Date.now() - startTime,
      errors,
    };
  }

  /**
   * 获取参数单位
   */
  private getUnit(parameter: string): string {
    const units: Record<string, string> = {
      'pH': '',
      '浊度': 'NTU',
      '溶解氧': 'mg/L',
      '化学需氧量': 'mg/L',
      '氨氮': 'mg/L',
      '总磷': 'mg/L',
      '总氮': 'mg/L',
      '有机质': 'g/kg',
      '全氮': 'g/kg',
      '全磷': 'g/kg',
      '全钾': 'g/kg',
      '重金属铅': 'mg/kg',
      '重金属镉': 'mg/kg',
      '水分': '%',
      '蛋白质': 'g/100g',
      '脂肪': 'g/100g',
      '碳水化合物': 'g/100g',
      '农药残留': 'mg/kg',
      '微生物总数': 'CFU/g',
      'PM2.5': 'μg/m³',
      'PM10': 'μg/m³',
      'SO2': 'μg/m³',
      'NO2': 'μg/m³',
      'CO': 'mg/m³',
      'O3': 'μg/m³',
    };

    return units[parameter] || 'mg/L';
  }

  async clear(context: SeedContext): Promise<void> {
    console.log(`🗑️  清除检测结果数据...`);
    await context.prisma.result.deleteMany({});
    await context.prisma.testItem.deleteMany({});
    console.log(`✅ 检测结果数据已清除`);
  }
}
