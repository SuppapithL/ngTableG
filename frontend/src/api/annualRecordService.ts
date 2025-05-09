import api from './axiosConfig';

export interface AnnualRecord {
  id: number;
  user_id: number;
  year: number;
  quota_plan_id?: number;
  rollover_vacation_day: number;
  used_vacation_day: number;
  used_sick_leave_day: number;
  worked_on_holiday_day: number;
  worked_day: number;
  used_medical_expense_baht: number;
  created_at?: string;
  updated_at?: string;
  // These come from joined quota_plans table
  quota_vacation_day?: number;
  quota_medical_expense_baht?: number;
}

export interface CreateAnnualRecordRequest {
  user_id: number;
  year: number;
  quota_plan_id: number;
  rollover_vacation_day: number;
  used_vacation_day: number;
  used_sick_leave_day: number;
  worked_on_holiday_day: number;
  worked_day: number;
  used_medical_expense_baht: number;
}

// Helper function to convert camelCase API response to snake_case for frontend use
const transformRecord = (record: any): AnnualRecord => ({
  id: record.id,
  user_id: record.userId,
  year: record.year,
  quota_plan_id: record.quotaPlanId,
  rollover_vacation_day: Number(record.rolloverVacationDay) || 0,
  used_vacation_day: Number(record.usedVacationDay) || 0,
  used_sick_leave_day: Number(record.usedSickLeaveDay) || 0,
  worked_on_holiday_day: Number(record.workedOnHolidayDay) || 0,
  worked_day: Number(record.workedDay) || 0,
  used_medical_expense_baht: Number(record.usedMedicalExpenseBaht) || 0,
  created_at: record.createdAt || '',
  updated_at: record.updatedAt || '',
  quota_vacation_day: Number(record.quotaVacationDay) || 0,
  quota_medical_expense_baht: Number(record.quotaMedicalExpenseBaht) || 0
});

const annualRecordService = {
  // Get all annual records (admin only)
  getAllAnnualRecords: async (): Promise<AnnualRecord[]> => {
    const response = await api.get('/annual-records');
    return response.data.map(transformRecord);
  },

  // Get current user's annual records
  getCurrentUserAnnualRecords: async (): Promise<AnnualRecord[]> => {
    console.log('Fetching current user annual records');
    try {
      // Check if there's a token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token available when fetching annual records');
        return [];
      }
      
      console.log(`Authorization token exists: ${token.substring(0, 10)}...`);
      console.log(`API Base URL: ${api.defaults.baseURL}`);
      
      // Make the request with explicit headers
      const response = await api.get('/current-user/annual-records', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('Annual records API response:', response);
      console.log('Records received:', response.data);
      
      if (!response.data || response.data.length === 0) {
        console.log('No annual records found for current user');
        return [];
      }
      
      return response.data.map(transformRecord);
    } catch (error: any) {
      console.error('Error fetching annual records:', error);
      console.error('Error details:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received:', error.request);
      }
      
      // Return empty array instead of throwing
      return [];
    }
  },

  // Get annual records by user ID
  getAnnualRecordsByUserId: async (userId: number): Promise<AnnualRecord[]> => {
    const response = await api.get(`/users/${userId}/annual-records`);
    return response.data.map(transformRecord);
  },

  // Get annual record by ID
  getAnnualRecordById: async (id: number): Promise<AnnualRecord> => {
    const response = await api.get(`/annual-records/${id}`);
    return transformRecord(response.data);
  },

  // Create new annual record
  createAnnualRecord: async (recordData: CreateAnnualRecordRequest): Promise<AnnualRecord> => {
    // Convert from snake_case to camelCase for backend
    const requestData = {
      userId: recordData.user_id,
      year: recordData.year,
      quotaPlanId: recordData.quota_plan_id,
      rolloverVacationDay: recordData.rollover_vacation_day,
      usedVacationDay: recordData.used_vacation_day,
      usedSickLeaveDay: recordData.used_sick_leave_day,
      workedOnHolidayDay: recordData.worked_on_holiday_day,
      workedDay: recordData.worked_day,
      usedMedicalExpenseBaht: recordData.used_medical_expense_baht
    };
    
    const response = await api.post('/annual-records', requestData);
    return transformRecord(response.data);
  },

  // Update annual record
  updateAnnualRecord: async (id: number, recordData: Partial<AnnualRecord>): Promise<AnnualRecord> => {
    // Convert from snake_case to camelCase for backend
    const requestData: any = {};
    
    if (recordData.user_id !== undefined) requestData.userId = recordData.user_id;
    if (recordData.year !== undefined) requestData.year = recordData.year;
    if (recordData.quota_plan_id !== undefined) requestData.quotaPlanId = recordData.quota_plan_id;
    if (recordData.rollover_vacation_day !== undefined) requestData.rolloverVacationDay = recordData.rollover_vacation_day;
    if (recordData.used_vacation_day !== undefined) requestData.usedVacationDay = recordData.used_vacation_day;
    if (recordData.used_sick_leave_day !== undefined) requestData.usedSickLeaveDay = recordData.used_sick_leave_day;
    if (recordData.worked_on_holiday_day !== undefined) requestData.workedOnHolidayDay = recordData.worked_on_holiday_day;
    if (recordData.worked_day !== undefined) requestData.workedDay = recordData.worked_day;
    if (recordData.used_medical_expense_baht !== undefined) requestData.usedMedicalExpenseBaht = recordData.used_medical_expense_baht;
    
    const response = await api.put(`/annual-records/${id}`, requestData);
    return transformRecord(response.data);
  },

  // Delete annual record
  deleteAnnualRecord: async (id: number): Promise<void> => {
    await api.delete(`/annual-records/${id}`);
  },

  // Admin: Assign quota plan to a specific user
  upsertAnnualRecordForUser: async (
    userId: number, 
    year: number, 
    quotaPlanId: number
  ): Promise<AnnualRecord> => {
    const response = await api.post('/admin/annual-records/upsert', {
      user_id: userId,
      year: year,
      quota_plan_id: quotaPlanId
    });
    return transformRecord(response.data);
  },

  // Admin: Assign quota plan to all users
  assignQuotaPlanToAllUsers: async (
    year: number, 
    quotaPlanId: number
  ): Promise<void> => {
    await api.post('/admin/annual-records/assign-quota-plan', {
      year: year,
      quota_plan_id: quotaPlanId
    });
  },

  // Admin: Create next year records for all users
  createNextYearAnnualRecords: async (
    thisYear: number, 
    nextYear: number
  ): Promise<AnnualRecord[]> => {
    const response = await api.post('/admin/annual-records/create-next-year', {
      this_year: thisYear,
      next_year: nextYear
    });
    return response.data.map(transformRecord);
  }
};

export default annualRecordService; 