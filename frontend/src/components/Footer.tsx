import * as React from 'react';
// import BottomNavigation from '@mui/material/BottomNavigation';
// import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import { BottomNavigation, Paper, BottomNavigationAction } from '@mui/material';
// import CheckCircle from '@mui/icons-material/CheckCircle';
import {CheckCircle} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { type RootState } from '../store';
import { useSaveChannelsMutation } from '../services/API';
import { encodeData } from '../services/channelUtil';

const Footer = () => {
  const [footerValue, setFooterValue] = React.useState(0);
  const channels = useSelector((state: RootState) => state.channel.channels);
  const [saveChannels, 
    // { isLoading, isSuccess, isError }
  ] = useSaveChannelsMutation();
  const activeDevice = useSelector((state: RootState) => state.device.activeDevice)

  const handleSave = (_event?: any) => {
    const encodedChannels = encodeData({channels:channels})
    saveChannels(encodedChannels)
  };

  return (
        <Paper 
          component="footer" 
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} 
          elevation={3}
        >
          <BottomNavigation
            showLabels
            value={footerValue}
            onChange={(_, newValue) => {
              setFooterValue(newValue);
            }}
          >
          {  activeDevice.id ?
            <BottomNavigationAction label="Apply" icon={<CheckCircle />} onClick={handleSave} />
            :
            []
          }
          </BottomNavigation>
        </Paper>
  )

}

export default Footer