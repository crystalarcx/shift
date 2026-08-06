import React from 'react';
import { FieldMapping, PortalConfig } from '../types';
import { Sliders, Check, RotateCcw } from 'lucide-react';

interface FieldMapperModalProps {
  config: PortalConfig;
  setConfig: React.Dispatch<React.SetStateAction<PortalConfig>>;
  isOpen: boolean;
  onClose: () => void;
}

export const FieldMapperModal: React.FC<FieldMapperModalProps> = ({
  config,
  setConfig,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const defaultFieldMapping: FieldMapping = {
    dateField: 'd_over_date',
    startTimeField: 'over_time_start',
    endTimeField: 'over_time_end',
    hoursField: 'over_hours',
    typeField: 'over_type',
    reasonField: 'over_reason',
    userField: 'iuser',
    hospField: 'ihosp',
    tokenField: 'CC',
  };

  const handleFieldChange = (key: keyof FieldMapping, value: string) => {
    setConfig((prev) => ({
      ...prev,
      fieldMapping: {
        ...prev.fieldMapping,
        [key]: value,
      },
    }));
  };

  const handleResetDefault = () => {
    setConfig((prev) => ({
      ...prev,
      fieldMapping: defaultFieldMapping,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-950 border border-amber-800 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">網頁表單欄位名稱對應 (Field Mapping)</h3>
              <p className="text-xs text-slate-400">若奇美網頁改版變更 HTML input name 屬性，可於此彈性修正</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1 text-xs rounded-lg border border-slate-700">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">加班日期欄位 (Date)</label>
            <input
              type="text"
              value={config.fieldMapping.dateField}
              onChange={(e) => handleFieldChange('dateField', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">起始時間 (Start Time)</label>
            <input
              type="text"
              value={config.fieldMapping.startTimeField}
              onChange={(e) => handleFieldChange('startTimeField', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">結束時間 (End Time)</label>
            <input
              type="text"
              value={config.fieldMapping.endTimeField}
              onChange={(e) => handleFieldChange('endTimeField', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">加班事由 (Reason)</label>
            <input
              type="text"
              value={config.fieldMapping.reasonField}
              onChange={(e) => handleFieldChange('reasonField', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefault}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置為預設欄位</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>儲存對應設定</span>
          </button>
        </div>
      </div>
    </div>
  );
};
