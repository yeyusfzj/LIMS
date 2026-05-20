"""
创建认证相关的数据库表和初始数据
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.database import engine
from app.models import Base, User, Role, Permission, UserStatus
from app.services.auth_service import AuthService
import uuid


async def create_tables():
    """创建数据库表"""
    print("Creating database tables...")
    
    async with engine.begin() as conn:
        # 创建用户、角色、权限表
        await conn.run_sync(Base.metadata.create_all)
    
    print("✓ Tables created successfully")


async def create_initial_data():
    """创建初始数据"""
    print("\nCreating initial data...")
    
    from app.core.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        try:
            # 检查是否已有数据
            result = await db.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.scalar()
            
            if user_count > 0:
                print("✓ Initial data already exists, skipping...")
                return
            
            # 创建权限
            print("Creating permissions...")
            permissions = [
                Permission(
                    id=str(uuid.uuid4()),
                    resource="sample",
                    action="create"
                ),
                Permission(
                    id=str(uuid.uuid4()),
                    resource="sample",
                    action="read"
                ),
                Permission(
                    id=str(uuid.uuid4()),
                    resource="sample",
                    action="update"
                ),
                Permission(
                    id=str(uuid.uuid4()),
                    resource="sample",
                    action="delete"
                ),
                Permission(
                    id=str(uuid.uuid4()),
                    resource="user",
                    action="manage"
                ),
            ]
            
            for perm in permissions:
                db.add(perm)
            
            await db.flush()
            print(f"✓ Created {len(permissions)} permissions")
            
            # 创建角色
            print("Creating roles...")
            admin_role = Role(
                id=str(uuid.uuid4()),
                name="admin",
                description="系统管理员"
            )
            
            user_role = Role(
                id=str(uuid.uuid4()),
                name="user",
                description="普通用户"
            )
            
            db.add(admin_role)
            db.add(user_role)
            
            await db.flush()
            print("✓ Created 2 roles")
            
            # 为管理员角色分配所有权限
            admin_role.permissions = permissions
            
            # 为普通用户角色分配读取权限
            user_role.permissions = [p for p in permissions if p.action == "read"]
            
            # 创建管理员用户
            print("Creating admin user...")
            admin_user = User(
                id=str(uuid.uuid4()),
                username="admin",
                passwordHash=AuthService.hash_password("admin123"),
                email="admin@example.com",
                fullName="系统管理员",
                department="技术部",
                position="系统管理员",
                status=UserStatus.ACTIVE
            )
            
            db.add(admin_user)
            await db.flush()
            
            # 分配管理员角色
            admin_user.roles = [admin_role, user_role]
            
            print("✓ Created admin user (username: admin, password: admin123)")
            
            # 创建测试用户
            print("Creating test user...")
            test_user = User(
                id=str(uuid.uuid4()),
                username="testuser",
                passwordHash=AuthService.hash_password("test123"),
                email="test@example.com",
                fullName="测试用户",
                department="测试部",
                position="测试工程师",
                status=UserStatus.ACTIVE
            )
            
            db.add(test_user)
            await db.flush()
            
            # 分配普通用户角色
            test_user.roles = [user_role]
            
            print("✓ Created test user (username: testuser, password: test123)")
            
            # 提交事务
            await db.commit()
            
            print("\n✓ Initial data created successfully!")
            print("\nTest accounts:")
            print("  Admin: username=admin, password=admin123")
            print("  User:  username=testuser, password=test123")
            
        except Exception as e:
            await db.rollback()
            print(f"\n✗ Error creating initial data: {e}")
            raise


async def main():
    """主函数"""
    print("=" * 60)
    print("FastAPI Authentication Setup")
    print("=" * 60)
    
    try:
        # 创建表
        await create_tables()
        
        # 创建初始数据
        await create_initial_data()
        
        print("\n" + "=" * 60)
        print("Setup completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Setup failed: {e}")
        sys.exit(1)
    finally:
        # 关闭数据库连接
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
