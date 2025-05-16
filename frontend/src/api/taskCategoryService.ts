import api from './axiosConfig';

export interface TaskCategory {
  id: number;
  name: string;
  parent_id?: number;
  description?: string;
  created_at: string;
  updated_at: string;
  children?: TaskCategory[];
}

export interface TaskCategoryCreateRequest {
  name: string;
  parent_id?: number;
  description?: string;
}

export interface TaskCategoryUpdateRequest {
  name?: string;
  parent_id?: number | null;
  description?: string;
}

export interface TaskCategoryFilter {
  limit?: number;
  offset?: number;
}

const taskCategoryService = {
  /**
   * Get all task categories
   */
  async getAllTaskCategories(filter: TaskCategoryFilter = {}): Promise<TaskCategory[]> {
    const { limit = 50, offset = 0 } = filter;
    const response = await api.get(`/api/task-categories?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  /**
   * Get hierarchical task categories
   * This builds the hierarchy on the client side since the backend endpoint has routing issues
   */
  async getHierarchicalTaskCategories(): Promise<TaskCategory[]> {
    try {
      // Get all categories
      const allCategories = await this.getAllTaskCategories({ limit: 1000 });
      
      // Find root categories (those without parent_id)
      const rootCategories = allCategories.filter(category => !category.parent_id);
      
      // Build the hierarchy
      for (const rootCategory of rootCategories) {
        rootCategory.children = buildCategoryHierarchy(rootCategory.id, allCategories);
      }
      
      return rootCategories;
    } catch (error) {
      console.error('Error building hierarchical categories:', error);
      throw error;
    }
  },

  /**
   * Get a single task category by ID
   */
  async getTaskCategory(id: number): Promise<TaskCategory> {
    const response = await api.get(`/api/task-categories/${id}`);
    return response.data;
  },

  /**
   * Create a new task category
   */
  async createTaskCategory(data: TaskCategoryCreateRequest): Promise<TaskCategory> {
    const response = await api.post('/api/task-categories', data);
    return response.data;
  },

  /**
   * Update an existing task category
   */
  async updateTaskCategory(id: number, data: TaskCategoryUpdateRequest): Promise<TaskCategory> {
    const response = await api.put(`/api/task-categories/${id}`, data);
    return response.data;
  },

  /**
   * Delete a task category
   */
  async deleteTaskCategory(id: number): Promise<void> {
    await api.delete(`/api/task-categories/${id}`);
  }
};

/**
 * Helper function to build a hierarchical category structure
 */
function buildCategoryHierarchy(parentId: number, allCategories: TaskCategory[]): TaskCategory[] {
  const children = allCategories.filter(category => category.parent_id === parentId);
  
  for (const child of children) {
    child.children = buildCategoryHierarchy(child.id, allCategories);
  }
  
  return children;
}

export default taskCategoryService; 