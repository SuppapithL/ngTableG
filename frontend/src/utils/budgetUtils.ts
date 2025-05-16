import { getDaysPassedInYear, getDaysInYear } from './dateUtils';

/**
 * Calculate the pro-rated medical budget for the current point in the year
 * @param quotaMedicalExpenseBaht Total annual medical budget in baht
 * @param daysPassed Number of days passed in the year (optional - calculates if not provided)
 * @param daysInYear Total days in the year (optional - calculates if not provided) 
 * @returns Pro-rated medical budget amount
 */
export const calculateProRatedMedicalBudget = (
  quotaMedicalExpenseBaht: number,
  daysPassed?: number,
  daysInYear?: number
): number => {
  const now = new Date();
  const daysPassedInYear = daysPassed || getDaysPassedInYear(now);
  const totalDaysInYear = daysInYear || getDaysInYear(now.getFullYear());
  
  return (quotaMedicalExpenseBaht * daysPassedInYear) / totalDaysInYear;
};

/**
 * Calculate the remaining medical budget based on current usage
 * @param quotaMedicalExpenseBaht Total annual medical budget in baht
 * @param usedAmount Amount already used in baht
 * @param daysPassed Days passed in the year (optional)
 * @param daysInYear Total days in the year (optional)
 * @returns Remaining budget amount (can be negative if exceeded)
 */
export const calculateRemainingMedicalBudget = (
  quotaMedicalExpenseBaht: number,
  usedAmount: number,
  daysPassed?: number,
  daysInYear?: number
): number => {
  const proRatedBudget = calculateProRatedMedicalBudget(
    quotaMedicalExpenseBaht,
    daysPassed,
    daysInYear
  );
  
  return proRatedBudget - usedAmount;
};

/**
 * Check if adding a new expense would exceed the medical budget
 * @param quotaMedicalExpenseBaht Total annual medical budget in baht
 * @param currentUsedAmount Amount already used in baht
 * @param newExpenseAmount New expense amount to add in baht
 * @returns Object with validation result and budget information
 */
export const validateMedicalExpense = (
  quotaMedicalExpenseBaht: number,
  currentUsedAmount: number,
  newExpenseAmount: number
): { 
  isValid: boolean;
  remainingBefore: number;
  remainingAfter: number;
  message: string;
} => {
  const now = new Date();
  const daysPassedInYear = getDaysPassedInYear(now);
  const totalDaysInYear = getDaysInYear(now.getFullYear());
  
  const proRatedBudget = calculateProRatedMedicalBudget(
    quotaMedicalExpenseBaht,
    daysPassedInYear,
    totalDaysInYear
  );
  
  const remainingBefore = proRatedBudget - currentUsedAmount;
  const remainingAfter = remainingBefore - newExpenseAmount;
  
  return {
    isValid: remainingAfter >= 0,
    remainingBefore,
    remainingAfter,
    message: remainingAfter < 0 
      ? `This expense would exceed your remaining pro-rated budget by ฿${Math.abs(remainingAfter).toFixed(0)}`
      : `You will have ฿${remainingAfter.toFixed(0)} remaining after this expense`
  };
};

/**
 * Calculate the pro-rated vacation days for the current point in the year
 * @param quotaVacationDays Total annual vacation days
 * @param daysPassed Number of days passed in the year (optional - calculates if not provided)
 * @param daysInYear Total days in the year (optional - calculates if not provided) 
 * @returns Pro-rated vacation days amount
 */
export const calculateProRatedVacationDays = (
  quotaVacationDays: number,
  daysPassed?: number,
  daysInYear?: number
): number => {
  const now = new Date();
  const daysPassedInYear = daysPassed || getDaysPassedInYear(now);
  const totalDaysInYear = daysInYear || getDaysInYear(now.getFullYear());
  
  return (quotaVacationDays * daysPassedInYear) / totalDaysInYear;
};

/**
 * Calculate the remaining vacation days based on current usage
 * @param quotaVacationDays Total annual vacation days quota
 * @param rolloverVacationDays Vacation days rolled over from previous year
 * @param workedOnHolidayDays Days worked on holidays
 * @param usedVacationDays Vacation days already used
 * @param daysPassed Days passed in the year (optional)
 * @param daysInYear Total days in the year (optional)
 * @returns Remaining vacation days (can be negative if exceeded)
 */
export const calculateRemainingVacationDays = (
  quotaVacationDays: number,
  rolloverVacationDays: number,
  workedOnHolidayDays: number,
  usedVacationDays: number,
  daysPassed?: number,
  daysInYear?: number
): number => {
  const proRatedVacationDays = calculateProRatedVacationDays(
    quotaVacationDays,
    daysPassed,
    daysInYear
  );
  
  return (
    rolloverVacationDays + 
    workedOnHolidayDays + 
    proRatedVacationDays - 
    usedVacationDays
  );
};

/**
 * Check if adding new leave days would exceed the vacation quota
 * @param quotaVacationDays Total annual vacation days
 * @param rolloverVacationDays Vacation days rolled over from previous year
 * @param workedOnHolidayDays Days worked on holidays
 * @param usedVacationDays Vacation days already used
 * @param newLeaveDays New leave days to add
 * @returns Object with validation result and leave quota information
 */
export const validateLeaveQuota = (
  quotaVacationDays: number,
  rolloverVacationDays: number,
  workedOnHolidayDays: number,
  usedVacationDays: number,
  newLeaveDays: number
): { 
  isValid: boolean;
  remainingBefore: number;
  remainingAfter: number;
  message: string;
} => {
  const now = new Date();
  const daysPassedInYear = getDaysPassedInYear(now);
  const totalDaysInYear = getDaysInYear(now.getFullYear());
  
  const remainingBefore = calculateRemainingVacationDays(
    quotaVacationDays,
    rolloverVacationDays,
    workedOnHolidayDays,
    usedVacationDays,
    daysPassedInYear,
    totalDaysInYear
  );
  
  const remainingAfter = remainingBefore - newLeaveDays;
  
  return {
    isValid: remainingAfter >= 0,
    remainingBefore,
    remainingAfter,
    message: remainingAfter < 0 
      ? `This would exceed your remaining pro-rated leave quota by ${Math.abs(remainingAfter).toFixed(1)} days`
      : `You will have ${remainingAfter.toFixed(1)} leave days remaining after this request`
  };
}; 