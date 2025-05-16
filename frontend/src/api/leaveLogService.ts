import { format } from 'date-fns';

export interface LeaveLog {
  id: number;
  user_id: number;
  type: string;
  date: string;
  note: string;
  created_at: string;
  username?: string;
  worked_day?: number;
}

export interface CreateLeaveLogRequest {
  user_id: number;
  type: string;
  date: string;
  note: string;
  worked_day: number;
}

export interface UpdateLeaveLogRequest {
  type: string;
  date: string;
  note: string;
  worked_day?: number;
}

const API_BASE_URL = 'http://localhost:8080';

const leaveLogService = {
  // Get all leave logs (admin only)
  getAllLeaveLogs: async (
    userIdOrParams?: number | { user_id?: number, limit?: number, offset?: number }, 
    year?: number
  ): Promise<LeaveLog[]> => {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Handle the first argument which can be userId or params object
      if (typeof userIdOrParams === 'number') {
        queryParams.append('user_id', userIdOrParams.toString());
      } else if (userIdOrParams) {
        if (userIdOrParams.user_id) queryParams.append('user_id', userIdOrParams.user_id.toString());
        if (userIdOrParams.limit) queryParams.append('limit', userIdOrParams.limit.toString());
        if (userIdOrParams.offset) queryParams.append('offset', userIdOrParams.offset.toString());
      }
      
      // Handle year parameter if provided
      if (year) queryParams.append('year', year.toString());
      
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      // Use direct fetch API
      const response = await fetch(`${API_BASE_URL}/api/leave-logs?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      
      if (!response.ok) {
        console.error(`Error fetching leave logs: ${response.status}`);
        return [];
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching leave logs:', error);
      return [];
    }
  },
  
  // Get leave log by ID
  getLeaveLog: async (id: number): Promise<LeaveLog | null> => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      // Use direct fetch API
      const response = await fetch(`${API_BASE_URL}/api/leave-logs/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      
      if (!response.ok) {
        console.error(`Error fetching leave log: ${response.status}`);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching leave log with ID ${id}:`, error);
      return null;
    }
  },
  
  // Get current user's leave logs 
  // Accept either a params object or a simple year number for backward compatibility
  getCurrentUserLeaveLogs: async (
    yearOrParams?: number | { year?: number, type?: string, limit?: number, offset?: number }
  ): Promise<LeaveLog[]> => {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Handle either a year number or params object
      if (typeof yearOrParams === 'number') {
        queryParams.append('year', yearOrParams.toString());
      } else if (yearOrParams) {
        if (yearOrParams.year) queryParams.append('year', yearOrParams.year.toString());
        if (yearOrParams.type) queryParams.append('type', yearOrParams.type);
        if (yearOrParams.limit) queryParams.append('limit', yearOrParams.limit.toString());
        if (yearOrParams.offset) queryParams.append('offset', yearOrParams.offset.toString());
      }
      
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      console.log(`Fetching current user leave logs with params:`, yearOrParams);
      console.log(`Using token: ${token ? `${token.substring(0, 10)}...` : 'none'}`);
      
      // Use direct fetch API
      const response = await fetch(`${API_BASE_URL}/api/current-user/leave-logs?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      
      if (!response.ok) {
        console.error(`Error fetching current user leave logs: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      console.log('Received leave logs:', data);
      return data;
    } catch (error) {
      console.error('Error fetching current user leave logs:', error);
      return [];
    }
  },
  
  // Create a new leave log
  createLeaveLog: async (leaveLogData: CreateLeaveLogRequest): Promise<LeaveLog | null> => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      console.log('Creating leave log with data:', leaveLogData);
      console.log(`Using token: ${token ? `${token.substring(0, 10)}...` : 'none'}`);
      
      // Use direct fetch API
      const response = await fetch(`${API_BASE_URL}/api/leave-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(leaveLogData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error creating leave log: ${response.status}`, errorText);
        throw new Error(`Failed to create leave log: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Leave log created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error creating leave log:', error);
      throw error;
    }
  },
  
  // Update an existing leave log
  updateLeaveLog: async (id: number, leaveLogData: UpdateLeaveLogRequest): Promise<LeaveLog | null> => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      console.log(`Updating leave log ID ${id} with data:`, leaveLogData);
      
      // Use direct fetch API
      const response = await fetch(`${API_BASE_URL}/api/leave-logs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(leaveLogData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error updating leave log: ${response.status}`, errorText);
        throw new Error(`Failed to update leave log: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Leave log updated successfully:', data);
      return data;
    } catch (error) {
      console.error(`Error updating leave log with ID ${id}:`, error);
      throw error;
    }
  },
  
  // Delete a leave log
  deleteLeaveLog: async (id: number): Promise<boolean> => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      // Use direct fetch API
      const response = await fetch(`${API_BASE_URL}/api/leave-logs/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error deleting leave log: ${response.status}`, errorText);
        throw new Error(`Failed to delete leave log: ${response.status} ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting leave log with ID ${id}:`, error);
      throw error;
    }
  }
};

export default leaveLogService; 