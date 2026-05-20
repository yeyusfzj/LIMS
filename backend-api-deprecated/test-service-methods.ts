/**
 * 测试审核服务层新增方法（TypeScript 版本）
 */

import { auditService } from './src/services/auditService'

async function testAuditServiceMethods() {
  console.log('开始测试审核服务层新增方法...\n')

  try {
    // ============================================
    // 测试审核意见模板管理
    // ============================================
    console.log('=== 测试审核意见模板管理 ===\n')

    // 1. 创建模板
    console.log('1. 创建审核意见模板')
    const template1 = await auditService.createTemplate({
      name: '测试模板-通过-' + Date.now(),
      type: 'APPROVED',
      content: '检测结果符合标准要求，准予通过。',
      isDefault: true
    })
    console.log('✓ 创建模板成功:', template1.name)

    // 2. 获取模板列表
    console.log('\n2. 获取模板列表')
    const templates = await auditService.listTemplates({ type: 'APPROVED' })
    console.log('✓ 查询到', templates.length, '个通过类型模板')

    // 3. 获取单个模板
    console.log('\n3. 获取单个模板详情')
    const templateDetail = await auditService.getTemplateById(template1.id)
    console.log('✓ 获取模板详情成功:', templateDetail.name)

    // 4. 更新模板
    console.log('\n4. 更新模板')
    await auditService.updateTemplate(template1.id, {
      content: '检测结果完全符合标准要求，准予通过。（已更新）'
    })
    console.log('✓ 更新模板成功')

    // 5. 增加模板使用次数
    console.log('\n5. 增加模板使用次数')
    await auditService.incrementTemplateUsage(template1.id)
    const templateAfterUse = await auditService.getTemplateById(template1.id)
    console.log('✓ 使用次数已增加到:', templateAfterUse.usageCount)

    // ============================================
    // 测试审核流程配置管理
    // ============================================
    console.log('\n=== 测试审核流程配置管理 ===\n')

    // 6. 创建流程配置
    console.log('6. 创建审核流程配置')
    const config1 = await auditService.createWorkflowConfig({
      name: '测试流程配置-' + Date.now(),
      sampleTypes: ['水质', '土壤'],
      levels: [
        { order: 1, name: '初审', role: 'auditor', required: true, autoAssign: true },
        { order: 2, name: '复审', role: 'senior_auditor', required: true, autoAssign: false },
        { order: 3, name: '终审', role: 'manager', required: true, autoAssign: false }
      ],
      parallelAudit: false
    })
    console.log('✓ 创建流程配置成功:', config1.name)

    // 7. 获取流程配置列表
    console.log('\n7. 获取流程配置列表')
    const configs = await auditService.listWorkflowConfigs()
    console.log('✓ 查询到', configs.length, '个流程配置')

    // 8. 获取单个流程配置
    console.log('\n8. 获取单个流程配置详情')
    const configDetail = await auditService.getWorkflowConfigById(config1.id)
    console.log('✓ 获取流程配置详情成功:', configDetail.name)

    // 9. 激活流程配置
    console.log('\n9. 激活流程配置')
    const activatedConfig = await auditService.activateWorkflowConfig(config1.id)
    console.log('✓ 激活流程配置成功，状态:', activatedConfig.status)

    // 10. 停用流程配置
    console.log('\n10. 停用流程配置')
    const deactivatedConfig = await auditService.deactivateWorkflowConfig(config1.id)
    console.log('✓ 停用流程配置成功，状态:', deactivatedConfig.status)

    // ============================================
    // 清理测试数据
    // ============================================
    console.log('\n=== 清理测试数据 ===\n')

    // 手动清理（因为有使用次数限制）
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    await prisma.auditCommentTemplate.delete({ where: { id: template1.id } })
    await prisma.auditWorkflowConfig.delete({ where: { id: config1.id } })
    await prisma.$disconnect()
    console.log('✓ 清理完成')

    console.log('\n✅ 所有测试通过！服务层方法工作正常。')

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

testAuditServiceMethods()
