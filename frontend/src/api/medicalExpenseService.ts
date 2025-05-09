import axios from './axiosConfig';

export interface MedicalExpense {
  id: number;
  user_id: number;
  amount: number;
  receipt_name: string;
  receipt_date: string;
  note: string;
  created_at: string;
}

export interface CreateMedicalExpenseRequest {
  user_id: number;
  amount: number;
  receipt_name: string;
  receipt_date: string;
  note: string;
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
  ): Promise<MedicalExpense[]> => {
    try {
      let url = '/api/medical_expenses';
      
      // Add query parameters if provided
      const params = new URLSearchParams();
      if (userId) params.append('user_id', userId.toString());
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      // If year is provided, we need to handle it specially
      // Our backend doesn't directly support year filtering via query param
      // We'll handle this client-side for now
      
      const response = await axios.get(`${url}?${params.toString()}`);
      
      // If year is specified, filter the results
      if (year && response.data && Array.isArray(response.data)) {
        return response.data.filter(expense => {
          // Extract year from the date string (YYYY-MM-DD)
          const expenseYear = new Date(expense.receipt_date).getFullYear();
          return expenseYear === year;
        });
      }
      
      return response.data;
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
  ): Promise<MedicalExpense[]> => {
    try {
      let url = '/api/users/me/medical_expenses';
      
      // Add query parameters if provided
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      const response = await axios.get(`${url}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user medical expenses:', error);
      return [];
    }
  },
  
  // Get a single medical expense by ID
  getMedicalExpense: async (id: number): Promise<MedicalExpense | null> => {
    try {
      const response = await axios.get(`/api/medical_expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching medical expense with ID ${id}:`, error);
      return null;
    }
  },
  
  // Create a new medical expense
  createMedicalExpense: async (expense: CreateMedicalExpenseRequest): Promise<MedicalExpense | null> => {
    try {
      const response = await axios.post('/api/medical_expenses', expense);
      return response.data;
    } catch (error) {
      console.error('Error creating medical expense:', error);
      throw error;
    }
  },
  
  // Update an existing medical expense
  updateMedicalExpense: async (id: number, expense: UpdateMedicalExpenseRequest): Promise<MedicalExpense | null> => {
    try {
      const response = await axios.put(`/api/medical_expenses/${id}`, expense);
      return response.data;
    } catch (error) {
      console.error(`Error updating medical expense with ID ${id}:`, error);
      throw error;
    }
  },
  
  // Delete a medical expense
  deleteMedicalExpense: async (id: number): Promise<boolean> => {
    try {
      await axios.delete(`/api/medical_expenses/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting medical expense with ID ${id}:`, error);
      throw error;
    }
  }
};

export default medicalExpenseService; 