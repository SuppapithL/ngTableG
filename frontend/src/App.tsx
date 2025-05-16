import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import theme from './theme';

// Pages
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import HolidaysPage from './pages/Holidays';
import AnnualRecordsPage from './pages/AnnualRecords';
import MedicalExpensesPage from './pages/MedicalExpenses';
import LeaveLogsPage from './pages/LeaveLogs';
import AdminQuotaManagementPage from './pages/AdminQuotaManagement';
import YearTransitionPage from './pages/YearTransition';
import TaskCategoriesPage from './pages/TaskCategories';
import TasksPage from './pages/Tasks';
import TaskEstimatesPage from './pages/TaskEstimatesPage';
import ClickUpAuthPage from './pages/ClickUpAuth';
import OAuthCallbackPage from './pages/OAuthCallback';
import NotFoundPage from './pages/NotFound';

// Private route wrapper component
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Waiting for auth state to load
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
      <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              
              {/* User Management */}
              <Route path="/users" element={<PrivateRoute><UsersPage /></PrivateRoute>} />
              
              {/* Holidays */}
              <Route path="/holidays" element={<PrivateRoute><HolidaysPage /></PrivateRoute>} />
              
              {/* Annual Records */}
              <Route path="/annual-records" element={<PrivateRoute><AnnualRecordsPage /></PrivateRoute>} />
              
              {/* Medical Expenses */}
              <Route path="/medical-expenses" element={<PrivateRoute><MedicalExpensesPage /></PrivateRoute>} />
              
              {/* Leave Logs */}
              <Route path="/leave-logs" element={<PrivateRoute><LeaveLogsPage /></PrivateRoute>} />
              
              {/* Quota Management */}
              <Route path="/quota-management" element={<PrivateRoute><AdminQuotaManagementPage /></PrivateRoute>} />
              <Route path="/quota-plans" element={<PrivateRoute><AdminQuotaManagementPage /></PrivateRoute>} />
              
              {/* Year Transition */}
              <Route path="/year-transition" element={<PrivateRoute><YearTransitionPage /></PrivateRoute>} />
              
              {/* Task Categories */}
              <Route path="/task-categories" element={<PrivateRoute><TaskCategoriesPage /></PrivateRoute>} />
              
              {/* Tasks */}
              <Route path="/tasks" element={<PrivateRoute><TasksPage /></PrivateRoute>} />
              <Route path="/tasks/:id/details" element={<PrivateRoute><TaskEstimatesPage /></PrivateRoute>} />
              
              {/* ClickUp Integration */}
              <Route path="/clickup-integration" element={<PrivateRoute><ClickUpAuthPage /></PrivateRoute>} />
              <Route path="/clickup-auth" element={<PrivateRoute><ClickUpAuthPage /></PrivateRoute>} />
              <Route path="/oauth/callback" element={<PrivateRoute><OAuthCallbackPage /></PrivateRoute>} />
              
              {/* Redirect any unknown routes to 404 */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
