import React from 'react';
import {
  TextField,
  Stack,
  InputAdornment,
} from '@mui/material';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { type RootState } from '../store';
import { updateNow } from '../services/channelSlice';

interface TurnOnNowProps {
  channelId: string;
}
const TurnOnNow: React.FC<TurnOnNowProps> = ({ channelId }) => {
  const dispatch = useDispatch();
  const now = useSelector((state: RootState) => state.channel.channels[channelId]?.now);
  const handleDurationChange = (field: 'minutes' | 'seconds') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = {
      ...now.duration,
      [field]: parseInt(event.currentTarget.value) || 0,
    };
    dispatch(updateNow({
      id: channelId,
      duration: newDuration,
    }));
  };
  return(
    <Stack spacing={2}>
    <Stack direction="row" spacing={2}>
        <TextField
          label="Duration (min)"
          type="number"
          value={now.duration.minutes}
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
          value={now.duration.seconds}
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
  export default TurnOnNow