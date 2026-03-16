#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'index.html');
const DATA_FILE = path.join(__dirname, 'artist-data.json');

const ARTISTS = {
  yoasobi: { q: 'YOASOBI', label: 'YOASOBI' },
  yorushika: { q: 'Yorushika', label: 'Yorushika' },
  zutomayo: { q: 'ZUTOMAYO', label: 'Zutomayo' },
  weg: { q: '"World\'s End Girlfriend" OR WEG music', label: 'WEG' },
};

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'NocturneNewsBot/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
  });
}

function decodeHtml(s = '') {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function stripTags(s = '') {
  return decodeHtml(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toDate(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function parseGoogleNewsRss(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = stripTags((block.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '');
    const link = decodeHtml((block.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '').trim();
    const pubDateRaw = decodeHtml((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || '');
    if (!title || !link) continue;
    items.push({
      date: toDate(pubDateRaw),
      title,
      url: link,
      source: 'news.google.com',
      type: 'news',
    });
  }
  return items;
}

function dedupe(arr) {
  const seen = new Set();
  return arr.filter((x) => {
    const k = `${(x.title || '').toLowerCase().slice(0, 80)}|${x.date || ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeUrl(u) {
  if (!u) return '#';
  if (/^https?:\/\//i.test(u)) return u;
  return '#';
}

function badge(type = 'news') {
  const t = (type || 'news').toLowerCase();
  if (t === 'event') return { cls: 'badge-event', text: '이벤트' };
  if (t === 'release') return { cls: 'badge-release', text: '릴리즈' };
  if (t === 'goods') return { cls: 'badge-goods', text: '굿즈' };
  return { cls: 'badge-news', text: '뉴스' };
}

function renderCards(items) {
  return (items || []).slice(0, 8).map((it) => {
    const b = badge(it.type);
    return `      <article class="card news-card">\n        <div class="card-top"><span class="badge ${b.cls}">${b.text}</span><span class="card-date">${esc(it.date || '')}</span></div>\n        <h3>${esc(it.title || '')}</h3>\n        <a href="${esc(normalizeUrl(it.url))}" target="_blank" class="card-link">출처 →</a>\n      </article>`;
  }).join('\n\n');
}

function replaceNewsBlock(html, section, cardsHtml) {
  const start = `<div class="tab-content" data-section="${section}" data-tab="news">`;
  const end = `<div class="tab-content" data-section="${section}" data-tab="events" style="display:none">`;
  const sIdx = html.indexOf(start);
  const eIdx = html.indexOf(end);
  if (sIdx === -1 || eIdx === -1 || eIdx <= sIdx) return html;

  const startClose = html.indexOf('>', sIdx) + 1;
  const before = html.slice(0, startClose);
  const after = html.slice(eIdx);
  const content = `\n${cardsHtml || ''}\n\n  `;
  return before + content + after;
}

async function main() {
  const data = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : {};
  let html = fs.readFileSync(INDEX_FILE, 'utf8');

  for (const [key, meta] of Object.entries(ARTISTS)) {
    const scraped = (data[key] && data[key].scraped_news) ? data[key].scraped_news : [];
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(meta.q)}&hl=ko&gl=KR&ceid=KR:ko`;

    let webNews = [];
    try {
      const xml = await fetch(rssUrl);
      webNews = parseGoogleNewsRss(xml).slice(0, 10);
    } catch (e) {
      console.error(`[WARN] ${key} rss fetch failed: ${e.message}`);
    }

    const merged = dedupe([...(scraped || []), ...(webNews || [])]).slice(0, 8);
    html = replaceNewsBlock(html, key, renderCards(merged));

    if (!data[key]) data[key] = {};
    data[key].merged_news = merged;
    data[key].last_merged = new Date().toISOString();
  }

  fs.writeFileSync(INDEX_FILE, html, 'utf8');
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ index.html 뉴스 섹션 업데이트 완료');
}

main().catch((e) => {
  console.error('❌ update-index-news 실패:', e.message);
  process.exit(1);
});
