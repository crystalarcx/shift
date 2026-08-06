import React from 'react';
import { Clock, Shield, Sparkles, Code, FileSpreadsheet, Server, HelpCircle } from 'lucide-react';

interface NavbarProps {
  activeTab: 'generator' | 'script' | 'server' | 'guide';
  setActiveTab: (tab: 'generator' | 'script' | 'server' | 'guide') => void;
  recordCount: number;
  totalHours: number;
  weekdayHours: number;
  weekendHours: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  recordCount,
  totalHours,
  weekdayHours,
  weekendHours,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-10">奇美醫院加班批次申報助手</h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/60 rounded-full">
                  v2.0 批次自動化
                </span>
              </div>
              <p className="text-xs text-slate-400">專為院內同仁設計 · 月度加班快速登錄與腳本匯出</p>
            </div>
          </div>

          {/* Stats badge */}
          <div className="hidden lg:flex items-center space-x-4 bg-slate-800/80 px-4 py-1.5 rounded-lg border border-slate-700/60 text-xs">
            <div className="flex items-center space-x-1.5 text-slate-300">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              <span>本月: <strong className="text-white font-semibold">{recordCount}</strong> 筆</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>平日: <strong className="text-emerald-400 font-semibold">{weekdayHours}</strong> h</span>
              <span className="text-slate-500">|</span>
              <span>假日: <strong className="text-amber-400 font-semibold">{weekendHours}</strong> h</span>
              <span className="text-slate-500">|</span>
              <span>總: <strong className="text-cyan-400 font-semibold">{totalHours}</strong> h</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              id="tab-generator-btn"
              onClick={() => setActiveTab('generator')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'generator'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">規則快速產生</span>
            </button>

            <button
              id="tab-script-btn"
              onClick={() => setActiveTab('script')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'script'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Code className="w-4 h-4 text-cyan-400" />
              <span>一鍵網頁腳本</span>
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] rounded">推薦</span>
            </button>

            <button
              id="tab-server-btn"
              onClick={() => setActiveTab('server')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'server'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Server className="w-4 h-4" />
              <span className="hidden md:inline">API 伺服器直連</span>
            </button>

            <button
              id="tab-guide-btn"
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'guide'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden lg:inline">操作說明</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
