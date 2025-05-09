import React from 'react';
import { Container, Typography, Button, Box, Paper } from '@mui/material';
import { Link } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout';

const NotFound: React.FC = () => {
  return (
    <MainLayout title="404 Not Found">
      <Container maxWidth="md">
        <Box sx={{ my: 4, textAlign: 'center' }}>
          <Paper elevation={3} sx={{ p: 5 }}>
            <Typography variant="h1" component="h1" gutterBottom>
              404
            </Typography>
            <Typography variant="h4" component="h2" gutterBottom>
              Page Not Found
            </Typography>
            <Typography variant="body1" sx={{ mb: 4 }}>
              The page you are looking for doesn't exist or has been moved.
            </Typography>
            <Button
              component={Link}
              to="/"
              variant="contained"
              color="primary"
              size="large"
            >
              Go to Dashboard
            </Button>
          </Paper>
        </Box>
      </Container>
    </MainLayout>
  );
};

export default NotFound; 