/**
 * 审核统计报表功能测试
 * 测试前端页面和后端API的集成
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// 测试配置
const TEST_CONFIG = {
  username: 'admin',
  password: 'Admin@123456'
};

/**
 * 登录获取 token
 */
async function login() {
  try {
    console.log('\n=== 1. 登录测试 ===');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: TEST_CONFIG.username,
      password: TEST_CONFIG.password
    });

    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✓ 登录成功');
      console.log(`Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      console.log('✗ 登录失败:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试工作量统计
 */
async function testWorkloadStatistics() {
  try {
    console.log('\n=== 2. 工作量统计测试 ===');
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const response = await axios.get(`${BASE_URL}/statistics/audit/workload`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });

    if (response.data.success) {
      console.log('✓ 工作量统计查询成功');
      console.log(`数据条数: ${response.data.data.length}`);
      if (response.data.data.length > 0) {
        console.log('示例数据:', JSON.stringify(response.data.data[0], null, 2));
      }
      return true;
    } else {
      console.log('✗ 工作量统计查询失败:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ 工作量统计查询失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试通过率统计
 */
async function testPassRateStatistics() {
  try {
    console.log('\n=== 3. 通过率统计测试 ===');
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const response = await axios.get(`${BASE_URL}/statistics/audit/pass-rate`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });

    if (response.data.success) {
      console.log('✓ 通过率统计查询成功');
      console.log('整体统计:', JSON.stringify(response.data.data.overall, null, 2));
      console.log(`按级别统计: ${response.data.data.byLevel.length} 条`);
      console.log(`按样品类型统计: ${response.data.data.bySampleType.length} 条`);
      return true;
    } else {
      console.log('✗ 通过率统计查询失败:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ 通过率统计查询失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试时效性统计
 */
async function testDurationStatistics() {
  try {
    console.log('\n=== 4. 时效性统计测试 ===');
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const response = await axios.get(`${BASE_URL}/statistics/audit/duration`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });

    if (response.data.success) {
      console.log('✓ 时效性统计查询成功');
      console.log('统计指标:', {
        平均时长: response.data.data.average.toFixed(2) + '小时',
        中位数: response.data.data.median.toFixed(2) + '小时',
        最短: response.data.data.min.toFixed(2) + '小时',
        最长: response.data.data.max.toFixed(2) + '小时',
        超时任务数: response.data.data.timeoutCount,
        超时率: response.data.data.timeoutRate.toFixed(2) + '%'
      });
      console.log(`时长分布: ${response.data.data.distribution.length} 个区间`);
      return true;
    } else {
      console.log('✗ 时效性统计查询失败:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ 时效性统计查询失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试问题分类统计
 */
async function testIssueStatistics() {
  try {
    console.log('\n=== 5. 问题分类统计测试 ===');
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const response = await axios.get(`${BASE_URL}/statistics/audit/issues`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });

    if (response.data.success) {
      console.log('✓ 问题分类统计查询成功');
      console.log(`问题总数: ${response.data.data.total}`);
      console.log(`问题分类数: ${response.data.data.issues.length}`);
      if (response.data.data.issues.length > 0) {
        console.log('前3个问题:');
        response.data.data.issues.slice(0, 3).forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.reason}: ${issue.count}次 (${issue.percentage.toFixed(2)}%)`);
        });
      }
      return true;
    } else {
      console.log('✗ 问题分类统计查询失败:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ 问题分类统计查询失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试导出功能
 */
async function testExportStatistics() {
  try {
    console.log('\n=== 6. 导出功能测试 ===');
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const types = ['workload', 'passRate', 'duration', 'issues'];
    const typeNames = {
      workload: '工作量统计',
      passRate: '通过率统计',
      duration: '时效性统计',
      issues: '问题分类统计'
    };
    
    for (const type of types) {
      try {
        const response = await axios.post(
          `${BASE_URL}/statistics/audit/export`,
          {
            type,
            filters: {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString()
            }
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
            responseType: 'blob'
          }
        );

        if (response.status === 200) {
          console.log(`✓ ${typeNames[type]}导出成功`);
          console.log(`  文件大小: ${(response.data.size / 1024).toFixed(2)} KB`);
        } else {
          console.log(`✗ ${typeNames[type]}导出失败`);
        }
      } catch (error) {
        console.log(`✗ ${typeNames[type]}导出失败:`, error.response?.data || error.message);
      }
    }
    
    return true;
  } catch (error) {
    console.log('✗ 导出功能测试失败:', error.message);
    return false;
  }
}

/**
 * 测试筛选条件
 */
async function testFilters() {
  try {
    console.log('\n=== 7. 筛选条件测试 ===');
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // 测试按级别筛选
    console.log('\n测试按级别筛选 (level=1):');
    const levelResponse = await axios.get(`${BASE_URL}/statistics/audit/pass-rate`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        level: 1
      }
    });
    
    if (levelResponse.data.success) {
      console.log('✓ 按级别筛选成功');
      console.log(`  总任务数: ${levelResponse.data.data.overall.total}`);
    }
    
    // 测试按状态筛选
    console.log('\n测试按状态筛选 (status=approved):');
    const statusResponse = await axios.get(`${BASE_URL}/statistics/audit/workload`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: 'approved'
      }
    });
    
    if (statusResponse.data.success) {
      console.log('✓ 按状态筛选成功');
      console.log(`  数据条数: ${statusResponse.data.data.length}`);
    }
    
    return true;
  } catch (error) {
    console.log('✗ 筛选条件测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试输入验证
 */
async function testValidation() {
  try {
    console.log('\n=== 8. 输入验证测试 ===');
    
    // 测试无效时间范围
    console.log('\n测试无效时间范围 (开始时间晚于结束时间):');
    try {
      await axios.get(`${BASE_URL}/statistics/audit/workload`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
      console.log('✗ 应该返回错误但没有');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✓ 正确返回 400 错误');
        console.log(`  错误信息: ${error.response.data.error.message}`);
      } else {
        console.log('✗ 返回了错误的状态码:', error.response?.status);
      }
    }
    
    // 测试无效审核级别
    console.log('\n测试无效审核级别 (level=5):');
    try {
      await axios.get(`${BASE_URL}/statistics/audit/pass-rate`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          level: 5
        }
      });
      console.log('✗ 应该返回错误但没有');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✓ 正确返回 400 错误');
        console.log(`  错误信息: ${error.response.data.error.message}`);
      } else {
        console.log('✗ 返回了错误的状态码:', error.response?.status);
      }
    }
    
    return true;
  } catch (error) {
    console.log('✗ 输入验证测试失败:', error.message);
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('========================================');
  console.log('审核统计报表功能测试');
  console.log('========================================');

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  // 登录
  if (!await login()) {
    console.log('\n登录失败，无法继续测试');
    return;
  }

  // 运行测试
  const tests = [
    { name: '工作量统计', fn: testWorkloadStatistics },
    { name: '通过率统计', fn: testPassRateStatistics },
    { name: '时效性统计', fn: testDurationStatistics },
    { name: '问题分类统计', fn: testIssueStatistics },
    { name: '导出功能', fn: testExportStatistics },
    { name: '筛选条件', fn: testFilters },
    { name: '输入验证', fn: testValidation }
  ];

  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // 输出测试结果
  console.log('\n========================================');
  console.log('测试结果汇总');
  console.log('========================================');
  console.log(`总测试数: ${results.total}`);
  console.log(`通过: ${results.passed}`);
  console.log(`失败: ${results.failed}`);
  console.log(`通过率: ${((results.passed / results.total) * 100).toFixed(2)}%`);
  console.log('========================================');
}

// 运行测试
runAllTests().catch(console.error);
