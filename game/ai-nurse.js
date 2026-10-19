// ai-nurse.js - AI 護理師與臨床模擬對話引擎
// 支援 Google Gemini (免費推薦)、Groq (極速免費)、OpenRouter、OpenAI 與自訂端點

export const AI_DEFAULTS = {
  gemini: {
    name: 'Google Gemini (免費推薦)',
    model: 'gemini-2.0-flash',
    models: [
      { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash (推薦首選 · 平衡敏捷)' },
      { id: 'gemini-2.0-flash-lite', name: 'gemini-2.0-flash-lite (最省額度 · 極速)' },
      { id: 'gemini-1.5-flash', name: 'gemini-1.5-flash (穩定經典版)' },
      { id: 'gemini-1.5-pro', name: 'gemini-1.5-pro (深度臨床邏輯 · 推理最強)' }
    ],
    placeholder: '輸入 Google AI Studio Key (AIza...)',
    hint: '💡 完全免費！至 aistudio.google.com 產生 Key，已解除醫療詞彙安全審查誤擋。'
  },
  groq: {
    name: 'Groq (極速免費 · 免信用卡)',
    model: 'llama-3.3-70b-versatile',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'llama-3.3-70b-versatile (極速 70B · 推薦)' },
      { id: 'llama-3.1-8b-instant', name: 'llama-3.1-8b-instant (超輕量極速)' }
    ],
    placeholder: '輸入 Groq API Key (gsk_...)',
    hint: '💡 完全免費、不擋醫學名詞！至 console.groq.com 註冊即可免費取得 Key。'
  },
  openrouter: {
    name: 'OpenRouter (免費開放模型)',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'meta-llama/llama-3.3-70b-instruct:free' },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'google/gemini-2.0-flash-exp:free' }
    ],
    placeholder: '輸入 OpenRouter Key (sk-or-...)',
    hint: '💡 支援 free 系列免費模型，至 openrouter.ai 取得 Key。'
  },
  openai: {
    name: 'OpenAI (官方 API)',
    model: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', name: 'gpt-4o-mini (輕量經濟)' },
      { id: 'gpt-4o', name: 'gpt-4o (全能旗艦)' }
    ],
    placeholder: '輸入 OpenAI API Key (sk-...)',
    hint: '💡 使用官方 OpenAI 帳號額度。'
  },
  custom: {
    name: '自訂 OpenAI 相容服務 / 本地',
    model: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', name: 'gpt-4o-mini' },
      { id: 'custom', name: '自訂模型' }
    ],
    placeholder: '輸入 API Key 或 Token',
    hint: '💡 可自訂 API 端點 URL（如本機 Ollama、vLLM 或第三方代理）。'
  },
  demo: {
    name: '離線 Demo (純單機規則)',
    model: 'local-rules',
    models: [
      { id: 'local-rules', name: '本機 Pocket Medicine 內建規則庫' }
    ],
    placeholder: '免輸入 Key，以本機臨床知識庫應對',
    hint: '💡 完全離線，使用本地劇本與規則庫（非真實 AI 生成）。'
  }
};

const GEMINI_SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
];

/**
 * 嚴謹的端到端連線測試：在進入遊戲前真正向模型送出測試 prompt 並解析真實回覆
 */
