/**
 * 添加更多报告模板种子数据
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('开始添加更多报告模板数据...');

  // 获取admin用户ID
  const adminUser = await prisma.user.findUnique({
    where: { username: 'admin' }
  });

  if (!adminUser) {
    console.error('未找到admin用户');
    return;
  }

  const templates = [
    {
      name: '空气质量检测报告模板',
      description: '适用于室内外空气质量检测',
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
      <td>检测地点:</td>
      <td>{{samplingLocation}}</td>
      <td>检测日期:</td>
      <td>{{samplingDate}}</td>
    </tr>
    <tr>
      <td>委托单位:</td>
      <td>{{clientName}}</td>
      <td>检测类型:</td>
      <td>{{sampleType}}</td>
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

<div class="signatures">
  <div class="signature">
    <p>检测人员: {{tester}}</p>
    <p>日期: {{testDate}}</p>
  </div>
  <div class="signature">
    <p>审核人员: {{reviewer}}</p>
    <p>日期: {{reviewDate}}</p>
  </div>
</div>
      `,
      variables: [
        { name: 'reportNumber', type: 'string', source: 'report.reportNumber', label: '报告编号' },
        { name: 'samplingLocation', type: 'string', source: 'sample.samplingLocation', label: '检测地点' },
        { name: 'samplingDate', type: 'date', source: 'sample.samplingDate', label: '检测日期' },
        { name: 'clientName', type: 'string', source: 'sample.clientName', label: '委托单位' },
        { name: 'sampleType', type: 'string', source: 'sample.sampleType', label: '检测类型' },
        { name: 'weather', type: 'string', source: 'sample.weather', label: '天气状况' },
        { name: 'temperature', type: 'string', source: 'sample.temperature', label: '温度' },
        { name: 'humidity', type: 'string', source: 'sample.humidity', label: '湿度' },
        { name: 'testResults', type: 'array', source: 'results', label: '检测结果' },
        { name: 'conclusion', type: 'string', source: 'report.conclusion', label: '检测结论' },
        { name: 'tester', type: 'string', source: 'report.tester', label: '检测人员' },
        { name: 'testDate', type: 'date', source: 'report.testDate', label: '检测日期' },
        { name: 'reviewer', type: 'string', source: 'report.reviewer', label: '审核人员' },
        { name: 'reviewDate', type: 'date', source: 'report.reviewDate', label: '审核日期' }
      ],
      version: 1,
      isActive: true,
      createdBy: adminUser.id
    },
    {
      name: '药品检测报告模板',
      description: '适用于药品质量检测',
      category: 'medicine',
      content: `
<div class="report-header">
  <h1>药品检测报告</h1>
  <p class="report-number">报告编号: {{reportNumber}}</p>
</div>

<div class="sample-info">
  <h2>样品信息</h2>
  <table>
    <tr>
      <td>药品名称:</td>
      <td>{{sampleName}}</td>
      <td>样品编号:</td>
      <td>{{sampleBarcode}}</td>
    </tr>
    <tr>
      <td>生产企业:</td>
      <td>{{manufacturer}}</td>
      <td>批号:</td>
      <td>{{batchNumber}}</td>
    </tr>
    <tr>
      <td>生产日期:</td>
      <td>{{productionDate}}</td>
      <td>有效期至:</td>
      <td>{{expiryDate}}</td>
    </tr>
    <tr>
      <td>委托单位:</td>
      <td>{{clientName}}</td>
      <td>检测依据:</td>
      <td>{{testStandard}}</td>
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
        { name: 'sampleName', type: 'string', source: 'sample.sampleName', label: '药品名称' },
        { name: 'sampleBarcode', type: 'string', source: 'sample.barcode', label: '样品编号' },
        { name: 'manufacturer', type: 'string', source: 'sample.manufacturer', label: '生产企业' },
        { name: 'batchNumber', type: 'string', source: 'sample.batchNumber', label: '批号' },
        { name: 'productionDate', type: 'date', source: 'sample.productionDate', label: '生产日期' },
        { name: 'expiryDate', type: 'date', source: 'sample.expiryDate', label: '有效期至' },
        { name: 'clientName', type: 'string', source: 'sample.clientName', label: '委托单位' },
        { name: 'testStandard', type: 'string', source: 'sample.testStandard', label: '检测依据' },
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
      name: '化妆品检测报告模板',
      description: '适用于化妆品质量检测',
      category: 'cosmetics',
      content: `
<div class="report-header">
  <h1>化妆品检测报告</h1>
  <p class="report-number">报告编号: {{reportNumber}}</p>
</div>

<div class="sample-info">
  <h2>样品信息</h2>
  <table>
    <tr>
      <td>产品名称:</td>
      <td>{{sampleName}}</td>
      <td>样品编号:</td>
      <td>{{sampleBarcode}}</td>
    </tr>
    <tr>
      <td>生产企业:</td>
      <td>{{manufacturer}}</td>
      <td>批号:</td>
      <td>{{batchNumber}}</td>
    </tr>
    <tr>
      <td>委托单位:</td>
      <td>{{clientName}}</td>
      <td>检测类别:</td>
      <td>{{testCategory}}</td>
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

<div class="signatures">
  <div class="signature">
    <p>检测人员: {{tester}}</p>
    <p>日期: {{testDate}}</p>
  </div>
  <div class="signature">
    <p>审核人员: {{reviewer}}</p>
    <p>日期: {{reviewDate}}</p>
  </div>
</div>
      `,
      variables: [
        { name: 'reportNumber', type: 'string', source: 'report.reportNumber', label: '报告编号' },
        { name: 'sampleName', type: 'string', source: 'sample.sampleName', label: '产品名称' },
        { name: 'sampleBarcode', type: 'string', source: 'sample.barcode', label: '样品编号' },
        { name: 'manufacturer', type: 'string', source: 'sample.manufacturer', label: '生产企业' },
        { name: 'batchNumber', type: 'string', source: 'sample.batchNumber', label: '批号' },
        { name: 'clientName', type: 'string', source: 'sample.clientName', label: '委托单位' },
        { name: 'testCategory', type: 'string', source: 'sample.testCategory', label: '检测类别' },
        { name: 'testResults', type: 'array', source: 'results', label: '检测结果' },
        { name: 'conclusion', type: 'string', source: 'report.conclusion', label: '检测结论' },
        { name: 'tester', type: 'string', source: 'report.tester', label: '检测人员' },
        { name: 'testDate', type: 'date', source: 'report.testDate', label: '检测日期' },
        { name: 'reviewer', type: 'string', source: 'report.reviewer', label: '审核人员' },
        { name: 'reviewDate', type: 'date', source: 'report.reviewDate', label: '审核日期' }
      ],
      version: 1,
      isActive: true,
      createdBy: adminUser.id
    },
    {
      name: '建材检测报告模板',
      description: '适用于建筑材料质量检测',
      category: 'construction',
      content: `
<div class="report-header">
  <h1>建筑材料检测报告</h1>
  <p class="report-number">报告编号: {{reportNumber}}</p>
</div>

<div class="sample-info">
  <h2>样品信息</h2>
  <table>
    <tr>
      <td>材料名称:</td>
      <td>{{sampleName}}</td>
      <td>样品编号:</td>
      <td>{{sampleBarcode}}</td>
    </tr>
    <tr>
      <td>生产厂家:</td>
      <td>{{manufacturer}}</td>
      <td>规格型号:</td>
      <td>{{specification}}</td>
    </tr>
    <tr>
      <td>委托单位:</td>
      <td>{{clientName}}</td>
      <td>工程名称:</td>
      <td>{{projectName}}</td>
    </tr>
    <tr>
      <td>检测依据:</td>
      <td colspan="3">{{testStandard}}</td>
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
        { name: 'sampleName', type: 'string', source: 'sample.sampleName', label: '材料名称' },
        { name: 'sampleBarcode', type: 'string', source: 'sample.barcode', label: '样品编号' },
        { name: 'manufacturer', type: 'string', source: 'sample.manufacturer', label: '生产厂家' },
        { name: 'specification', type: 'string', source: 'sample.specification', label: '规格型号' },
        { name: 'clientName', type: 'string', source: 'sample.clientName', label: '委托单位' },
        { name: 'projectName', type: 'string', source: 'sample.projectName', label: '工程名称' },
        { name: 'testStandard', type: 'string', source: 'sample.testStandard', label: '检测依据' },
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
      name: '环境噪声检测报告模板',
      description: '适用于环境噪声检测',
      category: 'noise',
      content: `
<div class="report-header">
  <h1>环境噪声检测报告</h1>
  <p class="report-number">报告编号: {{reportNumber}}</p>
</div>

<div class="sample-info">
  <h2>检测信息</h2>
  <table>
    <tr>
      <td>检测地点:</td>
      <td>{{samplingLocation}}</td>
      <td>检测日期:</td>
      <td>{{samplingDate}}</td>
    </tr>
    <tr>
      <td>委托单位:</td>
      <td>{{clientName}}</td>
      <td>检测时段:</td>
      <td>{{testPeriod}}</td>
    </tr>
    <tr>
      <td>天气状况:</td>
      <td>{{weather}}</td>
      <td>风速:</td>
      <td>{{windSpeed}}</td>
    </tr>
  </table>
</div>

<div class="test-results">
  <h2>检测结果</h2>
  <table>
    <thead>
      <tr>
        <th>测点编号</th>
        <th>测点位置</th>
        <th>检测时间</th>
        <th>噪声值(dB)</th>
        <th>标准限值(dB)</th>
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
</div>
      `,
      variables: [
        { name: 'reportNumber', type: 'string', source: 'report.reportNumber', label: '报告编号' },
        { name: 'samplingLocation', type: 'string', source: 'sample.samplingLocation', label: '检测地点' },
        { name: 'samplingDate', type: 'date', source: 'sample.samplingDate', label: '检测日期' },
        { name: 'clientName', type: 'string', source: 'sample.clientName', label: '委托单位' },
        { name: 'testPeriod', type: 'string', source: 'sample.testPeriod', label: '检测时段' },
        { name: 'weather', type: 'string', source: 'sample.weather', label: '天气状况' },
        { name: 'windSpeed', type: 'string', source: 'sample.windSpeed', label: '风速' },
        { name: 'testResults', type: 'array', source: 'results', label: '检测结果' },
        { name: 'conclusion', type: 'string', source: 'report.conclusion', label: '检测结论' },
        { name: 'tester', type: 'string', source: 'report.tester', label: '检测人员' },
        { name: 'testDate', type: 'date', source: 'report.testDate', label: '检测日期' },
        { name: 'reviewer', type: 'string', source: 'report.reviewer', label: '审核人员' },
        { name: 'reviewDate', type: 'date', source: 'report.reviewDate', label: '审核日期' }
      ],
      version: 1,
      isActive: true,
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
  console.log(`新创建: ${createdCount} 个模板`);
  console.log(`已存在: ${existingCount} 个模板`);
  console.log(`总计: ${templates.length} 个模板`);
}

main()
  .catch((e) => {
    console.error('添加报告模板数据失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
