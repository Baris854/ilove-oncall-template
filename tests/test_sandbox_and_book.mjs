import { existsSync, statSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { POCKET_MEDICINE_PAGES } from '../game/public-cases.js';
import { askAiNurse } from '../game/ai-nurse.js';

console.log('=== 1. 檢查 Pocket Medicine 9th 頁面圖檔與映射 ===');
const cases = Object.keys(POCKET_MEDICINE_PAGES);
console.log(`總共有 ${cases.length} 個急症個案配置了原文書本圖檔`);

let totalPages = 0;
let missingFiles = 0;
for (const [cid, data] of Object.entries(POCKET_MEDICINE_PAGES)) {
  console.log(`- [${cid}] 章節: ${data.chapter} (${data.pages.length} 頁)`);
  for (const page of data.pages) {
    totalPages++;
    if (!existsSync(page.file)) {
      console.error(`  ❌ 找不到檔案: ${page.file}`);
      missingFiles++;
    } else {
      const sz = statSync(page.file).size;
      if (sz < 50000) {
        console.error(`  ❌ 檔案過小可能損壞: ${page.file} (${sz} bytes)`);
        missingFiles++;
      }
    }
  }
}
console.log(`共計 ${totalPages} 頁原著圖檔，缺失數: ${missingFiles}`);
if (missingFiles > 0) throw new Error('有原著圖檔遺失！');

console.log('\n=== 2. 測試沙盒無劇透 AI 護理師與 5 大里程碑判定 ===');
// 測試問診
const resHist = await askAiNurse({
  provider: 'demo',
  caseInfo: { id: 'phypo', name: '趙先生', who: '糖尿病患者' },
  vitals: { hr: 120, bp: [90, 60], spo2: 95 },
  message: '向家屬問一下病人平常有沒有在吃藥？今天是什麼時候開始喘的？'
});
console.log('問診測試回覆:', resHist.reply);
console.log('問診里程碑:', resHist.milestones);
if (!resHist.milestones?.includes('history')) throw new Error('問診里程碑未正確判定！');

// 測試身體檢查
const resExam = await askAiNurse({
  provider: 'demo',
  caseInfo: { id: 'padhf', name: '黃伯伯', who: '心衰竭患者' },
  vitals: { hr: 110, bp: [150, 90], spo2: 88 },
  message: '床邊聽診雙肺呼吸音與心音，檢查下肢有無水腫'
});
console.log('查體測試回覆:', resExam.reply);
console.log('查體里程碑:', resExam.milestones);
if (!resExam.milestones?.includes('exam')) throw new Error('查體里程碑未正確判定！');

// 測試抽血與檢查
const resLab = await askAiNurse({
  provider: 'demo',
  caseInfo: { id: 'pacs', name: '李伯伯', who: '胸痛患者' },
  vitals: { hr: 95, bp: [130, 80], spo2: 98 },
  message: '立刻做 12 導程心電圖 EKG 並抽血送驗 Troponin'
});
console.log('檢查測試回覆:', resLab.reply);
console.log('檢查里程碑:', resLab.milestones);
if (!resLab.milestones?.includes('labs')) throw new Error('檢驗檢查里程碑未正確判定！');

// 測試錯誤處置時是否無劇透
const resWrong = await askAiNurse({
  provider: 'demo',
  caseInfo: { id: 'pstroke', name: '陳伯伯', who: '抽搐中風患者' },
  vitals: { hr: 110, bp: [180, 100], spo2: 92 },
  message: '拿壓舌板塞嘴巴撬開嘴'
});
console.log('錯誤處置回覆 (應為客觀臨床惡化反應，杜絕劇透答案):', resWrong.reply);
if (/建議給予|正確處置為|你應該要/.test(resWrong.reply)) {
  throw new Error('回覆中包含劇透答案字眼！');
}

// 測試治療與結案
const resRx = await askAiNurse({
  provider: 'demo',
  caseInfo: { id: 'phyperk', name: '陳先生', who: '高血鉀患者' },
  vitals: { hr: 48, bp: [92, 54], spo2: 95 },
  message: '立即靜脈給予 Calcium gluconate 1 支，並給予 RI 10U + D50W 2 支'
});
console.log('急救治療回覆:', resRx.reply);
console.log('治療里程碑:', resRx.milestones);
if (!resRx.milestones?.includes('treatment')) throw new Error('治療里程碑未正確判定！');
if (!resRx.cured) throw new Error('高血鉀正確處置應觸發治癒結案！');

console.log('\n=== 3. 檢查 index.html 與 game.css 元素整合 ===');
const html = readFileSync('index.html', 'utf8');
const css = readFileSync('game/game.css', 'utf8');

const requiredHtmlIds = [
  'pcSandboxPanel', 'pcSandboxBar', 'pcSandboxPercent',
  'sbBadgeHistory', 'sbBadgeExam', 'sbBadgeLabs', 'sbBadgeDiagnosis', 'sbBadgeTreatment',
  'btnBookReference', 'btnToggleOpts', 'pcOptsWrap', 'pcOptsCollapsedTip',
  'bookModal', 'bookCurrentImg', 'bookChapterName', 'bookPageNav', 'btnBookPrev', 'btnBookNext'
];
for (const id of requiredHtmlIds) {
  if (!html.includes(`id="${id}"`)) throw new Error(`index.html 缺少 id="${id}"`);
}
console.log('✓ index.html 所有必要組件與按鈕皆存在');

const requiredCssSelectors = [
  '.pc-sandbox-panel', '.sb-badge.done', '.pc-book-btn',
  '.pc-toggle-opts-btn', '.pc-opts-wrap.collapsed', '.book-modal', '.book-page-img'
];
for (const sel of requiredCssSelectors) {
  if (!css.includes(sel)) throw new Error(`game.css 缺少樣式: ${sel}`);
}
console.log('✓ game.css 所有必要視覺樣式皆齊備');

console.log('\n🎉 所有新功能與驗證項目全部通過！');
