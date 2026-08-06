import React, { useState } from 'react';
import { OvertimeRecord, PortalConfig } from '../types';
import { Code, Copy, Check, ExternalLink, Play, Sparkles, Terminal, Download, FileCode, ShieldAlert } from 'lucide-react';

interface BookmarkletScriptModalProps {
  records: OvertimeRecord[];
  config: PortalConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const BookmarkletScriptModal: React.FC<BookmarkletScriptModalProps> = ({
  records,
  config,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [scriptType, setScriptType] = useState<'bookmarklet' | 'tampermonkey' | 'console'>('bookmarklet');

  if (!isOpen) return null;

  const validRecords = records.filter((r) => r.status !== 'success');

  // Generate JavaScript Code payload to inject into chimei page
  const generateJsCode = () => {
    const recordsJson = JSON.stringify(
      validRecords.map((r) => ({
        date: r.date,
        startTime: (r.startTime || '').replace(/[^0-9]/g, '').padStart(4, '0'),
        endTime: (r.endTime || '').replace(/[^0-9]/g, '').padStart(4, '0'),
        reason: r.reason,
      }))
    );

    return `(function() {
  const records = ${recordsJson};
  if (!records || records.length === 0) {
    console.log('%c【奇美加班助手】目前沒有待發送的加班記錄！', 'color:#f43f5e;font-size:14px;font-weight:bold;');
    alert('【奇美加班助手】目前沒有待發送的加班記錄！');
    return;
  }

  console.log('%c【奇美加班助手】簡化模式填寫啟動，共 ' + records.length + ' 筆明細', 'color:#38bdf8;font-size:14px;font-weight:bold;');

  // 1. 取得或初始化待處理佇列 (支援頁面重新整理後繼續處理)
  let queue = [];
  let isAutoRunning = false;
  try {
    const saved = sessionStorage.getItem('chimei_overtime_queue');
    if (saved) queue = JSON.parse(saved);
  } catch(e) {}

  if (!queue || queue.length === 0) {
    queue = records;
    try { sessionStorage.setItem('chimei_overtime_queue', JSON.stringify(queue)); } catch(e) {}
  }

  // 2. 跨 Window 及 iframe 收集 DOM
  function getDocs() {
    const docs = [document];
    function collect(win) {
      try {
        if (!win || !win.frames) return;
        for (let i = 0; i < win.frames.length; i++) {
          try {
            const d = win.frames[i].document;
            if (d && !docs.includes(d)) {
              docs.push(d);
              collect(win.frames[i]);
            }
          } catch(e) {}
        }
      } catch(e) {}
    }
    collect(window);
    return docs;
  }

  // 3. 欄位精準掃描 (只找 4 大欄位: 日期, 起時, 迄時, 事由)
  function scanFields() {
    const docs = getDocs();
    let allInputs = [];
    let allTextareas = [];
    let allButtons = [];

    docs.forEach(doc => {
      try {
        allInputs.push(...Array.from(doc.querySelectorAll('input, select')));
        allTextareas.push(...Array.from(doc.querySelectorAll('textarea')));
        allButtons.push(...Array.from(doc.querySelectorAll('button, input[type="button"], input[type="submit"], input[value*="儲存"], input[value*="新增"], input[value*="送出"], a.btn')));
      } catch(e) {}
    });

    const visibleInputs = allInputs.filter(el => el.type !== 'hidden' && el.type !== 'submit' && el.type !== 'button');

    // (1) 日期欄位 (優先尋找包含日期格式選項的下拉選單，或特定 ID)
    let dateEl = visibleInputs.find(el => {
      if (el.tagName && el.tagName.toLowerCase() === 'select') {
        const optText = el.options[1]?.text || el.options[0]?.text || '';
        // 如果下拉選單的選項看起來像 MM-DD 或 YYYY-MM-DD
        if (/[0-9]{1,2}[-/][0-9]{1,2}/.test(optText)) return true;
      }
      const nameOrId = el.id || el.name || '';
      return /^d_over_date$|^date$|^bdate$|^idate$|^txtdate$|over_date$/i.test(nameOrId) || el.type === 'date';
    });

    // (2) 起始時間 (0000四碼如 0700, 1730)
    let startEl = visibleInputs.find(el => 
      el !== dateEl && /stime|btime|start|begin|time1|sbtime|txtbtime|txt_stime|time_s|s_time|over_time_start|time_start/i.test(el.id || el.name || el.placeholder || '')
    );

    // (3) 結束時間 (0000四碼如 0900, 1930)
    let endEl = visibleInputs.find(el => 
      el !== dateEl && el !== startEl && /etime|end|time2|setime|txtetime|txt_etime|time_e|e_time|over_time_end|time_end/i.test(el.id || el.name || el.placeholder || '')
    );

    // (4) 加班事由描述
    let reasonEl = allTextareas[0] || visibleInputs.find(el => 
      el !== dateEl && el !== startEl && el !== endEl && /reason|memo|remark|ps|事由|說明|txtreason|over_reason/i.test(el.id || el.name || el.placeholder || '')
    );

    // Fallbacks if not found by name/regex
    const remainingInputs = visibleInputs.filter(el => el !== dateEl && el !== startEl && el !== endEl && el !== reasonEl);
    if (!dateEl) dateEl = remainingInputs.shift();
    if (!startEl) startEl = remainingInputs.shift();
    if (!endEl) endEl = remainingInputs.shift();
    if (!reasonEl) reasonEl = remainingInputs.shift() || allTextareas[0];

    // 儲存/新增按鈕
    let btnEl = allButtons.find(el => 
      /儲存|新增|送出|Save|Submit|Insert|btnSave|btnInsert/i.test(el.value || el.innerText || el.id || el.name || '')
    ) || allButtons[0];

    return { dateEl, startEl, endEl, reasonEl, btnEl };
  }

  // 設定欄位數值並觸發必要事件
  function setVal(el, val, isDate = false, isTime = false) {
    if (!el) return false;
    
    if (el.tagName && el.tagName.toLowerCase() === 'select') {
      let found = false;
      const opts = Array.from(el.options);
      
      // 1. 完全比對
      for (let i = 0; i < opts.length; i++) {
        if (opts[i].value === val || opts[i].text === val) {
          el.selectedIndex = i;
          found = true;
          break;
        }
      }
      
      // 1.5. 如果是時間，嘗試比對 HH:MM 格式或包含該字串
      if (!found && isTime && val && val.length === 4) {
        const timeWithColon = val.substring(0, 2) + ':' + val.substring(2);
        for (let i = 0; i < opts.length; i++) {
          const optVal = opts[i].value;
          const optText = opts[i].text;
          if (
            optVal === timeWithColon || optText === timeWithColon ||
            optVal.includes(timeWithColon) || optText.includes(timeWithColon) ||
            optVal === val || optText === val ||
            optVal.includes(val) || optText.includes(val)
          ) {
            el.selectedIndex = i;
            found = true;
            break;
          }
        }
      }
      
      // 2. 如果是日期，嘗試比對 MM-DD 格式 (例如把 2026-08-01 轉為 08-01 或 8-1 等)
      if (!found && isDate && val) {
        const parts = val.split('-');
        if (parts.length === 3) {
          const mmdd = parts[1] + '-' + parts[2]; // 08-01
          const md = parseInt(parts[1]) + '-' + parseInt(parts[2]); // 8-1
          const mmddSlash = parts[1] + '/' + parts[2]; // 08/01
          const mdSlash = parseInt(parts[1]) + '/' + parseInt(parts[2]); // 8/1
          
          for (let i = 0; i < opts.length; i++) {
            const optVal = opts[i].value;
            const optText = opts[i].text;
            if (
              optVal.includes(mmdd) || optText.includes(mmdd) || 
              optVal.includes(md) || optText.includes(md) ||
              optVal.includes(mmddSlash) || optText.includes(mmddSlash) ||
              optVal.includes(mdSlash) || optText.includes(mdSlash)
            ) {
              el.selectedIndex = i;
              found = true;
              break;
            }
          }
        }
      }
      
      if (!found) {
        el.value = val; // fallback
      }
    } else {
      let finalVal = val;
      if (isTime && val && val.length === 4) {
        if (el.type === 'time') {
          finalVal = val.substring(0, 2) + ':' + val.substring(2);
        }
      }
      
      el.value = finalVal;
      
      // 繞過 React / Vue / Angular 的事件阻攔
      try {
        if (el._valueTracker) el._valueTracker.setValue(finalVal);
        const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSet && el.tagName.toLowerCase() === 'input') {
          nativeSet.call(el, finalVal);
        }
      } catch(e) {}
    }

    el.dispatchEvent(new Event('focus', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }

  const fields = scanFields();
  console.log('%c【奇美加班助手 - 簡化模式欄位定位】', 'color:#a855f7;font-size:12px;font-weight:bold;', {
    '1_日期欄位': fields.dateEl,
    '2_起時欄位': fields.startEl,
    '3_迄時欄位': fields.endEl,
    '4_事由欄位': fields.reasonEl,
    '儲存按鈕': fields.btnEl
  });

  // 4. 建立頂部懸浮控制面板
  let overlay = document.getElementById('chimei-overtime-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'chimei-overtime-overlay';
    overlay.style.cssText = 'position:fixed;top:15px;right:15px;z-index:999999;background:#0f172a;color:#f8fafc;padding:16px;border-radius:12px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);font-family:sans-serif;width:360px;border:2px solid #38bdf8;';
    document.body.appendChild(overlay);
  }

  function renderUI() {
    const currentItem = queue[0];
    if (!currentItem) {
      overlay.innerHTML = '<div style="font-weight:bold;color:#10b981;font-size:14px;margin-bottom:6px;">🎉 所有加班紀錄已全部填寫完成！</div>' +
        '<div style="font-size:12px;color:#cbd5e1;">若有需要新增其他月份，請重新複製腳本即可。</div>' +
        '<button id="chimei-btn-close" style="margin-top:8px;width:100%;background:#334155;color:#fff;border:none;padding:6px;border-radius:6px;cursor:pointer;">關閉面板</button>';
      try { sessionStorage.removeItem('chimei_overtime_queue'); } catch(e) {}
      setTimeout(() => {
        document.getElementById('chimei-btn-close')?.addEventListener('click', () => overlay.remove());
      }, 100);
      return;
    }

    const cleanStart = (currentItem.startTime || '').toString().replace(/[^0-9]/g, '').padStart(4, '0');
    const cleanEnd = (currentItem.endTime || '').toString().replace(/[^0-9]/g, '').padStart(4, '0');

    overlay.innerHTML = '<div style="font-weight:bold;font-size:14px;color:#38bdf8;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">' +
      '<span>⚡ 奇美加班簡化填寫助手</span>' +
      '<span style="font-size:11px;background:#0284c7;color:#fff;padding:2px 6px;border-radius:4px;">剩餘 ' + queue.length + ' 筆</span>' +
      '</div>' +
      '<div style="font-size:12px;color:#cbd5e1;background:#1e293b;padding:8px 10px;border-radius:6px;margin-bottom:10px;line-height:1.5;">' +
      '📅 <b>日期：</b>' + currentItem.date + '<br/>' +
      '⏰ <b>時間：</b>' + cleanStart + ' ~ ' + cleanEnd + ' (4碼)<br/>' +
      '📝 <b>事由：</b>' + currentItem.reason +
      '</div>' +
      '<div style="display:flex;gap:6px;margin-bottom:6px;">' +
      '<button id="chimei-btn-fill" style="flex:1;background:#0284c7;color:#fff;border:none;padding:8px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:12px;">僅填寫</button>' +
      '<button id="chimei-btn-submit" style="flex:1;background:#10b981;color:#fff;border:none;padding:8px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:12px;">單筆送出</button>' +
      '<button id="chimei-btn-auto" style="flex:2;background:#8b5cf6;color:#fff;border:none;padding:8px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:12px;">🚀 一鍵全自動 (Auto All)</button>' +
      '</div>' +
      '<div style="display:flex;gap:6px;">' +
      '<button id="chimei-btn-next" style="flex:1;background:#f59e0b;color:#fff;border:none;padding:6px;border-radius:6px;font-size:11px;cursor:pointer;">跳過此筆 (下一筆)</button>' +
      '<button id="chimei-btn-clear" style="flex:1;background:#ef4444;color:#fff;border:none;padding:6px;border-radius:6px;font-size:11px;cursor:pointer;">清除佇列並關閉</button>' +
      '</div>' +
      '<div style="font-size:11px;color:#94a3b8;margin-top:8px;text-align:center;">💡 若點擊儲存沒反應，請手動點擊網頁儲存按鈕，再按「跳過此筆」。</div>';

    function doFill() {
      const dOk = setVal(fields.dateEl, currentItem.date, true);
      const sOk = setVal(fields.startEl, cleanStart, false, true);
      const eOk = setVal(fields.endEl, cleanEnd, false, true);
      const rOk = setVal(fields.reasonEl, currentItem.reason);

      console.log('%c【奇美加班助手 - 欄位對應元件】', 'color:#38bdf8;font-weight:bold;', {
        '1_日期元素': fields.dateEl || '未找到',
        '2_起時元素': fields.startEl || '未找到',
        '3_迄時元素': fields.endEl || '未找到',
        '4_事由元素': fields.reasonEl || '未找到'
      });

      console.log('%c【奇美加班助手 - 簡化填寫結果】', 'color:#10b981;font-weight:bold;', {
        '1_日期': dOk ? currentItem.date : '❌ 找不到欄位',
        '2_起時(0000)': sOk ? cleanStart : '❌ 找不到欄位',
        '3_迄時(0000)': eOk ? cleanEnd : '❌ 找不到欄位',
        '4_事由': rOk ? currentItem.reason : '❌ 找不到欄位'
      });
    }

    function doSubmit() {
      doFill();
      
      if (fields.btnEl) {
        console.log('【奇美加班助手】點擊儲存按鈕...', fields.btnEl);
        
        try {
          fields.btnEl.click();
          
          const win = fields.btnEl.ownerDocument.defaultView || window;
          ['mousedown', 'mouseup', 'click'].forEach(evt => {
            fields.btnEl.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: win }));
          });
        } catch(e) {}

        const onclickAttr = fields.btnEl.getAttribute('onclick');
        if (onclickAttr) {
          try { 
            const win = fields.btnEl.ownerDocument.defaultView || window;
            win.eval(onclickAttr); 
          } catch(e) {}
        }
        
        if (fields.btnEl.form) {
          setTimeout(() => { try { fields.btnEl.form.submit(); } catch(e) {} }, 300);
        }
      } else {
        console.warn('【奇美加班助手】未自動定位到儲存按鈕，請手動點擊網頁上的儲存按鈕');
      }

      queue.shift(); // 移除已處理完畢的項目
      try { sessionStorage.setItem('chimei_overtime_queue', JSON.stringify(queue)); } catch(e) {}
      
      // 更新 UI，若網頁沒重新整理，也能繼續處理下一筆
      setTimeout(() => {
        renderUI();
        if (isAutoRunning && queue.length > 0) {
          setTimeout(() => {
            const autoBtn = document.getElementById('chimei-btn-auto');
            if (autoBtn) {
              autoBtn.innerText = '⏳ 執行中...';
              autoBtn.style.opacity = '0.7';
              autoBtn.style.pointerEvents = 'none';
            }
            doSubmit();
          }, 2000); // Wait 2 seconds for next submission
        }
      }, 500);
    }

    setTimeout(() => {
      document.getElementById('chimei-btn-fill')?.addEventListener('click', doFill);
      document.getElementById('chimei-btn-submit')?.addEventListener('click', doSubmit);
      document.getElementById('chimei-btn-auto')?.addEventListener('click', () => {
        isAutoRunning = true;
        const autoBtn = document.getElementById('chimei-btn-auto');
        if (autoBtn) {
          autoBtn.innerText = '⏳ 執行中...';
          autoBtn.style.opacity = '0.7';
          autoBtn.style.pointerEvents = 'none';
        }
        doSubmit();
      });
      document.getElementById('chimei-btn-next')?.addEventListener('click', () => {
        queue.shift();
        try { sessionStorage.setItem('chimei_overtime_queue', JSON.stringify(queue)); } catch(e) {}
        renderUI();
      });
      document.getElementById('chimei-btn-clear')?.addEventListener('click', () => {
        try { sessionStorage.removeItem('chimei_overtime_queue'); } catch(e) {}
        overlay.remove();
        console.log('已清除加班填寫佇列');
      });

      // 預設自動執行填寫，使用者可直接看到填寫結果
      doFill();
    }, 100);
  }

  // 初始繪製 UI
  renderUI();
})();`;
  };

  const rawCode = generateJsCode();
  const bookmarkletHref = `javascript:${encodeURIComponent(rawCode)}`;

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-50 border border-neutral-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl text-neutral-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                瀏覽器一鍵填表腳本 (100% 成功率方案)
              </h3>
              <p className="text-xs text-neutral-500">
                繞過 CORS 內網限制，直接於奇美加班申報頁面自動依序填寫 {validRecords.length} 筆資料
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900 px-2 py-1 text-xs rounded-lg border border-neutral-300"
          >
            關閉 ✕
          </button>
        </div>

        {/* Script Mode Selector */}
        <div className="flex space-x-2 border-b border-neutral-200 pb-3 mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setScriptType('bookmarklet')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              scriptType === 'bookmarklet'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-neutral-100 text-neutral-700 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>方法 1: 書籤列按鈕 (Bookmarklet)</span>
          </button>

          <button
            type="button"
            onClick={() => setScriptType('console')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              scriptType === 'console'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-neutral-100 text-neutral-700 hover:text-neutral-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>方法 2: F12 控制台貼上 (Console)</span>
          </button>
        </div>

        {/* Instructions */}
        {scriptType === 'bookmarklet' && (
          <div className="space-y-4">
            <div className="p-4 bg-white border border-neutral-200 rounded-xl">
              <h4 className="text-xs font-bold text-blue-600 mb-2 flex items-center gap-1.5">
                <Play className="w-4 h-4 fill-blue-600" /> 操作三步驟 (最推薦!):
              </h4>
              <ol className="list-decimal list-inside text-xs text-neutral-700 space-y-2 leading-relaxed">
                <li>
                  將下方這個「<strong className="text-blue-600">奇美加班一鍵填表</strong>」按鈕，直接<strong>拖曳到您的瀏覽器書籤列</strong>（或複製下方 URL 新增為書籤）：
                </li>
                <li className="pt-1 pb-1">
                  <div className="flex items-center space-x-3">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: `<a href="${bookmarkletHref}" onclick="event.preventDefault()" class="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-lg cursor-grab active:cursor-grabbing border border-blue-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>
                          <span>拖曳我至書籤列：奇美加班一鍵填寫</span>
                        </a>`
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(bookmarkletHref)}
                      className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-lg text-xs flex items-center space-x-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? '已複製連結' : '複製連結網址'}</span>
                    </button>
                  </div>
                </li>
                <li>
                  開啟並登入奇美加班網頁：
                  <a
                    href={`${config.targetUrl}?ihosp=${config.ihosp}&iuser=${config.iuser}&CC=${encodeURIComponent(config.ccToken)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline font-mono ml-1"
                  >
                    chimei.org.tw/overwork/index5.htm
                  </a>
                </li>
                <li>
                  在奇美網頁畫面上，<strong>點擊剛剛建立的書籤按鈕</strong>，系統就會自動將本月份的所有加班明細快速填寫進去！
                </li>
              </ol>
            </div>
          </div>
        )}

        {scriptType === 'console' && (
          <div className="space-y-3">
            <div className="text-xs text-neutral-700">
              開啟奇美加班申報頁面，按 <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded border border-neutral-300 text-blue-600">F12</kbd> 切換至 Console (控制台)，貼上並按 Enter 即可：
            </div>

            <div className="relative">
              <pre className="p-4 bg-white border border-neutral-200 rounded-xl text-[11px] font-mono text-blue-600 overflow-x-auto max-h-60 leading-relaxed">
                {rawCode}
              </pre>
              <button
                type="button"
                onClick={() => handleCopy(rawCode)}
                className="absolute top-3 right-3 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-lg text-xs border border-neutral-300 flex items-center space-x-1 shadow"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已複製全部程式碼' : '複製 Code'}</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold rounded-xl border border-neutral-300"
          >
            完成並關閉
          </button>
        </div>
      </div>
    </div>
  );
};
