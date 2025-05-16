import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent,
  Typography,
  Box,
  Alert
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';

interface AnnualRecordSyncProps {
  userId?: number;
  year?: number;
  refreshData?: () => void;
}

const AnnualRecordSync: React.FC<AnnualRecordSyncProps> = ({ refreshData }) => {
  return (
    <Card sx={{ mb: 4 }}>
      <CardHeader 
        title="Automatic Data Synchronization"
        avatar={<SyncIcon />}
        sx={{ backgroundColor: 'success.main', color: 'white' }}
      />
      <CardContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Annual records are now automatically synchronized on the server.
        </Alert>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1">
            Your annual record data is now always up-to-date. The system automatically synchronizes:
          </Typography>
          
          <Box component="ul" sx={{ mt: 1 }}>
            <Typography component="li">
              When leave logs are created, updated, or deleted
            </Typography>
            <Typography component="li">
              When task logs are created, updated, or deleted
            </Typography>
            <Typography component="li">
              On an hourly basis via scheduled maintenance
            </Typography>
          </Box>
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          Manual synchronization is no longer required - just refresh the page to see the latest data.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default AnnualRecordSync; 