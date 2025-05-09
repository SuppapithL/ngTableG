import React, { useState, useEffect } from 'react';
import { Box, LinearProgress, Typography, CircularProgress } from '@mui/material';
import taskEstimateService from '../api/taskEstimateService';
import taskLogService from '../api/taskLogService';

interface TaskProgressBarProps {
  taskId: number;
}

const TaskProgressBar: React.FC<TaskProgressBarProps> = ({ taskId }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [totalWorkedDays, setTotalWorkedDays] = useState<number>(0);
  const [estimatedDays, setEstimatedDays] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch task estimates
        const estimates = await taskEstimateService.getEstimatesForTask(taskId);
        
        // Find the latest estimate
        if (estimates.length > 0) {
          const latestEstimate = estimates.reduce((prev, current) => {
            return new Date(current.created_at) > new Date(prev.created_at) ? current : prev;
          });
          setEstimatedDays(parseFloat(latestEstimate.estimate_day.toString()));
        }
        
        // Fetch task logs to calculate total worked days
        const logs = await taskLogService.getLogsForTask(taskId);
        const total = logs.reduce((sum, log) => sum + parseFloat(log.worked_day.toString()), 0);
        setTotalWorkedDays(total);
        
        // Calculate progress percentage
        if (estimates.length > 0 && parseFloat(estimates[0].estimate_day.toString()) > 0) {
          const progressPercent = (total / parseFloat(estimates[0].estimate_day.toString())) * 100;
          setProgress(Math.min(progressPercent, 100)); // Cap at 100%
        }
      } catch (error) {
        console.error('Error fetching task progress data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [taskId]);

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight={24}>
        <CircularProgress size={18} />
      </Box>
    );
  }

  if (!estimatedDays) {
    return (
      <Typography variant="body2" color="text.secondary">
        No estimate
      </Typography>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1, minWidth: 100 }}>
          {totalWorkedDays.toFixed(1)}/{estimatedDays} days
        </Typography>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 8, borderRadius: 4 }}
            color={progress > 100 ? "error" : "primary"}
          />
        </Box>
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" color="text.secondary">
            {Math.round(progress)}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default TaskProgressBar; 