import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AnnualRecords from './pages/AnnualRecords';
import MedicalExpenses from './pages/MedicalExpenses';
import LeaveLogs from './pages/LeaveLogs';
import Holidays from './pages/Holidays';
import QuotaPlans from './pages/QuotaPlans';
import NotFound from './pages/NotFound';
import TaskCategories from './pages/TaskCategories';
import Tasks from './pages/Tasks';
import Users from './pages/Users';
import YearTransition from './pages/YearTransition';
import ClickUpAuth from './pages/ClickUpAuth';
import OAuthCallback from './pages/OAuthCallback';
import TaskEstimatesPage from './pages/TaskEstimatesPage';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/Layout/PrivateRoute';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/annual-records" element={<PrivateRoute><AnnualRecords /></PrivateRoute>} />
              <Route path="/medical-expenses" element={<PrivateRoute><MedicalExpenses /></PrivateRoute>} />
              <Route path="/leave-logs" element={<PrivateRoute><LeaveLogs /></PrivateRoute>} />
              <Route path="/holidays" element={<PrivateRoute><Holidays /></PrivateRoute>} />
              <Route path="/quota-plans" element={<PrivateRoute><QuotaPlans /></PrivateRoute>} />
              <Route path="/task-categories" element={<PrivateRoute><TaskCategories /></PrivateRoute>} />
              <Route path="/tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />
              <Route path="/tasks/:taskId/estimates" element={<PrivateRoute><TaskEstimatesPage /></PrivateRoute>} />
              <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
              <Route path="/year-transition" element={<PrivateRoute><YearTransition /></PrivateRoute>} />
              <Route path="/clickup-auth" element={<PrivateRoute><ClickUpAuth /></PrivateRoute>} />
              <Route path="/oauth/callback" element={<PrivateRoute><OAuthCallback /></PrivateRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
