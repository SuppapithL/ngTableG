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
  estimate_day?: number;
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
    const response = await api.get(`/api/tasks?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  /**
   * Get a single task by ID
   */
  async getTask(id: number): Promise<Task> {
    const response = await api.get(`/api/tasks/${id}`);
    return response.data;
  },

  /**
   * Create a new task
   */
  async createTask(taskData: TaskCreateRequest): Promise<Task> {
    // Extract estimate_day from taskData to create a task estimate after task creation
    const { estimate_day, ...taskRequestData } = taskData;
    
    // Create the task
    const response = await api.post('/api/tasks', taskRequestData);
    const newTask = response.data;
    
    // If estimate_day is provided, create a task estimate
    if (estimate_day && estimate_day > 0) {
      try {
        console.log('Creating initial estimate for task', newTask.id, 'with', estimate_day, 'days');
        await api.post('/api/task-estimates', {
          task_id: newTask.id,
          estimate_day: estimate_day,
          note: 'Initial estimate'
        });
      } catch (error) {
        console.error('Error creating initial estimate:', error);
        // Continue even if estimate creation fails
      }
    }
    
    return newTask;
  },

  /**
   * Update an existing task
   */
  async updateTask(id: number, taskData: TaskUpdateRequest): Promise<Task> {
    const response = await api.put(`/api/tasks/${id}`, taskData);
    return response.data;
  },

  /**
   * Delete a task
   */
  async deleteTask(id: number): Promise<void> {
    await api.delete(`/api/tasks/${id}`);
  },

  /**
   * Get tasks by category ID
   */
  async getTasksByCategory(categoryId: number): Promise<Task[]> {
    const response = await api.get(`/api/categories/${categoryId}/tasks`);
    return response.data;
  }
};

export default taskService; 