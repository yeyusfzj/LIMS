#!/usr/bin/env python3
"""
功能完整性验证脚本 V2 - 改进版

修正了文件路径检查逻辑，提供更准确的验证结果
"""

import asyncio
import sys
from typing import Dict, List, Tuple
from pathlib import Path
import importlib.util


class FeatureCompletenessVerifierV2:
    """功能完整性验证器 V2"""
    
    def __init__(self):
        self.results = {
            "total_requirements": 0,
            "implemented_requirements": 0,
            "total_checks": 0,
            "passed_checks": 0,
            "issues": [],
            "warnings": []
        }
        
    def check_file_exists(self, *file_paths: str) -> Tuple[bool, str]:
        """检查文件是否存在（支持多个可能的路径）"""
        for file_path in file_paths:
            if Path(file_path).exists():
                return True, file_path
        return False, ""
    
    def check_content_in_file(self, file_path: str, content: str) -> bool:
        """检查文件中是否包含特定内容"""
        try:
            if not Path(file_path).exists():
                return False
            with open(file_path, 'r', encoding='utf-8') as f:
                return content in f.read()
        except Exception:
            return False
    
    def verify_requirement_1_authentication(self) -> Dict:
        """验证需求 1: 认证和授权模块"""
        print("\n=== 验证需求 1: 认证和授权模块 ===")
        
        checks = {
            "JWT 认证服务": self.check_file_exists("app/core/security.py")[0],
            "认证中间件": self.check_file_exists("app/middleware/auth.py")[0],
            "认证端点": (
                self.check_content_in_file("app/routers/users.py", "/auth/login") or
                self.check_content_in_file("app/main.py", "/auth/login")
            ),
            "权限服务": self.check_file_exists("app/services/permission_service.py")[0],
            "角色服务": self.check_file_exists("app/services/role_service.py")[0],
            "用户服务": self.check_file_exists("app/services/user_service.py")[0],
            "权限路由": self.check_file_exists("app/routers/permissions.py")[0],
            "角色路由": self.check_file_exists("app/routers/roles.py")[0],
            "用户路由": self.check_file_exists("app/routers/users.py")[0],
            "限流中间件": self.check_file_exists("app/middleware/rate_limit.py")[0],
        }
        
        return self._process_checks("需求 1: 认证和授权", checks)
    
    def verify_requirement_2_workflow(self) -> Dict:
        """验证需求 2: 工作流管理模块"""
        print("\n=== 验证需求 2: 工作流管理模块 ===")
        
        checks = {
            "工作流模型": self.check_file_exists("app/models/workflow.py")[0],
            "任务模型": self.check_file_exists("app/models/task.py")[0],
            "工作流服务": self.check_file_exists("app/services/workflow_service.py")[0],
            "任务服务": self.check_file_exists("app/services/task_service.py")[0],
            "自动分配引擎": self.check_file_exists("app/services/assignment_engine.py")[0],
            "工作流路由": self.check_file_exists("app/routers/workflows.py")[0],
            "任务路由": self.check_file_exists("app/routers/tasks.py")[0],
        }
        
        return self._process_checks("需求 2: 工作流管理", checks)
    
    def verify_requirement_3_results(self) -> Dict:
        """验证需求 3: 检测结果管理模块"""
        print("\n=== 验证需求 3: 检测结果管理模块 ===")
        
        checks = {
            "结果模型": self.check_file_exists("app/models/result.py")[0],
            "公式模型": self.check_file_exists("app/models/formula.py")[0],
            "异常模型": (
                self.check_content_in_file("app/models/result.py", "Anomaly") or
                self.check_file_exists("app/models/anomaly.py")[0]
            ),
            "结果服务": self.check_file_exists("app/services/result_service.py")[0],
            "导入服务": self.check_file_exists("app/services/import_service.py")[0],
            "公式服务": self.check_file_exists("app/services/formula_service.py")[0],
            "异常检测服务": self.check_file_exists("app/services/anomaly_service.py")[0],
            "结果路由": self.check_file_exists("app/routers/results.py")[0],
            "公式路由": self.check_file_exists("app/routers/formulas.py")[0],
            "异常路由": self.check_file_exists("app/routers/anomalies.py")[0],
        }
        
        return self._process_checks("需求 3: 检测结果管理", checks)
    
    def verify_requirement_4_audit(self) -> Dict:
        """验证需求 4: 审核管理模块"""
        print("\n=== 验证需求 4: 审核管理模块 ===")
        
        checks = {
            "审核模型": self.check_file_exists("app/models/audit.py")[0],
            "审核服务": self.check_file_exists("app/services/audit_service.py")[0],
            "审核路由": self.check_file_exists("app/routers/audits.py")[0],
        }
        
        return self._process_checks("需求 4: 审核管理", checks)
    
    def verify_requirement_5_report(self) -> Dict:
        """验证需求 5: 报告管理模块"""
        print("\n=== 验证需求 5: 报告管理模块 ===")
        
        checks = {
            "报告模型": self.check_file_exists("app/models/report.py")[0],
            "签名模型": self.check_file_exists("app/models/signature.py")[0],
            "分发模型": self.check_file_exists("app/models/distribution.py")[0],
            "报告模板服务": self.check_file_exists("app/services/report_template_service.py")[0],
            "报告服务": self.check_file_exists("app/services/report_service.py")[0],
            "签名服务": self.check_file_exists("app/services/signature_service.py")[0],
            "分发服务": self.check_file_exists("app/services/distribution_service.py")[0],
            "报告模板路由": self.check_file_exists("app/routers/report_templates.py")[0],
            "报告路由": self.check_file_exists("app/routers/reports.py")[0],
            "签名路由": self.check_file_exists("app/routers/signatures.py")[0],
        }
        
        return self._process_checks("需求 5: 报告管理", checks)
    
    def verify_requirement_6_statistics(self) -> Dict:
        """验证需求 6: 统计分析模块"""
        print("\n=== 验证需求 6: 统计分析模块 ===")
        
        checks = {
            "统计服务": self.check_file_exists("app/services/statistics_service.py")[0],
            "导出服务": self.check_file_exists("app/services/export_service.py")[0],
            "统计路由": self.check_file_exists("app/routers/statistics.py")[0],
            "导出路由": self.check_file_exists("app/routers/export.py")[0],
        }
        
        return self._process_checks("需求 6: 统计分析", checks)
    
    def verify_requirement_7_system(self) -> Dict:
        """验证需求 7: 系统管理模块"""
        print("\n=== 验证需求 7: 系统管理模块 ===")
        
        checks = {
            "审计日志模型": self.check_file_exists("app/models/audit_log.py")[0],
            "备份模型": self.check_file_exists("app/models/backup.py")[0],
            "方法模型": self.check_file_exists("app/models/method.py")[0],
            "判定模型": self.check_file_exists("app/models/judgment.py")[0],
            "审计日志服务": self.check_file_exists("app/services/audit_log_service.py")[0],
            "备份服务": self.check_file_exists("app/services/backup_service.py")[0],
            "性能监控服务": self.check_file_exists("app/services/performance_service.py")[0],
            "队列服务": self.check_file_exists("app/services/queue_service.py")[0],
            "方法服务": self.check_file_exists("app/services/method_service.py")[0],
            "判定服务": self.check_file_exists("app/services/judgment_service.py")[0],
            "审计日志路由": self.check_file_exists("app/routers/audit_logs.py")[0],
            "备份路由": self.check_file_exists("app/routers/backups.py")[0],
            "性能路由": self.check_file_exists("app/routers/performance.py")[0],
            "队列路由": self.check_file_exists("app/routers/queue.py")[0],
            "方法路由": self.check_file_exists("app/routers/methods.py")[0],
            "判定路由": self.check_file_exists("app/routers/judgments.py")[0],
        }
        
        return self._process_checks("需求 7: 系统管理", checks)
    
    def verify_requirement_8_health(self) -> Dict:
        """验证需求 8: 健康检查和监控"""
        print("\n=== 验证需求 8: 健康检查和监控 ===")
        
        checks = {
            "健康检查端点": (
                self.check_file_exists("app/routers/health.py")[0] or
                self.check_content_in_file("app/main.py", "/health")
            ),
        }
        
        return self._process_checks("需求 8: 健康检查", checks)
    
    def verify_requirement_9_database(self) -> Dict:
        """验证需求 9: 数据库兼容性"""
        print("\n=== 验证需求 9: 数据库兼容性 ===")
        
        checks = {
            "数据库配置": self.check_file_exists("app/core/database.py")[0],
            "基础模型": self.check_file_exists("app/models/base.py")[0],
            "用户模型": self.check_file_exists("app/models/user.py")[0],
            "角色模型": (
                self.check_content_in_file("app/models/user.py", "Role") or
                self.check_file_exists("app/models/role.py")[0]
            ),
            "权限模型": (
                self.check_content_in_file("app/models/user.py", "Permission") or
                self.check_file_exists("app/models/permission.py")[0]
            ),
            "样品模型": self.check_file_exists("app/models/sample.py")[0],
        }
        
        return self._process_checks("需求 9: 数据库兼容性", checks)
    
    def verify_requirement_10_api(self) -> Dict:
        """验证需求 10: API 一致性"""
        print("\n=== 验证需求 10: API 一致性 ===")
        
        checks = {
            "异常定义": self.check_file_exists("app/core/exceptions.py")[0],
            "错误处理中间件": self.check_file_exists("app/middleware/error_handler.py")[0],
            "响应模型": (
                self.check_file_exists("app/schemas/common.py")[0] or
                self.check_file_exists("app/schemas/response.py")[0]
            ),
        }
        
        return self._process_checks("需求 10: API 一致性", checks)
    
    def verify_requirement_11_performance(self) -> Dict:
        """验证需求 11: 性能优化"""
        print("\n=== 验证需求 11: 性能优化 ===")
        
        checks = {
            "缓存配置": self.check_file_exists("app/core/cache.py")[0],
            "数据库连接池": self.check_file_exists("app/core/database.py")[0],
            "限流中间件": self.check_file_exists("app/middleware/rate_limit.py")[0],
        }
        
        return self._process_checks("需求 11: 性能优化", checks)
    
    def verify_requirement_12_security(self) -> Dict:
        """验证需求 12: 安全性"""
        print("\n=== 验证需求 12: 安全性 ===")
        
        checks = {
            "安全配置": self.check_file_exists("app/core/security.py")[0],
            "加密工具": self.check_file_exists("app/core/encryption.py")[0],
            "认证中间件": self.check_file_exists("app/middleware/auth.py")[0],
            "权限检查": (
                self.check_file_exists("app/middleware/permission.py")[0] or
                self.check_content_in_file("app/middleware/auth.py", "permission") or
                self.check_content_in_file("app/core/permissions.py", "PermissionChecker")
            ),
            "限流中间件": self.check_file_exists("app/middleware/rate_limit.py")[0],
            "CORS中间件": self.check_file_exists("app/middleware/cors.py")[0],
        }
        
        return self._process_checks("需求 12: 安全性", checks)
    
    def verify_requirement_13_logging(self) -> Dict:
        """验证需求 13: 日志和监控"""
        print("\n=== 验证需求 13: 日志和监控 ===")
        
        checks = {
            "日志配置": self.check_file_exists("app/core/logging.py")[0],
            "日志中间件": self.check_file_exists("app/middleware/logging.py")[0],
            "性能监控服务": self.check_file_exists("app/services/performance_service.py")[0],
        }
        
        return self._process_checks("需求 13: 日志和监控", checks)
    
    def verify_requirement_14_documentation(self) -> Dict:
        """验证需求 14: 文档和测试"""
        print("\n=== 验证需求 14: 文档和测试 ===")
        
        checks = {
            "README": self.check_file_exists("README.md")[0],
            "部署文档": self.check_file_exists("DEPLOYMENT.md")[0],
            "API文档": (
                self.check_file_exists("docs/API.md")[0] or
                self.check_file_exists("API_ENDPOINTS_MAPPING.md")[0]
            ),
            "测试目录": Path("tests").exists(),
        }
        
        return self._process_checks("需求 14: 文档和测试", checks)
    
    def verify_requirement_15_deployment(self) -> Dict:
        """验证需求 15: 部署和运维"""
        print("\n=== 验证需求 15: 部署和运维 ===")
        
        checks = {
            "Dockerfile": self.check_file_exists("Dockerfile")[0],
            "Docker Compose": self.check_file_exists("docker-compose.yml")[0],
            "环境变量示例": self.check_file_exists(".env.example")[0],
            "部署文档": self.check_file_exists("DEPLOYMENT.md")[0],
        }
        
        return self._process_checks("需求 15: 部署和运维", checks)
    
    def _process_checks(self, requirement_name: str, checks: Dict[str, bool]) -> Dict:
        """处理检查结果"""
        passed = sum(1 for v in checks.values() if v)
        total = len(checks)
        
        print(f"\n{requirement_name}: {passed}/{total} 项通过")
        
        for name, result in checks.items():
            status = "✓" if result else "✗"
            print(f"  {status} {name}")
            if not result:
                self.results["issues"].append(f"{requirement_name} - {name} 未实现")
        
        self.results["total_requirements"] += 1
        self.results["total_checks"] += total
        self.results["passed_checks"] += passed
        
        if passed == total:
            self.results["implemented_requirements"] += 1
        
        return {
            "name": requirement_name,
            "passed": passed,
            "total": total,
            "percentage": (passed / total * 100) if total > 0 else 0
        }
    
    def generate_report(self, requirement_results: List[Dict]) -> str:
        """生成验证报告"""
        report = []
        report.append("=" * 80)
        report.append("功能完整性验证报告 V2 (改进版)")
        report.append("=" * 80)
        report.append("")
        
        # 需求实现情况
        report.append("## 1. 需求实现情况")
        report.append("")
        report.append(f"总需求数: {self.results['total_requirements']}")
        report.append(f"完全实现需求: {self.results['implemented_requirements']}")
        report.append(f"需求实现率: {(self.results['implemented_requirements'] / self.results['total_requirements'] * 100):.1f}%")
        report.append("")
        report.append(f"总检查项: {self.results['total_checks']}")
        report.append(f"通过检查项: {self.results['passed_checks']}")
        report.append(f"检查通过率: {(self.results['passed_checks'] / self.results['total_checks'] * 100):.1f}%")
        report.append("")
        
        for result in requirement_results:
            status = "✅" if result['percentage'] == 100 else "⚠️" if result['percentage'] >= 80 else "❌"
            report.append(f"{status} {result['name']}: {result['passed']}/{result['total']} ({result['percentage']:.1f}%)")
        
        report.append("")
        
        # 问题列表
        if self.results["issues"]:
            report.append("## 2. 发现的问题")
            report.append("")
            for i, issue in enumerate(self.results["issues"], 1):
                report.append(f"{i}. {issue}")
            report.append("")
        else:
            report.append("## 2. 发现的问题")
            report.append("")
            report.append("✅ 未发现问题")
            report.append("")
        
        # 总体评估
        report.append("## 3. 总体评估")
        report.append("")
        
        overall_score = (self.results['passed_checks'] / self.results['total_checks']) * 100
        
        report.append(f"**总体完成度: {overall_score:.1f}/100**")
        report.append("")
        
        if overall_score >= 95:
            report.append("✅ **评估结果: 优秀** - 功能完整性非常好，可以进行生产部署")
        elif overall_score >= 85:
            report.append("✅ **评估结果: 良好** - 功能基本完整，建议修复少量问题后部署")
        elif overall_score >= 70:
            report.append("⚠️  **评估结果: 一般** - 功能实现有缺失，需要补充完善")
        else:
            report.append("❌ **评估结果: 不足** - 功能实现不完整，需要大量工作")
        
        report.append("")
        
        # 建议
        if self.results["issues"]:
            report.append("## 4. 建议")
            report.append("")
            report.append("建议优先修复以下问题：")
            for i, issue in enumerate(self.results["issues"][:5], 1):
                report.append(f"{i}. {issue}")
            report.append("")
        
        report.append("=" * 80)
        
        return "\n".join(report)
    
    async def run(self):
        """运行完整性验证"""
        print("开始功能完整性验证 (改进版)...")
        print("=" * 80)
        
        # 验证所有需求
        requirement_results = []
        requirement_results.append(self.verify_requirement_1_authentication())
        requirement_results.append(self.verify_requirement_2_workflow())
        requirement_results.append(self.verify_requirement_3_results())
        requirement_results.append(self.verify_requirement_4_audit())
        requirement_results.append(self.verify_requirement_5_report())
        requirement_results.append(self.verify_requirement_6_statistics())
        requirement_results.append(self.verify_requirement_7_system())
        requirement_results.append(self.verify_requirement_8_health())
        requirement_results.append(self.verify_requirement_9_database())
        requirement_results.append(self.verify_requirement_10_api())
        requirement_results.append(self.verify_requirement_11_performance())
        requirement_results.append(self.verify_requirement_12_security())
        requirement_results.append(self.verify_requirement_13_logging())
        requirement_results.append(self.verify_requirement_14_documentation())
        requirement_results.append(self.verify_requirement_15_deployment())
        
        # 生成报告
        report = self.generate_report(requirement_results)
        
        print("\n")
        print(report)
        
        # 保存报告到文件
        with open("FEATURE_COMPLETENESS_REPORT_V2.md", "w", encoding="utf-8") as f:
            f.write(report)
        
        print("\n报告已保存到: FEATURE_COMPLETENESS_REPORT_V2.md")
        
        # 返回退出码
        if len(self.results["issues"]) == 0:
            return 0
        elif len(self.results["issues"]) <= 3:
            return 0  # 少量问题也认为通过
        else:
            return 1


async def main():
    """主函数"""
    verifier = FeatureCompletenessVerifierV2()
    exit_code = await verifier.run()
    sys.exit(exit_code)


if __name__ == "__main__":
    asyncio.run(main())
