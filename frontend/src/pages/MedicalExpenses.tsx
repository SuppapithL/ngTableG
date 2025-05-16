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
  Grid,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import MainLayout from '../components/Layout/MainLayout';
import { userService, medicalExpenseService, annualRecordService, quotaPlanService } from '../api';
import { MedicalExpense, MedicalExpenseResponse, CreateMedicalExpenseRequest, UpdateMedicalExpenseRequest } from '../api/medicalExpenseService';
import { User } from '../api/userService';
import { useAuth } from '../contexts/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO } from 'date-fns';
import { AnnualRecord } from '../api/annualRecordService';
import { QuotaPlan } from '../api/quotaPlanService';
import { validateMedicalExpense } from '../utils/budgetUtils';

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
  
  // Define the form data interface
  interface MedicalExpenseFormData {
    user_id: number;
    amount: number | string;
    receipt_name: string;
    receipt_date: string;
    note: string;
  }
  
  // State for data
  const [expenses, setExpenses] = useState<MedicalExpense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  
  // State for filtering
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [tabValue, setTabValue] = useState(0);
  
  // State for dialog
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<boolean>(false);
  const [currentExpense, setCurrentExpense] = useState<MedicalExpense | null>(null);
  
  // State for form
  const initialFormState: MedicalExpenseFormData = {
    user_id: user?.id || 0,
    amount: 0,
    receipt_name: '',
    receipt_date: format(new Date(), 'yyyy-MM-dd'),
    note: ''
  };
  
  const [formData, setFormData] = useState<MedicalExpenseFormData>(initialFormState);
  
  // Stats for summary
  const [totalExpenseAmount, setTotalExpenseAmount] = useState(0);
  const [yearlyExpenseAmount, setYearlyExpenseAmount] = useState(0);
  
  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    console.log('------ Starting fetchData for MedicalExpenses component ------');
    
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
        console.log('Fetching medical expenses with params:', {
          isAdmin,
          selectedUserId,
          selectedYear
        });
        
        // For now, just use the getCurrentUserMedicalExpenses endpoint 
        // Increase limit to make sure we get all records
        const rawData = await medicalExpenseService.getCurrentUserMedicalExpenses(
          selectedYear > 0 ? selectedYear : undefined,
          100,  // Increased limit
          0
        );
        
        console.log('Fetched medical expenses data (raw):', rawData);
        
        // Map the data to match our frontend model
        // The backend uses camelCase for JSON field names, but our frontend model uses snake_case
        expensesData = rawData.map(item => {
          const expense: MedicalExpense = {
            id: item.id,
            user_id: item.userId,
            amount: typeof item.amount === 'number' 
              ? item.amount 
              : (item.amount && typeof item.amount === 'object' 
                ? parseFloat(item.amount.toString() || '0') 
                : 0),
            receipt_name: typeof item.receiptName === 'string'
              ? item.receiptName
              : (item.receiptName && typeof item.receiptName === 'object' && 'string' in item.receiptName
                ? (item.receiptName.string || '')
                : ''),
            receipt_date: typeof item.receiptDate === 'string'
              ? item.receiptDate
              : (item.receiptDate && typeof item.receiptDate === 'object' && 'time' in item.receiptDate
                ? (item.receiptDate.time ? item.receiptDate.time.split('T')[0] : '')
                : ''),
            note: typeof item.note === 'string'
              ? item.note
              : (item.note && typeof item.note === 'object' && 'string' in item.note
                ? (item.note.string || '')
                : ''),
            created_at: typeof item.createdAt === 'string'
              ? item.createdAt
              : new Date().toISOString()
          };
          return expense;
        });
        
        console.log('Fetched medical expenses data (mapped):', {
          count: expensesData.length,
          sample: expensesData.length > 0 ? expensesData[0] : 'No data'
        });
        
        // Validate and check format
        if (expensesData.length > 0) {
          const sampleExpense = expensesData[0];
          console.log('Medical expense field check:', {
            hasId: 'id' in sampleExpense,
            hasUserId: 'user_id' in sampleExpense,
            hasAmount: 'amount' in sampleExpense,
            hasReceiptName: 'receipt_name' in sampleExpense
          });
        }
      } catch (expenseError) {
        console.error('Error fetching expenses:', expenseError);
        setError('Failed to fetch medical expenses. Please try again.');
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
        
        setExpenses(expensesData);
        
        // Calculate statistics
        calculateStatistics(expensesData);
      } else {
        console.warn('Received non-array expense data');
        setExpenses([]);
        setTotalExpenseAmount(0);
        setYearlyExpenseAmount(0);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
      setExpenses([]);
      setTotalExpenseAmount(0);
      setYearlyExpenseAmount(0);
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
  
  useEffect(() => {
    fetchData();
  }, [selectedUserId, selectedYear]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleOpenDialog = (expense?: MedicalExpense, isViewOnly: boolean = false) => {
    setViewMode(isViewOnly);
    
    if (expense) {
      // Edit existing expense
      setCurrentExpense(expense);
      setFormData({
        user_id: expense.user_id,
        amount: expense.amount,
        receipt_name: expense.receipt_name,
        receipt_date: expense.receipt_date,
        note: expense.note || ''
      });
    } else {
      // Create new expense
      setCurrentExpense(null);
      setFormData({
        user_id: user?.id || 0,
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
    
    // Handle amount field specially
    if (name === 'amount') {
      // Remove non-numeric characters except decimal point
      let numericValue: string = '';
      if (typeof value === 'string') {
        // Allow only numbers and decimal point
        numericValue = value.replace(/[^0-9.]/g, '');
        
        // Ensure we don't have multiple decimal points
        const parts = numericValue.split('.');
        if (parts.length > 2) {
          numericValue = parts[0] + '.' + parts.slice(1).join('');
        }
      } else if (value !== null && value !== undefined) {
        numericValue = String(value).replace(/[^0-9.]/g, '');
      }
      
      setFormData({
        ...formData,
        [name]: numericValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
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
      
      // Ensure amount is a valid number
      let formDataToSubmit: any = { ...formData };
      
      // Parse amount to ensure it's a number
      if (typeof formDataToSubmit.amount === 'string') {
        formDataToSubmit.amount = parseFloat(formDataToSubmit.amount.replace(/,/g, ''));
      }
      
      // Validate amount
      if (isNaN(formDataToSubmit.amount) || formDataToSubmit.amount <= 0) {
        setError('Please enter a valid amount');
        setLoading(false);
        return;
      }
      
      // Validate receipt name
      if (!formDataToSubmit.receipt_name || formDataToSubmit.receipt_name.trim() === '') {
        setError('Please enter a receipt name');
        setLoading(false);
        return;
      }
      
      // Validate receipt date
      if (!formDataToSubmit.receipt_date) {
        setError('Please select a receipt date');
        setLoading(false);
        return;
      }
      
      // Fetch current annual record and quota plan to check budget
      try {
        // Get the current year from the receipt date
        const expenseYear = new Date(formDataToSubmit.receipt_date).getFullYear();
        
        // First get the annual record for the user
        const records = await annualRecordService.getCurrentUserAnnualRecords();
        const currentYearRecord = records.find(record => record.year === expenseYear);
        
        if (!currentYearRecord) {
          setError(`No annual record found for ${expenseYear}. Cannot validate budget.`);
          setLoading(false);
          return;
        }
        
        if (!currentYearRecord.quota_plan_id) {
          setError('No quota plan assigned to your annual record. Please contact an administrator.');
          setLoading(false);
          return;
        }
        
        // Get the quota plan
        const quotaPlan = await quotaPlanService.getQuotaPlanById(currentYearRecord.quota_plan_id);
        
        if (!quotaPlan) {
          setError('Could not find your quota plan. Please contact an administrator.');
          setLoading(false);
          return;
        }
        
        // Now validate the expense against the budget
        const validation = validateMedicalExpense(
          quotaPlan.quota_medical_expense_baht,
          currentYearRecord.used_medical_expense_baht,
          formDataToSubmit.amount
        );
        
        // If validation fails, show an error message and prevent submission
        if (!validation.isValid) {
          setError(`Cannot add this expense: ${validation.message}. Your pro-rated remaining budget is ฿${validation.remainingBefore.toFixed(0)}.`);
          setLoading(false);
          return;
        }
        
        console.log('Submitting data:', formDataToSubmit);
        
        if (currentExpense) {
          // Update existing expense
          const updateData: UpdateMedicalExpenseRequest = {
            amount: formDataToSubmit.amount,
            receipt_name: formDataToSubmit.receipt_name,
            receipt_date: formDataToSubmit.receipt_date,
            note: formDataToSubmit.note || ''
          };
          
          try {
            const updatedExpense = await medicalExpenseService.updateMedicalExpense(
              currentExpense.id,
              updateData
            );
            
            if (updatedExpense) {
              setSnackbarMessage('Medical expense updated successfully');
              setOpenSnackbar(true);
              fetchData();
            }
          } catch (error) {
            console.error('Failed to update medical expense:', error);
            setError('Failed to update medical expense. Please try again.');
          }
        } else {
          // Create new expense
          const createData: CreateMedicalExpenseRequest = {
            user_id: formDataToSubmit.user_id,
            amount: formDataToSubmit.amount,
            receipt_name: formDataToSubmit.receipt_name,
            receipt_date: formDataToSubmit.receipt_date,
            note: formDataToSubmit.note || ''
          };
          
          try {
            const newExpense = await medicalExpenseService.createMedicalExpense(createData);
            
            if (newExpense) {
              setSnackbarMessage('Medical expense created successfully');
              setOpenSnackbar(true);
              fetchData();
            }
          } catch (error) {
            console.error('Failed to create medical expense:', error);
            setError('Failed to create medical expense. Please try again.');
          }
        }
        
        handleCloseDialog();
      } catch (error) {
        console.error('Error validating budget:', error);
        setError('Failed to validate against your budget. Please try again.');
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setError('An unexpected error occurred. Please try again.');
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
      setSnackbarMessage('Medical expense deleted successfully');
      setOpenSnackbar(true);
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
                expenses.map(expense => {
                  console.log('Rendering expense record:', expense);
                  
                  // Safety check to avoid rendering errors
                  if (!expense || typeof expense !== 'object') {
                    console.error('Invalid expense object:', expense);
                    return null;
                  }
                  
                  try {
                    return (
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
                    );
                  } catch (error) {
                    console.error('Error rendering expense row:', error, expense);
                    return (
                      <TableRow key={expense.id || 'error'}>
                        <TableCell colSpan={isAdmin ? 7 : 6} align="center">
                          Error rendering expense data
                        </TableCell>
                      </TableRow>
                    );
                  }
                })
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
        <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
          <DialogTitle>
            {currentExpense ? (viewMode ? 'View' : 'Edit') : 'Add New'} Medical Expense
          </DialogTitle>
          <DialogContent>
            {isAdmin && !viewMode && (
              <FormControl fullWidth margin="normal">
                <InputLabel id="user-select-label">User</InputLabel>
                <Select
                  labelId="user-select-label"
                  id="user-select"
                  name="user_id"
                  value={formData.user_id ? formData.user_id.toString() : ''}
                  onChange={handleSelectChange}
                  label="User"
                  disabled={viewMode || !!currentExpense}
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
              margin="normal"
              fullWidth
              id="receipt_name"
              name="receipt_name"
              label="Receipt Name"
              value={formData.receipt_name || ''}
              onChange={handleInputChange}
              disabled={viewMode}
              required
              error={formData.receipt_name === ''}
              helperText={formData.receipt_name === '' ? 'Receipt name is required' : ''}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="amount"
              name="amount"
              label="Amount (THB)"
              type="text"
              value={formData.amount}
              onChange={handleInputChange}
              disabled={viewMode}
              required
              error={formData.amount === 0 || formData.amount === '0' || formData.amount === ''}
              helperText={formData.amount === 0 || formData.amount === '0' || formData.amount === '' ? 'Amount is required' : ''}
              InputProps={{
                startAdornment: <span style={{ marginRight: 8 }}>฿</span>,
              }}
            />
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Receipt Date"
                value={formData.receipt_date ? parseISO(formData.receipt_date as string) : null}
                onChange={handleDateChange}
                disabled={viewMode}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                    required: true,
                    error: !formData.receipt_date,
                    helperText: !formData.receipt_date ? 'Date is required' : '',
                  },
                }}
              />
            </LocalizationProvider>
            
            <TextField
              margin="normal"
              fullWidth
              id="note"
              name="note"
              label="Note (Optional)"
              multiline
              rows={4}
              value={formData.note || ''}
              onChange={handleInputChange}
              disabled={viewMode}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="inherit">
              {viewMode ? 'Close' : 'Cancel'}
            </Button>
            {!viewMode && (
              <Button 
                onClick={handleSubmit} 
                variant="contained" 
                color="primary"
                disabled={
                  loading || 
                  !formData.receipt_name || 
                  !formData.receipt_date || 
                  !formData.amount || 
                  formData.amount === 0 || 
                  formData.amount === '0'
                }
              >
                {loading ? <CircularProgress size={24} /> : currentExpense ? 'Update' : 'Save'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
        
        {/* Snackbar for success messages */}
        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={() => setOpenSnackbar(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setOpenSnackbar(false)} severity="success">
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </MainLayout>
  );
};

export default MedicalExpenses; 