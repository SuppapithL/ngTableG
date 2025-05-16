import React, { useState, useEffect } from 'react';
import { Box, LinearProgress, Typography, CircularProgress } from '@mui/material';
import taskEstimateService from '../../api/taskEstimateService';
import taskLogService from '../../api/taskLogService';

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
        
        // Fetch task logs to calculate total worked days - do this first
        const logs = await taskLogService.getLogsForTask(taskId);
        const total = logs.reduce((sum, log) => sum + parseFloat(log.worked_day.toString()), 0);
        setTotalWorkedDays(total);
        
        // Fetch task estimates
        const estimates = await taskEstimateService.getEstimatesForTask(taskId);
        
        // Find the latest estimate
        if (estimates.length > 0) {
          const latestEstimate = estimates.reduce((prev, current) => {
            return new Date(current.created_at) > new Date(prev.created_at) ? current : prev;
          });
          const estimatedDaysValue = parseFloat(latestEstimate.estimate_day.toString());
          setEstimatedDays(estimatedDaysValue);
          
          // Calculate progress percentage using the latest estimate
          if (estimatedDaysValue > 0) {
            const progressPercent = (total / estimatedDaysValue) * 100;
            setProgress(Math.min(progressPercent, 100)); // Cap at 100%
          }
        } else {
          // No estimates found
          setProgress(0);
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

  // If we have worked days but no estimate
  if (!estimatedDays && totalWorkedDays > 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {totalWorkedDays.toFixed(2)} days worked (no estimate)
      </Typography>
    );
  }

  // If no estimate and no work
  if (!estimatedDays) {
    return (
      <Typography variant="body2" color="text.secondary">
        No estimate
      </Typography>
    );
  }

  // Format progress to always show at least 1% if there's any work done
  const displayProgress = totalWorkedDays > 0 
    ? (progress < 1 ? '< 1' : Math.round(progress)) 
    : 0;

  // Show different color for progress bar when work is done but very little
  const progressBarColor = totalWorkedDays > 0 
    ? (progress > 100 ? "error" : "primary") 
    : "primary";

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1, minWidth: 100 }}>
          {totalWorkedDays.toFixed(2)}/{estimatedDays} days
        </Typography>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={progress > 0 && progress < 1 ? 1 : progress} // Always show at least a tiny bit if work was done
            sx={{ height: 8, borderRadius: 4 }}
            color={progressBarColor}
          />
        </Box>
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" color="text.secondary">
            {displayProgress}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default TaskProgressBar; 