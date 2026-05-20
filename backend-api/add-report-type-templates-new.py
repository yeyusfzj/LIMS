/**
 * 为 FastAPI 添加报告模板数据
 * 使用 Prisma 客户端直接操作数据库
 */

const { PrismaClient } = require('./backend-api/node_modules/@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:password@localhost:5432/lims_dev'
    }
  }
});

async function main() {
  console.log('开始添加报告模板数据...');

  // 获取admin用户ID
  const adminUser = await prisma.user.findUnique({
    where: { username: 'admin' }
  });

  if (!adminUser) {
    console.error('未找到admin用户');
    return;
  }

  console.log(`找到 admin 用户: ${adminUser.username} (ID: ${adminUser.id})`);

  const templates = [
    {
      name: '水质检测报告模板',
      description: '适用于各类水质样品的检测报告',
      category: 'water',
      content: `
<div class="report-header">
  <h1>水质检测报告</h1>
  <p class="report-number">报告编号: {{reportNumber}}</p>
</div>

<div class="sample-info">
  <h2>样品信息</h2>
  <table>
    <tr>
      <td>样品编号:</td>
      <td>{{sampleBarcode}}</td>
      <td>样品名称:</td>
      <td>{{sampleName}}</td>
    </tr>
    <tr>
      <td>委托单位:</td>
      <td>{{clientName}}</td>
      <td>采样日期:</td>
      <td>{{samplingDate}}</td>
    </tr>
    <tr>
      <td>采样地点:</td>
      <td colspan="3">{{samplingLocation}}</td>
    </tr>
  </table>
</div>

<div class="test-results">
  <h2>检测结果</h2>
  <table>
    <thead>
      <tr>
        <th>检测项目</th>
        <th>检测结果</th>
        <th>单位</th>
        <th>标准限值</th>
        <th>判定</th>
      </tr>
    </thead>
    <tbody>
      {{testResults}}
    </tbody>
  </table>
</div>

<div class="conclusion">
  <h2>检测结论</h2>
  <p>{{conclusion}}</p>
</div>

<div class="signatures">
  <div class="signature">
    <p>检测人员: {{tester}}</p>
    <p>日期: {{testDate}}</p>
  </div>
  <div class="signature">
    <p>审核人员: {{reviewer}}</p>
    <p>日期: {{reviewDate}}</p>
  </div>
  <div class="signature">
    <p>批准人员: {{approver}}</p>
    <p>日期: {{approveDate}}</p>
  </div>
</div>
      `,
      variables: [
        { name: 'reportNumber', type: 'string', source: 'report.reportNumber', label: '报告编号' },
        { name: 'sampleBarcode', type: 'string', source: 'sample.barcode', label: '样品编号' },
        { name: 'sampleName', type: 'string', source: 'sample.sampleName', label: '样品名称' },
        { name: 'clientName', type: 'string', source: 'sample.clientName', label: '委托单位' },
        { name: 'samplingDate', type: 'date', source: 'sample.samplingDate', label: '采样日期' },
        { name: 'samplingLocation', type: 'string', source: 'sample.samplingLocation', label: '采样地点' },
        { name: 'testResults', type: 'array', source: 'results', label: '检测结果' },
        { name: 'conclusion', type: 'string', source: 'report.conclusion', label: '检测结论' },
        { name: 'tester', type: 'string', source: 'report.tester', label: '检测人员' },
        { name: 'testDate', type: 'date', source: 'report.testDate', label: '检测日期' },
        { name: 'reviewer', type: 'string', source: 'report.reviewer', label: '审核人员' },
        { name: 'reviewDate', type: 'date', source: 'report.reviewDate', label: '审核日期' },
        { name: 'approver', type: 'string', source: 'report.approver', label: '批准人员' },
        { name: 'approveDate', type: 'date', source: 'report.approveDate', label: '批准日期' }
      ],
      version: 1,
      isActive: true,
      createdBy: adminUser.id
    },
    {
      name: '土壤检测报告模板',
      description: '适用于土壤样品的检测报告',
      category: 'soil',
      content: `
<div class="report-header">
  <h1>土壤检测报告</h1>
  <p class="report-number">报告编号: {{reportNumber}}</p>
</div>

<div class="sample-info">
  <h2>样品信息</h2>
  <table>
    <tr>
      <td>样品编号:</td>
      <td>{{sampleBarcode}}</td>
      <td>样品类型:</td>
      <td>{{sampleType}}</td>
    </tr>
    <tr>
      <td>委托单位:</td>
      <td>{{clientName}}</td>
      <td>采样日期:</td>
      <td>{{samplingDate}}</td>
    </tr>
  </table>
</div>

<div class="test-results">
  <h2>检测结果</h2>
  <table>
    <thead>
      <tr>
        <th>检测项目</th>
        <th>检测结果</th>
        <th>单位</th>
        <th>评价标准</th>
      </tr>
    </thead>
    <tbody>
      {{testResults}}
    </tbody>
  </table>
</div>

<div class="conclusion">
  <h2>检测结论</h2>
  <p>{{conclusion}}</p>
</div>
      `,
      variables: [
        { name: 'reportNumber', type: 'string', source: 'report.reportNumber', label: '报告编号' },
        { name: 'sampleBarcode', type: 'string', source: 'sample.barcode', label: '样品编号' },
        { name: 'sampleType', type: 'string', source: 'sample.sampleType', label: '样品类型' },
        { name: 'clientName', type: 'string', source: 'sample.clientName', label: '委托单位' },
        { name: 'samplingDate', type: 'date', source: 'sample.samplingDate', label: '采样日期' },
        { name: 'testResults', type: 'array', source: 'results', label: '检测结果' },
        { name: 'conclusion', type: 'string', source: 'report.conclusion', label: '检测结论' }
      ],
      version: 1,
      isActive: true,
      createdBy: adminUser.id
    },
    {
      name: '空气检测报告模板',
      description: '适用于空气质量检测报告',
      category: 'air',
      content: `
<div class="report-header">
  <h1>空气质量检测报告</h1>
  <p class="report-number">报告编号: {{reportNumber}}</p>
</div>

<div class="sample-info">
  <h2>检测信息</h2>
  <table>
    <tr>
      <td>检测编号:</td>
      <td>{{sampleBarcode}}</td>
      <td>检测地点:</td>
      <td>{{samplingLocation}}</td>
    </tr>
    <tr>
      <td>委托单位:</td>
      <td>{{clientName}}</td>
      <td>检测日期:</td>
      <td>{{samplingDate}}</td>
    </tr>
    <tr>
      <td>天气状况:</td>
      <td>{{weather}}</td>
      <td>温度/湿度:</td>
      <td>{{temperature}}/{{humidity}}</td>
    </tr>
  </table>
</div>

<div class="test-results">
  <h2>检测结果</h2>
  <table>
    <thead>
      <tr>
        <th>检测项目</th>
        <th>检测结果</th>
        <th>单位</th>
        <th>标准限值</th>
        <th>判定</th>
      </tr>
    </thead>
    <tbody>
      {{testResults}}
    </tbody>
  </table>
</div>

<div class="conclusion">
  <h2>检测结论</h2>
  <p>{{conclusion}}</p>
</div>
      `,
      variables: [
        { name: 'reportNumber', type: 'string', source: 'report.reportNumber', label: '报告编号' },
        { name: 'sampleBarcode', type: 'string', source: 'sample.barcode', label: '检测编号' },
        { name: 'samplingLocation', type: 'string', source: 'sample.samplingLocation', label: '检测地点' },
        { name: 'clientName', type: 'string', source: 'sample.clientName', label: '委托单位' },
        { name: 'samplingDate', type: 'date', source: 'sample.samplingDate', label: '检测日期' },
        { name: 'weather', type: 'string', source: 'sample.weather', label: '天气状况' },
        { name: 'temperature', type: 'string', source: 'sample.temperature', label: '温度' },
        { name: 'humidity', type: 'string', source: 'sample.humidity', label: '湿度' },
        { name: 'testResults', type: 'array', source: 'results', label: '检测结果' },
        { name: 'conclusion', type: 'string', source: 'report.conclusion', label: '检测结论' }
      ],
      version: 1,
      isActive: true,
      createdBy: adminUser.id
    },
    {
      name: '食品检测报告模板',
      description: '适用于食品样品的检测报告',
      category: 'food',
      content: `
<div class="report-header">
  <h1>食品检测报告</h1>
  <p class="report-number">报告编号: {{reportNumber}}</p>
</div>

<div class="sample-info">
  <h2>样品信息</h2>
  <table>
    <tr>
      <td>样品名称:</td>
      <td>{{sampleName}}</td>
      <td>样品编号:</td>
      <td>{{sampleBarcode}}</td>
    </tr>
    <tr>
      <td>委托单位:</td>
      <td>{{clientName}}</td>
      <td>生产日期:</td>
      <td>{{productionDate}}</td>
    </tr>
    <tr>
      <td>生产批号:</td>
      <td>{{batchNumber}}</td>
      <td>规格型号:</td>
      <td>{{specification}}</td>
    </tr>
  </table>
</div>

<div class="test-results">
  <h2>检测结果</h2>
  <table>
    <thead>
      <tr>
        <th>检测项目</th>
        <th>检测结果</th>
        <th>单位</th>
        <th>标准要求</th>
        <th>判定</th>
      </tr>
    </thead>
    <tbody>
      {{testResults}}
    </tbody>
  </table>
</div>

<div class="conclusion">
  <h2>检测结论</h2>
  <p>{{conclusion}}</p>
</div>
      `,
      variables: [
        { name: 'reportNumber', type: 'string', source: 'report.reportNumber', label: '报告编号' },
        { name: 'sampleName', type: 'string', source: 'sample.sampleName', label: '样品名称' },
        { name: 'sampleBarcode', type: 'string', source: 'sample.barcode', label: '样品编号' },
        { name: 'clientName', type: 'string', source: 'sample.clientName', label: '委托单位' },
        { name: 'productionDate', type: 'date', source: 'sample.productionDate', label: '生产日期' },
        { name: 'batchNumber', type: 'string', source: 'sample.batchNumber', label: '生产批号' },
        { name: 'specification', type: 'string', source: 'sample.specification', label: '规格型号' },
        { name: 'testResults', type: 'array', source: 'results', label: '检测结果' },
        { name: 'conclusion', type: 'string', source: 'report.conclusion', label: '检测结论' }
      ],
      version: 1,
      isActive: true,
      createdBy: adminUser.id
    },
    {
      name: '通用检测报告模板',
      description: '通用的检测报告模板',
      category: 'general',
      content: `
<div class="report-header">
  <h1>检测报告</h1>
  <p class="report-number">报告编号: {{reportNumber}}</p>
</div>

<div class="sample-info">
  <h2>样品信息</h2>
  <p>样品编号: {{sampleBarcode}}</p>
  <p>样品名称: {{sampleName}}</p>
  <p>委托单位: {{clientName}}</p>
</div>

<div class="test-results">
  <h2>检测结果</h2>
  {{testResults}}
</div>

<div class="conclusion">
  <h2>检测结论</h2>
  <p>{{conclusion}}</p>
</div>
      `,
      variables: [
        { name: 'reportNumber', type: 'string', source: 'report.reportNumber', label: '报告编号' },
        { name: 'sampleBarcode', type: 'string', source: 'sample.barcode', label: '样品编号' },
        { name: 'sampleName', type: 'string', source: 'sample.sampleName', label: '样品名称' },
        { name: 'clientName', type: 'string', source: 'sample.clientName', label: '委托单位' },
        { name: 'testResults', type: 'array', source: 'results', label: '检测结果' },
        { name: 'conclusion', type: 'string', source: 'report.conclusion', label: '检测结论' }
      ],
      version: 1,
      isActive: false,
      createdBy: adminUser.id
    }
  ];

  let createdCount = 0;
  let existingCount = 0;

  for (const template of templates) {
    const existing = await prisma.reportTemplate.findFirst({
      where: { name: template.name }
    });

    if (!existing) {
      await prisma.reportTemplate.create({
        data: template
      });
      console.log(`✓ 创建模板: ${template.name}`);
      createdCount++;
    } else {
      console.log(`- 模板已存在: ${template.name}`);
      existingCount++;
    }
  }

  console.log('\n报告模板数据添加完成!');
  console.log(`已创建 ${createdCount} 个新模板`);
  console.log(`已存在 ${existingCount} 个模板`);
  console.log(`总计 ${templates.length} 个模板`);
}

main()
  .catch((e) => {
    console.error('添加报告模板数据失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
