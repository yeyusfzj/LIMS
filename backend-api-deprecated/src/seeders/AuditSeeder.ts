/**
 * 审核数据生成器
 */

import { ISeeder, SeedContext, SeedResult, AuditDecision } from './types';
import { DataFactory } from './DataFactory';
import { Validator } from './Validator';

export class AuditSeeder implements ISeeder {
  name = 'AuditSeeder';
  dependencies = ['SampleSeeder'];

  private factory = new DataFactory();

  async seed(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let recordsCreated = 0;
    const errors: string[] = [];

    try {
      const { prisma, cache } = context;

      console.log(`\n🔄 开始生成审核任务数据...`);

      // 从缓存获取样品
      const samples = cache.get('samples');
      if (!samples || samples.length === 0) {
        throw new Error('没有找到样品数据,请先运行 SampleSeeder');
      }

      // 获取已有用户作为审核人员
      const users = await prisma.user.findMany({ take: 10 });
      if (users.length === 0) {
        throw new Error('没有找到用户数据');
      }

      const auditTasks = [];

      // 审核状态分布
      const statuses = [
        { status: 'PENDING', decision: null, weight: 0.2 },
        { status: 'IN_PROGRESS', decision: null, weight: 0.1 },
        { status: 'APPROVED', decision: 'APPROVE', weight: 0.6 },
        { status: 'REJECTED', decision: 'REJECT', weight: 0.1 },
      ];

      // 只为状态 >= IN_AUDIT 的样品生成审核任务
      const samplesNeedingAudit = samples.filter((s: any) => 
        ['IN_AUDIT', 'AUDIT_COMPLETE', 'RELEASED'].includes(s.status)
      );

      for (const sample of samplesNeedingAudit) {
        // 根据样品状态确定审核级别数量
        let auditLevels = 1;
        if (sample.status === 'AUDIT_COMPLETE' || sample.status === 'RELEASED') {
          auditLevels = Math.floor(Math.random() * 2) + 2; // 2-3 级
        }

        for (let level = 1; level <= auditLevels; level++) {
          // 随机选择状态
          const statusInfo = this.factory.weightedChoice(
            statuses,
            statuses.map(s => s.weight)
          );

          // 提交时间基于样品更新时间
          const submittedAt = new Date(sample.updatedAt);
          submittedAt.setHours(submittedAt.getHours() + (level - 1) * 24);

          // 完成时间在提交后 2-48 小时
          let completedAt = null;
          if (statusInfo.status === 'APPROVED' || statusInfo.status === 'REJECTED') {
            completedAt = new Date(submittedAt);
            completedAt.setHours(completedAt.getHours() + Math.floor(Math.random() * 46) + 2);
          }

          // 生成审核意见
          let comments = null;
          if (statusInfo.decision) {
            const decision = statusInfo.decision === 'APPROVE' 
              ? AuditDecision.APPROVED 
              : AuditDecision.REJECTED;
            comments = this.factory.generateAuditComment(decision);
          }

          const auditData = {
            sampleId: sample.id,
            level,
            auditorId: this.factory.randomChoice(users).id,
            status: statusInfo.status,
            decision: statusInfo.decision,
            comments,
            submittedAt,
            completedAt,
          };

          // 验证数据
          if (!Validator.validateAuditData(auditData)) {
            errors.push(`样品 ${sample.sampleNumber} 的审核任务 level ${level} 验证失败`);
            continue;
          }

          auditTasks.push(auditData);
        }
      }

      // 批量创建审核任务
      if (auditTasks.length > 0) {
        const createdAudits = await prisma.auditTask.createMany({
          data: auditTasks,
        });

        recordsCreated = createdAudits.count;
      }

      console.log(`✅ 审核任务数据生成完成: ${recordsCreated} 条记录`);

      // 更新统计
      context.stats.totalRecords += recordsCreated;
      context.stats.recordsByModule['auditTasks'] = recordsCreated;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      console.error(`❌ 审核任务数据生成失败: ${errorMsg}`);
    }

    return {
      seederName: this.name,
      recordsCreated,
      duration: Date.now() - startTime,
      errors,
    };
  }

  async clear(context: SeedContext): Promise<void> {
    console.log(`🗑️  清除审核任务数据...`);
    await context.prisma.auditTask.deleteMany({});
    console.log(`✅ 审核任务数据已清除`);
  }
}
