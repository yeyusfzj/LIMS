"""
审计日志中间件
自动记录所有 API 操作
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.orm import Session
import json
import logging
from typing import Callable

from app.core.database import SessionLocal
from app.services.audit_log_service import AuditLogService
from app.schemas.audit_log import CreateAuditLogDto

logger = logging.getLogger(__name__)


class AuditLogMiddleware(BaseHTTPMiddleware):
    """审计日志中间件"""

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        # 需要记录审计日志的操作方法
        self.audit_methods = {"POST", "PUT", "PATCH", "DELETE"}
        # 排除的路径（不记录审计日志）
        self.excluded_paths = {
            "/api/v1/audit-logs",  # 审计日志自身的 API
            "/api/v1/auth/login",  # 登录操作（由认证服务单独记录）
            "/api/v1/auth/refresh",  # 刷新令牌
            "/health",  # 健康检查
            "/docs",  # API 文档
            "/openapi.json",  # OpenAPI 规范
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """处理请求并记录审计日志"""
        
        # 执行请求
        response = await call_next(request)

        # 判断是否需要记录审计日志
        if self._should_audit(request, response):
            try:
                await self._create_audit_log(request, response)
            except Exception as e:
                # 审计日志记录失败不应影响正常请求
                logger.error(f"Failed to create audit log: {e}")

        return response

    def _should_audit(self, request: Request, response: Response) -> bool:
        """判断是否需要记录审计日志"""
        
        # 只记录特定方法的请求
        if request.method not in self.audit_methods:
            return False

        # 排除特定路径
        path = request.url.path
        for excluded_path in self.excluded_paths:
            if path.startswith(excluded_path):
                return False

        # 只记录成功的请求（2xx 状态码）
        if response.status_code < 200 or response.status_code >= 300:
            return False

        return True

    async def _create_audit_log(self, request: Request, response: Response):
        """创建审计日志记录"""
        
        # 从请求中获取用户信息
        user = getattr(request.state, "user", None)
        if not user:
            # 如果没有用户信息，不记录审计日志
            return

        # 解析资源信息
        resource, resource_id = self._parse_resource(request)

        # 获取操作类型
        action = self._get_action(request.method, resource)

        # 获取变更内容（对于 POST/PUT/PATCH 请求）
        changes = await self._get_changes(request)

        # 获取客户端信息
        ip_address = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent")

        # 创建审计日志
        db = SessionLocal()
        try:
            service = AuditLogService(db)
            audit_log_data = CreateAuditLogDto(
                userId=user.id,
                username=user.username,
                action=action,
                resource=resource,
                resourceId=resource_id,
                changes=changes,
                ipAddress=ip_address,
                userAgent=user_agent
            )
            service.create_audit_log(audit_log_data)
        finally:
            db.close()

    def _parse_resource(self, request: Request) -> tuple[str, str]:
        """解析资源类型和资源 ID"""
        path = request.url.path
        parts = path.strip("/").split("/")

        # 默认值
        resource = "unknown"
        resource_id = "unknown"

        # 解析路径：/api/v1/{resource}/{id}
        if len(parts) >= 3:
            resource = parts[2]  # 资源类型
            if len(parts) >= 4 and parts[3] not in ["import", "export", "statistics"]:
                resource_id = parts[3]  # 资源 ID

        return resource, resource_id

    def _get_action(self, method: str, resource: str) -> str:
        """获取操作类型"""
        action_map = {
            "POST": f"create_{resource}",
            "PUT": f"update_{resource}",
            "PATCH": f"update_{resource}",
            "DELETE": f"delete_{resource}"
        }
        return action_map.get(method, f"{method.lower()}_{resource}")

    async def _get_changes(self, request: Request) -> dict:
        """获取变更内容"""
        if request.method in {"POST", "PUT", "PATCH"}:
            try:
                # 尝试读取请求体
                body = await request.body()
                if body:
                    return json.loads(body.decode("utf-8"))
            except Exception as e:
                logger.warning(f"Failed to parse request body: {e}")
        
        return None

    def _get_client_ip(self, request: Request) -> str:
        """获取客户端 IP 地址"""
        # 优先从 X-Forwarded-For 头获取（如果使用了代理）
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # 从 X-Real-IP 头获取
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # 从客户端直接获取
        if request.client:
            return request.client.host
        
        return "unknown"
