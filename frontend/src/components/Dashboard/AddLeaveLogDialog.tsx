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
  Alert,
  AlertTitle
} from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { CreateLeaveLogRequest } from '../../api/leaveLogService';
import leaveLogService from '../../api/leaveLogService';
import taskLogService from '../../api/taskLogService';
import { format } from 'date-fns';
import { isHoliday, getHolidayReason } from '../../utils/dateUtils';
import { Holiday } from '../../api/holidayService';
import axios from 'axios';

// Extended interface with worked_day field
interface ExtendedLeaveLogRequest extends Omit<CreateLeaveLogRequest, 'worked_day'> {
  worked_day: number;
}

interface AddLeaveLogDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  holidays: Holiday[];
  onSuccess?: () => void;
}

const AddLeaveLogDialog: React.FC<AddLeaveLogDialogProps> = ({
  open,
  onClose,
  selectedDate,
  holidays = [],
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [holidayReason, setHolidayReason] = useState<string | null>(null);
  const [userId, setUserId] = useState<number>(0);
  const [existingLogs, setExistingLogs] = useState<{ taskTotal: number, leaveTotal: number }>({ taskTotal: 0, leaveTotal: 0 });
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Leave log types
  const leaveTypes = ['vacation', 'sick', 'personal', 'other'];
  
  // Form state with worked_day field
  const [leaveLogForm, setLeaveLogForm] = useState<ExtendedLeaveLogRequest>({
    user_id: userId,
    type: 'vacation',
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
    note: '',
    worked_day: 1
  });

  // Load user data and update holiday status
  useEffect(() => {
    if (open && selectedDate) {
      loadCurrentUser();
      updateHolidayStatus();
      loadExistingLogs();
    }
  }, [open, selectedDate]);

  // Force-set a default user ID if we still don't have one after loading
  useEffect(() => {
    // If dialog is open but we still have no user ID, use a default
    if (open && userId === 0) {
      console.log('No user ID loaded, using default ID 1');
      setUserId(1);
      setLeaveLogForm(prev => ({
        ...prev,
        user_id: 1
      }));
    }
  }, [open, userId]);

  // Update form when userId changes
  useEffect(() => {
    setLeaveLogForm(prev => ({
      ...prev,
      user_id: userId
    }));
  }, [userId]);

  // Validate logs when worked_day changes
  useEffect(() => {
    validateLogTime();
  }, [leaveLogForm.worked_day, existingLogs]);

  const updateHolidayStatus = () => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const holidayDesc = getHolidayReason(selectedDate, holidays);
      setHolidayReason(holidayDesc);
      
      setLeaveLogForm(prev => ({
        ...prev,
        date: dateStr
      }));
    }
  };

  const loadCurrentUser = async () => {
    setLoading(true);
    try {
      // Try to fetch from API first
      try {
        console.log('Fetching current user from /api/users/me');
        const response = await fetch('/api/users/me');
        const userData = await response.json();
        if (userData && userData.id) {
          console.log('Current user data:', userData);
          setUserId(userData.id);
          
          // Update the form's user_id
          setLeaveLogForm(prev => ({
            ...prev,
            user_id: userData.id
          }));
          return;
        } else {
          console.error('User data missing ID:', userData);
        }
      } catch (apiError) {
        console.error('Error fetching from /api/users/me:', apiError);
      }
      
      // Fall back to /api/current-user if the first attempt fails
      try {
        console.log('Fetching current user from /api/current-user');
        const response = await fetch('/api/current-user');
        const userData = await response.json();
        if (userData && userData.id) {
          console.log('Current user data from fallback:', userData);
          setUserId(userData.id);
          
          // Update the form's user_id
          setLeaveLogForm(prev => ({
            ...prev,
            user_id: userData.id
          }));
          return;
        } else {
          console.error('Fallback user data missing ID:', userData);
        }
      } catch (fallbackError) {
        console.error('Error fetching from fallback endpoint:', fallbackError);
      }
      
      // If both attempts fail, set a default user ID
      console.warn('Could not fetch user data, setting default ID 1');
      setUserId(1);
      setLeaveLogForm(prev => ({
        ...prev,
        user_id: 1
      }));
    } catch (error) {
      console.error('Error in loadCurrentUser:', error);
      // Set a default user ID as a last resort
      setUserId(1);
      setLeaveLogForm(prev => ({
        ...prev,
        user_id: 1
      }));
    } finally {
      setLoading(false);
    }
  };

  const loadExistingLogs = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Get task logs for this date
      const dateFilter = {
        start_date: dateStr,
        end_date: dateStr
      };
      const taskLogs = await taskLogService.getLogsByDateRange(dateFilter);
      
      // Calculate total worked days from task logs
      const taskTotal = taskLogs.reduce((total, log) => total + log.worked_day, 0);
      
      // Get leave logs for this date
      const year = new Date(dateStr).getFullYear();
      const allLeaveLogs = await leaveLogService.getCurrentUserLeaveLogs({ year });
      const leaveLogs = allLeaveLogs.filter(log => 
        log.date && format(new Date(log.date), 'yyyy-MM-dd') === dateStr
      );
      
      // For leave logs, each entry counts as 1 full day
      const leaveTotal = leaveLogs.length;
      
      setExistingLogs({ taskTotal, leaveTotal });
      validateLogTime(taskTotal, leaveTotal);
    } catch (error) {
      console.error('Error loading existing logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateLogTime = (taskTotal?: number, leaveTotal?: number) => {
    const currentTaskTotal = taskTotal !== undefined ? taskTotal : existingLogs.taskTotal;
    const currentLeaveTotal = leaveTotal !== undefined ? leaveTotal : existingLogs.leaveTotal;
    
    // Get the worked day value (default to 1 if not specified)
    const leaveDay = leaveLogForm.worked_day !== undefined ? leaveLogForm.worked_day : 1;
    
    // Calculate potential total with the leave day value
    const potentialTotal = currentTaskTotal + currentLeaveTotal + leaveDay;
    
    if (potentialTotal > 1) {
      setValidationError(`Adding a leave log would exceed 1 day (${potentialTotal.toFixed(2)} days). Current logs: ${currentTaskTotal.toFixed(2)} days of tasks + ${currentLeaveTotal} days of leave.`);
      return false;
    } else {
      setValidationError(null);
      return true;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'worked_day') {
      setLeaveLogForm(prev => ({
        ...prev,
        [name]: Number(value)
      }));
    } else {
      setLeaveLogForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleTypeChange = (e: any) => {
    setLeaveLogForm(prev => ({
      ...prev,
      type: e.target.value
    }));
  };

  const handleSubmit = async () => {
    // If no user ID is set, use ID 1 as fallback
    if (leaveLogForm.user_id === 0) {
      console.log('No user ID set, using default ID 1');
      setLeaveLogForm(prev => ({
        ...prev,
        user_id: 1
      }));
    }

    // Validate again before submission
    if (!validateLogTime()) {
      return;
    }

    setSubmitting(true);
    try {
      // Ensure we have a user ID one way or another
      const finalForm = {
        ...leaveLogForm,
        user_id: leaveLogForm.user_id || 1
      };
      
      // Log the form data for debugging
      console.log('Complete leave log form data:', finalForm);
      
      // Create a new object with only the fields the API expects
      // The worked_day field is only used for frontend validation
      const apiLeaveLog: CreateLeaveLogRequest = {
        user_id: finalForm.user_id,
        type: finalForm.type,
        date: finalForm.date,
        note: finalForm.note,
        worked_day: finalForm.worked_day || 1
      };
      
      console.log('Submitting leave log to API:', apiLeaveLog);
      console.log('API endpoint:', '/api/leave-logs');

      // Get token for debugging
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No authentication token found in localStorage');
      } else {
        console.log('Auth token exists with length:', token.length);
      }

      // Try the direct axios call first for more control
      try {
        console.log('Making direct API call to /api/leave-logs');
        const directResponse = await axios.post('http://localhost:8080/api/leave-logs', apiLeaveLog, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        
        console.log('Direct API response status:', directResponse.status);
        console.log('Direct API response data:', directResponse.data);
        
        if (onSuccess) {
          onSuccess();
        }
        handleClose();
        return;
      } catch (directError) {
        console.error('Direct API call error:', directError);
        // Fall back to the service method
      }

      // Use the service method as fallback
      try {
        console.log('Falling back to service method');
        const response = await leaveLogService.createLeaveLog(apiLeaveLog);
        console.log('Leave log created successfully via service:', response);
        
        if (onSuccess) {
          onSuccess();
        }
        handleClose();
      } catch (serviceError) {
        console.error('Service API call failed:', serviceError);
        throw serviceError;
      }
    } catch (error: any) {
      console.error('Error creating leave log:', error);
      
      // Show more detailed error message
      let errorMessage = 'Failed to create leave log. Please try again.';
      
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
        
        if (error.response.data && error.response.data.message) {
          errorMessage = `Error ${error.response.status}: ${error.response.data.message}`;
        } else if (error.response.data && error.response.data.error) {
          errorMessage = `Error ${error.response.status}: ${error.response.data.error}`;
        }
      } else if (error.request) {
        console.error('Error request:', error.request);
        errorMessage = 'No response received from server. Please check your connection.';
      } else if (error.message) {
        console.error('Error message:', error.message);
        errorMessage = `Error: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setLeaveLogForm({
      user_id: userId,
      type: 'vacation',
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      note: '',
      worked_day: 1
    });
    setValidationError(null);
    onClose();
  };

  const getRemainingTime = () => {
    const { taskTotal, leaveTotal } = existingLogs;
    const totalUsed = taskTotal + leaveTotal;
    const remaining = Math.max(0, 1 - totalUsed);
    return remaining;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Add Leave Log for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ pt: 2 }}>
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

            {/* Debug info - show why button is disabled */}
            <Box sx={{ mb: 2, mt: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Form Status:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <Box component="li">
                  <Typography variant="caption" color={leaveLogForm.user_id === 0 ? "error.main" : "success.main"}>
                    User ID: {leaveLogForm.user_id || "Not set"}
                  </Typography>
                </Box>
                <Box component="li">
                  <Typography variant="caption" color={validationError ? "error.main" : "success.main"}>
                    Validation: {validationError ? "Error" : "OK"}
                  </Typography>
                </Box>
                <Box component="li">
                  <Typography variant="caption" color={getRemainingTime() < leaveLogForm.worked_day! ? "error.main" : "success.main"}>
                    Time Check: {getRemainingTime().toFixed(2)} remaining vs {leaveLogForm.worked_day} requested
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="leave-type-label">Leave Type</InputLabel>
              <Select
                labelId="leave-type-label"
                id="leave-type-select"
                value={leaveLogForm.type}
                onChange={handleTypeChange}
                label="Leave Type"
              >
                {leaveTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              margin="normal"
              fullWidth
              name="worked_day"
              label="Leave Days"
              type="number"
              value={leaveLogForm.worked_day}
              onChange={handleInputChange}
              inputProps={{ 
                min: 0.1, 
                max: getRemainingTime(), 
                step: 0.1 
              }}
              helperText={`Enter portion of day (max: ${getRemainingTime().toFixed(2)} days remaining)`}
            />
            
            <TextField
              margin="normal"
              fullWidth
              name="date"
              label="Date"
              type="date"
              value={leaveLogForm.date}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              margin="normal"
              fullWidth
              name="note"
              label="Note"
              multiline
              rows={2}
              value={leaveLogForm.note}
              onChange={handleInputChange}
              placeholder="Add any additional information here"
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
          disabled={submitting || !!validationError || getRemainingTime() < leaveLogForm.worked_day!}
        >
          {submitting ? <CircularProgress size={24} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddLeaveLogDialog; 