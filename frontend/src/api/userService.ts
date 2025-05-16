import api from './axiosConfig';

export interface User {
  id: number;
  username: string;
  email: string;
  user_type: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  user_type: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

const userService = {
  // Get all users
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get('/api/users');
    return response.data;
  },

  // Get user by ID
  getUserById: async (id: number): Promise<User> => {
    const response = await api.get(`/api/users/${id}`);
    return response.data;
  },

  // Get current user (for authentication)
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/api/current-user');
    return response.data;
  },

  // Create new user
  createUser: async (userData: CreateUserRequest): Promise<User> => {
    try {
      console.log('API createUser called with:', userData);
      const response = await api.post('/api/users', userData);
      console.log('API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API error details:', error);
      throw error;
    }
  },

  // Update user
  updateUser: async (id: number, userData: Partial<User>): Promise<User> => {
    const response = await api.put(`/api/users/${id}`, userData);
    return response.data;
  },

  // Delete user
  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/api/users/${id}`);
  },

  // Login
  login: async (credentials: LoginRequest) => {
    console.log('Login attempt with:', credentials.username);
    try {
      const response = await api.post('/api/login', credentials);
      console.log('Login response:', response.data);
      // Store the token in localStorage
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        console.log('Auth token stored:', response.data.token);
      } else {
        console.warn('No token received in login response');
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('auth_token');
  }
};

export default userService; 