export async function verifyAiConnection({ provider = 'gemini', apiKey = '', model = '', customUrl = '' }) {
  if (provider === 'demo') {
    return { ok: true, message: '離線 Demo 模式就緒（注意：此模式為預設罐頭回覆，非真實 AI）' };
  }
  const key = apiKey.trim();
  if (!key) {
    return { ok: false, error: '請輸入有效的 API Key 或 Token！' };
  }

  const startMs = performance.now();
  const testPrompt = '你現在是急診室值班護理師，請用一句話（不超過15字）回覆我：「醫師，值班病房已就緒，隨時待命！」';

  // 1. 優先嘗試本地 serve.mjs 代理（避開瀏覽器 CORS）
  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        apiKey: key,
        model: model || AI_DEFAULTS[provider]?.model,
        customUrl,
        prompt: testPrompt
      })
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.ok && data.reply) {
        const latency = Math.round(performance.now() - startMs);
        return {
          ok: true,
          message: `連線成功 (${latency}ms)！護理師即時回覆：『${data.reply.trim()}』`,
          rawReply: data.reply
        };
      }
      if (data.error) return { ok: false, error: data.error };
    }
  } catch {
    // 若無本機代理伺服器，嘗試前端直連
  }

  // 2. 前端直連驗證
  try {
    if (provider === 'gemini') {
      const targetModel = model || AI_DEFAULTS.gemini.model;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: testPrompt }] }],
          safetySettings: GEMINI_SAFETY_SETTINGS,
          generationConfig: { temperature: 0.2, maxOutputTokens: 60 }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error?.message || `HTTP ${res.status} 錯誤`);
      }
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!reply) throw new Error('模型回傳內容為空，可能受到安全審查阻擋');
      const latency = Math.round(performance.now() - startMs);
      return { ok: true, message: `Gemini 連線成功 (${latency}ms)！護理師回覆：『${reply.trim()}』` };
    }

    if (provider === 'groq' || provider === 'openrouter' || provider === 'openai' || provider === 'custom') {
      let endpoint = 'https://api.openai.com/v1/chat/completions';
      if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      else if (provider === 'openrouter') endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      else if (provider === 'custom' && customUrl) endpoint = customUrl;

      const targetModel = model || AI_DEFAULTS[provider]?.model;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 60,
          temperature: 0.2
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error?.message || `HTTP ${res.status} 錯誤`);
      }
      const reply = data.choices?.[0]?.message?.content;
      if (!reply) throw new Error('模型未回傳文字內容');
      const latency = Math.round(performance.now() - startMs);
      return { ok: true, message: `${AI_DEFAULTS[provider].name.split(' ')[0]} 連線成功 (${latency}ms)！護理師回覆：『${reply.trim()}』` };
    }
  } catch (err) {
    return { ok: false, error: err.message || '連線失敗，請檢查網路連線或 API Key 是否正確' };
  }

  return { ok: false, error: '未支援的 AI 服務商' };
}

/**
 * 床邊醫囑對話：讓 AI 護理師真正進行臨床思考後回覆
 */
