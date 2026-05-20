"""
Locust 性能测试脚本

测试 FastAPI 后端的各个 API 端点性能，包括：
- 认证 API
- 样品管理 API
- 工作流管理 API
- 结果管理 API
- 审核管理 API
- 报告管理 API
- 统计分析 API

运行方式:
    locust -f locustfile.py --host=http://localhost:8000
    
或使用 Web UI:
    locust -f locustfile.py --host=http://localhost:8000 --web-host=0.0.0.0 --web-port=8089
"""

from locust import HttpUser, task, between, SequentialTaskSet
import random
import json
from datetime import datetime, timedelta


class AuthenticationTasks(SequentialTaskSet):
    """认证相关的任务序列"""
    
    def on_start(self):
        """初始化：登录获取令牌"""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("accessToken")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(1)
    def get_current_user(self):
        """获取当前用户信息"""
        if self.token:
            self.client.get("/api/v1/auth/me", headers=self.headers)
    
    @task(1)
    def refresh_token(self):
        """刷新令牌"""
        if self.token:
            self.client.post("/api/v1/auth/refresh", headers=self.headers)


class SampleManagementTasks(SequentialTaskSet):
    """样品管理相关的任务序列"""
    
    def on_start(self):
        """初始化：登录获取令牌"""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("accessToken")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(5)
    def list_samples(self):
        """查询样品列表"""
        if self.token:
            params = {
                "page": random.randint(1, 10),
                "pageSize": 20,
                "status": random.choice(["REGISTERED", "TESTING", "COMPLETED"])
            }
            self.client.get("/api/v1/samples", params=params, headers=self.headers)
    
    @task(3)
    def get_sample_detail(self):
        """获取样品详情"""
        if self.token:
            # 假设有样品 ID，实际测试时需要先创建样品
            sample_id = f"sample-{random.randint(1, 100)}"
            self.client.get(f"/api/v1/samples/{sample_id}", headers=self.headers)
    
    @task(2)
    def create_sample(self):
        """创建样品"""
        if self.token:
            sample_data = {
                "sampleNumber": f"S{datetime.now().strftime('%Y%m%d%H%M%S')}{random.randint(1000, 9999)}",
                "clientName": f"客户{random.randint(1, 100)}",
                "sampleName": f"样品{random.randint(1, 100)}",
                "sampleType": random.choice(["食品", "药品", "化妆品", "环境"]),
                "quantity": random.uniform(1, 100),
                "unit": random.choice(["kg", "g", "L", "mL"]),
                "receivedDate": datetime.now().isoformat(),
                "priority": random.choice(["LOW", "MEDIUM", "HIGH"])
            }
            self.client.post("/api/v1/samples", json=sample_data, headers=self.headers)
    
    @task(1)
    def update_sample(self):
        """更新样品"""
        if self.token:
            sample_id = f"sample-{random.randint(1, 100)}"
            update_data = {
                "status": random.choice(["TESTING", "COMPLETED"]),
                "remarks": f"更新备注 {datetime.now().isoformat()}"
            }
            self.client.put(f"/api/v1/samples/{sample_id}", json=update_data, headers=self.headers)


class WorkflowManagementTasks(SequentialTaskSet):
    """工作流管理相关的任务序列"""
    
    def on_start(self):
        """初始化：登录获取令牌"""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("accessToken")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(5)
    def list_workflow_templates(self):
        """查询工作流模板列表"""
        if self.token:
            params = {"page": random.randint(1, 5), "pageSize": 20}
            self.client.get("/api/v1/workflows", params=params, headers=self.headers)
    
    @task(3)
    def get_workflow_template(self):
        """获取工作流模板详情"""
        if self.token:
            template_id = f"template-{random.randint(1, 20)}"
            self.client.get(f"/api/v1/workflows/{template_id}", headers=self.headers)
    
    @task(4)
    def list_tasks(self):
        """查询任务列表"""
        if self.token:
            params = {
                "page": random.randint(1, 10),
                "pageSize": 20,
                "status": random.choice(["PENDING", "IN_PROGRESS", "COMPLETED"])
            }
            self.client.get("/api/v1/tasks", params=params, headers=self.headers)
    
    @task(2)
    def get_task_detail(self):
        """获取任务详情"""
        if self.token:
            task_id = f"task-{random.randint(1, 100)}"
            self.client.get(f"/api/v1/tasks/{task_id}", headers=self.headers)


class ResultManagementTasks(SequentialTaskSet):
    """检测结果管理相关的任务序列"""
    
    def on_start(self):
        """初始化：登录获取令牌"""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("accessToken")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(5)
    def list_results(self):
        """查询检测结果列表"""
        if self.token:
            params = {
                "page": random.randint(1, 10),
                "pageSize": 20
            }
            self.client.get("/api/v1/results", params=params, headers=self.headers)
    
    @task(3)
    def get_result_detail(self):
        """获取检测结果详情"""
        if self.token:
            result_id = f"result-{random.randint(1, 100)}"
            self.client.get(f"/api/v1/results/{result_id}", headers=self.headers)
    
    @task(2)
    def create_result(self):
        """创建检测结果"""
        if self.token:
            result_data = {
                "sampleId": f"sample-{random.randint(1, 100)}",
                "testItemId": f"item-{random.randint(1, 50)}",
                "value": str(random.uniform(0, 100)),
                "unit": random.choice(["mg/kg", "mg/L", "%", "CFU/g"]),
                "testDate": datetime.now().isoformat()
            }
            self.client.post("/api/v1/results", json=result_data, headers=self.headers)


