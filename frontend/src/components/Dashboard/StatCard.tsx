import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

/**
 * StatCard component to display a statistic on the dashboard
 */
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
        <Box sx={{ 
          backgroundColor: color, 
          borderRadius: '50%', 
          p: 1, 
          display: 'flex',
          color: 'white'
        }}>
          {icon}
        </Box>
      </Box>
      <Typography variant="h4" component="div" sx={{ mt: 'auto' }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

export default StatCard; 