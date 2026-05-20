"""
测试Pydantic序列化行为
"""
from pydantic import BaseModel, Field


class PaginationInfo(BaseModel):
    """分页信息模型"""
    total: int = Field(..., description="总记录数")
    page: int = Field(..., description="当前页码")
    pageSize: int = Field(..., description="每页记录数", alias="page_size")
    totalPages: int = Field(..., description="总页数", alias="total_pages")
    
    model_config = {
        "populate_by_name": True
    }


# 测试1: 使用别名创建
print("="*60)
print("测试1: 使用别名创建对象")
print("="*60)
pagination1 = PaginationInfo(
    total=262,
    page=1,
    page_size=20,
    total_pages=14
)
print(f"对象创建成功: {pagination1}")
print(f"model_dump(): {pagination1.model_dump()}")
print(f"model_dump(by_alias=True): {pagination1.model_dump(by_alias=True)}")
print(f"model_dump_json(): {pagination1.model_dump_json()}")
print(f"model_dump_json(by_alias=True): {pagination1.model_dump_json(by_alias=True)}")
print()

# 测试2: 使用字段名创建
print("="*60)
print("测试2: 使用字段名创建对象")
print("="*60)
pagination2 = PaginationInfo(
    total=262,
    page=1,
    pageSize=20,
    totalPages=14
)
print(f"对象创建成功: {pagination2}")
print(f"model_dump(): {pagination2.model_dump()}")
print(f"model_dump(by_alias=True): {pagination2.model_dump(by_alias=True)}")
print(f"model_dump_json(): {pagination2.model_dump_json()}")
print(f"model_dump_json(by_alias=True): {pagination2.model_dump_json(by_alias=True)}")
print()

print("="*60)
print("结论:")
print("="*60)
print("- model_dump() 使用字段名（驼峰）")
print("- model_dump(by_alias=True) 使用别名（蛇形）")
print("- FastAPI默认使用 model_dump() 进行序列化")
print("- 所以API响应应该使用驼峰命名")
print("="*60)
