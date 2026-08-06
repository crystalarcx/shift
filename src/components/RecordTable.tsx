import React, { useState } from 'react';
import { OvertimeRecord, PortalConfig } from '../types';
import {
  FileSpreadsheet,
  Trash2,
  Send,
  Code,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
  CheckSquare,
  Square,
  Filter,
} from 'lucide-react';

interface RecordTableProps {
  records: OvertimeRecord[];
  setRecords: React.Dispatch<React.SetStateAction<OvertimeRecord[]>>;
  config: PortalConfig;
  onOpenScriptModal: () => void;
  targetMonth: string;
}

export const RecordTable: React.FC<RecordTableProps> = ({
  records,
  setRecords,
  config,
  onOpenScriptModal,
  targetMonth,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSendingServer, setIsSendingServer] = useState(false);
  const [batchReasonText, setBatchReasonText] = useState('');
  const [showReasonEditor, setShowReasonEditor] = useState(false);

  // Filter records by selected month if needed
  const monthRecords = records.filter((r) => r.date.startsWith(targetMonth));

  const isWeekend = (dateStr: string) => {
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6;
  };

  const totalHours = monthRecords.reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
  const weekdayHours = monthRecords.filter(r => !isWeekend(r.date)).reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
  const weekendHours = monthRecords.filter(r => isWeekend(r.date)).reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
  
  const pendingCount = monthRecords.filter((r) => r.status === 'pending').length;
  const successCount = monthRecords.filter((r) => r.status === 'success').length;

  const handleSelectAll = () => {
    if (selectedIds.length === monthRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(monthRecords.map((r) => r.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setRecords(records.filter((r) => !selectedIds.includes(r.id)));
    setSelectedIds([]);
  };

  const handleBatchUpdateReason = () => {
    if (!batchReasonText.trim() || selectedIds.length === 0) return;
    setRecords(
      records.map((r) => {
        if (selectedIds.includes(r.id)) {
          return { ...r, reason: batchReasonText };
        }
        return r;
      })
    );
    setShowReasonEditor(false);
    setBatchReasonText('');
  };

  // Server proxy batch submit
  const handleServerBatchSubmit = async () => {
    const recordsToSend = monthRecords.filter((r) => selectedIds.length === 0 || selectedIds.includes(r.id));
    if (recordsToSend.length === 0) {
      alert('請先選擇欲送出的加班筆數！');
      return;
    }

    setIsSendingServer(true);

    for (let i = 0; i < recordsToSend.length; i++) {
      const rec = recordsToSend[i];
      setRecords((prev) =>
        prev.map((item) => (item.id === rec.id ? { ...item, status: 'sending' } : item))
      );

      try {
        const res = await fetch('/api/chimei/submit-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config,
            record: rec,
          }),
        });

        const result = await res.json();
        setRecords((prev) =>
          prev.map((item) =>
            item.id === rec.id
              ? {
                  ...item,
                  status: result.success ? 'success' : 'failed',
                  responseMessage: result.message,
                  submittedAt: new Date().toLocaleTimeString(),
                }
              : item
          )
        );
      } catch (err: any) {
        setRecords((prev) =>
          prev.map((item) =>
            item.id === rec.id
              ? {
                  ...item,
                  status: 'failed',
                  responseMessage: '直連網路受限 (請改用書籤腳本)',
                }
              : item
          )
        );
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    setIsSendingServer(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100">
      {/* Table Header & Summary Cards */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800 mb-5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            月度加班申報明細表 ({targetMonth})
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            共 <strong className="text-cyan-300 font-semibold">{monthRecords.length}</strong> 筆記錄 ·{' '}
            平日 <strong className="text-emerald-400 font-semibold">{weekdayHours}</strong> h ·{' '}
            假日 <strong className="text-amber-400 font-semibold">{weekendHours}</strong> h ·{' '}
            總時數 <strong className="text-cyan-400 font-semibold">{totalHours}</strong> h
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Bookmarklet Button */}
          <button
            id="open-script-generator-btn"
            type="button"
            onClick={onOpenScriptModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center space-x-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>產生網頁自動填表書籤 (100% 成功)</span>
          </button>

          <button
            id="server-proxy-submit-btn"
            type="button"
            onClick={handleServerBatchSubmit}
            disabled={isSendingServer || monthRecords.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition flex items-center space-x-1.5"
          >
            <Send className={`w-3.5 h-3.5 text-cyan-400 ${isSendingServer ? 'animate-spin' : ''}`} />
            <span>伺服器直連發送</span>
          </button>

          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setShowReasonEditor(true)}
                className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>批次修改事由 ({selectedIds.length})</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteSelected}
                className="px-2.5 py-1 text-[11px] bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-lg flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>刪除所選</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Direct Server Failure Explanation Alert */}
      {monthRecords.some((r) => r.status === 'failed') && (
        <div className="p-4 bg-amber-950/40 border border-amber-700/60 rounded-xl mb-5 text-xs text-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-inner">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300 text-xs">
                為什麼伺服器直連發送失敗？（奇美醫院內網與 CORS 限制）
              </div>
              <div className="text-[11px] text-amber-200/80 mt-1 leading-relaxed">
                奇美醫院系統 (<code className="text-amber-300">chimei.org.tw</code>) 設有內網 IP 防火牆與 Session Cookie 認證。雲端伺服器在醫院外網，因此直連請求會被擋下。
                <strong>請改用【網頁自動填表書籤】，直接在您電腦瀏覽器登入的醫院內網頁面中一鍵注入填表，100% 成功！</strong>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenScriptModal}
            className="shrink-0 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center space-x-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>開啟 100% 填表書籤說明</span>
          </button>
        </div>
      )}

      {/* Batch Reason Editor Popover */}
      {showReasonEditor && (
        <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl mb-4 flex items-center gap-2 text-xs">
          <input
            type="text"
            value={batchReasonText}
            onChange={(e) => setBatchReasonText(e.target.value)}
            placeholder="請輸入欲套用到所選明細的新加班事由..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={handleBatchUpdateReason}
            className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded-lg"
          >
            套用
          </button>
          <button
            type="button"
            onClick={() => setShowReasonEditor(false)}
            className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
          >
            取消
          </button>
        </div>
      )}

      {/* Table */}
      {monthRecords.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center">
          <Clock className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
          <span>目前本月份尚無加班明細，請點擊上方「規則快速產生」或「AI 排班解析」自動建立</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                <th className="py-3 px-3 w-10 text-center">
                  <button type="button" onClick={handleSelectAll} className="text-slate-400 hover:text-white">
                    {selectedIds.length === monthRecords.length ? (
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold">1. 日期</th>
                <th className="py-3 px-3 font-semibold">2. 起時 <span className="text-[10px] text-slate-500 font-normal">(0000格式)</span></th>
                <th className="py-3 px-3 font-semibold">3. 迄時 <span className="text-[10px] text-slate-500 font-normal">(0000格式)</span></th>
                <th className="py-3 px-3 font-semibold">4. 事由描述</th>
                <th className="py-3 px-3 font-semibold text-center">填報狀態</th>
                <th className="py-3 px-3 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {monthRecords.map((r) => {
                const isSelected = selectedIds.includes(r.id);
                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-800/40 transition ${isSelected ? 'bg-cyan-950/20' : ''}`}
                  >
                    <td className="py-3 px-3 text-center">
                      <button type="button" onClick={() => handleToggleSelect(r.id)}>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 font-mono font-semibold text-cyan-300">
                      <input
                        type="date"
                        value={r.date}
                        onChange={(e) =>
                          setRecords(records.map((item) => (item.id === r.id ? { ...item, date: e.target.value } : item)))
                        }
                        className="bg-transparent border-0 focus:ring-1 focus:ring-cyan-500 rounded px-1 py-0.5"
                      />
                    </td>

                    {/* Start Time (0000) */}
                    <td className="py-3 px-3 font-mono text-slate-300">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="1730"
                        value={r.startTime}
                        onChange={(e) =>
                          setRecords(
                            records.map((item) =>
                              item.id === r.id
                                ? { ...item, startTime: e.target.value.replace(/[^0-9]/g, '') }
                                : item
                            )
                          )
                        }
                        className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-cyan-500"
                      />
                    </td>

                    {/* End Time (0000) */}
                    <td className="py-3 px-3 font-mono text-slate-300">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="1930"
                        value={r.endTime}
                        onChange={(e) =>
                          setRecords(
                            records.map((item) =>
                              item.id === r.id
                                ? { ...item, endTime: e.target.value.replace(/[^0-9]/g, '') }
                                : item
                            )
                          )
                        }
                        className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-cyan-500"
                      />
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={r.reason}
                        onChange={(e) =>
                          setRecords(
                            records.map((item) => (item.id === r.id ? { ...item, reason: e.target.value } : item))
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      {r.status === 'pending' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-400">
                          <span>待發送</span>
                        </span>
                      )}
                      {r.status === 'sending' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                          <span>傳送中...</span>
                        </span>
                      )}
                      {r.status === 'success' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          <span>已成功</span>
                        </span>
                      )}
                      {r.status === 'failed' && (
                        <span
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] bg-rose-950 text-rose-300 border border-rose-800"
                          title={r.responseMessage}
                        >
                          <XCircle className="w-3 h-3 text-rose-400" />
                          <span>直連受限</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setRecords(records.filter((item) => item.id !== r.id))}
                        className="text-slate-500 hover:text-rose-400 transition p-1"
                        title="刪除此筆"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
