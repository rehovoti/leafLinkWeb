import { AppBar, IconButton, Toolbar, Typography, Drawer } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { Person } from '@mui/icons-material'
import { useSelector } from 'react-redux'
import { type RootState } from '../store';

function Header({onMenuClick}) {
  const title = useSelector((state: RootState) => state.device.activeDevice.title);

  return (
    <>
    <AppBar position="fixed" component="header">
          <Toolbar>
          <IconButton color='inherit' onClick={onMenuClick}>
          <MenuIcon />
        </IconButton>
        <Typography variant='h6' sx={{marginLeft:'1rem',flexGrow: 1}}>
          { title ? title : "LeafLink" }
        </Typography>
        <IconButton color='inherit'>
          <Person />
        </IconButton>
          </Toolbar>
        </AppBar>
        </>
  )
}

export default Header