import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  SelectChangeEvent,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import MainLayout from '../components/Layout';
import { userService, leaveLogService } from '../api';
import { LeaveLog, CreateLeaveLogRequest, UpdateLeaveLogRequest } from '../api/leaveLogService';
import { User } from '../api/userService';
import { useAuth } from '../contexts/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO } from 'date-fns';

const LeaveLogsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.user_type === 'admin';
  
  // State for data
  const [leaveLogs, setLeaveLogs] = useState<LeaveLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // State for filtering
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedType, setSelectedType] = useState<string>('');
  
  // State for sorting
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // State for dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentLeaveLog, setCurrentLeaveLog] = useState<LeaveLog | null>(null);
  
  // Available leave types
  const leaveTypes = [
    { value: 'vacation', label: 'Vacation' },
    { value: 'sick', label: 'Sick Leave' }
  ];
  
  // State for form
  const initialFormState: CreateLeaveLogRequest = {
    user_id: user?.id || 0,
    type: 'vacation',
    date: format(new Date(), 'yyyy-MM-dd'),
    note: ''
  };
  
  const [formData, setFormData] = useState<CreateLeaveLogRequest | UpdateLeaveLogRequest>(initialFormState);
  
  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Load users for admin view
      if (isAdmin) {
        try {
          const usersData = await userService.getAllUsers();
          if (Array.isArray(usersData) && usersData.length > 0) {
            setUsers(usersData);
          } else {
            console.warn('Received empty users data or non-array');
          }
        } catch (userError) {
          console.error('Error fetching users:', userError);
        }
      }
      
      // Fetch leave logs
      let leaveLogsData: LeaveLog[] = [];
      
      try {
        if (isAdmin && selectedUserId > 0) {
          // Admin viewing a specific user's leave logs
          leaveLogsData = await leaveLogService.getAllLeaveLogs(
            selectedUserId,
            selectedYear > 0 ? selectedYear : undefined
          );
        } else if (isAdmin) {
          // Admin viewing all leave logs
          leaveLogsData = await leaveLogService.getAllLeaveLogs(
            undefined,
            selectedYear > 0 ? selectedYear : undefined
          );
        } else {
          // Regular user viewing their own leave logs
          leaveLogsData = await leaveLogService.getCurrentUserLeaveLogs(
            selectedYear > 0 ? selectedYear : undefined,
            selectedType || undefined
          );
        }
      } catch (logsError) {
        console.error('Error fetching leave logs:', logsError);
      }
      
      // Validate and process the data
      if (Array.isArray(leaveLogsData)) {
        // Filter by type if selected
        if (selectedType && isAdmin) {
          leaveLogsData = leaveLogsData.filter(log => log.type === selectedType);
        }
        
        // Sort the data
        leaveLogsData.sort((a, b) => {
          let aValue: any = a[sortField as keyof LeaveLog];
          let bValue: any = b[sortField as keyof LeaveLog];
          
          if (sortField === 'date') {
            aValue = new Date(a.date).getTime();
            bValue = new Date(b.date).getTime();
          } else if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }
          
          if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
        
        setLeaveLogs(leaveLogsData);
      } else {
        console.warn('Received non-array leave logs data');
        setLeaveLogs([]);
      }
      
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [selectedUserId, selectedYear, selectedType, sortField, sortDirection]);
  
  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(prevDirection => (prevDirection === 'asc' ? 'desc' : 'asc'));
    } else {
      // Set new field and default to descending for dates, ascending for text
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };
  
  const handleOpenDialog = (leaveLog?: LeaveLog, isViewOnly: boolean = false) => {
    setViewMode(isViewOnly);
    
    if (leaveLog) {
      setCurrentLeaveLog(leaveLog);
      setFormData({
        type: leaveLog.type,
        date: leaveLog.date,
        note: leaveLog.note || ''
      });
    } else {
      setCurrentLeaveLog(null);
      setFormData({
        user_id: isAdmin ? selectedUserId : (user?.id || 0),
        type: 'vacation',
        date: format(new Date(), 'yyyy-MM-dd'),
        note: ''
      });
    }
    
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setViewMode(false);
    setCurrentLeaveLog(null);
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (!name) return;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle select changes for form fields
  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    
    setFormData(prev => ({
      ...prev,
      [name as string]: value
    }));
  };
  
  // Handle date change from date picker
  const handleDateChange = (date: Date | null) => {
    if (!date) return;
    
    setFormData(prev => ({
      ...prev,
      date: format(date, 'yyyy-MM-dd')
    }));
  };
  
  // Handle user selection change (admin)
  const handleUserChange = (event: SelectChangeEvent<string>) => {
    setSelectedUserId(Number(event.target.value));
  };
  
  // Handle year selection change
  const handleYearChange = (event: SelectChangeEvent<string>) => {
    setSelectedYear(Number(event.target.value));
  };
  
  // Handle type selection change
  const handleTypeChange = (event: SelectChangeEvent<string>) => {
    setSelectedType(event.target.value);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (currentLeaveLog) {
        // Update existing leave log
        await leaveLogService.updateLeaveLog(
          currentLeaveLog.id,
          formData as UpdateLeaveLogRequest
        );
        setSuccess('Leave log updated successfully');
      } else {
        // Create new leave log
        await leaveLogService.createLeaveLog(
          formData as CreateLeaveLogRequest
        );
        setSuccess('Leave log created successfully');
      }
      
      handleCloseDialog();
      fetchData();
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.response?.data?.error || 'Failed to save leave log');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle leave log deletion
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this leave log?')) {
      return;
    }
    
    try {
      setLoading(true);
      await leaveLogService.deleteLeaveLog(id);
      setSuccess('Leave log deleted successfully');
      fetchData();
    } catch (err: any) {
      console.error('Error deleting leave log:', err);
      setError(err.response?.data?.error || 'Failed to delete leave log');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate years for dropdown
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  };
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };
  
  // Get leave type label
  const getLeaveTypeLabel = (type: string): string => {
    const foundType = leaveTypes.find(t => t.value === type);
    return foundType ? foundType.label : type;
  };
  
  return (
    <MainLayout>
      <Box sx={{ width: '100%', p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Leave Logs
        </Typography>
        
        {/* Notifications */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}
        
        {/* Filter Controls */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {isAdmin && (
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="user-select-label">User</InputLabel>
              <Select
                labelId="user-select-label"
                id="user-select"
                value={selectedUserId.toString()}
                label="User"
                onChange={handleUserChange}
              >
                <MenuItem value="0">All Users</MenuItem>
                {users.map(user => (
                  <MenuItem key={user.id} value={user.id.toString()}>
                    {user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="year-select-label">Year</InputLabel>
            <Select
              labelId="year-select-label"
              id="year-select"
              value={selectedYear.toString()}
              label="Year"
              onChange={handleYearChange}
            >
              <MenuItem value="0">All Years</MenuItem>
              {getYearOptions().map(year => (
                <MenuItem key={year} value={year.toString()}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel id="type-select-label">Leave Type</InputLabel>
            <Select
              labelId="type-select-label"
              id="type-select"
              value={selectedType}
              label="Leave Type"
              onChange={handleTypeChange}
            >
              <MenuItem value="">All Types</MenuItem>
              {leaveTypes.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ ml: 'auto' }}
          >
            Add New Leave
          </Button>
        </Box>
        
        {/* Leave Logs Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('id')}>
                    ID
                    {sortField === 'id' && (
                      <SortIcon fontSize="small" sx={{ ml: 0.5, transform: sortDirection === 'desc' ? 'rotate(180deg)' : 'none' }} />
                    )}
                  </Box>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('username')}>
                      User
                      {sortField === 'username' && (
                        <SortIcon fontSize="small" sx={{ ml: 0.5, transform: sortDirection === 'desc' ? 'rotate(180deg)' : 'none' }} />
                      )}
                    </Box>
                  </TableCell>
                )}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('type')}>
                    Leave Type
                    {sortField === 'type' && (
                      <SortIcon fontSize="small" sx={{ ml: 0.5, transform: sortDirection === 'desc' ? 'rotate(180deg)' : 'none' }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('date')}>
                    Date
                    {sortField === 'date' && (
                      <SortIcon fontSize="small" sx={{ ml: 0.5, transform: sortDirection === 'desc' ? 'rotate(180deg)' : 'none' }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell>Note</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : leaveLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} align="center">
                    No leave logs found
                  </TableCell>
                </TableRow>
              ) : (
                leaveLogs.map(leaveLog => (
                  <TableRow key={leaveLog.id}>
                    <TableCell>{leaveLog.id}</TableCell>
                    {isAdmin && (
                      <TableCell>{leaveLog.username}</TableCell>
                    )}
                    <TableCell>{getLeaveTypeLabel(leaveLog.type)}</TableCell>
                    <TableCell>{formatDate(leaveLog.date)}</TableCell>
                    <TableCell>
                      {leaveLog.note && leaveLog.note.length > 30
                        ? `${leaveLog.note.substring(0, 30)}...`
                        : leaveLog.note}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenDialog(leaveLog, true)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => handleOpenDialog(leaveLog)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(leaveLog.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {viewMode
              ? 'View Leave Log'
              : currentLeaveLog
              ? 'Edit Leave Log'
              : 'Add New Leave Log'}
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {isAdmin && !currentLeaveLog && (
                <FormControl fullWidth>
                  <InputLabel id="form-user-select-label">User</InputLabel>
                  <Select
                    labelId="form-user-select-label"
                    id="form-user-select"
                    name="user_id"
                    value={(formData as CreateLeaveLogRequest).user_id?.toString() || ''}
                    label="User"
                    onChange={handleSelectChange}
                    disabled={viewMode}
                  >
                    {users.map(user => (
                      <MenuItem key={user.id} value={user.id.toString()}>
                        {user.username}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              <FormControl fullWidth>
                <InputLabel id="form-type-select-label">Leave Type</InputLabel>
                <Select
                  labelId="form-type-select-label"
                  id="form-type-select"
                  name="type"
                  value={formData.type}
                  label="Leave Type"
                  onChange={handleSelectChange}
                  disabled={viewMode}
                >
                  {leaveTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date"
                  value={formData.date ? parseISO(formData.date) : null}
                  onChange={handleDateChange}
                  disabled={viewMode}
                />
              </LocalizationProvider>
              
              <TextField
                label="Note"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={3}
                disabled={viewMode}
              />
            </Box>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              {viewMode ? 'Close' : 'Cancel'}
            </Button>
            {!viewMode && (
              <Button
                onClick={handleSubmit}
                variant="contained"
                color="primary"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Save'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
};

export default LeaveLogsPage; 