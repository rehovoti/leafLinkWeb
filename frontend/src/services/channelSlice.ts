import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ChannelState, Duration, TimeSlot } from './channelTypes';
const initialState: ChannelState = {
  channels: {},
};

const channelSlice = createSlice({
  name: 'channel',
  initialState,
  reducers: {
    resetChannels(state) {
      state.channels = {}
    },
    setChannels(state, action: PayloadAction<any>) {
      state.channels = action.payload
    },
    initChannel(state, action: PayloadAction<{ id: string, deviceid: number }>) {
      const { id, deviceid } = action.payload;
      let channelNum = 0
      if(id.substring(0,4) === 'new_') {
        channelNum = parseInt(id.substring(4,5))
      }
      if (!state.channels[id]) {
        state.channels[id] = {
          title: `Channel: ${id}`,
          channel_num: channelNum,
          device_ref: deviceid,
          enabled: false,
          activate_now: false,
          mode: 'daily',
          daily: {
            time: '08:00',
            duration: { minutes: 10, seconds: 0 },
          },
          weekly: {
            Sunday: [],
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: [],
          },
          now: {
            duration: { minutes: 0, seconds: 0}
          }
        };
      }
    },
    toggleChannel(state, action: PayloadAction<{ id: string; enabled: boolean }>) {
      state.channels[action.payload.id].enabled = action.payload.enabled;
    },
    setMode(state, action: PayloadAction<{ id: string; mode: 'daily' | 'weekly' }>) {
      state.channels[action.payload.id].mode = action.payload.mode;
    },
    setTitle(state, action: PayloadAction<{id: string; title: string}>) {
      state.channels[action.payload.id].title = action.payload.title;
    },
    setActivateNow(state, action: PayloadAction<{id: string; activateNow: boolean}>) {
      const { id, activateNow } = action.payload
      // state.channels[action.payload.id].activate_now = action.payload.activateNow;
      state.channels[id].activate_now = activateNow;
      if(!activateNow) { 
        state.channels[id].now.duration = { minutes: 0, seconds: 0}
      }
    },
    updateDaily(state, action: PayloadAction<{ id: string; time: string; duration: Duration }>) {
      const { id, time, duration } = action.payload;
      state.channels[id].daily = { time, duration };
    },
    updateWeekly(state, action: PayloadAction<{ id: string; day: string; slots: TimeSlot[] }>) {
      const { id, day, slots } = action.payload;
      state.channels[id].weekly[day] = slots;
    },
    updateNow(state, action: PayloadAction<{ id: string; duration: Duration }>) {
      const { id, duration } = action.payload;
      state.channels[id].now = { duration };
    },
  },
});

export const {
  resetChannels,
  setChannels,
  initChannel,
  toggleChannel,
  setMode,
  setActivateNow,
  setTitle,
  updateDaily,
  updateWeekly,
  updateNow
} = channelSlice.actions;

export default channelSlice.reducer;