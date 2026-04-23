export type Duration = { minutes: number; seconds: number };
export type TimeSlot = { time: string; duration: Duration };
export interface ChannelConfig {
  channel_num: number;
  device_ref: number;
  enabled: boolean;
  activate_now: boolean;
  mode: 'daily' | 'weekly';
  title: string;
  now: {
    duration: Duration;
  };
  daily: {
    time: string;
    duration: Duration;
  };
  weekly: {
    [day: string]: TimeSlot[];
  };
}
export interface ChannelState {
  channels: {
    [channelId: string]: ChannelConfig;
  };
}