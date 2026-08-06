import React, { useState, useEffect } from 'react';
import { PortalConfig, OvertimeRecord } from './types';
import { Navbar } from './components/Navbar';
import { ConfigHeader } from './components/ConfigHeader';
import { BatchGenerator } from './components/BatchGenerator';
import { RecordTable } from './components/RecordTable';
import { BookmarkletScriptModal } from './components/BookmarkletScriptModal';
import { FieldMapperModal } from './components/FieldMapperModal';
import { GuideTab } from './components/GuideTab';

export default function App() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [targetMonth, setTargetMonth] = useState<string>(defaultMonth);

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

  const [records, setRecords] = useState<OvertimeRecord[]>(() => {
    const saved = localStorage.getItem('chimei_overtime_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
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

  const [activeTab, setActiveTab] = useState<'generator' | 'script' | 'guide'>('generator');
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [isFieldMapperOpen, setIsFieldMapperOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('chimei_portal_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('chimei_overtime_records', JSON.stringify(records));
  }, [records]);

  const handleAddRecords = (newRecords: OvertimeRecord[]) => {
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
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <ConfigHeader
          config={config}
          setConfig={setConfig}
          onOpenFieldMapper={() => setIsFieldMapperOpen(true)}
        />

        {activeTab === 'generator' && (
          <BatchGenerator
            onAddRecords={handleAddRecords}
            targetMonth={targetMonth}
            setTargetMonth={setTargetMonth}
          />
        )}

        {activeTab === 'guide' && <GuideTab />}

        <RecordTable
          records={records}
          setRecords={setRecords}
          config={config}
          onOpenScriptModal={() => setIsScriptModalOpen(true)}
          targetMonth={targetMonth}
        />
      </main>

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

      <footer className="border-t border-neutral-200 bg-white py-8 text-center text-sm text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>奇美醫療財團法人奇美醫院 · 加班時數批次申報助手</div>
          <div className="flex items-center space-x-2 text-xs text-neutral-400">
            <span>院別: {config.ihosp}</span>
            <span>·</span>
            <span>員編: {config.iuser}</span>
            <span>·</span>
            <span className="text-blue-600 font-mono font-medium">CC: {config.ccToken}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
