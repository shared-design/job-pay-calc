import React, { useState } from 'react';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { analyzeJobAd } from '../services/geminiService';
import { PenaltyRates, JobCategory } from '../types';

interface JobTypeHelperProps {
  onApplyRates: (rates: PenaltyRates) => void;
}

export const JobTypeHelper: React.FC<JobTypeHelperProps> = ({ onApplyRates }) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{category: JobCategory; rates: PenaltyRates} | null>(null);
  const [error, setError] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError(false);
    setResult(null);

    try {
      const data = await analyzeJobAd(text);
      setResult({ category: data.category, rates: data.rates });
      onApplyRates(data.rates);
    } catch (e) {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-4 space-y-3">
      <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
        <Sparkles size={16} />
        <span>Job Type Helper</span>
      </div>
      
      {!result ? (
        <>
          <p className="text-xs text-slate-400">
            Paste the job ad text below. We'll guess the industry and suggest standard penalty rates for you.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste job ad here..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 min-h-[80px]"
          />
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !text.trim()}
            className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/50 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={14} /> : 'Auto-fill Rates'}
          </button>
          {error && <p className="text-xs text-red-400">Couldn't analyze. Try simpler text.</p>}
        </>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full">
              {result.category} Detected
            </span>
            <button 
              onClick={() => { setText(''); setResult(null); }}
              className="text-xs text-slate-500 hover:text-white"
            >
              Reset
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-900 p-2 rounded border border-slate-700">
              <div className="text-slate-500 mb-1">Sat</div>
              <div className="text-emerald-400 font-mono">{result.rates.saturday}%</div>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-700">
              <div className="text-slate-500 mb-1">Sun</div>
              <div className="text-emerald-400 font-mono">{result.rates.sunday}%</div>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-700">
              <div className="text-slate-500 mb-1">OT</div>
              <div className="text-emerald-400 font-mono">{result.rates.overtime}%</div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 italic border-t border-slate-700 pt-2">
            * These are estimates based on the industry. Always check your actual contract or award.
          </p>
        </div>
      )}
    </div>
  );
};