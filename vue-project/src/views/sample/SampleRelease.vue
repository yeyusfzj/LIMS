<template>
  <div class="sample-release-page">
    <div class="page-header">
      <h2>样品放行管理</h2>
      <p>管理已完成检测的样品放行流程</p>
    </div>
    
    <div class="search-section">
      <el-input 
        v-model="searchText" 
        placeholder="搜索样品编号或名称"
        style="width: 300px; margin-right: 10px;"
        clearable
      />
      <el-button type="primary" @click="handleSearch">搜索</el-button>
    </div>

    <div class="table-section">
      <el-table :data="filteredSamples" style="width: 100%;" v-loading="loading">
        <el-table-column prop="barcode" label="样品编号" width="150" />
        <el-table-column prop="name" label="样品名称" width="150" />
        <el-table-column prop="client" label="委托方" width="200" />
        <el-table-column prop="sampleType" label="样品类型" width="100" />
        <el-table-column label="放行状态" width="120">
          <template slot-scope="scope">
            <span v-if="scope.row.canRelease" style="color: #67c23a;">
              <i class="el-icon-check"></i> 可放行
            </span>
            <span v-else style="color: #f56c6c;">
              <i class="el-icon-close"></i> 不可放行
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template slot-scope="scope">
            <el-button 
              v-if="scope.row.canRelease"
              type="primary" 
              size="small" 
              @click="releaseSample(scope.row)"
            >
              放行
            </el-button>
            <el-button v-else type="info" size="small" disabled>
              不可放行
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SampleRelease',
  data() {
    return {
      loading: false,
      searchText: '',
      sampleList: [
        {
          id: 'S20240123-001',
          barcode: 'S20240123-001',
          name: '水质样品',
          client: '某某环保公司',
          sampleType: '水质',
          canRelease: true
        },
        {
          id: 'S20240123-002',
          barcode: 'S20240123-002',
          name: '土壤样品',
          client: '某某建筑公司',
          sampleType: '土壤',
          canRelease: true
        },
        {
          id: 'S20240122-015',
          barcode: 'S20240122-015',
          name: '食品样品',
          client: '某某食品公司',
          sampleType: '食品',
          canRelease: false
        }
      ],
      filteredSamples: []
    }
  },
  mounted() {
    this.loadSamples()
  },
  methods: {
    loadSamples() {
      this.loading = true
      setTimeout(() => {
        this.filteredSamples = [...this.sampleList]
        this.loading = false
      }, 500)
    },
    handleSearch() {
      if (!this.searchText.trim()) {
        this.filteredSamples = [...this.sampleList]
        return
      }
      
      const query = this.searchText.toLowerCase()
      this.filteredSamples = this.sampleList.filter(sample => 
        sample.barcode.toLowerCase().includes(query) ||
        sample.name.toLowerCase().includes(query) ||
        sample.client.toLowerCase().includes(query)
      )
    },
    releaseSample(sample) {
      this.$confirm('确认放行该样品？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.$message.success(`样品 ${sample.barcode} 放行成功！`)
        const index = this.sampleList.findIndex(item => item.id === sample.id)
        if (index > -1) {
          this.sampleList.splice(index, 1)
        }
        this.handleSearch()
      }).catch(() => {
        this.$message.info('已取消放行')
      })
    }
  }
}
</script>

<style scoped>
.sample-release-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.search-section {
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.table-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style>