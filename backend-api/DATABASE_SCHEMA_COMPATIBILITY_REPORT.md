================================================================================
数据库 Schema 兼容性验证报告
================================================================================

验证时间: 1776319794.5826743

## 验证摘要
- 成功项: 21
- 警告项: 9
- 错误项: 6

## 成功项
✓ users: 列完全匹配
✓ roles: 列完全匹配
✓ permissions: 列完全匹配
✓ workflows: 列完全匹配
✓ workflow_instances: 列完全匹配
✓ tasks: 列完全匹配
✓ results: 列完全匹配
✓ formulas: 列完全匹配
✓ audit_tasks: 列完全匹配
✓ quality_judgments: 列完全匹配
✓ judgment_rules: 列完全匹配
✓ judgment_history: 列完全匹配
✓ audit_comment_templates: 列完全匹配
✓ audit_workflow_configs: 列完全匹配
✓ audit_history: 列完全匹配
✓ audit_logs: 列完全匹配
✓ archived_audit_logs: 列完全匹配
✓ backup_records: 列完全匹配
✓ test_methods: 列完全匹配
✓ 预期关系总数: 29
✓ Prisma 索引总数: 52

## 警告项
⚠ roles: SQLAlchemy 中额外的列 {"Column('roleId', String, ForeignKey('roles.id', ondelete", "Column('permissionId', String, ForeignKey('permissions.id', ondelete"}
⚠ 无法从 app/models/user.py 提取 user_roles 的列定义
⚠ samples: SQLAlchemy 中额外的列 {'released_by', 'storage_location', 'updated_at', 'released_at', 'storage_condition', 'client_name', 'sampling_date', 'sample_name', 'sampling_person', 'workflow_instance_id', 'sample_category', 'received_date', 'created_by', 'sampling_location', 'created_at', 'parent_sample_id', 'sample_type', 'client_contact', 'sample_number', 'merged_from_ids'}
⚠ 无法从 app/models/sample.py 提取 test_items 的列定义
⚠ transfers: SQLAlchemy 中额外的列 {'transfer_date', 'to_person', 'from_person', 'created_at', 'from_location', 'sender_confirmed', 'sample_id', 'to_location', 'received_date', 'receiver_confirmed'}
⚠ report_templates: SQLAlchemy 中额外的列 {'updated_at', 'created_at', 'created_by', 'is_active'}
⚠ reports: SQLAlchemy 中额外的列 {'recall_reason', 'report_number', 'generated_at', 'approved_at', 'template_id', 'generated_by', 'sample_id', 'recalled_at'}
⚠ signatures: SQLAlchemy 中额外的列 {'signer_id', 'report_id', 'signer_role', 'signed_at', 'signature_data', 'signer_name'}
⚠ distributions: SQLAlchemy 中额外的列 {'sent_at', 'report_id', 'received_at', 'recipient_email'}

## 错误项
✗ samples: SQLAlchemy 中缺失列 {'releasedAt', 'storageCondition', 'samplingPerson', 'workflowInstanceId', 'sampleCategory', 'updatedAt', 'sampleNumber', 'clientName', 'samplingDate', 'samplingLocation', 'sampleType', 'releasedBy', 'receivedDate', 'mergedFromIds', 'parentSampleId', 'clientContact', 'storageLocation', 'createdAt', 'sampleName', 'createdBy'}
✗ transfers: SQLAlchemy 中缺失列 {'toLocation', 'sampleId', 'fromLocation', 'senderConfirmed', 'receiverConfirmed', 'createdAt', 'toPerson', 'transferDate', 'fromPerson', 'receivedDate'}
✗ report_templates: SQLAlchemy 中缺失列 {'updatedAt', 'createdAt', 'isActive', 'createdBy'}
✗ reports: SQLAlchemy 中缺失列 {'sampleId', 'approvedAt', 'reportNumber', 'recalledAt', 'templateId', 'generatedBy', 'recallReason', 'generatedAt'}
✗ signatures: SQLAlchemy 中缺失列 {'signatureData', 'signerName', 'signerRole', 'signerId', 'reportId', 'signedAt'}
✗ distributions: SQLAlchemy 中缺失列 {'recipientEmail', 'receivedAt', 'reportId', 'sentAt'}

## 验证结论
✗ 发现兼容性问题，需要修复

================================================================================