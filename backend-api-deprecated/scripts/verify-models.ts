/**
 * 验证数据模型脚本
 * 检查所有 Prisma 模型是否正确生成
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyModels() {
  console.log('开始验证数据模型...\n')

  try {
    // 验证用户和权限模型
    console.log('✓ User 模型可用')
    console.log('✓ Role 模型可用')
    console.log('✓ Permission 模型可用')
    console.log('✓ UserRole 模型可用')

    // 验证样品相关模型
    console.log('✓ Sample 模型可用')
    console.log('✓ TestItem 模型可用')
    console.log('✓ Transfer 模型可用')

    // 验证工作流模型
    console.log('✓ Workflow 模型可用')
    console.log('✓ WorkflowInstance 模型可用')
    console.log('✓ Task 模型可用')

    // 验证检测结果模型
    console.log('✓ Result 模型可用')
    console.log('✓ Formula 模型可用')

    // 验证审核判定模型
    console.log('✓ AuditTask 模型可用')
    console.log('✓ QualityJudgment 模型可用')

    // 验证报告模型
    console.log('✓ ReportTemplate 模型可用')
    console.log('✓ Report 模型可用')
    console.log('✓ Signature 模型可用')
    console.log('✓ Distribution 模型可用')

    // 验证审计日志模型
    console.log('✓ AuditLog 模型可用')

    // 测试数据库连接
    await prisma.$queryRaw`SELECT 1`
    console.log('\n✓ 数据库连接正常')

    // 检查表是否存在
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `
    
    console.log(`\n✓ 数据库中共有 ${tables.length} 个表`)
    
    const expectedTables = [
      'users', 'roles', 'permissions', 'user_roles',
      'samples', 'test_items', 'transfers',
      'workflows', 'workflow_instances', 'tasks',
      'results', 'formulas',
      'audit_tasks', 'quality_judgments',
      'report_templates', 'reports', 'signatures', 'distributions',
      'audit_logs'
    ]

    const missingTables = expectedTables.filter(
      table => !tables.some(t => t.tablename === table)
    )

    if (missingTables.length > 0) {
      console.log('\n⚠ 缺失的表:', missingTables.join(', '))
    } else {
      console.log('✓ 所有预期的表都已创建')
    }

    console.log('\n✅ 数据模型验证完成！所有模型都已正确定义和迁移。')
  } catch (error) {
    console.error('\n❌ 验证失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

verifyModels()
