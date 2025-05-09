import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  CircularProgress
} from '@mui/material';
import { AnnualRecord } from '../api/annualRecordService';
import { QuotaPlan } from '../api/quotaPlanService';
import { User } from '../api/userService';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, color = '#1976d2' }) => (
  <Paper 
    elevation={2} 
    sx={{ p: 2, height: '100%', borderTop: `4px solid ${color}` }}
  >
    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
      {title}
    </Typography>
    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
      {value}
    </Typography>
    {subtitle && (
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    )}
  </Paper>
);

interface QuotaDashboardProps {
  annualRecords: AnnualRecord[];
  quotaPlans: QuotaPlan[];
  users: User[];
  selectedYear: number;
  loading?: boolean;
}

const QuotaDashboard: React.FC<QuotaDashboardProps> = ({ 
  annualRecords, 
  quotaPlans, 
  users,
  selectedYear,
  loading = false
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Filter records and plans by selected year
  const yearRecords = annualRecords.filter(record => record.year === selectedYear);
  const yearPlans = quotaPlans.filter(plan => plan.year === selectedYear);

  // Calculate statistics
  const totalUsers = users.length;
  const usersWithRecords = new Set(yearRecords.map(record => record.user_id)).size;
  
  // Calculate average days used
  const totalVacationDaysUsed = yearRecords.reduce((sum, record) => {
    const days = record.used_vacation_day || 0;
    return sum + parseFloat(days.toString());
  }, 0);
  const avgVacationDaysUsed = usersWithRecords > 0 ? totalVacationDaysUsed / usersWithRecords : 0;

  // Most common plan
  const planCounts = yearRecords.reduce((counts, record) => {
    const planId = record.quota_plan_id;
    if (planId) {
      counts[planId] = (counts[planId] || 0) + 1;
    }
    return counts;
  }, {} as Record<number, number>);

  let mostUsedPlanName = 'None';
  let mostUsedCount = 0;
  Object.entries(planCounts).forEach(([planId, count]) => {
    if (count > mostUsedCount) {
      mostUsedCount = count;
      const plan = quotaPlans.find(p => p.id === parseInt(planId, 10));
      mostUsedPlanName = plan?.plan_name || 'Default Plan';
    }
  });

  // Calculate total medical expenses with null check
  const totalMedicalExpenses = yearRecords.reduce((sum, record) => {
    const expense = record.used_medical_expense_baht || 0;
    return sum + parseFloat(expense.toString());
  }, 0);

  // Count users who claimed expenses
  const usersWithExpenses = yearRecords.filter(r => {
    const expense = r.used_medical_expense_baht || 0;
    return parseFloat(expense.toString()) > 0;
  }).length;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        {selectedYear} Quota Dashboard
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
        <Box sx={{ flex: '1 1 20%', minWidth: '200px' }}>
          <StatCard
            title="Users with Records"
            value={`${usersWithRecords}/${totalUsers}`}
            subtitle={`${usersWithRecords > 0 ? Math.round((usersWithRecords / totalUsers) * 100) : 0}% of users have records`}
            color="#2196f3"
          />
        </Box>
        
        <Box sx={{ flex: '1 1 20%', minWidth: '200px' }}>
          <StatCard
            title="Active Quota Plans"
            value={yearPlans.length}
            subtitle={`Most used: ${mostUsedPlanName}`}
            color="#4caf50"
          />
        </Box>
        
        <Box sx={{ flex: '1 1 20%', minWidth: '200px' }}>
          <StatCard
            title="Total Vacation Days Used"
            value={totalVacationDaysUsed.toFixed(1)}
            subtitle={`Average: ${avgVacationDaysUsed.toFixed(1)} days per user`}
            color="#ff9800"
          />
        </Box>
        
        <Box sx={{ flex: '1 1 20%', minWidth: '200px' }}>
          <StatCard
            title="Total Medical Expenses"
            value={`฿${totalMedicalExpenses.toLocaleString()}`}
            subtitle={`${usersWithExpenses} users claimed expenses`}
            color="#f44336"
          />
        </Box>
      </Box>
      
      <Divider sx={{ my: 3 }} />
    </Box>
  );
};

export default QuotaDashboard; 