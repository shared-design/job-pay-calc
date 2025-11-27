export interface PayDetails {
  grossWeekly: number;
  grossYearly: number;
  netWeekly: number;
  netYearly: number;
  effectiveHourlyRate: number;
}

export interface TaxEstimateResponse {
  rate: number;
  explanation: string;
}

export interface JobRateSuggestionResponse {
  category: string;
  rates: {
    night: number;
    saturday: number;
    sunday: number;
    publicHoliday: number;
    overtime1: number;
    overtime2: number;
  };
  reasoning: string;
}

export enum TaxStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type RosterPattern = 'same_days' | 'different_days';

export interface ShiftDetail {
  normalHours: number;
  overtimeHours: number;
  overtimeMultiplier: number;
}

export type DayOverrides = Record<string, ShiftDetail>;