"""
用户相关的 SQLAlchemy 模型
"""
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Table, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.models.base import Base


class UserStatus(str, enum.Enum):
    """用户状态枚举"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    LOCKED = "LOCKED"


# 用户-角色关联表
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('userId', String, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('roleId', String, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    Column('assignedAt', DateTime, default=datetime.utcnow)
)


class User(Base):
    """用户模型"""
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    passwordHash = Column(String(255), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    fullName = Column(String(100), nullable=False)
    department = Column(String(100))
    position = Column(String(100))
    phone = Column(String(20))
    status = Column(SQLEnum(UserStatus, name='UserStatus'), default=UserStatus.ACTIVE, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    lastLoginAt = Column(DateTime)
    
    # 关系
    roles = relationship('Role', secondary=user_roles, back_populates='users')
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email})>"


class Role(Base):
    """角色模型"""
    __tablename__ = 'roles'
    
    id = Column(String, primary_key=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(200))
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # 关系
    users = relationship('User', secondary=user_roles, back_populates='roles')
    permissions = relationship('Permission', secondary='role_permissions', back_populates='roles')
    
    def __repr__(self):
        return f"<Role(id={self.id}, name={self.name})>"


# 角色-权限关联表
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('roleId', String, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    Column('permissionId', String, ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True)
)


class Permission(Base):
    """权限模型"""
    __tablename__ = 'permissions'
    
    id = Column(String, primary_key=True)
    resource = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 关系
    roles = relationship('Role', secondary=role_permissions, back_populates='permissions')
    
    def __repr__(self):
        return f"<Permission(id={self.id}, resource={self.resource}, action={self.action})>"
    
    __table_args__ = (
        {'extend_existing': True}
    )
