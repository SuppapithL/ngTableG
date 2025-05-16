import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Stack,
  Paper, 
  Typography, 
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Button
} from '@mui/material';
import { 
  CalendarToday as CalendarIcon, 
  Work as WorkIcon, 
  Refresh as RefreshIcon
} from '@mui/icons-material';
import MainLayout from '../components/Layout';
import { annualRecordService, quotaPlanService } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { AnnualRecord } from '../api/annualRecordService';
import { QuotaPlan } from '../api/quotaPlanService';
import { DateCellsContainer, StatCard, MedicalExpenseSummary } from '../components/Dashboard';
import { getDaysPassedInYear, getDaysInYear } from '../utils/dateUtils';
// Annual record is now automatically synced on the server whenever leave logs or task logs are created/updated/deleted

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [annualRecord, setAnnualRecord] = useState<AnnualRecord | null>(null);
  const [quotaPlan, setQuotaPlan] = useState<QuotaPlan | null>(null);
  const [error, setError] = useState('');
  const [currentYear] = useState(new Date().getFullYear());
  const [daysPassed, setDaysPassed] = useState(0);
  const [daysInYear, setDaysInYear] = useState(365);

  useEffect(() => {
    // Calculate days passed in current year and days in year
    const calculateDays = () => {
      const now = new Date();
      setDaysPassed(getDaysPassedInYear(now));
      setDaysInYear(getDaysInYear(now.getFullYear()));
    };
    
    calculateDays();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Dashboard: Fetching data, user:', user);
      
      // Check if user is logged in
      if (!user) {
        console.error('No user object available');
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Check if auth token exists
      const token = localStorage.getItem('auth_token');
      console.log('Authorization token exists:', !!token, token ? token.substring(0, 10) + '...' : '');
      
      if (!token) {
        console.error('No auth token in localStorage');
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Fetch user's annual record for current year
      console.log('Fetching annual records...');
      try {
        const records = await annualRecordService.getCurrentUserAnnualRecords();
        console.log('Records returned:', records);
        
        if (!records || records.length === 0) {
          console.error('No records returned from API');
          setError('No annual records found. Please contact an administrator.');
          setLoading(false);
          return;
        }
        
        const currentYearRecord = records.find(record => record.year === currentYear);
        console.log('Current year record:', currentYearRecord);
        
        if (currentYearRecord) {
          setAnnualRecord(currentYearRecord);
          
          // If record has quota_plan_id, fetch quota plan details
          if (currentYearRecord.quota_plan_id) {
            try {
              console.log('Fetching quota plan with ID:', currentYearRecord.quota_plan_id);
              const plan = await quotaPlanService.getQuotaPlanById(currentYearRecord.quota_plan_id);
              console.log('Quota plan received:', plan);
              setQuotaPlan(plan);
            } catch (err) {
              console.error('Failed to load quota plan:', err);
              setError('Failed to load quota plan details.');
            }
          } else {
            console.log('No quota plan ID in record');
            setError('Annual record has no assigned quota plan.');
          }
        } else {
          console.log('No record for current year found among:', records);
          setError(`No annual record found for ${currentYear}.`);
        }
      } catch (err: any) {
        console.error('Error fetching annual records:', err);
        if (err.response) {
          console.error('Response data:', err.response.data);
          console.error('Response status:', err.response.status);
          console.error('Response headers:', err.response.headers);
        }
        setError(`Failed to load annual records: ${err.message || 'Unknown error'}`);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.error('Dashboard data fetching error:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        console.error('Response headers:', err.response.headers);
      }
      setError(`Failed to load dashboard data: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchData();
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentYear]);

  // Calculate leave quota
  const calculateRemainingLeaveQuota = (): number => {
    if (!annualRecord || !quotaPlan) return 0;
    
    // Calculate pro-rated vacation days based on days passed in the year
    const proRatedVacationDays = 
      (quotaPlan.quota_vacation_day * daysPassed) / daysInYear;
    
    // Calculate remaining leave quota:
    // rollover_vacation_day + worked_on_holiday_day + proRatedVacationDays - used_vacation_day
    return (
      annualRecord.rollover_vacation_day + 
      annualRecord.worked_on_holiday_day + 
      proRatedVacationDays - 
      annualRecord.used_vacation_day
    );
  };

  // Calculate remaining medical expense quota
  const calculateRemainingMedicalExpense = (): number => {
    if (!annualRecord || !quotaPlan) return 0;
    
    // Calculate pro-rated medical expense based on days passed in the year
    const proRatedMedicalExpense = 
      (quotaPlan.quota_medical_expense_baht * daysPassed) / daysInYear;
    
    // Calculate remaining medical expense:
    // proRatedMedicalExpense - used_medical_expense_baht
    // No longer capping at zero to show when budget is exceeded
    return proRatedMedicalExpense - annualRecord.used_medical_expense_baht;
  };

  const handleRefresh = () => {
    fetchData();
  };

  if (loading) {
    return (
      <MainLayout title="Dashboard">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Dashboard">
        <Paper sx={{ p: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography>{error}</Typography>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
            >
              Retry
            </Button>
          </Box>
        </Paper>
      </MainLayout>
    );
  }

  // If no annual record found, show message
  if (!annualRecord) {
    return (
      <MainLayout title="Dashboard">
        <Paper sx={{ p: 3 }}>
          <Typography>No annual record found for the current year. Please contact HR.</Typography>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
            >
              Retry
            </Button>
          </Box>
        </Paper>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={handleRefresh}
          variant="outlined"
        >
          Refresh Data
        </Button>
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <Stack spacing={3}>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={3}
          >
            <Box sx={{ flex: 1 }}>
              <StatCard 
                title="Remaining Leave Quota" 
                value={calculateRemainingLeaveQuota().toFixed(1)} 
                icon={<CalendarIcon />} 
                color="#3f51b5" 
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <StatCard 
                title="Worked Days" 
                value={annualRecord.worked_day} 
                icon={<WorkIcon />} 
                color="#f44336" 
              />
            </Box>
          </Stack>

          {/* Medical Expenses Summary */}
          <MedicalExpenseSummary 
            quotaMedicalExpenseBaht={quotaPlan ? quotaPlan.quota_medical_expense_baht : 0}
            usedMedicalExpenseBaht={annualRecord.used_medical_expense_baht}
          />

          {/* Add the Date Cells Container here */}
          <DateCellsContainer />

          <Card>
            <CardHeader 
              title="Your Annual Record" 
              action={
                <Button 
                  startIcon={<RefreshIcon />} 
                  onClick={handleRefresh}
                  size="small"
                >
                  Refresh
                </Button>
              }
            />
            <Divider />
            <CardContent>
              {quotaPlan ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body1">
                    <strong>Annual Leave Quota:</strong> {quotaPlan.quota_vacation_day} days
                  </Typography>
                  <Typography variant="body1">
                    <strong>Used Vacation Days:</strong> {annualRecord.used_vacation_day} days
                  </Typography>
                  <Typography variant="body1">
                    <strong>Used Sick Leave:</strong> {annualRecord.used_sick_leave_day} days
                  </Typography>
                  <Typography variant="body1">
                    <strong>Rollover Vacation Days:</strong> {annualRecord.rollover_vacation_day} days
                  </Typography>
                  <Typography variant="body1">
                    <strong>Worked on Holiday:</strong> {annualRecord.worked_on_holiday_day} days
                  </Typography>
                  <Typography variant="body1">
                    <strong>Annual Medical Budget:</strong> ฿{quotaPlan.quota_medical_expense_baht}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body1">
                  No quota plan information available.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </MainLayout>
  );
};

export default Dashboard; 