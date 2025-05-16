import instance from './axiosConfig';

// Backend response interface (camelCase fields from PostgreSQL)
export interface MedicalExpenseResponse {
  id: number;
  userId: number;
  amount: number | { [key: string]: any };
  receiptName: string | { string?: string, valid?: boolean };
  receiptDate: string | { time?: string, valid?: boolean };
  note: string | { string?: string, valid?: boolean };
  createdAt: string | { [key: string]: any };
  leave_log_id?: number;
}

// Frontend interface (snake_case fields used in the app)
export interface MedicalExpense {
  id: number;
  user_id: number;
  amount: number;
  receipt_name: string;
  receipt_date: string;
  note: string;
  created_at: string;
  leave_log_id?: number;
}

export interface CreateMedicalExpenseRequest {
  user_id: number;
  amount: number;
  receipt_name: string;
  receipt_date: string;
  note: string;
  leave_log_id?: number;
}

export interface UpdateMedicalExpenseRequest {
  amount: number;
  receipt_name: string;
  receipt_date: string;
  note: string;
}

const medicalExpenseService = {
  // Get all medical expenses (admin)
  getAllMedicalExpenses: async (
    userId?: number,
    year?: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<MedicalExpenseResponse[]> => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (userId) params.append('user_id', userId.toString());
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      // Use direct fetch API
      const response = await fetch(`http://localhost:8080/api/medical-expenses?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      
      if (!response.ok) {
        console.error(`Error fetching medical expenses: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      console.log('Server response data:', data);
      
      // If year is specified, filter the results
      if (Array.isArray(data) && year) {
        return data.filter(expense => {
          // Extract year from the date string (YYYY-MM-DD)
          const expenseYear = new Date(expense.receiptDate).getFullYear();
          return expenseYear === year;
        });
      }
      
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching all medical expenses:', error);
      return [];
    }
  },
  
  // Get current user's medical expenses
  getCurrentUserMedicalExpenses: async (
    year?: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<MedicalExpenseResponse[]> => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      console.log('MEDICAL EXPENSES DEBUG: Attempting to fetch current user medical expenses:', {
        url: `http://localhost:8080/api/current-user/medical-expenses?${params.toString()}`,
        token: token ? `${token.substring(0, 10)}...` : 'none',
        year,
        limit,
        offset
      });
      
      // Use direct fetch API
      const response = await fetch(`http://localhost:8080/api/current-user/medical-expenses?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      
      if (!response.ok) {
        console.error(`Error fetching user medical expenses: ${response.status}`);
        console.error('Response text:', await response.text());
        return [];
      }
      
      const data = await response.json();
      console.log('MEDICAL EXPENSES DEBUG: Raw server data:', data);
      console.log('MEDICAL EXPENSES DEBUG: Data details:', {
        type: typeof data, 
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'N/A',
        sample: Array.isArray(data) && data.length > 0 ? data[0] : 'No data'
      });
      
      // Return the data directly - no mapping needed anymore
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching user medical expenses:', error);
      return [];
    }
  },
  
  // Get a single medical expense by ID
  getMedicalExpense: async (id: number): Promise<MedicalExpense | null> => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      // Use direct fetch API
      const response = await fetch(`http://localhost:8080/api/medical-expenses/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      
      if (!response.ok) {
        console.error(`Error fetching medical expense with ID ${id}: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching medical expense with ID ${id}:`, error);
      return null;
    }
  },
  
  // Create a new medical expense
  createMedicalExpense: async (expense: CreateMedicalExpenseRequest): Promise<MedicalExpense | null> => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      // Log the request for debugging
      console.log('Attempting to create medical expense with:', {
        url: 'http://localhost:8080/api/medical-expenses',
        data: expense,
        token: token ? `${token.substring(0, 10)}...` : 'none'
      });
      
      // Use direct fetch API for more reliable results
      const response = await fetch('http://localhost:8080/api/medical-expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(expense)
      });
      
      // Check for successful response
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error: ${response.status}`, errorText);
        throw new Error(`Failed to create medical expense: ${response.status} ${errorText}`);
      }
      
      // Parse and return the response data
      const data = await response.json();
      console.log('Medical expense created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error creating medical expense:', error);
      throw error;
    }
  },
  
  // Update an existing medical expense
  updateMedicalExpense: async (id: number, expense: UpdateMedicalExpenseRequest): Promise<MedicalExpense | null> => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      // Log the request for debugging
      console.log('Attempting to update medical expense:', {
        url: `http://localhost:8080/api/medical-expenses/${id}`,
        data: expense,
        token: token ? `${token.substring(0, 10)}...` : 'none'
      });
      
      // Use direct fetch API
      const response = await fetch(`http://localhost:8080/api/medical-expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(expense)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error: ${response.status}`, errorText);
        throw new Error(`Failed to update medical expense: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Medical expense updated successfully:', data);
      return data;
    } catch (error) {
      console.error(`Error updating medical expense with ID ${id}:`, error);
      throw error;
    }
  },
  
  // Delete a medical expense
  deleteMedicalExpense: async (id: number): Promise<boolean> => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      // Use direct fetch API
      const response = await fetch(`http://localhost:8080/api/medical-expenses/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      
      if (!response.ok) {
        console.error(`Error deleting medical expense with ID ${id}: ${response.status}`);
        throw new Error(`Failed to delete medical expense: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting medical expense with ID ${id}:`, error);
      throw error;
    }
  }
};

export default medicalExpenseService; 