export type Frequency = 'week' | 'fortnight';

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

export enum TaxStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type JobCategory = 
  | 'Transport / Trucking' 
  | 'Warehouse / Logistics' 
  | 'Healthcare' 
  | 'Retail' 
  | 'Hospitality' 
  | 'General';

export interface PenaltyRates {
  night: number;
  saturday: number;
  sunday: number;
  publicHoliday: number;
  overtime1: number;
  overtime2: number;
}

export interface JobRateSuggestionResponse {
  category: JobCategory;
  rates: PenaltyRates;
  reasoning: string;
}