export async function askAiNurse({
  provider = 'gemini',
  apiKey = '',
  model = '',
  customUrl = '',
  caseInfo = {},
  vitals = {},
  history = [],
  message = '',
  doctorName = '值班醫師',
  doctorLevel = 'PGY'
}) {
  const normMsg = message.trim();
  const nurseName = caseInfo.nurse || '護理師';
  const patientDesc = `${caseInfo.bed || ''} ${caseInfo.name || '病人'}（${caseInfo.who || ''}）`;
  const bpStr = vitals.bp ? `${vitals.bp[0]}/${vitals.bp[1]} mmHg` : '量不到';
  const vitalsDesc = `心跳: ${vitals.hr ?? '--'} bpm, 血壓: ${bpStr}, 血氧: ${vitals.spo2 ?? '--'}%, 指標(${caseInfo.extra || 'sugar'}): ${vitals.extra ?? '未測量'}, 意識: ${vitals.mind || '未評估'}`;

  // 1. 如果選 Demo 或沒有提供 Key，明確標記為離線備援
  if (provider === 'demo' || !apiKey.trim()) {
    const fallback = localClinicalRuleFallback(normMsg, caseInfo, vitals);
    return {
      isAi: false,
      reply: fallback.reply,
      action: fallback.action,
      vitalsUpdate: fallback.vitalsUpdate,
      nextStep: fallback.nextStep
    };
  }

  // 2. 構建以 Pocket Medicine 9th Edition 為藍本的高保真臨床思考 Prompt
  const systemPrompt = `你是一位台灣醫院內科病房夜班的資深專業護理師「${nurseName}」。
當前床邊臨床情境：
- 床位與病患：${patientDesc}
- 病患主訴與背景：${caseInfo.intro || ''}
- 當前監視器數據：${vitalsDesc}
- 床邊值班醫師：${doctorName}（職級：${doctorLevel}）

【Pocket Medicine 9th 臨床指引搶救核心】：
1. 低血糖 (phypo): 測指尖血糖 -> 意識不清立即 IV push D50W (高濃度葡萄糖) -> 甦醒後進食、停用降血糖藥。
2. 急性腦中風 (pstroke): FAST評估、確認最後正常時間 (LKW) -> 測血糖 -> 急照無顯影腦部電腦斷層 (Non-contrast Head CT) -> 評估血栓溶解劑 (rtPA) -> 轉 ICU。切勿盲目積極降血壓。
3. 急性心肌梗塞 (pacs): 10分鐘內做 12 導程 EKG + 給氧 -> 嚼服 Aspirin (160-325mg) + 舌下含 NTG (血壓許可) -> 急驗 Troponin -> 啟動心導管室 (Code STEMI) 進行冠脈介入治療 -> 轉 CCU。
4. 致命性高血鉀 (phyperk): 心電圖見寬 QRS/高尖 T 波 -> 立即 IV Calcium gluconate (10mL) 穩定細胞膜 -> IV RI 10U + D50W 2支 (促鉀入細胞) -> 吸入 Albuterol -> 聯繫腎臟科安排急診血液透析 (HD)。
5. 消化道大出血 (pgib): 2條大口徑 IV (16-18G) 快速輸液復甦 -> 送檢備紅血球 (PRBC) -> 靜脈高劑量 PPI -> 若為肝硬化靜脈曲張給 Octreotide 與預防性 Ceftriaxone -> 安排急診胃鏡 (EGD) 止血。
6. 敗血性休克 (psepsis): Sepsis 1-hour bundle: 給抗生素前抽兩套血培養 (Blood CS x 2) -> 1小時內給廣效抗生素 (Pip-Tazo/Cefepime) -> 30 mL/kg 快速輸液 -> MAP < 65 立即上 Norepinephrine 升壓劑 -> 抽 Lactate 追蹤。

【臨床決策與自由醫囑結案規則】：
1. 語氣口吻：以「${nurseName}：「開頭。使用台灣醫院醫護用語（如：on IV、push D50、做 EKG、抽 ABG、叫心導管室、轉加護病房等）。本文約 40～90 字。
2. 【動態臨床結案】：
   - 當值班醫師的自由醫囑切中上述 Pocket Medicine 急症搶救核心，或醫師交代處置完畢交班且重要搶救已落實時：
     * 護理師回覆已確實執行醫囑，並具體描述病患生理數據改善、意識回穩、脫離立即生命危險。
     * 必須在最末尾標籤行輸出：[STATUS: cured] [OUTCOME: stable]（若轉加護病房可標 [OUTCOME: icu]）。
     * 必須附帶臨床評析：[FEEDBACK: 簡短一句總結醫師本次處置優秀之處，引用 Pocket Medicine 9th 臨床要點（約 20-40 字）]。
     * 同步更新好轉的數值：[HR: 數值] [BP: 收縮壓/舒張壓] [SPO2: 數值] [EXTRA: 數值或描述] [MIND: 意識描述]。
   - 若處置危險或延誤（如中風盲目積極降血壓、活動性吐血給口服藥）：提出專業警惕或描述病人情況惡化，標記 [STATUS: warn] 或 [STATUS: bad]。
   - 若醫師是問診、查體或安排檢查（量血壓、測血糖、做心電圖、照胸片、抽血）：回覆客觀的臨床發現。
   - 若醫師表示「處置完畢交班」但有嚴重致命遺漏（例如高血鉀未給鈣劑、心肌梗塞未做 EKG 與給 Aspirin、大出血未給輸液）：
     護理師應急迫提出臨床提醒，不可直接標記 cured。
3. 標籤格式：請在回覆最末尾另起一行輸出：
   [STATUS: cured|stable|warn|bad|arrest] [OUTCOME: stable|icu] [HR: 數字] [BP: 收縮壓/舒張壓] [SPO2: 數字] [EXTRA: 數值或描述] [MIND: 意識描述] [FEEDBACK: 臨床講評]`;

  // 構建對話歷史
  const messages = [{ role: 'system', content: systemPrompt }];
  for (const h of history.slice(-6)) {
    messages.push({
      role: h.role === 'nurse' ? 'assistant' : 'user',
      content: h.text || h.content || ''
    });
  }
  messages.push({ role: 'user', content: `${doctorName}醫囑：「${normMsg}」` });

  let rawAiText = '';
  let apiError = null;

  // 優先嘗試本地 serve.mjs 代理
  try {
    const proxyRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        apiKey: apiKey.trim(),
        model: model || AI_DEFAULTS[provider]?.model,
        customUrl,
        messages,
        systemPrompt,
        userPrompt: `${doctorName}醫囑：「${normMsg}」`,
        caseInfo,
        vitals
      })
    });
    const data = await proxyRes.json().catch(() => ({}));
    if (proxyRes.ok && data.reply) {
      rawAiText = data.reply;
    } else if (data.error) {
      apiError = data.error;
    }
  } catch {
    // 代理不可用，走前端直連
  }

  // 前端直接呼叫 API
  if (!rawAiText && !apiError) {
    try {
      if (provider === 'gemini') {
        const targetModel = model || AI_DEFAULTS.gemini.model;
        const geminiContents = [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${doctorName}醫囑：「${normMsg}」` }] }
        ];
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiContents,
            safetySettings: GEMINI_SAFETY_SETTINGS,
            generationConfig: { temperature: 0.5, maxOutputTokens: 300 }
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          rawAiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          apiError = data.error?.message || `Gemini API 錯誤 (${res.status})`;
        }
      } else if (provider === 'groq' || provider === 'openrouter' || provider === 'openai' || provider === 'custom') {
        let endpoint = 'https://api.openai.com/v1/chat/completions';
        if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
        else if (provider === 'openrouter') endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        else if (provider === 'custom' && customUrl) endpoint = customUrl;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`
          },
          body: JSON.stringify({
            model: model || AI_DEFAULTS[provider]?.model,
            messages,
            max_tokens: 300,
            temperature: 0.6
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          rawAiText = data.choices?.[0]?.message?.content || '';
        } else {
          apiError = data.error?.message || `${provider} API 錯誤 (${res.status})`;
        }
      }
    } catch (err) {
      apiError = err.message || '網路連線異常';
    }
  }

  // 3. 解析 AI 回覆與狀態標籤
  if (rawAiText) {
    const parsed = parseAiOutput(rawAiText, nurseName, caseInfo);
    return {
      isAi: true,
      providerName: AI_DEFAULTS[provider]?.name?.split(' ')[0] || provider,
      reply: parsed.reply,
      action: parsed.action,
      vitalsUpdate: parsed.vitalsUpdate,
      nextStep: parsed.nextStep
    };
  }

  // 4. 若 API 出錯，明確向玩家報警，而不是假裝 AI 回覆
  console.warn('AI 呼叫失敗:', apiError);
  const fallback = localClinicalRuleFallback(normMsg, caseInfo, vitals);
  return {
    isAi: false,
    apiError: apiError || 'AI 連線未回傳資料',
    reply: `${nurseName}：「（⚠️【AI 連線失敗: ${apiError || '伺服器未回傳'}】切換備援處置）${fallback.reply.replace(/^.*?：「/, '')}`,
    action: fallback.action,
    vitalsUpdate: fallback.vitalsUpdate,
    nextStep: fallback.nextStep
  };
}

