/**
 * 数据工厂 - 提供通用的数据生成方法
 */

import { faker } from '@faker-js/faker/locale/zh_CN';
import { TimeInterval, AuditDecision } from './types';

export class DataFactory {
  /**
   * 生成中文姓名
   */
  generateChineseName(): string {
    const surnames = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '林', '罗', '高'];
    const givenNames = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞'];
    
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
    
    return `${surname}${givenName}`;
  }

  /**
   * 生成公司名称
   */
  generateCompanyName(): string {
    const prefixes = ['华', '中', '国', '天', '大', '新', '金', '盛', '泰', '恒'];
    const middles = ['科', '信', '达', '通', '联', '创', '源', '力', '美', '瑞'];
    const suffixes = ['有限公司', '股份有限公司', '集团有限公司', '科技有限公司'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const middle = middles[Math.floor(Math.random() * middles.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix}${middle}${suffix}`;
  }

  /**
   * 生成样品编号
   */
  generateSampleNumber(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const sequence = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    
    return `S${year}-${month}${day}-${sequence}`;
  }

  /**
   * 生成条码
   */
  generateBarcode(prefix: string, sequence: number): string {
    const year = new Date().getFullYear();
    const seqStr = String(sequence).padStart(4, '0');
    
    return `${prefix}-${year}-${seqStr}`;
  }

  /**
   * 生成电话号码
   */
  generatePhoneNumber(): string {
    const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139', '150', '151', '152', '153', '155', '156', '157', '158', '159', '180', '181', '182', '183', '184', '185', '186', '187', '188', '189'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
    
    return `${prefix}${suffix}`;
  }

  /**
   * 生成邮箱地址
   */
  generateEmail(name: string): string {
    const domains = ['qq.com', '163.com', '126.com', 'gmail.com', 'sina.com', 'sohu.com'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const username = name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);
    
    return `${username}@${domain}`;
  }

  /**
   * 生成实验室位置
   */
  generateLabLocation(): string {
    const buildings = ['A栋', 'B栋', 'C栋', 'D栋', '主楼', '实验楼'];
    const floors = ['1楼', '2楼', '3楼', '4楼', '5楼'];
    const rooms = ['101', '102', '103', '201', '202', '203', '301', '302', '303'];
    
    const building = buildings[Math.floor(Math.random() * buildings.length)];
    const floor = floors[Math.floor(Math.random() * floors.length)];
    const room = rooms[Math.floor(Math.random() * rooms.length)];
    
    return `${building}${floor}${room}室`;
  }

  /**
   * 生成检测参数值
   */
  generateParameterValue(parameter: string, sampleType: string): number {
    // 根据参数类型生成合理范围的数值
    const ranges: Record<string, [number, number]> = {
      'pH': [6.0, 9.0],
      '浊度': [0, 10],
      '溶解氧': [5, 15],
      '化学需氧量': [0, 50],
      '氨氮': [0, 2],
      '总磷': [0, 0.5],
      '总氮': [0, 2],
      '重金属': [0, 0.1],
      '农药残留': [0, 0.05],
      '微生物': [0, 100],
    };
    
    // 查找匹配的参数范围
    for (const [key, range] of Object.entries(ranges)) {
      if (parameter.includes(key)) {
        const [min, max] = range;
        return Number((Math.random() * (max - min) + min).toFixed(3));
      }
    }
    
    // 默认范围
    return Number((Math.random() * 100).toFixed(2));
  }

  /**
   * 生成时间序列
   */
  generateTimeSequence(startDate: Date, count: number, interval: TimeInterval): Date[] {
    const dates: Date[] = [];
    let currentDate = new Date(startDate);
    
    for (let i = 0; i < count; i++) {
      dates.push(new Date(currentDate));
      
      switch (interval) {
        case TimeInterval.HOURS:
          currentDate.setHours(currentDate.getHours() + Math.floor(Math.random() * 24) + 1);
          break;
        case TimeInterval.DAYS:
          currentDate.setDate(currentDate.getDate() + Math.floor(Math.random() * 7) + 1);
          break;
        case TimeInterval.WEEKS:
          currentDate.setDate(currentDate.getDate() + Math.floor(Math.random() * 14) + 7);
          break;
      }
    }
    
    return dates;
  }

  /**
   * 生成审核意见
   */
  generateAuditComment(decision: AuditDecision): string {
    const approvedComments = [
      '检测数据准确,符合标准要求,同意通过。',
      '样品处理规范,结果可靠,审核通过。',
      '检测方法正确,数据真实有效,批准通过。',
      '各项指标符合要求,质量合格,同意发布。',
    ];
    
    const rejectedComments = [
      '检测数据异常,需要重新检测。',
      '样品处理不规范,建议重新采样。',
      '部分指标超标,需要进一步确认。',
      '检测方法存在问题,需要重新评估。',
    ];
    
    const pendingComments = [
      '等待进一步确认。',
      '需要补充相关资料。',
      '待技术负责人审批。',
    ];
    
    switch (decision) {
      case AuditDecision.APPROVED:
        return approvedComments[Math.floor(Math.random() * approvedComments.length)];
      case AuditDecision.REJECTED:
        return rejectedComments[Math.floor(Math.random() * rejectedComments.length)];
      case AuditDecision.PENDING:
        return pendingComments[Math.floor(Math.random() * pendingComments.length)];
      default:
        return '审核中';
    }
  }

  /**
   * 生成判定依据
   */
  generateJudgmentBasis(results: any[]): string {
    const basis = {
      standard: 'GB 5749-2006 生活饮用水卫生标准',
      items: results.map(r => ({
        parameter: r.parameter,
        value: r.value,
        unit: r.unit,
        limit: r.limit || '符合标准',
        result: r.isAbnormal ? '超标' : '合格',
      })),
    };
    
    return JSON.stringify(basis, null, 2);
  }

  /**
   * 生成随机日期(在指定范围内)
   */
  randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  /**
   * 从数组中随机选择一个元素
   */
  randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * 根据权重分布随机选择
   */
  weightedChoice<T>(choices: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < choices.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return choices[i];
      }
    }
    
    return choices[choices.length - 1];
  }
}
