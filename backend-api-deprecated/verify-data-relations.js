/**
 * 验证数据关联关系
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyRelations() {
  try {
    console.log('🔍 验证数据关联关系...\n');

    // 查询审核任务及其完整关联
    const auditTask = await prisma.auditTask.findFirst({
      include: {
        task: {
          include: {
            instance: {
              include: {
                sample: true
              }
            }
          }
        }
      }
    });

    if (!auditTask) {
      console.log('❌ 没有找到审核任务');
      return;
    }

    console.log('✅ 审核任务:', auditTask.id);
    console.log('   taskId:', auditTask.taskId);
    
    if (auditTask.task) {
      console.log('\n✅ 关联的 Task:', auditTask.task.id);
      console.log('   nodeName:', auditTask.task.nodeName);
      console.log('   instanceId:', auditTask.task.instanceId);
      
      if (auditTask.task.instance) {
        console.log('\n✅ 关联的 WorkflowInstance:', auditTask.task.instance.id);
        console.log('   sampleId:', auditTask.task.instance.sampleId);
        
        if (auditTask.task.instance.sample) {
          console.log('\n✅ 关联的 Sample:', auditTask.task.instance.sample.id);
          console.log('   barcode:', auditTask.task.instance.sample.barcode);
          console.log('   sampleName:', auditTask.task.instance.sample.sampleName);
        } else {
          console.log('\n❌ WorkflowInstance 没有关联 Sample');
          console.log('   检查 Sample 表中是否存在 sampleId:', auditTask.task.instance.sampleId);
          
          // 直接查询 Sample
          const sample = await prisma.sample.findUnique({
            where: { id: auditTask.task.instance.sampleId }
          });
          
          if (sample) {
            console.log('   ✅ Sample 存在，但关联有问题');
            console.log('   Sample workflowInstanceId:', sample.workflowInstanceId);
          } else {
            console.log('   ❌ Sample 不存在');
          }
        }
      } else {
        console.log('\n❌ Task 没有关联 WorkflowInstance');
      }
    } else {
      console.log('\n❌ AuditTask 没有关联 Task');
    }

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyRelations();
