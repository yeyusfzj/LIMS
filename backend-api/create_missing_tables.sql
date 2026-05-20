-- 创建缺失的 role_permissions 表
CREATE TABLE IF NOT EXISTS role_permissions (
    "roleId" VARCHAR NOT NULL,
    "permissionId" VARCHAR NOT NULL,
    PRIMARY KEY ("roleId", "permissionId"),
    FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY ("permissionId") REFERENCES permissions(id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions("roleId");
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions("permissionId");
