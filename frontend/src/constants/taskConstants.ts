/**
 * Task status constants
 */
export const TASK_STATUSES = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done'
};

/**
 * Task status color constants
 */
export const TASK_STATUS_COLORS = {
  DEFAULT: '#cccccc',
  GREEN: '#4ade80',
  ORANGE: '#fb923c',
  BLUE: '#60a5fa',
  RED: '#f87171',
  PURPLE: '#a78bfa'
};

/**
 * Default values for new tasks
 */
export const DEFAULT_TASK_VALUES = {
  TITLE: '',
  NOTE: '',
  STATUS: TASK_STATUSES.TODO,
  STATUS_COLOR: TASK_STATUS_COLORS.DEFAULT,
  ESTIMATE_DAY: 1
}; 