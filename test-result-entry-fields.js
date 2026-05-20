// 测试结果录入页面新增字段的脚本
// 在浏览器控制台中运行此脚本来验证新字段是否存在

console.log('=== 结果录入页面字段验证 ===');

// 检查表格列是否包含新增字段
const checkTableColumns = () => {
  const tableHeaders = document.querySelectorAll('.result-form .el-table th');
  const expectedColumns = [
    '检测项目',
    '检测方法', 
    '单位',
    '检测结果',
    '正常范围',
    '数据来源',
    '仪器编号',
    '操作人员',
    '录入时间',
    '状态',
    '备注',
    '操作'
  ];
  
  console.log('当前表格列数:', tableHeaders.length);
  
  const actualColumns = Array.from(tableHeaders).map(th => th.textContent.trim());
  console.log('实际列名:', actualColumns);
  
  const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
  const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
  
  if (missingColumns.length === 0) {
    console.log('✅ 所有预期字段都存在');
  } else {
    console.log('❌ 缺少字段:', missingColumns);
  }
  
  if (extraColumns.length > 0) {
    console.log('ℹ️ 额外字段:', extraColumns);
  }
  
  return missingColumns.length === 0;
};

// 检查数据来源下拉框
const checkDataSourceSelect = () => {
  const dataSourceSelects = document.querySelectorAll('.el-table .el-select');
  console.log('找到数据来源下拉框数量:', dataSourceSelects.length);
  
  if (dataSourceSelects.length > 0) {
    console.log('✅ 数据来源字段存在');
    return true;
  } else {
    console.log('❌ 未找到数据来源字段');
    return false;
  }
};

// 检查仪器编号输入框
const checkInstrumentIdInput = () => {
  const instrumentInputs = document.querySelectorAll('.el-table .el-input input[placeholder*="仪器编号"]');
  console.log('找到仪器编号输入框数量:', instrumentInputs.length);
  
  if (instrumentInputs.length > 0) {
    console.log('✅ 仪器编号字段存在');
    return true;
  } else {
    console.log('❌ 未找到仪器编号字段');
    return false;
  }
};

// 检查操作人员输入框
const checkOperatorInput = () => {
  const operatorInputs = document.querySelectorAll('.el-table .el-input input[placeholder*="操作人员"]');
  console.log('找到操作人员输入框数量:', operatorInputs.length);
  
  if (operatorInputs.length > 0) {
    console.log('✅ 操作人员字段存在');
    return true;
  } else {
    console.log('❌ 未找到操作人员字段');
    return false;
  }
};

// 检查录入时间选择器
const checkDateTimePicker = () => {
  const dateTimePickers = document.querySelectorAll('.el-table .el-date-editor');
  console.log('找到录入时间选择器数量:', dateTimePickers.length);
  
  if (dateTimePickers.length > 0) {
    console.log('✅ 录入时间字段存在');
    return true;
  } else {
    console.log('❌ 未找到录入时间字段');
    return false;
  }
};

// 检查备注输入框
const checkRemarksInput = () => {
  const remarksInputs = document.querySelectorAll('.el-table .el-input input[placeholder*="备注"]');
  console.log('找到备注输入框数量:', remarksInputs.length);
  
  if (remarksInputs.length > 0) {
    console.log('✅ 备注字段存在');
    return true;
  } else {
    console.log('❌ 未找到备注字段');
    return false;
  }
};

// 主验证函数
const validateResultEntryFields = () => {
  console.log('开始验证结果录入页面字段...');
  
  // 等待页面加载完成
  setTimeout(() => {
    const results = {
      tableColumns: checkTableColumns(),
      dataSource: checkDataSourceSelect(),
      instrumentId: checkInstrumentIdInput(),
      operator: checkOperatorInput(),
      dateTime: checkDateTimePicker(),
      remarks: checkRemarksInput()
    };
    
    const allPassed = Object.values(results).every(result => result);
    
    console.log('\n=== 验证结果汇总 ===');
    console.log('表格列验证:', results.tableColumns ? '✅ 通过' : '❌ 失败');
    console.log('数据来源字段:', results.dataSource ? '✅ 通过' : '❌ 失败');
    console.log('仪器编号字段:', results.instrumentId ? '✅ 通过' : '❌ 失败');
    console.log('操作人员字段:', results.operator ? '✅ 通过' : '❌ 失败');
    console.log('录入时间字段:', results.dateTime ? '✅ 通过' : '❌ 失败');
    console.log('备注字段:', results.remarks ? '✅ 通过' : '❌ 失败');
    
    if (allPassed) {
      console.log('\n🎉 所有新增字段验证通过！结果录入页面已成功增强。');
    } else {
      console.log('\n⚠️ 部分字段验证失败，请检查页面是否正确加载。');
    }
    
    return results;
  }, 1000);
};

// 如果在结果录入页面，自动运行验证
if (window.location.href.includes('/result/entry') || window.location.href.includes('result-entry')) {
  validateResultEntryFields();
} else {
  console.log('请先导航到结果录入页面，然后运行 validateResultEntryFields() 函数');
}

// 导出验证函数供手动调用
window.validateResultEntryFields = validateResultEntryFields;