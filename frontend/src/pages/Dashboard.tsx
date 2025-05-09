import React, { useState, useEffect, useRef } from 'react';
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
  Button,
  IconButton
} from '@mui/material';
import { 
  CalendarToday as CalendarIcon, 
  Work as WorkIcon, 
  LocalHospital as MedicalIcon,
  AttachMoney as MoneyIcon,
  Refresh as RefreshIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon
} from '@mui/icons-material';
import MainLayout from '../components/Layout';
import { annualRecordService, quotaPlanService } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { AnnualRecord } from '../api/annualRecordService';
import { QuotaPlan } from '../api/quotaPlanService';

// DateCell component to display a single date
const DateCell: React.FC<{ date: Date }> = ({ date }) => (
  <Paper 
    sx={{ 
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 1,
      border: '1px solid #e0e0e0',
      height: 80,
      width: '100%'
    }}
  >
    <Typography variant="caption" color="text.secondary">
      {date.toLocaleDateString('en-US', { month: 'short' })} {date.getFullYear()}
    </Typography>
    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
      {date.getDate()}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {date.toLocaleDateString('en-US', { weekday: 'short' })}
    </Typography>
  </Paper>
);

// DateCellsContainer component to display a scrollable vertical calendar
const DateCellsContainer: React.FC = () => {
  const [dates, setDates] = useState<Date[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Generate dates starting from a specific date and for a certain number of days
  const generateDates = (startDate: Date, daysToAdd: number) => {
    const newDates: Date[] = [];
    for (let i = 0; i < daysToAdd; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      newDates.push(date);
    }
    return newDates;
  };
  
  // Initial load of dates
  useEffect(() => {
    loadTodayDates();
  }, []);
  
  // Load dates starting from today
  const loadTodayDates = () => {
    const today = new Date();
    const initialDates = generateDates(today, 60); // Load initial 60 days
    setDates(initialDates);
    
    // Scroll to top when resetting to today
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  };
  
  // Handle scroll to add more dates when reaching the bottom
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      // If scrolled to bottom (with a small threshold)
      if (scrollHeight - scrollTop - clientHeight < 100 && dates.length > 0) {
        // Generate more dates starting from the last date
        const lastDate = new Date(dates[dates.length - 1]);
        lastDate.setDate(lastDate.getDate() + 1);
        const moreDates = generateDates(lastDate, 30); // Add 30 more days
        setDates(prev => [...prev, ...moreDates]);
      }
    }
  };
  
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Calendar View</Typography>
          <Button
            startIcon={<TodayIcon />}
            size="small"
            variant="outlined"
            onClick={loadTodayDates}
            sx={{ mr: 1 }}
          >
            Today
          </Button>
        </Box>
        <Box 
          ref={containerRef}
          onScroll={handleScroll}
          sx={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 2,
            maxHeight: '300px',
            overflowY: 'auto',
            pb: 1
          }}
        >
          {dates.map((date, index) => (
            <DateCell key={index} date={date} />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

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
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const diffInMs = now.getTime() - startOfYear.getTime();
      const dayCount = Math.floor(diffInMs / (1000 * 60 * 60 * 24)) + 1; // Add 1 to include today
      setDaysPassed(dayCount);
      
      // Check if current year is a leap year
      const isLeapYear = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0;
      setDaysInYear(isLeapYear ? 366 : 365);
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
    return proRatedMedicalExpense - annualRecord.used_medical_expense_baht;
  };

  const handleRefresh = () => {
    fetchData();
  };

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color 
  }: { 
    title: string; 
    value: number | string; 
    icon: React.ReactNode; 
    color: string; 
  }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" color="text.secondary">
            {title}
          </Typography>
          <Box sx={{ 
            backgroundColor: color, 
            borderRadius: '50%', 
            p: 1, 
            display: 'flex',
            color: 'white'
          }}>
            {icon}
          </Box>
        </Box>
        <Typography variant="h4" component="div" sx={{ mt: 'auto' }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

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
            <Box sx={{ flex: 1 }}>
              <StatCard 
                title="Used Medical Expenses" 
                value={`฿${annualRecord.used_medical_expense_baht}`}
                icon={<MedicalIcon />} 
                color="#4caf50" 
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <StatCard 
                title="Remaining Medical Budget" 
                value={`฿${calculateRemainingMedicalExpense().toFixed(0)}`}
                icon={<MoneyIcon />} 
                color="#ff9800" 
              />
            </Box>
          </Stack>

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