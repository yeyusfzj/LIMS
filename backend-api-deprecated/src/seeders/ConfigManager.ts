/**
 * 配置管理器 - 管理数据填充的配置参数
 */

import { SeedConfig } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class ConfigManager {
  /**
   * 获取默认配置
   */
  static getDefaultConfig(): SeedConfig {
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    return {
      // 数据量配置
      sampleCount: 50,
      transferPerSample: 3,
      auditTaskCount: 60,
      workflowInstanceRatio: 0.6,
      resultPerTestItem: 4,

      // 时间范围配置
      dateRangeStart: threeMonthsAgo,
      dateRangeEnd: now,

      // 分布配置
      sampleTypeDistribution: {
        WATER: 0.4,
        SOIL: 0.3,
        FOOD: 0.2,
        OTHER: 0.1,
      },
      statusDistribution: {
        REGISTERED: 0.1,
        IN_TESTING: 0.2,
        TESTING_COMPLETE: 0.25,
        IN_AUDIT: 0.2,
        AUDIT_COMPLETE: 0.15,
        RELEASED: 0.1,
      },
      priorityDistribution: {
        LOW: 0.2,
        NORMAL: 0.5,
        HIGH: 0.2,
        URGENT: 0.1,
      },

      // 选项
      clearExisting: false,
      modules: ['all'],
      verbose: true,
    };
  }

  /**
   * 从文件加载配置
   */
  static loadConfig(configPath: string): SeedConfig {
    try {
      const absolutePath = path.resolve(configPath);
      
      if (!fs.existsSync(absolutePath)) {
        console.warn(`配置文件不存在: ${configPath}, 使用默认配置`);
        return this.getDefaultConfig();
      }

      const fileContent = fs.readFileSync(absolutePath, 'utf-8');
      const userConfig = JSON.parse(fileContent);

      // 合并用户配置和默认配置
      const config = { ...this.getDefaultConfig(), ...userConfig };

      // 转换日期字符串为 Date 对象
      if (typeof config.dateRangeStart === 'string') {
        config.dateRangeStart = new Date(config.dateRangeStart);
      }
      if (typeof config.dateRangeEnd === 'string') {
        config.dateRangeEnd = new Date(config.dateRangeEnd);
      }

      // 验证配置
      this.validateConfig(config);

      return config;
    } catch (error) {
      console.error(`加载配置文件失败: ${error instanceof Error ? error.message : String(error)}`);
      console.log('使用默认配置');
      return this.getDefaultConfig();
    }
  }

  /**
   * 验证配置
   */
  static validateConfig(config: SeedConfig): void {
    // 验证数据量配置
    if (config.sampleCount <= 0) {
      throw new Error('样品数量必须大于 0');
    }
    if (config.transferPerSample < 0) {
      throw new Error('每个样品的流转记录数不能为负数');
    }
    if (config.auditTaskCount < 0) {
      throw new Error('审核任务数量不能为负数');
    }
    if (config.workflowInstanceRatio < 0 || config.workflowInstanceRatio > 1) {
      throw new Error('工作流实例比例必须在 0-1 之间');
    }
    if (config.resultPerTestItem <= 0) {
      throw new Error('每个检测项目的结果数必须大于 0');
    }

    // 验证时间范围
    if (config.dateRangeStart >= config.dateRangeEnd) {
      throw new Error('开始日期必须早于结束日期');
    }

    // 验证分布配置
    this.validateDistribution(config.sampleTypeDistribution, '样品类型分布');
    this.validateDistribution(config.statusDistribution, '状态分布');
    this.validateDistribution(config.priorityDistribution, '优先级分布');

    // 验证模块列表
    if (!Array.isArray(config.modules) || config.modules.length === 0) {
      throw new Error('模块列表不能为空');
    }
  }

  /**
   * 验证分布配置
   */
  private static validateDistribution(distribution: Record<string, number>, name: string): void {
    const values = Object.values(distribution);
    
    // 检查所有值都是非负数
    if (values.some(v => v < 0)) {
      throw new Error(`${name}中不能有负数`);
    }

    // 检查总和接近 1
    const sum = values.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.01) {
      throw new Error(`${name}的总和必须等于 1 (当前: ${sum})`);
    }
  }

  /**
   * 保存配置到文件
   */
  static saveConfig(config: SeedConfig, configPath: string): void {
    try {
      const absolutePath = path.resolve(configPath);
      const dir = path.dirname(absolutePath);

      // 确保目录存在
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 转换 Date 对象为字符串
      const configToSave = {
        ...config,
        dateRangeStart: config.dateRangeStart.toISOString().split('T')[0],
        dateRangeEnd: config.dateRangeEnd.toISOString().split('T')[0],
      };

      fs.writeFileSync(absolutePath, JSON.stringify(configToSave, null, 2), 'utf-8');
      console.log(`配置已保存到: ${configPath}`);
    } catch (error) {
      console.error(`保存配置文件失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 合并命令行参数到配置
   */
  static mergeCliOptions(config: SeedConfig, options: any): SeedConfig {
    const merged = { ...config };

    if (options.sampleCount !== undefined) {
      merged.sampleCount = parseInt(options.sampleCount, 10);
    }
    if (options.clear !== undefined) {
      merged.clearExisting = Boolean(options.clear);
    }
    if (options.modules !== undefined) {
      merged.modules = options.modules.split(',').map((m: string) => m.trim());
    }
    if (options.verbose !== undefined) {
      merged.verbose = Boolean(options.verbose);
    }

    return merged;
  }
}
