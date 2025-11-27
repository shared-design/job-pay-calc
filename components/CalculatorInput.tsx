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
  isDark = false
}) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-1.5">
          <label className={`text-xs font-bold uppercase tracking-wider font-heading ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            {label}
          </label>
          {tooltip && (
            <div className="group relative flex items-center">
              <Info size={13} className={`${isDark ? 'text-slate-500 hover:text-orange-400' : 'text-slate-300 hover:text-orange-500'} cursor-help transition-colors`} />
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] px-3 py-2 border text-[11px] rounded-xl shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none z-50 font-medium ${isDark ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-slate-800 border-slate-700 text-white'}`}>
                {tooltip}
              </div>
            </div>
          )}
        </div>
        {headerAction}
      </div>
      <div className="relative group">
        {icon && (
          <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-orange-500 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
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
          className={`w-full rounded-2xl py-3.5 border transition-all duration-200 text-lg font-bold shadow-sm
            ${icon ? 'pl-11' : 'pl-4'} ${suffix ? 'pr-12' : 'pr-4'}
            focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10
            ${isDark 
              ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600 hover:border-slate-500' 
              : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-300 hover:border-slate-300 hover:bg-white'}
          `}
        />
        {suffix && (
          <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
};