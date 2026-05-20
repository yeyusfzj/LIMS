from app.core.database import SessionLocal
from app.models.instrument import Instrument
import json

db = SessionLocal()
try:
    instruments = db.query(Instrument).limit(1).all()
    if instruments:
        i = instruments[0]
        data = {
            "id": i.id,
            "code": i.code,
            "name": i.name,
            "model": i.model,
            "manufacturer": i.manufacturer,
            "serialNumber": i.serial_number,
            "status": i.status,
            "currentLocation": i.current_location,
            "currentDepartment": i.current_department,
            "currentResponsible": i.current_responsible,
            "purchaseDate": str(i.purchase_date) if i.purchase_date else None,
            "purchasePrice": float(i.purchase_price) if i.purchase_price else None,
            "warrantyExpiry": str(i.warranty_expiry) if i.warranty_expiry else None,
            "usageYears": i.usage_years,
            "technicalParams": i.technical_params,
            "description": i.description,
            "remarks": i.remarks
        }
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        print("没有仪器数据")
finally:
    db.close()
