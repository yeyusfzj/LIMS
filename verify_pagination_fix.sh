#!/bin/bash

echo "=========================================="
echo "验证分页功能修复"
echo "=========================================="
echo ""

echo "1. 检查 Store 文件修改..."
if grep -q "currentPage: 1" vue-project/src/stores/sample.ts; then
    echo "   ✅ Store 使用 currentPage"
else
    echo "   ❌ Store 未使用 currentPage"
fi

if grep -q "pagination.value.currentPage" vue-project/src/stores/sample.ts; then
    echo "   ✅ fetchSamples 使用 currentPage"
else
    echo "   ❌ fetchSamples 未使用 currentPage"
fi

echo ""
echo "2. 检查组件文件修改..."
if grep -q "sampleStore.pagination.currentPage" vue-project/src/views/sample/SampleManagement.vue; then
    echo "   ✅ 组件直接绑定 sampleStore.pagination"
else
    echo "   ❌ 组件未直接绑定 sampleStore.pagination"
fi

if grep -q "const pagination = computed" vue-project/src/views/sample/SampleManagement.vue; then
    echo "   ❌ 组件仍使用 computed pagination（应删除）"
else
    echo "   ✅ 组件已删除 computed pagination"
fi

echo ""
echo "3. 检查后端排序修复..."
if grep -q "order_by=\[Sample.created_at.desc(), Sample.id.asc()\]" backend-api/app/services/sample_service.py; then
    echo "   ✅ 后端使用稳定排序"
else
    echo "   ❌ 后端未使用稳定排序"
fi

echo ""
echo "=========================================="
echo "验证完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 刷新浏览器页面（Ctrl+Shift+R）"
echo "2. 打开开发者工具（F12）"
echo "3. 进入样品管理页面"
echo "4. 点击'下一页'按钮"
echo "5. 检查 Console 日志和数据变化"
echo ""
