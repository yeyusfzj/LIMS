/**
 * 数据验证器 - 验证生成的数据是否符合约束和业务规则
 */

import { PrismaClient } from '@prisma/client';

export class Validator {
  /**
   * 验证外键关联
   */
  static async validateForeignKey(
    prisma: PrismaClient,
    modelName: string,
    fieldName: string,
    value: any
  ): Promise<boolean> {
    try {
      // 这里简化处理,实际应该根据 modelName 和 fieldName 动态查询
      return value !== null && value !== undefined;
    } catch (error) {
      return false;
    }
  }

  /**
   * 验证必填字段
   */
  static validateRequiredFields(data: any, requiredFields: string[]): boolean {
    for (const field of requiredFields) {
      if (data[field] === null || data[field] === undefined || data[field] === '') {
        console.warn(`必填字段 ${field} 缺失或为空`);
        return false;
      }
    }
    return true;
  }

  /**
   * 验证数值范围
   */
  static validateNumberRange(value: number, min: number, max: number): boolean {
    if (typeof value !== 'number' || isNaN(value)) {
      return false;
    }
    return value >= min && value <= max;
  }

  /**
   * 验证时间序列
   */
  static validateTimeSequence(dates: Date[]): boolean {
    for (let i = 1; i < dates.length; i++) {
      if (dates[i] < dates[i - 1]) {
        console.warn(`时间序列错误: ${dates[i]} 早于 ${dates[i - 1]}`);
        return false;
      }
    }
    return true;
  }

  /**
   * 验证时间范围
   */
  static validateDateRange(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }

  /**
   * 验证状态转换
   */
  static validateStatusTransition(fromStatus: string, toStatus: string, validTransitions: Record<string, string[]>): boolean {
    const allowedTransitions = validTransitions[fromStatus];
    if (!allowedTransitions) {
      return false;
    }
    return allowedTransitions.includes(toStatus);
  }

  /**
   * 验证样品数据
   */
  static validateSampleData(data: any): boolean {
    const requiredFields = ['barcode', 'sampleNumber', 'clientName', 'receivedDate', 'status'];
    
    if (!this.validateRequiredFields(data, requiredFields)) {
      return false;
    }

    // 验证日期
    if (data.samplingDate && data.receivedDate) {
      if (new Date(data.samplingDate) > new Date(data.receivedDate)) {
        console.warn('采样日期不能晚于接收日期');
        return false;
      }
    }

    return true;
  }

  /**
   * 验证流转数据
   */
  static validateTransferData(data: any): boolean {
    const requiredFields = ['sampleId', 'fromLocation', 'toLocation', 'transferDate', 'status'];
    
    if (!this.validateRequiredFields(data, requiredFields)) {
      return false;
    }

    // 验证发出地点和接收地点不能相同
    if (data.fromLocation === data.toLocation) {
      console.warn('发出地点和接收地点不能相同');
      return false;
    }

    // 验证接收日期晚于流转日期
    if (data.receivedDate && data.transferDate) {
      if (new Date(data.receivedDate) < new Date(data.transferDate)) {
        console.warn('接收日期不能早于流转日期');
        return false;
      }
    }

    return true;
  }

  /**
   * 验证审核数据
   */
  static validateAuditData(data: any): boolean {
    const requiredFields = ['sampleId', 'level', 'status', 'submittedAt'];
    
    if (!this.validateRequiredFields(data, requiredFields)) {
      return false;
    }

    // 验证审核级别
    if (data.level < 1 || data.level > 3) {
      console.warn('审核级别必须在 1-3 之间');
      return false;
    }

    // 验证完成时间晚于提交时间
    if (data.completedAt && data.submittedAt) {
      if (new Date(data.completedAt) < new Date(data.submittedAt)) {
        console.warn('完成时间不能早于提交时间');
        return false;
      }
    }

    return true;
  }

  /**
   * 验证检测结果数据
   */
  static validateResultData(data: any): boolean {
    const requiredFields = ['sampleId', 'parameter', 'value', 'unit', 'source'];
    
    if (!this.validateRequiredFields(data, requiredFields)) {
      return false;
    }

    // 验证数值
    if (typeof data.value !== 'number' || isNaN(data.value)) {
      console.warn('检测结果值必须是有效数字');
      return false;
    }

    return true;
  }

  /**
   * 验证工作流实例数据
   */
  static validateWorkflowInstanceData(data: any): boolean {
    const requiredFields = ['workflowId', 'sampleId', 'status'];
    
    if (!this.validateRequiredFields(data, requiredFields)) {
      return false;
    }

    return true;
  }

  /**
   * 验证质量判定数据
   */
  static validateJudgmentData(data: any): boolean {
    const requiredFields = ['sampleId', 'result', 'basis'];
    
    if (!this.validateRequiredFields(data, requiredFields)) {
      return false;
    }

    return true;
  }

  /**
   * 验证报告数据
   */
  static validateReportData(data: any): boolean {
    const requiredFields = ['sampleId', 'reportNumber', 'templateId', 'status'];
    
    if (!this.validateRequiredFields(data, requiredFields)) {
      return false;
    }

    return true;
  }

  /**
   * 验证分发数据
   */
  static validateDistributionData(data: any): boolean {
    const requiredFields = ['reportId', 'method', 'recipient', 'status'];
    
    if (!this.validateRequiredFields(data, requiredFields)) {
      return false;
    }

    // 验证邮件分发必须有邮箱
    if (data.method === 'EMAIL' && !data.recipientEmail) {
      console.warn('邮件分发必须提供接收人邮箱');
      return false;
    }

    return true;
  }
}
