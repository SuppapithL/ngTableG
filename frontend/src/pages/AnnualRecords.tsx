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
      } catch (err) {
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
    if (record) {
      setFormData({
        user_id: record.user_id,
        year: record.year,
        quota_plan_id: record.quota_plan_id || 0,
        rollover_vacation_day: record.rollover_vacation_day,
        used_vacation_day: record.used_vacation_day,
        used_sick_leave_day: record.used_sick_leave_day,
        worked_on_holiday_day: record.worked_on_holiday_day,
        worked_day: record.worked_day,
        used_medical_expense_baht: record.used_medical_expense_baht
      });
      setEditRecordId(record.id);
    } else {
      // Find default quota plan
      const defaultPlan = quotaPlans.find(plan => plan.plan_name === 'Default' && plan.year === new Date().getFullYear());
      const planId = defaultPlan ? defaultPlan.id : (quotaPlans.length > 0 ? quotaPlans[0].id : 0);
      
      setFormData({
        user_id: users.length > 0 ? users[0].id : 0,
        year: new Date().getFullYear(),
        quota_plan_id: planId,
        rollover_vacation_day: 0,
        used_vacation_day: 0,
        used_sick_leave_day: 0,
        worked_on_holiday_day: 0,
        worked_day: 0,
        used_medical_expense_baht: 0
      });
      setEditRecordId(null);
    }
    setOpenDialog(true);
  };

  const handleOpenQuotaDialog = () => {
    setQuotaFormData({
      year: new Date().getFullYear(),
      quota_plan_id: 0
    });
    setOpenQuotaDialog(true);
  };

  const handleOpenTemplateDialog = () => {
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
    try {
      if (editRecordId) {
        // Update existing record
        await annualRecordService.updateAnnualRecord(editRecordId, formData);
        setSuccess('Record updated successfully');
      } else {
        // Create new record
        await annualRecordService.createAnnualRecord(formData);
        setSuccess('Record created successfully');
      }
      handleCloseDialog();
      fetchData();
    } catch (err: any) {
      console.error('Error saving record:', err);
      setError('Failed to save record');
    }
  };

  const handleSubmitQuota = async () => {
    try {
      await annualRecordService.assignQuotaPlanToAllUsers(
        quotaFormData.year,
        quotaFormData.quota_plan_id
      );
      handleCloseQuotaDialog();
      setSuccess('Quota plan assigned to all users');
      fetchData();
    } catch (err: any) {
      console.error('Error updating quotas:', err);
      setError('Failed to update quotas');
    }
  };

  const handleSubmitTemplate = async () => {
    try {
      await annualRecordService.createNextYearAnnualRecords(
        templateFormData.this_year,
        templateFormData.next_year
      );
      handleCloseTemplateDialog();
      setSuccess('Created records for next year successfully');
      fetchData();
    } catch (err: any) {
      console.error('Error creating next year records:', err);
      setError('Failed to create next year records');
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await annualRecordService.deleteAnnualRecord(recordId);
        setSuccess('Record deleted successfully');
        fetchData();
      } catch (err: any) {
        console.error('Error deleting record:', err);
        setError('Failed to delete record');
      }
    }
  };

  const handleUpsertUserQuota = async (userId: number) => {
    try {
      const year = new Date().getFullYear();
      await annualRecordService.upsertAnnualRecordForUser(
        userId,
        year,
        quotaFormData.quota_plan_id
      );
      setSuccess(`Updated quota plan for user`);
      fetchData();
    } catch (err: any) {
      console.error('Error updating user quota:', err);
      setError('Failed to update user quota');
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
          <Stack direction="row" spacing={2}>
            {isAdmin && (
              <>
                <Button
                  variant="outlined"
                  onClick={handleOpenQuotaDialog}
                >
                  Assign Quota Plan
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleOpenTemplateDialog}
                >
                  Create Next Year Records
                </Button>
              </>
            )}
            {isAdmin && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Add Record
              </Button>
            )}
          </Stack>
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
                <TableCell>Vacation Days</TableCell>
                <TableCell>Used Vacation</TableCell>
                <TableCell>Used Sick Leave</TableCell>
                <TableCell>Medical Expense (฿)</TableCell>
                <TableCell>Used Medical (฿)</TableCell>
                {isAdmin && <TableCell>Actions</TableCell>}
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
                    <TableCell>
                      {record.rollover_vacation_day + planDetails.quota_vacation_day}
                      {record.rollover_vacation_day > 0 && (
                        <Chip 
                          size="small" 
                          label={`+${record.rollover_vacation_day} rollover`} 
                          color="info" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>{record.used_vacation_day}</TableCell>
                    <TableCell>{record.used_sick_leave_day}</TableCell>
                    <TableCell>{planDetails.quota_medical_expense_baht}</TableCell>
                    <TableCell>{record.used_medical_expense_baht}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Stack direction="row">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleOpenDialog(record)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleDeleteRecord(record.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {displayRecords.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 10 : 8} align="center">
                    No records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      {/* Record Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editRecordId ? (isAdmin ? 'Edit Annual Record' : 'View Annual Record') : 'Add Annual Record'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {isAdmin && (
              <FormControl fullWidth>
                <InputLabel id="user-select-label">User</InputLabel>
                <Select
                  labelId="user-select-label"
                  name="user_id"
                  value={formData.user_id.toString()}
                  label="User"
                  onChange={handleSelectChange}
                  disabled={!isAdmin}
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
              name="year"
              label="Year"
              type="number"
              value={formData.year}
              onChange={handleInputChange}
              fullWidth
              disabled={!isAdmin}
            />

            {isAdmin && (
              <FormControl fullWidth>
                <InputLabel id="quota-plan-select-label">Quota Plan</InputLabel>
                <Select
                  labelId="quota-plan-select-label"
                  name="quota_plan_id"
                  value={formData.quota_plan_id.toString()}
                  label="Quota Plan"
                  onChange={handleSelectChange}
                  disabled={!isAdmin}
                >
                  <MenuItem value="0">None</MenuItem>
                  {quotaPlans.map(plan => (
                    <MenuItem key={plan.id} value={plan.id.toString()}>
                      {plan.plan_name} ({plan.year}) - {plan.quota_vacation_day} days, {plan.quota_medical_expense_baht} baht
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Divider />
            <Typography variant="subtitle2">Vacation Days</Typography>
            
            <TextField
              name="rollover_vacation_day"
              label="Rollover Vacation Days"
              type="number"
              value={formData.rollover_vacation_day}
              onChange={handleInputChange}
              fullWidth
              disabled={!isAdmin}
            />
            
            {/* Display quota info for selected plan */}
            {formData.quota_plan_id > 0 && (
              <Box sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">
                  Quota Plan: {getPlanNameById(formData.quota_plan_id)}
                </Typography>
                {quotaPlans.find(p => p.id === formData.quota_plan_id) && (
                  <>
                    <Typography variant="body2">
                      Vacation Days: {quotaPlans.find(p => p.id === formData.quota_plan_id)?.quota_vacation_day || 0}
                    </Typography>
                    <Typography variant="body2">
                      Medical Expense: {quotaPlans.find(p => p.id === formData.quota_plan_id)?.quota_medical_expense_baht || 0} baht
                    </Typography>
                  </>
                )}
              </Box>
            )}
            
            <TextField
              name="used_vacation_day"
              label="Used Vacation Days"
              type="number"
              value={formData.used_vacation_day}
              onChange={handleInputChange}
              fullWidth
              disabled={!isAdmin}
            />

            <Divider />
            <Typography variant="subtitle2">Other Leave Types</Typography>
            
            <TextField
              name="used_sick_leave_day"
              label="Used Sick Leave Days"
              type="number"
              value={formData.used_sick_leave_day}
              onChange={handleInputChange}
              fullWidth
              disabled={!isAdmin}
            />
            
            <TextField
              name="worked_on_holiday_day"
              label="Worked On Holiday Days"
              type="number"
              value={formData.worked_on_holiday_day}
              onChange={handleInputChange}
              fullWidth
              disabled={!isAdmin}
            />
            
            <TextField
              name="worked_day"
              label="Worked Days"
              type="number"
              value={formData.worked_day}
              onChange={handleInputChange}
              fullWidth
              disabled={!isAdmin}
            />

            <Divider />
            <Typography variant="subtitle2">Medical Expenses</Typography>
            
            <TextField
              name="used_medical_expense_baht"
              label="Used Medical Expense (฿)"
              type="number"
              value={formData.used_medical_expense_baht}
              onChange={handleInputChange}
              fullWidth
              disabled={!isAdmin}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          {isAdmin && editRecordId && (
            <Button variant="contained" onClick={handleSubmit}>
              Update
            </Button>
          )}
          {isAdmin && !editRecordId && (
            <Button variant="contained" onClick={handleSubmit}>
              Create
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Admin Quota Management Dialog */}
      {isAdmin && (
        <Dialog open={openQuotaDialog} onClose={handleCloseQuotaDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Assign Quota Plan to All Users</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="info">
                This will assign the selected quota plan to all users for the specified year.
              </Alert>
              
              <TextField
                name="year"
                label="Year"
                type="number"
                value={quotaFormData.year}
                onChange={handleQuotaInputChange}
                fullWidth
              />
              
              <FormControl fullWidth>
                <InputLabel id="all-quota-plan-select-label">Quota Plan</InputLabel>
                <Select
                  labelId="all-quota-plan-select-label"
                  name="quota_plan_id"
                  value={quotaFormData.quota_plan_id.toString()}
                  label="Quota Plan"
                  onChange={handleQuotaSelectChange}
                >
                  {quotaPlans
                    .filter(plan => plan.year === quotaFormData.year)
                    .map(plan => (
                      <MenuItem key={plan.id} value={plan.id.toString()}>
                        {plan.plan_name} - {plan.quota_vacation_day} days, {plan.quota_medical_expense_baht} baht
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseQuotaDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmitQuota} disabled={quotaFormData.quota_plan_id === 0}>
              Assign Plan
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Admin Template Dialog */}
      {isAdmin && (
        <Dialog open={openTemplateDialog} onClose={handleCloseTemplateDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Create Next Year Records</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="info">
                This will create records for the next year for all users. Any unused vacation days from the current year will be rolled over.
              </Alert>
              
              <TextField
                name="this_year"
                label="This Year"
                type="number"
                value={templateFormData.this_year}
                onChange={handleTemplateInputChange}
                fullWidth
              />
              
              <TextField
                name="next_year"
                label="Next Year"
                type="number"
                value={templateFormData.next_year}
                onChange={handleTemplateInputChange}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseTemplateDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmitTemplate}>
              Create Records
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </MainLayout>
  );
};

export default AnnualRecords; 