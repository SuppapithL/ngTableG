import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:8080/api', // Updated to port 8080
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`Adding Authorization header for request to ${config.url}`);
    } else {
      console.log(`No auth token available for request to ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`Received successful response from ${response.config.url}`);
    return response;
  },
  (error) => {
    // Handle errors (like 401 unauthorized)
    console.error('API response error:', error);
    if (error.response && error.response.status === 401) {
      console.log('Unauthorized access detected - clearing token');
      // Redirect to login or refresh token
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 