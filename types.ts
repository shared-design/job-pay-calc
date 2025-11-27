export interface PayDetails {
  grossWeekly: number;
  grossYearly: number;
  netWeekly: number;
  netYearly: number;
  effectiveHourlyRate: number;
}

export type RosterPattern = 'same_days' | 'different_days';

export interface ShiftDetail {
  normalHours: number;
  overtimeHours: number;
  overtimeMultiplier: number;
}

export type DayOverrides = Record<string, ShiftDetail>;
