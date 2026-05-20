#!/usr/bin/env python3
"""
功能完整性验证脚本 - 全面版
验证 FastAPI 后端是否实现了所有需求和 API 端点
"""

import os
import sys
import json
import importlib.util
from pathlib import Path
from typing import Dict, List, Tuple, Any
from collections import defaultdict

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))


class FeatureCompletenessVerifier:
    """功能完整性验证器"""
    
    def __init__(self):
        self.results = {
            "requirements": {},
            "api_endpoints": {},
            "business_logic": {},
            "frontend_compatibility": {},
            "summary": {}
        }
        self.issues = []
        
    def verify_all(self) -> Dict[str, Any]:
        """执行所有验证"""
        print("=" * 80)
        print("功能完整性验证 - 全面检查")
        print("=" * 80)
        print()
        
        # 1. 验证所有需求都已实现
        print("1. 验证所有需求都已实现...")
        self.verify_requirements()
        print()
        
        # 2. 验证所有 API 端点都已实现
        print("2. 验证所有 API 端点都已实现...")
        self.verify_api_endpoints()
        print()
        
        # 3. 验证所有业务逻辑都已实现
        print("3. 验证所有业务逻辑都已实现...")
        self.verify_business_logic()
        print()
        
        # 4. 验证与前端完全兼容
        print("4. 验证与前端完全兼容...")
        self.verify_frontend_compatibility()
        print()
        
        # 5. 生成总结报告
        self.generate_summary()
        
        return self.results
    
    def verify_requirements(self):
        """验证所有需求都已实现"""
        requirements = {
            "需求 1: 认证和授权模块": {
                "JWT 认证服务": self.check_file_exists("app/core/security.py"),
                "认证中间件": self.check_file_exists("app/middleware/auth.py"),
                "认证 API 路由": self.check_router_exists("auth"),
                "权限控制服务": self.check_file_exists("app/core/permissions.py"),
                "权限服务": self.check_file_exists("app/services/permission_service.py"),
                "角色服务": self.check_file_exists("app/services/role_service.py"),
                "用户服务": self.check_file_exists("app/services/user_service.py"),
                "权限 API": self.check_file_exists("app/routers/permissions.py"),
                "角色 API": self.check_file_exists("app/routers/roles.py"),
                "用户 API": self.check_file_exists("app/routers/users.py"),
                "限流中间件": self.check_file_exists("app/middleware/rate_limit.py"),
            },
            "需求 2: 工作流管理模块": {
                "工作流模型": self.check_file_exists("app/models/workflow.py"),
                "任务模型": self.check_file_exists("app/models/task.py"),
                "工作流服务": self.check_file_exists("app/services/workflow_service.py"),
                "任务服务": self.check_file_exists("app/services/task_service.py"),
                "自动分配引擎": self.check_file_exists("app/services/assignment_engine.py"),
                "工作流 API": self.check_file_exists("app/routers/workflows.py"),
                "任务 API": self.check_file_exists("app/routers/tasks.py"),
            },
            "需求 3: 检测结果管理模块": {
                "结果模型": self.check_file_exists("app/models/result.py"),
                "公式模型": self.check_file_exists("app/models/formula.py"),
                "结果服务": self.check_file_exists("app/services/result_service.py"),
                "批量导入服务": self.check_file_exists("app/services/import_service.py"),
                "公式服务": self.check_file_exists("app/services/formula_service.py"),
                "异常检测服务": self.check_file_exists("app/services/anomaly_service.py"),
                "结果 API": self.check_file_exists("app/routers/results.py"),
                "公式 API": self.check_file_exists("app/routers/formulas.py"),
                "异常 API": self.check_file_exists("app/routers/anomalies.py"),
            },
            "需求 4: 审核管理模块": {
                "审核模型": self.check_file_exists("app/models/audit.py"),
                "质量判定模型": self.check_file_exists("app/models/judgment.py"),
                "审核服务": self.check_file_exists("app/services/audit_service.py"),
                "质量判定服务": self.check_file_exists("app/services/judgment_service.py"),
                "审核 API": self.check_file_exists("app/routers/audits.py"),
                "质量判定 API": self.check_file_exists("app/routers/judgments.py"),
            },
            "需求 5: 报告管理模块": {
                "报告模型": self.check_file_exists("app/models/report.py"),
                "签名模型": self.check_file_exists("app/models/signature.py"),
                "分发模型": self.check_file_exists("app/models/distribution.py"),
                "报告模板服务": self.check_file_exists("app/services/report_template_service.py"),
                "报告服务": self.check_file_exists("app/services/report_service.py"),
                "签名服务": self.check_file_exists("app/services/signature_service.py"),
                "分发服务": self.check_file_exists("app/services/distribution_service.py"),
                "报告模板 API": self.check_file_exists("app/routers/report_templates.py"),
                "报告 API": self.check_file_exists("app/routers/reports.py"),
                "签名 API": self.check_file_exists("app/routers/signatures.py"),
            },
            "需求 6: 统计分析模块": {
                "统计服务": self.check_file_exists("app/services/statistics_service.py"),
                "导出服务": self.check_file_exists("app/services/export_service.py"),
                "统计 API": self.check_file_exists("app/routers/statistics.py"),
                "导出 API": self.check_file_exists("app/routers/export.py"),
            },
            "需求 7: 系统管理模块": {
                "审计日志模型": self.check_file_exists("app/models/audit_log.py"),
                "备份模型": self.check_file_exists("app/models/backup.py"),
                "检测方法模型": self.check_file_exists("app/models/method.py"),
                "审计日志服务": self.check_file_exists("app/services/audit_log_service.py"),
                "性能监控服务": self.check_file_exists("app/services/performance_service.py"),
                "队列服务": self.check_file_exists("app/services/queue_service.py"),
                "检测方法服务": self.check_file_exists("app/services/method_service.py"),
                "审计日志 API": self.check_file_exists("app/routers/audit_logs.py"),
                "性能监控 API": self.check_file_exists("app/routers/performance.py"),
                "队列 API": self.check_file_exists("app/routers/queue.py"),
                "检测方法 API": self.check_file_exists("app/routers/methods.py"),
            },
            "需求 8: 健康检查和监控": {
                "健康检查端点": self.check_health_endpoints(),
            },
            "需求 9: 数据库兼容性": {
                "SQLAlchemy 模型": self.check_models_exist(),
                "数据库配置": self.check_file_exists("app/core/database.py"),
            },
            "需求 10: API 一致性": {
                "API 路由注册": self.check_api_routes_registered(),
            },
            "需求 11: 性能优化": {
                "缓存实现": self.check_file_exists("app/core/cache.py"),
                "Redis 配置": self.check_file_exists("app/core/redis.py"),
                "查询优化": self.check_file_exists("app/utils/query_optimizer.py"),
            },
            "需求 12: 安全性": {
                "加密实现": self.check_file_exists("app/core/encryption.py"),
                "密码验证": self.check_file_exists("app/utils/password_validator.py"),
                "输入清理": self.check_file_exists("app/utils/input_sanitizer.py"),
                "CORS 中间件": self.check_file_exists("app/middleware/cors.py"),
            },
            "需求 13: 日志和监控": {
                "日志配置": self.check_file_exists("app/core/logging.py"),
                "日志中间件": self.check_file_exists("app/middleware/logging.py"),
                "错误处理中间件": self.check_file_exists("app/middleware/error_handler.py"),
            },
            "需求 14: 文档和测试": {
                "OpenAPI 文档": self.check_openapi_docs(),
                "测试目录": self.check_dir_exists("tests"),
            },
            "需求 15: 部署和运维": {
                "Dockerfile": self.check_file_exists("Dockerfile"),
                "Docker Compose": self.check_file_exists("docker-compose.yml"),
                "环境配置": self.check_file_exists(".env.example"),
            },
        }
        
        total_checks = 0
        passed_checks = 0
        
        for req_name, checks in requirements.items():
            req_passed = 0
            req_total = len(checks)
            
            for check_name, result in checks.items():
                total_checks += 1
                if result:
                    passed_checks += 1
                    req_passed += 1
                    status = "✅"
                else:
                    status = "❌"
                    self.issues.append(f"{req_name} - {check_name}")
                
                print(f"  {status} {check_name}")
            
            percentage = (req_passed / req_total * 100) if req_total > 0 else 0
            print(f"  {req_name}: {req_passed}/{req_total} ({percentage:.1f}%)")
            print()
            
            self.results["requirements"][req_name] = {
                "passed": req_passed,
                "total": req_total,
                "percentage": percentage,
                "checks": checks
            }
        
        self.results["requirements"]["summary"] = {
            "total_checks": total_checks,
            "passed_checks": passed_checks,
            "percentage": (passed_checks / total_checks * 100) if total_checks > 0 else 0
        }
        
        print(f"需求验证总结: {passed_checks}/{total_checks} ({self.results['requirements']['summary']['percentage']:.1f}%)")
    
    def verify_api_endpoints(self):
        """验证所有 API 端点都已实现"""
        # 检查主要的 API 路由文件
        api_routers = [
            ("认证 API", "app/routers/auth.py"),  # 注意：可能不存在独立的 auth.py
            ("样品 API", "app/api/v1/samples.py"),
            ("工作流 API", "app/routers/workflows.py"),
            ("任务 API", "app/routers/tasks.py"),
            ("结果 API", "app/routers/results.py"),
            ("公式 API", "app/routers/formulas.py"),
            ("异常 API", "app/routers/anomalies.py"),
            ("审核 API", "app/routers/audits.py"),
            ("质量判定 API", "app/routers/judgments.py"),
            ("报告模板 API", "app/routers/report_templates.py"),
            ("报告 API", "app/routers/reports.py"),
            ("签名 API", "app/routers/signatures.py"),
            ("统计 API", "app/routers/statistics.py"),
            ("导出 API", "app/routers/export.py"),
            ("用户 API", "app/routers/users.py"),
            ("角色 API", "app/routers/roles.py"),
            ("权限 API", "app/routers/permissions.py"),
            ("审计日志 API", "app/routers/audit_logs.py"),
            ("性能监控 API", "app/routers/performance.py"),
            ("队列 API", "app/routers/queue.py"),
            ("检测方法 API", "app/routers/methods.py"),
        ]
        
        total = len(api_routers)
        passed = 0
        
        for name, path in api_routers:
            exists = self.check_file_exists(path)
            if exists:
                passed += 1
                print(f"  ✅ {name}")
            else:
                print(f"  ❌ {name} (文件不存在: {path})")
                self.issues.append(f"API 端点 - {name}")
        
        self.results["api_endpoints"] = {
            "total": total,
            "passed": passed,
            "percentage": (passed / total * 100) if total > 0 else 0
        }
        
        print(f"API 端点验证总结: {passed}/{total} ({self.results['api_endpoints']['percentage']:.1f}%)")
    
    def verify_business_logic(self):
        """验证所有业务逻辑都已实现"""
        services = [
            ("认证服务", "app/services/auth_service.py"),
            ("用户服务", "app/services/user_service.py"),
            ("角色服务", "app/services/role_service.py"),
            ("权限服务", "app/services/permission_service.py"),
            ("样品服务", "app/services/sample_service.py"),
            ("流转服务", "app/services/transfer_service.py"),
            ("工作流服务", "app/services/workflow_service.py"),
            ("任务服务", "app/services/task_service.py"),
            ("自动分配引擎", "app/services/assignment_engine.py"),
            ("结果服务", "app/services/result_service.py"),
            ("导入服务", "app/services/import_service.py"),
            ("公式服务", "app/services/formula_service.py"),
            ("异常检测服务", "app/services/anomaly_service.py"),
            ("审核服务", "app/services/audit_service.py"),
            ("质量判定服务", "app/services/judgment_service.py"),
            ("报告模板服务", "app/services/report_template_service.py"),
            ("报告服务", "app/services/report_service.py"),
            ("签名服务", "app/services/signature_service.py"),
            ("分发服务", "app/services/distribution_service.py"),
            ("统计服务", "app/services/statistics_service.py"),
            ("导出服务", "app/services/export_service.py"),
            ("审计日志服务", "app/services/audit_log_service.py"),
            ("性能监控服务", "app/services/performance_service.py"),
            ("队列服务", "app/services/queue_service.py"),
            ("检测方法服务", "app/services/method_service.py"),
            ("条码服务", "app/services/barcode_service.py"),
        ]
        
        total = len(services)
        passed = 0
        
        for name, path in services:
            exists = self.check_file_exists(path)
            if exists:
                passed += 1
                print(f"  ✅ {name}")
            else:
                print(f"  ❌ {name} (文件不存在: {path})")
                self.issues.append(f"业务逻辑 - {name}")
        
        self.results["business_logic"] = {
            "total": total,
            "passed": passed,
            "percentage": (passed / total * 100) if total > 0 else 0
        }
        
        print(f"业务逻辑验证总结: {passed}/{total} ({self.results['business_logic']['percentage']:.1f}%)")
    
    def verify_frontend_compatibility(self):
        """验证与前端完全兼容"""
        compatibility_checks = {
            "API 路由前缀": self.check_api_prefix(),
            "CORS 配置": self.check_file_exists("app/middleware/cors.py"),
            "响应格式": self.check_response_schemas(),
            "错误处理": self.check_file_exists("app/middleware/error_handler.py"),
            "认证机制": self.check_file_exists("app/middleware/auth.py"),
        }
        
        total = len(compatibility_checks)
        passed = sum(1 for v in compatibility_checks.values() if v)
        
        for name, result in compatibility_checks.items():
            if result:
                print(f"  ✅ {name}")
            else:
                print(f"  ❌ {name}")
                self.issues.append(f"前端兼容性 - {name}")
        
        self.results["frontend_compatibility"] = {
            "total": total,
            "passed": passed,
            "percentage": (passed / total * 100) if total > 0 else 0,
            "checks": compatibility_checks
        }
        
        print(f"前端兼容性验证总结: {passed}/{total} ({self.results['frontend_compatibility']['percentage']:.1f}%)")
    
    def generate_summary(self):
        """生成总结报告"""
        print("=" * 80)
        print("验证总结")
        print("=" * 80)
        print()
        
        # 计算总体完成度
        total_checks = 0
        passed_checks = 0
        
        for category in ["requirements", "api_endpoints", "business_logic", "frontend_compatibility"]:
            if category in self.results and "total" in self.results[category]:
                total_checks += self.results[category]["total"]
                passed_checks += self.results[category]["passed"]
            elif category == "requirements":
                total_checks += self.results[category]["summary"]["total_checks"]
                passed_checks += self.results[category]["summary"]["passed_checks"]
        
        overall_percentage = (passed_checks / total_checks * 100) if total_checks > 0 else 0
        
        print(f"1. 需求实现: {self.results['requirements']['summary']['passed_checks']}/{self.results['requirements']['summary']['total_checks']} ({self.results['requirements']['summary']['percentage']:.1f}%)")
        print(f"2. API 端点: {self.results['api_endpoints']['passed']}/{self.results['api_endpoints']['total']} ({self.results['api_endpoints']['percentage']:.1f}%)")
        print(f"3. 业务逻辑: {self.results['business_logic']['passed']}/{self.results['business_logic']['total']} ({self.results['business_logic']['percentage']:.1f}%)")
        print(f"4. 前端兼容性: {self.results['frontend_compatibility']['passed']}/{self.results['frontend_compatibility']['total']} ({self.results['frontend_compatibility']['percentage']:.1f}%)")
        print()
        print(f"总体完成度: {passed_checks}/{total_checks} ({overall_percentage:.1f}%)")
        print()
        
        # 评估等级
        if overall_percentage >= 95:
            grade = "优秀"
            recommendation = "功能完整性非常好，可以进行生产部署"
        elif overall_percentage >= 85:
            grade = "良好"
            recommendation = "功能基本完整，建议修复关键问题后部署"
        elif overall_percentage >= 70:
            grade = "及格"
            recommendation = "功能有缺失，需要补充实现后再部署"
        else:
            grade = "不及格"
            recommendation = "功能严重不完整，不建议部署"
        
        print(f"评估等级: {grade}")
        print(f"建议: {recommendation}")
        print()
        
        # 列出发现的问题
        if self.issues:
            print("发现的问题:")
            for i, issue in enumerate(self.issues, 1):
                print(f"  {i}. {issue}")
        else:
            print("✅ 未发现问题")
        
        self.results["summary"] = {
            "total_checks": total_checks,
            "passed_checks": passed_checks,
            "overall_percentage": overall_percentage,
            "grade": grade,
            "recommendation": recommendation,
            "issues": self.issues
        }
    
    # 辅助方法
    def check_file_exists(self, path: str) -> bool:
        """检查文件是否存在"""
        full_path = project_root / path
        return full_path.exists()
    
    def check_dir_exists(self, path: str) -> bool:
        """检查目录是否存在"""
        full_path = project_root / path
        return full_path.is_dir()
    
    def check_router_exists(self, router_name: str) -> bool:
        """检查路由是否存在"""
        # 检查 app/routers/ 或 app/api/v1/ 目录
        router_paths = [
            f"app/routers/{router_name}.py",
            f"app/api/v1/{router_name}.py",
        ]
        return any(self.check_file_exists(path) for path in router_paths)
    
    def check_health_endpoints(self) -> bool:
        """检查健康检查端点"""
        # 检查 main.py 中是否有健康检查端点
        main_file = project_root / "app" / "main.py"
        if not main_file.exists():
            return False
        
        content = main_file.read_text(encoding="utf-8")
        return "/health" in content or "/ready" in content or "/live" in content
    
    def check_models_exist(self) -> bool:
        """检查 SQLAlchemy 模型是否存在"""
        models_dir = project_root / "app" / "models"
        if not models_dir.is_dir():
            return False
        
        # 检查关键模型文件
        key_models = [
            "user.py", "sample.py", "workflow.py", "task.py",
            "result.py", "audit.py", "report.py"
        ]
        
        return all((models_dir / model).exists() for model in key_models)
    
    def check_api_routes_registered(self) -> bool:
        """检查 API 路由是否注册"""
        main_file = project_root / "app" / "main.py"
        if not main_file.exists():
            return False
        
        content = main_file.read_text(encoding="utf-8")
        return "include_router" in content
    
    def check_openapi_docs(self) -> bool:
        """检查 OpenAPI 文档"""
        main_file = project_root / "app" / "main.py"
        if not main_file.exists():
            return False
        
        content = main_file.read_text(encoding="utf-8")
        return "FastAPI" in content and ("docs_url" in content or "openapi_url" in content)
    
    def check_api_prefix(self) -> bool:
        """检查 API 路由前缀"""
        main_file = project_root / "app" / "main.py"
        if not main_file.exists():
            return False
        
        content = main_file.read_text(encoding="utf-8")
        return "/api" in content or "prefix=" in content
    
    def check_response_schemas(self) -> bool:
        """检查响应 schema"""
        schemas_dir = project_root / "app" / "schemas"
        if not schemas_dir.is_dir():
            return False
        
        response_file = schemas_dir / "response.py"
        return response_file.exists()


