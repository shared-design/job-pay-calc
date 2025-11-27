import { Frequency } from "../types";

export interface AppSettings {
  isCasual: boolean;
  shiftFrequency: Frequency;
  taxRate: string;
}

export interface UserInputs {
  hourlyRate: string;
  paidHours: string;
  totalHours: string;
  shiftsInput: string;
  // Penalty configs
  nightRate?: string;
  nightHours?: string;
  satRate?: string;
  satHours?: string;
  sunRate?: string;
  sunHours?: string;
  phRate?: string;
  phHours?: string;
  ot1Rate?: string;
  ot1Hours?: string;
  ot2Rate?: string;
  ot2Hours?: string;
  
  // Legacy fields
  otRate?: string;
  otHours?: string;

  showPenalties?: boolean;
}

const KEYS = {
  SETTINGS: 'pocketpay_settings',
  INPUTS: 'pocketpay_inputs'
};

export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save settings:', error);
  }
};

export const loadSettings = (): AppSettings | null => {
  try {
    const stored = localStorage.getItem(KEYS.SETTINGS);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load settings:', error);
    return null;
  }
};

export const saveLastInputs = (inputs: UserInputs): void => {
  try {
    localStorage.setItem(KEYS.INPUTS, JSON.stringify(inputs));
  } catch (error) {
    console.warn('Failed to save inputs:', error);
  }
};

export const loadLastInputs = (): UserInputs | null => {
  try {
    const stored = localStorage.getItem(KEYS.INPUTS);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load inputs:', error);
    return null;
  }
};