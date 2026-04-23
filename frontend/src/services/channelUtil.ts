import type { Duration, TimeSlot, ChannelState } from "./channelTypes";

const parseDuration = (str: string): Duration => {
  const minutes = parseInt(str.slice(0, str.length - 2), 10);
  const seconds = parseInt(str.slice(-2), 10);
  return { minutes, seconds };
};

const parseRules = (rules: string) => {
  const modeChar = rules[0];
  if (modeChar === 'D') {
    const time = rules.slice(1, 3) + ':' + rules.slice(3, 5); // "05:30"
    const durationStr = rules.slice(5); // "00630"
    const duration = parseDuration(durationStr);
    return {
      mode: 'daily' as const,
      daily: { time, duration },
      weekly: {
        Sunday: [],
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
      },
    };
  } else if (modeChar === 'W') {
    let i = 1;
    const weekly: { [day: string]: TimeSlot[] } = {};
    while (i < rules.length) {
      const day = rules[i];
      const dayMap: { [key: string]: string } = {
        '1': 'Sunday',
        '2': 'Monday',
        '3': 'Tuesday',
        '4': 'Wednesday',
        '5': 'Thursday',
        '6': 'Friday',
        '7': 'Saturday',
      };
      const dayName = dayMap[day] ?? `day${day}`;
      i++;

      const timeslotCount = parseInt(rules[i], 10);
      i++;

      const slots: TimeSlot[] = [];
      for (let j = 0; j < timeslotCount; j++) {
    const time = rules.slice(i, i + 2) + ':' + rules.slice(i+2, i + 4);
        i += 4;
        const durationStr = rules.slice(i, i + 5);
        i += 5;
        const duration = parseDuration(durationStr);
        slots.push({ time, duration });
      }

      weekly[dayName] = slots;
    }

    return {
      mode: 'weekly' as const,
      daily: { time: '08:00', duration: { minutes: 10, seconds: 0 } },
      weekly,
    };
  } else {
    throw new Error(`Invalid rule mode: ${modeChar}`);
  }
};

export const decodeData = (rows: Array<{
  channel_num: number;
  title: string;
  rules: string;
  device_ref: number;
  scheduler_active: boolean;
  id: number;
}>): ChannelState => {
  const channels: ChannelState['channels'] = {};

  for (const row of rows) {
    const parsed = parseRules(row.rules);

    const channelId = row.id;
    channels[channelId] = {
      channel_num: row.channel_num,
      enabled: row.scheduler_active,
      activate_now: false,
      mode: parsed.mode,
      title: row.title,
      device_ref: row.device_ref,
      now: {
        duration: { minutes: 0, seconds: 0 },
      },
      daily: parsed.daily,
      weekly: parsed.weekly,
    };
  }

  return { channels };
};

const dayToDigit: { [day: string]: string } = {
  Sunday: "1",
  Monday: "2",
  Tuesday: "3",
  Wednesday: "4",
  Thursday: "5",
  Friday: "6",
  Saturday: "7",
};

const pad = (num: number, size: number) => num.toString().padStart(size, '0');

const encodeDuration = (duration: Duration): string => {
  return pad(duration.minutes, 3) + pad(duration.seconds, 2);
};

export const encodeData = (state: ChannelState): Array<{
  channel_num: number;
  title: string;
  rules: string;
  scheduler_active: boolean;
  device_ref: number;
  run_now_duration: number;
  id: number;
}> => {
  const result: any[] = [];

  for (const [channelId, config] of Object.entries(state.channels)) {

    let rules = "";

    if (config.mode === "daily") {
      rules =
        "D" +
        config.daily.time.slice(0,2)+config.daily.time.slice(3) +
        encodeDuration(config.daily.duration);
    } else if (config.mode === "weekly") {
      rules = "W";
      for (const [dayName, slots] of Object.entries(config.weekly)) {
        const dayDigit = dayToDigit[dayName] ?? "0";
        rules += dayDigit;
        rules += slots.length.toString();

        for (const slot of slots) {
          rules += slot.time.slice(0,2)+slot.time.slice(3) 
          rules += encodeDuration(slot.duration);
        }
      }
    }

    const channelStruct:
      {id?:string,channel_num:number,
        title:string,scheduler_active:boolean,
        rules:string,device_ref:number,
        run_now_duration:string} = {
      channel_num: config.channel_num,
      title: config.title,
      scheduler_active: config.enabled,
      rules,
      device_ref: config.device_ref,
      run_now_duration: encodeDuration(config.now.duration),
    }
    if(channelId.substring(0,4) !== 'new_')
      channelStruct.id = channelId

    result.push(channelStruct);
  }

  return result;
};
