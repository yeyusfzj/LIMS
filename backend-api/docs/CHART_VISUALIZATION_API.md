# 统计数据可视化接口文档

## 概述

统计数据可视化接口提供了格式化的图表数据，可直接用于前端图表库（如 ECharts、Chart.js）进行数据可视化展示。

## API 端点

### 获取图表数据

**端点**: `GET /api/v1/statistics/charts/{chart_type}`

**描述**: 获取指定类型的图表数据，返回 ECharts 兼容的数据格式

**认证**: 需要 JWT 令牌

**路径参数**:
- `chart_type` (string, required): 图表类型
  - `trend`: 样品数量趋势图（折线图）
  - `type_distribution`: 样品类型分布图（饼图）
  - `status_distribution`: 样品状态分布图（柱状图）
  - `quality_rate`: 合格率趋势图（折线图）

**查询参数**:
- `start_date` (datetime, optional): 开始日期（ISO 8601 格式）
- `end_date` (datetime, optional): 结束日期（ISO 8601 格式）
- `granularity` (string, optional): 时间粒度，默认 "day"
  - `day`: 按天统计
  - `week`: 按周统计
  - `month`: 按月统计
  - `year`: 按年统计
- `sample_type` (string, optional): 样品类型过滤
- `use_cache` (boolean, optional): 是否使用缓存，默认 true

**响应格式**:
```json
{
  "message": "获取图表数据成功",
  "data": {
    "type": "line",
    "xAxis": {
      "type": "category",
      "data": ["2026-01-01", "2026-01-02", "2026-01-03"],
      "name": "时间"
    },
    "yAxis": {
      "type": "value",
      "name": "样品数量"
    },
    "series": [
      {
        "name": "样品数量",
        "type": "line",
        "data": [120, 132, 101],
        "smooth": true
      }
    ]
  }
}
```

## 图表类型详解

### 1. 趋势图 (trend)

**用途**: 展示样品数量随时间的变化趋势

**图表类型**: 折线图

**数据格式**:
```json
{
  "type": "line",
  "xAxis": {
    "type": "category",
    "data": ["2026-01-01", "2026-01-02", "2026-01-03"],
    "name": "时间"
  },
  "yAxis": {
    "type": "value",
    "name": "样品数量"
  },
  "series": [
    {
      "name": "样品数量",
      "type": "line",
      "data": [120, 132, 101],
      "smooth": true
    }
  ]
}
```

**使用示例**:
```javascript
// 获取近30天的趋势数据
const response = await axios.get('/api/v1/statistics/charts/trend', {
  params: {
    granularity: 'day',
    start_date: '2026-01-01T00:00:00Z',
    end_date: '2026-01-30T23:59:59Z'
  },
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 使用 ECharts 渲染
const chart = echarts.init(document.getElementById('chart'));
chart.setOption(response.data.data);
```

### 2. 类型分布图 (type_distribution)

**用途**: 展示不同样品类型的数量分布

**图表类型**: 饼图

**数据格式**:
```json
{
  "type": "pie",
  "series": [
    {
      "name": "样品类型",
      "type": "pie",
      "radius": ["40%", "70%"],
      "data": [
        { "name": "水质样品", "value": 335 },
        { "name": "土壤样品", "value": 234 },
        { "name": "空气样品", "value": 135 }
      ],
      "emphasis": {
        "itemStyle": {
          "shadowBlur": 10,
          "shadowOffsetX": 0,
          "shadowColor": "rgba(0, 0, 0, 0.5)"
        }
      }
    }
  ]
}
```

**使用示例**:
```javascript
const response = await axios.get('/api/v1/statistics/charts/type_distribution', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const chart = echarts.init(document.getElementById('chart'));
chart.setOption(response.data.data);
```

### 3. 状态分布图 (status_distribution)

**用途**: 展示不同状态样品的数量分布

**图表类型**: 柱状图

**数据格式**:
```json
{
  "type": "bar",
  "xAxis": {
    "type": "category",
    "data": ["已登记", "检测中", "已完成", "已发布"],
    "name": "状态"
  },
  "yAxis": {
    "type": "value",
    "name": "样品数量"
  },
  "series": [
    {
      "name": "样品数量",
      "type": "bar",
      "data": [120, 200, 150, 80],
      "itemStyle": {
        "color": "#409EFF"
      }
    }
  ]
}
```

**使用示例**:
```javascript
const response = await axios.get('/api/v1/statistics/charts/status_distribution', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const chart = echarts.init(document.getElementById('chart'));
chart.setOption(response.data.data);
```

### 4. 合格率图 (quality_rate)

**用途**: 展示样品合格率随时间的变化趋势

**图表类型**: 折线图

**数据格式**:
```json
{
  "type": "line",
  "xAxis": {
    "type": "category",
    "data": ["2026-01-01", "2026-01-02", "2026-01-03"],
    "name": "时间"
  },
  "yAxis": {
    "type": "value",
    "name": "合格率 (%)",
    "min": 0,
    "max": 100
  },
  "series": [
    {
      "name": "合格率",
      "type": "line",
      "data": [98.5, 97.8, 99.2],
      "smooth": true,
      "itemStyle": {
        "color": "#67C23A"
      }
    }
  ]
}
```

