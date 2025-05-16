import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Box, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Button, Dialog, DialogActions, 
  DialogContent, DialogTitle, TextField, LinearProgress, Divider,
  IconButton, Tooltip, Card, CardContent
} from '@mui/material';
import { Add, Edit, Delete, ArrowBack } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import MainLayout from '../components/Layout/MainLayout';
import taskEstimateService, { TaskEstimate, TaskEstimateCreateRequest } from '../api/taskEstimateService';
import taskService from '../api/taskService';
import taskLogService from '../api/taskLogService';

const TaskEstimatesPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState<boolean>(true);
  const [estimates, setEstimates] = useState<TaskEstimate[]>([]);
  const [task, setTask] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [currentEstimate, setCurrentEstimate] = useState<TaskEstimate | null>(null);
  const [formData, setFormData] = useState<TaskEstimateCreateRequest>({
    task_id: parseInt(taskId || '0'),
    estimate_day: 0,
    note: ''
  });
  const [totalWorkedDays, setTotalWorkedDays] = useState<number>(0);
  const [latestEstimate, setLatestEstimate] = useState<TaskEstimate | null>(null);

  useEffect(() => {
    fetchTaskDetails();
    fetchEstimates();
    fetchWorkedDays();
  }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      if (taskId) {
        const taskData = await taskService.getTask(parseInt(taskId));
        setTask(taskData);
      }
    } catch (error) {
      console.error('Error fetching task details:', error);
      enqueueSnackbar('Failed to load task details', { variant: 'error' });
    }
  };

  const fetchEstimates = async () => {
    setLoading(true);
    try {
      if (taskId) {
        const fetchedEstimates = await taskEstimateService.getEstimatesForTask(parseInt(taskId));
        setEstimates(fetchedEstimates);
        
        // Find the latest estimate
        if (fetchedEstimates.length > 0) {
          const latest = fetchedEstimates.reduce((prev, current) => {
            return new Date(current.created_at) > new Date(prev.created_at) ? current : prev;
          });
          setLatestEstimate(latest);
        }
      }
    } catch (error) {
      console.error('Error fetching estimates:', error);
      enqueueSnackbar('Failed to load estimates', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkedDays = async () => {
    try {
      if (taskId) {
        const logs = await taskLogService.getLogsForTask(parseInt(taskId));
        const total = logs.reduce((sum, log) => {
          // Make sure to parse floats properly to avoid rounding errors
          return sum + parseFloat(log.worked_day.toString());
        }, 0);
        
        // Round to 2 decimal places to avoid floating-point precision issues
        setTotalWorkedDays(Math.round(total * 100) / 100);
      }
    } catch (error) {
      console.error('Error fetching worked days:', error);
    }
  };

  const handleOpenDialog = (estimate: TaskEstimate | null = null) => {
    if (estimate) {
      setCurrentEstimate(estimate);
      setFormData({
        task_id: parseInt(taskId || '0'),
        estimate_day: parseFloat(estimate.estimate_day.toString()),
        note: estimate.note || ''
      });
    } else {
      setCurrentEstimate(null);
      setFormData({
        task_id: parseInt(taskId || '0'),
        estimate_day: 0,
        note: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentEstimate(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'estimate_day' ? parseFloat(value) : value
    });
  };

  const handleSubmit = async () => {
    try {
      if (formData.estimate_day <= 0) {
        enqueueSnackbar('Estimate days must be greater than 0', { variant: 'error' });
        return;
      }

      if (currentEstimate) {
        // Update existing estimate
        await taskEstimateService.updateTaskEstimate(currentEstimate.id, {
          estimate_day: formData.estimate_day,
          note: formData.note
        });
        enqueueSnackbar('Estimate updated successfully', { variant: 'success' });
      } else {
        // Create new estimate
        await taskEstimateService.createTaskEstimate(formData);
        enqueueSnackbar('Estimate added successfully', { variant: 'success' });
      }
      
      handleCloseDialog();
      fetchEstimates();
      fetchWorkedDays();
    } catch (error) {
      console.error('Error saving estimate:', error);
      enqueueSnackbar('Failed to save estimate', { variant: 'error' });
    }
  };

  const handleDeleteEstimate = async (estimateId: number) => {
    if (window.confirm('Are you sure you want to delete this estimate?')) {
      try {
        await taskEstimateService.deleteTaskEstimate(estimateId);
        setEstimates(estimates.filter(est => est.id !== estimateId));
        enqueueSnackbar('Estimate deleted successfully', { variant: 'success' });
        fetchWorkedDays();
      } catch (error) {
        console.error('Error deleting estimate:', error);
        enqueueSnackbar('Failed to delete estimate', { variant: 'error' });
      }
    }
  };

  const calculateProgress = () => {
    if (!latestEstimate || latestEstimate.estimate_day === 0) return 0;
    const progress = (totalWorkedDays / parseFloat(latestEstimate.estimate_day.toString())) * 100;
    return Math.min(progress, 100); // Cap at 100%
  };
  
  // Format progress display for very small values
  const getProgressDisplay = () => {
    const progress = calculateProgress();
    if (totalWorkedDays === 0) return '0%';
    if (progress < 1) return '< 1%';
    return `${Math.round(progress)}%`;
  };
  
  // Get proper progress bar value (ensuring visibility for small values)
  const getProgressBarValue = () => {
    const progress = calculateProgress();
    return totalWorkedDays > 0 && progress < 1 ? 1 : progress;
  };

  return (
    <MainLayout title={`Task Estimates - ${task?.title || 'Loading...'}`}>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center">
              <IconButton 
                onClick={() => navigate('/tasks')}
                sx={{ mr: 2 }}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h4" component="h1" gutterBottom>
                Estimates for: {task?.title || 'Loading...'}
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Add Estimate
            </Button>
          </Box>

          {/* Progress Card */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Progress Tracking</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flexBasis: '100%', flexGrow: 1, minWidth: '240px', maxWidth: { xs: '100%', md: '48%' } }}>
                  <Typography variant="body1">
                    Current Estimate: {latestEstimate ? `${latestEstimate.estimate_day} days` : 'No estimate yet'}
                  </Typography>
                  <Typography variant="body1">
                    Days Worked: {totalWorkedDays.toFixed(2)} days
                  </Typography>
                  <Typography variant="body1" mt={1}>
                    Progress: {latestEstimate 
                      ? `${totalWorkedDays.toFixed(2)}/${latestEstimate.estimate_day} days (${getProgressDisplay()})`
                      : 'No estimate to track progress against'
                    }
                  </Typography>
                </Box>
                <Box sx={{ flexBasis: '100%', flexGrow: 1, minWidth: '240px', maxWidth: { xs: '100%', md: '48%' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={getProgressBarValue()} 
                        sx={{ height: 10, borderRadius: 5 }}
                        color={calculateProgress() > 100 ? "error" : "primary"}
                      />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                      <Typography variant="body2" color="text.secondary">
                        {getProgressDisplay()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Estimates Table */}
          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <LinearProgress sx={{ width: '100%' }} />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Estimate (Days)</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Created By</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {estimates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body1" sx={{ py: 2 }}>
                          No estimates found. Add one to get started!
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    estimates.map((estimate) => (
                      <TableRow key={estimate.id}>
                        <TableCell>{estimate.estimate_day}</TableCell>
                        <TableCell>{estimate.note || '-'}</TableCell>
                        <TableCell>{estimate.username || 'Unknown'}</TableCell>
                        <TableCell>{new Date(estimate.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleOpenDialog(estimate)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteEstimate(estimate.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        {/* Create/Edit Estimate Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{currentEstimate ? 'Edit Estimate' : 'Add Estimate'}</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                name="estimate_day"
                label="Estimated Days"
                type="number"
                value={formData.estimate_day}
                onChange={handleInputChange}
                fullWidth
                required
                inputProps={{ min: 0.5, step: 0.5 }}
                sx={{ mb: 2 }}
              />
              <TextField
                name="note"
                label="Notes"
                value={formData.note || ''}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={4}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {currentEstimate ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </MainLayout>
  );
};

export default TaskEstimatesPage; 