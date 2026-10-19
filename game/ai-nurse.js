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
      nextStep: fallback.nextStep,
      cured: fallback.cured || fallback.action === 'cured',
      outcome: fallback.outcome || 'stable',
      feedback: fallback.feedback || '',
      milestones: fallback.milestones || []
    };
  }

  // 2. 構建以 Pocket Medicine 9th Edition 為藍本的高保真臨床思考 Prompt (完全沙盒式、杜絕劇透)
  const systemPrompt = `你是一位台灣醫院內科病房夜班的資深專業護理師「${nurseName}」。
當前床邊臨床情境：
- 床位與病患：${patientDesc}
- 病患主訴與背景：${caseInfo.intro || ''}
- 當前監視器數據：${vitalsDesc}
- 床邊值班醫師：${doctorName}（職級：${doctorLevel}）

【Pocket Medicine 9th 臨床指引搶救核心】：
1. 糖尿病高血糖酮酸中毒/高滲透壓危象 (phypo): 大量生理食鹽水 (0.9% NS 1000 mL/h) 快速輸液復甦 -> 查核血鉀 (確認 K+ >= 3.3) -> Regular Insulin 靜脈滴注 (0.1 U/kg/h) -> 血糖降至 250 mg/dL 轉含糖晶體液 (D5 0.45% NS + KCl) 續滴胰島素直至消除陰離子隙 (Closure of AG)。切忌未補水未查鉀即推胰島素，切忌過早驟停胰島素。
2. 急性大血管閉塞中風併癲癇重積 (pstroke): 維持呼吸道與抽痰給氧 -> 立即靜脈注射 Lorazepam (Ativan) 4mg 終止抽搐 -> 靜脈給予 Levetiracetam (Keppra 2000mg loading) 預防復發 -> 測血糖排除低血糖 -> 急送腦部 NCCT + CTA 評估大血管閉塞 (LVO) -> 啟動動脈機械取栓 (EVT) -> 轉 NICU。嚴禁過度降血壓。
3. 急性心肌梗塞 (pacs): 10分鐘內做 12 導程 EKG + 給氧 -> 嚼服 Aspirin (160-325mg) + 舌下含 NTG (血壓許可) -> 急驗 Troponin -> 啟動心導管室 (Code STEMI) 進行冠脈介入治療 -> 轉 CCU。
4. 心衰竭肺水腫 (padhf): 端坐呼吸 + 咳粉紅泡沫痰 -> 坐起並立即非侵襲性陽壓呼吸 (BiPAP/CPAP) -> 靜脈利尿劑 (IV Furosemide) + 血管擴張劑 (IV NTG，血壓許可下) 降後負荷 -> 轉 CCU。嚴禁平躺或給予 Beta-blocker。
5. 致命性高血鉀 (phyperk): 心電圖見寬 QRS/高尖 T 波 -> 立即 IV Calcium gluconate (10mL) 穩定細胞膜 -> IV RI 10U + D50W 2支 (促鉀入細胞) -> 吸入 Albuterol -> 聯繫腎臟科安排急診血液透析 (HD)。
6. 消化道大出血 (pgib): 2條大口徑 IV (16-18G) 快速輸液復甦 -> 送檢備紅血球 (PRBC) -> 限制性輸血維持 Hb 7-8 -> 靜脈高劑量 PPI -> 若為肝硬化靜脈曲張給 Octreotide 與預防性 Ceftriaxone -> 安排急診胃鏡 (EGD) 止血。
7. 急性肺栓塞 (ppe): 突發急喘與胸痛低氧 -> 高流量氧氣面罩 -> 立即靜脈抗凝血劑 (IV Heparin 負荷劑量) -> 大塊休克評估血栓溶解 (tPA 100mg) -> 轉加護病房 (ICU)。切忌大量快速輸液加重右心衰竭。
8. 敗血性休克 (psepsis): Sepsis 1-hour bundle: 給抗生素前抽兩套血培養 (Blood CS x 2) -> 1小時內給廣效抗生素 (Pip-Tazo/Cefepime) -> 30 mL/kg 快速輸液 -> MAP < 65 立即上 Norepinephrine 升壓劑 -> 抽 Lactate 追蹤。
9. 嗜中性低下發燒 (pneutro): 化療後發燒 (ANC < 500) -> 抽兩套血液培養 (Port-A + 周邊) -> 1小時內給予抗綠膿桿菌廣效抗生素 (Cefepime 2g IV) -> 等張輸液。嚴禁肛溫、肛門指診與塞劑！
10. 過敏性休克 (panaph): 抗生素等引發喉水腫喘鳴、全身紅疹、休克 -> 立即停藥 -> 第一首選救命唯一是肌肉注射 IM Epinephrine (0.3-0.5mg 於大腿前外側) -> 大量輸液 1-2L -> 二線抗組織胺與類固醇輔助預防雙相反應 -> 轉 ICU 觀察。切不可只給抗組織胺延誤 Epinephrine！

【資深護理師行為準則（完全沙盒式、杜絕劇透）】：
1. 語氣口吻：以「${nurseName}：「開頭。使用台灣醫院醫護專業用語（如：on IV、push D50、做 EKG、抽 ABG、叫心導管室、轉加護病房等）。字數約 40～90 字。
2. 【絕對禁止劇透指示】：
   - 護理師在任何情況下（無論醫師回答對錯、遺漏或危險），**絕對不可直接說出正確處置答案或指導醫師該開什麼藥物**（例如嚴禁說：「你應該要給...」、「建議給予...」、「正確處置為...」、「請開立...」）。
   - 在真實值班情境中，護理師只會客觀回報處置執行結果、如實反映病人當前客觀生理反應與後續病況走向。
3. 【客觀病況走向推測】：
   - 若醫師處置切中上述急救核心：客觀描寫病患症狀緩解、生命徵象好轉回穩、脫離立即生命危險。
     * 輸出標籤：[STATUS: cured] [OUTCOME: stable|icu] [FEEDBACK: 一句總結醫師本次處置優秀之處，引用 Pocket Medicine 9th 臨床要點]
     * 同步更新好轉數值：[HR: 數值] [BP: 收縮壓/舒張壓] [SPO2: 數值] [EXTRA: 數值或描述] [MIND: 意識描述]
   - 若處置錯誤、有致命禁忌或延誤：客觀描述病患當下出現的不良反應或病況惡化走向（例如：「病人突然嚴重嗆咳、四肢發紺，血氧監視器驟降到 76%！」、「血壓急墜至 65/38 mmHg，摸不到周邊脈搏！」、「抽搐更加劇烈，咬緊牙關口吐白沫！」），標記 [STATUS: warn] 或 [STATUS: bad]，讓醫師自行觀察變化並獨立思考應變。
   - 若醫師進行問診、查體或安排檢驗影像：如實回報客觀臨床所見與檢查數據。
   - 若醫師表示「處置完畢交班」但急症尚未解除：客觀回報病人現在各項數值依然極度危急（如心跳 140、血壓 70/40、呼吸窘迫），家屬在旁焦急，不可標記 cured。
   - 若醫師輸入完全無關之閒聊：焦急提醒醫師病人生命垂危，請專注急救，標記 [STATUS: pending]。
4. 【沙盒五大評估維度標籤 (MILESTONE)】：
   請在回覆最末尾檢視醫師在本輪對話中所實踐的臨床評估維度，輸出一個或多個 [MILESTONE: ...] 標籤：
   - [MILESTONE: history]：問診（發作時間、症狀細節、過往病史、慢性病、目前用藥、過敏史等）
   - [MILESTONE: exam]：身體檢查（聽診心肺呼吸音、看瞳孔大小反射、測頸靜脈、神經學偏癱、下肢水腫、腹部壓痛等）
   - [MILESTONE: labs]：檢驗與影像（指尖血糖 DXT、心電圖 EKG、胸部 X 光 CXR、抽血 CBC/生化/Troponin/乳酸/血培養/ABG、電腦斷層 CT/CTA 等）
   - [MILESTONE: diagnosis]：臨床診斷（醫師提出鑑別診斷或明確臨床急症判斷）
   - [MILESTONE: treatment]：治療處置（急救藥物、輸液、氧氣支持、BiPAP、插管、動脈取栓、心導管介入、急診透析、胸外按壓 CPR 等）
5. 標籤格式範例（輸出於最後一行）：
   [STATUS: cured|stable|warn|bad|arrest|pending] [OUTCOME: stable|icu] [HR: 數字] [BP: 收縮壓/舒張壓] [SPO2: 數字] [EXTRA: 描述] [MIND: 描述] [FEEDBACK: 簡評] [MILESTONE: labs] [MILESTONE: treatment]`;

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
  let modelUsed = model || AI_DEFAULTS[provider]?.model;

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
      if (data.modelUsed) modelUsed = data.modelUsed;
    } else if (data.error) {
      apiError = data.error;
    }
  } catch {
    // 代理不可用，走前端直連
  }

  // 若代理未成功且非離線 Demo，嘗試前端直接呼叫 API
  if (!rawAiText && provider !== 'demo' && apiKey.trim()) {
    try {
      if (provider === 'gemini') {
        const targetModel = model || AI_DEFAULTS.gemini.model;
        const geminiContents = [];
        for (const h of history.slice(-6)) {
          geminiContents.push({
            role: h.role === 'nurse' ? 'model' : 'user',
            parts: [{ text: h.text || h.content || '' }]
          });
        }
        geminiContents.push({ role: 'user', parts: [{ text: `${doctorName}醫囑：「${normMsg}」` }] });

        const reqBody = {
          contents: geminiContents,
          system_instruction: { parts: [{ text: systemPrompt }] },
          safetySettings: GEMINI_SAFETY_SETTINGS,
          generationConfig: { temperature: 0.4, maxOutputTokens: 500 }
        };

        let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody)
        });
        let data = await res.json().catch(() => ({}));
        if (!res.ok && targetModel !== 'gemini-1.5-flash') {
          const retry = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqBody)
          });
          if (retry.ok) {
            res = retry;
            data = await retry.json().catch(() => ({}));
          }
        }

        if (res.ok) {
          rawAiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          apiError = null;
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
            max_tokens: 500,
            temperature: 0.5
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          rawAiText = data.choices?.[0]?.message?.content || '';
          apiError = null;
        } else {
          apiError = data.error?.message || `${provider} API 錯誤 (${res.status})`;
        }
      }
    } catch (err) {
      if (!apiError) apiError = err.message || '網路連線異常';
    }
  }

  // 3. 解析 AI 回覆與狀態標籤
  if (rawAiText) {
    const parsed = parseAiOutput(rawAiText, nurseName, caseInfo);
    return {
      isAi: true,
      providerName: AI_DEFAULTS[provider]?.name?.split(' ')[0] || provider,
      modelUsed,
      reply: parsed.reply,
      action: parsed.action,
      vitalsUpdate: parsed.vitalsUpdate,
      nextStep: parsed.nextStep,
      cured: parsed.cured,
      outcome: parsed.outcome,
      feedback: parsed.feedback,
      milestones: parsed.milestones || []
    };
  }

  // 4. 若 API 出錯或無回應，明確向玩家通知，而不是假裝 AI 回覆
  console.warn('AI 呼叫失敗:', apiError);
  const fallback = localClinicalRuleFallback(normMsg, caseInfo, vitals);
  const errHint = apiError ? `⚠️【AI 連線失敗: ${apiError}】切換本地臨床備援：` : '';
  return {
    isAi: false,
    apiError: apiError || 'AI 連線未回傳資料',
    reply: `${nurseName}：「${errHint}${fallback.reply.replace(/^.*?：「/, '')}`,
    action: fallback.action,
    vitalsUpdate: fallback.vitalsUpdate,
    nextStep: fallback.nextStep,
    cured: fallback.cured,
    outcome: fallback.outcome,
    feedback: fallback.feedback,
    milestones: fallback.milestones || []
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
  const milestones = [];

  // 提取 [MILESTONE: ...]
  const milestoneMatches = text.matchAll(/\[MILESTONE:\s*(\w+)\]/gi);
  for (const m of milestoneMatches) {
    const ms = m[1].toLowerCase();
    if (['history', 'exam', 'labs', 'diagnosis', 'treatment'].includes(ms) && !milestones.includes(ms)) {
      milestones.push(ms);
    }
  }

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
  text = text.replace(/\[(STATUS|OUTCOME|HR|BP|SPO2|EXTRA|MIND|FEEDBACK|MILESTONE):[^\]]*\]/gi, '').trim();
  text = text.replace(/^.*?護理師\s*[:：]\s*/, '').replace(/^[「『]/, '').replace(/[」』]$/, '').trim();

  // 檢查是否有特殊臨床行為（補足 AI 未標籤時的情境）
  const lowText = rawText.toLowerCase();
  if (!action && !statusMatch) {
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
    feedback,
    milestones
  };
}

