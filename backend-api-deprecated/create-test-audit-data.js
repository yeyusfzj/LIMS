const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('=== 创建测试数据 ===\n');
    
    // 1. 创建样品
    console.log('1. 创建测试样品...');
    const timestamp = Date.now();
    const sample = await prisma.sample.create({
      data: {
        barcode: `TEST-AUDIT-${timestamp}`,
        sampleNumber: `SN-TEST-${timestamp}`,
        sampleName: '测试水质样品',
        sampleType: '水质',
        sampleCategory: '环境监测',
        clientName: '测试客户',
        quantity: 500,
        unit: 'mL',
        receivedDate: new Date(),
        status: 'IN_TESTING',
        priority: 'NORMAL',
        createdBy: 'admin'
      }
    });
    console.log(`   样品创建成功: ${sample.id}`);
    
    // 2. 创建工作流
    console.log('2. 创建测试工作流...');
    const workflow = await prisma.workflow.create({
      data: {
        name: '测试审核工作流',
        version: 1,
        config: {
          nodes: [],
          edges: []
        },
        status: 'ACTIVE',
        isActive: true,
        createdBy: 'admin'
      }
    });
    console.log(`   工作流创建成功: ${workflow.id}`);
    
    // 3. 创建工作流实例
    console.log('3. 创建工作流实例...');
    const instance = await prisma.workflowInstance.create({
      data: {
        workflowId: workflow.id,
        sampleId: sample.id,
        status: 'RUNNING',
        currentNodes: ['node-test-001']
      }
    });
    console.log(`   工作流实例创建成功: ${instance.id}`);
    
    // 4. 创建任务
    console.log('4. 创建测试任务...');
    const task = await prisma.task.create({
      data: {
        instanceId: instance.id,
        nodeId: 'node-test-001',
        nodeName: '检测任务',
        nodeType: 'TASK',
        assignedTo: 'analyst-001',
        status: 'COMPLETED',
        priority: 'NORMAL'
      }
    });
    console.log(`   任务创建成功: ${task.id}`);
    
    // 5. 创建审核任务
    console.log('5. 创建审核任务...');
    const auditTask = await prisma.auditTask.create({
      data: {
        taskId: task.id,
        level: 1,
        auditorId: 'auditor-001',
        status: 'PENDING'
      }
    });
    console.log(`   审核任务创建成功: ${auditTask.id}`);
    
    console.log('\n=== 测试数据创建完成 ===');
    console.log(`样品ID: ${sample.id}`);
    console.log(`任务ID: ${task.id}`);
    console.log(`审核任务ID: ${auditTask.id}`);
    
  } catch (error) {
    console.error('创建失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
