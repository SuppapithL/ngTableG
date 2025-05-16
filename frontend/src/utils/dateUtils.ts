import { format, isWeekend, isSameDay, parseISO } from 'date-fns';
import { Holiday } from '../api/holidayService';

/**
 * Checks if a year is a leap year
 * @param year The year to check
 * @returns True if the year is a leap year, false otherwise
 */
export const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

/**
 * Gets the number of days in a year
 * @param year The year to check
 * @returns The number of days in the year (365 or 366)
 */
export const getDaysInYear = (year: number): number => {
  return isLeapYear(year) ? 366 : 365;
};

/**
 * Calculate the number of days passed since the start of a year
 * @param date The date to calculate from (defaults to current date)
 * @returns The number of days passed since January 1st of the year
 */
export const getDaysPassedInYear = (date: Date = new Date()): number => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diffInMs = date.getTime() - startOfYear.getTime();
  // Add 1 to include the current day
  return Math.floor(diffInMs / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Checks if a given date is a holiday
 * @param date Date to check
 * @param holidays List of holidays from the database
 * @returns True if date is a weekend (Saturday/Sunday) or defined in holidays table
 */
export const isHoliday = (date: Date, holidays: Holiday[] = []): boolean => {
  // Check if it's a weekend (Saturday or Sunday)
  if (isWeekend(date)) {
    return true;
  }

  // Check if the date exists in holidays table
  const dateString = format(date, 'yyyy-MM-dd');
  return holidays.some(holiday => {
    const holidayDate = new Date(holiday.date);
    return isSameDay(holidayDate, date);
  });
};

/**
 * Formats a date to a human-readable string
 * @param date Date to format
 * @param formatString Optional format string
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string, formatString: string = 'MMMM d, yyyy'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
};

/**
 * Gets the reason why a date is a holiday
 * @param date Date to check
 * @param holidays List of holidays from the database
 * @returns Holiday reason (Weekend, or the name of the holiday)
 */
export const getHolidayReason = (date: Date, holidays: Holiday[] = []): string | null => {
  if (isWeekend(date)) {
    return 'Weekend';
  }

  // Find the holiday in the holidays table
  const holiday = holidays.find(h => isSameDay(new Date(h.date), date));
  return holiday ? holiday.name : null;
}; 