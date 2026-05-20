#!/usr/bin/env python3
"""
验证审核模板和工作流配置端点

此脚本验证 FastAPI 后端的审核模板和工作流配置端点是否正确配置。
"""
import sys
import importlib.util

def check_module_exists(module_path):
    """检查模块是否存在"""
    try:
        spec = importlib.util.find_spec(module_path)
        return spec is not None
    except (ImportError, ModuleNotFoundError):
        return False

def verify_models():
    """验证模型定义"""
    print("=== 验证模型定义 ===")
    
    try:
        from fastapi_backend.app.models.audit import (
            AuditCommentTemplate,
            AuditWorkflowConfig,
            CommentTemplateType,
            WorkflowConfigStatus
        )
        print("✓ 审核模型导入成功")
        
        # 验证枚举值
        assert hasattr(CommentTemplateType, 'APPROVED')
        assert hasattr(CommentTemplateType, 'NEED_REVISION')
        assert hasattr(CommentTemplateType, 'REJECTED')
        assert hasattr(CommentTemplateType, 'OTHER')
        print("✓ CommentTemplateType 枚举值正确")
        
        assert hasattr(WorkflowConfigStatus, 'ACTIVE')
        assert hasattr(WorkflowConfigStatus, 'INACTIVE')
        print("✓ WorkflowConfigStatus 枚举值正确")
        
        return True
    except Exception as e:
        print(f"✗ 模型验证失败: {e}")
        return False

def verify_schemas():
    """验证 Schema 定义"""
    print("\n=== 验证 Schema 定义 ===")
    
    try:
        from fastapi_backend.app.schemas.audit import (
            CreateTemplateDto,
            UpdateTemplateDto,
            AuditCommentTemplateResponse,
            CreateWorkflowConfigDto,
            UpdateWorkflowConfigDto,
            AuditWorkflowConfigResponse,
            WorkflowLevel
        )
        print("✓ 审核 Schema 导入成功")
        
        # 验证 DTO 字段
        template_dto = CreateTemplateDto(
            name="测试模板",
            type="APPROVED",
            content="测试内容",
            isDefault=True
        )
        print("✓ CreateTemplateDto 验证通过")
        
        workflow_dto = CreateWorkflowConfigDto(
            name="测试配置",
            sampleTypes=["食品"],
            levels=[
                WorkflowLevel(
                    order=1,
                    name="初审",
                    role="初审员",
                    required=True,
                    autoAssign=True
                )
            ],
            parallelAudit=False
        )
        print("✓ CreateWorkflowConfigDto 验证通过")
        
        return True
    except Exception as e:
        print(f"✗ Schema 验证失败: {e}")
        return False

def verify_service():
    """验证服务层方法"""
    print("\n=== 验证服务层方法 ===")
    
    try:
        from fastapi_backend.app.services.audit_service import audit_service
        
        # 验证审核意见模板方法
        assert hasattr(audit_service, 'list_templates')
        assert hasattr(audit_service, 'get_template_by_id')
        assert hasattr(audit_service, 'create_template')
        assert hasattr(audit_service, 'update_template')
        assert hasattr(audit_service, 'delete_template')
        print("✓ 审核意见模板服务方法存在")
        
        # 验证审核流程配置方法
        assert hasattr(audit_service, 'list_workflow_configs')
        assert hasattr(audit_service, 'get_workflow_config_by_id')
        assert hasattr(audit_service, 'create_workflow_config')
        assert hasattr(audit_service, 'update_workflow_config')
        assert hasattr(audit_service, 'delete_workflow_config')
        print("✓ 审核流程配置服务方法存在")
        
        # 验证辅助方法
        assert hasattr(audit_service, '_validate_workflow_levels')
        print("✓ 辅助方法存在")
        
        return True
    except Exception as e:
        print(f"✗ 服务层验证失败: {e}")
        return False

def verify_routes():
    """验证路由定义"""
    print("\n=== 验证路由定义 ===")
    
    try:
        from fastapi_backend.app.routers.audits import router
        
        # 获取所有路由
        routes = [route for route in router.routes]
        route_paths = [route.path for route in routes]
        
        # 验证审核意见模板路由
        template_routes = [
            "/templates",
            "/templates/{template_id}"
        ]
        
        for route_path in template_routes:
            if route_path in route_paths:
                print(f"✓ 路由存在: {route_path}")
            else:
                print(f"✗ 路由缺失: {route_path}")
                return False
        
        # 验证审核流程配置路由
        workflow_routes = [
            "/workflow-configs",
            "/workflow-configs/{config_id}"
        ]
        
        for route_path in workflow_routes:
            if route_path in route_paths:
                print(f"✓ 路由存在: {route_path}")
            else:
                print(f"✗ 路由缺失: {route_path}")
                return False
        
        # 验证路由方法
        route_methods = {}
        for route in routes:
            if hasattr(route, 'methods'):
                route_methods[route.path] = route.methods
        
        print("\n路由方法映射:")
        for path, methods in route_methods.items():
            if 'template' in path or 'workflow-config' in path:
                print(f"  {path}: {methods}")
        
        return True
    except Exception as e:
        print(f"✗ 路由验证失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主验证函数"""
    print("=" * 60)
    print("审核模板和工作流配置端点验证")
    print("=" * 60)
    
    results = []
    
    # 验证各个组件
    results.append(("模型定义", verify_models()))
    results.append(("Schema 定义", verify_schemas()))
    results.append(("服务层方法", verify_service()))
    results.append(("路由定义", verify_routes()))
    
    # 输出总结
    print("\n" + "=" * 60)
    print("验证总结")
    print("=" * 60)
    
    all_passed = True
    for name, passed in results:
        status = "✓ 通过" if passed else "✗ 失败"
        print(f"{name}: {status}")
        if not passed:
            all_passed = False
    
    print("=" * 60)
    
    if all_passed:
        print("\n✓ 所有验证通过！审核模板和工作流配置功能已正确实现。")
        return 0
    else:
        print("\n✗ 部分验证失败，请检查上述错误信息。")
        return 1

if __name__ == "__main__":
    sys.exit(main())
