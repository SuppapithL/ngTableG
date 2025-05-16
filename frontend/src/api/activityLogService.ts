import api from './axiosConfig';
import taskLogService, { TaskLog } from './taskLogService';
import leaveLogService, { LeaveLog } from './leaveLogService';
import { format } from 'date-fns';

export interface ActivityLog {
  id: string; // Combined ID (type prefix + original ID)
  type: 'task' | 'leave';
  title: string;
  description: string;
  date: string;
  amount: number; // Worked days for tasks, 1 for leave
  user_id: number;
  username: string;
  created_at: string;
  originalData: TaskLog | LeaveLog; // The original data for specific operations
}

export interface DateRangeFilter {
  start_date: string;
  end_date: string;
}

/**
 * Service to fetch and manage combined activity logs (task logs + leave logs)
 */
const activityLogService = {
  /**
   * Get all activity logs for the current user within a date range
   */
  async getActivityLogsByDateRange(filter: DateRangeFilter): Promise<ActivityLog[]> {
    const { start_date, end_date } = filter;
    console.log(`Fetching combined activity logs from ${start_date} to ${end_date}`);
    
    try {
      // Get task logs
      const taskLogs = await taskLogService.getLogsByDateRange(filter);
      console.log(`Received ${taskLogs.length} task logs`);
      
      // Get leave logs for the year that contains this date range
      const year = new Date(start_date).getFullYear();
      const allLeaveLogs = await leaveLogService.getCurrentUserLeaveLogs({ year });
      console.log(`Received ${allLeaveLogs.length} leave logs for year ${year}`);
      
      // Filter leave logs to match the date range
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      
      const leaveLogs = allLeaveLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= startDate && logDate <= endDate;
      });
      
      console.log(`Filtered to ${leaveLogs.length} leave logs in date range`);
      
      // Convert task logs to activity logs
      const taskActivities: ActivityLog[] = taskLogs.map(log => ({
        id: `task-${log.id}`,
        type: 'task',
        title: log.task_title || 'Task',
        description: `Worked ${log.worked_day} day(s)${log.is_work_on_holiday ? ' (holiday)' : ''}`,
        date: log.worked_date,
        amount: log.worked_day,
        user_id: log.created_by_user_id,
        username: log.username || 'Unknown',
        created_at: log.created_at,
        originalData: log
      }));
      
      // Convert leave logs to activity logs
      const leaveActivities: ActivityLog[] = leaveLogs.map(log => ({
        id: `leave-${log.id}`,
        type: 'leave',
        title: `${log.type.charAt(0).toUpperCase() + log.type.slice(1)} leave`,
        description: log.note || 'No details provided',
        date: log.date,
        amount: 1, // Leave logs count as 1 full day
        user_id: log.user_id,
        username: log.username || 'Unknown',
        created_at: log.created_at,
        originalData: log
      }));
      
      // Combine and sort by date (newest first)
      const combined = [...taskActivities, ...leaveActivities].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      return combined;
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return [];
    }
  },
  
  /**
   * Get all activity logs for today
   */
  async getTodayActivityLogs(): Promise<ActivityLog[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    return this.getActivityLogsByDateRange({
      start_date: today,
      end_date: today
    });
  },
  
  /**
   * Delete an activity log
   */
  async deleteActivityLog(activityLog: ActivityLog): Promise<void> {
    const [type, idString] = activityLog.id.split('-');
    const id = parseInt(idString, 10);
    
    if (type === 'task') {
      await taskLogService.deleteTaskLog(id);
    } else if (type === 'leave') {
      await leaveLogService.deleteLeaveLog(id);
    }
  }
};

export default activityLogService; 