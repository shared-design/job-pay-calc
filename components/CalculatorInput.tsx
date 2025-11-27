import React from 'react';
import { Info } from 'lucide-react';

interface CalculatorInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  step?: string;
  min?: string;
  suffix?: string;
  headerAction?: React.ReactNode;
  type?: 'text' | 'number';
  tooltip?: string;
  isDark?: boolean;
}

export const CalculatorInput: React.FC<CalculatorInputProps> = ({
  label,
  value,
  onChange,
  icon,
  placeholder,
  step = "1",
  min = "0",
  suffix,
  headerAction,
  type = "number",
  tooltip,
  isDark = true
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-1.5">
          <label className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {label}
          </label>
          {tooltip && (
            <div className="group relative flex items-center">
              <Info size={12} className={`${isDark ? 'text-slate-500 hover:text-emerald-400' : 'text-slate-400 hover:text-emerald-600'} cursor-help transition-colors`} />
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] px-2.5 py-1.5 border text-[10px] rounded-lg shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none z-50
                ${isDark 
                  ? 'bg-slate-800 border-slate-700 text-slate-200' 
                  : 'bg-white border-slate-200 text-slate-700'
                }`}>
                {tooltip}
                <div className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${isDark ? 'border-t-slate-800' : 'border-t-white'}`}></div>
              </div>
            </div>
          )}
        </div>
        {headerAction}
      </div>
      <div className="relative group">
        {icon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
            isDark 
              ? 'text-slate-500 group-focus-within:text-emerald-400' 
              : 'text-slate-400 group-focus-within:text-emerald-600'
          }`}>
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          step={step}
          min={min}
          className={`w-full border rounded-xl py-3.5 
            ${icon ? 'pl-10' : 'pl-4'} ${suffix ? 'pr-12' : 'pr-4'}
            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500
            transition-all duration-200 text-lg font-semibold
            ${isDark 
              ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600' 
              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
        />
        {suffix && (
          <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
};
