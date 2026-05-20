/**
 * 报告数据生成器
 */

import { ISeeder, SeedContext, SeedResult } from './types';
import { DataFactory } from './DataFactory';
import { Validator } from './Validator';

export class ReportSeeder implements ISeeder {
  name = 'ReportSeeder';
  dependencies = ['SampleSeeder', 'JudgmentSeeder'];

  private factory = new DataFactory();

  async seed(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let recordsCreated = 0;
    let templatesCreated = 0;
    let signaturesCreated = 0;
    const errors: string[] = [];

    try {
      const { prisma, cache } = context;

      console.log(`\n🔄 开始生成报告数据...`);

      // 获取已有用户
      const users = await prisma.user.findMany({ take: 10 });
      if (users.length === 0) {
        throw new Error('没有找到用户数据');
      }

      // 1. 生成报告模板
      const templates = await this.generateReportTemplates(prisma, users);
      templatesCreated = templates.length;

      // 2. 生成检测报告
      const { reports, signatures } = await this.generateReports(prisma, cache, users, templates);
      recordsCreated = reports;
      signaturesCreated = signatures;

      console.log(`✅ 报告数据生成完成: ${templatesCreated} 个模板, ${recordsCreated} 个报告, ${signaturesCreated} 个签名`);

      // 更新统计
      context.stats.totalRecords += templatesCreated + recordsCreated + signaturesCreated;
      context.stats.recordsByModule['reportTemplates'] = templatesCreated;
      context.stats.recordsByModule['reports'] = recordsCreated;
      context.stats.recordsByModule['signatures'] = signaturesCreated;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      console.error(`❌ 报告数据生成失败: ${errorMsg}`);
    }

    return {
      seederName: this.name,
      recordsCreated: recordsCreated + templatesCreated + signaturesCreated,
      duration: Date.now() - startTime,
      errors,
    };
  }

  /**
   * 生成报告模板
   */
  private async generateReportTemplates(prisma: any, users: any[]): Promise<any[]> {
    // 检查是否已有模板
    const existingTemplates = await prisma.reportTemplate.findMany();
    if (existingTemplates.length > 0) {
      console.log(`  已存在 ${existingTemplates.length} 个报告模板,跳过模板生成`);
      return existingTemplates;
    }

    const templateCategories = [
      { category: '水质检测报告', name: '地表水检测报告模板' },
      { category: '水质检测报告', name: '地下水检测报告模板' },
      { category: '土壤检测报告', name: '农用地土壤检测报告模板' },
      { category: '土壤检测报告', name: '建设用地土壤检测报告模板' },
      { category: '食品检测报告', name: '食品安全检测报告模板' },
      { category: '环境检测报告', name: '环境空气检测报告模板' },
    ];

    const templates = [];

    for (let i = 0; i < templateCategories.length; i++) {
      const { category, name } = templateCategories[i];
      
      // 状态分布: 前2个ACTIVE, 其他DRAFT或ARCHIVED
      let isActive = i < 2;

      const templateData = {
        name,
        description: `${category}的标准模板`,
        category,
        content: this.generateTemplateContent(category),
        variables: {
          sampleInfo: ['样品编号', '样品名称', '样品类型', '客户名称'],
          testInfo: ['检测方法', '检测标准', '检测日期'],
          results: ['检测参数', '检测结果', '单位', '标准限值'],
          conclusion: ['判定结果', '判定依据'],
        },
        version: 1,
        isActive,
        createdBy: this.factory.randomChoice(users).id,
      };

      templates.push(templateData);
    }

    // 批量创建模板
    await prisma.reportTemplate.createMany({ data: templates });

    // 查询创建的模板
    const createdTemplates = await prisma.reportTemplate.findMany();
    return createdTemplates;
  }

