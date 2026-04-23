from pydantic import BaseModel, constr

class DeviceBase(BaseModel):
    title: str = constr(min_length=3,max_length=30)
    mac_address: str #= constr(min_length=23, max_length=23)
    user_ref: int

class DeviceCreate(DeviceBase):
    pass

class DeviceResponse(DeviceBase):
    id: int

    class Config:
        from_attributes = True