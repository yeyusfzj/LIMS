<template>
  <el-menu
    :default-active="activeMenu"
    :collapse="isCollapse"
    :unique-opened="true"
    class="side-menu"
    router
  >
    <!-- 样品管理 -->
    <el-sub-menu index="sample">
      <template #title>
        <el-icon><Box /></el-icon>
        <span>样品管理</span>
      </template>
      <el-menu-item index="/sample/list">
        <el-icon><List /></el-icon>
        <span>样品列表</span>
      </el-menu-item>
      <el-menu-item index="/sample/registration">
        <el-icon><DocumentAdd /></el-icon>
        <span>样品登记</span>
      </el-menu-item>
      <el-menu-item index="/sample/transfer">
        <el-icon><Position /></el-icon>
        <span>样品流转</span>
      </el-menu-item>
      <el-menu-item index="/sample/retention">
        <el-icon><FolderOpened /></el-icon>
        <span>留样管理</span>
      </el-menu-item>
    </el-sub-menu>

    <!-- 仪器管理 -->
    <el-sub-menu index="instrument">
      <template #title>
        <el-icon><Monitor /></el-icon>
        <span>仪器管理</span>
      </template>
      <el-menu-item index="/instrument/management">
        <el-icon><List /></el-icon>
        <span>仪器列表</span>
      </el-menu-item>
      <el-menu-item index="/instrument/registration">
        <el-icon><DocumentAdd /></el-icon>
        <span>仪器登记</span>
      </el-menu-item>
      <el-menu-item index="/instrument/transfer">
        <el-icon><Switch /></el-icon>
        <span>流转管理</span>
      </el-menu-item>
      <el-menu-item index="/instrument/statistics">
        <el-icon><DataAnalysis /></el-icon>
        <span>仪器统计</span>
      </el-menu-item>
    </el-sub-menu>

    <!-- 工作流管理 -->
    <el-sub-menu index="workflow">
      <template #title>
        <el-icon><Connection /></el-icon>
        <span>工作流管理</span>
      </template>
      <el-menu-item index="/workflow/designer">
        <el-icon><Edit /></el-icon>
        <span>工作流设计</span>
      </el-menu-item>
      <el-menu-item index="/workflow/templates">
        <el-icon><Document /></el-icon>
        <span>工作流模板</span>
      </el-menu-item>
      <el-menu-item index="/method/library">
        <el-icon><Reading /></el-icon>
        <span>检测方法库</span>
      </el-menu-item>
      <el-menu-item index="/workflow/tasks">
        <el-icon><Tickets /></el-icon>
        <span>任务管理</span>
      </el-menu-item>
      <el-menu-item index="/workflow/assignment">
        <el-icon><UserFilled /></el-icon>
        <span>任务派工</span>
      </el-menu-item>
    </el-sub-menu>

    <!-- 结果管理 -->
    <el-sub-menu index="result">
      <template #title>
        <el-icon><DataAnalysis /></el-icon>
        <span>结果管理</span>
      </template>
      <el-menu-item index="/result/entry">
        <el-icon><EditPen /></el-icon>
        <span>结果录入</span>
      </el-menu-item>
      <!-- 结果导入功能已隐藏 -->
      <!-- <el-menu-item index="/result/import">
        <el-icon><Upload /></el-icon>
        <span>结果导入</span>
      </el-menu-item> -->
      <el-menu-item index="/result/list">
        <el-icon><List /></el-icon>
        <span>结果查询</span>
      </el-menu-item>
      <el-menu-item index="/result/formula">
        <el-icon><Operation /></el-icon>
        <span>公式配置</span>
      </el-menu-item>
      <el-menu-item index="/result/anomaly">
        <el-icon><Warning /></el-icon>
        <span>异常管理</span>
      </el-menu-item>
    </el-sub-menu>

    <!-- 审核管理 -->
    <el-sub-menu index="audit">
      <template #title>
        <el-icon><CircleCheck /></el-icon>
        <span>审核管理</span>
      </template>
      <el-menu-item index="/audit/tasks">
        <el-icon><Tickets /></el-icon>
        <span>审核任务</span>
      </el-menu-item>
      <el-menu-item index="/audit/execute">
        <el-icon><Select /></el-icon>
        <span>审核执行</span>
      </el-menu-item>
      <el-menu-item index="/audit/statistics">
        <el-icon><DataLine /></el-icon>
        <span>审核统计</span>
      </el-menu-item>
    </el-sub-menu>

    <!-- 报告管理 -->
    <el-sub-menu index="report">
      <template #title>
        <el-icon><Notebook /></el-icon>
        <span>报告管理</span>
      </template>
      <el-menu-item index="/report/templates">
        <el-icon><Document /></el-icon>
        <span>报告模板</span>
      </el-menu-item>
      <el-menu-item index="/report/generator">
        <el-icon><DocumentAdd /></el-icon>
        <span>报告生成</span>
      </el-menu-item>
      <el-menu-item index="/report/signature">
        <el-icon><EditPen /></el-icon>
        <span>电子签名</span>
      </el-menu-item>
      <el-menu-item index="/report/distribution">
        <el-icon><Share /></el-icon>
        <span>报告分发</span>
      </el-menu-item>
    </el-sub-menu>

    <!-- 统计分析 -->
    <el-sub-menu index="statistics">
      <template #title>
        <el-icon><TrendCharts /></el-icon>
        <span>统计分析</span>
      </template>
      <el-menu-item index="/statistics/dashboard">
        <el-icon><DataBoard /></el-icon>
        <span>统计仪表板</span>
      </el-menu-item>
      <el-menu-item index="/statistics/audit-report">
        <el-icon><DataAnalysis /></el-icon>
        <span>审核统计报表</span>
      </el-menu-item>
      <el-menu-item index="/statistics/custom-report">
        <el-icon><DataLine /></el-icon>
        <span>自定义报表</span>
      </el-menu-item>
    </el-sub-menu>

    <!-- AI智能分析 -->
    <el-sub-menu index="ai">
      <template #title>
        <el-icon><MagicStick /></el-icon>
        <span>AI智能分析</span>
      </template>
      <el-menu-item index="/ai/analysis">
        <el-icon><DataAnalysis /></el-icon>
        <span>智能洞察</span>
      </el-menu-item>
      <el-menu-item index="/ai/agent">
        <el-icon><MagicStick /></el-icon>
        <span>AI Agent 智能体</span>
      </el-menu-item>
    </el-sub-menu>

    <!-- 系统管理 -->
    <el-sub-menu index="system">
      <template #title>
        <el-icon><Setting /></el-icon>
        <span>系统管理</span>
      </template>
      <el-menu-item index="/system/users">
        <el-icon><User /></el-icon>
        <span>用户管理</span>
      </el-menu-item>
      <el-menu-item index="/system/roles">
        <el-icon><Avatar /></el-icon>
        <span>角色权限</span>
      </el-menu-item>
      <el-menu-item index="/system/audit-log">
        <el-icon><Document /></el-icon>
        <span>审计日志</span>
      </el-menu-item>
      <el-menu-item index="/system/settings">
        <el-icon><Tools /></el-icon>
        <span>系统配置</span>
      </el-menu-item>
    </el-sub-menu>
  </el-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface Props {
  isCollapse?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isCollapse: false
})

const route = useRoute()

// 当前激活的菜单项
const activeMenu = computed(() => {
  return route.path
})
</script>

<style scoped>
.side-menu {
  height: 100%;
  border-right: none;
}

.side-menu:not(.el-menu--collapse) {
  width: 240px;
}
</style>
