import React, { useState, useMemo, useEffect } from 'react';
import { CalculatorInput } from './components/CalculatorInput';
import { ResultCard } from './components/ResultCard';
import { TaxAssistant } from './components/TaxAssistant';
import { DollarSign, Clock, CalendarDays, Percent, AlertCircle, Info } from 'lucide-react';
import { PayDetails, Frequency } from './types';
import { loadSettings, loadLastInputs, saveSettings, saveLastInputs } from './services/storageService';

const App: React.FC = () => {
  // Initialize state with values from storage or defaults
  // We use lazy initialization to avoid reading from localStorage on every render
  
  const [isCasual, setIsCasual] = useState<boolean>(() => {
    return loadSettings()?.isCasual ?? false;
  });

  const [shiftFrequency, setShiftFrequency] = useState<Frequency>(() => {
    return loadSettings()?.shiftFrequency ?? 'week';
  });

  const [taxRate, setTaxRate] = useState<string>(() => {
    return loadSettings()?.taxRate ?? '20';
  });

  const [hourlyRate, setHourlyRate] = useState<string>(() => {
    return loadLastInputs()?.hourlyRate ?? '30';
  });

  const [paidHours, setPaidHours] = useState<string>(() => {
    return loadLastInputs()?.paidHours ?? '8.5';
  });

  const [totalHours, setTotalHours] = useState<string>(() => {
    return loadLastInputs()?.totalHours ?? '9';
  });

  const [shiftsInput, setShiftsInput] = useState<string>(() => {
    return loadLastInputs()?.shiftsInput ?? '5';
  });

  // Effect to save Settings when they change
  useEffect(() => {
    saveSettings({
      isCasual,
      shiftFrequency,
      taxRate
    });
  }, [isCasual, shiftFrequency, taxRate]);

  // Effect to save Inputs when they change
  useEffect(() => {
    saveLastInputs({
      hourlyRate,
      paidHours,
      totalHours,
      shiftsInput
    });
  }, [hourlyRate, paidHours, totalHours, shiftsInput]);

  // Calculations
  const results = useMemo<PayDetails>(() => {
    const rate = parseFloat(hourlyRate) || 0;
    const pHours = parseFloat(paidHours) || 0;
    // If total hours is empty or 0, default to paid hours for calculation safety
    const tHoursInput = parseFloat(totalHours);
    const tHours = (isNaN(tHoursInput) || tHoursInput === 0) ? pHours : tHoursInput;
    
    // Normalize shifts to weekly
    const rawShifts = parseFloat(shiftsInput) || 0;
    const shiftsPerWeek = shiftFrequency === 'fortnight' ? rawShifts / 2 : rawShifts;
    
    const tax = parseFloat(taxRate) || 0;

    const weeklyPaidHours = pHours * shiftsPerWeek;
    const weeklyTotalHours = tHours * shiftsPerWeek;
    
    const grossWeekly = rate * weeklyPaidHours;
    const grossYearly = grossWeekly * 52;
    
    // Simple tax calc
    const taxMultiplier = 1 - (tax / 100);
    const netWeekly = grossWeekly * taxMultiplier;
    const netYearly = grossYearly * taxMultiplier;

    // Effective Rate: What you really earn per hour of your life spent at work
    const effectiveHourlyRate = weeklyTotalHours > 0 ? grossWeekly / weeklyTotalHours : 0;

    return {
      grossWeekly,
      grossYearly,
      netWeekly,
      netYearly,
      effectiveHourlyRate
    };
  }, [hourlyRate, paidHours, totalHours, shiftsInput, shiftFrequency, taxRate]);

  // Check if there is a significant difference to show the "Real Rate" warning
  const showEffectiveRate = results.effectiveHourlyRate > 0 && 
    (parseFloat(hourlyRate) - results.effectiveHourlyRate) > 0.01;

  // Render the frequency toggle
  const renderFrequencyToggle = (
    <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
      <button 
        onClick={() => setShiftFrequency('week')}
        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md transition-colors ${
          shiftFrequency === 'week' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        Weekly
      </button>
      <button 
        onClick={() => setShiftFrequency('fortnight')}
        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md transition-colors ${
          shiftFrequency === 'fortnight' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        Fortnightly
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-6 px-4 md:py-12">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <header className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-2">
            <DollarSign className="text-emerald-400 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">PocketPay</h1>
          <p className="text-slate-400 text-sm">Job Pay & Effective Rate Calculator</p>
        </header>

        {/* Calculator Inputs */}
        <section className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
          
          {/* Employment Type Toggle */}
          <div className="flex flex-col gap-3">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 relative">
              <button
                onClick={() => setIsCasual(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 z-10 ${!isCasual ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Permanent
              </button>
              <button
                onClick={() => setIsCasual(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 z-10 ${isCasual ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Casual
              </button>
            </div>
            {isCasual && (
              <div className="flex items-start gap-2 px-1 text-xs text-emerald-400/90 animate-in fade-in slide-in-from-top-1">
                <Info size={14} className="mt-0.5 shrink-0" />
                <p>Casual rates usually include a ~25% loading to cover no leave.</p>
              </div>
            )}
          </div>

          <CalculatorInput
            label="Hourly Rate ($)"
            value={hourlyRate}
            onChange={setHourlyRate}
            icon={<DollarSign size={18} />}
            placeholder="0.00"
          />

          <CalculatorInput
            label="Shifts"
            value={shiftsInput}
            onChange={setShiftsInput}
            icon={<CalendarDays size={18} />}
            placeholder={shiftFrequency === 'week' ? "5" : "9"}
            headerAction={renderFrequencyToggle}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <CalculatorInput
              label="Paid Hours"
              value={paidHours}
              onChange={setPaidHours}
              icon={<Clock size={18} />}
              placeholder="8"
            />
            <CalculatorInput
              label="Total Shift Length"
              value={totalHours}
              onChange={setTotalHours}
              icon={<Clock size={18} />}
              placeholder={paidHours || "8"} 
            />
          </div>
          {/* Helper text for the split inputs */}
          <div className="-mt-3 mb-2 flex justify-between px-1">
             <span className="text-[10px] text-slate-500">Billable hours</span>
             <span className="text-[10px] text-slate-500">Includes unpaid breaks</span>
          </div>

          <div className="pt-4 border-t border-slate-800">
             <CalculatorInput
              label="Estimated Tax Rate (%)"
              value={taxRate}
              onChange={setTaxRate}
              icon={<Percent size={16} />}
              placeholder="20"
              suffix="%"
            />
            
            <TaxAssistant 
              annualIncome={results.grossYearly}
              currentRate={parseFloat(taxRate) || 0}
              onRateUpdate={(r) => setTaxRate(r.toString())}
            />
          </div>
        </section>

        {/* Effective Rate Warning / Insight */}
        {showEffectiveRate && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="p-2 bg-amber-500/20 rounded-full shrink-0">
               <AlertCircle className="text-amber-400 w-5 h-5" />
            </div>
            <div>
              <p className="text-amber-200 text-xs font-bold uppercase tracking-wide">Real Hourly Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-50">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(results.effectiveHourlyRate)}
                </span>
                <span className="text-xs text-amber-400/70 line-through">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(hourlyRate) || 0)}
                </span>
              </div>
              <p className="text-[10px] text-amber-300/60 mt-0.5">
                adjusted for {(parseFloat(totalHours) - parseFloat(paidHours)).toFixed(1)}h unpaid time per shift
              </p>
            </div>
          </div>
        )}

        {/* Results Grid */}
        <section className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <ResultCard 
              label="Weekly Take Home" 
              amount={results.netWeekly} 
              subLabel="Net Pay"
              variant="primary"
            />
          </div>
          <ResultCard 
            label="Yearly Take Home" 
            amount={results.netYearly} 
            subLabel="Net Pay"
          />
          <div className="flex flex-col gap-4">
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/30 flex flex-col justify-center h-full">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Gross Weekly</span>
              <span className="text-lg font-semibold text-slate-200">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(results.grossWeekly)}
              </span>
            </div>
          </div>
           <div className="col-span-2 bg-slate-800/30 rounded-2xl p-4 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Gross Yearly</span>
                <span className="text-xl font-semibold text-slate-200">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(results.grossYearly)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Work Hours</span>
                <span className="text-xl font-semibold text-slate-200">
                  {(parseFloat(totalHours) || parseFloat(paidHours) || 0) * (shiftFrequency === 'fortnight' ? (parseFloat(shiftsInput)||0)/2 : (parseFloat(shiftsInput)||0))} <span className="text-sm font-normal text-slate-500">/ wk</span>
                </span>
              </div>
           </div>
        </section>

      </div>
    </div>
  );
};

export default App;