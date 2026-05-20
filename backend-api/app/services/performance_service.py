"""
性能监控服务

负责收集、存储和分析 API 和数据库性能数据。
"""
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging

from app.core.redis import get_redis_client

logger = logging.getLogger(__name__)


class PerformanceService:
    """性能监控服务"""
    
    def __init__(self):
        self.slow_request_threshold = 1000  # 1 秒（毫秒）
        self.slow_query_threshold = 1000  # 1 秒（毫秒）
        self.data_retention_hours = 24  # 保留 24 小时
        
        # Redis 键前缀
        self.API_METRICS_KEY = "performance:api:metrics"
        self.DB_METRICS_KEY = "performance:db:metrics"
        self.SLOW_REQUESTS_KEY = "performance:slow:requests"
        self.SLOW_QUERIES_KEY = "performance:slow:queries"
        self.PATH_STATS_KEY = "performance:path:stats"
    
    async def record_api_metric(
        self,
        method: str,
        path: str,
        duration: float,
        status_code: int,
        user_id: Optional[str] = None
    ) -> None:
        """
        记录 API 请求性能指标
        
        Args:
            method: HTTP 方法
            path: 请求路径
            duration: 请求持续时间（毫秒）
            status_code: HTTP 状态码
            user_id: 用户 ID（可选）
        """
        try:
            redis_client = await get_redis_client()
            if redis_client is None:
                return
            
            timestamp = datetime.utcnow()
            metric = {
                "method": method,
                "path": path,
                "duration": duration,
                "status_code": status_code,
                "user_id": user_id,
                "timestamp": timestamp.isoformat()
            }
            
            # 记录到 Redis（使用有序集合，按时间戳排序）
            score = timestamp.timestamp()
            import json
            value = json.dumps(metric)
            
            await redis_client.zadd(self.API_METRICS_KEY, {value: score})
            
            # 如果是慢请求，单独记录
            if duration >= self.slow_request_threshold:
                await self._record_slow_request(
                    method, path, duration, status_code, user_id, timestamp
                )
                
                logger.warning(
                    f"Slow API request detected: {method} {path} - {duration}ms"
                )
            
            # 更新路径统计
            await self._update_path_stats(method, path, duration, status_code)
            
            # 清理过期数据
            await self._cleanup_expired_data(self.API_METRICS_KEY)
        except Exception as e:
            logger.error(f"Failed to record API metric: {e}")
    
    async def record_database_metric(
        self,
        query: str,
        duration: float,
        model: Optional[str] = None,
        operation: Optional[str] = None
    ) -> None:
        """
        记录数据库查询性能指标
        
        Args:
            query: SQL 查询语句
            duration: 查询持续时间（毫秒）
            model: 模型名称（可选）
            operation: 操作类型（可选）
        """
        try:
            redis_client = await get_redis_client()
            if redis_client is None:
                return
            
            timestamp = datetime.utcnow()
            metric = {
                "query": query[:200],  # 只保存前 200 个字符
                "duration": duration,
                "model": model,
                "operation": operation,
                "timestamp": timestamp.isoformat()
            }
            
            score = timestamp.timestamp()
            import json
            value = json.dumps(metric)
            
            await redis_client.zadd(self.DB_METRICS_KEY, {value: score})
            
            # 如果是慢查询，单独记录
            if duration >= self.slow_query_threshold:
                await self._record_slow_query(query, duration, timestamp)
                
                logger.warning(
                    f"Slow database query detected: {query[:100]} - {duration}ms"
                )
            
            # 清理过期数据
            await self._cleanup_expired_data(self.DB_METRICS_KEY)
        except Exception as e:
            logger.error(f"Failed to record database metric: {e}")
    
    async def _record_slow_request(
        self,
        method: str,
        path: str,
        duration: float,
        status_code: int,
        user_id: Optional[str],
        timestamp: datetime
    ) -> None:
        """记录慢请求"""
        try:
            redis_client = await get_redis_client()
            if redis_client is None:
                return
            
            import uuid
            import json
            
            slow_request = {
                "id": str(uuid.uuid4()),
                "method": method,
                "path": path,
                "duration": duration,
                "status_code": status_code,
                "user_id": user_id,
                "timestamp": timestamp.isoformat()
            }
            
            score = timestamp.timestamp()
            value = json.dumps(slow_request)
            
            await redis_client.zadd(self.SLOW_REQUESTS_KEY, {value: score})
            
            # 限制慢请求记录数量（最多保留 1000 条）
            count = await redis_client.zcard(self.SLOW_REQUESTS_KEY)
            if count > 1000:
                await redis_client.zremrangebyrank(
                    self.SLOW_REQUESTS_KEY, 0, count - 1001
                )
        except Exception as e:
            logger.error(f"Failed to record slow request: {e}")
    
    async def _record_slow_query(
        self,
        query: str,
        duration: float,
        timestamp: datetime
    ) -> None:
        """记录慢查询"""
        try:
            redis_client = await get_redis_client()
            if redis_client is None:
                return
            
            import uuid
            import json
            
            slow_query = {
                "id": str(uuid.uuid4()),
                "query": query[:200],
                "duration": duration,
                "timestamp": timestamp.isoformat()
            }
            
            score = timestamp.timestamp()
            value = json.dumps(slow_query)
            
            await redis_client.zadd(self.SLOW_QUERIES_KEY, {value: score})
            
            # 限制慢查询记录数量（最多保留 1000 条）
            count = await redis_client.zcard(self.SLOW_QUERIES_KEY)
            if count > 1000:
                await redis_client.zremrangebyrank(
                    self.SLOW_QUERIES_KEY, 0, count - 1001
                )
        except Exception as e:
            logger.error(f"Failed to record slow query: {e}")
    
    async def _update_path_stats(
        self,
        method: str,
        path: str,
        duration: float,
        status_code: int
    ) -> None:
        """更新路径统计"""
        try:
            redis_client = await get_redis_client()
            if redis_client is None:
                return
            
            path_key = f"{self.PATH_STATS_KEY}:{method}:{path}"
            
            # 使用 Redis Hash 存储路径统计
            await redis_client.hincrby(path_key, "request_count", 1)
            await redis_client.hincrbyfloat(path_key, "total_duration", duration)
            
            if status_code >= 400:
                await redis_client.hincrby(path_key, "error_count", 1)
            
            # 更新最小/最大持续时间
            stats = await redis_client.hgetall(path_key)
            min_duration = float(stats.get("min_duration", float("inf")))
            max_duration = float(stats.get("max_duration", 0))
            
            if duration < min_duration:
                await redis_client.hset(path_key, "min_duration", str(duration))
            if duration > max_duration:
                await redis_client.hset(path_key, "max_duration", str(duration))
            
            # 设置过期时间
            await redis_client.expire(path_key, self.data_retention_hours * 3600)
            
            # 记录持续时间用于百分位数计算
            durations_key = f"{path_key}:durations"
            await redis_client.zadd(
                durations_key,
                {f"{time.time()}:{duration}": duration}
            )
            await redis_client.expire(
                durations_key, self.data_retention_hours * 3600
            )
            
            # 限制持续时间记录数量
            count = await redis_client.zcard(durations_key)
            if count > 1000:
                await redis_client.zremrangebyrank(durations_key, 0, count - 1001)
        except Exception as e:
            logger.error(f"Failed to update path stats: {e}")
    
    async def get_slow_requests(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        获取慢请求列表
        
        Args:
            limit: 返回的最大数量
        
        Returns:
            慢请求列表
        """
        try:
            redis_client = await get_redis_client()
            if redis_client is None:
                return []
            
            import json
            
            # 获取最近的慢请求（按时间倒序）
            results = await redis_client.zrevrange(
                self.SLOW_REQUESTS_KEY, 0, limit - 1
            )
            
            return [json.loads(result) for result in results]
        except Exception as e:
            logger.error(f"Failed to get slow requests: {e}")
            return []
    
    async def get_slow_queries(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        获取慢查询列表
        
        Args:
            limit: 返回的最大数量
        
        Returns:
            慢查询列表
        """
        try:
            redis_client = await get_redis_client()
            if redis_client is None:
                return []
            
            import json
            
            results = await redis_client.zrevrange(
                self.SLOW_QUERIES_KEY, 0, limit - 1
            )
            
            return [json.loads(result) for result in results]
        except Exception as e:
            logger.error(f"Failed to get slow queries: {e}")
            return []
    
    async def get_performance_stats(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        获取性能统计数据
        
        Args:
            start_time: 开始时间（默认最近 1 小时）
            end_time: 结束时间（默认当前时间）
        
        Returns:
            性能统计数据
        """
        try:
            redis_client = await get_redis_client()
            if redis_client is None:
                return {
                    "apiStats": {},
                    "databaseStats": {},
                    "timeRange": {}
                }
            
            start = start_time or datetime.utcnow() - timedelta(hours=1)
            end = end_time or datetime.utcnow()
            
            # 获取 API 指标
            api_metrics = await self._get_metrics_in_range(
                self.API_METRICS_KEY, start, end
            )
            
            # 获取数据库指标
            db_metrics = await self._get_metrics_in_range(
                self.DB_METRICS_KEY, start, end
            )
            
            # 计算统计数据
            api_stats = self._calculate_api_stats(api_metrics)
            database_stats = self._calculate_database_stats(db_metrics)
            
            return {
                "apiStats": api_stats,
                "databaseStats": database_stats,
                "timeRange": {
                    "start": start.isoformat(),
                    "end": end.isoformat()
                }
            }
        except Exception as e:
            logger.error(f"Failed to get performance stats: {e}")
            return {
                "apiStats": {},
                "databaseStats": {},
                "timeRange": {}
            }
    
    async def get_path_stats(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        获取路径性能统计
        
        Args:
            limit: 返回的最大数量
        
        Returns:
            路径性能统计列表
        """
        try:
            redis_client = await get_redis_client()
            if redis_client is None:
                return []
            
            # 获取所有路径统计键
            pattern = f"{self.PATH_STATS_KEY}:*"
            keys = await redis_client.keys(pattern)
            
            stats = []
            
            for key in keys:
                # 跳过持续时间记录键
                if key.endswith(":durations"):
                    continue
                
                data = await redis_client.hgetall(key)
                if not data or len(data) == 0:
                    continue
                
                # 解析路径和方法
                parts = key.replace(f"{self.PATH_STATS_KEY}:", "").split(":", 1)
                if len(parts) < 2:
                    continue
                
                method = parts[0]
                path = parts[1]
                
                request_count = int(data.get("request_count", 0))
                total_duration = float(data.get("total_duration", 0))
                error_count = int(data.get("error_count", 0))
                
                # 获取持续时间用于百分位数计算
                durations_key = f"{key}:durations"
                durations_data = await redis_client.zrange(
                    durations_key, 0, -1, withscores=True
                )
                
                duration_values = []
                for i in range(0, len(durations_data), 2):
                    if i + 1 < len(durations_data):
                        duration_values.append(float(durations_data[i + 1]))
                
                duration_values.sort()
                
                stats.append({
                    "path": path,
                    "method": method,
                    "requestCount": request_count,
                    "averageDuration": total_duration / request_count if request_count > 0 else 0,
                    "minDuration": float(data.get("min_duration", 0)),
                    "maxDuration": float(data.get("max_duration", 0)),
                    "p50Duration": self._calculate_percentile(duration_values, 50),
                    "p95Duration": self._calculate_percentile(duration_values, 95),
                    "p99Duration": self._calculate_percentile(duration_values, 99),
                    "errorCount": error_count,
                    "errorRate": error_count / request_count if request_count > 0 else 0
                })
            
            # 按请求数量排序
            stats.sort(key=lambda x: x["requestCount"], reverse=True)
            
            return stats[:limit]
        except Exception as e:
            logger.error(f"Failed to get path stats: {e}")
            return []
    
    async def _get_metrics_in_range(
        self,
        key: str,
        start: datetime,
        end: datetime
    ) -> List[Dict[str, Any]]:
        """获取时间范围内的指标"""
        try:
            redis_client = await get_redis_client()
            if redis_client is None:
                return []
            
            import json
            
            results = await redis_client.zrangebyscore(
                key,
                start.timestamp(),
                end.timestamp()
            )
            
            return [json.loads(result) for result in results]
        except Exception as e:
            logger.error(f"Failed to get metrics in range: {e}")
            return []
    
    def _calculate_api_stats(self, metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
        """计算 API 统计数据"""
        if not metrics:
            return {
                "totalRequests": 0,
                "averageDuration": 0,
                "p50Duration": 0,
                "p95Duration": 0,
                "p99Duration": 0,
                "slowRequestCount": 0,
                "errorRate": 0
            }
        
        durations = sorted([m["duration"] for m in metrics])
        total_duration = sum(durations)
        error_count = sum(1 for m in metrics if m["status_code"] >= 400)
        slow_request_count = sum(
            1 for m in metrics if m["duration"] >= self.slow_request_threshold
        )
        
        return {
            "totalRequests": len(metrics),
            "averageDuration": total_duration / len(metrics),
            "p50Duration": self._calculate_percentile(durations, 50),
            "p95Duration": self._calculate_percentile(durations, 95),
            "p99Duration": self._calculate_percentile(durations, 99),
            "slowRequestCount": slow_request_count,
            "errorRate": error_count / len(metrics)
        }
    
    def _calculate_database_stats(
        self, metrics: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """计算数据库统计数据"""
        if not metrics:
            return {
                "totalQueries": 0,
                "averageDuration": 0,
                "slowQueryCount": 0
            }
        
        durations = [m["duration"] for m in metrics]
        total_duration = sum(durations)
        slow_query_count = sum(
            1 for m in metrics if m["duration"] >= self.slow_query_threshold
        )
        
        return {
            "totalQueries": len(metrics),
            "averageDuration": total_duration / len(metrics),
            "slowQueryCount": slow_query_count
        }
    
    def _calculate_percentile(self, sorted_values: List[float], percentile: int) -> float:
        """计算百分位数"""
        if not sorted_values:
            return 0
        
        index = max(0, int((percentile / 100) * len(sorted_values)) - 1)
        return sorted_values[index]
    
    async def _cleanup_expired_data(self, key: str) -> None:
        """清理过期数据"""
        try:
            redis_client = await get_redis_client()
            if redis_client is None:
                return
            
            cutoff_time = (
                datetime.utcnow() - timedelta(hours=self.data_retention_hours)
            ).timestamp()
            
            await redis_client.zremrangebyscore(key, "-inf", cutoff_time)
        except Exception as e:
            logger.error(f"Failed to cleanup expired data: {e}")


# 创建全局实例
performance_service = PerformanceService()
