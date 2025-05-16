import React, { useState } from 'react';
import { Paper, Typography, Badge, Box, Button, Fade, Popper } from '@mui/material';
import { format, isWeekend, isSameDay } from 'date-fns';
import { isHoliday } from '../../utils/dateUtils';
import { Holiday } from '../../api/holidayService';
import { Add as AddIcon } from '@mui/icons-material';

interface DateCellProps {
  date: Date;
  onClick?: (date: Date) => void;
  onAddTaskLog?: (date: Date) => void;
  onAddLeaveLog?: (date: Date) => void;
  hasLeaveLogs?: boolean;
  hasTaskLogs?: boolean;
  holidays?: Holiday[];
}

/**
 * DateCell component to display a single date in the calendar view
 */
const DateCell: React.FC<DateCellProps> = ({ 
  date, 
  onClick, 
  onAddTaskLog,
  onAddLeaveLog,
  hasLeaveLogs = false, 
  hasTaskLogs = false,
  holidays = []
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  
  const isToday = isSameDay(date, new Date());
  const isWeekendDay = isWeekend(date);
  const isHolidayDay = isHoliday(date, holidays);
  
  // Determine background color based on date status
  const getBgColor = () => {
    if (isToday) {
      if (isWeekendDay || isHolidayDay) {
        return '#e6c700'; // Darker yellow for today if it's a weekend/holiday
      }
      return '#e0e0e0'; // Darker gray for today if it's a regular day
    }
    
    if (isWeekendDay || isHolidayDay) {
      return '#fffde7'; // Light yellow for weekends and holidays
    }
    
    return 'white'; // Default white for regular days
  };

  // Handle click on the cell
  const handleCellClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(date);
    }
  };

  // Handle click on the add button
  const handleAddClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  // Close the popper menu
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Handle add task log button click
  const handleAddTaskLog = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onAddTaskLog) {
      onAddTaskLog(date);
    }
    handleClose();
  };

  // Handle add leave log button click
  const handleAddLeaveLog = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onAddLeaveLog) {
      onAddLeaveLog(date);
    }
    handleClose();
  };
  
  return (
    <Paper 
      sx={{ 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 1,
        border: isToday ? '2px solid #1976d2' : '1px solid #e0e0e0',
        height: 80,
        width: '100%',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        backgroundColor: getBgColor(),
        '&:hover': {
          backgroundColor: onClick ? (isWeekendDay || isHolidayDay ? '#fff9c4' : '#f5f5f5') : 'inherit',
          boxShadow: onClick ? '0px 4px 8px rgba(0, 0, 0, 0.1)' : 'none',
        },
        '&:hover .add-button': {
          opacity: 1,
        }
      }}
      onClick={handleCellClick}
    >
      <Typography variant="caption" color="text.secondary">
        {format(date, 'MMM')} {date.getFullYear()}
      </Typography>
      <Badge 
        color={hasLeaveLogs && hasTaskLogs ? "error" : hasLeaveLogs ? "primary" : hasTaskLogs ? "success" : "default"} 
        variant="dot" 
        invisible={!hasLeaveLogs && !hasTaskLogs}
        sx={{ position: 'absolute', top: 8, right: 8 }}
      >
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {date.getDate()}
        </Typography>
      </Badge>
      <Typography variant="caption" color="text.secondary">
        {format(date, 'EEE')}
      </Typography>
      
      {/* Show weekend or holiday indicator */}
      {(isWeekendDay || isHolidayDay) && (
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute',
            bottom: 3,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: '0.6rem',
            color: isToday ? '#b29000' : '#d5b60a'
          }}
        >
          {isWeekendDay ? 'Weekend' : 'Holiday'}
        </Typography>
      )}

      {/* Add button (visible on hover) */}
      {(onAddTaskLog || onAddLeaveLog) && (
        <Box 
          className="add-button"
          sx={{ 
            position: 'absolute',
            top: 5,
            left: 5,
            opacity: 0,
            transition: 'opacity 0.2s'
          }}
        >
          <Button
            size="small"
            color="primary"
            onClick={handleAddClick}
            sx={{ minWidth: '24px', width: '24px', height: '24px', p: 0 }}
          >
            <AddIcon fontSize="small" />
          </Button>
        </Box>
      )}

      {/* Popup menu for add options */}
      <Popper open={open} anchorEl={anchorEl} placement="bottom-start" transition>
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={350}>
            <Paper sx={{ p: 1, boxShadow: 3, mt: 0.5, zIndex: 1300 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: '120px' }}>
                {onAddTaskLog && (
                  <Button 
                    size="small" 
                    onClick={handleAddTaskLog}
                    sx={{ justifyContent: 'flex-start', py: 0.5 }}
                  >
                    ADD TASK LOG
                  </Button>
                )}
                {onAddLeaveLog && (
                  <Button 
                    size="small" 
                    onClick={handleAddLeaveLog}
                    sx={{ justifyContent: 'flex-start', py: 0.5 }}
                  >
                    ADD LEAVE LOG
                  </Button>
                )}
              </Box>
            </Paper>
          </Fade>
        )}
      </Popper>
    </Paper>
  );
};

export default DateCell; 