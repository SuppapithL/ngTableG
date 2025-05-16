import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Button,
  TextField,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  FilterAlt, 
  Today, 
  DateRange,
  Refresh
} from '@mui/icons-material';
import MainLayout from '../components/Layout';
import Grid from '../components/CustomGrid';
import { format, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import ActivityLogsList from '../components/Dashboard/ActivityLogsList';
import { DateRangeFilter } from '../api/activityLogService';
import { useAuth } from '../contexts/AuthContext';

const DATE_RANGES = {
  today: 'Today',
  yesterday: 'Yesterday',
  thisWeek: 'This Week',
  lastWeek: 'Last Week',
  thisMonth: 'This Month',
  lastMonth: 'Last Month',
  custom: 'Custom Range',
};

const ActivityLogs: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [selectedRange, setSelectedRange] = useState<string>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showCustomRange, setShowCustomRange] = useState(false);
  
  useEffect(() => {
    // Apply the selected date range
    applyDateRange(selectedRange);
  }, []);
  
  const applyDateRange = (rangeKey: string) => {
    setSelectedRange(rangeKey);
    
    const today = new Date();
    let start: Date;
    let end: Date;
    
    switch (rangeKey) {
      case 'today':
        start = today;
        end = today;
        setShowCustomRange(false);
        break;
      case 'yesterday':
        start = addDays(today, -1);
        end = addDays(today, -1);
        setShowCustomRange(false);
        break;
      case 'thisWeek':
        // Get the start of the week (Sunday)
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        end = today;
        setShowCustomRange(false);
        break;
      case 'lastWeek':
        // Get the start of last week (Sunday)
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() - 7);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        setShowCustomRange(false);
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        end = today;
        setShowCustomRange(false);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        setShowCustomRange(false);
        break;
      case 'custom':
        setShowCustomRange(true);
        // Don't update dateRange here, wait for the user to apply custom range
        return;
      default:
        start = today;
        end = today;
        setShowCustomRange(false);
    }
    
    setDateRange({
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd'),
    });
  };
  
  const applyCustomRange = () => {
    setDateRange({
      start_date: customStartDate,
      end_date: customEndDate,
    });
  };

  const handleRefresh = () => {
    // Reapply the current date range to refresh data
    if (selectedRange === 'custom') {
      applyCustomRange();
    } else {
      applyDateRange(selectedRange);
    }
  };
  
  return (
    <MainLayout title="Activity Logs">
      <Box sx={{ flexGrow: 1 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
                  Activity Logs
                </Typography>
                <Tooltip title="Refresh data">
                  <IconButton onClick={handleRefresh} size="small">
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {Object.entries(DATE_RANGES).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={selectedRange === key ? 'contained' : 'outlined'}
                    size="small"
                    startIcon={key === 'custom' ? <FilterAlt /> : <Today />}
                    onClick={() => applyDateRange(key)}
                  >
                    {label}
                  </Button>
                ))}
              </Box>
              
              {showCustomRange && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                  <Button 
                    variant="contained" 
                    onClick={applyCustomRange}
                    startIcon={<DateRange />}
                  >
                    Apply Range
                  </Button>
                </Box>
              )}
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing activities from <strong>{format(new Date(dateRange.start_date), 'MMM d, yyyy')}</strong> to <strong>{format(new Date(dateRange.end_date), 'MMM d, yyyy')}</strong>
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <ActivityLogsList 
              dateRange={dateRange}
              onRefresh={handleRefresh}
              onFilter={() => applyDateRange('custom')}
            />
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default ActivityLogs; 