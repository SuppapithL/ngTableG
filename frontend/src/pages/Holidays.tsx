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
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import MainLayout from '../components/Layout';
import { holidayService } from '../api';
import { Holiday, CreateHolidayRequest } from '../api/holidayService';
import { format, parseISO } from 'date-fns';

const Holidays: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editHolidayId, setEditHolidayId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<CreateHolidayRequest>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    name: '',
    note: ''
  });

  const fetchHolidays = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching holidays in component...');
      const data = await holidayService.getAllHolidays();
      console.log('Fetched holidays:', data);
      setHolidays(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load holidays:', err);
      const errorMessage = err?.response?.data?.error || 'Failed to load holidays';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleOpenDialog = (holiday?: Holiday) => {
    if (holiday) {
      setFormData({
        date: holiday.date,
        name: holiday.name,
        note: holiday.note || ''
      });
      setEditHolidayId(holiday.id);
    } else {
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        name: '',
        note: ''
      });
      setEditHolidayId(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    setError('');
    try {
      if (editHolidayId) {
        await holidayService.updateHoliday(editHolidayId, formData);
      } else {
        if (!formData.date || !formData.name) {
          setError('Date and Name are required');
          return;
        }
        console.log('Creating holiday with:', formData);
        await holidayService.createHoliday(formData as CreateHolidayRequest);
      }
      handleCloseDialog();
      await fetchHolidays();
    } catch (err: any) {
      console.error('Error saving holiday:', err);
      const errorMessage = err?.response?.data?.error || 'Failed to save holiday';
      setError(errorMessage);
    }
  };

  const handleDeleteHoliday = async (holidayId: number) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      try {
        await holidayService.deleteHoliday(holidayId);
        fetchHolidays();
      } catch (err: any) {
        console.error('Error deleting holiday:', err);
        setError('Failed to delete holiday');
      }
    }
  };

  if (loading && holidays.length === 0) {
    return (
      <MainLayout title="Holidays">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Holidays">
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Holiday Management</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Holiday
          </Button>
        </Box>

        {error && (
          <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
            <Typography>{error}</Typography>
          </Paper>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell>{holiday.id}</TableCell>
                  <TableCell>{holiday.date ? format(new Date(holiday.date), 'MMM dd, yyyy') : ''}</TableCell>
                  <TableCell>{holiday.name}</TableCell>
                  <TableCell>{holiday.note}</TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      color="primary" 
                      onClick={() => handleOpenDialog(holiday)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleDeleteHoliday(holiday.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {holidays.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No holidays found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      {/* Holiday Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editHolidayId ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              name="date"
              label="Date"
              type="date"
              value={formData.date}
              onChange={handleInputChange}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              name="name"
              label="Holiday Name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              name="note"
              label="Notes"
              value={formData.note}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.date || !formData.name}
          >
            {editHolidayId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default Holidays; 