import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Alert,
  CircularProgress,
  Button,
  TextField
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout';

const OAuthCallback: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Parse the URL query parameters
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    
    if (error) {
      setError(`Authorization failed: ${error}`);
      setLoading(false);
      return;
    }
    
    if (!code) {
      setError('No authorization code received from ClickUp');
      setLoading(false);
      return;
    }
    
    // The callback URL would be processed on the backend
    // Here we just display instructions for the user
    setSuccess(true);
    setLoading(false);
  }, [location]);

  const handleGoToDashboard = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <MainLayout title="ClickUp Authorization">
        <Container maxWidth="md">
          <Box display="flex" justifyContent="center" my={5}>
            <CircularProgress />
          </Box>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="ClickUp Authorization">
      <Container maxWidth="md">
        <Box my={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            ClickUp Authorization
          </Typography>
          
          <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            {error ? (
              <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
            ) : (
              <Alert severity="success" sx={{ mb: 3 }}>
                Authorization successful! The ClickUp integration should now be active.
              </Alert>
            )}
            
            {success && (
              <Box mt={3} display="flex" flexDirection="column" gap={2}>
                <Typography variant="body1">
                  Your ClickUp account has been successfully connected. You can now create tasks in ClickUp directly from this application.
                </Typography>
                
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleGoToDashboard}
                  sx={{ mt: 2 }}
                >
                  Go to Dashboard
                </Button>
              </Box>
            )}
          </Paper>
        </Box>
      </Container>
    </MainLayout>
  );
};

export default OAuthCallback; 