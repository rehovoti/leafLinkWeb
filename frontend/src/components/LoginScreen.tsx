import { setUser } from "../services/userSlice"
import { useDispatch } from "react-redux"
import { useState } from "react";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Link,
  Alert,
  CircularProgress
} from '@mui/material';

export const LoginScreen = () => {
  const dispatch = useDispatch()
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleToggleForm = () => {
    setIsLogin(!isLogin);
    setMessage({ text: '', type: '' }); // Clear messages on toggle
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const validateEmail = (email: string) => {
    // Basic email regex validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    if (!validateEmail(email)) {
      setMessage({ text: 'Please enter a valid email address.', type: 'error' });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters long.', type: 'error' });
      setLoading(false);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match.', type: 'error' });
      setLoading(false);
      return;
    }

    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

      if (isLogin) {
        // Simulate login logic
        if (email === 'user@example.com' && password === 'password123') {
          setMessage({ text: 'Login successful!', type: 'success' });
          dispatch(setUser({id: 10, name: "Mumu"}))
        } else {
          setMessage({ text: 'Invalid email or password.', type: 'error' });
        }
      } else {
        // Simulate sign-up logic
        setMessage({ text: `Account created for ${email}!`, type: 'success' });
        // Optionally, switch to login after successful signup
        // setIsLogin(true);
      }
    } catch (error) {
      setMessage({ text: 'An unexpected error occurred. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
      <Container
        component="main"
        maxWidth="xs"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          // backgroundColor: theme.palette.background.default,
          padding: 2,
        }}
      >
        <Paper elevation={6} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <Typography component="h1" variant="h5" mb={3}>
            {isLogin ? 'Login' : 'Sign Up'}
          </Typography>
          {message.text && (
            <Alert severity={message.type} sx={{ width: '100%', mb: 2 }}>
              {message.text}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="outlined"
            />
            {!isLogin && (
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                variant="outlined"
              />
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 1, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : (isLogin ? 'Login' : 'Sign Up')}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              sx={{ mt: 1, mb: 2, py: 1.5 }}
              color="secondary"
              onClick={() => window.location.href = 'http://localhost:5020/api/auth/google/login'}
            >
              Sign in with Google
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Link href="#" variant="body2" onClick={handleToggleForm}>
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
              </Link>
            </Box>
          </Box>
        </Paper>
      </Container>
  );
}
