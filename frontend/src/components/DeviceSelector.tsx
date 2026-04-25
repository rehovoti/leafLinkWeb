import { useDispatch } from "react-redux"
import { useState } from "react";
import { useForm } from "react-hook-form";
import { setActiveDevice } from "../services/deviceSlice"
import { resetChannels } from "../services/channelSlice";
import { useAddDeviceMutation, useGetDevicesQuery } from '../services/API';
import AddIcon from "@mui/icons-material/Add"
import {
  Card,
  CardHeader,
  CardContent,
  Container,
  Stack,
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Alert
} from '@mui/material';

const fabStyle = {
  position: 'fixed',
  bottom: 70,
  right: 30,
};



type FormFields = {
  title: string,
  mac_address: string,
  user_ref: string,
}

export const DeviceSelector = () => {
  const dispatch = useDispatch()

  const [ modalOpen, setModalOpen ] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormFields>({
    defaultValues: {
      title: "",
      mac_address: "",
      user_ref: "",
    }
  })

  const [addDevice] = useAddDeviceMutation();
  const {data:devices=[]} = useGetDevicesQuery(undefined);

  const onSubmit = (payload: any) => {
    console.log('submitted:'+ JSON.stringify(payload))
    addDevice(payload)
    setModalOpen(false)
  }

  const onSelectDevice = (device: any) => {
    dispatch(resetChannels())
    dispatch(setActiveDevice(device))
  }

  return (
    <>
    <Container sx={{paddingBlockStart:'1rem', width:'80vw', height:'80vh'}}>
    {
      devices.map((dev: any) => 
        <Card sx={{ margin: 3, cursor: 'pointer'}} key={dev.id}
        onClick={()=>onSelectDevice(dev)}
        >
      <CardHeader title={`${dev.title}`}></CardHeader>
      <CardContent>
        <Stack spacing={3}>
          <Box>

          </Box>
        </Stack>
      </CardContent>
      </Card>
      )}
      </Container>
      <Fab 
        color="primary" 
        aria-label="add" 
        sx={fabStyle} 
        onClick={() => {setModalOpen(true)}}
      >
        <AddIcon />
      </Fab>
  <Dialog open={modalOpen} onClose={()=>{setModalOpen(false)}}>
        <DialogTitle>New Device</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Add params of the new dev
          </DialogContentText>
          <form onSubmit={handleSubmit(onSubmit)} id="subscription-form">
            <TextField
            {...register('title', { pattern: /^[A-z0-9А-я]{3,20}$/ })}
              autoFocus
              required
              margin="dense"
              id="title"
              name="title"
              label="Title"
              type="text"
              fullWidth
              variant="standard"
            />
            {errors.title && <Alert severity="error">Title must be 3-20 symbols</Alert>}
            <TextField
            {...register('mac_address',{pattern: /\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}/})}
              autoFocus
              required
              margin="dense"
              id="mac_address"
              name="mac_address"
              label="MAC Address"
              type="text"
              fullWidth
              variant="standard"
              />
            {errors.mac_address && <Alert severity="error">Wrong MAC Address format</Alert>}
            <TextField
            {...register('user_ref')}
              autoFocus
              required
              margin="dense"
              id="user_ref"
              name="user_ref"
              label="User ID"
              type="text"
              fullWidth
              variant="standard"
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>{setModalOpen(false)}}>Cancel</Button>
          <Button type="submit" form="subscription-form">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
