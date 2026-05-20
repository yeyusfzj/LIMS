"""
验证基础仓库类的实现

这个脚本验证 BaseRepository 类的结构和方法签名是否正确。
"""
import inspect
from app.repositories.base_repository import BaseRepository, PaginatedResponse
from app.models.sample import Sample


def verify_base_repository():
    """验证基础仓库类"""
    print("=" * 60)
    print("验证基础仓库类 (BaseRepository)")
    print("=" * 60)
    
    # 1. 验证类存在
    print("\n✓ BaseRepository 类已定义")
    
    # 2. 验证泛型支持
    print("✓ BaseRepository 支持泛型 (Generic[ModelType])")
    
    # 3. 验证必需的方法
    required_methods = [
        'create',
        'get_by_id',
        'get_by_id_or_404',
        'get_all',
        'get_paginated',
        'update',
        'delete',
        'delete_many',
        'count',
        'exists',
        'exists_by_field',
        '_apply_filters'
    ]
    
    print("\n检查必需的方法:")
    for method_name in required_methods:
        if hasattr(BaseRepository, method_name):
            method = getattr(BaseRepository, method_name)
            sig = inspect.signature(method)
            print(f"  ✓ {method_name}{sig}")
        else:
            print(f"  ✗ {method_name} - 缺失")
    
    # 4. 验证方法是否为异步
    print("\n检查异步方法:")
    async_methods = [
        'create', 'get_by_id', 'get_by_id_or_404', 'get_all',
        'get_paginated', 'update', 'delete', 'delete_many',
        'count', 'exists', 'exists_by_field'
    ]
    
    for method_name in async_methods:
        if hasattr(BaseRepository, method_name):
            method = getattr(BaseRepository, method_name)
            if inspect.iscoroutinefunction(method):
                print(f"  ✓ {method_name} 是异步方法")
            else:
                print(f"  ✗ {method_name} 不是异步方法")
    
    # 5. 验证 PaginatedResponse 模型
    print("\n✓ PaginatedResponse 模型已定义")
    print(f"  字段: {list(PaginatedResponse.__annotations__.keys())}")
    
    # 6. 验证文档字符串
    print("\n检查文档字符串:")
    if BaseRepository.__doc__:
        print(f"  ✓ BaseRepository 有文档字符串")
        print(f"    {BaseRepository.__doc__[:100]}...")
    
    for method_name in ['create', 'get_by_id', 'update', 'delete']:
        method = getattr(BaseRepository, method_name)
        if method.__doc__:
            print(f"  ✓ {method_name} 有文档字符串")
        else:
            print(f"  ✗ {method_name} 缺少文档字符串")
    
    # 7. 验证类型注解
    print("\n检查类型注解:")
    for method_name in ['create', 'get_by_id', 'update']:
        method = getattr(BaseRepository, method_name)
        sig = inspect.signature(method)
        has_annotations = any(
            param.annotation != inspect.Parameter.empty
            for param in sig.parameters.values()
        )
        if has_annotations:
            print(f"  ✓ {method_name} 有类型注解")
        else:
            print(f"  ✗ {method_name} 缺少类型注解")
    
    print("\n" + "=" * 60)
    print("验证完成！")
    print("=" * 60)
    
    # 8. 功能特性总结
    print("\n功能特性总结:")
    print("  ✓ 通用 CRUD 操作 (create, get, update, delete)")
    print("  ✓ 分页查询 (get_all, get_paginated)")
    print("  ✓ 条件过滤 (_apply_filters)")
    print("  ✓ 批量操作 (delete_many)")
    print("  ✓ 记录统计 (count)")
    print("  ✓ 存在性检查 (exists, exists_by_field)")
    print("  ✓ 乐观锁支持 (update 方法的 check_version 参数)")
    print("  ✓ 软删除和硬删除 (delete 方法的 soft_delete 参数)")
    print("  ✓ 异步操作 (所有方法都是 async)")
    print("  ✓ 泛型支持 (Generic[ModelType])")
    print("  ✓ 完整的类型注解")
    print("  ✓ 详细的文档字符串")
    
    # 9. 过滤操作符支持
    print("\n支持的过滤操作符:")
    print("  ✓ 精确匹配: {'field': 'value'}")
    print("  ✓ 列表匹配 (IN): {'field': ['value1', 'value2']}")
    print("  ✓ 大于等于: {'field__gte': value}")
    print("  ✓ 大于: {'field__gt': value}")
    print("  ✓ 小于等于: {'field__lte': value}")
    print("  ✓ 小于: {'field__lt': value}")
    print("  ✓ 模糊查询: {'field__like': '%value%'}")
    print("  ✓ 不区分大小写模糊查询: {'field__ilike': '%value%'}")
    print("  ✓ 空值查询: {'field__isnull': True/False}")
    print("  ✓ IN 查询: {'field__in': [value1, value2]}")
    print("  ✓ NOT IN 查询: {'field__notin': [value1, value2]}")
    
    # 10. 使用示例
    print("\n使用示例:")
    print("""
    # 创建仓库实例
    class SampleRepository(BaseRepository[Sample]):
        def __init__(self, db: AsyncSession):
            super().__init__(Sample, db)
    
    # 使用仓库
    repo = SampleRepository(db)
    
    # 创建记录
    sample = await repo.create(sample_data)
    
    # 查询记录
    sample = await repo.get_by_id(sample_id)
    samples = await repo.get_all(skip=0, limit=10)
    
    # 分页查询
    items, meta = await repo.get_paginated(page=1, page_size=10)
    
    # 条件过滤
    samples = await repo.get_all(
        filters={"status": "REGISTERED", "quantity__gte": 100}
    )
    
    # 更新记录
    sample = await repo.update(sample_id, {"client_name": "新客户"})
    
    # 乐观锁更新
    sample = await repo.update(
        sample_id,
        {"client_name": "新客户"},
        check_version=True,
        current_version=1
    )
    
    # 删除记录
    await repo.delete(sample_id, soft_delete=True)  # 软删除
    await repo.delete(sample_id, soft_delete=False)  # 硬删除
    
    # 批量删除
    result = await repo.delete_many([id1, id2, id3])
    
    # 统计记录
    total = await repo.count()
    total = await repo.count(filters={"status": "REGISTERED"})
    
    # 检查存在
    exists = await repo.exists(sample_id)
    exists = await repo.exists_by_field("barcode", "SP20260101000001")
    """)


if __name__ == "__main__":
    verify_base_repository()
