/**
 * 完整测试审核服务层的所有新增方法
 */

const { auditService } = require('./dist/services/auditService');

async function testCompleteAuditService() {
  console.log('开始完整测试审核服务层...\n');

  try {
    // ============================================
    // 测试审核意见模板管理
    // ============================================
    console.log('=== 测试审核意见模板管理 ===\n');

    // 1. 创建模板
    console.log('1. 创建审核意见模板');
    const template1 = await auditService.createTemplate({
      name: '标准通过模板',
      type: 'APPROVED',
      content: '检测结果符合标准要求，准予通过。',
      isDefault: true
    });
    console.log('✓ 创建模板成功:', template1.name);

    const template2 = await auditService.createTemplate({
      name: '需要修订模板',
      type: 'NEED_REVISION',
      content: '检测数据需要进一步核实，请修订后重新提交。',
      isDefault: false
    });
    console.log('✓ 创建模板成功:', template2.name);

    // 2. 获取模板列表
    console.log('\n2. 获取模板列表');
    const allTemplates = await auditService.listTemplates();
    console.log('✓ 查询到', allTemplates.length, '个模板');

    const approvedTemplates = await auditService.listTemplates({ type: 'APPROVED' });
    console.log('✓ 查询到', approvedTemplates.length, '个通过类型模板');

    const defaultTemplates = await auditService.listTemplates({ isDefault: true });
    console.log('✓ 查询到', defaultTemplates.length, '个默认模板');

    // 3. 获取单个模板
    console.log('\n3. 获取单个模板详情');
    const templateDetail = await auditService.getTemplateById(template1.id);
    console.log('✓ 获取模板详情成功:', templateDetail.name);

    // 4. 更新模板
    console.log('\n4. 更新模板');
    const updatedTemplate = await auditService.updateTemplate(template1.id, {
      content: '检测结果完全符合标准要求，准予通过。（已更新）'
    });
    console.log('✓ 更新模板成功');

    // 5. 增加模板使用次数
    console.log('\n5. 增加模板使用次数');
    await auditService.incrementTemplateUsage(template1.id);
    const templateAfterUse = await auditService.getTemplateById(template1.id);
    console.log('✓ 使用次数已增加到:', templateAfterUse.usageCount);

    // ============================================
    // 测试审核流程配置管理
    // ============================================
    console.log('\n=== 测试审核流程配置管理 ===\n');

    // 6. 创建流程配置
    console.log('6. 创建审核流程配置');
    const config1 = await auditService.createWorkflowConfig({
      name: '标准三级审核流程',
      sampleTypes: ['水质', '土壤', '空气'],
      levels: [
        { order: 1, name: '初审', role: 'auditor', required: true, autoAssign: true },
        { order: 2, name: '复审', role: 'senior_auditor', required: true, autoAssign: false },
        { order: 3, name: '终审', role: 'manager', required: true, autoAssign: false }
      ],
      parallelAudit: false
    });
    console.log('✓ 创建流程配置成功:', config1.name);

    const config2 = await auditService.createWorkflowConfig({
      name: '快速二级审核流程',
      sampleTypes: ['水质'],
      levels: [
        { order: 1, name: '初审', role: 'auditor', required: true, autoAssign: true },
        { order: 2, name: '终审', role: 'manager', required: true, autoAssign: false }
      ],
      parallelAudit: true
    });
    console.log('✓ 创建流程配置成功:', config2.name);

    // 7. 获取流程配置列表
    console.log('\n7. 获取流程配置列表');
    const allConfigs = await auditService.listWorkflowConfigs();
    console.log('✓ 查询到', allConfigs.length, '个流程配置');

    const waterConfigs = await auditService.listWorkflowConfigs({ sampleType: '水质' });
    console.log('✓ 查询到', waterConfigs.length, '个水质样品流程配置');

    // 8. 获取单个流程配置
    console.log('\n8. 获取单个流程配置详情');
    const configDetail = await auditService.getWorkflowConfigById(config1.id);
    console.log('✓ 获取流程配置详情成功:', configDetail.name);
    console.log('  - 审核级别数:', configDetail.levels.length);

    // 9. 更新流程配置
    console.log('\n9. 更新流程配置');
    const updatedConfig = await auditService.updateWorkflowConfig(config1.id, {
      sampleTypes: ['水质', '土壤', '空气', '固废']
    });
    console.log('✓ 更新流程配置成功，样品类型数:', updatedConfig.sampleTypes.length);

    // 10. 激活流程配置
    console.log('\n10. 激活流程配置');
    const activatedConfig = await auditService.activateWorkflowConfig(config1.id);
    console.log('✓ 激活流程配置成功，状态:', activatedConfig.status);

    // 11. 停用流程配置
    console.log('\n11. 停用流程配置');
    const deactivatedConfig = await auditService.deactivateWorkflowConfig(config1.id);
    console.log('✓ 停用流程配置成功，状态:', deactivatedConfig.status);

    // ============================================
    // 测试审核历史记录
    // ============================================
    console.log('\n=== 测试审核历史记录 ===\n');

    // 12. 记录审核操作
    console.log('12. 记录审核操作');
    // 查找一个现有的审核任务
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const existingTask = await prisma.auditTask.findFirst();
    
    if (existingTask) {
      const history1 = await auditService.recordAuditAction({
        taskId: existingTask.id,
        action: 'created',
        changes: { status: 'PENDING', level: 1 },
        performedBy: 'system'
      });
      console.log('✓ 记录审核操作成功:', history1.action);

      const history2 = await auditService.recordAuditAction({
        taskId: existingTask.id,
        action: 'updated',
        changes: { status: 'IN_PROGRESS' },
        performedBy: 'test-user'
      });
      console.log('✓ 记录审核操作成功:', history2.action);

      // 13. 获取审核历史
      console.log('\n13. 获取审核历史记录');
      const historyRecords = await auditService.getAuditHistory(existingTask.id);
      console.log('✓ 查询到', historyRecords.length, '条历史记录');

      // 清理测试的历史记录
      await prisma.auditHistory.deleteMany({
        where: {
          taskId: existingTask.id,
          action: { in: ['created', 'updated'] },
          performedBy: { in: ['system', 'test-user'] }
        }
      });
    } else {
      console.log('⚠ 跳过历史记录测试（没有现有的审核任务）');
    }

    await prisma.$disconnect();

    // ============================================
    // 清理测试数据
    // ============================================
    console.log('\n=== 清理测试数据 ===\n');
    
    // 删除模板（先删除使用次数为 0 的）
    await auditService.deleteTemplate(template2.id);
    console.log('✓ 删除模板成功:', template2.name);

    // template1 有使用次数，测试删除限制
    try {
      await auditService.deleteTemplate(template1.id);
      console.log('❌ 应该无法删除已使用的模板');
    } catch (error) {
      console.log('✓ 正确阻止删除已使用的模板:', error.message);
    }

    // 手动清理 template1
    const prisma2 = new PrismaClient();
    await prisma2.auditCommentTemplate.delete({ where: { id: template1.id } });
    await prisma2.$disconnect();

    // 删除流程配置
    await auditService.deleteWorkflowConfig(config1.id);
    console.log('✓ 删除流程配置成功:', config1.name);

    await auditService.deleteWorkflowConfig(config2.id);
    console.log('✓ 删除流程配置成功:', config2.name);

    console.log('\n✅ 所有测试通过！服务层方法工作正常。');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testCompleteAuditService();
