/**
 * 样品数据生成器
 */

import { ISeeder, SeedContext, SeedResult, SampleStatus, Priority } from './types';
import { DataFactory } from './DataFactory';
import { Validator } from './Validator';

export class SampleSeeder implements ISeeder {
  name = 'SampleSeeder';
  dependencies: string[] = [];

  private factory = new DataFactory();

  async seed(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let recordsCreated = 0;
    const errors: string[] = [];

    try {
      const { prisma, config, cache } = context;
      const { sampleCount, dateRangeStart, dateRangeEnd } = config;

      console.log(`\n🔄 开始生成样品数据...`);

      // 获取已有用户作为创建者
      const users = await prisma.user.findMany({ take: 10 });
      if (users.length === 0) {
        throw new Error('没有找到用户,请先创建用户数据');
      }

      const samples = [];

      // 样品类型和类别
      const sampleTypes = [
        { type: 'WATER', category: '地表水', weight: 0.4 },
        { type: 'WATER', category: '地下水', weight: 0.1 },
        { type: 'SOIL', category: '农用地土壤', weight: 0.2 },
        { type: 'SOIL', category: '建设用地土壤', weight: 0.1 },
        { type: 'FOOD', category: '食品', weight: 0.15 },
        { type: 'AIR', category: '环境空气', weight: 0.05 },
      ];

      // 状态分布
      const statuses = [
        { status: SampleStatus.REGISTERED, weight: 0.1 },
        { status: SampleStatus.IN_TESTING, weight: 0.2 },
        { status: SampleStatus.TESTING_COMPLETE, weight: 0.25 },
        { status: SampleStatus.IN_AUDIT, weight: 0.2 },
        { status: SampleStatus.AUDIT_COMPLETE, weight: 0.15 },
        { status: SampleStatus.RELEASED, weight: 0.1 },
      ];

      // 优先级分布
      const priorities = [
        { priority: Priority.LOW, weight: 0.2 },
        { priority: Priority.NORMAL, weight: 0.5 },
        { priority: Priority.HIGH, weight: 0.2 },
        { priority: Priority.URGENT, weight: 0.1 },
      ];

      for (let i = 0; i < sampleCount; i++) {
        // 随机选择样品类型
        const sampleTypeInfo = this.factory.weightedChoice(
          sampleTypes,
          sampleTypes.map(t => t.weight)
        );

        // 随机选择状态
        const statusInfo = this.factory.weightedChoice(
          statuses,
          statuses.map(s => s.weight)
        );

        // 随机选择优先级
        const priorityInfo = this.factory.weightedChoice(
          priorities,
          priorities.map(p => p.weight)
        );

        // 生成接收日期
        const receivedDate = this.factory.randomDate(dateRangeStart, dateRangeEnd);
        
        // 采样日期在接收日期前 1-7 天
        const samplingDate = new Date(receivedDate);
        samplingDate.setDate(samplingDate.getDate() - Math.floor(Math.random() * 7) - 1);

        const sampleData = {
          barcode: this.factory.generateBarcode('SAMPLE', i + 1),
          sampleNumber: this.factory.generateSampleNumber(receivedDate),
          clientName: this.factory.generateCompanyName(),
          clientContact: this.factory.generatePhoneNumber(),
          sampleName: `${sampleTypeInfo.category}样品${i + 1}`,
          sampleType: sampleTypeInfo.type,
          sampleCategory: sampleTypeInfo.category,
          quantity: Number((Math.random() * 10 + 1).toFixed(2)),
          unit: sampleTypeInfo.type === 'WATER' ? 'L' : sampleTypeInfo.type === 'SOIL' ? 'kg' : 'kg',
          receivedDate,
          samplingDate,
          samplingLocation: `${this.factory.generateCompanyName()}采样点`,
          samplingPerson: this.factory.generateChineseName(),
          storageLocation: this.factory.generateLabLocation(),
          storageCondition: sampleTypeInfo.type === 'FOOD' ? '冷藏(4℃)' : '常温',
          status: statusInfo.status,
          priority: priorityInfo.priority,
          description: `${sampleTypeInfo.category}检测样品`,
          remarks: Math.random() > 0.7 ? '加急处理' : null,
          mergedFromIds: [],
          createdBy: this.factory.randomChoice(users).id,
          createdAt: receivedDate,
          updatedAt: receivedDate,
        };

        // 验证数据
        if (!Validator.validateSampleData(sampleData)) {
          errors.push(`样品 ${i + 1} 数据验证失败`);
          continue;
        }

        samples.push(sampleData);
      }

      // 批量创建样品
      const createdSamples = await prisma.sample.createMany({
        data: samples,
      });

      recordsCreated = createdSamples.count;

      // 查询创建的样品并缓存
      const allSamples = await prisma.sample.findMany({
        orderBy: { createdAt: 'asc' },
      });
      cache.set('samples', allSamples);

      console.log(`✅ 样品数据生成完成: ${recordsCreated} 条记录`);

      // 更新统计
      context.stats.totalRecords += recordsCreated;
      context.stats.recordsByModule['samples'] = recordsCreated;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      console.error(`❌ 样品数据生成失败: ${errorMsg}`);
    }

    return {
      seederName: this.name,
      recordsCreated,
      duration: Date.now() - startTime,
      errors,
    };
  }

  async clear(context: SeedContext): Promise<void> {
    console.log(`🗑️  清除样品数据...`);
    await context.prisma.sample.deleteMany({});
    console.log(`✅ 样品数据已清除`);
  }
}
