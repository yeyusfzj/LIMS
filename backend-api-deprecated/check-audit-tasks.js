const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAuditTasks() {
  try {
    const tasks = await prisma.auditTask.findMany({
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
      },
      take: 10
    });
    
    console.log(`\n审核任务总数: ${tasks.length}\n`);
    
    if (tasks.length === 0) {
      console.log('❌ 没有找到任何审核任务！');
    } else {
      console.log('审核任务列表:');
      console.log('─'.repeat(100));
      tasks.forEach((t, index) => {
        console.log(`${index + 1}. ID: ${t.id}`);
        console.log(`   级别: ${t.level} | 状态: ${t.status}`);
        console.log(`   任务: ${t.task?.nodeName || 'N/A'}`);
        console.log(`   样品: ${t.task?.instance?.sample?.sampleName || 'N/A'} (${t.task?.instance?.sample?.barcode || 'N/A'})`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAuditTasks();
