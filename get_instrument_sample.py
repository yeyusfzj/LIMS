import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend-api'))

from app.database import SessionLocal
from app.models.instrument import Instrument

db = SessionLocal()
try:
    instruments = db.query(Instrument).limit(5).all()
    for i in instruments:
        print(f"ID: {i.id}")
        print(f"编码: {i.code}")
        print(f"名称: {i.name}")
        print(f"型号: {i.model}")
        print(f"制造商: {i.manufacturer}")
        print(f"序列号: {i.serial_number}")
        print(f"状态: {i.status}")
        print(f"当前位置: {i.current_location}")
        print(f"当前部门: {i.current_department}")
        print(f"负责人: {i.current_responsible}")
        print(f"购置日期: {i.purchase_date}")
        print(f"购置价格: {i.purchase_price}")
        print(f"保修到期: {i.warranty_expiry}")
        print(f"使用年限: {i.usage_years}")
        print(f"技术参数: {i.technical_params}")
        print(f"描述: {i.description}")
        print(f"备注: {i.remarks}")
        print("-" * 50)
        break  # 只显示第一个
finally:
    db.close()