**使用示例**:
```javascript
const response = await axios.get('/api/v1/statistics/charts/quality_rate', {
  params: {
    granularity: 'month',
    start_date: '2026-01-01T00:00:00Z',
    end_date: '2026-12-31T23:59:59Z'
  },
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const chart = echarts.init(document.getElementById('chart'));
chart.setOption(response.data.data);
```

## 时间粒度说明

### day (按天)
- 时间格式: `YYYY-MM-DD`
- 示例: `2026-01-15`
- 适用场景: 查看近期详细趋势

### week (按周)
- 时间格式: `YYYY-WXX`
- 示例: `2026-W03`
- 适用场景: 查看周度趋势

### month (按月)
- 时间格式: `YYYY-MM`
- 示例: `2026-01`
- 适用场景: 查看月度趋势

### year (按年)
- 时间格式: `YYYY`
- 示例: `2026`
- 适用场景: 查看年度趋势

## 过滤条件

### 时间范围过滤

```javascript
// 查询指定时间范围的数据
const response = await axios.get('/api/v1/statistics/charts/trend', {
  params: {
    start_date: '2026-01-01T00:00:00Z',
    end_date: '2026-01-31T23:59:59Z',
    granularity: 'day'
  },
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 样品类型过滤

```javascript
// 只查询特定类型的样品
const response = await axios.get('/api/v1/statistics/charts/trend', {
  params: {
    sample_type: '水质样品',
    granularity: 'day'
  },
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 缓存机制

图表数据默认启用缓存，缓存时间为 10 分钟。

### 使用缓存（默认）
```javascript
const response = await axios.get('/api/v1/statistics/charts/trend', {
  params: {
    use_cache: true  // 或省略此参数
  },
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 禁用缓存
```javascript
const response = await axios.get('/api/v1/statistics/charts/trend', {
  params: {
    use_cache: false  // 强制重新查询数据库
  },
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 清除缓存

管理员可以清除统计缓存：

```javascript
await axios.delete('/api/v1/statistics/cache', {
  params: {
    pattern: 'stats:chart_*'  // 清除所有图表缓存
  },
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 错误处理

### 400 Bad Request - 无效参数

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "不支持的图表类型: invalid_type，支持的类型: trend, type_distribution, status_distribution, quality_rate"
  }
}
```

### 401 Unauthorized - 未授权

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未授权访问"
  }
}
```

### 500 Internal Server Error - 服务器错误

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "获取图表数据失败"
  }
}
```

## 前端集成示例

### Vue 3 + ECharts

```vue
<template>
  <div ref="chartRef" style="width: 100%; height: 400px;"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import axios from 'axios'

const chartRef = ref(null)

onMounted(async () => {
  // 获取图表数据
  const response = await axios.get('/api/v1/statistics/charts/trend', {
    params: {
      granularity: 'day',
      use_cache: true
    }
  })
  
  // 初始化图表
  const chart = echarts.init(chartRef.value)
  
  // 设置图表选项
  chart.setOption({
    title: {
      text: '样品数量趋势'
    },
    tooltip: {
      trigger: 'axis'
    },
    ...response.data.data
  })
})
</script>
```

### React + ECharts

```jsx
import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import axios from 'axios'

function TrendChart() {
  const chartRef = useRef(null)
  
  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get('/api/v1/statistics/charts/trend', {
        params: {
          granularity: 'day',
          use_cache: true
        }
      })
      
      const chart = echarts.init(chartRef.current)
      chart.setOption({
        title: {
          text: '样品数量趋势'
        },
        tooltip: {
          trigger: 'axis'
        },
        ...response.data.data
      })
    }
    
    fetchData()
  }, [])
  
  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
}

export default TrendChart
```

## 性能优化建议

1. **使用缓存**: 对于不需要实时数据的场景，启用缓存可以显著提升响应速度
2. **合理选择时间粒度**: 查询长时间范围时使用较粗的粒度（如 month、year）
3. **限制时间范围**: 避免查询过长的时间范围，建议不超过 1 年
4. **使用过滤条件**: 通过样品类型等条件过滤可以减少数据量
5. **异步加载**: 在前端使用异步加载和骨架屏提升用户体验

## 与 Node.js 后端的兼容性

FastAPI 后端的图表数据接口与 Node.js 后端保持完全兼容：

- ✅ 相同的 API 路径格式
- ✅ 相同的请求参数
- ✅ 相同的响应数据格式
- ✅ 相同的错误处理机制
- ✅ 相同的 ECharts 数据结构

前端可以无缝切换后端服务，无需修改代码。

## 相关文档

- [统计分析 API 文档](./STATISTICS_API.md)
- [数据导出指南](./DATA_EXPORT_GUIDE.md)
- [缓存策略说明](./CACHE_STRATEGY.md)
- [ECharts 官方文档](https://echarts.apache.org/zh/index.html)
