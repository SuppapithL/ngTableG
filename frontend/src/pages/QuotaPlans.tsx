import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import MainLayout from '../components/Layout/MainLayout';
import { quotaPlanService } from '../api';
import { useSnackbar } from 'notistack';

interface QuotaPlan {
  id: number;
  plan_name: string;
  year: number;
  quota_vacation_day: number;
  quota_medical_expense_baht: number;
  created_at: string;
  updated_at: string;
}

const QuotaPlans: React.FC = () => {
  const [quotaPlans, setQuotaPlans] = useState<QuotaPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchQuotaPlans();
  }, []);

  const fetchQuotaPlans = async () => {
    setLoading(true);
    try {
      const response = await quotaPlanService.getAllQuotaPlans();
      setQuotaPlans(response);
    } catch (error) {
      console.error('Error fetching quota plans:', error);
      enqueueSnackbar('Failed to load quota plans', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="Quota Plans">
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" component="h1" gutterBottom>
              Quota Plans
            </Typography>
            <Button 
              variant="contained"
              color="primary"
              onClick={() => enqueueSnackbar('Quota plan creation is under development', { variant: 'info' })}
            >
              Add New Plan
            </Button>
          </Box>
          
          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Plan Name</TableCell>
                    <TableCell>Year</TableCell>
                    <TableCell>Vacation Days</TableCell>
                    <TableCell>Medical Expense (Baht)</TableCell>
                    <TableCell>Created At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quotaPlans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body1" sx={{ py: 2 }}>
                          No quota plans found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    quotaPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>{plan.id}</TableCell>
                        <TableCell>{plan.plan_name}</TableCell>
                        <TableCell>{plan.year}</TableCell>
                        <TableCell>{plan.quota_vacation_day}</TableCell>
                        <TableCell>{plan.quota_medical_expense_baht}</TableCell>
                        <TableCell>
                          {new Date(plan.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Container>
    </MainLayout>
  );
};

export default QuotaPlans; 