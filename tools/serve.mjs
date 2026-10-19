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
    if (req.method === 'POST' && path === '/api/verify') {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const { provider, apiKey, model } = JSON.parse(Buffer.concat(buffers).toString() || '{}');
      const key = (apiKey || '').trim();

      if (provider === 'demo') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, message: '離線 Demo 模式就緒' }));
      }
      if (!key) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: '請輸入 API Key 或 Token' }));
      }

      if (provider === 'github') {
        const targetModel = model || 'gpt-4o-mini';
        const r = await fetch('https://models.github.ai/inference/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({ model: targetModel, messages: [{ role: 'user', content: 'OK' }], max_tokens: 5 })
        });
        if (!r.ok) {
          const t = await r.text().catch(() => '');
          res.writeHead(r.status, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: `GitHub Models 錯誤 (${r.status}): ${t.slice(0, 120)}` }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, message: `GitHub Models 連線成功！（模型：${targetModel}）` }));
      }

      if (provider === 'openai') {
        const targetModel = model || 'gpt-4o-mini';
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({ model: targetModel, messages: [{ role: 'user', content: 'OK' }], max_tokens: 5 })
        });
        if (!r.ok) {
          const t = await r.text().catch(() => '');
          res.writeHead(r.status, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: `OpenAI 錯誤 (${r.status}): ${t.slice(0, 120)}` }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, message: `OpenAI 連線成功！（模型：${targetModel}）` }));
      }

      if (provider === 'gemini') {
        const targetModel = model || 'gemini-2.0-flash';
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: '回覆 OK' }] }] })
        });
        if (!r.ok) {
          const t = await r.text().catch(() => '');
          res.writeHead(r.status, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: `Gemini 錯誤 (${r.status}): ${t.slice(0, 120)}` }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, message: `Gemini 連線成功！（模型：${targetModel}）` }));
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: '未知的服務商' }));
    }

    if (req.method === 'POST' && path === '/api/chat') {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const { provider, apiKey, model, messages } = JSON.parse(Buffer.concat(buffers).toString() || '{}');
      const key = (apiKey || '').trim();

      if (provider === 'github') {
        const r = await fetch('https://models.github.ai/inference/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({ model: model || 'gpt-4o-mini', messages, max_tokens: 200, temperature: 0.6 })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error?.message || `GitHub Models 錯誤 (${r.status})`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ reply: data.choices?.[0]?.message?.content || '' }));
      }

      if (provider === 'openai') {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({ model: model || 'gpt-4o-mini', messages, max_tokens: 200, temperature: 0.6 })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error?.message || `OpenAI 錯誤 (${r.status})`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ reply: data.choices?.[0]?.message?.content || '' }));
      }

      if (provider === 'gemini') {
        const targetModel = model || 'gemini-2.0-flash';
        const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error?.message || `Gemini 錯誤 (${r.status})`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ reply: data.candidates?.[0]?.content?.parts?.[0]?.text || '' }));
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: '不支援的服務商' }));
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
