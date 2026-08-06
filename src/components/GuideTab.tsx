import React from 'react';
import { HelpCircle, CheckCircle2, ShieldAlert, Sparkles, Terminal, Code, Cpu, Lightbulb, ExternalLink } from 'lucide-react';

export const GuideTab: React.FC = () => {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 shadow-xl text-neutral-900 space-y-6">
      <div className="flex items-center space-x-3 pb-4 border-b border-neutral-200">
        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-neutral-900">奇美醫院加班批次申報助手 — 技術建議與操作指南</h3>
          <p className="text-xs text-neutral-500">針對每日登錄耗時問題與 API 批次發送的可行性完整分析</p>
        </div>
      </div>

      {/* Answer Section 1 */}
      <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-3">
        <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-700" />
          問題 1: 每天登錄覺得太費時，有什麼最佳建議？
        </h4>
        <div className="text-xs text-neutral-700 leading-relaxed space-y-2">
          <p>
            <strong>建議解決方案：採用「月度一次性批次生成」+「瀏覽器一鍵自動填表 (Bookmarklet)」機制。</strong>
          </p>
          <p>
            醫院系統每日手動登錄包含許多重複步驟（選擇日期、輸入開始/結束時間、填寫加班原因、按送出）。透過本助手，您可以：
          </p>
          <ul className="list-disc list-inside space-y-1 text-neutral-500 pl-2">
            <li>在每月月底或月初，使用「規則快速產生」直接打勾整個月的平日（如 17:30~19:30 2小時）。</li>
            <li>生成後點擊「產生網頁自動填表書籤」，只需在奇美加班網頁點一下書籤，瀏覽器就會自動在 10 秒內幫您把整個月份的資料全部自動填寫完畢！</li>
          </ul>
        </div>
      </div>

      {/* Answer Section 2 */}
      <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-3">
        <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          問題 2: 可以抓取它的 API 直接把批次資料打進去嗎？ (每次約一個月)
        </h4>
        <div className="text-xs text-neutral-700 leading-relaxed space-y-2">
          <p>
            <strong>答案：可以，請採用瀏覽器腳本 (Bookmarklet) 方式：</strong>
          </p>
          <div className="text-neutral-500 pt-1">
            醫院系統通常設有內網 IP 限制、Session Cookie 驗證或安全 Token (CC={'{'}Token{'}'})。直接在您的瀏覽器登入狀態下執行本助手產生的 Bookmarklet/JavaScript 腳本，能夠繞過 CORS 與 IP 限制，直接批次發送 POST 請求或模擬自動填表至奇美伺服器，一次補齊整個月資料。
          </div>
        </div>
      </div>

      {/* Security & FAQ */}
      <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-2 text-xs">
        <h4 className="font-bold text-amber-700 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-700" />
          資安與使用注意事項:
        </h4>
        <ul className="list-disc list-inside space-y-1 text-neutral-500 pl-2">
          <li>本工具所有資料（員編、Token、加班紀錄）均儲存於您的本機瀏覽器 LocalStorage 中，不會將個人資料傳送至外部伺服器。</li>
          <li>奇美加班系統的安全 Token（CC 參數）通常具備時效性，若出現連線過期提示，請由原本特製 URL 重新開啟並複製最新 CC 密碼。</li>
        </ul>
      </div>
    </div>
  );
};
