import React from 'react';

interface ResultCardProps {
  label: string;
  amount: number;
  subLabel: string;
  variant?: 'primary' | 'secondary';
}

export const ResultCard: React.FC<ResultCardProps> = ({ 
  label, 
  amount, 
  subLabel,
  variant = 'secondary' 
}) => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);

  const isPrimary = variant === 'primary';

  return (
    <div className={`
      relative overflow-hidden rounded-2xl p-5 
      ${isPrimary 
        ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg shadow-emerald-900/50' 
        : 'bg-slate-800 border border-slate-700/50'}
    `}>
      <div className="relative z-10 flex flex-col items-center text-center">
        <span className={`text-xs font-bold uppercase tracking-widest mb-1 ${isPrimary ? 'text-emerald-100' : 'text-slate-400'}`}>
          {label}
        </span>
        <span className={`text-3xl font-bold tracking-tight ${isPrimary ? 'text-white' : 'text-slate-100'}`}>
          {formattedAmount}
        </span>
        <span className={`text-xs mt-1 ${isPrimary ? 'text-emerald-200' : 'text-slate-500'}`}>
          {subLabel}
        </span>
      </div>
      
      {/* Decorative background glow for primary card */}
      {isPrimary && (
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-400/20 blur-2xl rounded-full" />
      )}
    </div>
  );
};