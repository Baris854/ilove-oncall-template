// ai-nurse.js - AI 護理師與臨床模擬對話引擎
// 支援 GitHub Models (免費推薦)、Google Gemini、OpenAI 與智慧離線規則保底

const GITHUB_MODELS_ENDPOINT = 'https://models.github.ai/inference/chat/completions';
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export const AI_DEFAULTS = {
  github: {
    name: 'GitHub Models (免費推薦)',
    model: 'gpt-4o-mini',
    placeholder: '輸入 GitHub Personal Access Token (ghp_... 或 github_pat_...)',
    hint: '💡 只要有 GitHub 帳號即可免費使用 gpt-4o-mini，免綁信用卡。'
  },
  gemini: {
    name: 'Google Gemini',
    model: 'gemini-2.0-flash',
    placeholder: '輸入 Google AI Studio API Key (AIza...)',
    hint: '💡 使用 Google AI Studio 產生的 API Key。'
  },
  openai: {
    name: 'OpenAI',
    model: 'gpt-4o-mini',
    placeholder: '輸入 OpenAI API Key (sk-...)',
    hint: '💡 使用官方 OpenAI API Key。'
  },
  demo: {
    name: '離線 Demo (不用 Key)',
    model: 'local-rules',
    placeholder: '免輸入 Key，以本機臨床知識庫即時應對',
    hint: '💡 無需任何連線或 API Key，隨開隨玩。'
  }
};

/**
 * 測試 API Token 連線是否正常
 */
export async function verifyAiConnection({ provider = 'github', apiKey = '', model = '' }) {
  if (provider === 'demo') {
    return { ok: true, message: '離線模式已就緒，隨時可開始值班！' };
  }
  const key = apiKey.trim();
  if (!key) {
    return { ok: false, error: '請先輸入 API Key 或 Token！' };
  }

  // 1. 先嘗試走本機 serve.mjs 伺服器代理（若有執行 node tools/serve.mjs）
  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey: key, model: model || AI_DEFAULTS[provider]?.model })
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.ok) return { ok: true, message: data.message || `連線成功！模型：${data.model || model}` };
      if (data.error) return { ok: false, error: data.error };
    }
  } catch {
    // 若不是透過 serve.mjs 執行，繼續嘗試前端直連
  }

  // 2. 前端直接測試
  try {
    if (provider === 'github') {
      const targetModel = model || AI_DEFAULTS.github.model;
      const res = await fetch(GITHUB_MODELS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: '回覆 OK' }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`GitHub Models 驗證失敗 (${res.status}): ${errText.slice(0, 100)}`);
      }
      return { ok: true, message: `GitHub Models 連線成功！（模型：${targetModel}）` };
    } else if (provider === 'openai') {
      const targetModel = model || AI_DEFAULTS.openai.model;
      const res = await fetch(OPENAI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'OK' }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`OpenAI 驗證失敗 (${res.status}): ${errData.error?.message || res.statusText}`);
      }
      return { ok: true, message: `OpenAI 連線成功！（模型：${targetModel}）` };
    } else if (provider === 'gemini') {
      const targetModel = model || AI_DEFAULTS.gemini.model;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: '請只回覆 OK。' }] }]
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`Gemini 驗證失敗 (${res.status}): ${errData.error?.message || res.statusText}`);
      }
      return { ok: true, message: `Gemini 連線成功！（模型：${targetModel}）` };
    }
  } catch (err) {
    return { ok: false, error: err.message || '連線測試失敗，請檢查網路或 Token' };
  }
  return { ok: false, error: '未知的 AI 服務商' };
}

/**
 * 呼叫 AI 護理師回覆床邊醫囑，並判斷是否產生臨床狀態轉變
 */
