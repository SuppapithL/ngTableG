import api from './axiosConfig';

export interface QuotaPlan {
  id: number;
  plan_name: string;
  year: number;
  quota_vacation_day: number;
  quota_medical_expense_baht: number;
  created_by_user_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateQuotaPlanRequest {
  plan_name: string;
  year: number;
  quota_vacation_day: number;
  quota_medical_expense_baht: number;
  created_by_user_id?: number;
}

const quotaPlanService = {
  // Get all quota plans
  getAllQuotaPlans: async (): Promise<QuotaPlan[]> => {
    const response = await api.get('/quota-plans');
    
    // Transform camelCase response to snake_case for client components
    const plans = response.data.map((plan: any) => ({
      id: plan.id,
      plan_name: plan.planName || '',
      year: plan.year || new Date().getFullYear(),
      quota_vacation_day: Number(plan.quotaVacationDay) || 0,
      quota_medical_expense_baht: Number(plan.quotaMedicalExpenseBaht) || 0,
      created_by_user_id: plan.createdByUserId,
      created_at: plan.createdAt || '',
      updated_at: plan.updatedAt || ''
    }));
    
    return plans;
  },

  // Get quota plans by year
  getQuotaPlansByYear: async (year: number): Promise<QuotaPlan[]> => {
    const response = await api.get(`/quota-plans/by-year/${year}`);
    
    // Transform camelCase response to snake_case for client components
    const plans = response.data.map((plan: any) => ({
      id: plan.id,
      plan_name: plan.planName || '',
      year: plan.year || new Date().getFullYear(),
      quota_vacation_day: Number(plan.quotaVacationDay) || 0,
      quota_medical_expense_baht: Number(plan.quotaMedicalExpenseBaht) || 0,
      created_by_user_id: plan.createdByUserId,
      created_at: plan.createdAt || '',
      updated_at: plan.updatedAt || ''
    }));
    
    return plans;
  },

  // Get quota plan by ID
  getQuotaPlanById: async (id: number): Promise<QuotaPlan> => {
    const response = await api.get(`/quota-plans/${id}`);
    
    // Transform camelCase response to snake_case for client components
    const plan = {
      id: response.data.id,
      plan_name: response.data.planName || '',
      year: response.data.year || new Date().getFullYear(),
      quota_vacation_day: Number(response.data.quotaVacationDay) || 0,
      quota_medical_expense_baht: Number(response.data.quotaMedicalExpenseBaht) || 0,
      created_by_user_id: response.data.createdByUserId,
      created_at: response.data.createdAt || '',
      updated_at: response.data.updatedAt || ''
    };
    
    return plan;
  },

  // Create new quota plan
  createQuotaPlan: async (planData: CreateQuotaPlanRequest): Promise<QuotaPlan> => {
    // Convert from snake_case to camelCase for backend
    const requestData = {
      planName: planData.plan_name,
      year: planData.year,
      quotaVacationDay: planData.quota_vacation_day,
      quotaMedicalExpenseBaht: planData.quota_medical_expense_baht,
      createdByUserId: planData.created_by_user_id
    };
    
    const response = await api.post('/quota-plans', requestData);
    
    // Transform camelCase response to snake_case for client components
    const plan = {
      id: response.data.id,
      plan_name: response.data.planName || '',
      year: response.data.year || new Date().getFullYear(),
      quota_vacation_day: Number(response.data.quotaVacationDay) || 0,
      quota_medical_expense_baht: Number(response.data.quotaMedicalExpenseBaht) || 0,
      created_by_user_id: response.data.createdByUserId,
      created_at: response.data.createdAt || '',
      updated_at: response.data.updatedAt || ''
    };
    
    return plan;
  },

  // Update quota plan
  updateQuotaPlan: async (id: number, planData: Partial<CreateQuotaPlanRequest>): Promise<QuotaPlan> => {
    // Convert from snake_case to camelCase for backend
    const requestData: any = {};
    
    if (planData.plan_name !== undefined) requestData.planName = planData.plan_name;
    if (planData.year !== undefined) requestData.year = planData.year;
    if (planData.quota_vacation_day !== undefined) requestData.quotaVacationDay = planData.quota_vacation_day;
    if (planData.quota_medical_expense_baht !== undefined) requestData.quotaMedicalExpenseBaht = planData.quota_medical_expense_baht;
    if (planData.created_by_user_id !== undefined) requestData.createdByUserId = planData.created_by_user_id;
    
    const response = await api.put(`/quota-plans/${id}`, requestData);
    
    // Transform camelCase response to snake_case for client components
    const plan = {
      id: response.data.id,
      plan_name: response.data.planName || '',
      year: response.data.year || new Date().getFullYear(),
      quota_vacation_day: Number(response.data.quotaVacationDay) || 0,
      quota_medical_expense_baht: Number(response.data.quotaMedicalExpenseBaht) || 0,
      created_by_user_id: response.data.createdByUserId,
      created_at: response.data.createdAt || '',
      updated_at: response.data.updatedAt || ''
    };
    
    return plan;
  },

  // Delete quota plan
  deleteQuotaPlan: async (id: number): Promise<void> => {
    await api.delete(`/quota-plans/${id}`);
  }
};

export default quotaPlanService; 