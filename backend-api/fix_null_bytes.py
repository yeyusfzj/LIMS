"""移除文件中的空字节"""
with open('app/services/audit_service.py', 'rb') as f:
    content = f.read()

# 移除空字节
cleaned_content = content.replace(b'\x00', b'')

with open('app/services/audit_service.py', 'wb') as f:
    f.write(cleaned_content)

print("已移除空字节")
