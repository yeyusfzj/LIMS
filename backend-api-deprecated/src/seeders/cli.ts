#!/usr/bin/env node
/**
 * 数据填充命令行接口
 */

import { Command } from 'commander';
import { SeedController } from './SeedController';
import { ConfigManager } from './ConfigManager';

const program = new Command();

program
  .name('seed')
  .description('实验室管理系统测试数据填充工具')
  .version('1.0.0');

program
  .option('-c, --config <path>', '配置文件路径', 'seed.config.json')
  .option('--clear', '清除已有测试数据后重新填充')
  .option('-m, --modules <modules>', '要填充的模块列表(逗号分隔)', 'all')
  .option('-s, --sample-count <count>', '样品数量', '50')
  .option('-v, --verbose', '显示详细信息', false)
  .action(async (options) => {
    try {
      // 加载配置
      let config = ConfigManager.loadConfig(options.config);

      // 合并命令行参数
      config = ConfigManager.mergeCliOptions(config, options);

      // 创建控制器并执行
      const controller = new SeedController();
      await controller.seed(config);

      process.exit(0);
    } catch (error) {
      console.error('\n❌ 执行失败:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('创建默认配置文件')
  .option('-o, --output <path>', '输出路径', 'seed.config.json')
  .action((options) => {
    try {
      const config = ConfigManager.getDefaultConfig();
      ConfigManager.saveConfig(config, options.output);
      console.log(`✅ 配置文件已创建: ${options.output}`);
    } catch (error) {
      console.error('❌ 创建配置文件失败:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse(process.argv);
