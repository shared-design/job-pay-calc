import React, { useState } from 'react';
import { TaxStatus } from '../types';
import { getTaxEstimate } from '../services/geminiService';
import { Loader2, MapPin, Sparkles } from 'lucide-react';

interface TaxAssistantProps {
  annualIncome: number;
  currentRate: number;
  onRateUpdate: (rate: number) => void;
}

export const TaxAssistant: React.FC<TaxAssistantProps> = ({ 
  annualIncome, 
  currentRate, 
  onRateUpdate 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<TaxStatus>(TaxStatus.IDLE);
  const [explanation, setExplanation] = useState<string | null>(null);

  const handleEstimate = async () => {
    if (!location.trim()) return;
    
    setStatus(TaxStatus.LOADING);
    setExplanation(null);
    
    try {
      const result = await getTaxEstimate(annualIncome, location);
      onRateUpdate(result.rate);
      setExplanation(result.explanation);
      setStatus(TaxStatus.SUCCESS);
    } catch (e) {
      setStatus(TaxStatus.ERROR);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors mt-2"
      >
        <Sparkles size={14} />
        <span>Use AI to estimate taxes based on location</span>
      </button>
    );
  }

  return (
    <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-emerald-500/30">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-sm font-semibold text-emerald-100 flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-400" />
          Smart Tax Estimator
        </h3>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-slate-500 hover:text-slate-300"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. California, London, NYC"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            onKeyDown={(e) => e.key === 'Enter' && handleEstimate()}
          />
        </div>
        <button
          onClick={handleEstimate}
          disabled={status === TaxStatus.LOADING || !location}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
        >
          {status === TaxStatus.LOADING ? <Loader2 className="animate-spin" size={16} /> : 'Go'}
        </button>
      </div>

      {status === TaxStatus.ERROR && (
        <p className="text-xs text-red-400">Could not estimate. Try a different location.</p>
      )}

      {status === TaxStatus.SUCCESS && explanation && (
        <div className="text-xs text-emerald-100/80 bg-emerald-900/30 p-2 rounded border border-emerald-500/20">
          <p><strong>Estimate Applied: {currentRate}%</strong></p>
          <p className="mt-1">{explanation}</p>
        </div>
      )}
    </div>
  );
};