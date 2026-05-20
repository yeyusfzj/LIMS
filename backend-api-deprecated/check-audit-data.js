/**
 * 直接查询数据库检查审核任务数据
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAuditData() {
  try {
    console.log('🔍 检查数据库中的审核任务数据...\n');

    // 查询审核任务总数
    const totalCount = await prisma.auditTask.count();
    console.log(`📊 审核任务总数: ${totalCount}`);

    if (totalCount === 0) {
      console.log('\n❌ 数据库中没有审核任务数据！');
      return;
    }

    // 查询前10条审核任务
    const tasks = await prisma.auditTask.findMany({
      take: 10,
      include: {
        task: {
          select: {
            id: true,
            nodeName: true,
            status: true,
            instance: {
              select: {
                id: true,
                sample: {
                  select: {
                    id: true,
                    barcode: true,
                    sampleName: true,
                    sampleNumber: true,
                    status: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    console.log(`\n📋 前10条审核任务记录:\n`);
    tasks.forEach((auditTask, index) => {
      const sample = auditTask.task?.instance?.sample;
      console.log(`${index + 1}. 审核任务ID: ${auditTask.id}`);
      console.log(`   关联任务ID: ${auditTask.taskId}`);
      console.log(`   任务名称: ${auditTask.task?.nodeName || 'N/A'}`);
      console.log(`   样品: ${sample?.sampleName || 'N/A'} (${sample?.barcode || 'N/A'})`);
      console.log(`   级别: ${auditTask.level}`);
      console.log(`   状态: ${auditTask.status}`);
      console.log(`   审核人: ${auditTask.auditorId}`);
      console.log(`   提交时间: ${auditTask.submittedAt}`);
      console.log('');
    });

    // 按状态统计
    const statusStats = await prisma.auditTask.groupBy({
      by: ['status'],
      _count: true
    });

    console.log('📊 按状态统计:');
    statusStats.forEach(stat => {
      console.log(`   ${stat.status}: ${stat._count} 条`);
    });

    // 按级别统计
    const levelStats = await prisma.auditTask.groupBy({
      by: ['level'],
      _count: true
    });

    console.log('\n📊 按级别统计:');
    levelStats.forEach(stat => {
      console.log(`   级别 ${stat.level}: ${stat._count} 条`);
    });

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAuditData();
