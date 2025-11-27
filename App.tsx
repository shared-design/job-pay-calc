import React, { useState, useMemo, useEffect } from 'react';
import { CalculatorInput } from './components/CalculatorInput';
import { RosterHelper } from './components/RosterHelper';
import { AnimatedCurrency } from './components/AnimatedCurrency';
import { DollarSign, Clock, CalendarDays, Percent, AlertCircle, Info, ChevronDown, ChevronUp, Sun, Moon } from 'lucide-react';
import { PayDetails, RosterPattern, DayOverrides } from './types';
import { loadSettings, loadLastInputs, saveSettings, saveLastInputs } from './services/storageService';

const App: React.FC = () => {
  // Theme State
  const [isDark, setIsDark] = useState<boolean>(true);

  // Initialize state with values from storage or defaults
  const [isCasual, setIsCasual] = useState<boolean>(() => {
    return loadSettings()?.isCasual ?? false;
  });

  const [taxRate, setTaxRate] = useState<string>(() => {
    return loadSettings()?.taxRate ?? '30';
  });

  const [hourlyRate, setHourlyRate] = useState<string>(() => {
    return loadLastInputs()?.hourlyRate ?? '30';
  });

  // Simplified Shift Inputs
  const [shiftHours, setShiftHours] = useState<string>(() => {
    return loadLastInputs()?.shiftHours ?? '8';
  });
  
  const [isBreakPaid, setIsBreakPaid] = useState<boolean>(() => {
    return loadLastInputs()?.isBreakPaid ?? false;
  });

  const [unpaidBreakLength, setUnpaidBreakLength] = useState<string>(() => {
    return loadLastInputs()?.unpaidBreakLength ?? '0.5';
  });

  const [shiftsInput, setShiftsInput] = useState<string>(() => {
    return loadLastInputs()?.shiftsInput ?? '5';
  });

  // Roster State
  const [rosterPattern, setRosterPattern] = useState<RosterPattern>(() => {
    return loadLastInputs()?.rosterPattern ?? 'different_days';
  });
  const [customRosterDays, setCustomRosterDays] = useState<string[]>(() => {
    return loadLastInputs()?.customRosterDays ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  });

  // Overtime / Detailed Grid State
  const [showOvertimeDetails, setShowOvertimeDetails] = useState<boolean>(() => {
    return loadLastInputs()?.showOvertimeDetails ?? false;
  });

  const [dayOverrides, setDayOverrides] = useState<DayOverrides>(() => {
    return loadLastInputs()?.dayOverrides ?? {};
  });

  // Effect to save Settings
  useEffect(() => {
    saveSettings({ isCasual, taxRate });
  }, [isCasual, taxRate]);

  // Effect to save Inputs
  useEffect(() => {
    saveLastInputs({
      hourlyRate,
      shiftHours,
      isBreakPaid,
      unpaidBreakLength,
      shiftsInput,
      rosterPattern,
      customRosterDays,
      showOvertimeDetails,
      dayOverrides
    });
  }, [hourlyRate, shiftHours, isBreakPaid, unpaidBreakLength, shiftsInput, rosterPattern, customRosterDays, showOvertimeDetails, dayOverrides]);

  const handleRosterDaysChange = (days: string[]) => {
    setCustomRosterDays(days);
    if (rosterPattern === 'same_days') {
      setShiftsInput(days.length.toString());
    }
  };

  const handleRosterPatternChange = (newPattern: RosterPattern) => {
    setRosterPattern(newPattern);
    if (newPattern === 'same_days') {
      setShiftsInput(customRosterDays.length.toString());
    }
  };

  // Helper to get Net Hours per shift based on inputs
  const getNetShiftHours = () => {
    const rawShift = parseFloat(shiftHours) || 0;
    const rawBreak = parseFloat(unpaidBreakLength) || 0;
    return Math.max(0, rawShift - (isBreakPaid ? 0 : rawBreak));
  };

  // Helper to default breakdown: 8 normal, rest OT
  const getDefaultBreakdown = (netHours: number) => {
    return {
      normal: Math.min(8, netHours),
      ot: Math.max(0, netHours - 8),
      mult: 1.5
    };
  };

  // Logic to update a specific day in the grid
  const updateDayOverride = (dayId: string, field: 'normalHours' | 'overtimeHours' | 'overtimeMultiplier', value: number) => {
    setDayOverrides(prev => {
      const net = getNetShiftHours();
      const defaults = getDefaultBreakdown(net);
      
      const current = prev[dayId] || { 
        normalHours: defaults.normal, 
        overtimeHours: defaults.ot, 
        overtimeMultiplier: defaults.mult 
      };

      return {
        ...prev,
        [dayId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  // Calculations
  const results = useMemo<PayDetails>(() => {
    const rate = parseFloat(hourlyRate) || 0;
    const netShiftHours = getNetShiftHours();
    
    let totalNormalHours = 0;
    let totalOvertimePay = 0; 
    let totalWorkHours = 0; // Actual time worked (for effective rate)

    // Identify the list of "Shifts" to iterate over
    let shifts: string[] = [];
    if (rosterPattern === 'same_days') {
      shifts = customRosterDays; // ['Mon', 'Wed'] etc
    } else {
      const count = Math.max(0, Math.round(parseFloat(shiftsInput) || 0));
      shifts = Array.from({ length: count }, (_, i) => `Shift ${i + 1}`);
    }

    if (!showOvertimeDetails) {
      // SIMPLE MODE
      totalWorkHours = netShiftHours * shifts.length;
      totalNormalHours = totalWorkHours; 
    } else {
      // ADVANCED MODE (Grid)
      shifts.forEach(dayId => {
        const override = dayOverrides[dayId];
        let normal = 0;
        let ot = 0;
        let mult = 1.5;

        if (override) {
          normal = override.normalHours;
          ot = override.overtimeHours;
          mult = override.overtimeMultiplier;
        } else {
          // Auto-calc default for this day
          const def = getDefaultBreakdown(netShiftHours);
          normal = def.normal;
          ot = def.ot;
          mult = def.mult;
        }

        totalNormalHours += normal;
        totalOvertimePay += (ot * rate * mult);
        totalWorkHours += (normal + ot);
      });
    }

    // Gross
    const grossWeekly = (totalNormalHours * rate) + totalOvertimePay;
    const grossYearly = grossWeekly * 52;
    
    // Tax Calculation
    const cleanTaxRate = taxRate.replace(/[^0-9.]/g, '');
    const parsedTax = parseFloat(cleanTaxRate);
    const effectiveTax = isNaN(parsedTax) || cleanTaxRate === '' ? 30 : parsedTax;
    
    const taxMultiplier = 1 - (effectiveTax / 100);
    const netWeekly = grossWeekly * taxMultiplier;
    const netYearly = grossYearly * taxMultiplier;

    const effectiveHourlyRate = totalWorkHours > 0 ? grossWeekly / totalWorkHours : 0;

    return {
      grossWeekly,
      grossYearly,
      netWeekly,
      netYearly,
      effectiveHourlyRate,
      totalHours: totalWorkHours
    };
  }, [hourlyRate, shiftHours, isBreakPaid, unpaidBreakLength, shiftsInput, rosterPattern, customRosterDays, showOvertimeDetails, dayOverrides, taxRate]);

  // Determine rows for the grid
  const gridRows = useMemo(() => {
    if (rosterPattern === 'same_days') return customRosterDays;
    const count = Math.max(0, Math.round(parseFloat(shiftsInput) || 0));
    return Array.from({ length: count }, (_, i) => `Shift ${i + 1}`);
  }, [rosterPattern, customRosterDays, shiftsInput]);

  const showEffectiveRate = results.effectiveHourlyRate > 0 && 
    Math.abs(parseFloat(hourlyRate) - results.effectiveHourlyRate) > 0.01;

  const yearlyTax = results.grossYearly - results.netYearly;

  return (
    <div className={`min-h-screen flex flex-col items-center py-6 px-4 md:py-12 transition-colors duration-300 ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <header className="relative text-center space-y-2 mb-8">
           <button 
             onClick={() => setIsDark(!isDark)}
             className={`absolute top-0 right-0 p-2 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-amber-400' : 'bg-white text-slate-600 shadow-sm border border-slate-200'}`}
             aria-label="Toggle theme"
           >
             {isDark ? <Sun size={20} /> : <Moon size={20} />}
           </button>

          {/* LOGO START */}
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-full h-full text-orange-500"
              >
                {/* Document / Pay Stub Outline */}
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                
                {/* Dollar Sign (Simpler, cleaner path) */}
                <line x1="12" y1="4" x2="12" y2="10" />
                <path d="M14 5.5c0-1.2-1.2-1.5-2-1.5s-2 .8-2 1.5c0 2 4 1.5 4 3.5s-1.2 1.5-2 1.5s-2-.8-2-1.5" />

                {/* 3 Lines (Data) */}
                <line x1="7" y1="13" x2="17" y2="13" />
                <line x1="7" y1="16" x2="17" y2="16" />
                <line x1="7" y1="19" x2="13" y2="19" />
                
                {/* Checkmark Circle Badge (Bottom Right Overlay) */}
                <circle cx="18" cy="18" r="5" fill={isDark ? '#020617' : '#f1f5f9'} stroke="currentColor" />
                <path d="M16 18l1.5 1.5 2.5-2.5" />
              </svg>
            </div>
          </div>
          {/* LOGO END */}

          <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>PocketPay</h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Job Pay Calculator</p>
        </header>

        {/* Calculator Inputs */}
        <section className={`p-6 rounded-3xl border shadow-xl space-y-5 transition-colors duration-300 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
          
          {/* Employment Type Toggle */}
          <div className="flex flex-col gap-3">
            <div className={`flex p-1 rounded-xl border relative ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              <button
                onClick={() => setIsCasual(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 z-10 
                  ${!isCasual 
                    ? (isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm border border-slate-200') 
                    : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
              >
                Permanent
              </button>
              <button
                onClick={() => setIsCasual(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 z-10 
                  ${isCasual 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
              >
                Casual
              </button>
            </div>
            {isCasual && (
              <div className={`flex items-start gap-2 px-1 text-xs ${isDark ? 'text-emerald-400/90' : 'text-emerald-700/90'}`}>
                <Info size={14} className="mt-0.5 shrink-0" />
                <p>Casual rates usually include a ~25% loading.</p>
              </div>
            )}
          </div>

          <CalculatorInput
            label="Hourly Rate ($)"
            value={hourlyRate}
            onChange={setHourlyRate}
            icon={<DollarSign size={18} />}
            placeholder="0.00"
            isDark={isDark}
          />

          <RosterHelper 
            pattern={rosterPattern}
            selectedDays={customRosterDays}
            onPatternChange={handleRosterPatternChange}
            onDaysChange={handleRosterDaysChange}
            isDark={isDark}
          />

          {rosterPattern === 'different_days' && (
            <CalculatorInput
              label="Shifts per Week"
              value={shiftsInput}
              onChange={setShiftsInput}
              icon={<CalendarDays size={18} />}
              placeholder="5"
              isDark={isDark}
            />
          )}
          
          <div className={`border-t my-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}></div>

          {/* Shift Details */}
          <CalculatorInput
            label="Hours per shift"
            value={shiftHours}
            onChange={setShiftHours}
            icon={<Clock size={18} />}
            placeholder="8"
            isDark={isDark}
          />

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <label className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Is your meal break paid?
              </label>
              <div className={`flex rounded-lg p-0.5 border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                <button 
                  onClick={() => setIsBreakPaid(true)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${isBreakPaid ? 'bg-emerald-600 text-white' : (isDark ? 'text-slate-500' : 'text-slate-500')}`}
                >
                  Yes
                </button>
                <button 
                  onClick={() => setIsBreakPaid(false)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${!isBreakPaid ? (isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500'}`}
                >
                  No
                </button>
              </div>
            </div>

            {!isBreakPaid && (
              <div className="animate-in fade-in slide-in-from-top-1 mt-1">
                <CalculatorInput
                  label="Break Length (Hours)"
                  value={unpaidBreakLength}
                  onChange={setUnpaidBreakLength}
                  placeholder="0.5"
                  step="0.1"
                  isDark={isDark}
                />
                <p className={`text-[10px] px-1 mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  We've assumed a 30 minute unpaid break. Adjust if needed.
                </p>
              </div>
            )}
          </div>

          {/* Overtime & Detailed Breakdown Toggle */}
          <div className={`border-t pt-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
             <button 
                onClick={() => setShowOvertimeDetails(!showOvertimeDetails)}
                className={`w-full flex justify-between items-center text-left text-sm font-semibold transition-colors py-2 ${isDark ? 'text-slate-300 hover:text-emerald-400' : 'text-slate-700 hover:text-emerald-600'}`}
             >
                <span>Penalty Rates & Overtime</span>
                {showOvertimeDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
             </button>
             
             {showOvertimeDetails && (
               <div className="mt-4 animate-in slide-in-from-top-2 fade-in space-y-4">
                  
                  {/* Grid Header */}
                  <div className={`grid grid-cols-[1fr_60px_60px_70px] gap-2 items-center text-center px-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                     <div className="text-[10px] font-bold uppercase text-left">Day</div>
                     <div className="text-[10px] font-bold uppercase leading-3">Normal Hrs</div>
                     <div className="text-[10px] font-bold uppercase leading-3">OT Hrs</div>
                     <div className="text-[10px] font-bold uppercase leading-3">OT Type</div>
                  </div>

                  {/* Grid Rows */}
                  <div className="space-y-2">
                    {gridRows.map((dayId) => {
                      const override = dayOverrides[dayId];
                      const net = getNetShiftHours();
                      const def = getDefaultBreakdown(net);
                      
                      const normal = override?.normalHours ?? def.normal;
                      const ot = override?.overtimeHours ?? def.ot;
                      const mult = override?.overtimeMultiplier ?? def.mult;

                      return (
                        <div key={dayId} className="grid grid-cols-[1fr_60px_60px_70px] gap-2 items-center">
                          <span className={`text-sm font-medium truncate pl-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{dayId}</span>
                          
                          <input 
                            type="number"
                            value={normal}
                            onChange={(e) => updateDayOverride(dayId, 'normalHours', parseFloat(e.target.value))}
                            className={`border rounded-lg p-1.5 text-center text-xs focus:border-emerald-500 outline-none w-full
                              ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}
                            `}
                          />
                          
                          <input 
                            type="number"
                            value={ot}
                            onChange={(e) => updateDayOverride(dayId, 'overtimeHours', parseFloat(e.target.value))}
                            className={`border rounded-lg p-1.5 text-center text-xs focus:border-emerald-500 outline-none w-full
                              ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}
                            `}
                          />
                          
                          <select
                            value={mult === 1.5 ? '1.5' : mult === 2.0 ? '2.0' : 'custom'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                updateDayOverride(dayId, 'overtimeMultiplier', 1.5);
                              } else {
                                updateDayOverride(dayId, 'overtimeMultiplier', parseFloat(val));
                              }
                            }}
                            className={`border rounded-lg p-1.5 text-xs focus:border-emerald-500 outline-none w-full appearance-none
                              ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}
                            `}
                          >
                            <option value="1.5">1.5x</option>
                            <option value="2.0">2.0x</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>

                  <p className={`text-[10px] italic px-1 pt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    This is a simple estimate only and does not calculate exact award overtime rules. Adjust the hours and overtime type to match your usual week.
                  </p>
               </div>
             )}
          </div>

          <div className={`pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
             <CalculatorInput
              label="Tax Estimate (%)"
              value={taxRate}
              onChange={setTaxRate}
              icon={<Percent size={16} />}
              placeholder="e.g. 25 — just a ballpark"
              type="text"
              tooltip="e.g. 25 — just a ballpark"
              isDark={isDark}
            />
          </div>
        </section>

        {/* Effective Rate Warning */}
        {showEffectiveRate && (
          <div className={`border rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
            <div className={`p-2 rounded-full shrink-0 ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
               <AlertCircle className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>Real Hourly Rate</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${isDark ? 'text-amber-50' : 'text-amber-900'}`}>
                  <AnimatedCurrency value={results.effectiveHourlyRate} />
                </span>
                <span className={`text-xs line-through ${isDark ? 'text-amber-400/70' : 'text-amber-700/50'}`}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(hourlyRate) || 0)}
                </span>
              </div>
              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-amber-300/60' : 'text-amber-800/60'}`}>
                adjusted for breaks & penalties
              </p>
            </div>
          </div>
        )}

        {/* UNIFIED RESULTS CARD */}
        <section className={`rounded-3xl border shadow-2xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="p-6">
            
            {/* WEEKLY SECTION */}
            <div className="mb-6">
              <h3 className={`text-xl font-bold tracking-tight mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Weekly Pay</h3>
              <div className={`pb-3 mb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                 <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                   Total hours per week: <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{results.totalHours.toFixed(1)}</span>
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Gross Weekly */}
                <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-50 border border-slate-100'}`}>
                  <span className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Gross Weekly
                  </span>
                  <span className={`block text-lg font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    <AnimatedCurrency value={results.grossWeekly} />
                  </span>
                </div>
                
                {/* Take Home Weekly */}
                <div className={`p-4 rounded-2xl relative overflow-hidden ${isDark ? 'bg-emerald-900/20 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}`}>
                  <span className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    Take-Home Weekly
                  </span>
                  <span className={`block text-xl font-bold ${isDark ? 'text-white' : 'text-emerald-900'}`}>
                     <AnimatedCurrency value={results.netWeekly} />
                  </span>
                </div>
              </div>
            </div>

            {/* YEARLY SECTION */}
            <div className="mb-6">
              <h3 className={`text-xl font-bold tracking-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Yearly Pay</h3>
              
              <div className="grid grid-cols-2 gap-3">
                 {/* Gross Yearly */}
                 <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-50 border border-slate-100'}`}>
                  <span className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Gross Yearly
                  </span>
                  <span className={`block text-lg font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                     <AnimatedCurrency value={results.grossYearly} maximumFractionDigits={0} />
                  </span>
                </div>

                {/* Take Home Yearly */}
                 <div className={`p-4 rounded-2xl ${isDark ? 'bg-emerald-900/20 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}`}>
                  <span className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    Take-Home Yearly
                  </span>
                  <span className={`block text-lg font-bold ${isDark ? 'text-white' : 'text-emerald-900'}`}>
                     <AnimatedCurrency value={results.netYearly} maximumFractionDigits={0} />
                  </span>
                </div>
              </div>
            </div>

            {/* TAX FOOTER */}
            <div className={`pt-4 border-t flex justify-between items-end ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div>
                <span className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Estimated Yearly Tax</span>
                <span className={`block text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Based on your tax estimate — rough guide only.</span>
              </div>
              <div className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                 <AnimatedCurrency value={yearlyTax} maximumFractionDigits={0} />
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
};

export default App;
