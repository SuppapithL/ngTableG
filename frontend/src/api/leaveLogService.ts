import axios from './axiosConfig';

export interface LeaveLog {
  id: number;
  user_id: number;
  username: string;
  type: string;
  date: string;
  note: string;
  created_at: string;
}

export interface CreateLeaveLogRequest {
  user_id: number;
  type: string;
  date: string;
  note: string;
}

export interface UpdateLeaveLogRequest {
  type: string;
  date: string;
  note: string;
}

const leaveLogService = {
  // Get all leave logs (admin)
  getAllLeaveLogs: async (
    userId?: number,
    year?: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<LeaveLog[]> => {
    try {
      let url = '/api/leave_logs';
      
      // Add query parameters if provided
      const params = new URLSearchParams();
      if (userId) params.append('user_id', userId.toString());
      if (year) params.append('year', year.toString());
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      const response = await axios.get(`${url}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching all leave logs:', error);
      return [];
    }
  },
  
  // Get current user's leave logs
  getCurrentUserLeaveLogs: async (
    year?: number,
    type?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<LeaveLog[]> => {
    try {
      let url = '/api/users/me/leave_logs';
      
      // Add query parameters if provided
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (type) params.append('type', type);
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      const response = await axios.get(`${url}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user leave logs:', error);
      return [];
    }
  },
  
  // Get a single leave log by ID
  getLeaveLog: async (id: number): Promise<LeaveLog | null> => {
    try {
      const response = await axios.get(`/api/leave_logs/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching leave log with ID ${id}:`, error);
      return null;
    }
  },
  
  // Create a new leave log
  createLeaveLog: async (leaveLog: CreateLeaveLogRequest): Promise<LeaveLog | null> => {
    try {
      const response = await axios.post('/api/leave_logs', leaveLog);
      return response.data;
    } catch (error) {
      console.error('Error creating leave log:', error);
      throw error;
    }
  },
  
  // Update an existing leave log
  updateLeaveLog: async (id: number, leaveLog: UpdateLeaveLogRequest): Promise<LeaveLog | null> => {
    try {
      const response = await axios.put(`/api/leave_logs/${id}`, leaveLog);
      return response.data;
    } catch (error) {
      console.error(`Error updating leave log with ID ${id}:`, error);
      throw error;
    }
  },
  
  // Delete a leave log
  deleteLeaveLog: async (id: number): Promise<boolean> => {
    try {
      await axios.delete(`/api/leave_logs/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting leave log with ID ${id}:`, error);
      throw error;
    }
  }
};

export default leaveLogService; 