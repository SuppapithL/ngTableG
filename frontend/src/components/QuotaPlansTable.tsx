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
  IconButton,
  Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { QuotaPlan } from '../api/quotaPlanService';

type Order = 'asc' | 'desc';

interface Column {
  id: keyof QuotaPlan;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: number) => string;
}

const columns: Column[] = [
  { id: 'id', label: 'ID', minWidth: 50 },
  { id: 'plan_name', label: 'Plan Name', minWidth: 150 },
  { id: 'year', label: 'Year', minWidth: 80 },
  { id: 'quota_vacation_day', label: 'Vacation Days', minWidth: 120 },
  { id: 'quota_medical_expense_baht', label: 'Medical Expense (฿)', minWidth: 150 },
  { id: 'created_at', label: 'Created At', minWidth: 150 },
  { id: 'created_by_user_id', label: 'Created By', minWidth: 100 },
];

interface QuotaPlansTableProps {
  plans: QuotaPlan[];
  title?: string;
  onEdit?: (plan: QuotaPlan) => void;
  onDelete?: (plan: QuotaPlan) => void;
  showActions?: boolean;
}

const QuotaPlansTable: React.FC<QuotaPlansTableProps> = ({ 
  plans,
  title = 'Quota Plans', 
  onEdit,
  onDelete,
  showActions = true
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof QuotaPlan>('year');
  const [order, setOrder] = useState<Order>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const handleRequestSort = (property: keyof QuotaPlan) => {
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

  // Filter plans based on search term
  const filteredPlans = plans.filter(plan => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (plan.plan_name ? plan.plan_name.toLowerCase() : '').includes(searchLower) ||
      (plan.year ? plan.year.toString() : '').includes(searchTerm) ||
      (plan.created_by_user_id ? plan.created_by_user_id.toString() : '').includes(searchTerm)
    );
  });

  // Sort plans
  const sortedPlans = filteredPlans.sort((a, b) => {
    // Handle undefined cases
    const aValue = a[orderBy];
    const bValue = b[orderBy];
    
    // Both values are undefined
    if (!aValue && !bValue) return 0;
    // One value is undefined
    if (!aValue) return order === 'asc' ? 1 : -1;
    if (!bValue) return order === 'asc' ? -1 : 1;
    
    // Both values exist, compare based on type
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return order === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    // Compare numbers or coerce to number
    const aNum = typeof aValue === 'number' ? aValue : parseFloat(String(aValue));
    const bNum = typeof bValue === 'number' ? bValue : parseFloat(String(bValue));
    
    return order === 'asc' ? aNum - bNum : bNum - aNum;
  });

  // Paginate plans
  const paginatedPlans = sortedPlans.slice(
    page * rowsPerPage, 
    page * rowsPerPage + rowsPerPage
  );

  // Format date string
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Safe text rendering
  const safeText = (text: any): string => {
    if (text === null || text === undefined) return 'N/A';
    return text.toString();
  };

  // Safe number formatting
  const safeNumber = (num: any): string => {
    if (num === null || num === undefined) return 'N/A';
    if (typeof num === 'number') return num.toLocaleString();
    try {
      return parseFloat(num).toLocaleString();
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <Paper sx={{ width: '100%', mb: 2 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom component="div">
          {title}
        </Typography>
        <TextField
          fullWidth
          placeholder="Search by name, year, or creator"
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
        <Table stickyHeader aria-label="quota plans table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
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
              {showActions && <TableCell align="center">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedPlans.length > 0 ? (
              paginatedPlans.map((plan) => (
                <TableRow hover tabIndex={-1} key={plan.id}>
                  <TableCell>{plan.id}</TableCell>
                  <TableCell>
                    <Typography fontWeight="medium">
                      {safeText(plan.plan_name)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={plan.year || new Date().getFullYear()} 
                      color="primary" 
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{safeText(plan.quota_vacation_day)}</TableCell>
                  <TableCell>{safeNumber(plan.quota_medical_expense_baht)}</TableCell>
                  <TableCell>{formatDate(plan.created_at)}</TableCell>
                  <TableCell>{plan.created_by_user_id || 'System'}</TableCell>
                  {showActions && (
                    <TableCell align="center">
                      <Box>
                        {onEdit && (
                          <IconButton size="small" onClick={() => onEdit(plan)} color="primary">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                        {onDelete && (
                          <IconButton size="small" onClick={() => onDelete(plan)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + (showActions ? 1 : 0)} align="center">
                  No quota plans found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredPlans.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default QuotaPlansTable; 