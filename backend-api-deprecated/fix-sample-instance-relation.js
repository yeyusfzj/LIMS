/**
 * 修复 Sample 和 WorkflowInstance 的关联关系
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixRelation() {
  try {
    console.log('🔧 修复 Sample 和 WorkflowInstance 的关联关系...\n');

    // 查找所有 WorkflowInstance
    const instances = await prisma.workflowInstance.findMany({
      select: {
        id: true,
        sampleId: true
      }
    });

    console.log(`找到 ${instances.length} 个 WorkflowInstance`);

    for (const instance of instances) {
      console.log(`\n处理 WorkflowInstance: ${instance.id}`);
      console.log(`  sampleId: ${instance.sampleId}`);

      // 更新 Sample 的 workflowInstanceId
      const updated = await prisma.sample.update({
        where: { id: instance.sampleId },
        data: { workflowInstanceId: instance.id }
      });

      console.log(`  ✅ 已更新 Sample ${updated.id} 的 workflowInstanceId`);
    }

    console.log('\n✅ 关联关系修复完成');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRelation();
