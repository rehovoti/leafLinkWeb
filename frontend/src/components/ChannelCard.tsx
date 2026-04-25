import {
  Card,
  CardHeader,
  CardContent,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
  Stack,
  Grid,
  TextField,
  Button,
  ButtonGroup,
  Chip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import Schedule from '@mui/icons-material/Schedule';
import { useDispatch, useSelector } from 'react-redux';
import { type RootState } from '../store';
import {
  toggleChannel,
  setMode,
  setTitle,
  setActivateNow
} from '../services/channelSlice';
import DailyScheduler from './DailyScheduler';
import WeeklyScheduler from './WeeklyScheduler';
import TurnOnNow from './TurnOnNow';

interface ChannelCardProps {
  channelId: string;
}
const ChannelCard: React.FC<ChannelCardProps> = ({ channelId }) => {
  const dispatch = useDispatch();
  const channel = useSelector((state: RootState) => {
    return state.channel.channels[channelId]});

  if (!channel) return null;
  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(toggleChannel({ id: channelId, enabled: event.target.checked }));
  };
  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setMode({ id: channelId, mode: event.target.value as 'daily' | 'weekly' }));
  };
  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setTitle({ id: channelId, title: event.target.value as string }));
  };
const chantxt = `Channel: ${channel.channel_num}`
  return (
    <Grid key={channelId} size={{md:12, xl:6}}>

    <Card sx={{ marginbottom: 3 }}>
      <CardHeader title={
        <TextField
        value={channel.title}
        onChange={handleTitleChange}
        variant="filled" // Using 'filled' variant to show background color clearly
        sx={{
          '& .MuiFilledInput-root': {
            backgroundColor: (theme) => theme.palette.primary.main,
            '&:hover': {
              backgroundColor: (theme) => theme.palette.primary.main,
            },
            '&.Mui-focused': {
              backgroundColor: (theme) => theme.palette.primary.main,
            },
          },
          '& .MuiInputBase-input': {
            // minHeight: '1.6em', // Standard height for filled variant
            display: 'flex',
            alignItems: 'center', // Vertically center content
            fontSize: '1.5em',
            fontWeight: 'bold',
            color: (theme) => theme.palette.getContrastText(theme.palette.primary.main),
          },
        }}
        onKeyUp={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter') {
            handleTitleChange(e as any);
          }
        }}
        fullWidth
      />
    }>

      </CardHeader>
      <CardContent>
        <Stack spacing={3}>
          <Stack direction={'row'}>
          <FormControlLabel
            control={<Switch checked={channel.enabled} onChange={handleToggle} />}
            label="Enable Channel"
            />
        <Chip label={chantxt} color={channel.enabled? "primary" : "default"} sx={{marginLeft: 'auto'}} />
            </Stack>
          <ButtonGroup color="secondary" aria-label="Medium-sized button group">
            <Button 
            size={'small'} 
            variant={ channel.activate_now ? "outlined" : "contained" }
            startIcon={<Schedule />}
            onClick={() => dispatch(setActivateNow({id: channelId, activateNow: false}))}
            >
              Scheduler
            </Button>
            <Button 
            size={'small'} 
            variant={ channel.activate_now ? "contained" : "outlined" }
            endIcon={<SendIcon />}
            onClick={() => dispatch(setActivateNow({id: channelId, activateNow: true}))}
            >
              Run now
            </Button>
          </ButtonGroup>
          {channel.activate_now ? 
          ( <TurnOnNow channelId={channelId} /> )
            : 
          ( <>
            <RadioGroup
              row
              value={channel.mode}
              onChange={handleModeChange}
            >
              <FormControlLabel value="daily" control={<Radio />} label="Daily" />
              <FormControlLabel value="weekly" control={<Radio />} label="Weekly" />
            </RadioGroup>
          { channel.mode === 'daily' ? (
            <DailyScheduler channelId={channelId} />
          ) : 
          (
            <WeeklyScheduler channelId={channelId} />
          ) 
        }
            </> )}
      </Stack>
      </CardContent>
    </Card>
    </Grid>
  );
};
export default ChannelCard;