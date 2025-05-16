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
  Divider,
  SelectChangeEvent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import MainLayout from '../components/Layout';
import { annualRecordService, quotaPlanService } from '../api';
import { userService } from '../api';
import { AnnualRecord, CreateAnnualRecordRequest } from '../api/annualRecordService';
import { User } from '../api/userService';
import { QuotaPlan } from '../api/quotaPlanService';
import { useAuth } from '../contexts/AuthContext';

const AnnualRecords: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.user_type === 'admin';
  
  const [records, setRecords] = useState<AnnualRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [quotaPlans, setQuotaPlans] = useState<QuotaPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openQuotaDialog, setOpenQuotaDialog] = useState(false);
  const [openTemplateDialog, setOpenTemplateDialog] = useState(false);
  
  // Form states
  const [editRecordId, setEditRecordId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateAnnualRecordRequest>({
    user_id: 0,
    year: new Date().getFullYear(),
    quota_plan_id: 0,
    rollover_vacation_day: 0,
    used_vacation_day: 0,
    used_sick_leave_day: 0,
    worked_on_holiday_day: 0,
    worked_day: 0,
    used_medical_expense_baht: 0
  });
  
  // Admin quota management states
  const [quotaFormData, setQuotaFormData] = useState({
    year: new Date().getFullYear(),
    quota_plan_id: 0
  });
  
  // Next year template states
  const [templateFormData, setTemplateFormData] = useState({
    this_year: new Date().getFullYear(),
    next_year: new Date().getFullYear() + 1
  });
  
  // New quota plan form
  const [quotaPlanFormData, setQuotaPlanFormData] = useState({
    plan_name: 'Default',
    year: new Date().getFullYear(),
    quota_vacation_day: 10,
    quota_medical_expense_baht: 20000
  });

  // State for selected user in "By User" tab
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const fetchData = async () => {
    setLoading(true);
    try {
      // Load users first
      const usersData = await userService.getAllUsers();
      setUsers(usersData);
      
      // Load quota plans
      try {
        const quotaPlansData = await quotaPlanService.getAllQuotaPlans();
        setQuotaPlans(quotaPlansData);
        
        // Set default quota plan if available
        if (quotaPlansData.length > 0 && quotaFormData.quota_plan_id === 0) {
          const defaultPlan = quotaPlansData.find(plan => plan.plan_name === 'Default') || quotaPlansData[0];
          setQuotaFormData(prev => ({
            ...prev,
            quota_plan_id: defaultPlan.id
          }));
          
          // Also update the form data if creating a new record
          if (!editRecordId) {
            setFormData(prev => ({
              ...prev,
              quota_plan_id: defaultPlan.id
            }));
          }
        }
      } catch (err) {
        console.error('Error loading quota plans:', err);
      }
      
      // Then load records
      try {
        let recordsData;
        if (isAdmin) {
          // Admin sees all records
          recordsData = await annualRecordService.getAllAnnualRecords();
        } else {
          // Regular user only sees their own records
          recordsData = await annualRecordService.getCurrentUserAnnualRecords();
        }
        setRecords(recordsData);
      } catch (err: any) {
        console.error('Error loading records:', err);
        setError('Failed to load records');
      }
    } catch (err: any) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (record?: AnnualRecord) => {
    // Records should not be editable by any user
    return;
  };

  const handleOpenQuotaDialog = () => {
    if (user?.user_type !== 'admin') {
      return;
    }
    
    setQuotaFormData({
      year: new Date().getFullYear(),
      quota_plan_id: 0
    });
    setOpenQuotaDialog(true);
  };

  const handleOpenTemplateDialog = () => {
    if (user?.user_type !== 'admin') {
      return;
    }
    
    setTemplateFormData({
      this_year: new Date().getFullYear(),
      next_year: new Date().getFullYear() + 1
    });
    setOpenTemplateDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleCloseQuotaDialog = () => {
    setOpenQuotaDialog(false);
  };

  const handleCloseTemplateDialog = () => {
    setOpenTemplateDialog(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'user_id' || name === 'year' || name === 'quota_plan_id' ? parseInt(value, 10) : parseFloat(value)
    }));
  };

  const handleQuotaInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setQuotaFormData(prev => ({
        ...prev,
        [name]: name === 'year' || name === 'quota_plan_id' ? parseInt(value as string, 10) : value
      }));
    }
  };

  const handleTemplateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTemplateFormData(prev => ({
      ...prev,
      [name]: ['this_year', 'next_year'].includes(name) ? parseInt(value, 10) : parseFloat(value)
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseInt(value, 10)
    }));
  };

  const handleQuotaSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setQuotaFormData(prev => ({
      ...prev,
      [name]: parseInt(value, 10)
    }));
  };

  const handleSubmit = async () => {
    if (user?.user_type !== 'admin') {
      setError('You do not have permission to perform this action');
      return;
    }
    
    try {
      if (editRecordId) {
        await annualRecordService.updateAnnualRecord(editRecordId, formData);
        setSuccess('Annual record updated successfully');
      } else {
        await annualRecordService.createAnnualRecord(formData);
        setSuccess('Annual record created successfully');
      }
      handleCloseDialog();
      fetchData();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save annual record');
    }
  };

  const handleSubmitQuota = async () => {
    if (user?.user_type !== 'admin') {
      setError('You do not have permission to perform this action');
      return;
    }
    
    try {
      await annualRecordService.assignQuotaPlanToAllUsers(
        quotaFormData.year,
        quotaFormData.quota_plan_id
      );
      setSuccess('Quota plan assigned to all users successfully');
      handleCloseQuotaDialog();
      fetchData();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to assign quota plan');
    }
  };

  const handleSubmitTemplate = async () => {
    if (user?.user_type !== 'admin') {
      setError('You do not have permission to perform this action');
      return;
    }
    
    try {
      await annualRecordService.createNextYearAnnualRecords(
        templateFormData.this_year,
        templateFormData.next_year
      );
      setSuccess('Next year records created successfully');
      handleCloseTemplateDialog();
      fetchData();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create next year records');
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    // Records should not be deletable by any user
    return;
  };

  const handleUpsertUserQuota = async (userId: number) => {
    if (user?.user_type !== 'admin') {
      setError('You do not have permission to perform this action');
      return;
    }
    
    try {
      await annualRecordService.upsertAnnualRecordForUser(
        userId,
        new Date().getFullYear(),
        quotaFormData.quota_plan_id
      );
      setSuccess('User quota updated successfully');
      fetchData();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update user quota');
    }
  };

  // Get quota plan details for a record
  const getQuotaPlanDetails = (record: AnnualRecord) => {
    if (!record.quota_plan_id) return { quota_vacation_day: 0, quota_medical_expense_baht: 0 };
    const plan = quotaPlans.find(p => p.id === record.quota_plan_id);
    if (!plan) return { quota_vacation_day: record.quota_vacation_day || 0, quota_medical_expense_baht: record.quota_medical_expense_baht || 0 };
    return { quota_vacation_day: plan.quota_vacation_day, quota_medical_expense_baht: plan.quota_medical_expense_baht };
  };

  // Get plan name by id
  const getPlanNameById = (planId?: number): string => {
    if (!planId) return 'None';
    const plan = quotaPlans.find(p => p.id === planId);
    return plan ? `${plan.plan_name} (${plan.year})` : 'Unknown';
  };

  // Find username by user ID
  const getUsernameById = (userId: number): string => {
    const user = users.find(u => u.id === userId);
    return user ? user.username : 'Unknown';
  };

  if (loading && records.length === 0) {
    return (
      <MainLayout title="Annual Records">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  // Filter records based on current user if not admin
  const filteredRecords = isAdmin 
    ? records 
    : records.filter(record => record.user_id === user?.id);

  // Filter records by tab selection (for admin view only)
  const getRecordsByTab = () => {
    if (!isAdmin) {
      return filteredRecords;
    }
    
    switch (tabValue) {
      case 0: // All Records
        return filteredRecords;
      case 1: // By User
        return selectedUserId ? 
          filteredRecords.filter(record => record.user_id === selectedUserId) :
          filteredRecords;
      case 2: // By Year
        return filteredRecords.filter(record => record.year === selectedYear);
      default:
        return filteredRecords;
    }
  };

  // Handler for changing selected user
  const handleUserFilterChange = (event: SelectChangeEvent) => {
    setSelectedUserId(Number(event.target.value));
  };

  // Handler for changing selected year
  const handleYearFilterChange = (event: SelectChangeEvent) => {
    setSelectedYear(Number(event.target.value));
  };

  // Get the records to display based on filters and tabs
  const displayRecords = getRecordsByTab();

  return (
    <MainLayout title="Annual Records">
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            {isAdmin ? "Annual Records" : "My Annual Records"}
          </Typography>
          {/* No action buttons - records should be read-only */}
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
        )}

        {isAdmin && (
          <Paper sx={{ width: '100%' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              centered
            >
              <Tab label="All Records" />
              <Tab label="By User" />
              <Tab label="By Year" />
            </Tabs>
          </Paper>
        )}

        {/* Show filter controls based on selected tab for admin */}
        {isAdmin && tabValue === 1 && (
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="user-filter-label">Filter by User</InputLabel>
              <Select
                labelId="user-filter-label"
                value={selectedUserId.toString()}
                label="Filter by User"
                onChange={handleUserFilterChange}
              >
                <MenuItem value="0">All Users</MenuItem>
                {users.map(user => (
                  <MenuItem key={user.id} value={user.id.toString()}>
                    {user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {isAdmin && tabValue === 2 && (
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="year-filter-label">Filter by Year</InputLabel>
              <Select
                labelId="year-filter-label"
                value={selectedYear.toString()}
                label="Filter by Year"
                onChange={handleYearFilterChange}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <MenuItem key={year} value={year.toString()}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                {isAdmin && <TableCell>User</TableCell>}
                <TableCell>Year</TableCell>
                <TableCell>Quota Plan</TableCell>
                <TableCell>Rollover Vacation</TableCell>
                <TableCell>Quota Vacation</TableCell>
                <TableCell>Used Vacation</TableCell>
                <TableCell>Used Sick Leave</TableCell>
                <TableCell>Worked on Holiday</TableCell>
                <TableCell>Worked Days</TableCell>
                <TableCell>Quota Medical (฿)</TableCell>
                <TableCell>Used Medical (฿)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayRecords.map((record: AnnualRecord) => {
                const planDetails = getQuotaPlanDetails(record);
                return (
                  <TableRow key={record.id}>
                    <TableCell>{record.id}</TableCell>
                    {isAdmin && <TableCell>{getUsernameById(record.user_id)}</TableCell>}
                    <TableCell>{record.year}</TableCell>
                    <TableCell>{getPlanNameById(record.quota_plan_id)}</TableCell>
                    <TableCell>{record.rollover_vacation_day}</TableCell>
                    <TableCell>{planDetails.quota_vacation_day}</TableCell>
                    <TableCell>{record.used_vacation_day}</TableCell>
                    <TableCell>{record.used_sick_leave_day}</TableCell>
                    <TableCell>{record.worked_on_holiday_day}</TableCell>
                    <TableCell>{record.worked_day}</TableCell>
                    <TableCell>{planDetails.quota_medical_expense_baht}</TableCell>
                    <TableCell>{record.used_medical_expense_baht}</TableCell>
                  </TableRow>
                );
              })}
              {displayRecords.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 12 : 11} align="center">
                    No records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      {/* Remove all dialog components since records should not be editable */}
    </MainLayout>
  );
};

export default AnnualRecords; 