class AuditManagementTasks(SequentialTaskSet):
    """审核管理相关的任务序列"""
    
    def on_start(self):
        """初始化：登录获取令牌"""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("accessToken")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(5)
    def list_audit_tasks(self):
        """查询审核任务列表"""
        if self.token:
            params = {
                "page": random.randint(1, 10),
                "pageSize": 20,
                "status": random.choice(["PENDING", "IN_PROGRESS", "COMPLETED"])
            }
            self.client.get("/api/v1/audits", params=params, headers=self.headers)
    
    @task(3)
    def get_audit_statistics(self):
        """获取审核统计"""
        if self.token:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()
            end_date = datetime.now().isoformat()
            params = {
                "startDate": start_date,
                "endDate": end_date
            }
            self.client.get("/api/v1/audits/statistics", params=params, headers=self.headers)


class ReportManagementTasks(SequentialTaskSet):
    """报告管理相关的任务序列"""
    
    def on_start(self):
        """初始化：登录获取令牌"""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("accessToken")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(5)
    def list_reports(self):
        """查询报告列表"""
        if self.token:
            params = {
                "page": random.randint(1, 10),
                "pageSize": 20
            }
            self.client.get("/api/v1/reports", params=params, headers=self.headers)
    
    @task(3)
    def get_report_detail(self):
        """获取报告详情"""
        if self.token:
            report_id = f"report-{random.randint(1, 100)}"
            self.client.get(f"/api/v1/reports/{report_id}", headers=self.headers)
    
    @task(2)
    def list_report_templates(self):
        """查询报告模板列表"""
        if self.token:
            params = {"page": 1, "pageSize": 20}
            self.client.get("/api/v1/report-templates", params=params, headers=self.headers)


class StatisticsAnalysisTasks(SequentialTaskSet):
    """统计分析相关的任务序列"""
    
    def on_start(self):
        """初始化：登录获取令牌"""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("accessToken")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(3)
    def get_overview_statistics(self):
        """获取综合统计"""
        if self.token:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()
            end_date = datetime.now().isoformat()
            params = {
                "startDate": start_date,
                "endDate": end_date
            }
            self.client.get("/api/v1/statistics/overview", params=params, headers=self.headers)
    
    @task(2)
    def get_workload_statistics(self):
        """获取工作量统计"""
        if self.token:
            start_date = (datetime.now() - timedelta(days=7)).isoformat()
            end_date = datetime.now().isoformat()
            params = {
                "startDate": start_date,
                "endDate": end_date
            }
            self.client.get("/api/v1/statistics/workload", params=params, headers=self.headers)
    
    @task(2)
    def get_quality_statistics(self):
        """获取质量统计"""
        if self.token:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()
            end_date = datetime.now().isoformat()
            params = {
                "startDate": start_date,
                "endDate": end_date
            }
            self.client.get("/api/v1/statistics/quality", params=params, headers=self.headers)


class CachePerformanceTasks(SequentialTaskSet):
    """缓存性能测试任务序列"""
    
    def on_start(self):
        """初始化：登录获取令牌"""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("accessToken")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(10)
    def cached_statistics_query(self):
        """测试缓存的统计查询（应该很快）"""
        if self.token:
            # 使用相同的参数多次查询，测试缓存效果
            params = {
                "startDate": "2024-01-01T00:00:00",
                "endDate": "2024-12-31T23:59:59"
            }
            self.client.get("/api/v1/statistics/overview", params=params, headers=self.headers)


class DatabaseQueryTasks(SequentialTaskSet):
    """数据库查询性能测试任务序列"""
    
    def on_start(self):
        """初始化：登录获取令牌"""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("accessToken")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(5)
    def complex_query_with_joins(self):
        """复杂查询（包含关联）"""
        if self.token:
            # 查询样品及其关联的结果和报告
            params = {
                "page": 1,
                "pageSize": 50,
                "includeResults": True,
                "includeReports": True
            }
            self.client.get("/api/v1/samples", params=params, headers=self.headers)
    
    @task(3)
    def pagination_query(self):
        """分页查询"""
        if self.token:
            # 测试不同页码的查询性能
            params = {
                "page": random.randint(1, 100),
                "pageSize": 20
            }
            self.client.get("/api/v1/samples", params=params, headers=self.headers)


# ==================== 用户类定义 ====================

class AuthenticationUser(HttpUser):
    """认证 API 性能测试用户"""
    tasks = [AuthenticationTasks]
    wait_time = between(1, 3)
    weight = 1


class SampleManagementUser(HttpUser):
    """样品管理 API 性能测试用户"""
    tasks = [SampleManagementTasks]
    wait_time = between(1, 3)
    weight = 3


class WorkflowManagementUser(HttpUser):
    """工作流管理 API 性能测试用户"""
    tasks = [WorkflowManagementTasks]
    wait_time = between(1, 3)
    weight = 2


class ResultManagementUser(HttpUser):
    """检测结果管理 API 性能测试用户"""
    tasks = [ResultManagementTasks]
    wait_time = between(1, 3)
    weight = 3


class AuditManagementUser(HttpUser):
    """审核管理 API 性能测试用户"""
    tasks = [AuditManagementTasks]
    wait_time = between(1, 3)
    weight = 2


class ReportManagementUser(HttpUser):
    """报告管理 API 性能测试用户"""
    tasks = [ReportManagementTasks]
    wait_time = between(1, 3)
    weight = 2


class StatisticsAnalysisUser(HttpUser):
    """统计分析 API 性能测试用户"""
    tasks = [StatisticsAnalysisTasks]
    wait_time = between(2, 5)
    weight = 2


class CachePerformanceUser(HttpUser):
    """缓存性能测试用户"""
    tasks = [CachePerformanceTasks]
    wait_time = between(0.5, 1)
    weight = 1


class DatabaseQueryUser(HttpUser):
    """数据库查询性能测试用户"""
    tasks = [DatabaseQueryTasks]
    wait_time = between(1, 2)
    weight = 2
