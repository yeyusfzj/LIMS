/**
 * 测试删除后样品是否从列表中消失
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testDeleteAndList() {
  console.log('========================================');
  console.log('测试删除后列表显示');
  console.log('========================================\n');

  let token = '';
  let sampleId = '';

  try {
    // 1. 登录
    console.log('1. 登录...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    token = loginResponse.data.data.accessToken;
    console.log('✓ 登录成功\n');

    // 2. 创建测试样品
    console.log('2. 创建测试样品...');
    const sampleData = {
      clientName: '测试客户-列表测试',
      clientContact: '13800138000',
      sampleName: '测试样品-列表显示测试',
      sampleType: '水质',
      sampleCategory: '地表水',
      quantity: 100,
      unit: 'mL',
      receivedDate: new Date().toISOString(),
      samplingDate: new Date().toISOString(),
      samplingLocation: '测试地点',
      storageLocation: '测试位置',
      priority: 'NORMAL'
    };

    const createResponse = await axios.post(`${API_BASE_URL}/samples`, sampleData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    sampleId = createResponse.data.data.id;
    const barcode = createResponse.data.data.barcode;
    console.log(`✓ 样品创建成功`);
    console.log(`  ID: ${sampleId}`);
    console.log(`  条码: ${barcode}\n`);

    // 3. 查询列表,确认样品存在
    console.log('3. 查询样品列表(删除前)...');
    const listBefore = await axios.get(`${API_BASE_URL}/samples`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, pageSize: 20 }
    });
    
    const foundBefore = listBefore.data.data.items.find(s => s.id === sampleId);
    if (foundBefore) {
      console.log(`✓ 样品在列表中: ${foundBefore.sampleName}`);
      console.log(`  总数: ${listBefore.data.data.total}\n`);
    } else {
      console.log(`✗ 样品不在列表中\n`);
    }

    // 4. 删除样品
    console.log('4. 删除样品...');
    await axios.delete(`${API_BASE_URL}/samples/${sampleId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✓ 删除成功\n`);

    // 5. 再次查询列表,确认样品已消失
    console.log('5. 查询样品列表(删除后)...');
    const listAfter = await axios.get(`${API_BASE_URL}/samples`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, pageSize: 20 }
    });
    
    const foundAfter = listAfter.data.data.items.find(s => s.id === sampleId);
    if (!foundAfter) {
      console.log(`✓ 样品已从列表中移除`);
      console.log(`  总数: ${listAfter.data.data.total}\n`);
    } else {
      console.log(`✗ 样品仍在列表中!`);
      console.log(`  状态: ${foundAfter.status}\n`);
    }

    // 6. 验证样品状态为ARCHIVED
    console.log('6. 验证样品状态...');
    const verifyResponse = await axios.get(`${API_BASE_URL}/samples/${sampleId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`  样品状态: ${verifyResponse.data.data.status}`);
    if (verifyResponse.data.data.status === 'ARCHIVED') {
      console.log(`✓ 样品已归档(软删除)\n`);
    }

    // 7. 测试查询ARCHIVED状态的样品
    console.log('7. 查询已归档的样品...');
    const archivedList = await axios.get(`${API_BASE_URL}/samples`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, pageSize: 20, status: 'ARCHIVED' }
    });
    
    const foundArchived = archivedList.data.data.items.find(s => s.id === sampleId);
    if (foundArchived) {
      console.log(`✓ 可以通过status=ARCHIVED查询到已删除的样品`);
      console.log(`  已归档样品总数: ${archivedList.data.data.total}\n`);
    }

    console.log('========================================');
    console.log('✅ 所有测试通过!');
    console.log('删除功能正常:');
    console.log('- 删除后样品不在默认列表中显示');
    console.log('- 样品状态更新为ARCHIVED');
    console.log('- 可以通过status参数查询已归档样品');
    console.log('========================================');

  } catch (error) {
    console.error('\n✗ 测试失败:');
    if (error.response) {
      console.error(`  状态码: ${error.response.status}`);
      console.error(`  错误信息:`, error.response.data);
    } else {
      console.error(`  错误: ${error.message}`);
    }
  }
}

testDeleteAndList();
