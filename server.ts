import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  const PORT = 3000;

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Probe target portal
  app.post('/api/chimei/probe', async (req, res) => {
    try {
      const { targetUrl } = req.body;
      const urlToFetch = targetUrl || 'https://www.chimei.org.tw/overwork/index5.htm?ihosp=10&iuser=A30825&CC=MdgQMdgQ10V=QQ';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(urlToFetch, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const html = await response.text();
      const headers = Object.fromEntries(response.headers.entries());

      // Parse forms, inputs, hidden fields
      const inputMatches = [...html.matchAll(/<input[^>]*name=["']([^"']+)["'][^>]*>/gi)];
      const formMatches = [...html.matchAll(/<form[^>]*action=["']([^"']+)["'][^>]*>/gi)];

      const detectedFields = inputMatches.map(m => m[1]);
      const detectedActions = formMatches.map(m => m[1]);

      res.json({
        success: true,
        statusCode: response.status,
        url: urlToFetch,
        detectedFields: Array.from(new Set(detectedFields)),
        detectedActions: Array.from(new Set(detectedActions)),
        headers,
        htmlLength: html.length,
        htmlSnippet: html.substring(0, 1500),
      });
    } catch (err: any) {
      res.json({
        success: false,
        error: err.message || '無法連線至目標系統',
        note: '目標伺服器可能限於奇美醫院內部網路 (Intranet) 或需要特定 Session Cookie。本工具已為您準備「瀏覽器一鍵填表書籤腳本 (Bookmarklet / Userscript)」模式，可在您的瀏覽器中 100% 成功自動輸入！',
      });
    }
  });

  // Submit record proxy
  app.post('/api/chimei/submit-record', async (req, res) => {
    const { config, record } = req.body;
    try {
      const postUrl = config?.postUrl || 'https://www.chimei.org.tw/overwork/save.htm';
      
      const formData = new URLSearchParams();
      formData.append(config.fieldMapping?.hospField || 'ihosp', config.ihosp || '10');
      formData.append(config.fieldMapping?.userField || 'iuser', config.iuser || 'A30825');
      formData.append(config.fieldMapping?.tokenField || 'CC', config.ccToken || '');
      formData.append(config.fieldMapping?.dateField || 'd_over_date', record.date);
      formData.append(config.fieldMapping?.startTimeField || 'over_time_start', record.startTime);
      formData.append(config.fieldMapping?.endTimeField || 'over_time_end', record.endTime);
      formData.append(config.fieldMapping?.hoursField || 'over_hours', record.hours ? record.hours.toString() : '2');
      formData.append(config.fieldMapping?.typeField || 'over_type', record.type);
      formData.append(config.fieldMapping?.reasonField || 'over_reason', record.reason);

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': config.targetUrl || 'https://www.chimei.org.tw/overwork/index5.htm',
      };

      if (config.cookieString) {
        headers['Cookie'] = config.cookieString;
      }

      const response = await fetch(postUrl, {
        method: 'POST',
        headers,
        body: formData.toString(),
      });

      const respText = await response.text();

      res.json({
        success: response.ok,
        statusCode: response.status,
        message: response.ok ? '發送成功' : `伺服器回應狀態碼 ${response.status}`,
        responsePreview: respText.substring(0, 500),
      });
    } catch (err: any) {
      res.json({
        success: false,
        message: `直連傳送受限 (${err.message})`,
        isCorsOrIntranet: true,
        recommendation: '建議切換至頂部的「瀏覽器一鍵填表 (Bookmarklet / Tampermonkey)」腳本模式發送！',
      });
    }
  });

  // Gemini AI Schedule Parser
  app.post('/api/chimei/parse-ai', async (req, res) => {
    try {
      const { text, targetMonth } = req.body;
      if (!text) {
        return res.status(400).json({ error: '請提供文字內容' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: '系統未設定 GEMINI_API_KEY，請於環境變數中設定。' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
你是一個奇美醫院員工加班與值班排班解析助手。請解析以下使用者輸入的文字或排班描述，並轉化為奇美醫院加班申報記錄 JSON 陣列。

指定月份參考: ${targetMonth || '當月'}
使用者輸入內容:
"${text}"

請回應純 JSON 格式陣列，不要包含 Markdown 說明或代碼區塊 (\`\`\`json)，每一筆物件格式如下:
[
  {
    "date": "YYYY-MM-DD",
    "startTime": "HHmm (四碼數字如 0700, 1730，勿加冒號)",
    "endTime": "HHmm (四碼數字如 0900, 1930，勿加冒號)",
    "hours": 2,
    "type": "延時加班" | "值班留守" | "緊急召回" | "專案/會診/病歷",
    "reason": "加班原因簡述 (例如: 臨床處置與病歷撰寫, 手術延時, 假日值班, 病理會診)"
  }
]
規則參考:
- 奇美申報系統時間格式為四碼數字，不含冒號 (如 0700, 1730)。
- 延時加班平日預設 1730 - 1930 (2小時) 或 1730 - 1830 (1小時)。
- 值班留守預設 0800 - 1700 (9小時) 或 1730 - 0800 (14.5小時)。
- 請根據輸入的時間或描述精確計算小時數。若輸入僅寫日期而未寫具體時間，可預設為 1730-1930 2小時延時加班。
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      let records = [];
      try {
        records = JSON.parse(cleanJson);
      } catch (e) {
        console.error('Failed to parse AI response JSON:', responseText);
        return res.status(500).json({ error: 'AI 解析回應格式異常', raw: responseText });
      }

      res.json({ success: true, records });
    } catch (err: any) {
      console.error('AI Parse error:', err);
      res.status(500).json({ error: err.message || 'AI 解析失敗' });
    }
  });

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chi Mei Overtime Helper Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
