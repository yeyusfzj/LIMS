# Bugfix Requirements Document

## Introduction

本文档描述样品列表页面翻页功能的bug修复需求。当前系统在用户点击翻页按钮时,虽然页码UI显示会更新,但实际发送给后端API的请求参数中page值仍然保持为1,导致始终返回第1页的数据,用户无法浏览其他页面的样品列表。

该bug影响用户体验,使得分页功能完全失效,用户无法查看第2页及后续页面的样品数据。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN 用户在样品列表页面点击第2页按钮 THEN 页码UI显示变为2,但API请求参数中page仍然为1,返回第1页数据

1.2 WHEN 用户在样品列表页面点击任意非第1页的页码 THEN 页码UI显示更新为目标页码,但API请求参数中page仍然为1,返回第1页数据

1.3 WHEN 用户通过页码跳转输入框输入目标页码(如5) THEN 页码UI显示变为5,但API请求参数中page仍然为1,返回第1页数据

### Expected Behavior (Correct)

2.1 WHEN 用户在样品列表页面点击第2页按钮 THEN 系统SHALL发送page=2的API请求,并返回第2页的样品数据,页码UI显示为2

2.2 WHEN 用户在样品列表页面点击任意非第1页的页码(如第N页) THEN 系统SHALL发送page=N的API请求,并返回第N页的样品数据,页码UI显示为N

2.3 WHEN 用户通过页码跳转输入框输入目标页码(如5) THEN 系统SHALL发送page=5的API请求,并返回第5页的样品数据,页码UI显示为5

### Unchanged Behavior (Regression Prevention)

3.1 WHEN 用户在第1页时点击刷新按钮 THEN 系统SHALL CONTINUE TO发送page=1的API请求,返回第1页数据

3.2 WHEN 用户修改每页显示数量(pageSize) THEN 系统SHALL CONTINUE TO重置到第1页并发送正确的pageSize参数

3.3 WHEN 用户应用筛选条件后 THEN 系统SHALL CONTINUE TO重置到第1页并发送正确的筛选参数

3.4 WHEN 用户在第1页浏览样品列表 THEN 系统SHALL CONTINUE TO正常显示第1页的样品数据

3.5 WHEN 用户修改排序条件 THEN 系统SHALL CONTINUE TO保持当前页码并发送正确的排序参数

## Bug Condition and Property

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type PaginationChangeEvent
  OUTPUT: boolean
  
  // 当用户触发页码变化且目标页码不是第1页时,bug条件成立
  RETURN X.targetPage > 1 AND X.eventType = 'PAGE_CHANGE'
END FUNCTION
```

### Property Specification

```pascal
// Property: Fix Checking - 页码变化时API请求参数正确性
FOR ALL X WHERE isBugCondition(X) DO
  apiRequest ← triggerPageChange'(X)
  ASSERT apiRequest.params.page = X.targetPage AND
         apiResponse.page = X.targetPage AND
         displayedPageNumber = X.targetPage
END FOR
```

### Preservation Goal

```pascal
// Property: Preservation Checking - 非翻页操作的行为保持不变
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT triggerPageChange(X) = triggerPageChange'(X)
END FOR
```

**关键定义:**
- **triggerPageChange**: 原始(未修复)的页码变化处理函数
- **triggerPageChange'**: 修复后的页码变化处理函数
- **X.targetPage**: 用户期望跳转到的目标页码
- **X.eventType**: 触发事件类型(PAGE_CHANGE, FILTER_CHANGE, SORT_CHANGE等)
