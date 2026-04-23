from pydantic import BaseModel, constr
from datetime import datetime
from enum import Enum
from typing import Optional

class ChannelType(str, Enum):
    scheduler = 'scheduler'
    sensors = 'sensors'
    aidriven = 'aidriven'

class ChannelBase(BaseModel):
    id: int
    channel_num: int
    title: str = constr(min_length=3, max_length=100)
    run_now_duration: int
    scheduler_active: bool
    rules: str
    last_activated: Optional[datetime]
    last_duration: Optional[int]
    s_temperature: Optional[int]
    s_moisture: Optional[int]
    device_ref: int

class ChannelWrite(BaseModel):
    id: Optional[int] = None  # <-- The key! Optional ID.
    channel_num: int
    title: str = constr(min_length=3, max_length=100)
    run_now_duration: int
    scheduler_active: bool
    rules: str
    device_ref: int
    # s_temperature: Optional[int]
    # s_moisture: Optional[int]

class ChannelResponse(BaseModel):
    id: int  # <-- Required, as it comes from the DB
    channel_num: int
    title: str
    run_now_duration: int
    scheduler_active: bool
    rules: str
    device_ref: int
    s_temperature: Optional[int]
    s_moisture: Optional[int]
    
    # Read-only fields are ONLY in the response model
    last_activated: Optional[datetime]
    last_duration: Optional[int]

    class Config:
        from_attributes = True