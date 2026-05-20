/**
 * 添加审核意见模板的脚本
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// 模拟登录获取token（使用admin账户）
async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    console.log('登录响应:', JSON.stringify(response.data, null, 2));
    return response.data.data?.accessToken || response.data.accessToken;
  } catch (error) {
    console.error('登录失败:', error.response?.data || error.message);
    throw error;
  }
}

// 添加模板
async function addTemplate(token, template) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/audits/templates`,
      template,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`✓ 成功创建模板: ${template.name}`);
    return response.data;
  } catch (error) {
    console.error(`✗ 创建模板失败 (${template.name}):`, error.response?.data || error.message);
    throw error;
  }
}

// 预定义的模板数据
const templates = [
  {
    name: '审核通过-标准',
    type: 'approved',
    content: '经审核，该样品检测结果符合相关标准要求，数据准确可靠，审核通过。',
    isDefault: true
  },
  {
    name: '审核通过-优秀',
    type: 'approved',
    content: '经审核，该样品检测过程规范，数据记录完整，结果准确可靠，质量优秀，审核通过。',
    isDefault: false
  },
  {
    name: '需要修订-数据异常',
    type: 'need_revision',
    content: '经审核发现，部分检测数据存在异常波动，建议重新核对原始记录并进行复测确认。',
    isDefault: true
  },
  {
    name: '需要修订-记录不完整',
    type: 'need_revision',
    content: '经审核发现，检测记录不够完整，缺少必要的环境条件记录或仪器校准信息，请补充完善后重新提交。',
    isDefault: false
  },
  {
    name: '需要修订-计算错误',
    type: 'need_revision',
    content: '经审核发现，结果计算存在错误，请核对计算公式和数据处理过程，修正后重新提交。',
    isDefault: false
  },
  {
    name: '审核拒绝-严重违规',
    type: 'rejected',
    content: '经审核发现，检测过程存在严重违反操作规程的情况，数据不可靠，审核拒绝。请重新进行检测。',
    isDefault: true
  },
  {
    name: '审核拒绝-样品问题',
    type: 'rejected',
    content: '经审核发现，样品状态不符合检测要求或样品已失效，无法出具有效报告，审核拒绝。',
    isDefault: false
  },
  {
    name: '其他-需要讨论',
    type: 'other',
    content: '该样品检测结果需要进一步讨论确认，建议组织技术评审会议。',
    isDefault: false
  },
  {
    name: '其他-等待补充信息',
    type: 'other',
    content: '等待客户补充相关信息后再进行审核。',
    isDefault: false
  }
];

// 主函数
async function main() {
  console.log('开始添加审核意见模板...\n');

  try {
    // 1. 登录获取token
    console.log('正在登录...');
    const token = await login();
    console.log('✓ 登录成功\n');

    // 2. 添加所有模板
    console.log('正在创建模板...');
    for (const template of templates) {
      await addTemplate(token, template);
    }

    console.log(`\n✓ 成功创建 ${templates.length} 个模板`);
    console.log('\n模板列表:');
    templates.forEach((t, index) => {
      console.log(`${index + 1}. ${t.name} (${t.type}) ${t.isDefault ? '[默认]' : ''}`);
    });

  } catch (error) {
    console.error('\n✗ 操作失败:', error.message);
    process.exit(1);
  }
}

// 运行脚本
main();
