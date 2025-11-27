import { RosterPattern, DayOverrides } from "../types";

export interface AppSettings {
  isCasual: boolean;
  taxRate: string;
}

export interface UserInputs {
  hourlyRate: string;
  
  // New simplified inputs
  shiftHours: string;
  isBreakPaid: boolean;
  unpaidBreakLength: string;
  
  shiftsInput: string;
  
  // Roster
  rosterPattern?: RosterPattern;
  customRosterDays?: string[]; // ['Mon', 'Tue', etc]
  
  // New Overtime/Grid state
  showOvertimeDetails?: boolean;
  dayOverrides?: DayOverrides;
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
