import React, { useState, useEffect } from 'react';
import { 
  CssBaseline, 
  Container, 
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Drawer } from '@mui/material';
  import { useDispatch } from 'react-redux';
  import { setActiveDevice } from './services/deviceSlice';
  import { setUser } from './services/userSlice';
// import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import { type RootState } from './store';
import Header from './components/Header';
import Footer from './components/Footer';
import { Device } from './components/Device';
import { DeviceSelector } from './components/DeviceSelector';
import { LoginScreen } from './components/LoginScreen';
// import ThemeToggle from './components/ThemeToggle';
const App: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const dispatch = useDispatch()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const username = params.get('username');
    const id = params.get('id');
    if (token) {
      localStorage.setItem('token', token);
      if (username) {
         dispatch(setUser({id: id ? parseInt(id, 10) : 0, name: username}));
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [dispatch]);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const userName = useSelector((state: RootState) => state.user.user.name)
  const activeDevice = useSelector((state: RootState) => state.device.activeDevice)
  // const themeMode = useSelector((state: RootState) => state.theme.mode);
  // const theme = React.useMemo(
  //   () =>
  //     createTheme({
  //       palette: {
  //         mode: themeMode,
  //       },
  //     }),
  //   [themeMode]
  // );
  const drawerContent = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer} // Close drawer when an item is clicked
      onKeyDown={toggleDrawer}
    >
      <List>
        <ListItem disablePadding>
          <ListItemButton>
            {/* <ListItemIcon>
              {index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
            </ListItemIcon> */}
            <ListItemText primary='Home' />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton>
            {/* <ListItemIcon>
              {index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
            </ListItemIcon> */}
            <ListItemText primary='Devices' 
            onClick={()=>dispatch(setActiveDevice({id: 0, title: 'LeafLink'}))}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );
  return (
    <>
       <Container>
      <CssBaseline />
      <Header onMenuClick={toggleDrawer} />

      <Box
          component="main"
          sx={{
            flexGrow: 1, // Allows the main content to fill the available space
            py: 4, // Adds vertical padding
            // Use MUI's theme mixins to add space for the fixed AppBar and BottomNavigation
            // This prevents content from being hidden underneath them.
            // marginTop: theme.mixins.toolbar.minHeight + 'px',
            marginTop: 7,
            marginBottom: '56px', // Standard height for BottomNavigation
          }}
        >
        <Drawer
        anchor="left"
        open={isDrawerOpen}
        onClose={toggleDrawer} // Allows closing by clicking the backdrop
      >
        {drawerContent}
      </Drawer>
        { userName ? 
                    activeDevice.id !== 0 ? <Device /> :  <DeviceSelector /> 
                  : <LoginScreen /> }
        </Box>

      <Footer />
       </Container>
      </>
  );
};
export default App;
