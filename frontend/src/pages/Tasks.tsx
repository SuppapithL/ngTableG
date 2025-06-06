import React, { useState, useEffect, useCallback } from 'react';
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
  IconButton, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip, 
  Tooltip,
  Link,
  CircularProgress,
  Tab,
  Tabs,
  SelectChangeEvent
} from '@mui/material';
import { 
  Add, 
  Edit, 
  Delete, 
  Assessment, 
  CalendarToday, 
  Link as LinkIcon,
  Refresh
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import MainLayout from '../components/Layout/MainLayout';
import { 
  taskService, 
  taskCategoryService, 
  Task, 
  TaskCreateRequest, 
  TaskCategory,
} from '../api';
import taskEstimateService from '../api/taskEstimateService';
import { useNavigate } from 'react-router-dom';
import { TaskProgressBar } from '../components/Task';
import { TASK_STATUSES, TASK_STATUS_COLORS, DEFAULT_TASK_VALUES } from '../constants/taskConstants';
import { isLightColor } from '../utils/colorUtils';

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<any>({
    title: DEFAULT_TASK_VALUES.TITLE,
    task_category_id: '',
    note: DEFAULT_TASK_VALUES.NOTE,
    status: DEFAULT_TASK_VALUES.STATUS,
    status_color: DEFAULT_TASK_VALUES.STATUS_COLOR,
    clickup_list_id: '',
    estimate_day: DEFAULT_TASK_VALUES.ESTIMATE_DAY
  });
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    fetchTasks();
    fetchCategories();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await taskService.getAllTasks();
      setTasks(data);
      
      // Add a small delay to ensure task estimates are loaded
      setTimeout(() => {
        setLoading(false);
      }, 200);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      enqueueSnackbar('Failed to load tasks', { variant: 'error' });
      // Set loading to false immediately in case of error
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await taskCategoryService.getAllTaskCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      enqueueSnackbar('Failed to load categories', { variant: 'error' });
    }
  };

  const fetchTasksByCategory = async (categoryId: number) => {
    setLoading(true);
    try {
      const data = await taskService.getTasksByCategory(categoryId);
      setTasks(data);
      
      // Add a small delay to ensure task estimates are loaded
      setTimeout(() => {
        setLoading(false);
      }, 200);
    } catch (error) {
      console.error('Error fetching tasks by category:', error);
      enqueueSnackbar('Failed to load tasks for this category', { variant: 'error' });
      // Set loading to false immediately in case of error
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    if (categoryId === null) {
      fetchTasks();
    } else {
      fetchTasksByCategory(categoryId);
    }
  };

  const handleOpenDialog = (task: Task | null = null) => {
    if (task) {
      // Edit existing task
      setCurrentTask(task);
      setFormData({
        title: task.title || DEFAULT_TASK_VALUES.TITLE,
        task_category_id: task.task_category_id || '',
        note: task.note || DEFAULT_TASK_VALUES.NOTE,
        status: task.status || DEFAULT_TASK_VALUES.STATUS,
        status_color: task.status_color || DEFAULT_TASK_VALUES.STATUS_COLOR,
        estimate_day: 1 // Use a default value for edit mode
      });
    } else {
      // Create new task
      setCurrentTask(null);
      setFormData({
        title: DEFAULT_TASK_VALUES.TITLE,
        task_category_id: '',
        note: DEFAULT_TASK_VALUES.NOTE,
        status: DEFAULT_TASK_VALUES.STATUS,
        status_color: DEFAULT_TASK_VALUES.STATUS_COLOR,
        clickup_list_id: '',
        estimate_day: DEFAULT_TASK_VALUES.ESTIMATE_DAY
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = e.target.name as string;
    const value = e.target.value;
    
    // Convert estimate_day to a number
    if (name === 'estimate_day') {
      setFormData({
        ...formData,
        [name]: parseFloat(value as string) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // New handler for Select components
  const handleSelectChange = (e: SelectChangeEvent<any>) => {
    const name = e.target.name as string;
    const value = e.target.value;
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.title) {
        enqueueSnackbar('Title is required', { variant: 'error' });
        return;
      }

      console.log('Submitting task data:', formData);
      console.log('Estimate day value:', formData.estimate_day, typeof formData.estimate_day);

      if (currentTask) {
        // Update existing task
        const updatedTask = await taskService.updateTask(currentTask.id, formData);
        console.log('Task updated successfully:', updatedTask);
        enqueueSnackbar('Task updated successfully', { variant: 'success' });
      } else {
        // Create new task
        const newTask = await taskService.createTask(formData);
        console.log('Task created successfully:', newTask);
        enqueueSnackbar('Task created successfully', { variant: 'success' });
        
        // The estimate is now created automatically in the taskService.createTask method
      }
      
      handleCloseDialog();
      fetchTasks();
    } catch (error: any) {
      console.error('Error saving task:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Failed to save task';
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        if (error.response.data && error.response.data.error) {
          errorMessage += `: ${error.response.data.error}`;
        } else if (error.response.statusText) {
          errorMessage += `: ${error.response.statusText}`;
        }
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await taskService.deleteTask(taskId);
        setTasks(tasks.filter(task => task.id !== taskId));
        enqueueSnackbar('Task deleted successfully', { variant: 'success' });
      } catch (error) {
        console.error('Error deleting task:', error);
        enqueueSnackbar('Failed to delete task', { variant: 'error' });
      }
    }
  };

  const handleViewEstimates = (taskId: number) => {
    navigate(`/tasks/${taskId}/estimates`);
  };

  const handleViewLogs = (taskId: number) => {
    navigate(`/tasks/${taskId}/logs`);
  };

  const getStatusChip = (status: string, color: string) => {
    return (
      <Chip 
        label={status} 
        style={{ 
          backgroundColor: color || '#cccccc',
          color: isLightColor(color) ? '#000000' : '#ffffff'
        }} 
      />
    );
  };

  return (
    <MainLayout title="Tasks">
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" component="h1" gutterBottom>
              Tasks
            </Typography>
            <Box>
              <Button 
                variant="outlined" 
                startIcon={<Refresh />} 
                onClick={fetchTasks}
                sx={{ mr: 2 }}
              >
                Refresh
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
              >
                Add Task
              </Button>
            </Box>
          </Box>
          
          <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Filter by Category
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
              <Chip 
                label="All Categories" 
                onClick={() => handleCategoryChange(null)}
                color={selectedCategory === null ? "primary" : "default"}
              />
              {categories.map(category => (
                <Chip 
                  key={category.id} 
                  label={category.name}
                  onClick={() => handleCategoryChange(category.id)}
                  color={selectedCategory === category.id ? "primary" : "default"}
                />
              ))}
            </Box>
          </Paper>

          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>ClickUp</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body1" sx={{ py: 2 }}>
                          No tasks found. Create one to get started!
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>{task.category_name || 'Uncategorized'}</TableCell>
                        <TableCell>
                          {task.status ? getStatusChip(task.status, task.status_color || '#cccccc') : 'None'}
                        </TableCell>
                        <TableCell>
                          <TaskProgressBar taskId={task.id} />
                        </TableCell>
                        <TableCell>
                          {task.url ? (
                            <Tooltip title="Open in ClickUp">
                              <IconButton 
                                size="small" 
                                component="a" 
                                href={task.url} 
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <LinkIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            'Not linked'
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleOpenDialog(task)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteTask(task.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                          <Tooltip title="View Estimates">
                            <IconButton size="small" onClick={() => handleViewEstimates(task.id)}>
                              <Assessment fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Logs">
                            <IconButton size="small" onClick={() => handleViewLogs(task.id)}>
                              <CalendarToday fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        {/* Create/Edit Task Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>{currentTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <TextField
                  name="title"
                  label="Task Title"
                  value={formData.title}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flexGrow: 1, minWidth: '240px' }}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="task_category_id"
                    value={formData.task_category_id || ''}
                    onChange={handleSelectChange}
                    label="Category"
                  >
                    <MenuItem value="">None</MenuItem>
                    {categories.map(category => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: '240px' }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status || ''}
                    onChange={handleSelectChange}
                    label="Status"
                  >
                    <MenuItem value={TASK_STATUSES.TODO}>To Do</MenuItem>
                    <MenuItem value={TASK_STATUSES.IN_PROGRESS}>In Progress</MenuItem>
                    <MenuItem value={TASK_STATUSES.IN_REVIEW}>In Review</MenuItem>
                    <MenuItem value={TASK_STATUSES.DONE}>Done</MenuItem>
                  </Select>
                </FormControl>
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: '240px' }}>
                <FormControl fullWidth>
                  <InputLabel>Status Color</InputLabel>
                  <Select
                    name="status_color"
                    value={formData.status_color || '#cccccc'}
                    onChange={handleSelectChange}
                    label="Status Color"
                  >
                    <MenuItem value={TASK_STATUS_COLORS.DEFAULT}>Default Gray</MenuItem>
                    <MenuItem value={TASK_STATUS_COLORS.GREEN}>Green</MenuItem>
                    <MenuItem value={TASK_STATUS_COLORS.ORANGE}>Orange</MenuItem>
                    <MenuItem value={TASK_STATUS_COLORS.BLUE}>Blue</MenuItem>
                    <MenuItem value={TASK_STATUS_COLORS.RED}>Red</MenuItem>
                    <MenuItem value={TASK_STATUS_COLORS.PURPLE}>Purple</MenuItem>
                  </Select>
                </FormControl>
                </Box>
              {!currentTask && (
                  <Box sx={{ flexGrow: 1, minWidth: '240px' }}>
                  <TextField
                    name="clickup_list_id"
                    label="ClickUp List ID (optional)"
                    value={formData.clickup_list_id || ''}
                    onChange={handleInputChange}
                    fullWidth
                    helperText="If provided, a task will be created in ClickUp"
                  />
                  </Box>
              )}
                <Box sx={{ flexGrow: 1, minWidth: '240px' }}>
                  <TextField
                    name="estimate_day"
                    label="Time Estimate (days)"
                    type="number"
                    value={formData.estimate_day}
                    onChange={handleInputChange}
                    fullWidth
                    inputProps={{ min: 0.5, step: 0.5 }}
                    helperText="Estimated time to complete this task"
                  />
                </Box>
              </Box>
              <Box>
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
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {currentTask ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </MainLayout>
  );
};

export default TasksPage; 