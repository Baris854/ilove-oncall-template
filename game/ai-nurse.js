// ai-nurse.js - AI 護理師與臨床模擬對話引擎
// 支援 Google Gemini (免費推薦)、Groq (極速免費)、OpenRouter、OpenAI 與自訂端點

export const AI_DEFAULTS = {
  gemini: {
    name: 'Google Gemini (免費推薦)',
    model: 'gemini-2.0-flash',
    placeholder: '輸入 Google AI Studio Key (AIza...)',
    hint: '💡 完全免費！至 aistudio.google.com 產生 Key，已解除醫療詞彙安全審查誤擋。'
  },
  groq: {
    name: 'Groq (極速免費 · 免信用卡)',
    model: 'llama-3.3-70b-versatile',
    placeholder: '輸入 Groq API Key (gsk_...)',
    hint: '💡 完全免費、不擋醫學名詞！至 console.groq.com 註冊即可免費取得 Key。'
  },
  openrouter: {
    name: 'OpenRouter (免費開放模型)',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    placeholder: '輸入 OpenRouter Key (sk-or-...)',
    hint: '💡 支援 free 系列免費模型，至 openrouter.ai 取得 Key。'
  },
  openai: {
    name: 'OpenAI (官方 API)',
    model: 'gpt-4o-mini',
    placeholder: '輸入 OpenAI API Key (sk-...)',
    hint: '💡 使用官方 OpenAI 帳號額度。'
  },
  custom: {
    name: '自訂 OpenAI 相容服務 / Ollama',
    model: 'gpt-4o-mini',
    placeholder: '輸入 API Key 或 Token',
    hint: '💡 可自訂 API 端點 URL（如本機 Ollama、vLLM 或第三方代理）。'
  },
  demo: {
    name: '離線 Demo (不用 Key)',
    model: 'local-rules',
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

  // 2. 構建高保真臨床思考 Prompt
  const systemPrompt = `你是一位台灣醫院內科病房的夜班資深護理師「${nurseName}」。
當前床邊臨床情境：
- 床位與病患：${patientDesc}
- 病患主訴與背景：${caseInfo.intro || ''}
- 當前監視器數據：${vitalsDesc}
- 正在床邊下達醫囑的值班醫師：${doctorName}（職級：${doctorLevel}）

你的職責與臨床思考規則：
1. 【語氣與風格】以「${nurseName}：「開頭。口吻口語、沉著俐落、充滿現場急迫感，使用台灣臨床醫護用語（如：on IV、push D50、抽 ABG、排床邊 CXR、做 EKG、叫神經科會診、壓胸 CPR 等）。
2. 【醫學邏輯判斷】
   - 若處置恰當（如低血糖昏迷給予高濃度葡萄糖 D50W、疑似中風急排 non-contrast brain CT、呼吸窘迫給氧、摸不到脈搏立即壓胸）：回覆已迅速執行處置，並描述病人生理反應好轉、意識改善與數據提升。
   - 若處置危險或延誤（如低血糖躁動打鎮靜劑、缺血性中風盲目積極降血壓、活動性吐血給抗凝血劑）：提出專業警惕或描述病人情況惡化。
   - 若醫師是問診、查體或安排檢查（量血壓、測血糖、做心電圖、照胸片、抽血）：回覆客觀的臨床發現。
3. 【狀態連動標籤】請在回覆的最末尾另起一行，輸出狀態連動標籤（供床邊監視器即時同步，不要輸出在對話引號內）：
   格式：[STATUS: normal|warn|bad|arrest|cured] [HR: 數字] [BP: 收縮壓/舒張壓] [SPO2: 數字] [EXTRA: 數值或描述] [MIND: 意識描述]
   （沒有改變的指標可以省略標籤）
4. 【字數精簡】回覆本文（不含最後一行標籤）約 40～90 字，緊湊逼真。`;

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

  // 提取 [STATUS: ...] [HR: ...] [BP: ...] [SPO2: ...] [EXTRA: ...] [MIND: ...]
  const statusMatch = text.match(/\[STATUS:\s*(\w+)\]/i);
  if (statusMatch) {
    const st = statusMatch[1].toLowerCase();
    if (st === 'cured' || st === 'improved') {
      action = caseInfo.id === 'hypo' ? 'cure_hypo' : caseInfo.id === 'stroke' ? 'cure_stroke' : 'cure';
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
  text = text.replace(/\[(STATUS|HR|BP|SPO2|EXTRA|MIND):[^\]]*\]/gi, '').trim();
  text = text.replace(/^.*?護理師\s*[:：]\s*/, '').replace(/^[「『]/, '').replace(/[」』]$/, '').trim();

  // 檢查是否有特殊臨床行為（補足 AI 未標籤時的情境）
  const lowText = rawText.toLowerCase();
  if (!action) {
    if (/(抽血|cbc|生化|檢驗報告)/i.test(lowText)) action = 'draw_lab';
    else if (/(壓胸|cpr|除顫|電擊)/i.test(lowText)) action = 'cpr';
    else if (caseInfo.id === 'hypo' && /(d50|葡萄糖|糖水|血糖回升|意識恢復)/i.test(lowText)) {
      action = 'cure_hypo';
      nextStep = 'done';
      if (!vitalsUpdate.extra) vitalsUpdate.extra = 118;
    } else if (caseInfo.id === 'stroke' && /(電腦斷層|brain ct|ct室|會診神經)/i.test(lowText)) {
      action = 'cure_stroke';
      nextStep = 'done';
    }
  }

  return {
    reply: `${nurseName}：「${text}」`,
    action,
    vitalsUpdate,
    nextStep
  };
}

/**
 * 離線臨床保底規則庫（僅在選 Demo 模式或完全斷網時使用）
 */
function localClinicalRuleFallback(t, c, v) {
  const nurse = c.nurse || '護理師';
  const cid = c.id;

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
    return { reply: `${nurse}：「12 導程心電圖已完成！圖形已輸出貼在床尾病歷夾，請醫師過目判讀。」`, action: 'ekg' };
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

  if (cid === 'hypo') {
    if (/(d50|d50w|葡萄糖|高濃度葡萄糖|給糖|推糖|推d50|50%\s*glucose|glucagon|升糖素)/i.test(t)) {
      return {
        reply: `${nurse}：「收到！立刻靜脈推注 D50W 2 支（40 mL）！……推完了，病人眼睛眨了眨，意識慢慢恢復清醒，剛剛複測血糖上升到 118 mg/dL！」`,
        action: 'cure_hypo',
        vitalsUpdate: { extra: 118, mind: '清醒，能回答名字' },
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

  if (cid === 'stroke') {
    if (/(ct|電腦斷層|brain\s*ct|腦部\s*ct|急診ct|排除出血)/i.test(t)) {
      return {
        reply: `${nurse}：「馬上聯絡 CT 室安排 non-contrast brain CT！同時已經通知神經科值班總值待命評估 rt-PA！」`,
        action: 'cure_stroke',
        vitalsUpdate: { mind: '右上肢無力，意識清楚' },
        nextStep: 'done'
      };
    }
    if (/(降壓|降血壓|labetalol|nicardipine|hydralazine|降壓藥|把血壓打下來)/i.test(t)) {
      return { reply: `${nurse}：「醫師，目前血壓雖然 178/96，但缺血性中風盲目強力降壓會降低腦部灌流！建議先做 CT 排除出血再決定！」`, action: 'warn' };
    }
    if (/(fast|神經學|查體|瞳孔|左右|手無力|笑一笑|nihss)/i.test(t)) {
      return { reply: `${nurse}：「神經學檢查：右手肌力只有 2 分抬不起來，左側 5 分正常，臉部右側法令紋稍平，口齒含糊不清。」`, action: 'exam' };
    }
  }

  return {
    reply: `${nurse}：「收到醫師的指示：『${t}』，已立刻為病人執行並持續監測生命徵象。」`,
    action: null
  };
}
