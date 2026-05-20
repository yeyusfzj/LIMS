/**
 * 重新创建审核任务测试数据
 * 
 * 功能：
 * 1. 清理旧的审核任务数据
 * 2. 创建新的完整测试数据（样品 → 工作流实例 → 任务 → 审核任务）
 * 3. 创建多个不同状态和级别的审核任务
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function recreateAuditTestData() {
  try {
    console.log('=== 重新创建审核任务测试数据 ===\n');
    
    // 步骤 1: 清理旧数据
    console.log('步骤 1: 清理旧的测试数据...');
    
    // 删除旧的审核任务（只删除测试数据）
    const deletedAudits = await prisma.auditTask.deleteMany({
      where: {
        task: {
          nodeName: {
            contains: '测试'
          }
        }
      }
    });
    console.log(`   已删除 ${deletedAudits.count} 个旧审核任务`);
    
    // 删除旧的任务
    const deletedTasks = await prisma.task.deleteMany({
      where: {
        nodeName: {
          contains: '测试'
        }
      }
    });
    console.log(`   已删除 ${deletedTasks.count} 个旧任务`);
    
    // 删除旧的工作流实例
    const deletedInstances = await prisma.workflowInstance.deleteMany({
      where: {
        workflow: {
          name: {
            contains: '测试'
          }
        }
      }
    });
    console.log(`   已删除 ${deletedInstances.count} 个旧工作流实例`);
    
    // 删除旧的样品
    const deletedSamples = await prisma.sample.deleteMany({
      where: {
        barcode: {
          startsWith: 'TEST-AUDIT-'
        }
      }
    });
    console.log(`   已删除 ${deletedSamples.count} 个旧样品`);
    
    // 删除旧的工作流
    const deletedWorkflows = await prisma.workflow.deleteMany({
      where: {
        name: {
          contains: '测试审核工作流'
        }
      }
    });
    console.log(`   已删除 ${deletedWorkflows.count} 个旧工作流\n`);
    
    // 步骤 2: 创建新的测试数据
    console.log('步骤 2: 创建新的测试数据...\n');
    
    // 获取测试用户
    const testUser = await prisma.user.findUnique({
      where: { username: 'test_auditor' }
    });
    
    if (!testUser) {
      console.error('❌ 错误: 测试用户 test_auditor 不存在');
      console.log('   请先运行: node create-test-user.js');
      return;
    }
    
    console.log(`✅ 找到测试用户: ${testUser.username} (${testUser.id})\n`);
    
    // 创建工作流
    console.log('创建测试工作流...');
    const workflow = await prisma.workflow.create({
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
    console.log(`   工作流创建成功: ${workflow.id}\n`);
    
    // 创建多个测试场景
    const scenarios = [
      {
        name: '水质检测样品',
        type: '水质',
        category: '环境监测',
        client: '环保局',
        level: 1,
        status: 'PENDING',
        priority: 'HIGH',
        nodeName: '测试检测任务-水质'
      },
      {
        name: '土壤检测样品',
        type: '土壤',
        category: '环境监测',
        client: '农业局',
        level: 2,
        status: 'PENDING',
        priority: 'NORMAL',
        nodeName: '测试检测任务-土壤'
      },
      {
        name: '空气检测样品',
        type: '空气',
        category: '环境监测',
        client: '气象局',
        level: 3,
        status: 'IN_PROGRESS',
        priority: 'NORMAL',
        nodeName: '测试检测任务-空气'
      },
      {
        name: '食品检测样品',
        type: '食品',
        category: '食品安全',
        client: '食品公司',
        level: 4,
        status: 'PENDING',
        priority: 'URGENT',
        nodeName: '测试检测任务-食品'
      },
      {
        name: '药品检测样品',
        type: '药品',
        category: '药品检验',
        client: '制药厂',
        level: 1,
        status: 'APPROVED',
        priority: 'HIGH',
        nodeName: '测试检测任务-药品'
      }
    ];
    
    console.log(`创建 ${scenarios.length} 个测试场景...\n`);
    
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      const timestamp = Date.now() + i;
      
      console.log(`场景 ${i + 1}: ${scenario.name}`);
      
      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `TEST-AUDIT-${timestamp}`,
          sampleNumber: `SN-TEST-${timestamp}`,
          sampleName: scenario.name,
          sampleType: scenario.type,
          sampleCategory: scenario.category,
          clientName: scenario.client,
          quantity: 500 + i * 100,
          unit: 'mL',
          receivedDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // 不同日期
          status: 'IN_TESTING',
          priority: scenario.priority,
          createdBy: testUser.id
        }
      });
      console.log(`   ✓ 样品: ${sample.barcode}`);
      
      // 创建工作流实例
      const instance = await prisma.workflowInstance.create({
        data: {
          workflowId: workflow.id,
          sampleId: sample.id,
          status: 'RUNNING',
          currentNodes: ['node-002']
        }
      });
      console.log(`   ✓ 工作流实例: ${instance.id}`);
      
      // 更新样品的 workflowInstanceId（建立双向关联）
      await prisma.sample.update({
        where: { id: sample.id },
        data: { workflowInstanceId: instance.id }
      });
      
      // 创建任务
      const task = await prisma.task.create({
        data: {
          instanceId: instance.id,
          nodeId: 'node-002',
          nodeName: scenario.nodeName,
          nodeType: 'TASK',
          assignedTo: testUser.id,
          status: 'COMPLETED',
          priority: scenario.priority,
          startedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - i * 6 * 60 * 60 * 1000)
        }
      });
      console.log(`   ✓ 任务: ${task.id}`);
      
      // 创建审核任务
      const auditTask = await prisma.auditTask.create({
        data: {
          taskId: task.id,
          level: scenario.level,
          auditorId: testUser.id,
          status: scenario.status,
          submittedAt: new Date(Date.now() - i * 6 * 60 * 60 * 1000),
          submittedBy: testUser.id
        }
      });
      console.log(`   ✓ 审核任务: ${auditTask.id} (级别${scenario.level}, 状态:${scenario.status})\n`);
    }
    
    // 步骤 3: 验证数据
    console.log('步骤 3: 验证创建的数据...\n');
    
    const auditTasks = await prisma.auditTask.findMany({
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
    
    console.log(`✅ 成功创建 ${auditTasks.length} 个审核任务\n`);
    
    console.log('审核任务列表:');
    console.log('─'.repeat(100));
    console.log('ID'.padEnd(38) + '级别'.padEnd(8) + '状态'.padEnd(15) + '样品名称'.padEnd(20) + '样品条码');
    console.log('─'.repeat(100));
    
    auditTasks.forEach(audit => {
      const levelName = ['', '分析审核', '样品审核', '技术审核', '质量审核'][audit.level] || `级别${audit.level}`;
      const statusName = {
        'PENDING': '待审核',
        'IN_PROGRESS': '审核中',
        'APPROVED': '已通过',
        'REJECTED': '已拒绝'
      }[audit.status] || audit.status;
      
      console.log(
        audit.id.padEnd(38) +
        levelName.padEnd(8) +
        statusName.padEnd(15) +
        (audit.task?.instance?.sample?.sampleName || 'N/A').padEnd(20) +
        (audit.task?.instance?.sample?.barcode || 'N/A')
      );
    });
    
    console.log('─'.repeat(100));
    console.log('\n=== 测试数据创建完成 ===');
    console.log(`\n提示: 现在可以使用以下凭据登录系统测试审核功能:`);
    console.log(`   用户名: test_auditor`);
    console.log(`   密码: Test123!@#`);
    console.log(`\n前端地址: http://localhost:5173`);
    console.log(`审核任务页面: http://localhost:5173/audit/tasks\n`);
    
  } catch (error) {
    console.error('❌ 创建失败:', error);
    console.error('错误详情:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

recreateAuditTestData();
