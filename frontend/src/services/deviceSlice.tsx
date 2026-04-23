import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface Device {
  id: number,
  title: string
}
interface DeviceState {
  activeDevice: Device,
  devices:  Device[]
}

const initialState: DeviceState = {
  activeDevice: { id: 0, title: '' },
  devices : [{id:10,title: 'Mumu'},{id:20, title:'kuku'}]
}

const deviceSlice = createSlice({
  name: 'device',
  initialState,
  reducers: {
    setActiveDevice(state, action: PayloadAction<Device>) {
      state.activeDevice = action.payload;
    },
    setDevices(state, action: PayloadAction<Device[]>) {
      state.devices = action.payload;
    },
  }
})

export const { 
  setActiveDevice, 
  setDevices 
} = deviceSlice.actions

export default deviceSlice.reducer