export async function askAiNurse({
  provider = 'github',
  apiKey = '',
  model = '',
  caseInfo = {},
  vitals = {},
  history = [],
  message = '',
  doctorName = '值班醫師',
  doctorLevel = 'PGY'
}) {
  const normMsg = message.trim().toLowerCase();

  // 1. 本地快速臨床解析與效果映射（即時辨識關鍵醫囑，輔助 AI 做出精準反應）
  const clinicalMatch = matchClinicalOrder(normMsg, caseInfo, vitals);

  // 2. 如果選 Demo 或沒有提供 Key，直接走高品質本地臨床規則
  if (provider === 'demo' || !apiKey.trim()) {
    return {
      reply: clinicalMatch.reply || localFallbackReply(normMsg, caseInfo, vitals),
      action: clinicalMatch.action,
      vitalsUpdate: clinicalMatch.vitalsUpdate,
      nextStep: clinicalMatch.nextStep
    };
  }

  // 3. 準備送給 AI 的 Prompt
  const nurseName = caseInfo.nurse || '護理師';
  const patientDesc = `${caseInfo.bed || ''} ${caseInfo.name || '病人'}（${caseInfo.who || ''}）`;
  const vitalsDesc = `心跳: ${vitals.hr ?? '未知'}, 血壓: ${vitals.bp ? vitals.bp.join('/') : '未知'}, 血氧: ${vitals.spo2 ?? '未知'}%, 額外指標(${caseInfo.extra || 'sugar'}): ${vitals.extra ?? '未知'}, 意識狀態: ${vitals.mind || '未知'}`;

  const systemPrompt = `你正在扮演台灣醫院內科病房夜班的${nurseName}。
當前情境：
- 值班醫師：${doctorName}（${doctorLevel}）正在床邊下達醫囑或進行詢問。
- 床位與病人：${patientDesc}。
- 病人目前監視器狀態：${vitalsDesc}。
- 病人真實情況背景：${caseInfo.intro || ''}。

你的職責與回覆規則：
1. 請以「${nurseName}：「開頭，以台灣資深病房護理師口吻，口語、專業、冷靜且有臨場感地回覆醫師。
2. 若醫師下達了明確醫囑（如給藥、抽血、做心電圖、量生命徵象、照光、壓胸等），回覆已執行及病人目前的立即反應或數據變化。
3. 若醫師詢問病史或檢查身體，請回覆病人的主觀症狀與客觀查體發現。
4. 若醫師處置正確（例如低血糖病人給予高濃度葡萄糖 D50W、中風病人安排急做 Brain CT 與會診神經科），請回報病人狀況開始穩定。
5. 若處置有明顯危險（例如低血糖躁動誤打鎮靜劑、急性缺血性中風盲目強力降血壓），請回報病人狀況惡化或警訊。
6. 一律使用繁體中文（台灣醫護用語），字數精簡（約 30～80 字），不要發表無關長篇大論。`;

  // 構建對話歷史
  const messages = [{ role: 'system', content: systemPrompt }];
  for (const h of history.slice(-6)) {
    messages.push({
      role: h.role === 'nurse' ? 'assistant' : 'user',
      content: h.text || h.content || ''
    });
  }
  messages.push({ role: 'user', content: `${doctorName}醫囑：「${message}」` });

  let aiReply = '';

  // 優先嘗試本地 serve.mjs 代理
  try {
    const proxyRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        apiKey: apiKey.trim(),
        model: model || AI_DEFAULTS[provider]?.model,
        messages,
        caseInfo,
        vitals
      })
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.reply) aiReply = data.reply;
    }
  } catch {
    // 代理不可用，走前端直連
  }

  // 前端直接呼叫 API
  if (!aiReply) {
    try {
      if (provider === 'github') {
        const res = await fetch(GITHUB_MODELS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`
          },
          body: JSON.stringify({
            model: model || AI_DEFAULTS.github.model,
            messages,
            temperature: 0.6,
            max_tokens: 200
          })
        });
        if (res.ok) {
          const data = await res.json();
          aiReply = data.choices?.[0]?.message?.content;
        } else {
          console.warn('GitHub Models 直連回傳錯誤，使用本地保底', res.status);
        }
      } else if (provider === 'openai') {
        const res = await fetch(OPENAI_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`
          },
          body: JSON.stringify({
            model: model || AI_DEFAULTS.openai.model,
            messages,
            temperature: 0.6,
            max_tokens: 200
          })
        });
        if (res.ok) {
          const data = await res.json();
          aiReply = data.choices?.[0]?.message?.content;
        }
      } else if (provider === 'gemini') {
        const targetModel = model || AI_DEFAULTS.gemini.model;
        const geminiContents = [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n醫師說：${message}` }] }
        ];
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: geminiContents })
        });
        if (res.ok) {
          const data = await res.json();
          aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        }
      }
    } catch (fetchErr) {
      console.warn('AI 連線失敗，採用臨床智能保底:', fetchErr);
    }
  }

  // 格式整理
  if (aiReply) {
    aiReply = aiReply.replace(/^護理師\s*[:：]\s*/, '').replace(/^[「『]/, '').replace(/[」』]$/, '').trim();
    aiReply = `${nurseName}：「${aiReply}」`;
  } else {
    aiReply = clinicalMatch.reply || localFallbackReply(normMsg, caseInfo, vitals);
  }

  return {
    reply: aiReply,
    action: clinicalMatch.action,
    vitalsUpdate: clinicalMatch.vitalsUpdate,
    nextStep: clinicalMatch.nextStep
  };
}

/**
 * 臨床意圖識別引擎：將自然語言匹配到具體的臨床狀態改變
 */
function matchClinicalOrder(t, c, v) {
  const nurse = c.nurse || '護理師';
  const cid = c.id;

  // 1. 生命徵象與理學檢查
  if (/(量|量測|測|看|確認).{0,6}(生命徵象|vital|血壓|心跳|血氧|bp|hr|spo2)/i.test(t)) {
    const bpStr = v.bp ? `${v.bp[0]}/${v.bp[1]} mmHg` : '量不到';
    return {
      reply: `${nurse}：「量好了！目前 HR ${v.hr || '--'} 次/分、BP ${bpStr}、SpO₂ ${v.spo2 || '--'}%，意識${v.mind || '未明'}。」`,
      action: 'vital'
    };
  }

  // 2. 抽血檢驗
  if (/(抽血|cbc|dc|生化|電解質|bun|cr|k|na|sugar|血糖|lab|blood\s*gas|abg)/i.test(t)) {
    if (/(量|測|dxt|驗|驗一下|立即測).{0,6}(血糖|sugar|dxt)/i.test(t)) {
      if (cid === 'hypo') {
        return {
          reply: `${nurse}：「立刻測床邊血糖！嗶——指尖 DXT 只有 32 mg/dL！病人低血糖發作了，需要馬上處理！」`,
          action: 'sugar_check',
          vitalsUpdate: { extra: 32 }
        };
      }
    }
    return {
      reply: `${nurse}：「好的，已經抽好血並加急送往檢驗科，檢驗報告大約 30 分鐘後出來，出來會即時通知醫師！」`,
      action: 'draw_lab'
    };
  }

  // 3. 心電圖與 X 光
  if (/(心電圖|ekg|ecg|12\s*lead)/i.test(t)) {
    return {
      reply: `${nurse}：「12 導程心電圖已完成！圖形已輸出貼在床尾病歷夾，請醫師過目判讀。」`,
      action: 'ekg'
    };
  }
  if (/(胸片|cxr|胸部\s*x\s*光|x\s*光)/i.test(t)) {
    return {
      reply: `${nurse}：「已經聯絡放射科推床邊 CXR 機台過來照，照好會立刻上傳 PACS 系統！」`,
      action: 'cxr'
    };
  }

  // 4. 給氧氣
  if (/(給氧|氧氣|oxygen|o2|nasal\s*cannula|mask|面罩|鼻導管)/i.test(t)) {
    return {
      reply: `${nurse}：「已經接上氧氣鼻導管 3 L/min，病人胸廓起伏順暢，血氧監測中。」`,
      action: 'oxygen',
      vitalsUpdate: { spo2: Math.max(96, (v.spo2 || 94)) }
    };
  }

  // 5. CPR 壓胸
  if (/(cpr|壓胸|胸外按壓|心臟按壓|心跳停|arrest)/i.test(t)) {
    return {
      reply: `${nurse}：「病人摸不到脈搏！立刻開始壓胸 CPR，我去推急救車和 AED！」`,
      action: 'cpr'
    };
  }

  // 6. 低血糖病例 (hypo) 特殊醫囑
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
        reply: `${nurse}：「醫師……給鎮靜劑嗎？可是阿公好像是代謝性混亂耶……好，先依照醫囑給，但是病人呼吸好像變很慢，血氧掉下去了！」`,
        action: 'worsen',
        vitalsUpdate: { spo2: 86, mind: '昏迷叫不醒' }
      };
    }
  }

  // 7. 中風病例 (stroke) 特殊醫囑
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
      return {
        reply: `${nurse}：「醫師，目前血壓雖然 178/96，但如果是急性缺血性中風，太早積極降血壓可能會影響腦部灌流喔！要先確認 CT 有沒有出血嗎？」`,
        action: 'warn'
      };
    }
    if (/(fast|神經學|查體|瞳孔|左右|手無力|笑一笑|nihss)/i.test(t)) {
      return {
        reply: `${nurse}：「神經學檢查：右手肌力只有 2 分抬不起來，左側 5 分正常，臉部右側法令紋稍平，口齒含糊不清。」`,
        action: 'exam'
      };
    }
  }

  return { reply: null, action: null };
}

/**
 * 通用本地臨床規則兜底
 */
function localFallbackReply(t, c, v) {
  const nurse = c.nurse || '護理師';
  if (/(好|了解|收到|觀察|先這樣|休息)/i.test(t)) {
    return `${nurse}：「好的醫師，我們持續密切監測病人狀況，有變化隨時打電話通知你。」`;
  }
  if (/(對不起|抱歉|拍謝|辛苦了)/i.test(t)) {
    return `${nurse}：「醫師別客氣，值班大家都辛苦了，病人有你來看我們比較安心！」`;
  }
  return `${nurse}：「收到醫師的指示：『${t}』，已立刻為病人執行並持續監測生命徵象。」`;
}