/**
 * 解析 AI 的文字與其輸出的結構化狀態標籤
 */
function parseAiOutput(rawText, nurseName, caseInfo) {
  let text = rawText.trim();
  const vitalsUpdate = {};
  let action = null;
  let nextStep = null;
  let cured = false;
  let outcome = 'stable';
  let feedback = '';

  // 提取 [FEEDBACK: ...]
  const feedbackMatch = text.match(/\[FEEDBACK:\s*([^\]]+)\]/i);
  if (feedbackMatch) {
    feedback = feedbackMatch[1].trim();
  }

  // 提取 [OUTCOME: ...]
  const outcomeMatch = text.match(/\[OUTCOME:\s*(\w+)\]/i);
  if (outcomeMatch) {
    outcome = outcomeMatch[1].toLowerCase();
  }

  // 提取 [STATUS: ...] [HR: ...] [BP: ...] [SPO2: ...] [EXTRA: ...] [MIND: ...]
  const statusMatch = text.match(/\[STATUS:\s*(\w+)\]/i);
  if (statusMatch) {
    const st = statusMatch[1].toLowerCase();
    if (st === 'cured' || st === 'stable' || st === 'improved' || st === 'safe') {
      action = 'cured';
      cured = true;
      nextStep = 'done';
    } else if (st === 'arrest') {
      action = 'cpr';
    } else if (st === 'warn' || st === 'bad') {
      action = 'worsen';
    }
  }

  const extraMatch = text.match(/\[EXTRA:\s*([^\]]+)\]/i);
  if (extraMatch) {
    const val = extraMatch[1].trim();
    const num = Number(val);
    vitalsUpdate.extra = !isNaN(num) ? num : val;
  }

  const hrMatch = text.match(/\[HR:\s*(\d+)\]/i);
  if (hrMatch) vitalsUpdate.hr = Number(hrMatch[1]);

  const bpMatch = text.match(/\[BP:\s*(\d+\/\d+)\]/i);
  if (bpMatch) vitalsUpdate.bp = bpMatch[1].split('/').map(Number);

  const spo2Match = text.match(/\[SPO2:\s*(\d+)\]/i);
  if (spo2Match) vitalsUpdate.spo2 = Number(spo2Match[1]);

  const mindMatch = text.match(/\[MIND:\s*([^\]]+)\]/i);
  if (mindMatch) vitalsUpdate.mind = mindMatch[1].trim();

  // 清除末尾標籤，保留口語文本
  text = text.replace(/\[(STATUS|OUTCOME|HR|BP|SPO2|EXTRA|MIND|FEEDBACK):[^\]]*\]/gi, '').trim();
  text = text.replace(/^.*?護理師\s*[:：]\s*/, '').replace(/^[「『]/, '').replace(/[」』]$/, '').trim();

  // 檢查是否有特殊臨床行為（補足 AI 未標籤時的情境）
  const lowText = rawText.toLowerCase();
  if (!action) {
    if (/(抽血|cbc|生化|檢驗報告)/i.test(lowText)) action = 'draw_lab';
    else if (/(壓胸|cpr|除顫|電擊)/i.test(lowText)) action = 'cpr';
    else if (/(脫離危險|穩住了|好轉|恢復清醒|回升|安全範圍|血管打通|止血成功|洗腎順利)/i.test(lowText)) {
      action = 'cured';
      cured = true;
      nextStep = 'done';
    }
  }

  return {
    reply: `${nurseName}：「${text}」`,
    action,
    vitalsUpdate,
    nextStep,
    cured,
    outcome,
    feedback
  };
}

