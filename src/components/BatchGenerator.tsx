import React, { useState } from 'react';
import { OvertimeRecord, OvertimeType } from '../types';
import { Calendar, Plus, Zap, CheckSquare, Square, Clock, AlertCircle, FileText, Sparkles, Filter } from 'lucide-react';

interface BatchGeneratorProps {
  onAddRecords: (records: OvertimeRecord[]) => void;
  targetMonth: string;
  setTargetMonth: (m: string) => void;
}

export const BatchGenerator: React.FC<BatchGeneratorProps> = ({
  onAddRecords,
  targetMonth,
  setTargetMonth,
}) => {
  const [overtimeType, setOvertimeType] = useState<OvertimeType>('延時加班');
  const [startTime, setStartTime] = useState('1730');
  const [endTime, setEndTime] = useState('1930');
  const [hours, setHours] = useState(2.0);
  const [reason, setReason] = useState('處置病人、會診與病歷撰寫');
  
  // Selection presets
  const [includeWeekdays, setIncludeWeekdays] = useState(true);
  const [includeWeekends, setIncludeWeekends] = useState(false);

  // Custom multi-select date array for current month
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // Calculate days in selected month
  const getDaysInMonth = (yearMonthStr: string) => {
    const [yearStr, monthStr] = yearMonthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-12
    const daysInMonth = new Date(year, month, 0).getDate();

    const days: { dateStr: string; dayNum: number; dayOfWeek: number; isWeekend: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dayOfWeek = dateObj.getDay(); // 0 is Sun, 6 is Sat
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }
    return days;
  };

  const currentMonthDays = getDaysInMonth(targetMonth);

  // Quick select actions
  const handleSelectWeekdaysOnly = () => {
    const weekdayStrs = currentMonthDays.filter((d) => !d.isWeekend).map((d) => d.dateStr);
    setSelectedDates(weekdayStrs);
  };

  const handleSelectWeekendsOnly = () => {
    const weekendStrs = currentMonthDays.filter((d) => d.isWeekend).map((d) => d.dateStr);
    setSelectedDates(weekendStrs);
  };

  const handleSelectAllDays = () => {
    setSelectedDates(currentMonthDays.map((d) => d.dateStr));
  };

  const handleClearSelection = () => {
    setSelectedDates([]);
  };

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter((d) => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  const handleGenerate = () => {
    if (selectedDates.length === 0) {
      alert('請先在日曆中點選欲申報加班的日期！');
      return;
    }

    const newRecords: OvertimeRecord[] = selectedDates.map((dateStr) => ({
      id: `${dateStr}_${Math.random().toString(36).substring(2, 7)}`,
      date: dateStr,
      startTime,
      endTime,
      hours,
      type: overtimeType,
      reason,
      status: 'pending',
    }));

    onAddRecords(newRecords);
  };

  const handleQuickGenerate = (type: 'day7' | 'day8' | 'night' | 'hah') => {
    if (selectedDates.length === 0) {
      alert('請先在日曆中點選欲申報加班的日期！');
      return;
    }

    const newRecords: OvertimeRecord[] = [];

    selectedDates.forEach((dateStr) => {
      const addRec = (st: string, et: string, hrs: number, nextDay: boolean = false) => {
        let targetDate = dateStr;
        if (nextDay) {
          const [y, m, d] = dateStr.split('-');
          const dateObj = new Date(Number(y), Number(m) - 1, Number(d) + 1);
          targetDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        }
        newRecords.push({
          id: `${targetDate}_${Math.random().toString(36).substring(2, 7)}`,
          date: targetDate,
          startTime: st,
          endTime: et,
          hours: hrs,
          type: overtimeType,
          reason,
          status: 'pending',
        });
      };

      if (type === 'day7') {
        addRec('0500', '0700', 2.0);
        addRec('1800', '2000', 2.0);
      } else if (type === 'day8') {
        addRec('0600', '0800', 2.0);
        addRec('1800', '2000', 2.0);
      } else if (type === 'night') {
        addRec('1400', '1600', 2.0);
        addRec('0200', '0400', 2.0, true);
      } else if (type === 'hah') {
        addRec('0900', '1200', 3.0);
      }
    });

    onAddRecords(newRecords);
  };

  const commonReasons = [
    '處置病人、會診與病歷撰寫',
    '開會',
    'HAH 事務',
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100 mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              月度常規加班一鍵批次產生器
            </h3>
            <p className="text-xs text-slate-400">
              勾選月份日曆與加班時間範本，自動產生整個月份的加班申報明細
            </p>
          </div>
        </div>

        {/* Target Month Select */}
        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-300 font-medium">申報月份:</label>
          <input
            id="target-month-picker"
            type="month"
            value={targetMonth}
            onChange={(e) => {
              setTargetMonth(e.target.value);
              setSelectedDates([]);
            }}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>
      </div>

      {/* Main Form Settings & Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 flex-col-reverse lg:flex-row">
        
        {/* Left Column: Month Calendar Date Picker (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-cyan-400" />
              1. 點選欲加入的日期 ({targetMonth})
            </span>

            {/* Quick Select Buttons */}
            <div className="flex items-center space-x-1.5 text-[11px]">
              <button
                type="button"
                onClick={handleSelectWeekdaysOnly}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
              >
                平日
              </button>
              <button
                type="button"
                onClick={handleSelectWeekendsOnly}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
              >
                週末
              </button>
              <button
                type="button"
                onClick={handleSelectAllDays}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                全選
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition"
              >
                清除
              </button>
            </div>
          </div>

          {/* Calendar Grid Header (Mon-Sun) */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 mb-1">
            <div>日</div>
            <div>一</div>
            <div>二</div>
            <div>三</div>
            <div>四</div>
            <div>五</div>
            <div>六</div>
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Padding offset for first day of month */}
            {Array.from({ length: currentMonthDays[0]?.dayOfWeek || 0 }).map((_, i) => (
              <div key={`empty_${i}`} className="h-9 rounded border border-transparent" />
            ))}

            {currentMonthDays.map((d) => {
              const isSelected = selectedDates.includes(d.dateStr);
              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => toggleDate(d.dateStr)}
                  className={`h-9 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center border ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md font-bold scale-[1.02]'
                      : d.isWeekend
                      ? 'bg-slate-900 border-slate-800 text-amber-400/80 hover:border-slate-700'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>{d.dayNum}</span>
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-800 text-right">
            <span className="text-xs text-slate-400">
              已選擇 <strong className="text-cyan-400 font-bold">{selectedDates.length}</strong> 天
            </span>
          </div>
        </div>

        {/* Right Column: Actions (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* 1. Quick Presets */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-sm">
            <label className="block text-xs font-semibold text-slate-200 mb-3">
              2a. 快速套用範本產生 <span className="text-[10px] text-slate-500 font-normal block mt-0.5">依左側勾選日期，一鍵自動帶入多筆</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickGenerate('day7')}
                className="p-2.5 rounded-xl bg-indigo-950 border border-indigo-800 hover:bg-indigo-900 transition flex flex-col items-start gap-1"
              >
                <span className="text-xs font-bold text-indigo-300">白班(7)</span>
                <span className="text-[10px] text-indigo-400/80">0500-0700 & 1800-2000</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickGenerate('day8')}
                className="p-2.5 rounded-xl bg-indigo-950 border border-indigo-800 hover:bg-indigo-900 transition flex flex-col items-start gap-1"
              >
                <span className="text-xs font-bold text-indigo-300">白班(8)</span>
                <span className="text-[10px] text-indigo-400/80">0600-0800 & 1800-2000</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickGenerate('night')}
                className="p-2.5 rounded-xl bg-purple-950 border border-purple-800 hover:bg-purple-900 transition flex flex-col items-start gap-1"
              >
                <span className="text-xs font-bold text-purple-300">小夜</span>
                <span className="text-[10px] text-purple-400/80">1400-1600 & 隔日0200-0400</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickGenerate('hah')}
                className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-800 hover:bg-emerald-900 transition flex flex-col items-start gap-1"
              >
                <span className="text-xs font-bold text-emerald-300">HAH</span>
                <span className="text-[10px] text-emerald-400/80">0900-1200</span>
              </button>
            </div>
          </div>

          {/* 2. Custom Generate */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
            <label className="block text-xs font-semibold text-slate-200">
              2b. 自訂時間產生 <span className="text-[10px] text-slate-500 font-normal">或手動設定時段與事由</span>
            </label>
            
            {/* Time 0000 format */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  起始時間 <span className="text-[10px] font-normal">(0000格式)</span>
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="1730"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-sm text-center text-amber-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  結束時間 <span className="text-[10px] font-normal">(0000格式)</span>
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="1930"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-sm text-center text-amber-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Reason Input with Quick Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                事由描述 / 加班說明
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例如: 處置病人與交接寫病歷"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 mb-2"
              />
              <div className="flex flex-wrap gap-1.5">
                {commonReasons.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReason(r)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 transition"
                  >
                    + {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/50 flex flex-col gap-3">
              <span className="text-xs text-slate-400">
                時數小計：<strong className="text-cyan-400 font-bold">{selectedDates.length}</strong> 天 × {hours}h ={' '}
                <strong className="text-emerald-400 font-bold">{selectedDates.length * hours}</strong>h
              </span>

              <button
                id="generate-batch-records-btn"
                type="button"
                onClick={handleGenerate}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>依自訂時間產生 ({selectedDates.length}筆)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
