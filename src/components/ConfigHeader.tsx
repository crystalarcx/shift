import React, { useState } from 'react';
import { PortalConfig } from '../types';
import { ShieldCheck, Server, Key, User, Building, Settings, RefreshCw, CheckCircle, AlertTriangle, ExternalLink, Sliders } from 'lucide-react';

interface ConfigHeaderProps {
  config: PortalConfig;
  setConfig: React.Dispatch<React.SetStateAction<PortalConfig>>;
  onOpenFieldMapper: () => void;
}

export const ConfigHeader: React.FC<ConfigHeaderProps> = ({
  config,
  setConfig,
  onOpenFieldMapper,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    statusCode?: number;
    message?: string;
    detectedFields?: string[];
    note?: string;
  } | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const fullUrl = `${config.targetUrl}?ihosp=${config.ihosp}&iuser=${config.iuser}&CC=${encodeURIComponent(config.ccToken)}`;
      const res = await fetch('/api/chimei/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: fullUrl }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        statusCode: data.statusCode,
        message: data.success ? '成功偵測到奇美醫院系統頁面' : '無法從外部直連奇美內網',
        detectedFields: data.detectedFields,
        note: data.note,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: '連線測試失敗',
        note: '奇美內網伺服器一般限制醫事人員區域網路存取。請放心，使用「瀏覽器一鍵腳本」可以直接在您登入後的瀏覽器頁面運作！',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFullUrlParse = (urlInput: string) => {
    try {
      const urlObj = new URL(urlInput);
      const params = new URLSearchParams(urlObj.search);
      const ihosp = params.get('ihosp') || config.ihosp;
      const iuser = params.get('iuser') || config.iuser;
      const ccToken = params.get('CC') || config.ccToken;

      setConfig((prev) => ({
        ...prev,
        targetUrl: `${urlObj.origin}${urlObj.pathname}`,
        ihosp,
        iuser,
        ccToken,
      }));
    } catch (e) {
      // Invalid URL syntax ignore or partial update
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-800/60 text-cyan-400">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              奇美醫院加班系統參數設定
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                預設院員: {config.iuser || 'A30825'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              已由您提供的專屬 URL 自動解析驗證參數（院別 ihosp={config.ihosp}, 員編 iuser={config.iuser}）
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            id="test-connection-btn"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium transition flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? '偵測連線中...' : '測試伺服器連線'}</span>
          </button>

          <button
            id="open-field-mapper-btn"
            onClick={onOpenFieldMapper}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium transition flex items-center space-x-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>自訂欄位對應名稱</span>
          </button>

          <a
            href={`${config.targetUrl}?ihosp=${config.ihosp}&iuser=${config.iuser}&CC=${encodeURIComponent(config.ccToken)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition flex items-center space-x-1"
          >
            <span>直接開啟申報網頁</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main Parameters Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        {/* Hospital Branch */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
            <span>院別代碼 (ihosp)</span>
            <span className="text-[10px] text-slate-400">10:總院 / 20:柳營 / 30:佳里</span>
          </label>
          <div className="relative">
            <select
              id="ihosp-select"
              value={config.ihosp}
              onChange={(e) => setConfig({ ...config, ihosp: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="10">10 - 奇美總院 (永康)</option>
              <option value="20">20 - 柳營奇美醫院</option>
              <option value="30">30 - 佳里奇美醫院</option>
            </select>
          </div>
        </div>

        {/* User ID */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            員工代號 / 員編 (iuser)
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="iuser-input"
              type="text"
              value={config.iuser}
              onChange={(e) => setConfig({ ...config, iuser: e.target.value })}
              placeholder="例如: A30825"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* CC Token */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            安全金鑰 Token (CC)
          </label>
          <div className="relative">
            <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="cc-token-input"
              type="text"
              value={config.ccToken}
              onChange={(e) => setConfig({ ...config, ccToken: e.target.value })}
              placeholder="例如: MdgQMdgQ10V=QQ"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
            />
          </div>
        </div>

        {/* Target URL */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            目標申報網址
          </label>
          <input
            id="target-url-input"
            type="text"
            value={config.targetUrl}
            onChange={(e) => {
              const val = e.target.value;
              setConfig({ ...config, targetUrl: val });
              if (val.includes('?')) {
                handleFullUrlParse(val);
              }
            }}
            placeholder="https://www.chimei.org.tw/overwork/index5.htm"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
          />
        </div>
      </div>

      {/* Test Connection Output Panel */}
      {testResult && (
        <div
          className={`mt-4 p-3.5 rounded-xl border text-xs ${
            testResult.success
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
              : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
          }`}
        >
          <div className="flex items-start space-x-2">
            {testResult.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-semibold text-sm mb-1">{testResult.message}</div>
              {testResult.note && <div className="text-slate-300 text-xs leading-relaxed">{testResult.note}</div>}
              {testResult.detectedFields && testResult.detectedFields.length > 0 && (
                <div className="mt-2 text-[11px] text-slate-400">
                  偵測到網頁表單欄位: <code className="text-cyan-300">{testResult.detectedFields.join(', ')}</code>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
