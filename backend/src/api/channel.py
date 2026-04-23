from fastapi import APIRouter, HTTPException, status, Request
import asyncpg
from src.schemas.channel import ChannelResponse, ChannelWrite
from typing import List

router = APIRouter(
    tags=["Channels"],
)
  
@router.get("/channels/{deviceId}", response_model=List[ChannelResponse])
async def get_channels(req: Request, deviceId: int):
    async with req.app.state.db.acquire() as conn:
        rows = await conn.fetch('''
            SELECT *
            FROM channels where device_ref = $1''', deviceId)
        return [dict(row) for row in rows]

# Add new channels
@router.post("/channels", status_code=status.HTTP_201_CREATED)
async def create_channels(req: Request, channels: List[ChannelWrite]):
    async with req.app.state.db.acquire() as conn:
        # Create new channels
        if not channels:
            return {"message": "no channels to process"}
        to_insert = []
        to_update = []
        for channel in channels:
            if channel.id is None:
                to_insert.append(channel)
            else:
                to_update.append(channel)
        try:
            values = [[channel.channel_num,
                       channel.title,
                       channel.run_now_duration,
                       channel.scheduler_active,
                       channel.rules,
                       channel.device_ref] 
                       for channel in to_insert]
            rows = await conn.executemany(
                """INSERT INTO channels 
                (channel_num, title, run_now_duration, 
                scheduler_active, rules, device_ref) 
                VALUES ($1, $2, $3, $4, $5, $6)""",
                values
            )
            update_values = [
                        [c.channel_num, c.title, c.rules, c.device_ref, 
                         c.run_now_duration, c.scheduler_active, 
                         0, 0, # s_temperature, s_moisture - updated in telemetry requests
                         c.id] 
                        for c in to_update
                    ]
            await conn.executemany(
                """
                UPDATE channels
                SET channel_num = $1, title = $2, rules = $3, device_ref = $4,
                    run_now_duration = $5, scheduler_active = $6,
                    s_temperature = $7, s_moisture = $8
                WHERE id = $9
                """,
                update_values
            )
            return {
                    "message": "Batch operation successful",
                    "created": len(to_insert),
                    "updated": len(to_update)
                }
        except asyncpg.UniqueViolationError:
            raise HTTPException(status_code=400, detail="Channel already exists")
        except Exception as e:
            # Catch other potential errors for better debugging
            raise HTTPException(status_code=500, detail=f"An error occurred: {e}")

# Update a device
# @router.put("/devices/{device_id}", response_model=DeviceResponse)
# async def update_device(req: Request, device: DeviceResponse):
#     async with req.app.state.db.acquire() as conn:
#         row = await conn.fetchrow(
#             "UPDATE devices SET mac_address = $1, user_ref = $2 WHERE id = $3 RETURNING *",
#             device.mac_address, device.user_ref, device.id
#         )
#         return dict(row)

# # Delete a device by id
# @router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
# async def delete_device(req: Request, device_id: int):
#     async with req.app.state.db.acquire() as conn:
#         result = await conn.execute("DELETE FROM devices WHERE id = $1", device_id)
#         if result == "DELETE 0":
#             raise HTTPException(status_code=404, detail="device not found")
#         return {"message": "device deleted successfully"}