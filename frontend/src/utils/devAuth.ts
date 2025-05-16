import userService from '../api/userService';
import instance from '../api/axiosConfig';

/**
 * Development helper function to automatically log in
 * This should only be used during development
 */
export const devLogin = async (): Promise<boolean> => {
  try {
    console.log('Attempting development auto-login...');
    
    // First, test if the server is reachable
    try {
      const response = await instance.get('/api/current-user', { timeout: 5000 });
      console.log('Server is reachable:', response.status);
    } catch (error) {
      console.error('Server connection test failed:', error);
      return false;
    }
    
    // Default admin credentials from the backend
    const response = await userService.login({
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('Development auto-login successful:', response);
    console.log('Auth token set:', localStorage.getItem('auth_token'));
    return true;
  } catch (error) {
    console.error('Development auto-login failed:', error);
    // Clear any invalid token
    localStorage.removeItem('auth_token');
    
    // Try a direct axios call as a fallback
    try {
      console.log('Attempting direct login call...');
      const response = await instance.post('/api/login', {
        username: 'admin',
        password: 'admin123'
      });
      
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        console.log('Direct login successful:', response.data);
        return true;
      }
    } catch (fallbackError) {
      console.error('Direct login attempt also failed:', fallbackError);
    }
    
    return false;
  }
};

/**
 * Check if the user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('auth_token');
  console.log('Authentication check - token exists:', !!token);
  return !!token;
};

/**
 * Clear authentication token (for logout or testing)
 */
export const clearAuth = (): void => {
  localStorage.removeItem('auth_token');
  console.log('Auth token cleared');
}; 