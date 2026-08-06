import React, { useState, useEffect } from 'react';
import { PortalConfig, OvertimeRecord } from './types';
import { Navbar } from './components/Navbar';
import { ConfigHeader } from './components/ConfigHeader';
import { BatchGenerator } from './components/BatchGenerator';
import { RecordTable } from './components/RecordTable';
import { BookmarkletScriptModal } from './components/BookmarkletScriptModal';
import { FieldMapperModal } from './components/FieldMapperModal';
import { GuideTab } from './components/GuideTab';
import { Clock, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';

export default function App() {
  // Default target month format YYYY-MM
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [targetMonth, setTargetMonth] = useState<string>(defaultMonth);

  // Portal Configuration with localStorage
  const [config, setConfig] = useState<PortalConfig>(() => {
    const saved = localStorage.getItem('chimei_portal_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      targetUrl: 'https://www.chimei.org.tw/overwork/index5.htm',
      postUrl: 'https://www.chimei.org.tw/overwork/save.htm',
      ihosp: '10',
      iuser: 'A30825',
      ccToken: 'MdgQMdgQ10V=QQ',
      cookieString: '',
      fieldMapping: {
        dateField: 'd_over_date',
        startTimeField: 'over_time_start',
        endTimeField: 'over_time_end',
        hoursField: 'over_hours',
        typeField: 'over_type',
        reasonField: 'over_reason',
        userField: 'iuser',
        hospField: 'ihosp',
        tokenField: 'CC',
      },
    };
  });

  // Records with localStorage
  const [records, setRecords] = useState<OvertimeRecord[]>(() => {
    const saved = localStorage.getItem('chimei_overtime_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    // Initial sample default records for current month
    return [
      {
        id: 'rec_1',
        date: `${defaultMonth}-03`,
        startTime: '1730',
        endTime: '1930',
        hours: 2,
        type: '延時加班',
        reason: '臨床處置、病患照護與寫病歷',
        status: 'pending',
      },
      {
        id: 'rec_2',
        date: `${defaultMonth}-05`,
        startTime: '1730',
        endTime: '1930',
        hours: 2,
        type: '延時加班',
        reason: '手術延遲與術後交接紀錄',
        status: 'pending',
      },
    ];
  });

  const [activeTab, setActiveTab] = useState<'generator' | 'script' | 'server' | 'guide'>('generator');
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [isFieldMapperOpen, setIsFieldMapperOpen] = useState(false);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('chimei_portal_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('chimei_overtime_records', JSON.stringify(records));
  }, [records]);

  // Handle adding new batch records
  const handleAddRecords = (newRecords: OvertimeRecord[]) => {
    // Avoid duplicate records based on date + start time + end time
    const existingKeys = new Set(records.map((r) => `${r.date}_${r.startTime}_${r.endTime}`));
    const filteredNew = newRecords.filter((nr) => !existingKeys.has(`${nr.date}_${nr.startTime}_${nr.endTime}`));

    if (filteredNew.length < newRecords.length) {
      try {
        const overwrite = window.confirm(`發現已有 ${newRecords.length - filteredNew.length} 筆相同時間段的紀錄。是否覆蓋？\n(注意：同一天可新增不同時段的加班)`);
        if (overwrite) {
          const newKeysSet = new Set(newRecords.map((r) => `${r.date}_${r.startTime}_${r.endTime}`));
          setRecords([...records.filter((r) => !newKeysSet.has(`${r.date}_${r.startTime}_${r.endTime}`)), ...newRecords]);
          return;
        }
      } catch (e) {
        // If confirm fails in iframe, just overwrite by default
        const newKeysSet = new Set(newRecords.map((r) => `${r.date}_${r.startTime}_${r.endTime}`));
        setRecords([...records.filter((r) => !newKeysSet.has(`${r.date}_${r.startTime}_${r.endTime}`)), ...newRecords]);
        return;
      }
    }

    setRecords([...records, ...filteredNew]);
  };

  const currentMonthRecords = records.filter((r) => r.date.startsWith(targetMonth));
  
  const isWeekend = (dateStr: string) => {
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6;
  };
  
  const totalHours = currentMonthRecords.reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
  const weekdayHours = currentMonthRecords.filter(r => !isWeekend(r.date)).reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
  const weekendHours = currentMonthRecords.filter(r => isWeekend(r.date)).reduce((sum, r) => sum + (Number(r.hours) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'script') {
            setIsScriptModalOpen(true);
          }
        }}
        recordCount={currentMonthRecords.length}
        totalHours={totalHours}
        weekdayHours={weekdayHours}
        weekendHours={weekendHours}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* System & URL Configuration Card */}
        <ConfigHeader
          config={config}
          setConfig={setConfig}
          onOpenFieldMapper={() => setIsFieldMapperOpen(true)}
        />

        {/* Tab Content 1: Batch Generator */}
        {activeTab === 'generator' && (
          <BatchGenerator
            onAddRecords={handleAddRecords}
            targetMonth={targetMonth}
            setTargetMonth={setTargetMonth}
          />
        )}

        {/* Tab Content 3: Server Direct Submission Info */}
        {activeTab === 'server' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-6 text-xs text-slate-300 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              API 伺服器直連模式說明 (Server Proxy)
            </h3>
            <p>
              伺服器代理模式會由後端 Node.js 發送 HTTP POST 請求給 <code>{config.targetUrl}</code>。
              如果您的電腦正處於奇美醫院內網（或連接院內 VPN），直接點擊下方表單的「伺服器直連發送」即可送出！
            </p>
            <p className="text-amber-300">
              提示：若受限於醫院網頁防護，推薦使用上方「一鍵網頁腳本」功能，在您登入奇美網頁的瀏覽器中點擊書籤，100% 能成功打入！
            </p>
          </div>
        )}

        {/* Tab Content 4: Guide & FAQs */}
        {activeTab === 'guide' && <GuideTab />}

        {/* Main Monthly Overtime Table */}
        <RecordTable
          records={records}
          setRecords={setRecords}
          config={config}
          onOpenScriptModal={() => setIsScriptModalOpen(true)}
          targetMonth={targetMonth}
        />
      </main>

      {/* Modals */}
      <BookmarkletScriptModal
        records={records}
        config={config}
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
      />

      <FieldMapperModal
        config={config}
        setConfig={setConfig}
        isOpen={isFieldMapperOpen}
        onClose={() => setIsFieldMapperOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>奇美醫療財團法人奇美醫院 · 加班時數批次申報助手</div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <span>院別: {config.ihosp}</span>
            <span>·</span>
            <span>員編: {config.iuser}</span>
            <span>·</span>
            <span className="text-cyan-400 font-mono">CC: {config.ccToken}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
