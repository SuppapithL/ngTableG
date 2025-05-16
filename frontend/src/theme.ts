import { createTheme } from '@mui/material/styles';

// Color palette
const colors = {
  primary: '#3f51b5',
  secondary: '#f50057',
  error: '#f44336',
  warning: '#ff9800',
  success: '#4caf50',
  background: '#f5f5f5',
};

// Typography
const fontFamily = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
  '"Apple Color Emoji"',
  '"Segoe UI Emoji"',
  '"Segoe UI Symbol"',
].join(',');

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: colors.primary,
    },
    secondary: {
      main: colors.secondary,
    },
    error: {
      main: colors.error,
    },
    warning: {
      main: colors.warning,
    },
    success: {
      main: colors.success,
    },
    background: {
      default: colors.background,
    },
  },
  typography: {
    fontFamily,
  },
  components: {
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: colors.background,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

export default theme; 