/**
 * 離線臨床保底規則庫（支援 Pocket Medicine 9th 藍本之十大急症）
 */
function localClinicalRuleFallback(t, c, v) {
  const nurse = c.nurse || '護理師';
  const cid = (c.id || '').replace(/^p/, '');

  // 優先檢查 CPR 急救
  if (/(cpr|壓胸|胸外按壓|心臟按壓|心跳停|arrest)/i.test(t)) {
    return {
      reply: `${nurse}：「病人摸不到脈搏！立刻開始壓胸 CPR，我去推急救車和 AED！」`,
      action: 'cpr',
      milestones: ['treatment']
    };
  }

  // 1. 糖尿病酮酸中毒危象 (DKA / HHS)
  if (cid === 'hypo') {
    if (/(生理食鹽水|normal\s*saline|0\.9%|輸液|打點滴|灌水|fluid|hydration|大量點滴|ns|查鉀|血鉀|k\+|regular\s*insulin|ri|胰島素滴注|胰島素|d5|加糖|轉加護|icu)/i.test(t)) {
      return {
        reply: `${nurse}：「收到！立即建立兩條大口徑 IV，給予 0.9% Normal Saline 1000 mL/hr 快速輸液！急件血鉀回報 4.2 mmol/L，已同步啟動 Regular Insulin 連續靜脈滴注（0.1 U/kg/h）！趙先生呼吸深大喘氣減輕，血糖降至 230 mg/dL，已遵囑換上含糖晶體液 D5 0.45% NS 續滴微量胰島素保護腦細胞！」`,
        action: 'cured',
        cured: true,
        outcome: 'stable',
        vitalsUpdate: { hr: 94, bp: [116, 72], spo2: 97, sugar: 230, mind: '意識轉清醒，深大呼吸平息' },
        feedback: 'DKA 處置精準落實：優先大劑量 NS 輸液復甦、查核血鉀安全後連續靜脈胰島素，並於血糖小於 250 切換 D5 NS 消除陰離子隙，完全符合 Pocket Medicine 核心規範！',
        nextStep: 'done',
        milestones: ['treatment', 'labs']
      };
    }
    if (/(單純推胰島素|直接推ri|push\s*ri|大量胰島素|碳酸氫鈉|bicarb|nahco3|利尿劑|lasix)/i.test(t)) {
      return {
        reply: `${nurse}：「醫師！病人突然大汗淋漓、四肢冰冷發紺，血壓急跌到 70/40 mmHg，心跳飆到 142 下，叫他完全沒有反應了！」`,
        action: 'worsen',
        vitalsUpdate: { hr: 142, bp: [70, 40], mind: '重度休克，呼叫無反應' },
        milestones: ['treatment']
      };
    }
  }

  // 2. 急性大血管閉塞中風併癲癇重積 (LVO Stroke & Status Epilepticus)
  if (cid === 'stroke') {
    if (/(ativan|lorazepam|安定|keppra|levetiracetam|抽痰|維持呼吸道|側躺|給氧|ct|cta|血管攝影|取栓|evt|動脈取栓|code\s*stroke|中風小組)/i.test(t)) {
      return {
        reply: `${nurse}：「收到！立即保持側躺維持呼吸道抽痰，並靜脈慢推 Lorazepam (Ativan) 4 mg！抽搐在 90 秒內完全停止！隨後已接上 Levetiracetam (Keppra) 2000 mg IV loading。急診 CTA 證實右側近端 MCA M1 閉塞，已啟動 Code Stroke 綠色通道由放射科團隊進行動脈取栓 (EVT)！」`,
        action: 'cured',
        cured: true,
        outcome: 'stable',
        vitalsUpdate: { hr: 86, bp: [158, 92], spo2: 98, fit: '抽搐終止', mind: '意識漸醒，左上肢無力改善' },
        feedback: '癲癇重積第一時間 Lorazepam 終止發作，及時 Keppra loading 預防復發，並果斷安排 CTA 啟動動脈機械取栓 (EVT)，展現 Pocket Medicine 神經重症水準！',
        nextStep: 'done',
        milestones: ['treatment', 'labs']
      };
    }
    if (/(壓舌板|塞毛巾|撬開嘴巴|塞嘴巴|硬塞|強力降壓|降壓藥|把血壓打到120|大量降壓)/i.test(t)) {
      return {
        reply: `${nurse}：「醫師！病人突然牙關緊咬劇烈嗆咳，口吐血性白沫，臉色發黑發紺，血氧監視器暴跌到 78%！」`,
        action: 'worsen',
        vitalsUpdate: { spo2: 78, mind: '發紺，呼吸道窒息' },
        milestones: ['treatment']
      };
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
        nextStep: 'done',
        milestones: ['treatment']
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
        nextStep: 'done',
        milestones: ['treatment']
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
        nextStep: 'done',
        milestones: ['treatment']
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
        nextStep: 'done',
        milestones: ['treatment', 'labs']
      };
    }
  }

  // 7. 急性心衰竭肺水腫
  if (cid === 'adhf') {
    if (/(bipap|cpap|陽壓|furosemide|lasix|利尿|ntg|硝化甘油|坐起|坐起來)/i.test(t)) {
      return {
        reply: `${nurse}：「已協助黃伯伯維持高坐臥姿並打上 BiPAP 陽壓呼吸！靜脈注射 Lasix 40mg 加上 NTG 擴張後負荷，患者呼吸功明顯減輕，咳泡沫痰減少，雙肺囉音大幅吸收！」`,
        action: 'cured',
        cured: true,
        outcome: 'stable',
        vitalsUpdate: { hr: 84, bp: [136, 80], spo2: 97, breath: '濕囉音大幅吸收，呼吸平順', mind: '平穩，呼吸順暢' },
        feedback: '急性肺水腫即刻 BiPAP 陽壓通氣並給予 Lasix + NTG 降後負荷，符合 Pocket Medicine ADHF 準則！',
        nextStep: 'done',
        milestones: ['treatment']
      };
    }
  }

  // 8. 急性肺栓塞
  if (cid === 'pe') {
    if (/(heparin|抗凝|anticoagulant|tpa|溶栓|cta|高流量|面罩|icu)/i.test(t)) {
      return {
        reply: `${nurse}：「立即扣上高流量面罩氧氣，並靜脈給予抗凝血劑 Heparin 負荷劑量！張先生血氧由 83% 迅速回升至 96%，胸痛稍微穩定，已安全轉入 ICU 嚴密監護！」`,
        action: 'cured',
        cured: true,
        outcome: 'icu',
        vitalsUpdate: { hr: 92, bp: [118, 72], spo2: 96, rr: '20 次/分，呼吸平穩', mind: '安靜，發紺消退' },
        feedback: '大塊肺栓塞無禁忌立即啟動治療劑量 Heparin 抗凝並收治重症加護，阻斷血栓蔓延！',
        nextStep: 'done',
        milestones: ['treatment']
      };
    }
  }

  // 9. 嗜中性低下發燒
  if (cid === 'neutro') {
    if (/(培養|血培養|cefepime|tazocin|抗綠膿|廣效抗生素|輸液|抗生素)/i.test(t)) {
      return {
        reply: `${nurse}：「立即由 Port-A 與周邊血管各抽取一套血液培養，並在 1 小時內靜脈滴注 Cefepime 2g 與晶體輸液！郭小姐寒顫平息，體溫漸降，感染指標獲得控制！」`,
        action: 'cured',
        cured: true,
        outcome: 'stable',
        vitalsUpdate: { hr: 88, bp: [116, 70], spo2: 98, temp: '37.8°C，寒顫平息', mind: '清醒，精神好轉' },
        feedback: '嗜中性低下發燒嚴格落實 Door-to-Antibiotic < 60 min 抽血並給予抗綠膿桿菌藥物，符合 Pocket Medicine 腫瘤急症指引！',
        nextStep: 'done',
        milestones: ['treatment', 'labs']
      };
    }
  }

  // 10. 過敏性休克
  if (cid === 'anaph') {
    if (/(epinephrine|腎上腺素|epi|大腿|肌肉注射|停點滴|輸液|抗組織胺|類固醇)/i.test(t)) {
      return {
        reply: `${nurse}：「立刻拔除點滴致敏抗生素！大腿前外側立即肌肉注射 Epinephrine 0.3mg 並全速灌注生理食鹽水！蔡小姐喉頭尖銳喘鳴聲迅速消退，血壓由 72 升回 118/74 mmHg，脫離窒息危險！」`,
        action: 'cured',
        cured: true,
        outcome: 'stable',
        vitalsUpdate: { hr: 90, bp: [118, 74], spo2: 98, skin: '風疹塊消退，呼吸順暢', mind: '平穩，脫離窒息危險' },
        feedback: '過敏性休克第一首選唯一是肌肉注射 IM Epinephrine，迅速打開水腫氣道並逆轉休克，教科書級救命決策！',
        nextStep: 'done',
        milestones: ['treatment']
      };
    }
  }

  // 問診 (History) 專屬處理
  if (/(問|病史|多久|時間|用藥|過敏|過去|慢性病|家族史|發作|吃什麼|起病|主訴|痛多久)/i.test(t)) {
    return {
      reply: `${nurse}：「已向家屬與病患核實病史：${c.who || '病患'}平常有規律追蹤慢性病，本次發作約在 1 小時內突發劇烈變化，已查核護理紀錄無藥物過敏史。」`,
      action: null,
      milestones: ['history']
    };
  }

  // 身體檢查 (Physical Examination) 專屬處理
  if (/(聽診|看瞳孔|瞳孔|囉音|偏癱|檢查|理學|呼吸音|心音|水腫|壓痛|反跳痛|查體|神經學|四肢)/i.test(t)) {
    let examDetail = '心音偏快無心雜音，兩側肺底呼吸音尚稱對稱，腹部平軟，雙側下肢無凹陷性水腫。';
    if (cid === 'adhf') examDetail = '聽診雙肺滿布細濕囉音 (crackles)，心音聽得見 S3 奔馬律，雙下肢呈凹陷性水腫！';
    else if (cid === 'stroke') examDetail = '神經學查體：意識昏睡，左側肢體對痛刺激無肌力反應，巴彬斯基徵 (Babinski sign) 陽性！';
    else if (cid === 'pe') examDetail = '聽診雙肺呼吸音急促粗糙，右側小腿有明顯凹陷與壓痛！';
    else if (cid === 'anaph') examDetail = '喉頭聽診有尖銳吸氣喘鳴 (stridor)，全身可見瀰漫性潮紅與膨疹！';
    else if (cid === 'acs') examDetail = '胸部無局部壓痛，聽診心音急促，周邊脈搏微弱，四肢發涼大汗淋漓！';
    return {
      reply: `${nurse}：「床邊身體檢查完成：${examDetail}」`,
      action: null,
      milestones: ['exam']
    };
  }

  // 臨床診斷 (Diagnosis) 專屬評估
  if (/(診斷|鑑別|懷疑|是|diagnosis|stemi|dka|hhs|pe|sepsis|中風|stroke|lvo|高血鉀|hyperkalemia|心肌梗塞|肺栓塞|肺水腫|過敏性休克|anaphylaxis|gib|消化道出血)/i.test(t) && /(診斷|鑑別|懷疑|是|評估)/i.test(t)) {
    return {
      reply: `${nurse}：「收到醫師的臨床鑑別診斷思維！已將臨床評估重點記錄在交班表上，請醫師指示後續關鍵急救處置。」`,
      action: null,
      milestones: ['diagnosis']
    };
  }

  // 常規診斷檢查與支持處置 (在未觸發直接治癒時執行)
  if (/(量|量測|測|看|確認).{0,6}(生命徵象|vital|血壓|心跳|血氧|bp|hr|spo2)/i.test(t)) {
    const bpStr = v.bp ? `${v.bp[0]}/${v.bp[1]} mmHg` : '量不到';
    return {
      reply: `${nurse}：「量好了！目前 HR ${v.hr || '--'} 次/分、BP ${bpStr}、SpO₂ ${v.spo2 || '--'}%，意識${v.mind || '未明'}。」`,
      action: 'vital',
      milestones: ['exam']
    };
  }

  if (/(抽血|cbc|dc|生化|電解質|bun|cr|k|na|sugar|血糖|lab|blood\s*gas|abg)/i.test(t)) {
    if (/(量|測|dxt|驗|驗一下|立即測).{0,6}(血糖|sugar|dxt)/i.test(t) && cid === 'hypo') {
      return {
        reply: `${nurse}：「立刻測指尖血糖！嗶——指尖 DXT 儀器顯示只有 32 mg/dL！病人全身冷汗，意識呈現嗜睡！」`,
        action: 'sugar_check',
        vitalsUpdate: { extra: 32 },
        milestones: ['labs']
      };
    }
    return {
      reply: `${nurse}：「好的，已經抽好血並加急送往檢驗科，報告大約 30 分鐘後出來，出來會即時通知醫師！」`,
      action: 'draw_lab',
      milestones: ['labs']
    };
  }

  if (/(心電圖|ekg|ecg|12\s*lead)/i.test(t)) {
    let ekgFinding = '12 導程心電圖已完成！圖形已輸出貼在床尾病歷夾。';
    let extraVal = undefined;
    if (cid === 'acs') {
      ekgFinding = '12 導程心電圖已完成：V1–V4 導程 ST 段明顯抬高 (STEMI)！前壁 ST 抬得非常高！';
      extraVal = 'V1–V4 ST 抬高 (STEMI)';
    } else if (cid === 'hyperk') {
      ekgFinding = '12 導程心電圖：T 波非常尖高 (Peaked T wave)、QRS 波變寬！心電圖圖形顯著異常！';
      extraVal = '高尖T波、QRS增寬';
    }
    return {
      reply: `${nurse}：「${ekgFinding}」`,
      action: 'ekg',
      vitalsUpdate: extraVal ? { extra: extraVal } : {},
      milestones: ['labs']
    };
  }

  if (/(胸片|cxr|胸部\s*x\s*光|x\s*光)/i.test(t)) {
    return {
      reply: `${nurse}：「已經聯絡放射科推床邊 CXR 機台過來照，照好會立刻上傳 PACS 系統！」`,
      action: 'cxr',
      milestones: ['labs']
    };
  }

  if (/(給氧|氧氣|oxygen|o2|nasal\s*cannula|mask|面罩|鼻導管)/i.test(t)) {
    return {
      reply: `${nurse}：「已經接上氧氣鼻導管 3 L/min，病人血氧監測維持中。」`,
      action: 'oxygen',
      vitalsUpdate: { spo2: Math.max(96, (v.spo2 || 94)) },
      milestones: ['treatment']
    };
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
      nextStep: 'done',
      milestones: ['treatment']
    };
  }

  // 檢查是否具有臨床處置意圖（如給藥、檢查、處置、量測、照護）
  const hasClinicalIntent = /(給|打|開|量|測|照|抽|送|聯絡|通知|備|推|做|停|加|換|滴|轉|會診|吸|戴|插|抽血|心電圖|超音波|胸片|胸部x光|斷層|電腦斷層|氧氣|面罩|點滴|輸液|食鹽水|血液|紅血球|血漿|抗生素|降壓|升壓|止痛|鎮靜|插管|壓胸|cpr|vital|bp|hr|spo2|ekg|cxr|ct|abg|lab|iv|im|po)/i.test(t);

  if (!hasClinicalIntent) {
    const bpStr = v.bp ? `${v.bp[0]}/${v.bp[1]} mmHg` : '量不到';
    return {
      reply: `${nurse}：「醫師！${c.name || '病人'}目前情況危急（${v.mind || '意識改變'}、SpO₂ ${v.spo2 || '--'}%、BP ${bpStr}），現在十萬火急，請專注於急救並立即下達具體的臨床醫囑（例如量測數值、做檢查或急救藥物）！」`,
      action: null,
      milestones: []
    };
  }

  return {
    reply: `${nurse}：「收到醫師的指示：『${t}』，已立刻為病人執行並密切觀察臨床反應。」`,
    action: null,
    milestones: ['treatment']
  };
}
