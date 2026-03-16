#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'index.html');
const DATA_FILE = path.join(__dirname, 'artist-data.json');
const MIN_DATE = '2026-01-01';

const TRUST = {
  official: 1.0,
  media: 0.8,
  platform: 0.75,
  search: 0.6,
  community: 0.4,
};

const ARTISTS = {
  yoasobi: {
    label: 'YOASOBI',
    feeds: [
      { type: 'google', q: 'site:yoasobi-music.jp YOASOBI', tier: 'official', source: 'yoasobi-music.jp' },
      { type: 'google', q: 'YOASOBI (site:oricon.co.jp OR site:billboard-japan.com OR site:natalie.mu)', tier: 'media', source: 'JP music media' },
      { type: 'google', q: 'YOASOBI (site:bandsintown.com OR site:songkick.com)', tier: 'platform', source: 'event platforms' },
      { type: 'google', q: 'YOASOBI', tier: 'search', source: 'google news' },
      { type: 'rss', url: 'https://www.reddit.com/r/YOASOBI/new/.rss', tier: 'community', source: 'reddit r/YOASOBI' },
      { type: 'google', q: 'YOASOBI site:youtube.com', tier: 'platform', source: 'YouTube' },
    ],
  },
  yorushika: {
    label: 'Yorushika',
    feeds: [
      { type: 'google', q: 'site:yorushika.com Yorushika', tier: 'official', source: 'yorushika.com' },
      { type: 'google', q: 'Yorushika (site:oricon.co.jp OR site:billboard-japan.com OR site:natalie.mu)', tier: 'media', source: 'JP music media' },
      { type: 'google', q: 'Yorushika (site:bandsintown.com OR site:songkick.com)', tier: 'platform', source: 'event platforms' },
      { type: 'google', q: 'Yorushika', tier: 'search', source: 'google news' },
      { type: 'rss', url: 'https://www.reddit.com/r/Yorushika/new/.rss', tier: 'community', source: 'reddit r/Yorushika' },
      { type: 'google', q: 'Yorushika site:youtube.com', tier: 'platform', source: 'YouTube' },
    ],
  },
  zutomayo: {
    label: 'Zutomayo',
    feeds: [
      { type: 'google', q: 'site:zutomayo.net ZUTOMAYO OR ずっと真夜中でいいのに。', tier: 'official', source: 'zutomayo.net' },
      { type: 'google', q: 'ZUTOMAYO (site:oricon.co.jp OR site:billboard-japan.com OR site:natalie.mu)', tier: 'media', source: 'JP music media' },
      { type: 'google', q: 'ZUTOMAYO (site:bandsintown.com OR site:songkick.com)', tier: 'platform', source: 'event platforms' },
      { type: 'google', q: 'ZUTOMAYO', tier: 'search', source: 'google news' },
      { type: 'rss', url: 'https://www.reddit.com/r/ZutoMayo/new/.rss', tier: 'community', source: 'reddit r/ZutoMayo' },
      { type: 'google', q: 'ZUTOMAYO site:youtube.com', tier: 'platform', source: 'YouTube' },
    ],
  },
  weg: {
    label: 'WEG',
    feeds: [
      { type: 'google', q: '("World\'s End Girlfriend" OR WEG music) (site:virginbabylonrecords.com OR site:virginbabylonrecords.bandcamp.com)', tier: 'official', source: 'VBR/Bandcamp' },
      { type: 'google', q: '"World\'s End Girlfriend" (site:oricon.co.jp OR site:billboard-japan.com OR site:natalie.mu)', tier: 'media', source: 'JP music media' },
      { type: 'google', q: '"World\'s End Girlfriend" (site:bandsintown.com OR site:songkick.com)', tier: 'platform', source: 'event platforms' },
      { type: 'google', q: '"World\'s End Girlfriend" music', tier: 'search', source: 'google news' },
      { type: 'google', q: '"World\'s End Girlfriend" site:youtube.com', tier: 'platform', source: 'YouTube' },
      { type: 'google', q: '"World\'s End Girlfriend" site:reddit.com', tier: 'community', source: 'reddit' },
    ],
  },
};

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'NocturneNewsBot/2.0' } }, (res) => {
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
    .replace(/&#39;/g, "'");
}

function stripTags(s = '') {
  return decodeHtml(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toDate(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function isAfterMinDate(dateStr) {
  return String(dateStr || '') >= MIN_DATE;
}

function guessTypeFromTitle(title = '', source = '') {
  const t = `${title} ${source}`.toLowerCase();
  const eventK = ['tour','live','concert','festival','ticket','show','hall tour','arena','world tour','asia tour','공연','투어','라이브','예매','티켓','フェス','公演','ライブ','スケジュール','schedule'];
  const releaseK = ['release','single','album','ep','mv','music video','digital','ost','vinyl','cd','blu-ray','配信','発売','新曲','신곡','발매','앨범'];
  const goodsK = ['goods','merch','merchandise','store','shop','preorder','pre-order','official store','グッズ','굿즈','MD','md'];
  if (eventK.some(k => t.includes(k))) return 'event';
  if (releaseK.some(k => t.includes(k))) return 'release';
  if (goodsK.some(k => t.includes(k))) return 'goods';
  return 'news';
}

function classifyItems(items = []) {
  return items.map((it) => ({
    ...it,
    type: it.type && it.type !== 'news' ? it.type : guessTypeFromTitle(it.title || '', it.source || ''),
  }));
}

function parseRss(xml, source, tier) {
  const items = [];

  // RSS
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
      source,
      trust: TRUST[tier] ?? 0.5,
      tier,
      type: guessTypeFromTitle(title, source),
    });
  }

  // Atom (e.g., Reddit)
  if (items.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    while ((m = entryRegex.exec(xml)) !== null) {
      const block = m[1];
      const title = stripTags((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
      const href = (block.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
      const updated = decodeHtml((block.match(/<(updated|published)>([\s\S]*?)<\/(updated|published)>/i) || [])[2] || '');
      if (!title || !href) continue;
      items.push({
        date: toDate(updated),
        title,
        url: decodeHtml(href),
        source,
        trust: TRUST[tier] ?? 0.5,
        tier,
        type: guessTypeFromTitle(title, source),
      });
    }
  }

  return items;
}

function googleNewsUrl(q) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`;
}


function isDirectActivity(item, artistKey) {
  const t = `${item.title || ''} ${(item.source || '')}`.toLowerCase();

  // 제외: 커버/리액션/가사/팬캠/해석/shorts/compilation 등
  const negative = [
    'cover', 'reaction', 'lyrics', 'lyric video', 'karaoke', 'fan cam', 'fancam',
    'remix by fan', 'sped up', 'nightcore', 'tutorial', 'analysis', 'review',
    'unboxing', 'ranking', 'top 10', 'mashup', 'instrumental cover', 'guitar cover',
    'piano cover', 'drum cover', 'dance cover', 'shorts', 'tiktok', '해석', '커버', '리액션', '팬캠'
  ];
  if (negative.some(k => t.includes(k))) return false;

  // 허용: 공식/직접 활동 신호
  const positive = [
    'official', 'announcement', 'news', 'tour', 'live', 'concert', 'festival',
    'release', 'single', 'album', 'ep', 'mv', 'music video', 'premiere',
    'sold out', 'ticket', 'schedule', 'new song', 'new album',
    '公式', 'お知らせ', 'ライブ', '公演', 'ツアー', '発売', '配信', '新曲',
    '공식', '공지', '공연', '투어', '발매', '신곡', '앨범'
  ];

  const artistTokens = {
    yoasobi: ['yoasobi', 'ikura', 'ayase'],
    yorushika: ['yorushika', 'ヨルシカ', 'n-buna', 'suis'],
    zutomayo: ['zutomayo', 'ずっと真夜中でいいのに', 'acaね', 'aca-ne'],
    weg: ["world's end girlfriend", 'worlds end girlfriend', 'weg', 'virgin babylon'],
  };

  const hasArtist = (artistTokens[artistKey] || []).some(k => t.includes(k));
  const hasPositive = positive.some(k => t.includes(k));

  // YouTube 검색 결과는 비공식/커버가 많아 기본 제외 (공식 채널 명시 시만 허용)
  if ((item.source || '').toLowerCase().includes('youtube')) {
    return hasArtist && hasPositive && t.includes('official');
  }

  // 커뮤니티는 팬 게시글 성격이라 아티스트 연관성만 확인
  if (item.tier === 'community') {
    return hasArtist;
  }

  // 검색 소스는 엄격: 아티스트명 + 활동키워드 필요
  if (item.tier === 'search') {
    return hasArtist && hasPositive;
  }
  // 공식 소스는 기본 허용 (특히 WEG Bandcamp 릴리즈 제목은 키워드가 짧은 경우가 많음)
  if (item.tier === 'official') return true;

  // type이 이미 분류된 경우 허용
  if (['release','event','goods','news'].includes((item.type || '').toLowerCase())) {
    if (item.tier === 'media' || item.tier === 'platform') return true;
  }

  // 나머지는 활동 키워드 필요
  return hasPositive;
}

function dedupe(items) {
  const map = new Map();
  for (const it of items) {
    const key = `${(it.title || '').toLowerCase().replace(/[^\w가-힣ぁ-んァ-ン一-龥]+/g, ' ').trim().slice(0, 120)}|${it.date}`;
    const prev = map.get(key);
    if (!prev || (it.trust ?? 0) > (prev.trust ?? 0)) {
      map.set(key, it);
    }
  }
  return [...map.values()];
}

function sortNews(items) {
  return [...items].sort((a, b) => {
    const dd = String(b.date || '').localeCompare(String(a.date || ''));
    if (dd !== 0) return dd;
    return (b.trust ?? 0) - (a.trust ?? 0);
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
  return /^https?:\/\//i.test(u || '') ? u : '#';
}

function badge(type = 'news') {
  const t = (type || 'news').toLowerCase();
  if (t === 'event') return { cls: 'badge-event', text: '이벤트' };
  if (t === 'release') return { cls: 'badge-release', text: '릴리즈' };
  if (t === 'goods') return { cls: 'badge-goods', text: '굿즈' };
  return { cls: 'badge-news', text: '뉴스' };
}

function tierKo(tier) {
  if (tier === 'official') return '공식';
  if (tier === 'media') return '매체';
  if (tier === 'platform') return '플랫폼';
  if (tier === 'community') return '커뮤니티';
  return '검색';
}

function renderCards(items) {
  return (items || []).slice(0, 10).map((it) => {
    const b = badge(it.type);
    return `      <article class="card news-card">\n        <div class="card-top"><span class="badge ${b.cls}">${b.text}</span><span class="card-date">${esc(it.date || '')}</span></div>\n        <h3>${esc(it.title || '')}</h3>\n        <p style="font-size:12px;color:var(--text3);margin:6px 0 10px">${esc(tierKo(it.tier))} · ${esc(it.source || '')} · 신뢰도 ${Number(it.trust || 0).toFixed(2)}</p>\n        <a href="${esc(normalizeUrl(it.url))}" target="_blank" class="card-link">출처 →</a>\n      </article>`;
  }).join('\n\n');
}


function renderEmpty(text) {
  return `      <article class="card news-card">
        <h3>${esc(text)}</h3>
        <p style="font-size:12px;color:var(--text3);margin-top:8px">다음 수집 주기에 자동 갱신됩니다.</p>
      </article>`;
}

function replaceTabBlock(html, section, tab, cardsHtml) {
  const tabs = ['news', 'events', 'releases', 'goods', 'community'];
  const startToken = `<div class="tab-content" data-section="${section}" data-tab="${tab}"`;
  const sIdx = html.indexOf(startToken);
  if (sIdx === -1) return html;

  const startClose = html.indexOf('>', sIdx) + 1;
  let eIdx = -1;
  const cur = tabs.indexOf(tab);
  for (let i = cur + 1; i < tabs.length; i++) {
    const nextToken = `<div class="tab-content" data-section="${section}" data-tab="${tabs[i]}"`;
    const idx = html.indexOf(nextToken, startClose);
    if (idx !== -1) { eIdx = idx; break; }
  }
  if (eIdx === -1) {
    const sectionEnd = html.indexOf('</section>', startClose);
    eIdx = sectionEnd === -1 ? html.length : sectionEnd;
  }

  return html.slice(0, startClose) + `\n${cardsHtml}\n\n  ` + html.slice(eIdx);
}

async function loadFeed(feed) {
  try {
    const url = feed.type === 'google' ? googleNewsUrl(feed.q) : feed.url;
    const xml = await fetch(url);
    return parseRss(xml, feed.source, feed.tier);
  } catch (e) {
    console.error(`[WARN] feed failed (${feed.source}): ${e.message}`);
    return [];
  }
}

async function main() {
  const data = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : {};
  let html = fs.readFileSync(INDEX_FILE, 'utf8');

  for (const [key, meta] of Object.entries(ARTISTS)) {
    const useScraped = key === 'yorushika' || key === 'weg';
    const scraped = (useScraped ? ((data[key] && data[key].scraped_news) || []) : []).map((x) => ({
      ...x,
      trust: key === 'weg' ? 0.7 : 1.0,
      tier: 'official',
      source: x.source || 'official scrape',
    }));

    const allFeedItems = [];
    for (const feed of meta.feeds) {
      const items = await loadFeed(feed);
      allFeedItems.push(...items.slice(0, 8));
    }

    const merged = sortNews(dedupe(classifyItems([...scraped, ...allFeedItems])))
      .filter((x) => isAfterMinDate(x.date))
      .filter((x) => isDirectActivity(x, key))
      .slice(0, 24);

    const newsItems = merged.filter(x => x.type === 'news').slice(0, 10);
    const eventItems = merged.filter(x => x.type === 'event').slice(0, 10);
    const releaseItems = merged.filter(x => x.type === 'release').slice(0, 10);
    const goodsItems = merged.filter(x => x.type === 'goods').slice(0, 10);
    const communityItems = merged.filter(x => x.tier === 'community').slice(0, 10);

    if (newsItems.length) html = replaceTabBlock(html, key, 'news', renderCards(newsItems));
    if (eventItems.length) html = replaceTabBlock(html, key, 'events', renderCards(eventItems));
    if (releaseItems.length) html = replaceTabBlock(html, key, 'releases', renderCards(releaseItems));
    if (goodsItems.length) html = replaceTabBlock(html, key, 'goods', renderCards(goodsItems));
    if (communityItems.length) html = replaceTabBlock(html, key, 'community', renderCards(communityItems));

    if (!data[key]) data[key] = {};
    data[key].merged_news = merged;
    data[key].categorized = {
      news: newsItems,
      events: eventItems,
      releases: releaseItems,
      goods: goodsItems,
      community: communityItems,
    };
    data[key].last_merged = new Date().toISOString();
  }

  fs.writeFileSync(INDEX_FILE, html, 'utf8');
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ index.html 뉴스 섹션 업데이트 완료 (공식/매체/플랫폼/커뮤니티 통합)');
}

main().catch((e) => {
  console.error('❌ update-index-news 실패:', e.message);
  process.exit(1);
});
