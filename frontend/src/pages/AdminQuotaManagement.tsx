import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Divider,
  Button,
  TextField,
  Stack,
  Alert,
  Card,
  CardContent,
  CardActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MainLayout from '../components/Layout';
import { annualRecordService, quotaPlanService } from '../api';
import { userService } from '../api';
import { AnnualRecord } from '../api/annualRecordService';
import { User } from '../api/userService';
import { QuotaPlan } from '../api/quotaPlanService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Import our new components
import AnnualRecordsTable from '../components/AnnualRecordsTable';
import QuotaPlansTable from '../components/QuotaPlansTable';
import QuotaDashboard from '../components/QuotaDashboard';

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
      id={`quota-tabpanel-${index}`}
      aria-labelledby={`quota-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const AdminQuotaManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  
  // Redirect non-admin users
  useEffect(() => {
    if (user && user.user_type !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Loading and notification states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Admin quota management states
  const [quotaFormData, setQuotaFormData] = useState({
    year: new Date().getFullYear(),
    quota_plan_id: 0
  });
  
  // New quota plan form
  const [quotaPlanFormData, setQuotaPlanFormData] = useState({
    plan_name: '',
    year: new Date().getFullYear(),
    quota_vacation_day: 10,
    quota_medical_expense_baht: 20000
  });
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<QuotaPlan | null>(null);
  
  // For data storage
  const [quotaPlans, setQuotaPlans] = useState<QuotaPlan[]>([]);
  const [annualRecords, setAnnualRecords] = useState<AnnualRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number>(0);
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  
  // For edit/delete functionality
  const [editingPlan, setEditingPlan] = useState<QuotaPlan | null>(null);
  
  // Fetch all data on component mount and when selectedYear changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch users
        const usersData = await userService.getAllUsers();
        setUsers(usersData);
        if (usersData.length > 0) {
          setSelectedUserId(usersData[0].id);
        }
        
        // Fetch quota plans
        const plansData = await quotaPlanService.getAllQuotaPlans();
        setQuotaPlans(plansData);
        if (plansData.length > 0) {
          setSelectedPlanId(plansData[0].id);
        }
        
        // Fetch annual records
        const recordsData = await annualRecordService.getAllAnnualRecords();
        setAnnualRecords(recordsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Make sure the tab value doesn't exceed available tabs
    if (newValue <= 2) {
      setTabValue(newValue);
    }
  };
  
  const handleYearChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedYear(event.target.value as number);
  };
  
  const handleQuotaPlanInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setQuotaPlanFormData(prev => ({
      ...prev,
      [name]: ['year'].includes(name) ? parseInt(value, 10) : 
               ['quota_vacation_day', 'quota_medical_expense_baht'].includes(name) ? 
               parseFloat(value) : value
    }));
  };
  
  const handleUserChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    const userId = e.target.value as number;
    setSelectedUserId(userId);
  };
  
  const handlePlanChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    const planId = e.target.value as number;
    setSelectedPlanId(planId);
  };
  
  const handleCreateQuotaPlan = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const created = await quotaPlanService.createQuotaPlan({
        plan_name: quotaPlanFormData.plan_name,
        year: quotaPlanFormData.year,
        quota_vacation_day: quotaPlanFormData.quota_vacation_day,
        quota_medical_expense_baht: quotaPlanFormData.quota_medical_expense_baht,
        created_by_user_id: user?.id
      });
      
      // Refresh the quota plans list
      const plansData = await quotaPlanService.getAllQuotaPlans();
      setQuotaPlans(plansData);
      
      setSuccess(`Successfully created quota plan "${created.plan_name}" for year ${created.year}`);
      
      // Reset form to create another plan with the name incremented
      setQuotaPlanFormData(prev => ({
        ...prev,
        plan_name: `${prev.plan_name.split(' ')[0]} ${prev.year} (${new Date().toLocaleTimeString()})`
      }));
    } catch (err) {
      console.error('Error creating quota plan:', err);
      setError('Failed to create quota plan');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAssignQuotaPlan = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await annualRecordService.assignQuotaPlanToAllUsers(
        quotaFormData.year,
        quotaFormData.quota_plan_id
      );
      setSuccess(`Successfully assigned quota plan to all users for year ${quotaFormData.year}`);
      // Refresh annual records
      await fetchAnnualRecords();
    } catch (err: any) {
      setError(`Error assigning quota plan: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditPlan = (plan: QuotaPlan) => {
    setEditingPlan(plan);
    setQuotaPlanFormData({
      plan_name: plan.plan_name,
      year: plan.year,
      quota_vacation_day: plan.quota_vacation_day,
      quota_medical_expense_baht: plan.quota_medical_expense_baht
    });
    setTabValue(1); // Switch to the Create/Edit tab
  };
  
  const handleDeletePlan = (plan: QuotaPlan) => {
    setPlanToDelete(plan);
    setOpenDeleteDialog(true);
  };
  
  const confirmDeletePlan = async () => {
    if (!planToDelete) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await quotaPlanService.deleteQuotaPlan(planToDelete.id);
      
      // Refresh quota plans
      const plansData = await quotaPlanService.getAllQuotaPlans();
      setQuotaPlans(plansData);
      
      setSuccess(`Successfully deleted quota plan "${planToDelete.plan_name}"`);
      setPlanToDelete(null);
      setOpenDeleteDialog(false);
    } catch (err) {
      console.error('Error deleting quota plan:', err);
      setError('Failed to delete quota plan. It might be in use by annual records.');
    } finally {
      setLoading(false);
    }
  };
  
  const cancelDeletePlan = () => {
    setPlanToDelete(null);
    setOpenDeleteDialog(false);
  };
  
  const updatePlan = async () => {
    if (!editingPlan) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await quotaPlanService.updateQuotaPlan(editingPlan.id, {
        plan_name: quotaPlanFormData.plan_name,
        year: quotaPlanFormData.year,
        quota_vacation_day: quotaPlanFormData.quota_vacation_day,
        quota_medical_expense_baht: quotaPlanFormData.quota_medical_expense_baht
      });
      
      // Refresh quota plans
      const plansData = await quotaPlanService.getAllQuotaPlans();
      setQuotaPlans(plansData);
      
      setSuccess(`Successfully updated quota plan "${quotaPlanFormData.plan_name}"`);
      
      // Reset form and editing state
      setEditingPlan(null);
      setQuotaPlanFormData({
        plan_name: '',
        year: new Date().getFullYear(),
        quota_vacation_day: 10,
        quota_medical_expense_baht: 20000
      });
    } catch (err) {
      console.error('Error updating quota plan:', err);
      setError('Failed to update quota plan');
    } finally {
      setLoading(false);
    }
  };
  
  const cancelUpdate = () => {
    setEditingPlan(null);
    setQuotaPlanFormData({
      plan_name: '',
      year: new Date().getFullYear(),
      quota_vacation_day: 10,
      quota_medical_expense_baht: 20000
    });
  };
  
  const fetchAnnualRecords = async () => {
    setLoading(true);
    try {
      const recordsData = await annualRecordService.getAllAnnualRecords();
      setAnnualRecords(recordsData);
    } catch (err) {
      console.error('Error fetching annual records:', err);
      setError('Failed to load annual records');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle functions for quota plan assignment
  const handleQuotaFormChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setQuotaFormData({
        ...quotaFormData,
        [name]: value
      });
    }
  };
  
  if (!user || user.user_type !== 'admin') {
    return (
      <MainLayout title="Admin Quota Management">
        <Box sx={{ p: 3 }}>
          <Typography variant="h5">Unauthorized</Typography>
          <Typography>You don't have permission to access this page.</Typography>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="subtitle2">Debug Info:</Typography>
            <Typography>User: {user ? user.username : 'Not logged in'}</Typography>
            <Typography>User Type: {user ? `"${user.user_type}"` : 'None'}</Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout title="Admin Quota Management">
      <Stack spacing={3} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Quota Management Dashboard</Typography>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="year-select-label">Year</InputLabel>
            <Select
              labelId="year-select-label"
              value={selectedYear}
              label="Year"
              onChange={handleYearChange as any}
              size="small"
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        {error && (
          <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
        )}
        
        {success && (
          <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
        )}
        
        {/* Dashboard Overview */}
        <QuotaDashboard 
          annualRecords={annualRecords}
          quotaPlans={quotaPlans}
          users={users}
          selectedYear={selectedYear}
          loading={loading}
        />
        
        {/* Tabs for different sections */}
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              aria-label="quota management tabs"
            >
              <Tab label="Annual Records" />
              <Tab label="Create / Edit Plans" />
              <Tab label="Assign Plans" />
            </Tabs>
          </Box>
          
          {/* Annual Records Tab */}
          <TabPanel value={tabValue} index={0}>
            <AnnualRecordsTable 
              records={annualRecords}
              title={`Annual Records (${selectedYear})`}
            />
          </TabPanel>
          
          {/* Create/Edit Plans Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {editingPlan ? 'Edit Quota Plan' : 'Create New Quota Plan'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {editingPlan 
                      ? `Editing plan "${editingPlan.plan_name}" (ID: ${editingPlan.id})`
                      : 'Create a new quota plan with specific vacation days and medical expense quota.'}
                  </Typography>
                  
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                      name="plan_name"
                      label="Plan Name"
                      value={quotaPlanFormData.plan_name}
                      onChange={handleQuotaPlanInputChange}
                      fullWidth
                    />
                    
                    <TextField
                      name="year"
                      label="Year"
                      type="number"
                      value={quotaPlanFormData.year}
                      onChange={handleQuotaPlanInputChange}
                      fullWidth
                    />
                    
                    <TextField
                      name="quota_vacation_day"
                      label="Vacation Days Quota"
                      type="number"
                      value={quotaPlanFormData.quota_vacation_day}
                      onChange={handleQuotaPlanInputChange}
                      fullWidth
                    />
                    
                    <TextField
                      name="quota_medical_expense_baht"
                      label="Medical Expense Quota (฿)"
                      type="number"
                      value={quotaPlanFormData.quota_medical_expense_baht}
                      onChange={handleQuotaPlanInputChange}
                      fullWidth
                    />
                  </Stack>
                </CardContent>
                
                <CardActions>
                  {editingPlan ? (
                    <>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={updatePlan}
                        disabled={loading}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Update Plan'}
                      </Button>
                      <Button 
                        variant="outlined" 
                        onClick={cancelUpdate}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={handleCreateQuotaPlan}
                      disabled={loading}
                      fullWidth
                      startIcon={<AddIcon />}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Create Quota Plan'}
                    </Button>
                  )}
                </CardActions>
              </Card>
              
              <QuotaPlansTable 
                plans={quotaPlans}
                title="Available Quota Plans"
                onEdit={handleEditPlan}
                onDelete={handleDeletePlan}
              />
            </Box>
          </TabPanel>
          
          {/* Assign Plans Tab */}
          <TabPanel value={tabValue} index={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Assign Quota Plan to All Users
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Assign an existing quota plan to all users for a specific year.
                </Typography>
                
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <TextField
                    name="year"
                    label="Year"
                    type="number"
                    value={quotaFormData.year}
                    onChange={handleQuotaFormChange}
                    fullWidth
                  />
                  
                  <FormControl fullWidth>
                    <InputLabel id="quota-plan-select-label">Quota Plan</InputLabel>
                    <Select
                      labelId="quota-plan-select-label"
                      name="quota_plan_id"
                      value={quotaFormData.quota_plan_id}
                      label="Quota Plan"
                      onChange={handleQuotaFormChange as any}
                    >
                      {quotaPlans.map(plan => (
                        <MenuItem key={plan.id} value={plan.id}>
                          {plan.plan_name ? plan.plan_name : 'Default'} ({plan.year || new Date().getFullYear()}) - {plan.quota_vacation_day || 0} days, ฿{(plan.quota_medical_expense_baht || 0).toLocaleString()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </CardContent>
              
              <CardActions>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleAssignQuotaPlan}
                  disabled={loading || quotaPlans.length === 0}
                  fullWidth
                >
                  {loading ? <CircularProgress size={24} /> : 'Assign to All Users'}
                </Button>
              </CardActions>
            </Card>
          </TabPanel>
        </Box>
      </Stack>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={cancelDeletePlan}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete the quota plan "{planToDelete?.plan_name}"?
            This action cannot be undone, and if users are assigned to this plan,
            the operation may fail.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeletePlan} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDeletePlan} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default AdminQuotaManagement; 