import React from 'react';
import {
  TextField,
  Stack,
  InputAdornment,
  Typography,
} from '@mui/material';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { type RootState } from '../store';
import { updateDaily } from '../services/channelSlice';

interface DailySchedulerProps {
  channelId: string;
}
const DailyScheduler: React.FC<DailySchedulerProps> = ({ channelId }) => {
  const dispatch = useDispatch();
  const daily = useSelector((state: RootState) => state.channel.channels[channelId]?.daily);
  const handleTimeChange = (value: dayjs.Dayjs | null) => {
    if (value) {
      dispatch(updateDaily({
        id: channelId,
        time: value.format('HH:mm'),
        duration: daily.duration,
      }));
    }
  };
  const handleDurationChange = (field: 'minutes' | 'seconds') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = {
      ...daily.duration,
      [field]: parseInt(event.currentTarget.value) || 0,
    };
    dispatch(updateDaily({
      id: channelId,
      time: daily.time,
      duration: newDuration,
    }));
  };
  return(
    <Stack spacing={2}>
      <Typography variant="subtitle1">
        Daily Activation Time
      </Typography>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DemoContainer components={['TimePicker', 'TimePicker']}>
        <TimePicker
          label="Activation Time"
          ampm={false}
          onChange={handleTimeChange}
          value={dayjs().hour(Number(daily.time.split(':')[0])).minute(Number(daily.time.split(':')[1]))}
        />
      </DemoContainer>
    </LocalizationProvider>
    <Stack direction="row" spacing={2}>
        <TextField
          label="Duration (min)"
          type="number"
          value={daily.duration.minutes}
          onChange={handleDurationChange('minutes')}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">min</InputAdornment>,
            },
          }}
        />
        <TextField
          label="Duration (sec)"
          type="number"
          value={daily.duration.seconds}
          onChange={handleDurationChange('seconds')}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">sec</InputAdornment>,
            },
          }}
        />
      </Stack>
    </Stack>
  )
}
  export default DailyScheduler