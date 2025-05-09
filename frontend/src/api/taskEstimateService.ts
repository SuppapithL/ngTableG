import api from './axiosConfig';

export interface TaskEstimate {
  id: number;
  task_id: number;
  estimate_day: number;
  note?: string;
  created_by_user_id: number;
  created_at: string;
  username?: string;
  task_title?: string;
}

export interface TaskEstimateCreateRequest {
  task_id: number;
  estimate_day: number;
  note?: string;
}

export interface TaskEstimateUpdateRequest {
  estimate_day: number;
  note?: string;
}

export interface TaskEstimateFilter {
  limit?: number;
  offset?: number;
}

const taskEstimateService = {
  /**
   * Get all task estimates for the current user
   */
  async getAllTaskEstimates(filter: TaskEstimateFilter = {}): Promise<TaskEstimate[]> {
    const { limit = 50, offset = 0 } = filter;
    const response = await api.get(`/api/task-estimates?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  /**
   * Get a single task estimate by ID
   */
  async getTaskEstimate(id: number): Promise<TaskEstimate> {
    const response = await api.get(`/api/task-estimates/${id}`);
    return response.data;
  },

  /**
   * Create a new task estimate
   */
  async createTaskEstimate(data: TaskEstimateCreateRequest): Promise<TaskEstimate> {
    const response = await api.post('/api/task-estimates', data);
    return response.data;
  },

  /**
   * Update an existing task estimate
   */
  async updateTaskEstimate(id: number, data: TaskEstimateUpdateRequest): Promise<TaskEstimate> {
    const response = await api.put(`/api/task-estimates/${id}`, data);
    return response.data;
  },

  /**
   * Delete a task estimate
   */
  async deleteTaskEstimate(id: number): Promise<void> {
    await api.delete(`/api/task-estimates/${id}`);
  },

  /**
   * Get all estimates for a specific task
   */
  async getEstimatesForTask(taskId: number): Promise<TaskEstimate[]> {
    const response = await api.get(`/api/tasks/${taskId}/estimates`);
    return response.data;
  }
};

export default taskEstimateService; 