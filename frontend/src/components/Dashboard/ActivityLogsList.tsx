import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  IconButton,
  Chip,
  Divider,
  Paper,
  CircularProgress,
  Button,
  Tooltip
} from '@mui/material';
import {
  DeleteOutlined,
  WorkOutline,
  EventBusyOutlined,
  InfoOutlined,
  FilterAlt
} from '@mui/icons-material';
import { format } from 'date-fns';
import activityLogService, { ActivityLog, DateRangeFilter } from '../../api/activityLogService';
import { TaskLog } from '../../api/taskLogService';
import { LeaveLog } from '../../api/leaveLogService';

interface ActivityLogsListProps {
  dateRange: DateRangeFilter;
  onRefresh?: () => void;
  onDelete?: (activityLog: ActivityLog) => void;
  onFilter?: () => void;
  showDate?: boolean;
}

const ActivityLogsList: React.FC<ActivityLogsListProps> = ({
  dateRange,
  onRefresh,
  onDelete,
  onFilter,
  showDate = true
}) => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivityLogs();
  }, [dateRange]);

  const loadActivityLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const logs = await activityLogService.getActivityLogsByDateRange(dateRange);
      setActivityLogs(logs);
    } catch (err: any) {
      console.error('Error loading activity logs:', err);
      setError(err.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async (log: ActivityLog) => {
    try {
      await activityLogService.deleteActivityLog(log);
      // Remove the deleted log from the state
      setActivityLogs(activityLogs.filter(l => l.id !== log.id));
      // Call the onDelete callback if provided
      if (onDelete) {
        onDelete(log);
      }
    } catch (err: any) {
      console.error('Error deleting activity log:', err);
      setError(err.message || 'Failed to delete activity log');
    }
  };

  // Group logs by date for better display
  const groupedLogs: Record<string, ActivityLog[]> = {};
  activityLogs.forEach(log => {
    const date = format(new Date(log.date), 'yyyy-MM-dd');
    if (!groupedLogs[date]) {
      groupedLogs[date] = [];
    }
    groupedLogs[date].push(log);
  });

  // Generate a color based on the type of activity
  const getActivityColor = (type: string): string => {
    switch (type) {
      case 'task':
        return '#4caf50'; // Green
      case 'leave':
        return '#f44336'; // Red
      default:
        return '#2196f3'; // Blue
    }
  };

  // Format the date for display
  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
        <Typography color="error">{error}</Typography>
        <Button 
          variant="outlined" 
          onClick={loadActivityLogs} 
          sx={{ mt: 1 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (activityLogs.length === 0) {
    return (
      <Paper sx={{ p: 2, backgroundColor: 'grey.100' }}>
        <Typography variant="body1" align="center">
          No activity logs found for the selected period.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          {onFilter && (
            <Button 
              startIcon={<FilterAlt />} 
              variant="outlined" 
              size="small" 
              onClick={onFilter}
              sx={{ mr: 1 }}
            >
              Change Filter
            </Button>
          )}
          {onRefresh && (
            <Button 
              variant="outlined" 
              size="small" 
              onClick={onRefresh}
            >
              Refresh
            </Button>
          )}
        </Box>
      </Paper>
    );
  }

  return (
    <Box>
      {Object.keys(groupedLogs).map(date => (
        <Box key={date} sx={{ mb: 2 }}>
          {showDate && (
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 'bold',
                p: 1,
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
                borderRadius: '4px 4px 0 0'
              }}
            >
              {formatDate(date)}
            </Typography>
          )}
          <Paper elevation={1}>
            <List dense sx={{ bgcolor: 'background.paper' }}>
              {groupedLogs[date].map((log, index) => (
                <React.Fragment key={log.id}>
                  <ListItem alignItems="flex-start">
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        pr: 2 
                      }}
                    >
                      {log.type === 'task' ? (
                        <WorkOutline sx={{ color: getActivityColor(log.type) }} />
                      ) : (
                        <EventBusyOutlined sx={{ color: getActivityColor(log.type) }} />
                      )}
                      <Typography variant="caption" sx={{ mt: 0.5 }}>
                        {log.amount.toFixed(1)}
                      </Typography>
                    </Box>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography 
                            component="span" 
                            variant="body1" 
                            fontWeight="medium"
                          >
                            {log.title}
                          </Typography>
                          <Chip 
                            label={log.type} 
                            size="small" 
                            sx={{ 
                              ml: 1, 
                              backgroundColor: getActivityColor(log.type),
                              color: 'white',
                              fontSize: '0.7rem',
                              height: 20
                            }} 
                          />
                        </Box>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {log.description}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ mr: 1 }}
                            >
                              {log.username}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                            >
                              {format(new Date(log.created_at), 'h:mm a')}
                            </Typography>
                          </Box>
                        </React.Fragment>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Delete">
                        <IconButton 
                          edge="end" 
                          aria-label="delete" 
                          onClick={() => handleDeleteLog(log)}
                          size="small"
                        >
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < groupedLogs[date].length - 1 && (
                    <Divider component="li" />
                  )}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>
      ))}
    </Box>
  );
};

export default ActivityLogsList; 