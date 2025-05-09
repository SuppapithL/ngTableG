import api from './axiosConfig';

export interface TaskLog {
  id: number;
  task_id: number;
  worked_day: number;
  created_by_user_id: number;
  worked_date: string;
  is_work_on_holiday: boolean;
  created_at: string;
  username?: string;
  task_title?: string;
}

export interface TaskLogCreateRequest {
  task_id: number;
  worked_day: number;
  worked_date: string;
  is_work_on_holiday: boolean;
}

export interface TaskLogUpdateRequest {
  worked_day?: number;
  worked_date?: string;
  is_work_on_holiday?: boolean;
}

export interface TaskLogFilter {
  limit?: number;
  offset?: number;
}

export interface DateRangeFilter {
  start_date: string;
  end_date: string;
}

const taskLogService = {
  /**
   * Get all task logs for the current user
   */
  async getAllTaskLogs(filter: TaskLogFilter = {}): Promise<TaskLog[]> {
    const { limit = 50, offset = 0 } = filter;
    const response = await api.get(`/api/task-logs?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  /**
   * Get a single task log by ID
   */
  async getTaskLog(id: number): Promise<TaskLog> {
    const response = await api.get(`/api/task-logs/${id}`);
    return response.data;
  },

  /**
   * Create a new task log
   */
  async createTaskLog(data: TaskLogCreateRequest): Promise<TaskLog> {
    const response = await api.post('/api/task-logs', data);
    return response.data;
  },

  /**
   * Update an existing task log
   */
  async updateTaskLog(id: number, data: TaskLogUpdateRequest): Promise<TaskLog> {
    const response = await api.put(`/api/task-logs/${id}`, data);
    return response.data;
  },

  /**
   * Delete a task log
   */
  async deleteTaskLog(id: number): Promise<void> {
    await api.delete(`/api/task-logs/${id}`);
  },

  /**
   * Get all logs for a specific task
   */
  async getLogsForTask(taskId: number): Promise<TaskLog[]> {
    const response = await api.get(`/api/tasks/${taskId}/logs`);
    return response.data;
  },

  /**
   * Get logs by date range for the current user
   */
  async getLogsByDateRange(filter: DateRangeFilter): Promise<TaskLog[]> {
    const { start_date, end_date } = filter;
    const response = await api.get(`/api/task-logs/date-range?start_date=${start_date}&end_date=${end_date}`);
    return response.data;
  }
};

export default taskLogService; 