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
  quota_plan_id?: number;
  rollover_vacation_day: number;
  used_vacation_day: number;
  used_sick_leave_day: number;
  worked_on_holiday_day: number;
  worked_day: number;
  used_medical_expense_baht: number;
}

export interface SyncRequest {
  user_id: number;
  year?: number;
}

// Helper function to transform date fields
const transformRecord = (record: any): AnnualRecord => {
  // Ensure dates are properly formatted
  if (record.created_at && typeof record.created_at === 'string') {
    record.created_at = new Date(record.created_at).toISOString();
  }
  if (record.updated_at && typeof record.updated_at === 'string') {
    record.updated_at = new Date(record.updated_at).toISOString();
  }
  
  // Convert camelCase to snake_case for frontend consumption
  const transformed: any = { ...record };
  if (record.userId !== undefined) transformed.user_id = record.userId;
  if (record.quotaPlanId !== undefined) transformed.quota_plan_id = record.quotaPlanId;
  if (record.rolloverVacationDay !== undefined) transformed.rollover_vacation_day = record.rolloverVacationDay;
  if (record.usedVacationDay !== undefined) transformed.used_vacation_day = record.usedVacationDay;
  if (record.usedSickLeaveDay !== undefined) transformed.used_sick_leave_day = record.usedSickLeaveDay;
  if (record.workedOnHolidayDay !== undefined) transformed.worked_on_holiday_day = record.workedOnHolidayDay;
  if (record.workedDay !== undefined) transformed.worked_day = record.workedDay;
  if (record.usedMedicalExpenseBaht !== undefined) transformed.used_medical_expense_baht = record.usedMedicalExpenseBaht;
  if (record.quotaVacationDay !== undefined) transformed.quota_vacation_day = record.quotaVacationDay;
  if (record.quotaMedicalExpenseBaht !== undefined) transformed.quota_medical_expense_baht = record.quotaMedicalExpenseBaht;
  
  return transformed as AnnualRecord;
};

const annualRecordService = {
  // Get all annual records (admin only)
  getAllAnnualRecords: async (): Promise<AnnualRecord[]> => {
    const response = await api.get('/api/annual-records');
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
      const response = await api.get('/api/current-user/annual-records', {
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
    const response = await api.get(`/api/users/${userId}/annual-records`);
    return response.data.map(transformRecord);
  },

  // Get annual record by ID
  getAnnualRecordById: async (id: number): Promise<AnnualRecord> => {
    const response = await api.get(`/api/annual-records/${id}`);
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
    
    const response = await api.post('/api/annual-records', requestData);
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
    
    const response = await api.put(`/api/annual-records/${id}`, requestData);
    return transformRecord(response.data);
  },

  // Delete annual record
  deleteAnnualRecord: async (id: number): Promise<void> => {
    await api.delete(`/api/annual-records/${id}`);
  },

  // Admin: Assign quota plan to a specific user
  upsertAnnualRecordForUser: async (
    userId: number, 
    year: number, 
    quotaPlanId: number
  ): Promise<AnnualRecord> => {
    const response = await api.post(`/api/users/${userId}/annual-records/current-year`, {
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
    await api.post(`/api/annual-records/quota-plan/${quotaPlanId}/assign-to-all`, {
      year: year,
      quota_plan_id: quotaPlanId
    });
  },

  // Admin: Create next year records for all users
  createNextYearAnnualRecords: async (
    thisYear: number, 
    nextYear: number
  ): Promise<AnnualRecord[]> => {
    const response = await api.post('/api/annual-records/create-next-year', {
      this_year: thisYear,
      next_year: nextYear
    });
    return response.data.map(transformRecord);
  },

  // Get annual record for a specific user and year
  getAnnualRecord: async (userId: number, year: number): Promise<AnnualRecord> => {
    const response = await api.get(`/api/annual-records/user/${userId}/year/${year}`);
    return response.data;
  },

  // Ensure an annual record exists for a user and year
  ensureAnnualRecord: async (userId: number, year: number): Promise<AnnualRecord> => {
    const response = await api.post(`/api/annual-records/ensure/${userId}/${year}`);
    return response.data;
  },

  // Sync annual record for a specific user
  syncUserRecord: async (userId: number, year?: number): Promise<AnnualRecord> => {
    // No-op: Annual records are now automatically synced on the server
    console.log('Manual sync no longer needed - records are automatically synced');
    
    // Instead of making an API call, just fetch the current record
    const records = await annualRecordService.getAnnualRecordsByUserId(userId);
    const targetYear = year || new Date().getFullYear();
    const record = records.find(r => r.year === targetYear);
    
    if (!record) {
      throw new Error(`No annual record found for user ${userId} in year ${targetYear}`);
    }
    
    return record;
  },

  // Sync all annual records for a specific year
  syncAllRecords: async (year: number): Promise<AnnualRecord[]> => {
    // No-op: Annual records are now automatically synced on the server
    console.log('Manual sync no longer needed - records are automatically synced');
    
    // Instead of making an API call, just fetch the current records for this year
    return annualRecordService.getAnnualRecordsByYear(year);
  },

  // Schedule year-end rollover
  scheduleYearEndRollover: async (): Promise<{ message: string }> => {
    // No-op: Year-end processing is now handled automatically on the server
    console.log('Manual year-end rollover no longer needed - handled automatically on the server');
    return { message: "Year-end rollover is now automated on the server" };
  },

  // Get all annual records for a specific year
  getAnnualRecordsByYear: async (year: number): Promise<AnnualRecord[]> => {
    const response = await api.get(`/api/annual-records/year/${year}`);
    return response.data;
  },

  // Get all annual records for a specific user
  getAnnualRecordsByUser: async (userId: number): Promise<AnnualRecord[]> => {
    const response = await api.get(`/api/annual-records/user/${userId}`);
    return response.data;
  }
};

export default annualRecordService; 