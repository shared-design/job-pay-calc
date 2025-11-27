import React from 'react';

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
  headerAction
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center px-1">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </label>
        {headerAction}
      </div>
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
            {icon}
          </div>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          step={step}
          min={min}
          className={`w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-3.5 
            ${icon ? 'pl-10' : 'pl-4'} ${suffix ? 'pr-12' : 'pr-4'}
            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500
            transition-all duration-200 placeholder-slate-600 text-lg font-semibold`}
        />
        {suffix && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
};