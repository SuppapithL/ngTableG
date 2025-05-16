import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Box,
  Typography,
  Tooltip,
  IconButton,
  Alert,
  AlertTitle,
  Stack
} from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { TaskLog, TaskLogCreateRequest } from '../../api/taskLogService';
import taskLogService from '../../api/taskLogService';
import taskService from '../../api/taskService';
import leaveLogService from '../../api/leaveLogService';
import { format, parse } from 'date-fns';
import { isHoliday, getHolidayReason } from '../../utils/dateUtils';
import { Holiday } from '../../api/holidayService';
import { devLogin, isAuthenticated, clearAuth } from '../../utils/devAuth';
import axios from 'axios';
import api from '../../api/axiosConfig';

interface AddTaskLogDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  holidays: Holiday[];
  onSuccess?: () => void;
}

const AddTaskLogDialog: React.FC<AddTaskLogDialogProps> = ({
  open,
  onClose,
  selectedDate,
  holidays = [],
  onSuccess
}) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [holidayReason, setHolidayReason] = useState<string | null>(null);
  const [existingLogs, setExistingLogs] = useState<{ taskTotal: number, leaveTotal: number }>({ taskTotal: 0, leaveTotal: 0 });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [taskLogForm, setTaskLogForm] = useState<TaskLogCreateRequest>({
    task_id: 0,
    worked_day: 1,
    worked_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
    is_work_on_holiday: false
  });

  // Check for authentication when dialog opens
  useEffect(() => {
    if (open) {
      checkAuthentication();
    }
  }, [open]);

  // Load tasks and existing logs on component mount
  useEffect(() => {
    if (open && selectedDate && !authError) {
      loadTasks();
      updateHolidayStatus();
      loadExistingLogs();
    }
  }, [open, selectedDate, authError]);

  // Validate logs on form change
  useEffect(() => {
    validateLogTime();
  }, [taskLogForm.worked_day, existingLogs]);

  // Check if user is authenticated and try auto-login if not
  const checkAuthentication = async () => {
    if (!isAuthenticated()) {
      setAuthError("You're not authenticated. Attempting automatic login...");
      setLoading(true);
      
      try {
        const success = await devLogin();
        if (success) {
          setAuthError(null);
          console.log("Auto-login successful, proceeding with data loading");
        } else {
          setAuthError("Automatic login failed. Please log in manually first.");
        }
      } catch (error) {
        console.error("Authentication error:", error);
        setAuthError("Authentication error. Please log in manually first.");
      } finally {
        setLoading(false);
      }
    } else {
      setAuthError(null);
      console.log("Already authenticated, proceeding with data loading");
    }
  };

  const updateHolidayStatus = () => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const isHolidayDate = isHoliday(selectedDate, holidays);
      const holidayDesc = getHolidayReason(selectedDate, holidays);
      setHolidayReason(holidayDesc);
      
      setTaskLogForm(prev => ({
        ...prev,
        worked_date: dateStr,
        is_work_on_holiday: isHolidayDate
      }));
    }
  };

  const loadTasks = async () => {
    if (!isAuthenticated()) {
      await checkAuthentication();
      if (!isAuthenticated()) return;
    }
    
    setLoading(true);
    try {
      const tasksData = await taskService.getAllTasks();
      console.log('Tasks loaded:', tasksData);
      setTasks(tasksData);
      
      // Set default task if available
      if (tasksData.length > 0) {
        setTaskLogForm(prev => ({
          ...prev,
          task_id: tasksData[0].id
        }));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setApiError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingLogs = async () => {
    if (!selectedDate || !isAuthenticated()) return;

    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      console.log(`Loading logs for date: ${dateStr}`);
      
      // Get task logs for this date
      const dateFilter = {
        start_date: dateStr,
        end_date: dateStr
      };
      console.log('Fetching task logs with filter:', dateFilter);
      const taskLogs = await taskLogService.getLogsByDateRange(dateFilter);
      console.log('Task logs for date:', taskLogs);
      
      // Calculate total worked days from task logs
      const taskTotal = taskLogs.reduce((total, log) => total + log.worked_day, 0);
      console.log(`Total task days: ${taskTotal}`);
      
      // Get leave logs for this date
      const year = new Date(dateStr).getFullYear();
      console.log(`Fetching leave logs for year: ${year}`);
      const allLeaveLogs = await leaveLogService.getCurrentUserLeaveLogs({ year });
      console.log('All leave logs for year:', allLeaveLogs);
      
      const leaveLogs = allLeaveLogs.filter(log => 
        log.date && format(new Date(log.date), 'yyyy-MM-dd') === dateStr
      );
      console.log('Leave logs for date:', leaveLogs);
      
      // For leave logs, each entry counts as 1 full day
      const leaveTotal = leaveLogs.length;
      console.log(`Total leave days: ${leaveTotal}`);
      
      setExistingLogs({ taskTotal, leaveTotal });
      validateLogTime(taskTotal, leaveTotal);
      
      // Show validation message if exceeding limit
      if (taskTotal + leaveTotal >= 1) {
        setValidationError(`You already have ${taskTotal.toFixed(2)} days of tasks and ${leaveTotal} days of leave logged for this date.`);
      }
    } catch (error) {
      console.error('Error loading existing logs:', error);
      setApiError('Failed to load existing logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateLogTime = (taskTotal?: number, leaveTotal?: number) => {
    const currentTaskTotal = taskTotal !== undefined ? taskTotal : existingLogs.taskTotal;
    const currentLeaveTotal = leaveTotal !== undefined ? leaveTotal : existingLogs.leaveTotal;
    const newWorkTime = parseFloat(taskLogForm.worked_day.toString());
    
    // Calculate what the total would be if we add this new task log
    const potentialTotal = currentTaskTotal + newWorkTime + currentLeaveTotal;
    
    if (potentialTotal > 1) {
      setValidationError(`Total working time would exceed 1 day (${potentialTotal.toFixed(2)} days). Current logs: ${currentTaskTotal.toFixed(2)} days of tasks + ${currentLeaveTotal} days of leave.`);
      return false;
    } else {
      setValidationError(null);
      return true;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setTaskLogForm(prev => ({
      ...prev,
      [name]: name === 'worked_day' ? Number(value) : value
    }));
  };

  const handleTaskSelectChange = (e: any) => {
    setTaskLogForm(prev => ({
      ...prev,
      task_id: Number(e.target.value)
    }));
  };

  const handleSubmit = async () => {
    // Reset any previous errors
    setApiError(null);
    
    if (!isAuthenticated()) {
      await checkAuthentication();
      if (!isAuthenticated()) {
        setAuthError("Authentication required. Please log in first.");
        return;
      }
    }
    
    if (taskLogForm.task_id === 0) {
      setApiError('Please select a task');
      return;
    }

    // Validate again before submission
    if (!validateLogTime()) {
      return;
    }

    setSubmitting(true);
    try {
      // Create a properly formatted request that meets the API requirements
      const apiRequest: TaskLogCreateRequest = {
        task_id: taskLogForm.task_id,
        worked_day: taskLogForm.worked_day,
        worked_date: taskLogForm.worked_date, // Keep as string in the request
        is_work_on_holiday: taskLogForm.is_work_on_holiday
      };
      
      // Log the form data for debugging
      console.log('Submitting task log:', apiRequest);
      console.log('Auth token:', localStorage.getItem('auth_token'));
      
      const response = await taskLogService.createTaskLog(apiRequest);
      console.log('API response:', response);
      
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (error: any) {
      console.error('Error creating task log:', error);
      
      // Show more detailed error message
      let errorMessage = 'Failed to create task log. Please try again.';
      if (error.response) {
        console.log('Error response data:', error.response.data);
        console.log('Error response status:', error.response.status);
        
        if (error.response.data && error.response.data.message) {
          errorMessage = `Error: ${error.response.data.message}`;
        } else if (error.response.data && error.response.data.error) {
          errorMessage = `Error: ${error.response.data.error}`;
        } else if (error.message) {
          errorMessage = `Error: ${error.message}`;
        }
        
        if (error.response.status === 401) {
          setAuthError("Authentication failed. Please log in again.");
          clearAuth(); // Use our new utility function
        } else if (error.response.status === 404) {
          errorMessage = "Error: API endpoint not found. Please check server configuration.";
        }
      }
      
      setApiError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setTaskLogForm({
      task_id: 0,
      worked_day: 1,
      worked_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      is_work_on_holiday: false
    });
    setValidationError(null);
    setAuthError(null);
    setApiError(null);
    setSuccessMessage(null);
    onClose();
  };

  const getRemainingTime = () => {
    const { taskTotal, leaveTotal } = existingLogs;
    const totalUsed = taskTotal + leaveTotal;
    const remaining = Math.max(0, 1 - totalUsed);
    return remaining;
  };

  const testApiConnection = async () => {
    // Reset any previous messages
    setApiError(null);
    setSuccessMessage(null);
    
    try {
      // Test current-user endpoint
      setApiError("Testing API connection...");
      
      // Use the configured api client from axiosConfig which handles auth tokens
      const currentUserResponse = await api.get('/api/current-user');
      console.log('Current user test:', currentUserResponse);
      
      if (currentUserResponse.data) {
        // If we got a response, try to get task logs
        try {
          const taskLogsResponse = await api.get('/api/task-logs');
          console.log('Task logs test:', taskLogsResponse);
          setApiError(null); // Clear error message
          setSuccessMessage("API tests successful! Authentication working.");
        } catch (logError: any) {
          console.error('Task logs test error:', logError);
          setApiError(`API test failed: Request failed with status code ${logError.response?.status || 'unknown'}`);
        }
      } else {
        setApiError("Couldn't verify current user. You may need to log in again.");
      }
    } catch (error: any) {
      console.error('API test error:', error);
      setApiError(`API test failed: ${error.message}`);
      
      // If we get a 401 error, suggest logging in again
      if (error.response?.status === 401) {
        setAuthError("You need to log in again. Your session may have expired.");
      }
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Add Task Log for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ pt: 2 }}>
            {authError && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <AlertTitle>Authentication Issue</AlertTitle>
                {authError}
              </Alert>
            )}
            
            {apiError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <AlertTitle>API Error</AlertTitle>
                {apiError}
              </Alert>
            )}
            
            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>Success</AlertTitle>
                {successMessage}
              </Alert>
            )}
            
            {holidayReason && (
              <Box sx={{ mb: 2, p: 1, bgcolor: '#fffde7', borderRadius: 1, display: 'flex', alignItems: 'center' }}>
                <InfoOutlined sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="body2">
                  This date is marked as {holidayReason}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                Time allocation for {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'this date'}:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">
                  Task logs: {existingLogs.taskTotal.toFixed(2)} days
                </Typography>
                <Typography variant="body2" sx={{ mx: 1 }}>•</Typography>
                <Typography variant="body2">
                  Leave logs: {existingLogs.leaveTotal} days
                </Typography>
                <Typography variant="body2" sx={{ mx: 1 }}>•</Typography>
                <Typography variant="body2" fontWeight="bold">
                  Remaining: {getRemainingTime().toFixed(2)} days
                </Typography>
              </Box>
            </Box>
            
            {validationError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <AlertTitle>Validation Error</AlertTitle>
                {validationError}
              </Alert>
            )}
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="task-select-label">Task</InputLabel>
              <Select
                labelId="task-select-label"
                id="task-select"
                value={taskLogForm.task_id || ''}
                onChange={handleTaskSelectChange}
                label="Task"
                disabled={!!authError}
              >
                {tasks.map(task => (
                  <MenuItem key={task.id} value={task.id}>
                    {task.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              margin="normal"
              fullWidth
              name="worked_day"
              label="Worked Days"
              type="number"
              value={taskLogForm.worked_day}
              onChange={handleInputChange}
              inputProps={{ 
                min: 0.1, 
                max: getRemainingTime(), 
                step: 0.1 
              }}
              helperText={`Enter number of days worked (max: ${getRemainingTime().toFixed(2)} days remaining)`}
              disabled={!!authError}
            />
            
            <TextField
              margin="normal"
              fullWidth
              name="worked_date"
              label="Date"
              type="date"
              value={taskLogForm.worked_date}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              disabled={!!authError}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          color="primary" 
          variant="contained"
          disabled={submitting || taskLogForm.task_id === 0 || !!validationError || !!authError}
        >
          {submitting ? <CircularProgress size={24} /> : 'Save'}
        </Button>
        
        <Button 
          variant="outlined" 
          color="info" 
          onClick={testApiConnection} 
          disabled={submitting}
          size="small"
          sx={{ ml: 'auto' }}
        >
          Test API Connection
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddTaskLogDialog; 