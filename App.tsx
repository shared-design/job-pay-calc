import React, { useState, useMemo, useEffect } from 'react';
import { CalculatorInput } from './components/CalculatorInput';
import { RosterHelper } from './components/RosterHelper';
import { AnimatedCurrency } from './components/AnimatedCurrency';
import { DollarSign, Clock, CalendarDays, Percent, AlertCircle, Info, ChevronDown, ChevronUp, Sun, Moon } from 'lucide-react';
import { PayDetails, RosterPattern, DayOverrides } from './types';
import { loadSettings, loadLastInputs, saveSettings, saveLastInputs } from './services/storageService';

const App: React.FC = () => {
  // Theme State - Defaulting to Light for BARRI theme but allowing toggle
  const [isDark, setIsDark] = useState<boolean>(false);

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
    const rawShiftHours = parseFloat(shiftHours) || 0; // Total time at work (Presence)
    
    let totalNormalHours = 0;
    let totalOvertimePay = 0; 
    let totalPaidHours = 0; // Hours you are paid for (Net)
    let totalPresenceHours = 0; // Hours you are physically at work (Gross)

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
      totalPaidHours = netShiftHours * shifts.length;
      totalNormalHours = totalPaidHours; 
      
      // In simple mode, presence is just raw shift length * days
      totalPresenceHours = rawShiftHours * shifts.length;
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
        const dayPaidHours = normal + ot;
        totalPaidHours += dayPaidHours;
        
        const breakDuration = isBreakPaid ? 0 : (parseFloat(unpaidBreakLength) || 0);
        totalPresenceHours += (dayPaidHours + breakDuration);
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

    // Effective Rate = Gross Pay / Total Time At Work (Presence)
    const effectiveHourlyRate = totalPresenceHours > 0 ? grossWeekly / totalPresenceHours : 0;

    return {
      grossWeekly,
      grossYearly,
      netWeekly,
      netYearly,
      effectiveHourlyRate,
      totalHours: totalPaidHours
    };
  }, [hourlyRate, shiftHours, isBreakPaid, unpaidBreakLength, shiftsInput, rosterPattern, customRosterDays, showOvertimeDetails, dayOverrides, taxRate]);

  // Determine rows for the grid
  const gridRows = useMemo(() => {
    if (rosterPattern === 'same_days') return customRosterDays;
    const count = Math.max(0, Math.round(parseFloat(shiftsInput) || 0));
    return Array.from({ length: count }, (_, i) => `Shift ${i + 1}`);
  }, [rosterPattern, customRosterDays, shiftsInput]);

  const showEffectiveRate = results.effectiveHourlyRate > 0 && 
    Math.abs(parseFloat(hourlyRate) - results.effectiveHourlyRate) > 0.05;

  const yearlyTax = results.grossYearly - results.netYearly;

  return (
    <div className={`min-h-screen flex flex-col items-center pb-12 font-sans transition-colors duration-300 ${isDark ? 'bg-[#020617]' : 'bg-slate-50'}`}>
      
      {/* BARRI HEADER */}
      <header className={`w-full shadow-sm border-b sticky top-0 z-50 transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="max-w-md mx-auto px-4 py-2 flex justify-center items-center h-24 relative">
          
          <div className="h-20 w-auto flex items-center justify-center">
            <img 
              src="/barri_logo.png" 
              alt="BARRI" 
              className="h-full w-auto object-contain"
            />
          </div>

          {/* Theme Toggle */}
          <button 
            onClick={() => setIsDark(!isDark)}
            className={`absolute right-4 p-2.5 rounded-full transition-all duration-300 hover:scale-110 ${isDark ? 'bg-slate-800 text-orange-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:text-orange-500'}`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <div className="w-full max-w-md space-y-6 px-4 pt-6">
        
        {/* INPUTS CARD */}
        <section className={`p-6 md:p-8 rounded-[2rem] shadow-xl space-y-6 border transition-colors duration-300 
          ${isDark ? 'bg-slate-800 border-slate-700 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/60'}`}>
          
          {/* Employment Type Toggle */}
          <div className="flex flex-col gap-3">
            <div className={`flex p-1.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
              <button
                onClick={() => setIsCasual(false)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 font-heading
                  ${!isCasual 
                    ? (isDark ? 'bg-slate-800 text-white shadow-sm border border-slate-700' : 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5')
                    : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}
              >
                Permanent
              </button>
              <button
                onClick={() => setIsCasual(true)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 font-heading
                  ${isCasual 
                    ? 'bg-green-500 text-white shadow-sm shadow-green-500/30' 
                    : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}
              >
                Casual
              </button>
            </div>
            {isCasual && (
              <div className="flex items-start gap-2 px-2 text-xs text-green-500 font-bold">
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
          
          <div className={`border-t my-2 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}></div>

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
              <label className={`text-xs font-bold uppercase tracking-wider font-heading ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                Meal break paid?
              </label>
              <div className={`flex rounded-xl p-1 border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <button 
                  onClick={() => setIsBreakPaid(true)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${isBreakPaid ? 'bg-green-500 text-white shadow-sm shadow-green-500/30' : (isDark ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-700')}`}
                >
                  Yes
                </button>
                <button 
                  onClick={() => setIsBreakPaid(false)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${!isBreakPaid ? (isDark ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-700 shadow-sm') : (isDark ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-700')}`}
                >
                  No
                </button>
              </div>
            </div>

            {!isBreakPaid && (
              <div className="animate-in fade-in slide-in-from-top-1 mt-2">
                <CalculatorInput
                  label="Break Length (Hours)"
                  value={unpaidBreakLength}
                  onChange={setUnpaidBreakLength}
                  placeholder="0.5"
                  step="0.1"
                  isDark={isDark}
                />
                <p className={`text-[10px] px-1 mt-1.5 font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  We've assumed a 30 minute unpaid break. Adjust if needed.
                </p>
              </div>
            )}
          </div>

          {/* Overtime & Detailed Breakdown Toggle */}
          <div className={`border-t pt-4 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
             <button 
                onClick={() => setShowOvertimeDetails(!showOvertimeDetails)}
                className={`w-full flex justify-between items-center text-left text-sm font-bold transition-colors py-2 group font-heading ${isDark ? 'text-slate-400 hover:text-orange-400' : 'text-slate-500 hover:text-orange-500'}`}
             >
                <span className="group-hover:translate-x-1 transition-transform">Penalty Rates & Overtime</span>
                {showOvertimeDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
             </button>
             
             {showOvertimeDetails && (
               <div className="mt-4 animate-in slide-in-from-top-2 fade-in space-y-4">
                  
                  {/* Grid Header */}
                  <div className={`grid grid-cols-[1fr_60px_60px_70px] gap-2 items-center text-center px-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                     <div className="text-[10px] font-bold uppercase text-left tracking-wider">Day</div>
                     <div className="text-[10px] font-bold uppercase leading-3 tracking-wider">Normal</div>
                     <div className="text-[10px] font-bold uppercase leading-3 tracking-wider">OT Hrs</div>
                     <div className="text-[10px] font-bold uppercase leading-3 tracking-wider">Rate</div>
                  </div>

                  {/* Grid Rows */}
                  <div className="space-y-2.5">
                    {gridRows.map((dayId) => {
                      const override = dayOverrides[dayId];
                      const net = getNetShiftHours();
                      const def = getDefaultBreakdown(net);
                      
                      const normal = override?.normalHours ?? def.normal;
                      const ot = override?.overtimeHours ?? def.ot;
                      const mult = override?.overtimeMultiplier ?? def.mult;

                      return (
                        <div key={dayId} className="grid grid-cols-[1fr_60px_60px_70px] gap-2 items-center group">
                          <span className={`text-sm font-bold truncate pl-1 ${isDark ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-600 group-hover:text-slate-800'}`}>{dayId}</span>
                          
                          <input 
                            type="number"
                            value={normal}
                            onChange={(e) => updateDayOverride(dayId, 'normalHours', parseFloat(e.target.value))}
                            className={`border rounded-lg p-2 text-center text-xs font-bold focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 outline-none w-full transition-all
                              ${isDark 
                                ? 'bg-slate-900 border-slate-700 text-white hover:border-slate-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'}
                            `}
                          />
                          
                          <input 
                            type="number"
                            value={ot}
                            onChange={(e) => updateDayOverride(dayId, 'overtimeHours', parseFloat(e.target.value))}
                            className={`border rounded-lg p-2 text-center text-xs font-bold focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 outline-none w-full transition-all
                              ${isDark 
                                ? 'bg-slate-900 border-slate-700 text-white hover:border-slate-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'}
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
                            className={`border rounded-lg p-2 text-xs font-bold focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 outline-none w-full appearance-none transition-all cursor-pointer
                              ${isDark 
                                ? 'bg-slate-900 border-slate-700 text-white hover:border-slate-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'}
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

                  <p className={`text-[10px] font-medium italic px-1 pt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Estimate only. Adjust hours to match your week.
                  </p>
               </div>
             )}
          </div>

          <div className={`pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
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
          <div className={`border rounded-2xl p-5 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm ${isDark ? 'bg-orange-900/10 border-orange-500/20' : 'bg-orange-50 border-orange-100'}`}>
            <div className={`p-2.5 rounded-full shrink-0 ${isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-100 text-orange-500'}`}>
               <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-xs font-extrabold uppercase tracking-wide font-heading ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>Real Hourly Rate</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  <AnimatedCurrency value={results.effectiveHourlyRate} />
                </span>
                <span className={`text-sm line-through font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(hourlyRate) || 0)}
                </span>
              </div>
              <p className={`text-[11px] mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                adjusted for breaks & penalties
              </p>
            </div>
          </div>
        )}

        {/* RESULTS CARD */}
        <section className={`rounded-[2rem] shadow-xl overflow-hidden border mb-8 transition-colors duration-300
          ${isDark ? 'bg-slate-800 border-slate-700 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/60'}`}>
          <div className="p-6 md:p-8">
            
            {/* WEEKLY SECTION */}
            <div className="mb-8">
              <h3 className={`text-2xl font-extrabold tracking-tight mb-2 font-heading ${isDark ? 'text-white' : 'text-slate-800'}`}>Weekly Pay</h3>
              <div className={`pb-4 mb-5 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                 <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                   Total hours per week: <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{results.totalHours.toFixed(1)}</span>
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Gross Weekly */}
                <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <span className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 font-heading ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Gross Weekly
                  </span>
                  <span className="block text-xl md:text-2xl font-bold text-orange-500">
                    <AnimatedCurrency value={results.grossWeekly} />
                  </span>
                </div>
                
                {/* Take Home Weekly */}
                <div className={`p-5 rounded-2xl border relative overflow-hidden group ${isDark ? 'bg-green-900/10 border-green-500/20' : 'bg-green-50 border-green-100'}`}>
                  <span className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-green-600 font-heading relative z-10">
                    Take-Home Weekly
                  </span>
                  <span className={`block text-2xl md:text-3xl font-black relative z-10 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                     <AnimatedCurrency value={results.netWeekly} />
                  </span>
                </div>
              </div>
            </div>

            {/* YEARLY SECTION */}
            <div className="mb-6">
              <h3 className={`text-2xl font-extrabold tracking-tight mb-5 font-heading ${isDark ? 'text-white' : 'text-slate-800'}`}>Yearly Pay</h3>
              
              <div className="grid grid-cols-2 gap-4">
                 {/* Gross Yearly */}
                 <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <span className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 font-heading ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Gross Yearly
                  </span>
                  <span className="block text-lg md:text-xl font-bold text-orange-500">
                     <AnimatedCurrency value={results.grossYearly} maximumFractionDigits={0} />
                  </span>
                </div>

                {/* Take Home Yearly */}
                 <div className={`p-5 rounded-2xl border ${isDark ? 'bg-green-900/10 border-green-500/20' : 'bg-green-50 border-green-100'}`}>
                  <span className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-green-600 font-heading">
                    Take-Home Yearly
                  </span>
                  <span className={`block text-lg md:text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                     <AnimatedCurrency value={results.netYearly} maximumFractionDigits={0} />
                  </span>
                </div>
              </div>
            </div>

            {/* TAX FOOTER */}
            <div className={`pt-5 border-t flex justify-between items-end ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <div>
                <span className={`block text-sm font-bold font-heading ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Estimated Yearly Tax</span>
                <span className={`block text-[11px] font-medium mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Based on your tax estimate.</span>
              </div>
              <div className={`text-base font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
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
