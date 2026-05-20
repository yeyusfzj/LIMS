/**
 * 测试统计数据可视化接口
 * 
 * 验证图表数据 API 端点的功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8000';

// 测试用户凭证（需要先登录获取 token）
let authToken = '';

/**
 * 登录获取 token
 */
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    authToken = response.data.data.accessToken;
    console.log('✓ 登录成功');
    return true;
  } catch (error) {
    console.error('✗ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试获取趋势图数据
 */
async function testTrendChart() {
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/statistics/charts/trend`, {
      params: {
        granularity: 'day',
        use_cache: false
      },
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('\n✓ 趋势图数据获取成功');
    console.log('  图表类型:', response.data.data.type);
    console.log('  X轴数据点数:', response.data.data.xAxis.data.length);
    console.log('  系列数据点数:', response.data.data.series[0].data.length);
    console.log('  示例数据:', JSON.stringify(response.data.data, null, 2).substring(0, 500) + '...');
    
    return true;
  } catch (error) {
    console.error('✗ 趋势图数据获取失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试获取类型分布图数据
 */
async function testTypeDistributionChart() {
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/statistics/charts/type_distribution`, {
      params: {
        use_cache: false
      },
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('\n✓ 类型分布图数据获取成功');
    console.log('  图表类型:', response.data.data.type);
    console.log('  数据项数:', response.data.data.series[0].data.length);
    console.log('  示例数据:', JSON.stringify(response.data.data.series[0].data.slice(0, 3), null, 2));
    
    return true;
  } catch (error) {
    console.error('✗ 类型分布图数据获取失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试获取状态分布图数据
 */
async function testStatusDistributionChart() {
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/statistics/charts/status_distribution`, {
      params: {
        use_cache: false
      },
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('\n✓ 状态分布图数据获取成功');
    console.log('  图表类型:', response.data.data.type);
    console.log('  状态类别:', response.data.data.xAxis.data);
    console.log('  数据值:', response.data.data.series[0].data);
    
    return true;
  } catch (error) {
    console.error('✗ 状态分布图数据获取失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试获取合格率图数据
 */
async function testQualityRateChart() {
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/statistics/charts/quality_rate`, {
      params: {
        granularity: 'day',
        use_cache: false
      },
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('\n✓ 合格率图数据获取成功');
    console.log('  图表类型:', response.data.data.type);
    console.log('  Y轴范围:', response.data.data.yAxis.min, '-', response.data.data.yAxis.max);
    console.log('  数据点数:', response.data.data.series[0].data.length);
    
    return true;
  } catch (error) {
    console.error('✗ 合格率图数据获取失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试带过滤条件的图表数据
 */
async function testChartWithFilters() {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const response = await axios.get(`${BASE_URL}/api/v1/statistics/charts/trend`, {
      params: {
        granularity: 'day',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        sample_type: '水质样品',
        use_cache: false
      },
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('\n✓ 带过滤条件的图表数据获取成功');
    console.log('  时间范围:', startDate.toISOString().split('T')[0], '至', endDate.toISOString().split('T')[0]);
    console.log('  样品类型过滤: 水质样品');
    console.log('  数据点数:', response.data.data.xAxis.data.length);
    
    return true;
  } catch (error) {
    console.error('✗ 带过滤条件的图表数据获取失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试不同时间粒度
 */
async function testDifferentGranularities() {
  const granularities = ['day', 'week', 'month', 'year'];
  
  console.log('\n测试不同时间粒度:');
  
  for (const granularity of granularities) {
    try {
      const response = await axios.get(`${BASE_URL}/api/v1/statistics/charts/trend`, {
        params: {
          granularity: granularity,
          use_cache: false
        },
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log(`  ✓ ${granularity}: ${response.data.data.xAxis.data.length} 个数据点`);
      if (response.data.data.xAxis.data.length > 0) {
        console.log(`    示例时间格式: ${response.data.data.xAxis.data[0]}`);
      }
    } catch (error) {
      console.error(`  ✗ ${granularity} 失败:`, error.response?.data || error.message);
    }
  }
  
  return true;
}

/**
 * 测试无效参数
 */
async function testInvalidParameters() {
  console.log('\n测试无效参数处理:');
  
  // 测试无效的图表类型
  try {
    await axios.get(`${BASE_URL}/api/v1/statistics/charts/invalid_type`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('  ✗ 应该返回错误但成功了');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('  ✓ 无效图表类型正确返回 400 错误');
    } else {
      console.log('  ✗ 错误状态码不正确:', error.response?.status);
    }
  }
  
  // 测试无效的时间粒度
  try {
    await axios.get(`${BASE_URL}/api/v1/statistics/charts/trend`, {
      params: {
        granularity: 'invalid'
      },
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('  ✗ 应该返回错误但成功了');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('  ✓ 无效时间粒度正确返回 400 错误');
    } else {
      console.log('  ✗ 错误状态码不正确:', error.response?.status);
    }
  }
  
  return true;
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('========================================');
  console.log('统计数据可视化接口测试');
  console.log('========================================');
  
  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n测试终止：无法登录');
    return;
  }
  
  // 运行测试
  await testTrendChart();
  await testTypeDistributionChart();
  await testStatusDistributionChart();
  await testQualityRateChart();
  await testChartWithFilters();
  await testDifferentGranularities();
  await testInvalidParameters();
  
  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
