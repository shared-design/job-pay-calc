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

export type JobCategory = 'Retail' | 'Hospitality' | 'Transport' | 'Warehouse' | 'General';

export interface PenaltyRates {
  saturday: number;
  sunday: number;
  overtime: number;
}

export interface JobAdAnalysisResponse {
  category: JobCategory;
  rates: PenaltyRates;
  reasoning: string;
}