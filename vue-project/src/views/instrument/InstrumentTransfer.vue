<template>
  <div class="instrument-transfer">
    <!-- 标签页 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 流转管理 -->
      <el-tab-pane label="流转管理" name="transfer">
        <!-- 操作栏 -->
        <el-card class="operation-bar" shadow="never">
          <el-space wrap>
            <el-button type="primary" :icon="Plus" @click="handleCreateTransfer">
              新建流转申请
            </el-button>
            <el-button :icon="Refresh" @click="handleRefresh">
              刷新
            </el-button>
          </el-space>
        </el-card>

        <!-- 筛选栏 -->
        <el-card class="filter-bar" shadow="never">
          <el-form :inline="true" :model="transferFilter" @submit.prevent="handleSearchTransfer">
            <el-form-item label="仪器编码">
              <el-input
                v-model="transferFilter.instrumentCode"
                placeholder="请输入仪器编码"
                clearable
                style="width: 200px"
              />
            </el-form-item>
            
            <el-form-item label="流转状态">
              <el-select
                v-model="transferFilter.status"
                placeholder="请选择状态"
                clearable
                style="width: 150px"
              >
                <el-option
                  v-for="(label, value) in TransferStatusLabels"
                  :key="value"
                  :label="label"
                  :value="value"
                />
              </el-select>
            </el-form-item>
            
            <el-form-item label="目标部门">
              <el-input
                v-model="transferFilter.toDepartment"
                placeholder="请输入目标部门"
                clearable
                style="width: 200px"
              />
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleSearchTransfer">
                搜索
              </el-button>
              <el-button @click="handleResetTransfer">
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 表格 -->
        <el-card shadow="never">
          <el-table
            v-loading="transferLoading"
            :data="transferData"
            stripe
            style="width: 100%"
          >
            <el-table-column prop="instrument.code" label="仪器编码" width="150" />
            <el-table-column prop="instrument.name" label="仪器名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="fromDepartment" label="源部门" width="120" />
            <el-table-column prop="toDepartment" label="目标部门" width="120" />
            <el-table-column prop="fromResponsible" label="源负责人" width="100" />
            <el-table-column prop="toResponsible" label="目标负责人" width="100" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getTransferStatusType(row.status)">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="申请时间" width="160">
              <template #default="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleViewTransfer(row)">
                  查看
                </el-button>
                <el-button
                  v-if="(row.status === '待确认' || row.status === 'PENDING') && canConfirm(row)"
                  link
                  type="success"
                  @click="handleConfirm(row)"
                >
                  确认
                </el-button>
                <el-button
                  v-if="(row.status === '待确认' || row.status === 'PENDING') && canConfirm(row)"
                  link
                  type="danger"
                  @click="handleReject(row)"
                >
                  拒绝
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="transferPagination.page"
              v-model:page-size="transferPagination.pageSize"
              :total="transferPagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleTransferSizeChange"
              @current-change="handleTransferPageChange"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 维护管理 -->
      <el-tab-pane label="维护管理" name="maintenance">
        <!-- 操作栏 -->
        <el-card class="operation-bar" shadow="never">
          <el-space wrap>
            <el-button type="primary" :icon="Plus" @click="handleCreateMaintenance">
              新建维护记录
            </el-button>
            <el-button :icon="Bell" @click="showReminders">
              维护提醒
            </el-button>
            <el-button :icon="Refresh" @click="handleRefresh">
              刷新
            </el-button>
          </el-space>
        </el-card>

        <!-- 筛选栏 -->
        <el-card class="filter-bar" shadow="never">
          <el-form :inline="true" :model="maintenanceFilter" @submit.prevent="handleSearchMaintenance">
            <el-form-item label="仪器编码">
              <el-input
                v-model="maintenanceFilter.instrumentCode"
                placeholder="请输入仪器编码"
                clearable
                style="width: 200px"
              />
            </el-form-item>
            
            <el-form-item label="维护类型">
              <el-select
                v-model="maintenanceFilter.type"
                placeholder="请选择类型"
                clearable
                style="width: 150px"
              >
                <el-option label="预防性维护" value="PREVENTIVE" />
                <el-option label="纠正性维护" value="CORRECTIVE" />
                <el-option label="紧急维护" value="EMERGENCY" />
              </el-select>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleSearchMaintenance">
                搜索
              </el-button>
              <el-button @click="handleResetMaintenance">
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 表格 -->
        <el-card shadow="never">
          <el-table
            v-loading="maintenanceLoading"
            :data="maintenanceData"
            stripe
            style="width: 100%"
          >
            <el-table-column prop="instrument.code" label="仪器编码" width="150" />
            <el-table-column prop="instrument.name" label="仪器名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="type" label="维护类型" width="120">
              <template #default="{ row }">
                {{ getMaintenanceTypeLabel(row.type) }}
              </template>
            </el-table-column>
            <el-table-column prop="maintenanceDate" label="维护日期" width="120">
              <template #default="{ row }">
                {{ formatDate(row.maintenanceDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="performedBy" label="执行人" width="100" />
            <el-table-column prop="cost" label="费用(元)" width="100">
              <template #default="{ row }">
                {{ row.cost ? `¥${row.cost}` : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="description" label="维护内容" min-width="200" show-overflow-tooltip />
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleViewMaintenance(row)">
                  查看
                </el-button>
                <el-button link type="primary" @click="handleEditMaintenance(row)">
                  编辑
                </el-button>
                <el-button link type="danger" @click="handleDeleteMaintenance(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="maintenancePagination.page"
              v-model:page-size="maintenancePagination.pageSize"
              :total="maintenancePagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleMaintenanceSizeChange"
              @current-change="handleMaintenancePageChange"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 报废管理 -->
      <el-tab-pane label="报废管理" name="disposal">
        <!-- 操作栏 -->
        <el-card class="operation-bar" shadow="never">
          <el-space wrap>
            <el-button type="primary" :icon="Plus" @click="handleCreateDisposal">
              新建报废申请
            </el-button>
            <el-button :icon="Refresh" @click="handleRefresh">
              刷新
            </el-button>
          </el-space>
        </el-card>

        <!-- 筛选栏 -->
        <el-card class="filter-bar" shadow="never">
          <el-form :inline="true" :model="disposalFilter" @submit.prevent="handleSearchDisposal">
            <el-form-item label="仪器编码">
              <el-input
                v-model="disposalFilter.instrumentCode"
                placeholder="请输入仪器编码"
                clearable
                style="width: 200px"
              />
            </el-form-item>
            
            <el-form-item label="报废原因">
              <el-select
                v-model="disposalFilter.reason"
                placeholder="请选择原因"
                clearable
                style="width: 150px"
              >
                <el-option label="设备老化" value="AGING" />
                <el-option label="无法修复" value="IRREPARABLE" />
                <el-option label="技术淘汰" value="OBSOLETE" />
                <el-option label="其他" value="OTHER" />
              </el-select>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleSearchDisposal">
                搜索
              </el-button>
              <el-button @click="handleResetDisposal">
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 表格 -->
        <el-card shadow="never">
          <el-table
            v-loading="disposalLoading"
            :data="disposalData"
            stripe
            style="width: 100%"
          >
            <el-table-column prop="instrument.code" label="仪器编码" width="150" />
            <el-table-column prop="instrument.name" label="仪器名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="reason" label="报废原因" width="120">
              <template #default="{ row }">
                {{ getDisposalReasonLabel(row.reason) }}
              </template>
            </el-table-column>
            <el-table-column prop="disposalDate" label="报废日期" width="120">
              <template #default="{ row }">
                {{ row.disposalDate ? formatDate(row.disposalDate) : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="approvedBy" label="审批人" width="100">
              <template #default="{ row }">
                {{ row.approvedBy || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="description" label="详细说明" min-width="200" show-overflow-tooltip />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleViewDisposal(row)">
                  查看
                </el-button>
                <el-button
                  v-if="row.status === 'PENDING' && canApprove"
                  link
                  type="success"
                  @click="handleApproveDisposal(row)"
                >
                  批准
                </el-button>
                <el-button
                  v-if="row.status === 'PENDING' && canApprove"
                  link
                  type="danger"
                  @click="handleRejectDisposal(row)"
                >
                  拒绝
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="disposalPagination.page"
              v-model:page-size="disposalPagination.pageSize"
              :total="disposalPagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleDisposalSizeChange"
              @current-change="handleDisposalPageChange"
            />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 流转申请对话框 -->
    <TransferDialog
      v-model="transferDialogVisible"
      :instrument-id="selectedInstrumentId"
      @success="handleTransferSuccess"
    />

    <!-- 流转详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="流转详情"
      width="600px"
    >
      <el-descriptions v-if="currentTransfer" :column="2" border>
        <el-descriptions-item label="仪器编码">
          {{ currentTransfer.instrument?.code }}
        </el-descriptions-item>
        <el-descriptions-item label="仪器名称">
          {{ currentTransfer.instrument?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="源部门">
          {{ currentTransfer.fromDepartment }}
        </el-descriptions-item>
        <el-descriptions-item label="目标部门">
          {{ currentTransfer.toDepartment }}
        </el-descriptions-item>
        <el-descriptions-item label="源负责人">
          {{ currentTransfer.fromResponsible }}
        </el-descriptions-item>
        <el-descriptions-item label="目标负责人">
          {{ currentTransfer.toResponsible }}
        </el-descriptions-item>
        <el-descriptions-item label="流转状态">
          <el-tag :type="getTransferStatusType(currentTransfer.status)">
            {{ TransferStatusLabels[currentTransfer.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="预期归还时间">
          {{ currentTransfer.expectedReturnDate ? formatDate(currentTransfer.expectedReturnDate) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="流转原因" :span="2">
          {{ currentTransfer.transferReason || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="申请时间" :span="2">
          {{ formatDateTime(currentTransfer.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentTransfer.confirmedAt" label="确认时间" :span="2">
          {{ formatDateTime(currentTransfer.confirmedAt) }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentTransfer.rejectedAt" label="拒绝时间" :span="2">
          {{ formatDateTime(currentTransfer.rejectedAt) }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentTransfer.rejectionReason" label="拒绝原因" :span="2">
          {{ currentTransfer.rejectionReason }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 确认对话框 -->
    <el-dialog
      v-model="confirmDialogVisible"
      title="确认流转"
      width="400px"
    >
      <p>确认接收该仪器吗?</p>
      <template #footer>
        <el-button @click="confirmDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmTransfer">确认</el-button>
      </template>
    </el-dialog>

    <!-- 拒绝对话框 -->
    <el-dialog
      v-model="rejectDialogVisible"
      title="拒绝流转"
      width="400px"
    >
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="拒绝原因" required>
          <el-input
            v-model="rejectForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入拒绝原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="rejectTransfer">确认拒绝</el-button>
      </template>
    </el-dialog>

    <!-- 维护记录对话框 -->
    <MaintenanceDialog
      v-model="maintenanceDialogVisible"
      :instrument-id="selectedInstrumentId"
      :maintenance-id="selectedMaintenanceId"
      @success="handleMaintenanceSuccess"
    />

    <!-- 维护详情对话框 -->
    <el-dialog
      v-model="maintenanceDetailDialogVisible"
      title="维护记录详情"
      width="600px"
    >
      <el-descriptions v-if="currentMaintenance" :column="2" border>
        <el-descriptions-item label="仪器编码">
          {{ currentMaintenance.instrument?.code }}
        </el-descriptions-item>
        <el-descriptions-item label="仪器名称">
          {{ currentMaintenance.instrument?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="维护日期">
          {{ formatDate(currentMaintenance.maintenanceDate) }}
        </el-descriptions-item>
        <el-descriptions-item label="维护类型">
          <el-tag>{{ getMaintenanceTypeLabel(currentMaintenance.type) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="执行人">
          {{ currentMaintenance.performedBy }}
        </el-descriptions-item>
        <el-descriptions-item label="费用">
          {{ currentMaintenance.cost ? `¥${currentMaintenance.cost}` : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="维护内容" :span="2">
          {{ currentMaintenance.description }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentMaintenance.remarks" label="备注" :span="2">
          {{ currentMaintenance.remarks }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 维护提醒对话框 -->
    <el-dialog
      v-model="remindersDialogVisible"
      title="维护提醒"
      width="800px"
    >
      <el-table :data="reminders" stripe>
        <el-table-column prop="instrumentCode" label="仪器编码" width="150" />
        <el-table-column prop="instrumentName" label="仪器名称" min-width="180" />
        <el-table-column prop="nextMaintenanceDate" label="下次维护日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.nextMaintenanceDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="daysUntilMaintenance" label="剩余天数" width="100">
          <template #default="{ row }">
            <el-tag :type="row.daysUntilMaintenance <= 7 ? 'danger' : 'warning'">
              {{ row.daysUntilMaintenance }}天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleAddMaintenance(row.instrumentId)">
              添加维护
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 报废申请对话框 -->
    <DisposalDialog
      v-model="disposalDialogVisible"
      :instrument-id="selectedInstrumentId"
      @success="handleDisposalSuccess"
    />

    <!-- 报废详情对话框 -->
    <el-dialog
      v-model="disposalDetailDialogVisible"
      title="报废申请详情"
      width="600px"
    >
      <el-descriptions v-if="currentDisposal" :column="2" border>
        <el-descriptions-item label="仪器编码">
          {{ currentDisposal.instrument?.code }}
        </el-descriptions-item>
        <el-descriptions-item label="仪器名称">
          {{ currentDisposal.instrument?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="报废原因">
          {{ getDisposalReasonLabel(currentDisposal.reason) }}
        </el-descriptions-item>
        <el-descriptions-item label="报废日期">
          {{ currentDisposal.disposalDate ? formatDate(currentDisposal.disposalDate) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="详细说明" :span="2">
          {{ currentDisposal.description }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentDisposal.approvedBy" label="审批人">
          {{ currentDisposal.approvedBy }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentDisposal.approvedAt" label="审批时间">
          {{ formatDateTime(currentDisposal.approvedAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 批准报废对话框 -->
    <el-dialog
      v-model="approveDialogVisible"
      title="批准报废"
      width="400px"
    >
      <p>确认批准该仪器的报废申请吗?</p>
      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="approveDisposal">确认批准</el-button>
      </template>
    </el-dialog>

    <!-- 拒绝报废对话框 -->
    <el-dialog
      v-model="disposalRejectDialogVisible"
      title="拒绝报废"
      width="400px"
    >
      <el-form :model="disposalRejectForm" label-width="80px">
        <el-form-item label="拒绝原因" required>
          <el-input
            v-model="disposalRejectForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入拒绝原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="disposalRejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="rejectDisposal">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search, Bell } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import instrumentService from '@/services/instrumentService'
import TransferDialog from '@/components/instrument/TransferDialog.vue'
import MaintenanceDialog from '@/components/instrument/MaintenanceDialog.vue'
import DisposalDialog from '@/components/instrument/DisposalDialog.vue'
import type { InstrumentTransfer, MaintenanceRecord, DisposalRecord, MaintenanceReminder } from '@/types/instrument'
import { TransferStatusLabels, MaintenanceTypeLabels, DisposalStatusLabels } from '@/types/instrument'

// Store
const authStore = useAuthStore()

// 当前激活的标签页
const activeTab = ref('transfer')

// ========== 流转管理 ==========
// 状态
const transferLoading = ref(false)
const transferData = ref<InstrumentTransfer[]>([])
const transferDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const confirmDialogVisible = ref(false)
const rejectDialogVisible = ref(false)
const selectedInstrumentId = ref<string>('')
const currentTransfer = ref<InstrumentTransfer | null>(null)

// 筛选表单
const transferFilter = reactive({
  instrumentCode: '',
  status: '',
  toDepartment: ''
})

// 分页
const transferPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 拒绝表单
const rejectForm = reactive({
  reason: ''
})

// ========== 维护管理 ==========
const maintenanceLoading = ref(false)
const maintenanceData = ref<MaintenanceRecord[]>([])
const maintenanceDialogVisible = ref(false)
const maintenanceDetailDialogVisible = ref(false)
const remindersDialogVisible = ref(false)
const selectedMaintenanceId = ref<string>('')
const currentMaintenance = ref<MaintenanceRecord | null>(null)
const reminders = ref<MaintenanceReminder[]>([])

// 维护筛选表单
const maintenanceFilter = reactive({
  instrumentCode: '',
  type: '',
  dateRange: null as any
})

// 维护分页
const maintenancePagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// ========== 报废管理 ==========
const disposalLoading = ref(false)
const disposalData = ref<DisposalRecord[]>([])
const disposalDialogVisible = ref(false)
const disposalDetailDialogVisible = ref(false)
const approveDialogVisible = ref(false)
const disposalRejectDialogVisible = ref(false)
const currentDisposal = ref<DisposalRecord | null>(null)

// 报废筛选表单
const disposalFilter = reactive({
  instrumentCode: '',
  reason: '',
  dateRange: null as any
})

// 报废分页
const disposalPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 报废拒绝表单
const disposalRejectForm = reactive({
  reason: ''
})

// 是否有审批权限
const canApprove = computed(() => {
  return authStore.hasPermission('disposal:approve')
})

// 标签页切换
const handleTabChange = (tabName: string) => {
  console.log('切换到标签页:', tabName)
  if (tabName === 'transfer') {
    fetchTransfers()
  } else if (tabName === 'maintenance') {
    fetchMaintenanceRecords()
  } else if (tabName === 'disposal') {
    fetchDisposals()
  }
}

// ========== 流转管理方法 ==========
// 获取流转列表
const fetchTransfers = async () => {
  transferLoading.value = true
  try {
    const result = await instrumentService.getTransfers({
      page: transferPagination.page,
      pageSize: transferPagination.pageSize,
      ...transferFilter
    })
    
    transferData.value = result.items
    transferPagination.total = result.total
  } catch (error: any) {
    ElMessage.error(error.message || '获取流转列表失败')
  } finally {
    transferLoading.value = false
  }
}

// 搜索流转
const handleSearchTransfer = () => {
  transferPagination.page = 1
  fetchTransfers()
}

// 重置流转筛选
const handleResetTransfer = () => {
  transferFilter.instrumentCode = ''
  transferFilter.status = ''
  transferFilter.toDepartment = ''
  transferPagination.page = 1
  fetchTransfers()
}

// 刷新
const handleRefresh = () => {
  if (activeTab.value === 'transfer') {
    fetchTransfers()
  } else if (activeTab.value === 'maintenance') {
    fetchMaintenanceRecords()
  } else if (activeTab.value === 'disposal') {
    fetchDisposals()
  }
}

// 新建流转
const handleCreateTransfer = () => {
  selectedInstrumentId.value = ''
  transferDialogVisible.value = true
}

// 查看流转详情
const handleViewTransfer = (row: InstrumentTransfer) => {
  currentTransfer.value = row
  detailDialogVisible.value = true
}

// 判断是否可以确认
const canConfirm = (row: InstrumentTransfer) => {
  // 只有目标负责人可以确认,且状态为待确认
  return (row.status === '待确认' || row.status === 'PENDING') && 
         row.toResponsible === authStore.user?.username
}

// 确认流转
const handleConfirm = (row: InstrumentTransfer) => {
  currentTransfer.value = row
  confirmDialogVisible.value = true
}

const confirmTransfer = async () => {
  if (!currentTransfer.value) return
  
  try {
    await instrumentService.confirmTransfer(currentTransfer.value.id, {
      confirmed: true
    })
    
    ElMessage.success('确认成功')
    confirmDialogVisible.value = false
    fetchTransfers()
  } catch (error: any) {
    ElMessage.error(error.message || '确认失败')
  }
}

// 拒绝流转
const handleReject = (row: InstrumentTransfer) => {
  currentTransfer.value = row
  rejectForm.reason = ''
  rejectDialogVisible.value = true
}

const rejectTransfer = async () => {
  if (!currentTransfer.value) return
  
  if (!rejectForm.reason.trim()) {
    ElMessage.warning('请输入拒绝原因')
    return
  }
  
  try {
    await instrumentService.rejectTransfer(currentTransfer.value.id, rejectForm.reason)
    
    ElMessage.success('已拒绝')
    rejectDialogVisible.value = false
    fetchTransfers()
  } catch (error: any) {
    ElMessage.error(error.message || '拒绝失败')
  }
}

// 流转成功回调
const handleTransferSuccess = () => {
  transferDialogVisible.value = false
  fetchTransfers()
}

// 流转分页变化
const handleTransferPageChange = (page: number) => {
  transferPagination.page = page
  fetchTransfers()
}

const handleTransferSizeChange = (size: number) => {
  transferPagination.pageSize = size
  transferPagination.page = 1
  fetchTransfers()
}

// ========== 维护管理方法 ==========
// 获取维护记录列表
const fetchMaintenanceRecords = async () => {
  maintenanceLoading.value = true
  try {
    const params: any = {
      page: maintenancePagination.page,
      pageSize: maintenancePagination.pageSize,
      instrumentCode: maintenanceFilter.instrumentCode,
      type: maintenanceFilter.type
    }
    
    if (maintenanceFilter.dateRange && maintenanceFilter.dateRange.length === 2) {
      params.startDate = maintenanceFilter.dateRange[0].toISOString()
      params.endDate = maintenanceFilter.dateRange[1].toISOString()
    }
    
    // 注意:这里需要后端提供维护记录列表查询接口
    // 暂时使用模拟数据
    maintenanceData.value = []
    maintenancePagination.total = 0
  } catch (error: any) {
    ElMessage.error(error.message || '获取维护记录失败')
  } finally {
    maintenanceLoading.value = false
  }
}

// 搜索维护记录
const handleSearchMaintenance = () => {
  maintenancePagination.page = 1
  fetchMaintenanceRecords()
}

// 重置维护筛选
const handleResetMaintenance = () => {
  maintenanceFilter.instrumentCode = ''
  maintenanceFilter.type = ''
  maintenanceFilter.dateRange = null
  maintenancePagination.page = 1
  fetchMaintenanceRecords()
}

// 新建维护记录
const handleCreateMaintenance = () => {
  selectedInstrumentId.value = ''
  selectedMaintenanceId.value = ''
  maintenanceDialogVisible.value = true
}

// 查看维护详情
const handleViewMaintenance = (row: MaintenanceRecord) => {
  currentMaintenance.value = row
  maintenanceDetailDialogVisible.value = true
}

// 编辑维护记录
const handleEditMaintenance = (row: MaintenanceRecord) => {
  selectedInstrumentId.value = row.instrumentId
  selectedMaintenanceId.value = row.id
  maintenanceDialogVisible.value = true
}

// 删除维护记录
const handleDeleteMaintenance = async (row: MaintenanceRecord) => {
  try {
    await ElMessageBox.confirm('确定要删除这条维护记录吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await instrumentService.deleteMaintenance(row.id)
    ElMessage.success('删除成功')
    fetchMaintenanceRecords()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 显示维护提醒
const showReminders = async () => {
  try {
    reminders.value = await instrumentService.getMaintenanceReminders()
    remindersDialogVisible.value = true
  } catch (error: any) {
    ElMessage.error(error.message || '获取维护提醒失败')
  }
}

// 添加维护记录
const handleAddMaintenance = (instrumentId: string) => {
  selectedInstrumentId.value = instrumentId
  selectedMaintenanceId.value = ''
  remindersDialogVisible.value = false
  maintenanceDialogVisible.value = true
}

// 维护记录成功回调
const handleMaintenanceSuccess = () => {
  maintenanceDialogVisible.value = false
  fetchMaintenanceRecords()
}

// 维护分页变化
const handleMaintenancePageChange = (page: number) => {
  maintenancePagination.page = page
  fetchMaintenanceRecords()
}

const handleMaintenanceSizeChange = (size: number) => {
  maintenancePagination.pageSize = size
  maintenancePagination.page = 1
  fetchMaintenanceRecords()
}

// 获取维护类型标签
const getMaintenanceTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    PREVENTIVE: '预防性维护',
    CORRECTIVE: '纠正性维护',
    EMERGENCY: '紧急维护'
  }
  return labels[type] || type
}

// ========== 报废管理方法 ==========
// 获取报废申请列表
const fetchDisposals = async () => {
  disposalLoading.value = true
  try {
    const params: any = {
      page: disposalPagination.page,
      pageSize: disposalPagination.pageSize,
      instrumentCode: disposalFilter.instrumentCode,
      reason: disposalFilter.reason
    }
    
    if (disposalFilter.dateRange && disposalFilter.dateRange.length === 2) {
      params.startDate = disposalFilter.dateRange[0].toISOString()
      params.endDate = disposalFilter.dateRange[1].toISOString()
    }
    
    const result = await instrumentService.getDisposals(params)
    
    disposalData.value = result.items
    disposalPagination.total = result.total
  } catch (error: any) {
    ElMessage.error(error.message || '获取报废申请列表失败')
  } finally {
    disposalLoading.value = false
  }
}

// 搜索报废申请
const handleSearchDisposal = () => {
  disposalPagination.page = 1
  fetchDisposals()
}

// 重置报废筛选
const handleResetDisposal = () => {
  disposalFilter.instrumentCode = ''
  disposalFilter.reason = ''
  disposalFilter.dateRange = null
  disposalPagination.page = 1
  fetchDisposals()
}

// 新建报废申请
const handleCreateDisposal = () => {
  selectedInstrumentId.value = ''
  disposalDialogVisible.value = true
}

// 查看报废详情
const handleViewDisposal = (row: DisposalRecord) => {
  currentDisposal.value = row
  disposalDetailDialogVisible.value = true
}

// 批准报废
const handleApproveDisposal = (row: DisposalRecord) => {
  currentDisposal.value = row
  approveDialogVisible.value = true
}

const approveDisposal = async () => {
  if (!currentDisposal.value) return
  
  try {
    await instrumentService.approveDisposal(currentDisposal.value.id, {
      approved: true
    })
    
    ElMessage.success('批准成功')
    approveDialogVisible.value = false
    fetchDisposals()
  } catch (error: any) {
    ElMessage.error(error.message || '批准失败')
  }
}

// 拒绝报废
const handleRejectDisposal = (row: DisposalRecord) => {
  currentDisposal.value = row
  disposalRejectForm.reason = ''
  disposalRejectDialogVisible.value = true
}

const rejectDisposal = async () => {
  if (!currentDisposal.value) return
  
  if (!disposalRejectForm.reason.trim()) {
    ElMessage.warning('请输入拒绝原因')
    return
  }
  
  try {
    await instrumentService.rejectDisposal(currentDisposal.value.id, disposalRejectForm.reason)
    
    ElMessage.success('已拒绝')
    disposalRejectDialogVisible.value = false
    fetchDisposals()
  } catch (error: any) {
    ElMessage.error(error.message || '拒绝失败')
  }
}

// 报废成功回调
const handleDisposalSuccess = () => {
  disposalDialogVisible.value = false
  fetchDisposals()
}

// 报废分页变化
const handleDisposalPageChange = (page: number) => {
  disposalPagination.page = page
  fetchDisposals()
}

const handleDisposalSizeChange = (size: number) => {
  disposalPagination.pageSize = size
  disposalPagination.page = 1
  fetchDisposals()
}

// 获取报废原因标签
const getDisposalReasonLabel = (reason: string) => {
  const labels: Record<string, string> = {
    AGING: '设备老化',
    IRREPARABLE: '无法修复',
    OBSOLETE: '技术淘汰',
    OTHER: '其他'
  }
  return labels[reason] || reason
}

// 获取报废状态类型
const getDisposalStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    COMPLETED: 'info'
  }
  return typeMap[status] || ''
}

// 获取流转状态类型
const getTransferStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    '待确认': 'warning',
    '已确认': 'info',
    '已拒绝': 'danger',
    '已完成': 'success',
    'PENDING': 'warning',
    'CONFIRMED': 'info',
    'REJECTED': 'danger',
    'COMPLETED': 'success'
  }
  return typeMap[status] || ''
}

// ========== 通用方法 ==========
// 格式化日期
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

// 格式化日期时间
const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString('zh-CN')
}

// 初始化
onMounted(() => {
  fetchTransfers()
})
</script>

<style scoped>
.instrument-transfer {
  padding: 20px;
}

.operation-bar,
.filter-bar {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
