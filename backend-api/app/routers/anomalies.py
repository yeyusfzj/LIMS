"""
异常检测路由

处理异常检测规则配置和复测申请相关的 HTTP 请求
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

from app.core.database import get_db
from app.core.exceptions import NotFoundException
from app.api.deps import get_current_user
from app.services.anomaly_service import anomaly_service
from app.models.user import User

router = APIRouter(prefix="/api/v1", tags=["anomalies"])


@router.post("/anomaly-rules", status_code=status.HTTP_201_CREATED)
async def create_anomaly_rule(
    data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    创建异常检测规则
    
    POST /api/v1/anomaly-rules
    
    需求: 3.6
    """
    # 设置创建者
    if "createdBy" not in data:
        data["createdBy"] = current_user.id
    
    rule = await anomaly_service.create_rule(db, data)
    
    return {
        "success": True,
        "data": rule,
        "message": "异常检测规则创建成功"
    }


@router.get("/anomaly-rules/{rule_id}")
async def get_anomaly_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    获取异常检测规则详情
    
    GET /api/v1/anomaly-rules/{rule_id}
    """
    rule = await anomaly_service.get_rule(db, rule_id)
    
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "RULE_NOT_FOUND",
                "message": "异常检测规则不存在"
            }
        )
    
    return {
        "success": True,
        "data": rule
    }


@router.get("/anomaly-rules")
async def list_anomaly_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    查询异常检测规则列表
    
    GET /api/v1/anomaly-rules
    """
    rules = await anomaly_service.list_rules(db)
    
    return {
        "success": True,
        "data": rules
    }


@router.put("/anomaly-rules/{rule_id}")
async def update_anomaly_rule(
    rule_id: str,
    data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    更新异常检测规则
    
    PUT /api/v1/anomaly-rules/{rule_id}
    """
    try:
        rule = await anomaly_service.update_rule(db, rule_id, data)
        
        return {
            "success": True,
            "data": rule,
            "message": "异常检测规则更新成功"
        }
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "RULE_NOT_FOUND",
                "message": str(e)
            }
        )


@router.delete("/anomaly-rules/{rule_id}")
async def delete_anomaly_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    删除异常检测规则
    
    DELETE /api/v1/anomaly-rules/{rule_id}
    """
    try:
        await anomaly_service.delete_rule(db, rule_id)
        
        return {
            "success": True,
            "message": "异常检测规则删除成功"
        }
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "RULE_NOT_FOUND",
                "message": str(e)
            }
        )


@router.post("/results/{result_id}/mark-abnormal")
async def mark_result_abnormal(
    result_id: str,
    data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    手动标记结果为异常
    
    POST /api/v1/results/{result_id}/mark-abnormal
    
    需求: 3.8
    """
    reason = data.get("reason")
    
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "REASON_REQUIRED",
                "message": "请提供异常原因"
            }
        )
    
    try:
        result = await anomaly_service.mark_as_abnormal(db, result_id, reason)
        
        return {
            "success": True,
            "data": result,
            "message": "结果已标记为异常"
        }
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "RESULT_NOT_FOUND",
                "message": str(e)
            }
        )


@router.post("/results/{result_id}/retest", status_code=status.HTTP_201_CREATED)
async def request_retest(
    result_id: str,
    data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    申请复测
    
    POST /api/v1/results/{result_id}/retest
    
    需求: 10.1, 10.2
    """
    reason = data.get("reason")
    
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "REASON_REQUIRED",
                "message": "请提供复测原因"
            }
        )
    
    retest_data = {
        "resultId": result_id,
        "reason": reason,
        "requestedBy": current_user.id,
        "priority": data.get("priority", "NORMAL")
    }
    
    try:
        retest_response = await anomaly_service.request_retest(db, retest_data)
        
        return {
            "success": True,
            "data": retest_response,
            "message": "复测申请已创建"
        }
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "RESULT_NOT_FOUND",
                "message": str(e)
            }
        )


