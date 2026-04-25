import { useEffect,useState, useMemo } from "react"
import { useSelector, useDispatch } from "react-redux"
import  { Grid,Fab } from '@mui/material'
import  { type RootState } from "../store"
import ChannelCard from "./ChannelCard"
import AddIcon from "@mui/icons-material/Add"
import { useGetChannelsQuery } from "../services/API"
import { decodeData } from "../services/channelUtil"
import { setChannels, initChannel } from "../services/channelSlice"

export const Device = () => {
  const activeDevice = useSelector((state: RootState)=> state.device.activeDevice)
  const {data:channels=[]} = 
    useGetChannelsQuery({ deviceId:activeDevice.id });
  const dispatch = useDispatch()

  const [channelKeys, setChannelKeys] = useState<string[]>([])

  const decodedState = useMemo(() => {
    if (!channels || channels.length === 0) {
      return { channels: {}, channelKeys: [] };
    }
    const newState = decodeData(channels);
    const keys = Object.keys(newState.channels);
    return { channels: newState.channels, channelKeys: keys };
  }, [channels]);
  
  useEffect(() => {
    // This will now only run when the source data from the API truly changes.
    if (decodedState.channels && Object.keys(decodedState.channels).length > 0) {
       dispatch(setChannels(decodedState.channels));
       setChannelKeys(decodedState.channelKeys as string[])
    }
  }, [decodedState, dispatch]);

  const addChannel = () => {
    if(channelKeys.length > 2) return // currently up to 3 channels; consider depend on device type
    const newKey = `new_${channelKeys.length+1}`
    dispatch(initChannel({'id': newKey, 'deviceid': activeDevice.id}));
    setChannelKeys([...channelKeys,newKey])
  }

  const fabStyle = {
    position: 'fixed',
    bottom: 70,
    right: 30,
  };

  return (
    <>
    <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>

    { channelKeys.map(ChannelKey => 
      <ChannelCard 
          channelId={ChannelKey} 
          key={ChannelKey}
          />
      )}
    
      </Grid>
      <Fab 
        color="primary" 
        aria-label="add" 
        sx={fabStyle}
        onClick={() => {addChannel()}}
      >
        <AddIcon />
      </Fab>
    </>
  )
}
