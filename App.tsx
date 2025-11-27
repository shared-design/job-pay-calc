import React, { useState, useMemo, useEffect } from 'react';
import { CalculatorInput } from './components/CalculatorInput';
import { ResultCard } from './components/ResultCard';
import { TaxAssistant } from './components/TaxAssistant';
import { RosterHelper } from './components/RosterHelper';
import { DollarSign, Clock, CalendarDays, Percent, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { PayDetails, RosterPattern, DayOverrides } from './types';
import { loadSettings, loadLastInputs, saveSettings, saveLastInputs } from './services/storageService';

const App: React.FC = () => {
  // Initialize state with values from storage or defaults
  const [isCasual, setIsCasual] = useState<boolean>(() => {
    return loadSettings()?.isCasual ?? false;
  });

  const [taxRate, setTaxRate] = useState<string>(() => {
    return loadSettings()?.taxRate ?? '20';
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
      // Get current state or calculate default for this specific day
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
      // Just NetHours * Count
      totalWorkHours = netShiftHours * shifts.length;
      totalNormalHours = totalWorkHours; 
      // In simple mode, we treat all as "Normal" for gross calc
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
    
    // Tax
    const tax = parseFloat(taxRate) || 0;
    const taxMultiplier = 1 - (tax / 100);
    const netWeekly = grossWeekly * taxMultiplier;
    const netYearly = grossYearly * taxMultiplier;

    const effectiveHourlyRate = totalWorkHours > 0 ? grossWeekly / totalWorkHours : 0;

    return {
      grossWeekly,
      grossYearly,
      netWeekly,
      netYearly,
      effectiveHourlyRate
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-6 px-4 md:py-12">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <header className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-2">
            <DollarSign className="text-emerald-400 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">PocketPay</h1>
          <p className="text-slate-400 text-sm">Job Pay Calculator</p>
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
              <div className="flex items-start gap-2 px-1 text-xs text-emerald-400/90">
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
          />

          <RosterHelper 
            pattern={rosterPattern}
            selectedDays={customRosterDays}
            onPatternChange={handleRosterPatternChange}
            onDaysChange={handleRosterDaysChange}
          />

          {rosterPattern === 'different_days' && (
            <CalculatorInput
              label="Shifts per Week"
              value={shiftsInput}
              onChange={setShiftsInput}
              icon={<CalendarDays size={18} />}
              placeholder="5"
            />
          )}
          
          <div className="border-t border-slate-800 my-4"></div>

          {/* Shift Details */}
          <CalculatorInput
            label="Hours per shift"
            value={shiftHours}
            onChange={setShiftHours}
            icon={<Clock size={18} />}
            placeholder="8"
          />

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Is your meal break paid?
              </label>
              <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                <button 
                  onClick={() => setIsBreakPaid(true)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${isBreakPaid ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
                >
                  Yes
                </button>
                <button 
                  onClick={() => setIsBreakPaid(false)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${!isBreakPaid ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
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
                />
                <p className="text-[10px] text-slate-500 px-1 mt-1">
                  We've assumed a 30 minute unpaid break. Adjust if needed.
                </p>
              </div>
            )}
          </div>

          {/* Overtime & Detailed Breakdown Toggle */}
          <div className="border-t border-slate-800 pt-4">
             <button 
                onClick={() => setShowOvertimeDetails(!showOvertimeDetails)}
                className="w-full flex justify-between items-center text-left text-sm font-semibold text-slate-300 hover:text-emerald-400 transition-colors py-2"
             >
                <span>Penalty Rates & Overtime</span>
                {showOvertimeDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
             </button>
             
             {showOvertimeDetails && (
               <div className="mt-4 animate-in slide-in-from-top-2 fade-in space-y-4">
                  
                  {/* Grid Header */}
                  <div className="grid grid-cols-[1fr_60px_60px_70px] gap-2 items-center text-center px-1">
                     <div className="text-[10px] font-bold text-slate-500 uppercase text-left">Day</div>
                     <div className="text-[10px] font-bold text-slate-500 uppercase leading-3">Normal Hrs</div>
                     <div className="text-[10px] font-bold text-slate-500 uppercase leading-3">OT Hrs</div>
                     <div className="text-[10px] font-bold text-slate-500 uppercase leading-3">OT Type</div>
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
                          <span className="text-sm font-medium text-slate-300 truncate pl-1">{dayId}</span>
                          
                          <input 
                            type="number"
                            value={normal}
                            onChange={(e) => updateDayOverride(dayId, 'normalHours', parseFloat(e.target.value))}
                            className="bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-center text-xs text-white focus:border-emerald-500 outline-none w-full"
                          />
                          
                          <input 
                            type="number"
                            value={ot}
                            onChange={(e) => updateDayOverride(dayId, 'overtimeHours', parseFloat(e.target.value))}
                            className="bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-center text-xs text-white focus:border-emerald-500 outline-none w-full"
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
                            className="bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:border-emerald-500 outline-none w-full appearance-none"
                          >
                            <option value="1.5">1.5x</option>
                            <option value="2.0">2.0x</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-slate-500 italic px-1 pt-2">
                    This is a simple estimate only and does not calculate exact award overtime rules. Adjust the hours and overtime type to match your usual week.
                  </p>
               </div>
             )}
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

        {/* Effective Rate Warning */}
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
                adjusted for breaks & penalties
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
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Hours</span>
                <span className="text-xl font-semibold text-slate-200">
                  {results.effectiveHourlyRate > 0 
                     ? ((results.grossWeekly / results.effectiveHourlyRate)).toFixed(1)
                     : '0' 
                  } <span className="text-sm font-normal text-slate-500">/ wk</span>
                </span>
              </div>
           </div>
        </section>

      </div>
    </div>
  );
};

export default App;
