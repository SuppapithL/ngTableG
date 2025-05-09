import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  Paper, 
  Alert,
  CircularProgress
} from '@mui/material';
import MainLayout from '../components/Layout/MainLayout';
import api from '../api/axiosConfig';

const ClickUpAuthPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if we already have a token
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      setLoading(true);
      const response = await api.get('/oauth/token');
      setHasToken(response.data.has_token);
      setMessage(response.data.message);
    } catch (err) {
      setError('Failed to check token status');
      console.error('Error checking token:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = () => {
    // Redirect to the backend's OAuth initiation endpoint
    window.location.href = `${api.defaults.baseURL}/oauth/clickup`;
  };

  if (loading) {
    return (
      <MainLayout title="ClickUp Integration">
        <Container maxWidth="md">
          <Box display="flex" justifyContent="center" my={5}>
            <CircularProgress />
          </Box>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="ClickUp Integration">
      <Container maxWidth="md">
        <Box my={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            ClickUp Integration
          </Typography>
          
          <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h5" gutterBottom>
              Authentication Status
            </Typography>
            
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            
            <Alert severity={hasToken ? "success" : "info"} sx={{ mb: 3 }}>
              {message || (hasToken ? 'Connected to ClickUp' : 'Not connected to ClickUp')}
            </Alert>
            
            <Typography paragraph>
              Connect your ClickUp account to enable automatic task synchronization between this application and ClickUp.
            </Typography>
            
            <Box mt={3}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleAuthorize}
                disabled={loading}
              >
                {hasToken ? 'Reconnect to ClickUp' : 'Connect to ClickUp'}
              </Button>
            </Box>
          </Paper>
          
          {hasToken && (
            <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
              <Typography variant="h5" gutterBottom>
                Integration Features
              </Typography>
              <Typography paragraph>
                Your account is connected to ClickUp. You can now:
              </Typography>
              <ul>
                <li>Create tasks in ClickUp automatically when creating tasks here</li>
                <li>Sync task statuses between both platforms</li>
                <li>See ClickUp task links directly from this application</li>
              </ul>
            </Paper>
          )}
        </Box>
      </Container>
    </MainLayout>
  );
};

export default ClickUpAuthPage; 