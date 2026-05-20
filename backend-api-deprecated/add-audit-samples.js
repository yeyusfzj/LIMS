/**
 * 添加审核任务样例数据
 * 
 * 功能：只添加新的审核任务样例，不删除现有数据
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addAuditSamples() {
  try {
    console.log('=== 添加审核任务样例数据 ===\n');
    
    // 获取测试用户
    console.log('1. 查找测试用户...');
    const testUser = await prisma.user.findUnique({
      where: { username: 'test_auditor' }
    });
    
    if (!testUser) {
      console.error('❌ 错误: 测试用户 test_auditor 不存在');
      console.log('   请先运行: node create-test-user.js');
      process.exit(1);
    }
    
    console.log(`   ✓ 找到测试用户: ${testUser.username}\n`);
    
    // 查找或创建工作流
    console.log('2. 查找或创建工作流...');
    let workflow = await prisma.workflow.findFirst({
      where: {
        name: '测试审核工作流',
        status: 'ACTIVE'
      }
    });
    
    if (!workflow) {
      workflow = await prisma.workflow.create({
        data: {
          name: '测试审核工作流',
          version: 1,
          config: {
            nodes: [
              { id: 'node-001', name: '样品接收', type: 'START' },
              { id: 'node-002', name: '检测任务', type: 'TASK' },
              { id: 'node-003', name: '审核节点', type: 'AUDIT' },
              { id: 'node-004', name: '完成', type: 'END' }
            ],
            edges: [
              { from: 'node-001', to: 'node-002' },
              { from: 'node-002', to: 'node-003' },
              { from: 'node-003', to: 'node-004' }
            ]
          },
          status: 'ACTIVE',
          isActive: true,
          createdBy: testUser.id
        }
      });
      console.log(`   ✓ 创建新工作流: ${workflow.id}\n`);
    } else {
      console.log(`   ✓ 使用现有工作流: ${workflow.id}\n`);
    }
    
    // 创建样例数据
    console.log('3. 创建审核任务样例...\n');
    
    const scenarios = [
      {
        name: '水质检测样品',
        type: '水质',
        category: '环境监测',
        client: '环保局',
        level: 1,
        status: 'PENDING',
        priority: 'HIGH'
      },
      {
        name: '土壤检测样品',
        type: '土壤',
        category: '环境监测',
        client: '农业局',
        level: 2,
        status: 'PENDING',
        priority: 'NORMAL'
      },
      {
        name: '空气检测样品',
        type: '空气',
        category: '环境监测',
        client: '气象局',
        level: 3,
        status: 'IN_PROGRESS',
        priority: 'NORMAL'
      },
      {
        name: '食品检测样品',
        type: '食品',
        category: '食品安全',
        client: '食品公司',
        level: 4,
        status: 'PENDING',
        priority: 'URGENT'
      },
      {
        name: '药品检测样品',
        type: '药品',
        category: '药品检验',
        client: '制药厂',
        level: 1,
        status: 'APPROVED',
        priority: 'HIGH'
      }
    ];
    
    const createdAudits = [];
    
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      const timestamp = Date.now() + i;
      
      console.log(`   场景 ${i + 1}: ${scenario.name}`);
      
      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `AUDIT-${timestamp}`,
          sampleNumber: `SN-${timestamp}`,
          sampleName: scenario.name,
          sampleType: scenario.type,
          sampleCategory: scenario.category,
          clientName: scenario.client,
          quantity: 500,
          unit: 'mL',
          receivedDate: new Date(),
          status: 'IN_TESTING',
          priority: scenario.priority,
          createdBy: testUser.id
        }
      });
      
      // 创建工作流实例
      const instance = await prisma.workflowInstance.create({
        data: {
          workflowId: workflow.id,
          sampleId: sample.id,
          status: 'RUNNING',
          currentNodes: ['node-002']
        }
      });
      
      // 更新样品的 workflowInstanceId
      await prisma.sample.update({
        where: { id: sample.id },
        data: { workflowInstanceId: instance.id }
      });
      
      // 创建任务
      const task = await prisma.task.create({
        data: {
          instanceId: instance.id,
          nodeId: 'node-002',
          nodeName: `检测任务-${scenario.name}`,
          nodeType: 'TASK',
          assignedTo: testUser.id,
          assignedAt: new Date(),
          status: 'COMPLETED',
          priority: scenario.priority,
          completedAt: new Date()
        }
      });
      
      // 创建审核任务
      const auditTask = await prisma.auditTask.create({
        data: {
          taskId: task.id,
          level: scenario.level,
          auditorId: testUser.id,
          status: scenario.status,
          submittedAt: new Date()
        }
      });
      
      createdAudits.push({
        id: auditTask.id,
        level: scenario.level,
        status: scenario.status,
        sampleName: scenario.name,
        barcode: sample.barcode
      });
      
      console.log(`      ✓ 审核任务已创建: ${auditTask.id}`);
    }
    
    console.log('\n=== 创建完成 ===\n');
    console.log(`✅ 成功添加 ${createdAudits.length} 个审核任务样例\n`);
    
    console.log('新增审核任务列表:');
    console.log('─'.repeat(80));
    createdAudits.forEach((audit, index) => {
      const levelName = ['', '分析审核', '样品审核', '技术审核', '质量审核'][audit.level];
      const statusName = {
        'PENDING': '待审核',
        'IN_PROGRESS': '审核中',
        'APPROVED': '已通过',
        'REJECTED': '已拒绝'
      }[audit.status];
      
      console.log(`${index + 1}. ${audit.sampleName} (${audit.barcode})`);
      console.log(`   级别: ${levelName} | 状态: ${statusName}`);
    });
    console.log('─'.repeat(80));
    
    console.log('\n提示: 刷新浏览器页面查看新增的审核任务');
    console.log('审核任务页面: http://localhost:5173/audit/tasks\n');
    
  } catch (error) {
    console.error('❌ 创建失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 设置超时保护
const timeout = setTimeout(() => {
  console.error('\n❌ 脚本执行超时（30秒），强制退出');
  process.exit(1);
}, 30000);

addAuditSamples()
  .then(() => {
    clearTimeout(timeout);
    process.exit(0);
  })
  .catch((error) => {
    clearTimeout(timeout);
    console.error('执行出错:', error);
    process.exit(1);
  });
