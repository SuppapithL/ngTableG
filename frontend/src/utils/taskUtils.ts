import { Task } from '../api/taskService';
import { isLightColor } from './colorUtils';

/**
 * Gets a status chip component configuration for a task
 * @param status The task status string
 * @param color The status color in hex format
 * @returns An object with style properties for the chip
 */
export const getStatusChipStyle = (status: string, color: string) => {
  return {
    label: status,
    style: { 
      backgroundColor: color || '#cccccc',
      color: isLightColor(color) ? '#000000' : '#ffffff'
    }
  };
};

/**
 * Sorts tasks by creation date (newest first)
 * @param tasks Array of tasks to sort
 * @returns New sorted array
 */
export const sortTasksByDate = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

/**
 * Sorts tasks by status (To Do, In Progress, In Review, Done)
 * @param tasks Array of tasks to sort
 * @returns New sorted array
 */
export const sortTasksByStatus = (tasks: Task[]): Task[] => {
  const statusOrder: { [key: string]: number } = {
    'To Do': 0,
    'In Progress': 1,
    'In Review': 2,
    'Done': 3
  };
  
  return [...tasks].sort((a, b) => {
    const statusA = a.status || 'To Do';
    const statusB = b.status || 'To Do';
    return (statusOrder[statusA] || 0) - (statusOrder[statusB] || 0);
  });
};

/**
 * Filters tasks by search query
 * @param tasks Array of tasks to filter
 * @param query Search query string
 * @returns Filtered array of tasks
 */
export const filterTasksBySearchQuery = (tasks: Task[], query: string): Task[] => {
  if (!query) return tasks;
  
  const lowercaseQuery = query.toLowerCase();
  
  return tasks.filter((task) => {
    return (
      (task.title && task.title.toLowerCase().includes(lowercaseQuery)) || 
      (task.note && task.note.toLowerCase().includes(lowercaseQuery))
    );
  });
}; 