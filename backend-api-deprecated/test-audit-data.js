const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAuditData() {
  try {
    console.log('=== 测试审核任务数据 ===\n');
    
    // 查询审核任务
    const auditTasks = await prisma.auditTask.findMany({
      take: 5,
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
    
    console.log(`找到 ${auditTasks.length} 个审核任务\n`);
    
    auditTasks.forEach((task, index) => {
      console.log(`审核任务 ${index + 1}:`);
      console.log(`  ID: ${task.id}`);
      console.log(`  TaskID: ${task.taskId}`);
      console.log(`  Level: ${task.level}`);
      console.log(`  Status: ${task.status}`);
      console.log(`  Auditor: ${task.auditorId}`);
      
      if (task.task) {
        console.log(`  关联任务:`);
        console.log(`    任务ID: ${task.task.id}`);
        console.log(`    任务名称: ${task.task.nodeName}`);
        console.log(`    任务状态: ${task.task.status}`);
        
        if (task.task.instance && task.task.instance.sample) {
          console.log(`  关联样品:`);
          console.log(`    样品ID: ${task.task.instance.sample.id}`);
          console.log(`    样品条码: ${task.task.instance.sample.barcode}`);
          console.log(`    样品名称: ${task.task.instance.sample.sampleName}`);
        }
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuditData();
