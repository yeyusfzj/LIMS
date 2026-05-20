/**
 * 测试 FastAPI 报告模板 API
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function testReportTemplates() {
  try {
    console.log('=== 测试 FastAPI 报告模板 API ===\n');

    // 1. 登录获取 token
    console.log('1. 登录...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✓ 登录成功\n');

    // 2. 获取报告模板列表
    console.log('2. 获取报告模板列表...');
    const templatesResponse = await axios.get(`${API_BASE_URL}/report-templates`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page: 1,
        pageSize: 20
      }
    });

    console.log('响应格式:', JSON.stringify({
      success: templatesResponse.data.success,
      data: {
        total: templatesResponse.data.data.total,
        page: templatesResponse.data.data.page,
        pageSize: templatesResponse.data.data.pageSize,
        totalPages: templatesResponse.data.data.totalPages,
        itemsCount: templatesResponse.data.data.items.length
      }
    }, null, 2));

    console.log('\n模板列表:');
    templatesResponse.data.data.items.forEach((template, index) => {
      console.log(`${index + 1}. ${template.name}`);
      console.log(`   - 分类: ${template.category}`);
      console.log(`   - 版本: v${template.version}`);
      console.log(`   - 状态: ${template.isActive ? '启用' : '禁用'}`);
      console.log(`   - 创建人: ${template.createdBy}`);
      console.log(`   - 变量数量: ${template.variables.length}`);
    });

    console.log(`\n✓ 共 ${templatesResponse.data.data.total} 个模板`);

    // 3. 测试筛选
    console.log('\n3. 测试筛选（水质检测）...');
    const waterTemplatesResponse = await axios.get(`${API_BASE_URL}/report-templates`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page: 1,
        pageSize: 20,
        category: 'water'
      }
    });

    console.log(`✓ 找到 ${waterTemplatesResponse.data.data.total} 个水质检测模板`);

    // 4. 测试获取单个模板
    if (templatesResponse.data.data.items.length > 0) {
      const firstTemplate = templatesResponse.data.data.items[0];
      console.log(`\n4. 获取模板详情: ${firstTemplate.name}...`);
      
      const templateDetailResponse = await axios.get(
        `${API_BASE_URL}/report-templates/${firstTemplate.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('✓ 模板详情获取成功');
      console.log(`   - ID: ${templateDetailResponse.data.data.id}`);
      console.log(`   - 名称: ${templateDetailResponse.data.data.name}`);
      console.log(`   - 内容长度: ${templateDetailResponse.data.data.content.length} 字符`);
    }

    console.log('\n=== 所有测试通过 ===');

  } catch (error) {
    console.error('\n✗ 测试失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testReportTemplates();
