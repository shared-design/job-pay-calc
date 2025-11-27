import React, { useState } from 'react';
import { Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { suggestRatesForJob } from '../services/geminiService';
import { PenaltyRates, JobCategory } from '../types';

interface JobTypeHelperProps {
  onApplyRates: (rates: PenaltyRates) => void;
}

const JOB_CATEGORIES: JobCategory[] = [
  'General',
  'Retail',
  'Hospitality',
  'Transport / Trucking',
  'Warehouse / Logistics',
  'Healthcare'
];

// Fallback rates if user manually changes dropdown without using AI
const DEFAULT_CATEGORY_RATES: Record<JobCategory, PenaltyRates> = {
  'General': { night: 115, saturday: 150, sunday: 200, publicHoliday: 250, overtime1: 150, overtime2: 200 },
  'Retail': { night: 115, saturday: 125, sunday: 150, publicHoliday: 225, overtime1: 150, overtime2: 200 },
  'Hospitality': { night: 115, saturday: 125, sunday: 150, publicHoliday: 225, overtime1: 150, overtime2: 200 },
  'Transport / Trucking': { night: 115, saturday: 150, sunday: 200, publicHoliday: 250, overtime1: 150, overtime2: 200 },
  'Warehouse / Logistics': { night: 115, saturday: 150, sunday: 200, publicHoliday: 250, overtime1: 150, overtime2: 200 },
  'Healthcare': { night: 112, saturday: 150, sunday: 175, publicHoliday: 250, overtime1: 150, overtime2: 200 }
};

export const JobTypeHelper: React.FC<JobTypeHelperProps> = ({ onApplyRates }) => {
  const [jobTitle, setJobTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [category, setCategory] = useState<JobCategory | ''>('');
  const [error, setError] = useState(false);

  const handleSuggest = async () => {
    if (!jobTitle.trim()) return;
    setIsLoading(true);
    setError(false);

    try {
      const data = await suggestRatesForJob(jobTitle);
      setCategory(data.category);
      onApplyRates(data.rates);
    } catch (e) {
      setError(true);
      // Fallback: If AI fails, just set General
      setCategory('General');
      onApplyRates(DEFAULT_CATEGORY_RATES['General']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (newCategory: JobCategory) => {
    setCategory(newCategory);
    // Apply default rates for this category immediately
    onApplyRates(DEFAULT_CATEGORY_RATES[newCategory]);
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-4 space-y-3">
      <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
        <Sparkles size={16} />
        <span>Rate Helper</span>
      </div>
      
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSuggest()}
            placeholder="Job Title (e.g. HC Truck Driver)"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleSuggest}
            disabled={isLoading || !jobTitle.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 shrink-0"
          >
            {isLoading ? <Loader2 className="animate-spin" size={14} /> : 'Suggest'}
          </button>
        </div>
        
        {category && (
          <div className="animate-in fade-in slide-in-from-top-1">
            <div className="relative">
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as JobCategory)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:border-emerald-500"
              >
                {JOB_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 italic">
              * Rates below are estimates for {category}. Check your award or contract.
            </p>
          </div>
        )}
        
        {error && <p className="text-xs text-red-400">Couldn't analyze. Using generic rates.</p>}
      </div>
    </div>
  );
};