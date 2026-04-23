import React from 'react';
import {
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Stack,
  Typography,
  Paper,
  Button,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { Add, Delete } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { type RootState } from '../store';
import { updateWeekly } from '../services/channelSlice';

interface WeeklySchedulerProps {
  channelId: string;
}
const daysOfWeek = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 
];
const WeeklyScheduler: React.FC<WeeklySchedulerProps> = ({ channelId }) => {
  const dispatch = useDispatch();
  const weekly = useSelector((state: RootState) => state.channel.channels[channelId]?.weekly);

  const handleTimeChange = (day: string, index: number, time: string) => {
    const updated = [...weekly[day]];
    updated[index] = { ...updated[index], time };
    dispatch(updateWeekly({ id: channelId, day, slots: updated }));
  };

  const handleDurationChange = (
    day: string,
    index: number,
    field: 'minutes' | 'seconds',
    value: number
  ) => {
    const updated = [...weekly[day]];
    updated[index] = {
      ...updated[index],
      duration: {
        ...updated[index].duration,
        [field]: value,
      },
    };
    dispatch(updateWeekly({ id: channelId, day, slots: updated }));
  };
  const handleAddSlot = (day: string) => {
    if (weekly[day].length < 3) {
      const updated = [...weekly[day], {
        time: '08:00',
        duration: { minutes: 10, seconds: 0 },
      }];
      dispatch(updateWeekly({ id: channelId, day, slots: updated }));
    }
  };
  const handleRemoveSlot = (day: string, index: number) => {
    const updated = weekly[day].filter((_, i) => i !== index);
    dispatch(updateWeekly({ id: channelId, day, slots: updated }));
  };
  return (
    <Stack spacing={3}>
      <Typography variant='subtitle1'>
        Weekly Schedule
      </Typography>
      {daysOfWeek.map(day => 
        <Stack key={day} spacing={1}>
          <Typography variant='subtitle1' color='secondary'>{day}</Typography>
      <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Time</TableCell>
            <TableCell>Duration (min)</TableCell>
            <TableCell>Duration (sec)</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          {weekly[day].map((slot, index) => (
            <TableRow
            key={index}
            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell>
              <TimePicker
                ampm={false}
                value={dayjs().hour(Number(slot.time.split(':')[0])).minute(Number(slot.time.split(':')[1]))}
                onChange={(value) => {
                  if (value) {
                    handleTimeChange(day, index, value.format('HH:mm'));
                  }
                }}
              />
              </TableCell>
              <TableCell>
              <TextField
                type="number"
                value={slot.duration.minutes}
                onChange={(e) =>
                  handleDurationChange(day, index, 'minutes', parseInt(e.target.value) || 0)
                }
                size="small"
              />
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  value={slot.duration.seconds}
                  onChange={(e) =>
                    handleDurationChange(day, index, 'seconds', parseInt(e.target.value) || 0)
                  }
                  size="small"
                />
              </TableCell>
              <TableCell>
                <IconButton aria-label="delete"
                  onClick={() => handleRemoveSlot(day, index)}
                >
                  <Delete />
                </IconButton>
              </TableCell>
            </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={4}>
                <Button
                  startIcon={<Add />}
                  onClick={() => handleAddSlot(day)}
                  size="small"
                >Add time slot</Button>
              </TableCell>
            </TableRow> 
    </LocalizationProvider>
        </TableBody>
      </Table>
    </TableContainer>
          </Stack>
        )}

    </Stack>
  )
}

export default WeeklyScheduler