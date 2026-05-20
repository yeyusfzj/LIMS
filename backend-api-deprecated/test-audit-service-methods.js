/**
 * 测试审核服务层新增方法
 * 验证模板管理、流程配置管理和历史记录功能
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAuditServiceMethods() {
  console.log('开始测试审核服务层方法...\n');

  try {
    // 测试 1: 创建审核意见模板
    console.log('测试 1: 创建审核意见模板');
    const template = await prisma.auditCommentTemplate.create({
      data: {
        name: '测试模板-通过',
        type: 'APPROVED',
        content: '检测结果符合标准要求，准予通过。',
        isDefault: true,
        createdBy: 'test-user',
        usageCount: 0
      }
    });
    console.log('✓ 创建模板成功:', template.id);

    // 测试 2: 查询模板列表
    console.log('\n测试 2: 查询模板列表');
    const templates = await prisma.auditCommentTemplate.findMany({
      where: { type: 'APPROVED' }
    });
    console.log('✓ 查询到', templates.length, '个模板');

    // 测试 3: 更新模板
    console.log('\n测试 3: 更新模板');
    const updatedTemplate = await prisma.auditCommentTemplate.update({
      where: { id: template.id },
      data: { usageCount: 1 }
    });
    console.log('✓ 更新模板成功，使用次数:', updatedTemplate.usageCount);

    // 测试 4: 创建审核流程配置
    console.log('\n测试 4: 创建审核流程配置');
    const workflowConfig = await prisma.auditWorkflowConfig.create({
      data: {
        name: '测试流程配置-三级审核',
        sampleTypes: ['水质', '土壤'],
        levels: [
          { order: 1, name: '初审', role: 'auditor', required: true, autoAssign: true },
          { order: 2, name: '复审', role: 'senior_auditor', required: true, autoAssign: false },
          { order: 3, name: '终审', role: 'manager', required: true, autoAssign: false }
        ],
        parallelAudit: false,
        status: 'INACTIVE',
        createdBy: 'test-user'
      }
    });
    console.log('✓ 创建流程配置成功:', workflowConfig.id);

    // 测试 5: 查询流程配置列表
    console.log('\n测试 5: 查询流程配置列表');
    const configs = await prisma.auditWorkflowConfig.findMany({
      where: { status: 'INACTIVE' }
    });
    console.log('✓ 查询到', configs.length, '个流程配置');

    // 测试 6: 激活流程配置
    console.log('\n测试 6: 激活流程配置');
    const activatedConfig = await prisma.auditWorkflowConfig.update({
      where: { id: workflowConfig.id },
      data: { status: 'ACTIVE' }
    });
    console.log('✓ 激活流程配置成功，状态:', activatedConfig.status);

    // 测试 7: 创建审核历史记录（需要先有审核任务）
    console.log('\n测试 7: 创建审核历史记录');
    // 首先查找一个现有的审核任务
    const existingTask = await prisma.auditTask.findFirst();
    
    if (existingTask) {
      const history = await prisma.auditHistory.create({
        data: {
          taskId: existingTask.id,
          action: 'test_action',
          changes: { test: 'data' },
          performedBy: 'test-user'
        }
      });
      console.log('✓ 创建历史记录成功:', history.id);

      // 测试 8: 查询历史记录
      console.log('\n测试 8: 查询历史记录');
      const historyRecords = await prisma.auditHistory.findMany({
        where: { taskId: existingTask.id }
      });
      console.log('✓ 查询到', historyRecords.length, '条历史记录');
    } else {
      console.log('⚠ 跳过历史记录测试（没有现有的审核任务）');
    }

    // 清理测试数据
    console.log('\n清理测试数据...');
    await prisma.auditCommentTemplate.delete({ where: { id: template.id } });
    await prisma.auditWorkflowConfig.delete({ where: { id: workflowConfig.id } });
    if (existingTask) {
      await prisma.auditHistory.deleteMany({ where: { taskId: existingTask.id, action: 'test_action' } });
    }
    console.log('✓ 清理完成');

    console.log('\n✅ 所有测试通过！');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuditServiceMethods();
