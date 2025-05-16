import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  CardHeader, 
  CircularProgress, 
  Divider, 
  Typography 
} from '@mui/material';
import { 
  MedicalServices as MedicalIcon, 
  AttachMoney as MoneyIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { medicalExpenseService } from '../../api';
import { MedicalExpense } from '../../api/medicalExpenseService';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from './StatCard';
import { getDaysPassedInYear, getDaysInYear } from '../../utils/dateUtils';

interface MedicalExpenseSummaryProps {
  quotaMedicalExpenseBaht: number;
  usedMedicalExpenseBaht: number;
}

const MedicalExpenseSummary: React.FC<MedicalExpenseSummaryProps> = ({ 
  quotaMedicalExpenseBaht, 
  usedMedicalExpenseBaht 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<MedicalExpense[]>([]);
  const [error, setError] = useState('');
  const [totalUsed, setTotalUsed] = useState(0);
  const [currentYear] = useState(new Date().getFullYear());
  const [daysPassed, setDaysPassed] = useState(0);
  const [daysInYear, setDaysInYear] = useState(365);

  // Calculate days passed in year
  useEffect(() => {
    const now = new Date();
    setDaysPassed(getDaysPassedInYear(now));
    setDaysInYear(getDaysInYear(now.getFullYear()));
  }, []);

  useEffect(() => {
    const fetchMedicalExpenses = async () => {
      if (!user) return;
      
      setLoading(true);
      setError('');
      
      try {
        // Fetch medical expenses for current user and year
        const expensesData = await medicalExpenseService.getCurrentUserMedicalExpenses(
          currentYear,
          100,  // Increased limit to make sure we get all records
          0
        );
        
        if (Array.isArray(expensesData)) {
          // Map the data to match our frontend model if needed
          const mappedExpenses = expensesData.map(item => {
            return {
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
          });
          
          setExpenses(mappedExpenses);
          
          // Calculate total amount used
          const total = mappedExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
          setTotalUsed(total);
        }
      } catch (err) {
        console.error('Error fetching medical expenses:', err);
        setError('Failed to load medical expenses');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMedicalExpenses();
  }, [user, currentYear]);

  // Calculate remaining budget - using pro-rated calculation
  const calculateRemainingBudget = () => {
    // Calculate pro-rated medical expense based on days passed in the year
    const proRatedMedicalExpense = 
      (quotaMedicalExpenseBaht * daysPassed) / daysInYear;
    
    // Calculate remaining by subtracting used amount - allow negative values
    return proRatedMedicalExpense - totalUsed;
  };

  const remainingBudget = calculateRemainingBudget();
  const isBudgetExceeded = remainingBudget < 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        <Box sx={{ flex: 1 }}>
          <StatCard 
            title="Used Medical Expenses" 
            value={`฿${totalUsed.toFixed(0)}`}
            icon={<MedicalIcon />} 
            color="#4caf50" 
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <StatCard 
            title="Remaining Medical Budget" 
            value={`฿${remainingBudget.toFixed(0)}`}
            icon={isBudgetExceeded ? <WarningIcon /> : <MoneyIcon />} 
            color={isBudgetExceeded ? "#f44336" : "#ff9800"} 
          />
        </Box>
      </Box>
      
      {isBudgetExceeded && (
        <Typography 
          color="error" 
          sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <WarningIcon fontSize="small" />
          Budget exceeded! You have spent ฿{Math.abs(remainingBudget).toFixed(0)} over your pro-rated budget.
        </Typography>
      )}
      
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      
      {!loading && expenses.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardHeader title="Recent Medical Expenses" />
          <Divider />
          <CardContent>
            {expenses.slice(0, 5).map(expense => (
              <Box key={expense.id} sx={{ mb: 1, pb: 1, borderBottom: '1px solid #eee' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle2">
                      {expense.receipt_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(expense.receipt_date).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      ฿{Number(expense.amount).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MedicalExpenseSummary; 