from fastapi import APIRouter, HTTPException, status, Request
import asyncpg
from src.schemas.device import DeviceResponse, DeviceCreate
from typing import List

router = APIRouter(
    tags=["Devices"],
)
  
@router.get("/devices", response_model=List[DeviceResponse])
async def get_devices(req: Request):
    async with req.app.state.db.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM devices")
        return [dict(row) for row in rows]
    
# Fetch a single device by mac address
@router.get("/devices/bymac/{mac_addr}", response_model=DeviceResponse)
async def get_device_by_mac_address(req: Request, mac_addr: str):
    async with req.app.state.db.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM devices WHERE mac_address = $1", mac_addr)
        if row:
            return dict(row)
        raise HTTPException(status_code=404, detail="MAC ADDRESS not found")

# Fetch devices by user Id
@router.get("/devices/{user_id}", response_model=List[DeviceResponse])
async def get_device_by_user(req: Request, user_id: int):
    async with req.app.state.db.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM devices WHERE user_ref = $1", user_id)
        return [dict(row) for row in rows]

# Add a new device
@router.post("/devices", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_device(req: Request, device: DeviceCreate):
    async with req.app.state.db.acquire() as conn:
        # Create new device
        try:
            row = await conn.fetchrow(
                "INSERT INTO devices (title, mac_address, user_ref) VALUES ($1, $2, $3) RETURNING *",
                device.title, device.mac_address, device.user_ref
            )
            return dict(row)
        except asyncpg.UniqueViolationError:
            raise HTTPException(status_code=400, detail="Device already exists")

# Update a device
@router.put("/devices/{device_id}", response_model=DeviceResponse)
async def update_device(req: Request, device: DeviceResponse):
    async with req.app.state.db.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE devices SET title = $1, mac_address = $2, user_ref = $3 WHERE id = $4 RETURNING *",
            device.title, device.mac_address, device.user_ref, device.id
        )
        return dict(row)

# Delete a device by id
@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(req: Request, device_id: int):
    async with req.app.state.db.acquire() as conn:
        result = await conn.execute("DELETE FROM devices WHERE id = $1", device_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="device not found")
        return {"message": "device deleted successfully"}