/**
 * 離線臨床保底規則庫（支援 Pocket Medicine 9th 藍本之六大急症）
 */
function localClinicalRuleFallback(t, c, v) {
  const nurse = c.nurse || '護理師';
  const cid = (c.id || '').replace(/^p/, '');

  if (/(量|量測|測|看|確認).{0,6}(生命徵象|vital|血壓|心跳|血氧|bp|hr|spo2)/i.test(t)) {
    const bpStr = v.bp ? `${v.bp[0]}/${v.bp[1]} mmHg` : '量不到';
    return {
      reply: `${nurse}：「量好了！目前 HR ${v.hr || '--'} 次/分、BP ${bpStr}、SpO₂ ${v.spo2 || '--'}%，意識${v.mind || '未明'}。」`,
      action: 'vital'
    };
  }

  if (/(抽血|cbc|dc|生化|電解質|bun|cr|k|na|sugar|血糖|lab|blood\s*gas|abg)/i.test(t)) {
    if (/(量|測|dxt|驗|驗一下|立即測).{0,6}(血糖|sugar|dxt)/i.test(t) && cid === 'hypo') {
      return {
        reply: `${nurse}：「立刻測指尖血糖！嗶——指尖 DXT 只有 32 mg/dL！病人嚴重低血糖，需要立即補充糖分！」`,
        action: 'sugar_check',
        vitalsUpdate: { extra: 32 }
      };
    }
    return {
      reply: `${nurse}：「好的，已經抽好血並加急送往檢驗科，報告大約 30 分鐘後出來，出來會即時通知醫師！」`,
      action: 'draw_lab'
    };
  }

  if (/(心電圖|ekg|ecg|12\s*lead)/i.test(t)) {
    let ekgFinding = '12 導程心電圖已完成！圖形已輸出貼在床尾病歷夾。';
    let extraVal = undefined;
    if (cid === 'acs') {
      ekgFinding = '12 導程心電圖已完成：V1–V4 導程 ST 段明顯抬高 (STEMI)！怡君：「前壁 ST 抬得好高，是急性心肌梗塞！」';
      extraVal = 'V1–V4 ST 抬高 (STEMI)';
    } else if (cid === 'hyperk') {
      ekgFinding = '12 導程心電圖：T 波非常尖高 (Peaked T wave)、QRS 波變寬！小雯：「高血鉀心電圖很危險，隨時會心室顫動！」';
      extraVal = '高尖T波、QRS增寬';
    }
    return { reply: `${nurse}：「${ekgFinding}」`, action: 'ekg', vitalsUpdate: extraVal ? { extra: extraVal } : {} };
  }

  if (/(胸片|cxr|胸部\s*x\s*光|x\s*光)/i.test(t)) {
    return { reply: `${nurse}：「已經聯絡放射科推床邊 CXR 機台過來照，照好會立刻上傳 PACS 系統！」`, action: 'cxr' };
  }
  if (/(給氧|氧氣|oxygen|o2|nasal\s*cannula|mask|面罩|鼻導管)/i.test(t)) {
    return { reply: `${nurse}：「已經接上氧氣鼻導管 3 L/min，病人血氧監測維持中。」`, action: 'oxygen', vitalsUpdate: { spo2: Math.max(96, (v.spo2 || 94)) } };
  }
  if (/(cpr|壓胸|胸外按壓|心臟按壓|心跳停|arrest)/i.test(t)) {
    return { reply: `${nurse}：「病人摸不到脈搏！立刻開始壓胸 CPR，我去推急救車和 AED！」`, action: 'cpr' };
  }

  // 1. 低血糖
  if (cid === 'hypo') {
    if (/(d50|d50w|葡萄糖|高濃度葡萄糖|給糖|推糖|推d50|50%\s*glucose|glucagon|升糖素)/i.test(t)) {
      return {
        reply: `${nurse}：「收到！立刻靜脈推注 D50W 2 支（40 mL）！……推完了，病人眼睛眨了眨，意識慢慢恢復清醒，剛剛複測血糖上升到 118 mg/dL！」`,
        action: 'cured',
        cured: true,
        outcome: 'stable',
        vitalsUpdate: { extra: 118, mind: '清醒，能回答名字' },
        feedback: '低血糖昏迷立即靜脈給予 D50W，病患迅速清醒，落實 Pocket Medicine 臨床準則！',
        nextStep: 'done'
      };
    }
    if (/(鎮靜|haloperidol|ativan|dormicum|valium|安眠|睡覺|打針讓他睡|拘束|綁起來)/i.test(t)) {
      return {
        reply: `${nurse}：「醫師……低血糖躁動給鎮靜劑非常危險！病人呼吸開始變慢，血氧掉到 85% 了！」`,
        action: 'worsen',
        vitalsUpdate: { spo2: 85, mind: '昏迷叫不醒' }
      };
    }
  }

  // 2. 中風
  if (cid === 'stroke') {
    if (/(ct|電腦斷層|brain\s*ct|腦部\s*ct|急診ct|排除出血|rt-?pa|血栓溶解)/i.test(t)) {
      return {
        reply: `${nurse}：「馬上聯絡 CT 室安排 non-contrast brain CT！同時已經通知神經科值班總值待命評估 rt-PA，陳阿嬤病情已迅速進入急診綠色通道！」`,
        action: 'cured',
        cured: true,
        outcome: 'stable',
        vitalsUpdate: { mind: '右上肢無力，意識清楚' },
        feedback: '急性中風黃金期內排除禁忌並急照 CT 評估血栓溶解劑，掌握 Pocket Medicine 搶救時間！',
        nextStep: 'done'
      };
    }
    if (/(降壓|降血壓|labetalol|nicardipine|hydralazine|降壓藥|把血壓打下來)/i.test(t)) {
      return { reply: `${nurse}：「醫師，目前血壓雖然 178/96，但缺血性中風盲目強力降壓會降低腦部灌流！建議先做 CT 排除出血再決定！」`, action: 'warn' };
    }
  }

  // 3. 急性心肌梗塞
  if (cid === 'acs') {
    if (/(aspirin|阿斯匹靈|stemi|心導管|pci|ntg|硝化甘油|導管室|code\s*stemi)/i.test(t)) {
      return {
        reply: `${nurse}：「立刻嚼服 Aspirin 300mg 並含服 NTG！心導管室值班小組已全面啟動待命中，李伯伯胸痛減輕，準備直接推入手術室！」`,
        action: 'cured',
        cured: true,
        outcome: 'stable',
        vitalsUpdate: { hr: 84, bp: [120, 74], ekg: 'ST段回降，心肌再灌流中', mind: '清醒，胸痛大幅緩解' },
        feedback: 'STEMI 即刻給予 Aspirin 啟動 Code STEMI 緊急再灌流，徹底符合 Pocket Medicine Cardiology 指引！',
        nextStep: 'done'
      };
    }
  }

  // 4. 致命性高血鉀
  if (cid === 'hyperk') {
    if (/(calcium|鈣|葡萄糖酸鈣|氯化鈣|ri|insulin|胰島素|d50|洗腎|透析|hemodialysis|hd)/i.test(t)) {
      return {
        reply: `${nurse}：「收到！立即靜脈慢推 Calcium gluconate 1 支，並給予 Regular Insulin 10U + D50W 2 支！心電圖 QRS 寬度立刻明顯收窄，透析室護理師已備妥機台！」`,
        action: 'cured',
        cured: true,
        outcome: 'stable',
        vitalsUpdate: { hr: 78, bp: [130, 80], rhythm: '竇性心律，T波回降', mind: '清醒，四肢麻木減輕' },
        feedback: '高血鉀緊急給予鈣劑穩定細胞膜，併用胰島素葡萄糖促鉀內流並安排透析，精準落實 Pocket Medicine 降鉀三部曲！',
        nextStep: 'done'
      };
    }
  }

  // 5. 消化道大出血
  if (cid === 'gib') {
    if (/(iv|靜脈|輸液|生理食鹽水|備血|輸血|prbc|octreotide|ppi|胃鏡|egd)/i.test(t)) {
      return {
        reply: `${nurse}：「打上兩條 18G 大口徑 IV 全速輸液，加壓送上兩袋紅血球 PRBC！靜脈注射 Octreotide 與高劑量 PPI 後嘔血已止，急診胃鏡醫師已就位！」`,
        action: 'cured',
        cured: true,
        outcome: 'stable',
        vitalsUpdate: { hr: 88, bp: [110, 68], mind: '清醒，休克症狀緩解' },
        feedback: '消化道大出血落實大口徑輸液復甦、限制性輸血、PPI/Octreotide 降門脈壓並急診胃鏡，符合 Pocket Medicine 止血準則！',
        nextStep: 'done'
      };
    }
  }

  // 6. 敗血性休克
  if (cid === 'sepsis') {
    if (/(培養|blood\s*cs|血培養|抗生素|pip-tazo|cefepime|輸液|30\s*ml|升壓|norepinephrine|levophed|lactate)/i.test(t)) {
      return {
        reply: `${nurse}：「已迅速抽妥兩套血液培養！30 mL/kg 生理食鹽水快速灌注，廣效抗生素已注射，Norepinephrine 升壓劑上線後 MAP 回升至 70 mmHg，林奶奶意識恢復！」`,
        action: 'cured',
        cured: true,
        outcome: 'stable',
        vitalsUpdate: { hr: 94, bp: [108, 66], mind: '清醒，對答配合' },
        feedback: '落實 Sepsis 1-Hour Bundle：給藥前抽血培養、1小時內給抗生素、積極輸液並以 Norepinephrine 支持灌流，教科書級處置！',
        nextStep: 'done'
      };
    }
  }

  // 萬用結案交班命令（若醫師覺得處理得差不多了，下達交班或回值班室指令）
  if (/(處置完成|交班|穩住了|回值班室|轉加護|送icu|收入加護|交代觀察)/i.test(t)) {
    return {
      reply: `${nurse}：「好的醫師！病患目前生命徵象已維持穩定，後續各項監測我會每小時密切追蹤，您先回值班室休息，辛苦了！」`,
      action: 'cured',
      cured: true,
      outcome: 'stable',
      vitalsUpdate: { hr: 80, bp: [120, 76], spo2: 97, mind: '穩定安睡中' },
      feedback: '妥善完成急症處置與臨床交班安排，回值班室儲備體力！',
      nextStep: 'done'
    };
  }

  return {
    reply: `${nurse}：「收到醫師的指示：『${t}』，已立刻為病人執行並持續監測生命徵象。」`,
    action: null
  };
}
