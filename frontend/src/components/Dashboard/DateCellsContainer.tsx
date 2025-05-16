import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import { Today as TodayIcon } from '@mui/icons-material';
import DateCell from './DateCell';
import DateLogsDialog from './DateLogsDialog';
import AddTaskLogDialog from './AddTaskLogDialog';
import AddLeaveLogDialog from './AddLeaveLogDialog';
import { format, isSameDay, addDays, subDays } from 'date-fns';
import taskLogService from '../../api/taskLogService';
import leaveLogService from '../../api/leaveLogService';
import holidayService from '../../api/holidayService';
import { Holiday } from '../../api/holidayService';

// Interface for date activity
interface DateActivity {
  date: string; // yyyy-MM-dd format
  hasLeaveLogs: boolean;
  hasTaskLogs: boolean;
}

/**
 * DateCellsContainer component to display a scrollable vertical calendar
 */
const DateCellsContainer: React.FC = () => {
  const [dates, setDates] = useState<Date[]>([]);
  const [dateActivities, setDateActivities] = useState<DateActivity[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [addLeaveDialogOpen, setAddLeaveDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const scrollThreshold = 200; // pixels from top/bottom to trigger loading more dates
  
  // Generate dates for a given date range
  const generateDatesInRange = (startDate: Date, endDate: Date): Date[] => {
    const newDates: Date[] = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      newDates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    return newDates;
  };
  
  // Initial load of dates and holidays
  useEffect(() => {
    loadTodayDates();
    fetchHolidays();
  }, []);
  
  // Save scroll position when scrolling
  useEffect(() => {
    if (containerRef.current) {
      const handleScroll = () => {
        if (containerRef.current) {
          setScrollPosition(containerRef.current.scrollTop);
        }
      };
      
      const container = containerRef.current;
      container.addEventListener('scroll', handleScroll);
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);
  
  // Load activities for dates when they change
  useEffect(() => {
    if (dates.length > 0) {
      loadActivities();
    }
  }, [dates]);
  
  // Restore scroll position after dates are loaded
  useEffect(() => {
    if (containerRef.current && dates.length > 0) {
      const container = containerRef.current;
      container.scrollTop = scrollPosition;
    }
  }, [dateActivities]);
  
  // Fetch holidays from the server
  const fetchHolidays = async () => {
    try {
      const holidaysData = await holidayService.getAllHolidays();
      setHolidays(holidaysData);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };
  
  // Load dates centered around today
  const loadTodayDates = () => {
    const today = new Date();
    const startDate = subDays(today, 30); // 30 days before today
    const endDate = addDays(today, 30); // 30 days after today
    
    const initialDates = generateDatesInRange(startDate, endDate);
    setDates(initialDates);
    
    // Center scroll to today after a short delay to ensure rendering is complete
    setTimeout(() => {
      if (containerRef.current) {
        // Find the index of today in the dates array
        const todayIndex = initialDates.findIndex(date => 
          isSameDay(date, today)
        );
        
        if (todayIndex !== -1) {
          // Calculate row index (assuming 5 cells per row)
          const rowIndex = Math.floor(todayIndex / 5);
          // Calculate approximate scroll position (each cell height ~100px with gap)
          const approximateScrollPosition = rowIndex * 100;
          
          containerRef.current.scrollTop = approximateScrollPosition;
          setScrollPosition(approximateScrollPosition);
        }
      }
    }, 100);
  };
  
  // Load more dates in the specified direction
  const loadMoreDates = (direction: 'past' | 'future') => {
    const datesCopy = [...dates];
    
    if (direction === 'past' && datesCopy.length > 0) {
      // Add 15 more days in the past
      const oldestDate = datesCopy[0];
      const newStartDate = subDays(oldestDate, 15);
      const newDates = generateDatesInRange(newStartDate, subDays(oldestDate, 1));
      setDates([...newDates, ...datesCopy]);
    } else if (direction === 'future' && datesCopy.length > 0) {
      // Add 15 more days in the future
      const newestDate = datesCopy[datesCopy.length - 1];
      const newEndDate = addDays(newestDate, 15);
      const newDates = generateDatesInRange(addDays(newestDate, 1), newEndDate);
      setDates([...datesCopy, ...newDates]);
    }
  };
  
  // Load activities (task logs and leave logs) for visible dates
  const loadActivities = async () => {
    if (dates.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Set date range for API calls
      const startDate = format(dates[0], 'yyyy-MM-dd');
      const endDate = format(dates[dates.length - 1], 'yyyy-MM-dd');
      
      // Get task logs for this date range
      const taskLogsResponse = await taskLogService.getLogsByDateRange({
        start_date: startDate,
        end_date: endDate
      });
      
      // Get leave logs for current year (we will filter them by exact dates later)
      const year = new Date(startDate).getFullYear();
      const leaveLogsResponse = await leaveLogService.getCurrentUserLeaveLogs({ year });
      
      // Create map of date activities
      const activities: DateActivity[] = dates.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Check if there are task logs for this date
        const hasTaskLogs = taskLogsResponse.some(log => 
          format(new Date(log.worked_date), 'yyyy-MM-dd') === dateStr
        );
        
        // Check if there are leave logs for this date
        const hasLeaveLogs = leaveLogsResponse.some(log => 
          log.date && format(new Date(log.date), 'yyyy-MM-dd') === dateStr
        );
        
        return {
          date: dateStr,
          hasTaskLogs,
          hasLeaveLogs
        };
      });
      
      setDateActivities(activities);
    } catch (error) {
      console.error('Error loading date activities:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle date cell click
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setDialogOpen(true);
  };
  
  // Handle opening the add task log dialog
  const handleAddTaskLog = (date: Date) => {
    setSelectedDate(date);
    setAddTaskDialogOpen(true);
  };
  
  // Handle opening the add leave log dialog
  const handleAddLeaveLog = (date: Date) => {
    setSelectedDate(date);
    setAddLeaveDialogOpen(true);
  };
  
  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    // Refresh activities after dialog closes to show any changes
    loadActivities();
  };
  
  // Handle task dialog close
  const handleTaskDialogClose = () => {
    setAddTaskDialogOpen(false);
  };
  
  // Handle leave dialog close
  const handleLeaveDialogClose = () => {
    setAddLeaveDialogOpen(false);
  };
  
  // Handle successful log addition
  const handleLogAdded = () => {
    loadActivities();
  };
  
  // Handle scroll to add more dates when reaching the top or bottom
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      
      // If scrolled near the top, load more past dates
      if (scrollTop < scrollThreshold) {
        const prevScrollHeight = scrollHeight;
        loadMoreDates('past');
        
        // Preserve scroll position after loading
        setTimeout(() => {
          if (containerRef.current) {
            const newScrollHeight = containerRef.current.scrollHeight;
            const heightDiff = newScrollHeight - prevScrollHeight;
            containerRef.current.scrollTop = scrollTop + heightDiff;
            setScrollPosition(scrollTop + heightDiff);
          }
        }, 10);
      }
      
      // If scrolled near the bottom, load more future dates
      if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
        loadMoreDates('future');
      }
    }
  };
  
  // Check if a date has activities
  const getDateActivity = (date: Date): { hasLeaveLogs: boolean, hasTaskLogs: boolean } => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const activity = dateActivities.find(a => a.date === dateStr);
    
    return {
      hasLeaveLogs: activity?.hasLeaveLogs || false,
      hasTaskLogs: activity?.hasTaskLogs || false
    };
  };
  
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Calendar View</Typography>
          <Button
            startIcon={<TodayIcon />}
            size="small"
            variant="outlined"
            onClick={loadTodayDates}
            sx={{ mr: 1 }}
          >
            Today
          </Button>
        </Box>
        <Box 
          ref={containerRef}
          onScroll={handleScroll}
          sx={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 2,
            maxHeight: '300px',
            overflowY: 'auto',
            pb: 1
          }}
        >
          {dates.map((date, index) => {
            const { hasLeaveLogs, hasTaskLogs } = getDateActivity(date);
            return (
              <DateCell 
                key={`date-${format(date, 'yyyy-MM-dd')}`} 
                date={date}
                onClick={handleDateClick}
                onAddTaskLog={handleAddTaskLog}
                onAddLeaveLog={handleAddLeaveLog}
                hasLeaveLogs={hasLeaveLogs}
                hasTaskLogs={hasTaskLogs}
                holidays={holidays}
              />
            );
          })}
        </Box>
      </CardContent>
      
      {/* Date Logs Dialog */}
      <DateLogsDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        selectedDate={selectedDate}
        onAddTaskLog={handleAddTaskLog}
        onAddLeaveLog={handleAddLeaveLog}
      />
      
      {/* Add Task Log Dialog */}
      <AddTaskLogDialog
        open={addTaskDialogOpen}
        onClose={handleTaskDialogClose}
        selectedDate={selectedDate}
        holidays={holidays}
        onSuccess={handleLogAdded}
      />
      
      {/* Add Leave Log Dialog */}
      <AddLeaveLogDialog
        open={addLeaveDialogOpen}
        onClose={handleLeaveDialogClose}
        selectedDate={selectedDate}
        holidays={holidays}
        onSuccess={handleLogAdded}
      />
    </Card>
  );
};

export default DateCellsContainer; 