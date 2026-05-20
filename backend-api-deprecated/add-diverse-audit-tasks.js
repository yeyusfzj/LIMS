/**
 * 添加多种类型的审核任务样例数据
 * 
 * 包括：检测任务、研发任务、审批任务、生产任务等
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addDiverseAuditTasks() {
  try {
    console.log('=== 添加多种类型的审核任务样例 ===\n');
    
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
        name: '多类型任务工作流',
        status: 'ACTIVE'
      }
    });
    
    if (!workflow) {
      workflow = await prisma.workflow.create({
        data: {
          name: '多类型任务工作流',
          version: 1,
          config: {
            nodes: [
              { id: 'node-001', name: '任务开始', type: 'START' },
              { id: 'node-002', name: '任务执行', type: 'TASK' },
              { id: 'node-003', name: '任务审核', type: 'AUDIT' },
              { id: 'node-004', name: '任务完成', type: 'END' }
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
    
    // 创建不同类型的任务样例
    console.log('3. 创建多种类型的审核任务...\n');
    
    const taskScenarios = [
      {
        name: '新产品配方研发',
        type: 'RESEARCH',
        category: '研发项目',
        level: 2,
        status: 'PENDING',
        priority: 'HIGH',
        result: {
          productInfo: {
            name: '高效清洁剂X1',
            code: 'PROD-2026-001',
            type: '清洁用品',
            stage: '配方优化阶段',
            owner: '研发部-张工',
            startDate: new Date().toISOString(),
            description: '针对工业设备的高效清洁剂，具有强力去污、环保无毒的特点'
          },
          milestones: [
            { name: '配方设计', status: 'completed', date: '2026-04-01' },
            { name: '实验室测试', status: 'completed', date: '2026-04-15' },
            { name: '小批量试产', status: 'in_progress', date: '2026-05-01' }
          ]
        }
      },
      {
        name: '设备采购审批',
        type: 'APPROVAL',
        category: '采购审批',
        level: 3,
        status: 'PENDING',
        priority: 'NORMAL',
        result: {
          approvalInfo: {
            type: '设备采购',
            applicant: '实验室-李主任',
            applyTime: new Date().toISOString(),
            status: 'pending',
            content: '申请采购高效液相色谱仪（HPLC）一台，用于药品成分分析',
            amount: 450000,
            currency: 'CNY',
            reason: '现有设备老化，精度不足，影响检测质量'
          },
          items: [
            { name: '高效液相色谱仪', model: 'Agilent 1260', quantity: 1, unitPrice: 450000 }
          ]
        }
      },
      {
        name: '生产工艺优化',
        type: 'PRODUCTION',
        category: '生产任务',
        level: 1,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        result: {
          productionInfo: {
            batchNumber: 'BATCH-2026050401',
            productName: '消毒液A型',
            quantity: 5000,
            unit: '瓶',
            startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            expectedEndTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            currentProgress: 75,
            qualityStatus: 'qualified'
          },
          optimizations: [
            { item: '混合时间', before: '30分钟', after: '25分钟', improvement: '提高效率16.7%' },
            { item: '温度控制', before: '±3℃', after: '±1℃', improvement: '提高稳定性' }
          ]
        }
      },
      {
        name: '质量体系文件评审',
        type: 'REVIEW',
        category: '文件评审',
        level: 4,
        status: 'PENDING',
        priority: 'NORMAL',
        result: {
          documentInfo: {
            title: 'ISO 9001质量管理体系程序文件',
            version: 'V2.1',
            documentType: '程序文件',
            author: '质量部-王经理',
            submitDate: new Date().toISOString(),
            pageCount: 45,
            changes: [
              '更新了不合格品处理流程',
              '增加了数据完整性要求',
              '修订了变更控制程序'
            ]
          },
          reviewers: [
            { name: '质量总监', status: 'pending' },
            { name: '技术总监', status: 'pending' },
            { name: '总经理', status: 'pending' }
          ]
        }
      },

      {
        name: '仪器设备校准',
        type: 'CALIBRATION',
        category: '设备管理',
        level: 1,
        status: 'APPROVED',
        priority: 'NORMAL',
        result: {
          calibrationInfo: {
            equipmentName: '电子天平',
            equipmentId: 'EQ-2023-056',
            calibrationDate: new Date().toISOString(),
            nextCalibrationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            calibrator: '计量中心-赵工',
            result: 'qualified',
            accuracy: '±0.001g',
            certificate: 'CERT-2026-0234'
          },
          testPoints: [
            { weight: '0g', measured: '0.000g', deviation: '0.000g', result: 'pass' },
            { weight: '100g', measured: '100.001g', deviation: '+0.001g', result: 'pass' },
            { weight: '200g', measured: '199.999g', deviation: '-0.001g', result: 'pass' }
          ]
        }
      }
    ];
    
    const createdAudits = [];
    
    for (let i = 0; i < taskScenarios.length; i++) {
      const scenario = taskScenarios[i];
      const timestamp = Date.now() + i;
      
      console.log(`   场景 ${i + 1}: ${scenario.name} (${scenario.type})`);
      
      // 创建样品（作为任务的载体）
      const sample = await prisma.sample.create({
        data: {
          barcode: `TASK-${timestamp}`,
          sampleNumber: `TN-${timestamp}`,
          sampleName: `${scenario.name}-载体`,
          sampleType: scenario.category,
          sampleCategory: scenario.category,
          clientName: '内部任务',
          quantity: 1,
          unit: '项',
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
          nodeName: scenario.name,
          nodeType: scenario.type,
          assignedTo: testUser.id,
          assignedAt: new Date(),
          status: 'COMPLETED',
          priority: scenario.priority,
          completedAt: new Date(),
          result: scenario.result
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
        taskName: scenario.name,
        taskType: scenario.type
      });
      
      console.log(`      ✓ 审核任务已创建: ${auditTask.id}`);
    }
    
    console.log('\n=== 创建完成 ===\n');
    console.log(`✅ 成功添加 ${createdAudits.length} 个不同类型的审核任务\n`);
    
    console.log('新增审核任务列表:');
    console.log('─'.repeat(80));
    createdAudits.forEach((audit, index) => {
      const levelName = ['', '分析审核', '样品审核', '技术审核', '质量审核'][audit.level];
      const statusName = {
        'PENDING': '待审核',
        'IN_PROGRESS': '审核中',
        'APPROVED': '已通过',
        'REJECTED': '已退回'
      }[audit.status];
      
      console.log(`${index + 1}. ${audit.taskName} (${audit.taskType})`);
      console.log(`   级别: ${levelName} | 状态: ${statusName}`);
    });
    console.log('─'.repeat(80));
    
    console.log('\n提示: 刷新浏览器页面查看新增的审核任务');
    console.log('审核任务页面: http://localhost:5173/audit/tasks\n');
    
  } catch (error) {
    console.error('❌ 创建失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 设置超时保护
const timeout = setTimeout(() => {
  console.error('\n❌ 脚本执行超时（30秒），强制退出');
  process.exit(1);
}, 30000);

addDiverseAuditTasks()
  .then(() => {
    clearTimeout(timeout);
    process.exit(0);
  })
  .catch((error) => {
    clearTimeout(timeout);
    console.error('执行出错:', error);
    process.exit(1);
  });