@router.post("/results/{result_id}/detect-anomaly")
async def detect_result_anomaly(
    result_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    检测结果异常
    
    POST /api/v1/results/{result_id}/detect-anomaly
    
    需求: 3.7
    """
    try:
        # 获取结果
        result = await anomaly_service.get_result(db, result_id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "RESULT_NOT_FOUND",
                    "message": "结果不存在"
                }
            )
        
        # 执行异常检测
        anomaly_result = await anomaly_service.detect_anomaly(db, result)
        
        return {
            "success": True,
            "data": anomaly_result,
            "message": "检测到异常" if anomaly_result["isAbnormal"] else "未检测到异常"
        }
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "RESULT_NOT_FOUND",
                "message": str(e)
            }
        )


@router.get("/anomalies")
async def list_anomalies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    """
    查询异常列表
    
    GET /api/v1/anomalies
    
    查询所有标记为异常的结果
    """
    from app.models.result import Result
    from sqlalchemy import select, func
    
    # 计算偏移量
    offset = (page - 1) * page_size
    
    # 查询总数
    count_stmt = select(func.count(Result.id)).where(Result.isAbnormal == True)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar()
    
    # 查询数据
    stmt = (
        select(Result)
        .where(Result.isAbnormal == True)
        .order_by(Result.enteredAt.desc())
        .offset(offset)
        .limit(page_size)
    )
    
    db_result = await db.execute(stmt)
    results = db_result.scalars().all()
    
    # 转换为字典
    items = [anomaly_service._result_to_dict(r) for r in results]
    
    return {
        "success": True,
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": (total + page_size - 1) // page_size
        }
    }


@router.post("/anomalies/{anomaly_id}/handle")
async def handle_anomaly(
    anomaly_id: str,
    data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    处理异常
    
    POST /api/v1/anomalies/{anomaly_id}/handle
    
    支持的操作：
    - retest: 申请复测
    - ignore: 忽略异常
    - confirm: 确认异常
    """
    action = data.get("action")
    
    if not action:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "ACTION_REQUIRED",
                "message": "请提供处理操作"
            }
        )
    
    if action == "retest":
        # 申请复测
        reason = data.get("reason", "异常结果需要复测")
        retest_data = {
            "resultId": anomaly_id,
            "reason": reason,
            "requestedBy": current_user.id,
            "priority": data.get("priority", "NORMAL")
        }
        
        try:
            retest_response = await anomaly_service.request_retest(db, retest_data)
            
            return {
                "success": True,
                "data": retest_response,
                "message": "复测申请已创建"
            }
        except NotFoundException as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "RESULT_NOT_FOUND",
                    "message": str(e)
                }
            )
    
    elif action == "ignore":
        # 忽略异常（清除异常标记）
        from app.models.result import Result
        from sqlalchemy import select
        
        stmt = select(Result).where(Result.id == anomaly_id)
        db_result = await db.execute(stmt)
        result = db_result.scalar_one_or_none()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "RESULT_NOT_FOUND",
                    "message": "结果不存在"
                }
            )
        
        result.isAbnormal = False
        result.abnormalReason = None
        
        await db.commit()
        await db.refresh(result)
        
        return {
            "success": True,
            "data": anomaly_service._result_to_dict(result),
            "message": "异常已忽略"
        }
    
    elif action == "confirm":
        # 确认异常（保持异常标记）
        from app.models.result import Result
        from sqlalchemy import select
        
        stmt = select(Result).where(Result.id == anomaly_id)
        db_result = await db.execute(stmt)
        result = db_result.scalar_one_or_none()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "RESULT_NOT_FOUND",
                    "message": "结果不存在"
                }
            )
        
        return {
            "success": True,
            "data": anomaly_service._result_to_dict(result),
            "message": "异常已确认"
        }
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_ACTION",
                "message": f"不支持的操作: {action}"
            }
        )