  /**
   * 生成模板内容
   */
  private generateTemplateContent(category: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${category}</title>
  <style>
    body { font-family: SimSun, serif; }
    .header { text-align: center; font-size: 24px; font-weight: bold; }
    .section { margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
  </style>
</head>
<body>
  <div class="header">${category}</div>
  <div class="section">
    <h3>一、样品信息</h3>
    <p>样品编号: {{sampleNumber}}</p>
    <p>样品名称: {{sampleName}}</p>
    <p>客户名称: {{clientName}}</p>
  </div>
  <div class="section">
    <h3>二、检测结果</h3>
    <table>
      <tr><th>检测参数</th><th>检测结果</th><th>单位</th><th>标准限值</th></tr>
      {{#results}}
      <tr><td>{{parameter}}</td><td>{{value}}</td><td>{{unit}}</td><td>{{limit}}</td></tr>
      {{/results}}
    </table>
  </div>
  <div class="section">
    <h3>三、判定结论</h3>
    <p>{{conclusion}}</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * 生成检测报告
   */
  private async generateReports(prisma: any, cache: Map<string, any>, users: any[], templates: any[]): Promise<{ reports: number; signatures: number }> {
    // 从缓存获取样品
    const samples = cache.get('samples');
    if (!samples || samples.length === 0) {
      throw new Error('没有找到样品数据');
    }

    // 只为状态 >= AUDIT_COMPLETE 的样品生成报告
    const samplesNeedingReport = samples.filter((s: any) => 
      ['AUDIT_COMPLETE', 'RELEASED'].includes(s.status)
    );

    if (samplesNeedingReport.length === 0) {
      console.log(`  没有需要生成报告的样品`);
      return { reports: 0, signatures: 0 };
    }

    // 报告状态分布
    const statuses = [
      { status: 'DRAFT', weight: 0.1 },
      { status: 'PENDING_SIGNATURE', weight: 0.15 },
      { status: 'SIGNED', weight: 0.5 },
      { status: 'DISTRIBUTED', weight: 0.2 },
      { status: 'RECALLED', weight: 0.05 },
    ];

    let reportsCreated = 0;
    let signaturesCreated = 0;

    for (const sample of samplesNeedingReport) {
      // 随机选择模板
      const template = this.factory.randomChoice(templates.filter((t: any) => t.isActive));
      if (!template) continue;

      // 随机选择状态
      const statusInfo = this.factory.weightedChoice(
        statuses,
        statuses.map(s => s.weight)
      );

      const generatedAt = new Date(sample.updatedAt);
      generatedAt.setHours(generatedAt.getHours() + Math.floor(Math.random() * 24));

      const reportData = {
        reportNumber: `REPORT-${new Date().getFullYear()}-${String(reportsCreated + 1).padStart(6, '0')}`,
        sampleId: sample.id,
        templateId: template.id,
        content: `<html><body><h1>检测报告</h1><p>样品: ${sample.sampleNumber}</p></body></html>`,
        status: statusInfo.status,
        generatedBy: this.factory.randomChoice(users).id,
        generatedAt,
        approvedAt: statusInfo.status === 'SIGNED' || statusInfo.status === 'DISTRIBUTED' 
          ? new Date(generatedAt.getTime() + 3600000) 
          : null,
        recalledAt: statusInfo.status === 'RECALLED' 
          ? new Date(generatedAt.getTime() + 86400000) 
          : null,
        recallReason: statusInfo.status === 'RECALLED' ? '发现数据错误,需要重新检测' : null,
      };

      // 验证数据
      if (!Validator.validateReportData(reportData)) {
        continue;
      }

      // 创建报告
      const report = await prisma.report.create({ data: reportData });
      reportsCreated++;

      // 为已签名的报告生成签名
      if (statusInfo.status === 'SIGNED' || statusInfo.status === 'DISTRIBUTED') {
        const signatureCount = Math.floor(Math.random() * 3) + 1;
        const roles = ['检测员', '审核员', '批准人'];

        for (let i = 0; i < signatureCount && i < roles.length; i++) {
          const signer = this.factory.randomChoice(users);
          const signedAt = new Date(generatedAt.getTime() + (i + 1) * 1800000);

          await prisma.signature.create({
            data: {
              reportId: report.id,
              signerId: signer.id,
              signerName: signer.fullName,
              signerRole: roles[i],
              signatureData: `SIGNATURE_${Buffer.from(signer.fullName).toString('base64')}`,
              signedAt,
            },
          });

          signaturesCreated++;
        }
      }
    }

    return { reports: reportsCreated, signatures: signaturesCreated };
  }

  async clear(context: SeedContext): Promise<void> {
    console.log(`🗑️  清除报告数据...`);
    await context.prisma.signature.deleteMany({});
    await context.prisma.report.deleteMany({});
    await context.prisma.reportTemplate.deleteMany({});
    console.log(`✅ 报告数据已清除`);
  }
}
