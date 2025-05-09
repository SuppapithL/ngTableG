import React from 'react';
import { Box, Paper, Typography, Alert, AlertTitle } from '@mui/material';
import MainLayout from '../components/Layout';

const YearTransition: React.FC = () => {
  return (
    <MainLayout title="Year Transition">
      <Paper sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Automatic Process</AlertTitle>
          Creating records for the new year is now an automated process. The system will automatically:
          <ul>
            <li>Check for missing records when the server starts</li>
            <li>Create next year records on December 31st at midnight</li>
            <li>Use the quota plan from the previous year</li>
            <li>Apply the rollover formula: quota_vacation_day + worked_on_holiday_day - used_vacation_day - used_sick_leave_day</li>
          </ul>
          You no longer need to manually trigger this process.
        </Alert>
        
        <Typography variant="h5" gutterBottom>
          Year Transition Information
        </Typography>
        
        <Typography variant="body1" paragraph>
          Annual records for the next year are created automatically using the following logic:
        </Typography>
        
        <Box sx={{ ml: 2, mb: 2 }}>
          <Typography variant="body1" component="div">
            <strong>Rollover Formula:</strong>
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', my: 1, p: 1, bgcolor: 'grey.100' }}>
            rollover_vacation_day = quota_vacation_day + worked_on_holiday_day - used_vacation_day - used_sick_leave_day
          </Typography>
          <Typography variant="body2">
            This ensures that employees are rewarded for working on holidays, but sick leave is deducted from their vacation quota.
          </Typography>
        </Box>
        
        <Typography variant="body1">
          This automated process ensures all users have their records properly set up for the new year with their earned rollover days.
        </Typography>
      </Paper>
    </MainLayout>
  );
};

export default YearTransition; 