// A tiny static server for playing the game on this computer: `npm start`, then open the address
// it prints. No packages needed. ES modules need a server (a page opened as file:// cannot load
// them), and this one also sends the right types for .js, .png and .svg.
//
//   node tools/serve.mjs              http://127.0.0.1:8790/
//   node tools/serve.mjs --port 9000
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const arg = process.argv.indexOf('--port');
const PORT = Number(arg > -1 ? process.argv[arg + 1] : process.env.PORT) || 8790;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const path = decodeURIComponent(url.pathname);

    // API 代理：解決瀏覽器 CORS 與直連問題
    const GEMINI_SAFETY_SETTINGS = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ];

    if (req.method === 'POST' && path === '/api/verify') {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const { provider, apiKey, model, customUrl, prompt } = JSON.parse(Buffer.concat(buffers).toString() || '{}');
      const key = (apiKey || '').trim();
      const testPrompt = prompt || '請簡短回覆：「醫師，病房已就緒，隨時待命！」';

      if (provider === 'demo') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, reply: '離線 Demo 模式就緒' }));
      }
      if (!key) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: '請輸入 API Key 或 Token' }));
      }

      if (provider === 'gemini') {
        const targetModel = model || 'gemini-2.0-flash';
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: testPrompt }] }],
            safetySettings: GEMINI_SAFETY_SETTINGS,
            generationConfig: { temperature: 0.2, maxOutputTokens: 60 }
          })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          res.writeHead(r.status, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: data.error?.message || `Gemini API 錯誤 (${r.status})` }));
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Gemini 未回傳文字內容，可能受到安全審查阻擋' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, reply: text }));
      }

      let endpoint = 'https://api.openai.com/v1/chat/completions';
      if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      else if (provider === 'openrouter') endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      else if (provider === 'custom' && customUrl) endpoint = customUrl;

      const targetModel = model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: targetModel, messages: [{ role: 'user', content: testPrompt }], max_tokens: 60, temperature: 0.2 })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        res.writeHead(r.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: data.error?.message || `API 錯誤 (${r.status})` }));
      }
      const reply = data.choices?.[0]?.message?.content;
      if (!reply) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: '模型未回傳文字回覆' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, reply }));
    }

    if (req.method === 'POST' && path === '/api/chat') {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const { provider, apiKey, model, customUrl, messages, systemPrompt, userPrompt } = JSON.parse(Buffer.concat(buffers).toString() || '{}');
      const key = (apiKey || '').trim();

      if (provider === 'gemini') {
        const targetModel = model || 'gemini-2.0-flash';
        const fullPrompt = `${systemPrompt || ''}\n\n${userPrompt || (messages?.[messages.length - 1]?.content) || ''}`;
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            safetySettings: GEMINI_SAFETY_SETTINGS,
            generationConfig: { temperature: 0.5, maxOutputTokens: 300 }
          })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          res.writeHead(r.status, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: data.error?.message || `Gemini 錯誤 (${r.status})` }));
        }
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!reply) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Gemini 未回傳文字，可能受到安全審查阻擋' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ reply }));
      }

      let endpoint = 'https://api.openai.com/v1/chat/completions';
      if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      else if (provider === 'openrouter') endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      else if (provider === 'custom' && customUrl) endpoint = customUrl;

      const targetModel = model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: targetModel, messages, max_tokens: 300, temperature: 0.6 })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        res.writeHead(r.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: data.error?.message || `API 錯誤 (${r.status})` }));
      }
      const reply = data.choices?.[0]?.message?.content || '';
      if (!reply) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: '模型未回傳文字回覆' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ reply }));
    }

    let file = normalize(join(ROOT, path));
    // nothing outside the project folder, and nothing hidden (.git and the like)
    if (!file.startsWith(ROOT) || file.slice(ROOT.length).split(sep).some(p => p.startsWith('.'))) throw Object.assign(new Error(), { code: 'ENOENT' });
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch (err) {
    res.writeHead(err.code === 'ENOENT' || err.code === 'ENOTDIR' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(err.code === 'ENOENT' || err.code === 'ENOTDIR' ? 'not found' : (err.message || 'error'));
  }
}).listen(PORT, '127.0.0.1', () => console.log(`遊戲在 http://127.0.0.1:${PORT}/ （按 Ctrl+C 停止）`));
