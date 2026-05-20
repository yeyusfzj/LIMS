/**
 * 数据填充核心类型定义
 */

import { PrismaClient } from '@prisma/client';

/**
 * 数据填充上下文
 */
export interface SeedContext {
  /** Prisma 客户端实例 */
  prisma: PrismaClient;
  /** 配置信息 */
  config: SeedConfig;
  /** 缓存已生成的数据 */
  cache: Map<string, any>;
  /** 统计信息 */
  stats: SeedStats;
}

/**
 * 数据填充配置
 */
export interface SeedConfig {
  // 数据量配置
  /** 样品数量 */
  sampleCount: number;
  /** 每个样品的流转记录数 */
  transferPerSample: number;
  /** 审核任务数量 */
  auditTaskCount: number;
  /** 工作流实例比例 */
  workflowInstanceRatio: number;
  /** 每个检测项目的结果数 */
  resultPerTestItem: number;

  // 时间范围配置
  /** 开始日期 */
  dateRangeStart: Date;
  /** 结束日期 */
  dateRangeEnd: Date;

  // 分布配置
  /** 样品类型分布 */
  sampleTypeDistribution: Record<string, number>;
  /** 状态分布 */
  statusDistribution: Record<string, number>;
  /** 优先级分布 */
  priorityDistribution: Record<string, number>;

  // 选项
  /** 是否清除已有数据 */
  clearExisting: boolean;
  /** 要填充的模块列表 */
  modules: string[];
  /** 是否显示详细信息 */
  verbose: boolean;
}

/**
 * 数据填充结果
 */
export interface SeedResult {
  /** 生成器名称 */
  seederName: string;
  /** 创建的记录数 */
  recordsCreated: number;
  /** 耗时(毫秒) */
  duration: number;
  /** 错误信息 */
  errors: string[];
}

/**
 * 数据填充统计
 */
export interface SeedStats {
  /** 总记录数 */
  totalRecords: number;
  /** 各模块记录数 */
  recordsByModule: Record<string, number>;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 总耗时(毫秒) */
  duration?: number;
}

/**
 * 数据生成器接口
 */
export interface ISeeder {
  /** 生成器名称 */
  name: string;
  /** 依赖的其他生成器 */
  dependencies: string[];
  /** 执行数据填充 */
  seed(context: SeedContext): Promise<SeedResult>;
  /** 清除数据 */
  clear(context: SeedContext): Promise<void>;
}

/**
 * 时间间隔类型
 */
export enum TimeInterval {
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
}

/**
 * 审核决策类型
 */
export enum AuditDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
}

/**
 * 样品类型
 */
export enum SampleType {
  WATER = 'WATER',
  SOIL = 'SOIL',
  FOOD = 'FOOD',
  AIR = 'AIR',
  OTHER = 'OTHER',
}

/**
 * 样品状态
 */
export enum SampleStatus {
  REGISTERED = 'REGISTERED',
  IN_TESTING = 'IN_TESTING',
  TESTING_COMPLETE = 'TESTING_COMPLETE',
  IN_AUDIT = 'IN_AUDIT',
  AUDIT_COMPLETE = 'AUDIT_COMPLETE',
  RELEASED = 'RELEASED',
}

/**
 * 优先级
 */
export enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}
