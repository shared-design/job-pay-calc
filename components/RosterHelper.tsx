import React from 'react';
import { RosterPattern } from '../types';
import { CalendarClock } from 'lucide-react';

interface RosterHelperProps {
  pattern: RosterPattern;
  selectedDays: string[];
  onPatternChange: (pattern: RosterPattern) => void;
  onDaysChange: (days: string[]) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const RosterHelper: React.FC<RosterHelperProps> = ({
  pattern,
  selectedDays,
  onPatternChange,
  onDaysChange,
}) => {

  const toggleDay = (day: string) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    onDaysChange(newDays);
  };

  return (
    <div className="flex flex-col gap-3 w-full mb-2">
      <div className="flex justify-between items-center px-1">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <CalendarClock size={14} className="text-emerald-500" />
          Roster Pattern
        </label>
      </div>
      
      {/* Main Toggle */}
      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => onPatternChange('same_days')}
          className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${
            pattern === 'same_days' 
              ? 'bg-slate-700 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Same days each week
        </button>
        <button
          onClick={() => onPatternChange('different_days')}
          className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${
            pattern === 'different_days' 
              ? 'bg-slate-700 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Different days
        </button>
      </div>

      {/* Day Selector (Only shown for Same Days) */}
      {pattern === 'same_days' && (
        <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 animate-in fade-in slide-in-from-top-2">
          <p className="text-xs text-slate-400 mb-3 text-center">Tap the days you usually work:</p>
          <div className="flex justify-between gap-1">
            {DAYS.map(day => {
              const isSelected = selectedDays.includes(day);
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`
                    w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold transition-all
                    ${isSelected 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105' 
                      : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-600'}
                  `}
                >
                  {day.charAt(0)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