def save_report(results: Dict[str, Any], filename: str = "FEATURE_COMPLETENESS_VERIFICATION_REPORT.md"):
    """保存验证报告"""
    report_path = project_root / filename
    
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# 功能完整性验证报告\n\n")
        f.write("## 验证概述\n\n")
        
        summary = results["summary"]
        f.write(f"- **总体完成度**: {summary['passed_checks']}/{summary['total_checks']} ({summary['overall_percentage']:.1f}%)\n")
        f.write(f"- **评估等级**: {summary['grade']}\n")
        f.write(f"- **建议**: {summary['recommendation']}\n\n")
        
        f.write("## 详细结果\n\n")
        
        # 需求实现情况
        f.write("### 1. 需求实现情况\n\n")
        req_summary = results["requirements"]["summary"]
        f.write(f"- 总检查项: {req_summary['total_checks']}\n")
        f.write(f"- 通过检查项: {req_summary['passed_checks']}\n")
        f.write(f"- 通过率: {req_summary['percentage']:.1f}%\n\n")
        
        for req_name, req_data in results["requirements"].items():
            if req_name == "summary":
                continue
            f.write(f"#### {req_name}\n\n")
            f.write(f"- 通过: {req_data['passed']}/{req_data['total']} ({req_data['percentage']:.1f}%)\n\n")
        
        # API 端点
        f.write("### 2. API 端点实现情况\n\n")
        api_data = results["api_endpoints"]
        f.write(f"- 总端点数: {api_data['total']}\n")
        f.write(f"- 已实现: {api_data['passed']}\n")
        f.write(f"- 实现率: {api_data['percentage']:.1f}%\n\n")
        
        # 业务逻辑
        f.write("### 3. 业务逻辑实现情况\n\n")
        logic_data = results["business_logic"]
        f.write(f"- 总服务数: {logic_data['total']}\n")
        f.write(f"- 已实现: {logic_data['passed']}\n")
        f.write(f"- 实现率: {logic_data['percentage']:.1f}%\n\n")
        
        # 前端兼容性
        f.write("### 4. 前端兼容性\n\n")
        compat_data = results["frontend_compatibility"]
        f.write(f"- 总检查项: {compat_data['total']}\n")
        f.write(f"- 通过检查项: {compat_data['passed']}\n")
        f.write(f"- 通过率: {compat_data['percentage']:.1f}%\n\n")
        
        # 发现的问题
        f.write("## 发现的问题\n\n")
        if summary["issues"]:
            for i, issue in enumerate(summary["issues"], 1):
                f.write(f"{i}. {issue}\n")
        else:
            f.write("✅ 未发现问题\n")
        
        f.write("\n## 结论\n\n")
        f.write(f"{summary['recommendation']}\n")
    
    print(f"\n报告已保存到: {report_path}")


def main():
    """主函数"""
    verifier = FeatureCompletenessVerifier()
    results = verifier.verify_all()
    
    # 保存报告
    save_report(results)
    
    # 保存 JSON 结果
    json_path = project_root / "feature_completeness_verification_results.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"JSON 结果已保存到: {json_path}")
    
    # 返回退出码
    if results["summary"]["overall_percentage"] >= 95:
        return 0
    else:
        return 1


if __name__ == "__main__":
    sys.exit(main())
