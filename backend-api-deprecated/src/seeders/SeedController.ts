/**
 * 数据填充主控制器
 */

import { PrismaClient } from '@prisma/client';
import { ISeeder, SeedContext, SeedConfig, SeedStats, SeedResult } from './types';
import { ConfigManager } from './ConfigManager';
import { SampleSeeder } from './SampleSeeder';
import { TransferSeeder } from './TransferSeeder';
import { AuditSeeder } from './AuditSeeder';
import { ResultSeeder } from './ResultSeeder';
import { WorkflowSeeder } from './WorkflowSeeder';
import { JudgmentSeeder } from './JudgmentSeeder';
import { ReportSeeder } from './ReportSeeder';
import { DistributionSeeder } from './DistributionSeeder';

export class SeedController {
  private prisma: PrismaClient;
  private seeders: ISeeder[];

  constructor() {
    this.prisma = new PrismaClient();
    this.seeders = [
      new SampleSeeder(),
      new TransferSeeder(),
      new AuditSeeder(),
      new ResultSeeder(),
      new WorkflowSeeder(),
      new JudgmentSeeder(),
      new ReportSeeder(),
      new DistributionSeeder(),
    ];
  }

  /**
   * 执行数据填充
   */
  async seed(config: SeedConfig): Promise<void> {
    console.log('\n🌱 开始数据填充...\n');

    // 环境安全检查
    this.checkEnvironment();

    // 显示配置信息
    this.displayConfig(config);

    // 初始化上下文
    const context: SeedContext = {
      prisma: this.prisma,
      config,
      cache: new Map(),
      stats: {
        totalRecords: 0,
        recordsByModule: {},
        startTime: new Date(),
      },
    };

    try {
      // 连接数据库
      await this.connectDatabase();

      // 清除已有数据(如果需要)
      if (config.clearExisting) {
        await this.clearData(context);
      }

      // 执行数据生成
      await this.executeSeeders(context);

      // 显示统计摘要
      this.displaySummary(context.stats);

      console.log('\n🎉 数据填充完成!\n');

    } catch (error) {
      console.error('\n❌ 数据填充失败:', error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  /**
   * 环境安全检查
   */
  private checkEnvironment(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('❌ 禁止在生产环境运行数据填充脚本!');
    }

    console.log(`✅ 环境检查通过 (${process.env.NODE_ENV || 'development'})`);
  }

  /**
   * 连接数据库
   */
  private async connectDatabase(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('✅ 数据库连接成功\n');
    } catch (error) {
      throw new Error(`数据库连接失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 显示配置信息
   */
  private displayConfig(config: SeedConfig): void {
    console.log('📊 配置信息:');
    console.log(`  - 样品数量: ${config.sampleCount}`);
    console.log(`  - 流转记录/样品: ${config.transferPerSample}`);
    console.log(`  - 审核任务数量: ${config.auditTaskCount}`);
    console.log(`  - 工作流实例比例: ${(config.workflowInstanceRatio * 100).toFixed(0)}%`);
    console.log(`  - 检测结果/项目: ${config.resultPerTestItem}`);
    console.log(`  - 时间范围: ${config.dateRangeStart.toISOString().split('T')[0]} 至 ${config.dateRangeEnd.toISOString().split('T')[0]}`);
    console.log(`  - 清除已有数据: ${config.clearExisting ? '是' : '否'}`);
    console.log(`  - 模块: ${config.modules.join(', ')}\n`);
  }

  /**
   * 清除已有数据
   */
  private async clearData(context: SeedContext): Promise<void> {
    console.log('🗑️  清除已有测试数据...\n');

    try {
      // 按依赖关系逆序清除
      const reversedSeeders = [...this.seeders].reverse();
      
      for (const seeder of reversedSeeders) {
        await seeder.clear(context);
      }

      console.log('\n✅ 已有数据清除完成\n');
    } catch (error) {
      throw new Error(`清除数据失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 执行数据生成器
   */
  private async executeSeeders(context: SeedContext): Promise<void> {
    console.log('🔄 执行数据生成器...\n');

    const results: SeedResult[] = [];

    // 按依赖顺序执行
    const orderedSeeders = this.orderSeedersByDependencies();

    for (const seeder of orderedSeeders) {
      // 检查是否需要执行此生成器
      if (!this.shouldRunSeeder(seeder, context.config)) {
        if (context.config.verbose) {
          console.log(`⏭️  跳过 ${seeder.name}`);
        }
        continue;
      }

      try {
        const result = await seeder.seed(context);
        results.push(result);

        if (result.errors.length > 0) {
          console.warn(`⚠️  ${seeder.name} 有 ${result.errors.length} 个错误`);
          if (context.config.verbose) {
            result.errors.forEach(err => console.warn(`   - ${err}`));
          }
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ ${seeder.name} 执行失败: ${errorMsg}`);
        results.push({
          seederName: seeder.name,
          recordsCreated: 0,
          duration: 0,
          errors: [errorMsg],
        });
      }
    }

    // 记录结束时间
    context.stats.endTime = new Date();
    context.stats.duration = context.stats.endTime.getTime() - context.stats.startTime.getTime();
  }

  /**
   * 按依赖关系排序生成器
   */
  private orderSeedersByDependencies(): ISeeder[] {
    const ordered: ISeeder[] = [];
    const visited = new Set<string>();

    const visit = (seeder: ISeeder) => {
      if (visited.has(seeder.name)) {
        return;
      }

      // 先访问依赖
      for (const depName of seeder.dependencies) {
        const dep = this.seeders.find(s => s.name === depName);
        if (dep) {
          visit(dep);
        }
      }

      visited.add(seeder.name);
      ordered.push(seeder);
    };

    for (const seeder of this.seeders) {
      visit(seeder);
    }

    return ordered;
  }

  /**
   * 判断是否应该运行生成器
   */
  private shouldRunSeeder(seeder: ISeeder, config: SeedConfig): boolean {
    if (config.modules.includes('all')) {
      return true;
    }

    // 检查生成器名称是否在模块列表中
    const seederModule = seeder.name.replace('Seeder', '').toLowerCase();
    
    // 支持多种匹配方式
    return config.modules.some(m => {
      const module = m.toLowerCase();
      return module === seederModule || 
             seederModule.includes(module) ||
             module.includes(seederModule);
    });
  }

  /**
   * 显示统计摘要
   */
  private displaySummary(stats: SeedStats): void {
    console.log('\n📈 统计摘要:');
    console.log(`  - 总记录数: ${stats.totalRecords}`);
    console.log(`  - 总耗时: ${((stats.duration || 0) / 1000).toFixed(1)}s`);
    
    if (stats.totalRecords > 0 && stats.duration) {
      const speed = (stats.totalRecords / (stats.duration / 1000)).toFixed(0);
      console.log(`  - 平均速度: ${speed} 记录/秒`);
    }

    console.log('\n模块详情:');
    for (const [module, count] of Object.entries(stats.recordsByModule)) {
      console.log(`  - ${module}: ${count}`);
    }
  }
}
