import axios from 'axios';

// Create axios instance with default configuration
const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to attach auth token to every request
instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth_token');
    console.log(`Preparing ${config.method?.toUpperCase()} request to ${config.baseURL}${config.url}`);
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('Auth token attached to request');
    } else {
      console.warn('No auth token found for request');
    }
    
    // Debug headers
    console.log('Request headers:', config.headers);
    if (config.data) {
      console.log('Request payload:', config.data);
    }
    
    return config;
  },
  error => {
    console.error('Error in axios request interceptor:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
instance.interceptors.response.use(
  response => {
    console.log(`Response from ${response.config.url}: Status ${response.status}`);
    return response;
  },
  error => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received for request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
    console.error('Axios error config:', error.config);
    return Promise.reject(error);
  }
);

export default instance; 