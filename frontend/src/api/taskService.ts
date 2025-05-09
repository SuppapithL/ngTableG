import api from './axiosConfig';

export interface Task {
  id: number;
  url?: string;
  task_category_id?: number;
  note?: string;
  title?: string;
  status?: string;
  status_color?: string;
  category_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCreateRequest {
  title: string;
  note?: string;
  task_category_id?: number;
  status?: string;
  status_color?: string;
  clickup_list_id?: string;
}

export interface TaskUpdateRequest {
  title?: string;
  note?: string;
  task_category_id?: number;
  status?: string;
  status_color?: string;
}

export interface TaskFilter {
  limit?: number;
  offset?: number;
}

const taskService = {
  /**
   * Get all tasks with pagination
   */
  async getAllTasks(filter: TaskFilter = {}): Promise<Task[]> {
    const { limit = 50, offset = 0 } = filter;
    const response = await api.get(`/tasks?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  /**
   * Get a single task by ID
   */
  async getTask(id: number): Promise<Task> {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  /**
   * Create a new task
   */
  async createTask(taskData: TaskCreateRequest): Promise<Task> {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  /**
   * Update an existing task
   */
  async updateTask(id: number, taskData: TaskUpdateRequest): Promise<Task> {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  /**
   * Delete a task
   */
  async deleteTask(id: number): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  /**
   * Get tasks by category ID
   */
  async getTasksByCategory(categoryId: number): Promise<Task[]> {
    const response = await api.get(`/categories/${categoryId}/tasks`);
    return response.data;
  }
};

export default taskService; 