import React, { useState, useEffect, ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tab,
  Tabs,
  Divider,
  IconButton,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Chip,
  Tooltip
} from '@mui/material';
import { DeleteOutline, AddCircleOutline, EditOutlined, InfoOutlined } from '@mui/icons-material';
import { TaskLog, TaskLogCreateRequest, TaskLogUpdateRequest } from '../../api/taskLogService';
import taskLogService from '../../api/taskLogService';
import taskService from '../../api/taskService';
import leaveLogService from '../../api/leaveLogService';
import holidayService from '../../api/holidayService';
import { CreateLeaveLogRequest, UpdateLeaveLogRequest } from '../../api/leaveLogService';
import { Holiday } from '../../api/holidayService';
import { format, isValid } from 'date-fns';
import { isHoliday, getHolidayReason } from '../../utils/dateUtils';
import medicalExpenseService, { MedicalExpense, MedicalExpenseResponse, CreateMedicalExpenseRequest } from '../../api/medicalExpenseService';
import taskEstimateService from '../../api/taskEstimateService';
import { annualRecordService, quotaPlanService } from '../../api';
import { validateMedicalExpense, validateLeaveQuota } from '../../utils/budgetUtils';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`date-logs-tabpanel-${index}`}
      aria-labelledby={`date-logs-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `date-logs-tab-${index}`,
    'aria-controls': `date-logs-tabpanel-${index}`,
  };
}

export interface LeaveLog {
  id: number;
  user_id: number;
  type: string;
  date: string;
  note: string;
  created_at: string;
  username?: string;
  worked_day?: number;
}

interface DateLogsDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onAddTaskLog?: (date: Date) => void;
  onAddLeaveLog?: (date: Date) => void;
}

interface TimeDisplayProps {
  selectedDate: Date;
  taskLogs: TaskLog[];
  leaveLogs: LeaveLog[];
}

// Helper function to safely format dates (adds protection against invalid dates)
const safeFormat = (date: Date | string | null | undefined, formatString: string, fallback: string = 'Invalid date'): string => {
  if (!date) return fallback;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(dateObj)) return fallback;
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting date:', date, error);
    return fallback;
  }
};

// Helper function for consistent date formatting and comparison
const isSameDay = (date1: string | Date, date2: string | Date): boolean => {
  // For explicit date format comparison
  let formatted1, formatted2;
  
  try {
    formatted1 = typeof date1 === 'string' ? safeFormat(new Date(date1), 'yyyy-MM-dd', '') : safeFormat(date1, 'yyyy-MM-dd', '');
  } catch (error) {
    console.error('Error formatting date1:', date1, error);
    // Default to string value if we can't format
    formatted1 = typeof date1 === 'string' ? date1 : '';
  }
  
  try {
    formatted2 = typeof date2 === 'string' ? safeFormat(new Date(date2), 'yyyy-MM-dd', '') : safeFormat(date2, 'yyyy-MM-dd', '');
  } catch (error) {
    console.error('Error formatting date2:', date2, error);
    // Default to string value if we can't format
    formatted2 = typeof date2 === 'string' ? date2 : '';
  }
  
  const result = formatted1 === formatted2;
  if (!result) {
    console.log(`Date comparison: ${formatted1} !== ${formatted2}`);
  }
  return result;
};

const TimeAllocationDisplay: React.FC<TimeDisplayProps> = ({ selectedDate, taskLogs, leaveLogs }) => {
  const dateStr = safeFormat(selectedDate, 'yyyy-MM-dd');
  
  // Debug the incoming data - with additional error handling
  console.log('TimeAllocationDisplay - All task logs:', taskLogs.map(log => {
    try {
      return {
        id: log.id,
        date: safeFormat(new Date(log.worked_date), 'yyyy-MM-dd'),
        worked_day: log.worked_day
      };
    } catch (err) {
      console.error(`Error processing task log ${log.id}:`, err, log);
      return { id: log.id, date: 'ERROR', worked_day: log.worked_day };
    }
  }));
  
  // Find all matching logs with explicit format matching and error handling
  const matchingTaskLogs = taskLogs.filter(log => {
    try {
      const logDateStr = safeFormat(new Date(log.worked_date), 'yyyy-MM-dd');
      const matches = logDateStr === dateStr;
      return matches;
    } catch (err) {
      console.error(`Error comparing task log ${log.id} date:`, err, log);
      return false;
    }
  });
  
  const matchingLeaveLogs = leaveLogs.filter(log => {
    try {
      const logDateStr = safeFormat(new Date(log.date), 'yyyy-MM-dd');
      const matches = logDateStr === dateStr;
      return matches;
    } catch (err) {
      console.error(`Error comparing leave log ${log.id} date:`, err, log);
      return false;
    }
  });
  
  const taskLogsTotal = matchingTaskLogs.reduce((sum, log) => sum + log.worked_day, 0);
  const leaveLogsTotal = matchingLeaveLogs.reduce((sum, log) => sum + (log.worked_day || 1), 0);
  
  const totalUsed = taskLogsTotal + leaveLogsTotal;
  
  console.log(`Time allocation calculation for ${dateStr}: Tasks=${taskLogsTotal.toFixed(2)}, Leave=${leaveLogsTotal.toFixed(2)}, Total=${totalUsed}`);
  
  return (
    <>
      <Typography variant="body2">
        Used: {totalUsed.toFixed(2)} of 1.00 day
      </Typography>
      {matchingTaskLogs.length > 0 && (
        <Typography variant="body2" sx={{ color: 'primary.main' }}>
          (Tasks: {taskLogsTotal.toFixed(2)})
        </Typography>
      )}
      {matchingLeaveLogs.length > 0 && (
        <Typography variant="body2" sx={{ color: 'secondary.main' }}>
          (Leave: {leaveLogsTotal.toFixed(2)})
        </Typography>
      )}
    </>
  );
};

const RemainingTimeChip: React.FC<TimeDisplayProps> = ({ selectedDate, taskLogs, leaveLogs }) => {
  const dateStr = safeFormat(selectedDate, 'yyyy-MM-dd');
  
  // Find all matching logs with explicit format matching and error handling
  const matchingTaskLogs = taskLogs.filter(log => {
    try {
      return safeFormat(new Date(log.worked_date), 'yyyy-MM-dd') === dateStr;
    } catch (err) {
      console.error(`Error comparing task log ${log.id} date in RemainingTimeChip:`, err, log);
      return false;
    }
  });
  
  const matchingLeaveLogs = leaveLogs.filter(log => {
    try {
      return safeFormat(new Date(log.date), 'yyyy-MM-dd') === dateStr;
    } catch (err) {
      console.error(`Error comparing leave log ${log.id} date in RemainingTimeChip:`, err, log);
      return false;
    }
  });
  
  const taskLogsTotal = matchingTaskLogs.reduce((sum, log) => sum + log.worked_day, 0);
  const leaveLogsTotal = matchingLeaveLogs.reduce((sum, log) => sum + (log.worked_day || 1), 0);
  
  const totalUsed = taskLogsTotal + leaveLogsTotal;
  const remaining = Math.max(0, 1 - totalUsed);
  
  return (
    <Chip 
      label={`${remaining.toFixed(2)} days remaining`}
      color={remaining > 0 ? 'success' : 'error'}
      variant="outlined"
      size="small"
    />
  );
};

const DateLogsDialog: React.FC<DateLogsDialogProps> = ({ open, onClose, selectedDate, onAddTaskLog, onAddLeaveLog }) => {
  const [tabValue, setTabValue] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [leaveLogs, setLeaveLogs] = useState<LeaveLog[]>([]);
  const [medicalExpenses, setMedicalExpenses] = useState<MedicalExpense[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingTaskLog, setAddingTaskLog] = useState(false);
  const [addingLeaveLog, setAddingLeaveLog] = useState(false);
  const [editingTaskLog, setEditingTaskLog] = useState<TaskLog | null>(null);
  const [editingLeaveLog, setEditingLeaveLog] = useState<LeaveLog | null>(null);
  const [holidayReason, setHolidayReason] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [taskEstimateInfo, setTaskEstimateInfo] = useState<{ estimateDay: number; taskTitle: string } | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);
  
  // Form states
  const [taskLogForm, setTaskLogForm] = useState<TaskLogCreateRequest>({
    task_id: 0,
    worked_day: 1,
    worked_date: selectedDate ? safeFormat(selectedDate, 'yyyy-MM-dd') : '',
    is_work_on_holiday: false
  });
  
  const [leaveLogForm, setLeaveLogForm] = useState<CreateLeaveLogRequest & { worked_day: number }>({
    user_id: 0,
    type: 'vacation',
    date: selectedDate ? safeFormat(selectedDate, 'yyyy-MM-dd') : '',
    note: '',
    worked_day: 1
  });
  
  const [medicalExpenseForm, setMedicalExpenseForm] = useState({
    receipt_date: selectedDate ? safeFormat(selectedDate, 'yyyy-MM-dd') : '',
    amount: '',
    receipt_name: '',
    note: '',
    user_id: 0,
    leave_log_id: 0
  });
  
  const leaveTypes = ['vacation', 'sick'];
  
  // Add state for leave quota validation
  const [leaveQuotaValidation, setLeaveQuotaValidation] = useState<{
    isValid: boolean;
    remainingBefore: number;
    remainingAfter: number;
    message: string;
  } | null>(null);
  
  // Add a function to check leave quota validation when leave type changes
  const checkLeaveQuotaValidation = async (leaveType: string, leaveDays: number) => {
    // Only validate for vacation type
    if (leaveType !== 'vacation') {
      setLeaveQuotaValidation(null);
      return;
    }
    
    try {
      // Get the current year from the leave date
      const leaveDate = new Date(leaveLogForm.date);
      const leaveYear = leaveDate.getFullYear();
      
      // Get the annual record for the user
      const records = await annualRecordService.getCurrentUserAnnualRecords();
      const currentYearRecord = records.find(record => record.year === leaveYear);
      
      if (!currentYearRecord || !currentYearRecord.quota_plan_id) {
        setLeaveQuotaValidation(null);
        return;
      }
      
      // Get the quota plan
      const quotaPlan = await quotaPlanService.getQuotaPlanById(currentYearRecord.quota_plan_id);
      
      if (!quotaPlan) {
        setLeaveQuotaValidation(null);
        return;
      }
      
      // Validate the leave request
      const validation = validateLeaveQuota(
        quotaPlan.quota_vacation_day,
        currentYearRecord.rollover_vacation_day,
        currentYearRecord.worked_on_holiday_day,
        currentYearRecord.used_vacation_day,
        leaveDays
      );
      
      setLeaveQuotaValidation(validation);
    } catch (error) {
      console.error('Error validating leave quota:', error);
      setLeaveQuotaValidation(null);
    }
  };
  
  // Add debug logging for date-related issues
  useEffect(() => {
    if (open && selectedDate) {
      console.log('DateLogsDialog opened with selectedDate:', selectedDate);
      
      // Debug selected date
      try {
        console.log('Selected date formatting test:', {
          raw: selectedDate,
          isValid: isValid(selectedDate),
          formatted: safeFormat(selectedDate, 'yyyy-MM-dd')
        });
      } catch (error) {
        console.error('Error when testing selected date format:', error);
      }
    }
  }, [open, selectedDate]);
  
  // Add debug logging when task or leave logs are updated
  useEffect(() => {
    if (taskLogs.length > 0) {
      console.log('Task logs loaded, testing dates:');
      taskLogs.forEach((log, index) => {
        if (index < 5) { // Only log first 5 to avoid console spam
          try {
            console.log(`Task log ${log.id} date:`, {
              raw: log.worked_date,
              isValid: isValid(new Date(log.worked_date)),
              formatted: safeFormat(new Date(log.worked_date), 'yyyy-MM-dd')
            });
          } catch (error) {
            console.error(`Error formatting task log ${log.id} date:`, error);
          }
        }
      });
    }
  }, [taskLogs]);
  
  useEffect(() => {
    if (leaveLogs.length > 0) {
      console.log('Leave logs loaded, testing dates:');
      leaveLogs.forEach((log, index) => {
        if (index < 5) { // Only log first 5 to avoid console spam
          try {
            console.log(`Leave log ${log.id} date:`, {
              raw: log.date,
              isValid: isValid(new Date(log.date)),
              formatted: safeFormat(new Date(log.date), 'yyyy-MM-dd')
            });
          } catch (error) {
            console.error(`Error formatting leave log ${log.id} date:`, error);
          }
        }
      });
    }
  }, [leaveLogs]);
  
  // Load data when dialog opens with a selected date
  useEffect(() => {
    if (open && selectedDate) {
      loadData();
    }
  }, [open, selectedDate]);
  
  // Fetch holidays data when the component mounts
  useEffect(() => {
    fetchHolidays();
  }, []);
  
  // Effect to handle selected date changes
  useEffect(() => {
    if (selectedDate) {
      const dateStr = safeFormat(selectedDate, 'yyyy-MM-dd');
      
      // Check if the selected date is a holiday
      const isHolidayDate = isHoliday(selectedDate, holidays);
      const holidayDesc = getHolidayReason(selectedDate, holidays);
      setHolidayReason(holidayDesc);
      
      // Update form states with the new date and holiday status
      setTaskLogForm(prev => ({
        ...prev,
        worked_date: dateStr,
        is_work_on_holiday: isHolidayDate
      }));
      
      setLeaveLogForm(prev => ({
        ...prev,
        date: dateStr
      }));
      
      setMedicalExpenseForm(prev => ({
        ...prev,
        receipt_date: dateStr
      }));
    }
  }, [selectedDate, holidays]);
  
  // Load current user info when dialog opens
  useEffect(() => {
    if (open) {
      fetchCurrentUserId();
    }
  }, [open]);
  
  // Function to get current user ID
  const fetchCurrentUserId = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      
      const response = await fetch('http://localhost:8080/api/current-user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        if (userData && userData.id) {
          setCurrentUserId(userData.id);
          // Update leaveLogForm with the user ID
          setLeaveLogForm(prev => ({
            ...prev,
            user_id: userData.id
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      // Use default user ID if fetch fails
      setCurrentUserId(1);
    }
  };
  
  const fetchHolidays = async () => {
    try {
      const data = await holidayService.getAllHolidays();
      setHolidays(data);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };
  
  const loadData = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    
    try {
      // Format date for API calls
      const dateStr = safeFormat(selectedDate, 'yyyy-MM-dd');
      
      // Get tasks for task log dropdown
      const tasksData = await taskService.getAllTasks();
      setTasks(tasksData);
      
      // Get task logs for selected date
      const dateFilter = {
        start_date: dateStr,
        end_date: dateStr
      };
      console.log('Fetching task logs for date:', dateStr);
      try {
      const taskLogsData = await taskLogService.getLogsByDateRange(dateFilter);
        console.log('Task logs response:', taskLogsData);
      setTaskLogs(taskLogsData);
      } catch (error) {
        console.error('Error fetching task logs:', error);
        setTaskLogs([]);
      }
      
      // Get leave logs for the date
      try {
        // Simplified parameter format for the updated service
        const leaveLogsData = await leaveLogService.getCurrentUserLeaveLogs({
          year: selectedDate.getFullYear()
        });
        
        console.log('Leave logs response:', leaveLogsData);
        
        // Filter leave logs by the exact date
        const filteredLeaveLogs = leaveLogsData.filter(log => {
          return safeFormat(new Date(log.date), 'yyyy-MM-dd') === dateStr;
        });
        
        setLeaveLogs(filteredLeaveLogs);
      } catch (error) {
        console.error('Error fetching leave logs:', error);
        setLeaveLogs([]);
      }
      
      // Get medical expenses for the date
      try {
        const medicalExpensesData = await medicalExpenseService.getCurrentUserMedicalExpenses(
          selectedDate.getFullYear()
        );
        
        console.log('Medical expenses response:', medicalExpensesData);
        
        // Filter medical expenses by the exact date
        const filteredMedicalExpensesTemp = medicalExpensesData.filter(expense => {
          // Get date from either receiptDate (PostgreSQL format) or receipt_date (frontend format)
          const expenseDate = expense.receiptDate ? 
            (typeof expense.receiptDate === 'string' ? 
              expense.receiptDate : 
              (expense.receiptDate.time ? expense.receiptDate.time.split('T')[0] : '')) : '';
            
          return safeFormat(new Date(expenseDate), 'yyyy-MM-dd') === dateStr;
        });
        
        // Convert from MedicalExpenseResponse to MedicalExpense format
        const convertedExpenses: MedicalExpense[] = filteredMedicalExpensesTemp.map(expense => {
          // Convert amount from pgtype.Numeric to number
          let amount = 0;
          if (typeof expense.amount === 'number') {
            amount = expense.amount;
          } else if (expense.amount && typeof expense.amount === 'object') {
            try {
              amount = parseFloat(expense.amount.toString());
            } catch (e) {
              console.error('Error parsing amount:', e);
            }
          }
          
          // Extract receipt name
          let receiptName = '';
          if (typeof expense.receiptName === 'string') {
            receiptName = expense.receiptName;
          } else if (expense.receiptName && typeof expense.receiptName === 'object' && 'string' in expense.receiptName) {
            receiptName = expense.receiptName.string || '';
          }
          
          // Extract receipt date
          let receiptDate = '';
          if (typeof expense.receiptDate === 'string') {
            receiptDate = expense.receiptDate;
          } else if (expense.receiptDate && typeof expense.receiptDate === 'object') {
            if ('time' in expense.receiptDate && expense.receiptDate.time) {
              receiptDate = expense.receiptDate.time.split('T')[0];
            }
          }
          
          // Extract note
          let note = '';
          if (typeof expense.note === 'string') {
            note = expense.note;
          } else if (expense.note && typeof expense.note === 'object' && 'string' in expense.note) {
            note = expense.note.string || '';
          }
          
          // Return properly formatted MedicalExpense object
          return {
            id: expense.id,
            user_id: expense.userId,
            amount: amount,
            receipt_name: receiptName,
            receipt_date: receiptDate,
            note: note,
            created_at: typeof expense.createdAt === 'string' ? 
              expense.createdAt : new Date().toISOString()
          };
        });
        
        setMedicalExpenses(convertedExpenses);
      } catch (error) {
        console.error('Error fetching medical expenses:', error);
        setMedicalExpenses([]);
      }
      
      // Set form date fields to the selected date
        setTaskLogForm(prev => ({
          ...prev,
        worked_date: dateStr
      }));
      
      setLeaveLogForm(prev => ({
        ...prev,
        date: dateStr
      }));
      
      setMedicalExpenseForm(prev => ({
        ...prev,
        receipt_date: dateStr
        }));
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Task log form handlers
  const handleTaskLogInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // If the date is being changed, check if it's a holiday
    if (name === 'worked_date') {
      const newDate = new Date(value);
      const isHolidayDate = isHoliday(newDate, holidays);
      const holidayDesc = getHolidayReason(newDate, holidays);
      setHolidayReason(holidayDesc);
      
      setTaskLogForm(prev => ({
        ...prev,
        [name]: value,
        is_work_on_holiday: isHolidayDate
      }));
    } else {
      setTaskLogForm(prev => ({
        ...prev,
        [name]: name === 'worked_day' ? Number(value) : value
      }));
    }
  };
  
  const handleTaskSelectChange = (e: SelectChangeEvent<number | string>) => {
    const taskId = Number(e.target.value);
    
    setTaskLogForm(prev => ({
      ...prev,
      task_id: taskId
    }));
    
    // If a task is selected, fetch its latest estimate
    if (taskId > 0) {
      fetchTaskEstimate(taskId);
    }
  };
  
  const fetchTaskEstimate = async (taskId: number) => {
    try {
      const estimates = await taskEstimateService.getEstimatesForTask(taskId);
      
      // Find the latest estimate
      if (estimates.length > 0) {
        const latestEstimate = estimates.reduce((prev, current) => {
          return new Date(current.created_at) > new Date(prev.created_at) ? current : prev;
        });
        
        // You can use this estimate information to display in the UI
        // For example, add it to a state variable to show in the form
        setTaskEstimateInfo({
          estimateDay: latestEstimate.estimate_day,
          taskTitle: latestEstimate.task_title || '',
        });
      } else {
        setTaskEstimateInfo(null);
      }
    } catch (error) {
      console.error('Error fetching task estimate:', error);
      setTaskEstimateInfo(null);
    }
  };
  
  // Calculate total time logged for a specific date (task logs + leave logs)
  const calculateTotalTimeForDate = (date: string, excludeLogId?: number): number => {
    // Sum task logs for this date (excluding the current editing log if provided)
    const taskLogsTotal = taskLogs
      .filter(log => {
        const isMatchingDate = isSameDay(log.worked_date, date);
        const shouldInclude = excludeLogId ? log.id !== excludeLogId : true;
        return isMatchingDate && shouldInclude;
      })
      .reduce((sum, log) => sum + log.worked_day, 0);
    
    // Sum leave logs for this date (excluding the current editing log if provided)
    const leaveLogsTotal = leaveLogs
      .filter(log => {
        const isMatchingDate = isSameDay(log.date, date);
        const shouldInclude = excludeLogId ? log.id !== excludeLogId : true;
        return isMatchingDate && shouldInclude;
      })
      .reduce((sum, log) => sum + (log.worked_day || 1), 0);
    
    console.log(`Total time calculation for ${date}: Task logs=${taskLogsTotal.toFixed(2)}, Leave logs=${leaveLogsTotal.toFixed(2)}, Combined=${(taskLogsTotal + leaveLogsTotal).toFixed(2)}`);
    
    return taskLogsTotal + leaveLogsTotal;
  };
  
  // Get remaining available time for a specific date
  const getRemainingTime = (date: string, excludeLogId?: number): number => {
    const currentTotal = calculateTotalTimeForDate(date, excludeLogId);
    const remaining = Math.max(0, 1 - currentTotal);
    return remaining;
  };
  
  // Validate if adding a new log would exceed the 1-day limit
  const validateDayLimit = (date: string, hoursToAdd: number, excludeLogId?: number): boolean => {
    const currentTotal = calculateTotalTimeForDate(date, excludeLogId);
    const newTotal = currentTotal + hoursToAdd;
    
    // Check if the total would exceed 1 day
    if (newTotal > 1) {
      console.warn(`Adding ${hoursToAdd} days would exceed the 1-day limit. Current total: ${currentTotal}`);
      return false;
    }
    
    return true;
  };
  
  const handleSubmitTaskLog = async () => {
    try {
      // Ensure the is_work_on_holiday field is properly set based on the date
      const logDate = new Date(taskLogForm.worked_date);
      const isHolidayDate = isHoliday(logDate, holidays);
      
      // Update the form with the correct holiday status
      const updatedTaskLogForm = {
        ...taskLogForm,
        is_work_on_holiday: isHolidayDate
      };
      
      console.log('Submitting task log with data:', updatedTaskLogForm);
      
      // Format date for calculations
      const dateStr = safeFormat(logDate, 'yyyy-MM-dd');
      
      // Display task logs for debugging
      console.log('Current task logs:', taskLogs.map(log => ({
        id: log.id,
        date: safeFormat(new Date(log.worked_date), 'yyyy-MM-dd'),
        worked_day: log.worked_day
      })));
      
      // Get existing task logs for the same date
      const existingTaskLogs = taskLogs.filter(log => 
        isSameDay(log.worked_date, dateStr) && (!editingTaskLog || log.id !== editingTaskLog.id)
      );
      
      // Get existing leave logs for the same date
      const existingLeaveLogs = leaveLogs.filter(log => 
        isSameDay(log.date, dateStr) && (!editingLeaveLog || log.id !== editingLeaveLog.id)
      );
      
      // Calculate totals
      const taskLogTotal = existingTaskLogs.reduce((sum, log) => sum + log.worked_day, 0);
      const leaveLogTotal = existingLeaveLogs.reduce((sum, log) => sum + (log.worked_day || 1), 0);
      const existingTotal = taskLogTotal + leaveLogTotal;
      
      // Add the new/edited task log amount
      const requestedTime = updatedTaskLogForm.worked_day;
      const newTotal = existingTotal + requestedTime;
      
      console.log(`Time calculation: Existing task logs=${taskLogTotal}, Leave logs=${leaveLogTotal}, Requested=${requestedTime}, Total=${newTotal}`);
      
      if (newTotal > 1.0) {
        const allocationMessage = `
Current allocation for ${safeFormat(logDate, 'MMM d, yyyy')}:
- Tasks: ${taskLogTotal.toFixed(2)} days
- Leave: ${leaveLogTotal.toFixed(2)} days
- Available: ${(1.0 - existingTotal).toFixed(2)} days
- Requested: ${requestedTime.toFixed(2)} days

You cannot exceed the maximum daily limit of 1.00 day.
`;
        
        alert(`Cannot add this task log as it would exceed the 1-day limit for this date.\n\n${allocationMessage}`);
        return;
      }
      
      if (editingTaskLog) {
        console.log(`Updating task log ID ${editingTaskLog.id}`);
        const updateData: TaskLogUpdateRequest = {
          worked_day: updatedTaskLogForm.worked_day,
          worked_date: updatedTaskLogForm.worked_date,
          is_work_on_holiday: updatedTaskLogForm.is_work_on_holiday
        };
        
        try {
          const updatedLog = await taskLogService.updateTaskLog(editingTaskLog.id, updateData);
          console.log('Task log updated successfully:', updatedLog);
        } catch (error) {
          console.error('Error updating task log:', error);
          throw error;
        }
      } else {
        console.log('Creating new task log');
        try {
          const newLog = await taskLogService.createTaskLog(updatedTaskLogForm);
          console.log('Task log created successfully:', newLog);
        } catch (error) {
          console.error('Error creating task log:', error);
          throw error;
        }
      }
      
      setAddingTaskLog(false);
      setEditingTaskLog(null);
      setTaskLogForm({
        task_id: 0,
        worked_day: 1,
        worked_date: selectedDate ? safeFormat(selectedDate, 'yyyy-MM-dd') : '',
        is_work_on_holiday: selectedDate ? isHoliday(selectedDate, holidays) : false
      });
      
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error saving task log:', error);
      alert(`Error ${editingTaskLog ? 'updating' : 'creating'} task log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleEditTaskLog = (log: TaskLog) => {
    setEditingTaskLog(log);
    
    // Check if the log date is a holiday
    const logDate = new Date(log.worked_date);
    const isHolidayDate = isHoliday(logDate, holidays);
    const holidayDesc = getHolidayReason(logDate, holidays);
    setHolidayReason(holidayDesc);
    
    setTaskLogForm({
      task_id: log.task_id,
      worked_day: log.worked_day,
      worked_date: safeFormat(logDate, 'yyyy-MM-dd'),
      is_work_on_holiday: isHolidayDate // Use our calculation instead of stored value
    });
    
    setAddingTaskLog(true);
  };
  
  const handleDeleteTaskLog = async (id: number) => {
    try {
      await taskLogService.deleteTaskLog(id);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error deleting task log:', error);
    }
  };
  
  // Leave log form handlers
  const handleLeaveLogInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // If the date is being changed, check if it's a holiday
    if (name === 'date') {
      const newDate = new Date(value);
      const holidayDesc = getHolidayReason(newDate, holidays);
      setHolidayReason(holidayDesc);
    }
    
    const newLeaveLogForm = {
      ...leaveLogForm,
      [name]: name === 'worked_day' ? Number(value) : value
    };
    
    setLeaveLogForm(newLeaveLogForm);
    
    // If this is a worked_day change and the leave type is vacation, update validation
    if (name === 'worked_day' && leaveLogForm.type === 'vacation') {
      checkLeaveQuotaValidation('vacation', Number(value));
    }
    
    // If this is a note field update for a sick leave, sync the note to medical expense form too
    if (name === 'note' && leaveLogForm.type === 'sick') {
      setMedicalExpenseForm(prev => ({
        ...prev,
        note: value
      }));
    }
    
    // If date changed, also update the medical expense receipt date
    if (name === 'date') {
      setMedicalExpenseForm(prev => ({
        ...prev,
        receipt_date: value
      }));
    }
  };
  
  const handleMedicalExpenseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMedicalExpenseForm(prev => ({
      ...prev,
      [name]: name === 'amount' ? (value === '' ? '' : Number(value)) : value
    }));
  };
  
  const handleLeaveTypeChange = (e: SelectChangeEvent) => {
    const leaveType = e.target.value as string;
    
    setLeaveLogForm(prev => ({
      ...prev,
      type: leaveType
    }));
    
    // Check leave quota validation if it's a vacation leave
    checkLeaveQuotaValidation(leaveType, leaveLogForm.worked_day || 1);
    
    // If sick leave is selected, reset medical expense form to ensure it matches leave form
    if (leaveType === 'sick') {
      setMedicalExpenseForm(prev => ({
        ...prev,
        receipt_date: leaveLogForm.date,
        user_id: currentUserId,
        // Copy any existing note from the leave log form
        note: leaveLogForm.note || prev.note
      }));
    }
  };
  
  const handleSubmitLeaveLog = async () => {
    try {
      console.log('Submitting leave log with data:', leaveLogForm);
      
      // Format date for calculations
      const dateStr = safeFormat(leaveLogForm.date, 'yyyy-MM-dd');
      
      // Display logs for debugging
      console.log('Current leave logs:', leaveLogs.map(log => ({
        id: log.id,
        date: safeFormat(new Date(log.date), 'yyyy-MM-dd'),
        worked_day: log.worked_day || 1
      })));
      
      // Get existing task logs for the same date
      const existingTaskLogs = taskLogs.filter(log => 
        isSameDay(log.worked_date, dateStr) && (!editingTaskLog || log.id !== editingTaskLog.id)
      );
      
      // Get existing leave logs for the same date
      const existingLeaveLogs = leaveLogs.filter(log => 
        isSameDay(log.date, dateStr) && (!editingLeaveLog || log.id !== editingLeaveLog.id)
      );
      
      // Calculate totals
      const taskLogTotal = existingTaskLogs.reduce((sum, log) => sum + log.worked_day, 0);
      const leaveLogTotal = existingLeaveLogs.reduce((sum, log) => sum + (log.worked_day || 1), 0);
      const existingTotal = taskLogTotal + leaveLogTotal;
      
      // Add the new/edited leave log amount
      const requestedTime = leaveLogForm.worked_day || 1;
      const newTotal = existingTotal + requestedTime;
      
      console.log(`Time calculation: Existing task logs=${taskLogTotal}, Leave logs=${leaveLogTotal}, Requested=${requestedTime}, Total=${newTotal}`);
      
      if (newTotal > 1.0) {
        const allocationMessage = `
Current allocation for ${safeFormat(new Date(dateStr), 'MMM d, yyyy')}:
- Tasks: ${taskLogTotal.toFixed(2)} days
- Leave: ${leaveLogTotal.toFixed(2)} days
- Available: ${(1.0 - existingTotal).toFixed(2)} days
- Requested: ${requestedTime.toFixed(2)} days

You cannot exceed the maximum daily limit of 1.00 day.
`;
        
        alert(`Cannot add this leave log as it would exceed the 1-day limit for this date.\n\n${allocationMessage}`);
        return;
      }
      
      // For vacation leave, check if it exceeds the annual leave quota
      if (leaveLogForm.type === 'vacation') {
        try {
          // Get the current year from the leave date
          const leaveYear = new Date(leaveLogForm.date).getFullYear();
          
          // Get the annual record for the user
          const records = await annualRecordService.getCurrentUserAnnualRecords();
          const currentYearRecord = records.find(record => record.year === leaveYear);
          
          if (!currentYearRecord) {
            alert(`No annual record found for ${leaveYear}. Cannot validate leave quota.`);
            return;
          }
          
          if (!currentYearRecord.quota_plan_id) {
            alert('No quota plan assigned to your annual record. Please contact an administrator.');
            return;
          }
          
          // Get the quota plan
          const quotaPlan = await quotaPlanService.getQuotaPlanById(currentYearRecord.quota_plan_id);
          
          if (!quotaPlan) {
            alert('Could not find your quota plan. Please contact an administrator.');
            return;
          }
          
          // Now validate the leave against the quota
          const validation = validateLeaveQuota(
            quotaPlan.quota_vacation_day,
            currentYearRecord.rollover_vacation_day,
            currentYearRecord.worked_on_holiday_day,
            currentYearRecord.used_vacation_day,
            requestedTime
          );
          
          // If validation fails, show an error and prevent submission
          if (!validation.isValid) {
            alert(`Cannot add this vacation leave: ${validation.message}\nYour remaining leave quota is ${validation.remainingBefore.toFixed(1)} days.`);
            return;
          }
        } catch (error) {
          console.error('Error validating leave quota:', error);
          alert('Failed to validate against your leave quota. Please try again.');
          return;
        }
      }
      
      let updatedLeaveLog: LeaveLog | null = null;
      
      if (editingLeaveLog) {
        console.log(`Updating leave log ID ${editingLeaveLog.id}`);
        const updateData: UpdateLeaveLogRequest = {
          type: leaveLogForm.type,
          date: leaveLogForm.date,
          note: leaveLogForm.note,
          worked_day: leaveLogForm.worked_day
        };
        
        try {
          updatedLeaveLog = await leaveLogService.updateLeaveLog(editingLeaveLog.id, updateData);
          console.log('Leave log updated successfully:', updatedLeaveLog);
          
          if (updatedLeaveLog) {
            // Update local state with the updated log
            setLeaveLogs(prevLogs => 
              prevLogs.map(log => 
                log.id === editingLeaveLog.id ? updatedLeaveLog! : log
              )
            );
          }
        } catch (error) {
          console.error('Error updating leave log:', error);
          alert('Failed to update leave log');
          return;
        }
      } else {
        // Create a new leave log
        if (!leaveLogForm.date) {
          alert('Please select a date');
          return;
        }
        
        // Ensure user_id is set
        if (!leaveLogForm.user_id && currentUserId) {
          leaveLogForm.user_id = currentUserId;
        }
        
        console.log('Creating new leave log with data:', {
          ...leaveLogForm,
          user_id: leaveLogForm.user_id || currentUserId || 0
        });
        
        try {
          updatedLeaveLog = await leaveLogService.createLeaveLog({
            user_id: leaveLogForm.user_id || currentUserId || 0,
            type: leaveLogForm.type,
            date: leaveLogForm.date,
            note: leaveLogForm.note,
            worked_day: leaveLogForm.worked_day || 1
          });
          
          console.log('Leave log created successfully:', updatedLeaveLog);
          
          if (updatedLeaveLog) {
            // Add the new log to local state
            setLeaveLogs(prevLogs => [...prevLogs, updatedLeaveLog!]);
          }
        } catch (error) {
          console.error('Error creating leave log:', error);
          alert('Failed to create leave log');
          return;
        }
      }
      
      // If this is a sick leave, also create a medical expense record
      if (leaveLogForm.type === 'sick' && medicalExpenseForm.receipt_name && medicalExpenseForm.amount !== '') {
        try {
          // First check budget constraints
          const expenseAmount = Number(medicalExpenseForm.amount);
          if (expenseAmount > 0) {
            // Get the current year from the receipt date
            const expenseYear = new Date(leaveLogForm.date).getFullYear();
            
            // First get the annual record for the user
            const records = await annualRecordService.getCurrentUserAnnualRecords();
            const currentYearRecord = records.find(record => record.year === expenseYear);
            
            if (currentYearRecord && currentYearRecord.quota_plan_id) {
              // Get the quota plan
              const quotaPlan = await quotaPlanService.getQuotaPlanById(currentYearRecord.quota_plan_id);
              
              if (quotaPlan) {
                // Validate the expense against the budget
                const validation = validateMedicalExpense(
                  quotaPlan.quota_medical_expense_baht,
                  currentYearRecord.used_medical_expense_baht,
                  expenseAmount
                );
                
                // If validation fails, show an error and prevent creating the medical expense
                if (!validation.isValid) {
                  alert(`Cannot add this medical expense: ${validation.message}\nYour pro-rated remaining budget is ฿${validation.remainingBefore.toFixed(0)}.`);
                  
                  // Ask if they want to continue with just the leave log
                  if (!window.confirm('Do you want to continue creating just the leave log without the medical expense?')) {
                    return; // Cancel the entire operation
                  }
                  
                  // If they continue, we'll create just the leave log but skip the medical expense
                  resetForms();
                  loadData();
                  return;
                }
              }
            }
          }
          
          // Set the leave_log_id to the newly created/updated leave log
          // Copy the note from the leave log to ensure both records have the same note
          const medicalExpenseData: CreateMedicalExpenseRequest = {
            user_id: currentUserId,
            amount: Number(medicalExpenseForm.amount),
            receipt_name: medicalExpenseForm.receipt_name,
            receipt_date: leaveLogForm.date,
            // Use the note from the leave log to keep them synchronized
            note: leaveLogForm.note || medicalExpenseForm.note,
            leave_log_id: updatedLeaveLog?.id || 0
          };
          
          console.log('Creating medical expense record:', medicalExpenseData);
          
          const newMedicalExpense = await medicalExpenseService.createMedicalExpense(medicalExpenseData);
          console.log('Medical expense created successfully:', newMedicalExpense);
          
          if (newMedicalExpense) {
            setMedicalExpenses(prev => [...prev, newMedicalExpense]);
          }
        } catch (error) {
          console.error('Error creating medical expense:', error);
          alert('Leave log was created but failed to create medical expense record');
        }
      }
      
      // Reset form and state
      setLeaveLogForm({
        user_id: currentUserId || 0,
        type: 'vacation',
        date: selectedDate ? safeFormat(selectedDate, 'yyyy-MM-dd') : '',
        note: '',
        worked_day: 1
      });
      
      setMedicalExpenseForm({
        receipt_date: selectedDate ? safeFormat(selectedDate, 'yyyy-MM-dd') : '',
        amount: '',
        receipt_name: '',
        note: '',
        user_id: 0,
        leave_log_id: 0
      });
      
      setEditingLeaveLog(null);
      setAddingLeaveLog(false);
    } catch (error) {
      console.error('Error submitting leave log:', error);
      alert('An error occurred while submitting the leave log');
    }
  };
  
  const handleEditLeaveLog = (log: LeaveLog) => {
    setEditingLeaveLog(log);
    
    // Check if the log date is a holiday
    const logDate = new Date(log.date);
    const holidayDesc = getHolidayReason(logDate, holidays);
    setHolidayReason(holidayDesc);
    
    const updatedLeaveLogForm = {
      user_id: log.user_id,
      type: log.type,
      date: safeFormat(logDate, 'yyyy-MM-dd'),
      note: log.note,
      worked_day: log.worked_day || 1 // Use the log's worked_day or default to 1
    };
    
    setLeaveLogForm(updatedLeaveLogForm);
    
    // If it's a vacation leave, check quota validation
    if (log.type === 'vacation') {
      checkLeaveQuotaValidation('vacation', log.worked_day || 1);
    } else {
      setLeaveQuotaValidation(null);
    }
    
    setAddingLeaveLog(true);
  };
  
  const handleDeleteLeaveLog = async (id: number) => {
    try {
      await leaveLogService.deleteLeaveLog(id);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error deleting leave log:', error);
    }
  };
  
  // Add an effect to initialize the leave quota validation
  useEffect(() => {
    // When the leave form changes or when adding a leave log
    if (addingLeaveLog && leaveLogForm.type === 'vacation') {
      checkLeaveQuotaValidation('vacation', leaveLogForm.worked_day || 1);
    }
  }, [addingLeaveLog, leaveLogForm.date, leaveLogForm.type]);
  
  // Update the resetForms function to also reset the leave quota validation
  const resetForms = () => {
    setAddingTaskLog(false);
    setAddingLeaveLog(false);
    setEditingTaskLog(null);
    setEditingLeaveLog(null);
    setLeaveQuotaValidation(null);
    
    // Get holiday status for the selected date
    const isHolidayDate = selectedDate ? isHoliday(selectedDate, holidays) : false;
    
    setTaskLogForm({
      task_id: 0,
      worked_day: 1,
      worked_date: selectedDate ? safeFormat(selectedDate, 'yyyy-MM-dd') : '',
      is_work_on_holiday: isHolidayDate
    });
    
    // Preserve the user_id from the current form
    setLeaveLogForm(prev => ({
      ...prev,
      user_id: currentUserId,
      type: 'vacation',
      date: selectedDate ? safeFormat(selectedDate, 'yyyy-MM-dd') : '',
      note: '',
      worked_day: 1
    }));
    
    // Reset medical expense form
    setMedicalExpenseForm({
      receipt_date: selectedDate ? safeFormat(selectedDate, 'yyyy-MM-dd') : '',
      amount: '',
      receipt_name: '',
      note: '',
      user_id: 0,
      leave_log_id: 0
    });
  };
  
  const handleClose = () => {
    resetForms();
    onClose();
  };
  
  // Function to render holiday status
  const renderHolidayStatus = () => {
    if (selectedDate) {
      const dateToCheck = addingTaskLog
        ? new Date(taskLogForm.worked_date)
        : addingLeaveLog
          ? new Date(leaveLogForm.date)
          : selectedDate;
      
      const isHolidayDate = isHoliday(dateToCheck, holidays);
      const reason = getHolidayReason(dateToCheck, holidays);
      
      if (isHolidayDate && reason) {
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Chip 
              label={`Holiday: ${reason}`}
              color={reason === 'Weekend' ? 'warning' : 'error'}
              sx={{ mr: 1 }}
            />
            <Tooltip title="This date is automatically marked as a holiday because it falls on a weekend or is defined in the holidays table">
              <InfoOutlined fontSize="small" color="action" />
            </Tooltip>
          </Box>
        );
      }
    }
    return null;
  };
  
  // Function to check if a date is fully booked
  const isDateFullyBooked = (date: Date): boolean => {
    if (!date) return false;
    
    const dateStr = safeFormat(date, 'yyyy-MM-dd');
    const taskLogsTotal = taskLogs
      .filter(log => isSameDay(log.worked_date, dateStr))
      .reduce((sum, log) => sum + log.worked_day, 0);
    
    const leaveLogsTotal = leaveLogs
      .filter(log => isSameDay(log.date, dateStr))
      .reduce((sum, log) => sum + (log.worked_day || 1), 0);
    
    const totalUsed = taskLogsTotal + leaveLogsTotal;
    return totalUsed >= 1.0;
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
    >
      <DialogTitle>
        {selectedDate ? (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Activity for {safeFormat(selectedDate, 'MMMM d, yyyy')}
            </Typography>
            <Box>
              {!addingTaskLog && !addingLeaveLog && (
                <>
                <Button 
                  startIcon={<AddCircleOutline />} 
                  color="primary"
                    sx={{ mr: 1 }}
                    onClick={() => setAddingTaskLog(true)}
                    disabled={selectedDate ? isDateFullyBooked(selectedDate) : false}
                    title={selectedDate && isDateFullyBooked(selectedDate) ? "No time remaining for this date" : ""}
                >
                  ADD TASK LOG
                </Button>
                <Button 
                  startIcon={<AddCircleOutline />} 
                  color="primary"
                    onClick={() => setAddingLeaveLog(true)}
                    disabled={selectedDate ? isDateFullyBooked(selectedDate) : false}
                    title={selectedDate && isDateFullyBooked(selectedDate) ? "No time remaining for this date" : ""}
                >
                  ADD LEAVE LOG
                </Button>
                </>
              )}
            </Box>
          </Box>
        ) : 'Logs'}
      </DialogTitle>
      
      <Divider />
      
      {/* Add time remaining indicator */}
      {selectedDate && !loading && !addingTaskLog && !addingLeaveLog && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1, 
          px: 3, 
          bgcolor: 'background.paper', 
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
        }}>
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 0.5 }}>
              Time allocation for {safeFormat(selectedDate, 'MMMM d, yyyy')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <TimeAllocationDisplay 
                selectedDate={selectedDate}
                taskLogs={taskLogs}
                leaveLogs={leaveLogs}
              />
      </Box>
          </Box>
          <RemainingTimeChip 
            selectedDate={selectedDate}
            taskLogs={taskLogs}
            leaveLogs={leaveLogs}
          />
        </Box>
      )}
      
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Combined Task Log Form */}
            {addingTaskLog && (
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="subtitle1">
                    {editingTaskLog ? 'Edit Task Log' : 'Add New Task Log'}
                  </Typography>
                  
                  {/* Display holiday status */}
                  {renderHolidayStatus()}
                  
                  <FormControl fullWidth>
                    <InputLabel id="task-select-label">Task</InputLabel>
                    <Select
                      labelId="task-select-label"
                    id="task-select"
                    value={taskLogForm.task_id || ''}
                      onChange={handleTaskSelectChange}
                    label="Task"
                    disabled={!!authError || !!editingTaskLog}
                    >
                      <MenuItem value={0} disabled>Select a task</MenuItem>
                      {tasks.map(task => (
                        <MenuItem key={task.id} value={task.id}>
                          {task.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                
                {/* Display task estimate information if available */}
                {taskEstimateInfo && (
                  <Box sx={{ mt: 1, mb: 2, p: 1, bgcolor: 'rgba(0, 0, 0, 0.04)', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Estimate:</strong> {taskEstimateInfo.estimateDay} days
                    </Typography>
                    {/* Add more estimate information here if needed */}
                  </Box>
                )}
                
                {/* Display time allocation information */}
                <Box sx={{ mb: 2, p: 1, bgcolor: 'rgba(0, 0, 0, 0.04)', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                    Time allocation for {safeFormat(new Date(taskLogForm.worked_date), 'MMM d, yyyy')}:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">
                      Task logs: {calculateTotalTimeForDate(taskLogForm.worked_date, editingTaskLog?.id).toFixed(2)} days
                    </Typography>
                    <Typography variant="body2" sx={{ mx: 1 }}>•</Typography>
                    <Typography variant="body2" fontWeight="bold" color={getRemainingTime(taskLogForm.worked_date, editingTaskLog?.id) > 0 ? 'success.main' : 'error.main'}>
                      Remaining: {getRemainingTime(taskLogForm.worked_date, editingTaskLog?.id).toFixed(2)} days
                    </Typography>
                  </Box>
                </Box>
                  
                  <TextField 
                    label="Worked Days"
                    name="worked_day"
                    type="number"
                    value={taskLogForm.worked_day}
                    onChange={handleTaskLogInputChange}
                    fullWidth
                  margin="normal"
                  inputProps={{ 
                    min: 0.1, 
                    max: getRemainingTime(taskLogForm.worked_date, editingTaskLog?.id) + (editingTaskLog?.worked_day || 0),
                    step: 0.1 
                  }}
                  helperText={`Enter number of days worked (max: ${(getRemainingTime(taskLogForm.worked_date, editingTaskLog?.id) + (editingTaskLog?.worked_day || 0)).toFixed(2)} days available)`}
                  disabled={!!authError}
                  color={
                    taskLogForm.worked_day > (getRemainingTime(taskLogForm.worked_date, editingTaskLog?.id) + (editingTaskLog?.worked_day || 0))
                      ? 'error'
                      : taskLogForm.worked_day >= 0.8 * (getRemainingTime(taskLogForm.worked_date, editingTaskLog?.id) + (editingTaskLog?.worked_day || 0))
                        ? 'warning'
                        : 'primary'
                  }
                  focused={
                    taskLogForm.worked_day > (getRemainingTime(taskLogForm.worked_date, editingTaskLog?.id) + (editingTaskLog?.worked_day || 0)) ||
                    taskLogForm.worked_day >= 0.8 * (getRemainingTime(taskLogForm.worked_date, editingTaskLog?.id) + (editingTaskLog?.worked_day || 0))
                  }
                  />
                  
                  <TextField
                    label="Date"
                    name="worked_date"
                    type="date"
                    value={taskLogForm.worked_date}
                    onChange={handleTaskLogInputChange}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  
                  {/* Holiday status is now read-only and automatically determined */}
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Work on Holiday: <strong>{taskLogForm.is_work_on_holiday ? 'Yes' : 'No'}</strong>
                      {taskLogForm.is_work_on_holiday && (
                        <Typography component="span" variant="body2" color="error.main" sx={{ ml: 1 }}>
                          (Automatically detected)
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                    <Button onClick={() => {
                      setAddingTaskLog(false);
                      setEditingTaskLog(null);
                    }}>
                      Cancel
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={handleSubmitTaskLog}
                      disabled={!taskLogForm.task_id || taskLogForm.worked_day <= 0}
                    >
                      {editingTaskLog ? 'Update' : 'Add'} Task Log
                    </Button>
                  </Box>
                </Box>
            )}
            
            {/* Combined Leave Log Form */}
            {addingLeaveLog && (
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="subtitle1">
                    {editingLeaveLog ? 'Edit Leave Log' : 'Add New Leave Log'}
                  </Typography>
                  
                  {/* Display holiday status */}
                  {renderHolidayStatus()}
                
                {/* Display time allocation information */}
                <Box sx={{ mb: 2, p: 1, bgcolor: 'rgba(0, 0, 0, 0.04)', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                    Time allocation for {safeFormat(new Date(leaveLogForm.date), 'MMM d, yyyy')}:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">
                      Task logs: {calculateTotalTimeForDate(leaveLogForm.date, undefined).toFixed(2)} days
                    </Typography>
                    <Typography variant="body2" sx={{ mx: 1 }}>•</Typography>
                    <Typography variant="body2" fontWeight="bold" color={getRemainingTime(leaveLogForm.date, editingLeaveLog?.id) > 0 ? 'success.main' : 'error.main'}>
                      Remaining: {getRemainingTime(leaveLogForm.date, editingLeaveLog?.id).toFixed(2)} days
                    </Typography>
                  </Box>
                </Box>
                  
                  <FormControl fullWidth>
                    <InputLabel id="leave-type-label">Leave Type</InputLabel>
                    <Select
                      labelId="leave-type-label"
                      name="type"
                      value={leaveLogForm.type}
                      label="Leave Type"
                      onChange={handleLeaveTypeChange}
                    >
                      {leaveTypes.map(type => (
                        <MenuItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)} Leave
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <TextField
                    label="Date"
                    name="date"
                    type="date"
                    value={leaveLogForm.date}
                    onChange={handleLeaveLogInputChange}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  
                  <TextField
                    label="Note"
                    name="note"
                    value={leaveLogForm.note}
                    onChange={handleLeaveLogInputChange}
                    fullWidth
                    multiline
                  rows={2}
                />
                
                <TextField
                  label="Leave Days"
                  name="worked_day"
                  type="number"
                  value={leaveLogForm.worked_day}
                  onChange={handleLeaveLogInputChange}
                  fullWidth
                  margin="normal"
                  inputProps={{ 
                    min: 0.1, 
                    max: getRemainingTime(leaveLogForm.date, editingLeaveLog?.id) + (editingLeaveLog?.worked_day || 0),
                    step: 0.1 
                  }}
                  helperText={`Enter days of leave (max: ${(getRemainingTime(leaveLogForm.date, editingLeaveLog?.id) + (editingLeaveLog?.worked_day || 0)).toFixed(2)} days available)`}
                  color={
                    leaveLogForm.worked_day > (getRemainingTime(leaveLogForm.date, editingLeaveLog?.id) + (editingLeaveLog?.worked_day || 0))
                      ? 'error'
                      : leaveLogForm.worked_day >= 0.8 * (getRemainingTime(leaveLogForm.date, editingLeaveLog?.id) + (editingLeaveLog?.worked_day || 0))
                        ? 'warning'
                        : 'primary'
                  }
                  focused={
                    leaveLogForm.worked_day > (getRemainingTime(leaveLogForm.date, editingLeaveLog?.id) + (editingLeaveLog?.worked_day || 0)) ||
                    leaveLogForm.worked_day >= 0.8 * (getRemainingTime(leaveLogForm.date, editingLeaveLog?.id) + (editingLeaveLog?.worked_day || 0))
                  }
                />
                
                {/* Add medical expense fields when sick leave is selected */}
                {leaveLogForm.type === 'sick' && (
                  <Box sx={{ 
                    mt: 3, 
                    p: 2, 
                    bgcolor: 'rgba(249, 249, 249, 0.9)', 
                    borderRadius: 1,
                    border: '1px solid rgba(0, 0, 0, 0.12)'
                  }}>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                      Medical Expense Information
                    </Typography>
                    
                    <TextField
                      label="Receipt Name"
                      name="receipt_name"
                      value={medicalExpenseForm.receipt_name}
                      onChange={handleMedicalExpenseInputChange}
                      fullWidth
                      margin="normal"
                      placeholder="Enter receipt name or description"
                    />
                    
                    <TextField
                      label="Amount (THB)"
                      name="amount"
                      type="number"
                      value={medicalExpenseForm.amount}
                      onChange={handleMedicalExpenseInputChange}
                      fullWidth
                      margin="normal"
                      inputProps={{ 
                        min: 0,
                        step: 1
                      }}
                      placeholder="Enter amount in Thai Baht"
                    />
                    
                    <Box sx={{ 
                      mt: 2, 
                      p: 1.5, 
                      borderLeft: '4px solid #2196f3', 
                      bgcolor: 'rgba(33, 150, 243, 0.08)',
                      borderRadius: '0 4px 4px 0'
                    }}>
                      <Typography variant="body2" color="info.main">
                        <strong>Note:</strong> The note you entered above for the leave log will be automatically used for the medical expense record as well.
                      </Typography>
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                      A medical expense record will be created automatically when you save this sick leave.
                    </Typography>
                  </Box>
                )}
                  
                  {leaveLogForm.type === 'vacation' && leaveQuotaValidation && (
                    <Box sx={{ 
                      mt: 2, 
                      p: 2, 
                      bgcolor: leaveQuotaValidation.isValid ? 'rgba(76, 175, 80, 0.08)' : 'rgba(244, 67, 54, 0.08)', 
                      borderRadius: 1,
                      borderLeft: leaveQuotaValidation.isValid ? '4px solid #4caf50' : '4px solid #f44336'
                    }}>
                      <Typography 
                        variant="body2" 
                        color={leaveQuotaValidation.isValid ? 'success.main' : 'error.main'}
                        sx={{ fontWeight: 'medium' }}
                      >
                        {leaveQuotaValidation.message}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Your remaining leave quota: <strong>{leaveQuotaValidation.remainingBefore.toFixed(1)} days</strong>
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                    <Button onClick={() => {
                      setAddingLeaveLog(false);
                      setEditingLeaveLog(null);
                    }}>
                      Cancel
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={handleSubmitLeaveLog}
                      disabled={
                        !leaveLogForm.date || 
                        (leaveLogForm.type === 'sick' && (!medicalExpenseForm.receipt_name || medicalExpenseForm.amount === '')) ||
                        (leaveLogForm.type === 'vacation' && leaveQuotaValidation ? !leaveQuotaValidation.isValid : false)
                      }
                    >
                      {editingLeaveLog ? 'Update' : 'Add'} Leave Log
                    </Button>
                  </Box>
                </Box>
            )}
            
            {/* Combined Activity List */}
            {!addingTaskLog && !addingLeaveLog && (
                <>
                {taskLogs.length > 0 || leaveLogs.length > 0 || medicalExpenses.length > 0 ? (
                    <List>
                    {/* Task Logs */}
                    {taskLogs.map((log) => (
                      <ListItem key={`task-${log.id}`} divider>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Chip label="Task" color="primary" size="small" sx={{ mr: 1 }} />
                              {(() => {
                                try {
                                  return log.task_title || `Task ID: ${log.task_id}`;
                                } catch (err) {
                                  console.error(`Error formatting task log title:`, err, log);
                                  return 'Invalid task';
                                }
                              })()}
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" component="span">
                                {(() => {
                                  try {
                                    return safeFormat(new Date(log.worked_date), 'MMM d, yyyy');
                                  } catch (err) {
                                    console.error(`Error formatting task log date:`, err, log);
                                    return 'Invalid date';
                                  }
                                })()}
                              </Typography>
                              <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                                {log.worked_day} day{log.worked_day !== 1 ? 's' : ''}
                              </Typography>
                              {log.is_work_on_holiday && (
                                <Typography variant="body2" color="error" component="span" sx={{ ml: 2 }}>
                                  Holiday Work
                                </Typography>
                              )}
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" onClick={() => handleEditTaskLog(log)}>
                            <EditOutlined />
                          </IconButton>
                          <IconButton edge="end" onClick={() => handleDeleteTaskLog(log.id)}>
                            <DeleteOutline />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                    
                    {/* Leave Logs */}
                      {leaveLogs.map((log) => (
                      <ListItem key={`leave-${log.id}`} divider>
                          <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Chip 
                                label="Leave" 
                                color="secondary" 
                                size="small" 
                                sx={{ mr: 1 }} 
                              />
                              {(() => {
                                try {
                                  return `${log.type.charAt(0).toUpperCase() + log.type.slice(1)} Leave`;
                                } catch (err) {
                                  console.error(`Error formatting leave log type:`, err, log);
                                  return 'Invalid leave type';
                                }
                              })()}
                            </Box>
                          }
                            secondary={
                              <>
                                <Typography variant="body2" component="span">
                                  {(() => {
                                    try {
                                      return safeFormat(new Date(log.date), 'MMM d, yyyy');
                                    } catch (err) {
                                      console.error(`Error formatting leave log date:`, err, log);
                                      return 'Invalid date';
                                    }
                                  })()}
                                </Typography>
                              <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                                {log.worked_day || 1} day{(log.worked_day || 1) !== 1 ? 's' : ''}
                                </Typography>
                                {log.note && (
                                <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
                                  Note: {log.note}
                                  </Typography>
                                )}
                              </>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" onClick={() => handleEditLeaveLog(log)}>
                              <EditOutlined />
                            </IconButton>
                            <IconButton edge="end" onClick={() => handleDeleteLeaveLog(log.id)}>
                              <DeleteOutline />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    
                    {/* Medical Expenses */}
                    {medicalExpenses.map((expense) => (
                      <ListItem key={`medical-${expense.id}`} divider>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Chip 
                                label="Medical" 
                                color="info" 
                                size="small" 
                                sx={{ mr: 1 }} 
                              />
                              {expense.receipt_name || 'Medical Expense'}
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" component="span">
                                {safeFormat(new Date(expense.receipt_date), 'MMM d, yyyy')}
                              </Typography>
                              <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                                {expense.amount} ฿
                              </Typography>
                              {expense.note && (
                                <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
                                  Note: {expense.note}
                                </Typography>
                              )}
                            </>
                          }
                        />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary">
                      No activity logs for this date. Add an activity to get started!
                      </Typography>
                    <Box sx={{ mt: 2 }}>
                        <Button
                          variant="outlined"
                          startIcon={<AddCircleOutline />}
                        sx={{ mr: 1 }}
                        onClick={() => setAddingTaskLog(true)}
                        disabled={selectedDate ? isDateFullyBooked(selectedDate) : false}
                        title={selectedDate && isDateFullyBooked(selectedDate) ? "No time remaining for this date" : ""}
                      >
                        ADD TASK LOG
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<AddCircleOutline />}
                        onClick={() => setAddingLeaveLog(true)}
                        disabled={selectedDate ? isDateFullyBooked(selectedDate) : false}
                        title={selectedDate && isDateFullyBooked(selectedDate) ? "No time remaining for this date" : ""}
                        >
                          ADD LEAVE LOG
                        </Button>
                    </Box>
                    </Box>
                  )}
                </>
              )}
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DateLogsDialog; 