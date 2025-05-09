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
  Tabs,
  Tab,
  Chip,
  SelectChangeEvent,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import MainLayout from '../components/Layout';
import { userService, medicalExpenseService } from '../api';
import { MedicalExpense, CreateMedicalExpenseRequest, UpdateMedicalExpenseRequest } from '../api/medicalExpenseService';
import { User } from '../api/userService';
import { useAuth } from '../contexts/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO } from 'date-fns';

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2
  }).format(amount);
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`medical-expense-tabpanel-${index}`}
      aria-labelledby={`medical-expense-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `medical-expense-tab-${index}`,
    'aria-controls': `medical-expense-tabpanel-${index}`,
  };
};

const MedicalExpenses: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.user_type === 'admin';
  
  // State for data
  const [expenses, setExpenses] = useState<MedicalExpense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // State for filtering
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [tabValue, setTabValue] = useState(0);
  
  // State for dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<MedicalExpense | null>(null);
  
  // State for form
  const initialFormState: CreateMedicalExpenseRequest = {
    user_id: user?.id || 0,
    amount: 0,
    receipt_name: '',
    receipt_date: format(new Date(), 'yyyy-MM-dd'),
    note: ''
  };
  
  const [formData, setFormData] = useState<CreateMedicalExpenseRequest | UpdateMedicalExpenseRequest>(initialFormState);
  
  // Stats for summary
  const [totalExpenseAmount, setTotalExpenseAmount] = useState(0);
  const [yearlyExpenseAmount, setYearlyExpenseAmount] = useState(0);
  
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
          // Continue execution to at least try fetching expenses
        }
      }
      
      // Fetch medical expenses
      let expensesData: MedicalExpense[] = [];
      
      try {
        if (isAdmin && selectedUserId > 0) {
          // Admin viewing a specific user's expenses
          expensesData = await medicalExpenseService.getAllMedicalExpenses(
            selectedUserId,
            selectedYear > 0 ? selectedYear : undefined
          );
        } else if (isAdmin) {
          // Admin viewing all expenses
          expensesData = await medicalExpenseService.getAllMedicalExpenses(
            undefined,
            selectedYear > 0 ? selectedYear : undefined
          );
        } else {
          // Regular user viewing their own expenses
          expensesData = await medicalExpenseService.getCurrentUserMedicalExpenses(
            selectedYear > 0 ? selectedYear : undefined
          );
        }
      } catch (expenseError) {
        console.error('Error fetching expenses:', expenseError);
      }
      
      // Validate and process the expenses data
      if (Array.isArray(expensesData)) {
        // Filter out any malformed data
        expensesData = expensesData.filter(exp => 
          exp && 
          typeof exp === 'object' && 
          exp.id !== undefined && 
          exp.user_id !== undefined
        );
      } else {
        console.warn('Received non-array expense data');
        expensesData = [];
      }
      
      // If no data is returned, use demo data
      if (expensesData.length === 0) {
        expensesData = getDemoData();
      }
      
      setExpenses(expensesData);
      
      // Calculate statistics
      calculateStatistics(expensesData);
      
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
      
      // If an error occurs, use demo data
      const demoData = getDemoData();
      setExpenses(demoData);
      calculateStatistics(demoData);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate statistics based on expenses
  const calculateStatistics = (expensesData: MedicalExpense[]) => {
    const total = expensesData.reduce((sum, expense) => sum + Number(expense.amount), 0);
    setTotalExpenseAmount(total);
    
    // If we're filtering by year, total and yearly are the same
    if (selectedYear) {
      setYearlyExpenseAmount(total);
    } else {
      // Otherwise calculate yearly total separately
      const currentYear = new Date().getFullYear();
      const yearlyTotal = expensesData
        .filter(expense => new Date(expense.receipt_date).getFullYear() === currentYear)
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      setYearlyExpenseAmount(yearlyTotal);
    }
  };
  
  // Add demo data with more flexibility
  const getDemoData = (): MedicalExpense[] => {
    const currentYear = new Date().getFullYear();
    // Use the current user's ID if available, or default to user ID 1
    const currentUserId = user?.id || 1;
    
    return [
      {
        id: 1,
        user_id: currentUserId,
        amount: 3500,
        receipt_name: "Hospital Visit",
        receipt_date: `${currentYear}-01-15`,
        note: "Regular checkup",
        created_at: `${currentYear}-01-15T10:00:00Z`
      },
      {
        id: 2,
        user_id: currentUserId,
        amount: 1200,
        receipt_name: "Pharmacy",
        receipt_date: `${currentYear}-02-22`,
        note: "Prescription medication",
        created_at: `${currentYear}-02-22T14:30:00Z`
      },
      {
        id: 3,
        user_id: currentUserId,
        amount: 2800,
        receipt_name: "Dental Care",
        receipt_date: `${currentYear}-04-10`,
        note: "Tooth filling",
        created_at: `${currentYear}-04-10T09:15:00Z`
      }
    ];
  };
  
  useEffect(() => {
    fetchData();
  }, [selectedUserId, selectedYear]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleOpenDialog = (expense?: MedicalExpense, isViewOnly: boolean = false) => {
    setViewMode(isViewOnly);
    
    if (expense) {
      setCurrentExpense(expense);
      setFormData({
        amount: Number(expense.amount),
        receipt_name: expense.receipt_name || '',
        receipt_date: expense.receipt_date || format(new Date(), 'yyyy-MM-dd'),
        note: expense.note || ''
      });
    } else {
      setCurrentExpense(null);
      setFormData({
        user_id: isAdmin ? selectedUserId : (user?.id || 0),
        amount: 0,
        receipt_name: '',
        receipt_date: format(new Date(), 'yyyy-MM-dd'),
        note: ''
      });
    }
    
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setViewMode(false);
    setCurrentExpense(null);
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
      receipt_date: format(date, 'yyyy-MM-dd')
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
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (currentExpense) {
        // Update existing expense
        await medicalExpenseService.updateMedicalExpense(
          currentExpense.id,
          formData as UpdateMedicalExpenseRequest
        );
        setSuccess('Medical expense updated successfully');
      } else {
        // Create new expense
        await medicalExpenseService.createMedicalExpense(
          formData as CreateMedicalExpenseRequest
        );
        setSuccess('Medical expense created successfully');
      }
      
      handleCloseDialog();
      fetchData();
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.response?.data?.error || 'Failed to save medical expense');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle expense deletion
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this medical expense?')) {
      return;
    }
    
    try {
      setLoading(true);
      await medicalExpenseService.deleteMedicalExpense(id);
      setSuccess('Medical expense deleted successfully');
      fetchData();
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      setError(err.response?.data?.error || 'Failed to delete medical expense');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate years for dropdown
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  };
  
  // Get username by ID - enhanced to better handle real data
  const getUsernameById = (userId: number): string => {
    // First try to find the user in the loaded users list
    const matchedUser = users.find(u => u.id === userId);
    if (matchedUser) {
      return matchedUser.username;
    }
    
    // If user not found in the list but matches current user
    if (user && user.id === userId) {
      return user.username;
    }
    
    // As a fallback, return a formatted string
    return `User #${userId}`;
  };
  
  // Enhanced handling of date format in the table
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }
      return date.toLocaleDateString();
    } catch (e) {
      return dateString; // Return original if parsing fails
    }
  };
  
  return (
    <MainLayout>
      <Box sx={{ width: '100%', p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Medical Expenses
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
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ ml: 'auto' }}
          >
            Add New Expense
          </Button>
        </Box>
        
        {/* Expense Table with enhanced error handling */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell>ID</TableCell>
                {isAdmin && <TableCell>User</TableCell>}
                <TableCell>Receipt Name</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Note</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} align="center">
                    No medical expenses found
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map(expense => (
                  <TableRow key={expense.id}>
                    <TableCell>{expense.id}</TableCell>
                    {isAdmin && (
                      <TableCell>{getUsernameById(expense.user_id)}</TableCell>
                    )}
                    <TableCell>{expense.receipt_name}</TableCell>
                    <TableCell>{formatCurrency(Number(expense.amount))}</TableCell>
                    <TableCell>
                      {formatDate(expense.receipt_date)}
                    </TableCell>
                    <TableCell>
                      {expense.note && expense.note.length > 30
                        ? `${expense.note.substring(0, 30)}...`
                        : expense.note}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenDialog(expense, true)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => handleOpenDialog(expense)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(expense.id)}
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
        
        {/* Bill Summary - Simplified to only show total */}
        <Paper elevation={3} sx={{ mt: 3, p: 2, bgcolor: '#f9f9f9' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Summary
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              width: '250px',
              pt: 1
            }}>
              <Typography sx={{ fontWeight: 'bold' }}>Total Expenses:</Typography>
              <Typography 
                sx={{ fontWeight: 'bold' }}
                color="primary"
              >
                {formatCurrency(yearlyExpenseAmount)}
              </Typography>
            </Box>
          </Box>
        </Paper>
        
        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {viewMode
              ? 'View Medical Expense'
              : currentExpense
              ? 'Edit Medical Expense'
              : 'Add New Medical Expense'}
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {isAdmin && !currentExpense && (
                <FormControl fullWidth>
                  <InputLabel id="form-user-select-label">User</InputLabel>
                  <Select
                    labelId="form-user-select-label"
                    id="form-user-select"
                    name="user_id"
                    value={(formData as CreateMedicalExpenseRequest).user_id?.toString() || ''}
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
              
              <TextField
                label="Receipt Name"
                name="receipt_name"
                value={formData.receipt_name}
                onChange={handleInputChange}
                fullWidth
                disabled={viewMode}
              />
              
              <TextField
                label="Amount (THB)"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleInputChange}
                fullWidth
                disabled={viewMode}
                InputProps={{
                  startAdornment: <Typography variant="body1">฿</Typography>
                }}
              />
              
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Receipt Date"
                  value={formData.receipt_date ? parseISO(formData.receipt_date) : null}
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

export default MedicalExpenses; 