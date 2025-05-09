import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  InputAdornment,
  Typography,
  Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { AnnualRecord } from '../api/annualRecordService';

type Order = 'asc' | 'desc';

interface Column {
  id: keyof AnnualRecord | 'available_vacation_days' | 'remaining_medical';
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: number) => string;
  adminOnly?: boolean;
}

interface AnnualRecordsTableProps {
  records: AnnualRecord[];
  title?: string;
  isAdmin?: boolean;
}

const AnnualRecordsTable: React.FC<AnnualRecordsTableProps> = ({ 
  records, 
  title = 'Annual Records',
  isAdmin = false 
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof AnnualRecord | 'available_vacation_days' | 'remaining_medical'>('year');
  const [order, setOrder] = useState<Order>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const columns: Column[] = [
    { id: 'user_id', label: 'User ID', minWidth: 80, adminOnly: true },
    { id: 'year', label: 'Year', minWidth: 80 },
    { id: 'quota_vacation_day', label: 'Vacation Quota', minWidth: 120 },
    { id: 'rollover_vacation_day', label: 'Rollover', minWidth: 120 },
    { id: 'used_vacation_day', label: 'Used Vacation', minWidth: 120 },
    { id: 'available_vacation_days', label: 'Available Vacation', minWidth: 150 },
    { id: 'used_sick_leave_day', label: 'Sick Leave', minWidth: 120 },
    { id: 'worked_on_holiday_day', label: 'Holiday Work', minWidth: 120 },
    { id: 'quota_medical_expense_baht', label: 'Medical Quota (฿)', minWidth: 150 },
    { id: 'used_medical_expense_baht', label: 'Used Medical (฿)', minWidth: 150 },
    { id: 'remaining_medical', label: 'Remaining Medical (฿)', minWidth: 180 },
  ];

  // Filter columns based on admin status
  const visibleColumns = columns.filter(column => !column.adminOnly || (column.adminOnly && isAdmin));

  const handleRequestSort = (property: keyof AnnualRecord | 'available_vacation_days' | 'remaining_medical') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  // Calculate available vacation days and remaining medical expenses
  const enhancedRecords = records.map(record => {
    // Ensure all values are numbers or default to 0
    const quotaVacation = record.quota_vacation_day || 0;
    const rollover = Number(record.rollover_vacation_day) || 0;
    const worked = Number(record.worked_on_holiday_day) || 0;
    const usedVacation = Number(record.used_vacation_day) || 0;
    const usedSick = Number(record.used_sick_leave_day) || 0;
    const quotaMedical = record.quota_medical_expense_baht || 0;
    const usedMedical = Number(record.used_medical_expense_baht) || 0;

    return {
      ...record,
      available_vacation_days: quotaVacation + rollover + worked - usedVacation - usedSick,
      remaining_medical: quotaMedical - usedMedical
    };
  });

  // Filter records based on search term
  const filteredRecords = enhancedRecords.filter(record => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const userIdStr = (record.user_id?.toString() || '').toLowerCase();
    const yearStr = (record.year?.toString() || '').toLowerCase(); 
    return userIdStr.includes(searchLower) || yearStr.includes(searchLower);
  });

  // Sort records
  const sortedRecords = filteredRecords.sort((a, b) => {
    let aValue: any = orderBy === 'available_vacation_days' || orderBy === 'remaining_medical' 
      ? a[orderBy] 
      : a[orderBy as keyof AnnualRecord];
    let bValue: any = orderBy === 'available_vacation_days' || orderBy === 'remaining_medical'
      ? b[orderBy]
      : b[orderBy as keyof AnnualRecord];
    
    // Both values are undefined
    if (aValue === undefined && bValue === undefined) return 0;
    // One value is undefined
    if (aValue === undefined) return order === 'asc' ? 1 : -1;
    if (bValue === undefined) return order === 'asc' ? -1 : 1;
    
    // Handle numeric comparison
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return order === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // Handle string comparison
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    
    return order === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });

  // Paginate records
  const paginatedRecords = sortedRecords.slice(
    page * rowsPerPage, 
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Paper sx={{ width: '100%', mb: 2 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom component="div">
          {title}
        </Typography>
        <TextField
          fullWidth
          placeholder={isAdmin ? "Search by user ID or year" : "Search by year"}
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
        />
      </Box>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="annual records table">
          <TableHead>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  style={{ minWidth: column.minWidth }}
                >
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={() => handleRequestSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((record) => (
                <TableRow hover tabIndex={-1} key={`${record.user_id}-${record.year}`}>
                  {isAdmin && <TableCell>{record.user_id || 'N/A'}</TableCell>}
                  <TableCell>{record.year || 'N/A'}</TableCell>
                  <TableCell>{record.quota_vacation_day !== undefined ? record.quota_vacation_day : 'N/A'}</TableCell>
                  <TableCell>{record.rollover_vacation_day !== undefined ? Number(record.rollover_vacation_day).toFixed(1) : 'N/A'}</TableCell>
                  <TableCell>{record.used_vacation_day !== undefined ? Number(record.used_vacation_day).toFixed(1) : 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={record.available_vacation_days !== undefined ? Number(record.available_vacation_days).toFixed(1) : 'N/A'} 
                      color={record.available_vacation_days < 0 ? 'error' : 'success'} 
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{record.used_sick_leave_day !== undefined ? Number(record.used_sick_leave_day).toFixed(1) : 'N/A'}</TableCell>
                  <TableCell>{record.worked_on_holiday_day !== undefined ? Number(record.worked_on_holiday_day).toFixed(1) : 'N/A'}</TableCell>
                  <TableCell>{record.quota_medical_expense_baht !== undefined ? Number(record.quota_medical_expense_baht).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>{record.used_medical_expense_baht !== undefined ? Number(record.used_medical_expense_baht).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={record.remaining_medical !== undefined ? Number(record.remaining_medical).toLocaleString() : 'N/A'} 
                      color={record.remaining_medical < 0 ? 'error' : 'success'} 
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} align="center">
                  No records found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredRecords.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default AnnualRecordsTable; 