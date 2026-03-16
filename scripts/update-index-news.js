#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'index.html');
const DATA_FILE = path.join(__dirname, 'artist-data.json');

const MIN_DATE = '2026-01-01';
const FEED_ITEM_LIMIT = 10;
const TAB_LIMIT = 10;

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
    tokens: ['yoasobi', 'ikura', 'ikuta lira', 'lilas', '幾田りら', 'ayase', '요아소비', '이쿠라', '이쿠타 리라', '아야세'],
    feeds: [
      { type: 'google', q: after('YOASOBI'), tier: 'search', source: 'google news', category: 'news' },
      { type: 'google', q: after('요아소비'), tier: 'search', source: 'google news ko', category: 'news' },
      { type: 'google', q: after('Ikuta Lira OR 幾田りら OR 이쿠타 리라'), tier: 'search', source: 'ikura solo news', category: 'news' },
      { type: 'google', q: after('site:yoasobi-music.jp YOASOBI'), tier: 'official', source: 'yoasobi-music.jp', category: 'news' },

      { type: 'google', q: after('YOASOBI TOUR 2026'), tier: 'platform', source: 'event search', category: 'event' },
      { type: 'google', q: after('YOASOBI live 2026'), tier: 'platform', source: 'event search', category: 'event' },
      { type: 'google', q: after('요아소비 내한'), tier: 'platform', source: 'event search ko', category: 'event' },
      { type: 'google', q: after('Ikuta Lira concert OR 幾田りら ライブ OR 이쿠타 리라 내한'), tier: 'platform', source: 'ikura solo event', category: 'event' },
      { type: 'setlist', q: 'YOASOBI', tier: 'platform', source: 'setlist.fm', category: 'event' },

      { type: 'google', q: after('YOASOBI release'), tier: 'search', source: 'release search', category: 'release' },
      { type: 'google', q: after('YOASOBI album'), tier: 'search', source: 'release search', category: 'release' },
      { type: 'google', q: after('YOASOBI single'), tier: 'search', source: 'release search', category: 'release' },
      { type: 'google', q: after('Ikuta Lira release OR 幾田りら 新曲 OR 이쿠타 리라 신곡'), tier: 'search', source: 'ikura solo release', category: 'release' },

      { type: 'google', q: after('YOASOBI collaboration'), tier: 'search', source: 'goods/collab search', category: 'goods' },
      { type: 'google', q: after('YOASOBI ASICS'), tier: 'search', source: 'goods/collab search', category: 'goods' },
      { type: 'google', q: after('Ikuta Lira collaboration OR 幾田りら コラボ OR 이쿠타 리라 콜라보'), tier: 'search', source: 'ikura solo goods/collab', category: 'goods' },

      { type: 'dcinside_gallery', id: 'yoasobi', mode: 'info', pages: 2, tier: 'community', source: 'dcinside 요아소비 갤 정보', category: 'community' },
      { type: 'dcinside_gallery', id: 'yoasobi', mode: 'recommend', pages: 2, tier: 'community', source: 'dcinside 요아소비 갤 개념글', category: 'community' },
      { type: 'dcinside_gallery', id: 'lilas', mode: 'info', pages: 2, tier: 'community', source: 'dcinside 이쿠타 리라 갤 정보', category: 'community' },
      { type: 'dcinside_gallery', id: 'lilas', mode: 'recommend', pages: 2, tier: 'community', source: 'dcinside 이쿠타 리라 갤 개념글', category: 'community' },
      { type: 'rss', url: 'https://www.reddit.com/r/YOASOBI/new/.rss', tier: 'community', source: 'reddit r/YOASOBI', category: 'community' },
    ],
  },

  yorushika: {
    label: 'Yorushika',
    tokens: ['yorushika', 'ヨルシカ', 'n-buna', 'suis', '요루시카', '스이', '나부나'],
    feeds: [
      { type: 'google', q: after('Yorushika'), tier: 'search', source: 'google news', category: 'news' },
      { type: 'google', q: after('요루시카'), tier: 'search', source: 'google news ko', category: 'news' },
      { type: 'google', q: after('site:yorushika.com Yorushika'), tier: 'official', source: 'yorushika.com', category: 'news' },

      { type: 'google', q: after('site:yorushika.com LIVE TOUR'), tier: 'official', source: 'yorushika.com', category: 'event' },
      { type: 'google', q: after('Yorushika tour 2026'), tier: 'platform', source: 'event search', category: 'event' },
      { type: 'setlist', q: 'Yorushika', tier: 'platform', source: 'setlist.fm', category: 'event' },

      { type: 'google', q: after('site:yorushika.com 発売'), tier: 'official', source: 'yorushika.com', category: 'release' },
      { type: 'google', q: after('Yorushika album'), tier: 'search', source: 'release search', category: 'release' },
      { type: 'google', q: after('요루시카 앨범'), tier: 'search', source: 'release search ko', category: 'release' },

      { type: 'google', q: after('요루시카 굿즈'), tier: 'search', source: 'goods search ko', category: 'goods' },
      { type: 'google', q: after('ヨルシカ グッズ'), tier: 'search', source: 'goods search jp', category: 'goods' },

      { type: 'dcinside_gallery', id: 'yorushika', mode: 'info', pages: 2, tier: 'community', source: 'dcinside 요루시카 갤 정보', category: 'community' },
      { type: 'dcinside_gallery', id: 'yorushika', mode: 'recommend', pages: 2, tier: 'community', source: 'dcinside 요루시카 갤 개념글', category: 'community' },
      { type: 'rss', url: 'https://www.reddit.com/r/Yorushika/new/.rss', tier: 'community', source: 'reddit r/Yorushika', category: 'community' },
    ],
  },

  zutomayo: {
    label: 'Zutomayo',
    tokens: ['zutomayo', 'ずっと真夜中でいいのに', 'acaね', 'aca-ne', '즛토마요', '즈토마요', '아카네'],
    feeds: [
      { type: 'google', q: after('ZUTOMAYO OR ずっと真夜中でいいのに。'), tier: 'search', source: 'google news', category: 'news' },
      { type: 'google', q: after('즛토마요'), tier: 'search', source: 'google news ko', category: 'news' },
      { type: 'google', q: after('site:zutomayo.net ZUTOMAYO'), tier: 'official', source: 'zutomayo.net', category: 'news' },

      { type: 'google', q: after('즛토마요 내한'), tier: 'platform', source: 'event search ko', category: 'event' },
      { type: 'google', q: after('ZUTOMAYO concert'), tier: 'platform', source: 'event search', category: 'event' },
      { type: 'google', q: after('site:zutomayo.net live'), tier: 'official', source: 'zutomayo.net', category: 'event' },
      { type: 'setlist', q: 'ZUTOMAYO', tier: 'platform', source: 'setlist.fm', category: 'event' },

      { type: 'google', q: after('site:zutomayo.net release'), tier: 'official', source: 'zutomayo.net', category: 'release' },
      { type: 'google', q: after('ZUTOMAYO album'), tier: 'search', source: 'release search', category: 'release' },

      { type: 'google', q: after('ZUTOMAYO goods'), tier: 'search', source: 'goods search', category: 'goods' },
      { type: 'google', q: after('즛토마요 굿즈'), tier: 'search', source: 'goods search ko', category: 'goods' },

      { type: 'dcinside_gallery', id: 'zuttomayo', mode: 'info', pages: 2, tier: 'community', source: 'dcinside 즛토마요 갤 정보', category: 'community' },
      { type: 'dcinside_gallery', id: 'zuttomayo', mode: 'recommend', pages: 2, tier: 'community', source: 'dcinside 즛토마요 갤 개념글', category: 'community' },
      { type: 'rss', url: 'https://www.reddit.com/r/ZutoMayo/new/.rss', tier: 'community', source: 'reddit r/ZutoMayo', category: 'community' },
    ],
  },

  weg: {
    label: 'WEG',
    tokens: ["world's end girlfriend", 'world’s end girlfriend', 'worlds end girlfriend', 'weg', '월즈 엔드 걸프렌드', '월드 엔드 걸프렌드', '월엔걸'],
    feeds: [
      { type: 'google', q: after("\"World's End Girlfriend\""), tier: 'search', source: 'google news', category: 'news' },
      { type: 'google', q: after('월즈 엔드 걸프렌드'), tier: 'search', source: 'google news ko', category: 'news' },
      { type: 'google', q: after("\"World's End Girlfriend\" concert"), tier: 'platform', source: 'event search', category: 'event' },
      { type: 'setlist', q: "World's End Girlfriend", tier: 'platform', source: 'setlist.fm', category: 'event' },
      { type: 'google', q: after("\"World's End Girlfriend\" release"), tier: 'search', source: 'release search', category: 'release' },
      { type: 'google', q: after("\"World's End Girlfriend\" vinyl"), tier: 'search', source: 'release search', category: 'release' },
      { type: 'google', q: after("\"World's End Girlfriend\" merch"), tier: 'search', source: 'goods search', category: 'goods' },
      { type: 'rss', url: 'https://www.reddit.com/search.rss?q=%22world%27s%20end%20girlfriend%22&sort=new&t=year', tier: 'community', source: 'reddit search: worlds end girlfriend', category: 'community' },
      { type: 'dcinside_gallery', id: 'postrockgallery', mode: 'info', pages: 2, tier: 'community', source: 'dcinside 포스트락 갤 정보', category: 'community' },
      { type: 'dcinside_gallery', id: 'postrockgallery', mode: 'recommend', pages: 2, tier: 'community', source: 'dcinside 포스트락 갤 개념글', category: 'community' },
    ],
  },
};

function after(query) {
  return `${query} after:${MIN_DATE}`;
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'NocturneNewsBot/3.0',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
          'Accept-Language': 'ko,en,ja',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const nextUrl = /^https?:\/\//i.test(res.headers.location)
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          return fetch(nextUrl).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      }
    );

    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
  });
}

function decodeHtml(s = '') {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function stripTags(s = '') {
  return decodeHtml(String(s)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeDate(input) {
  if (!input) return '';
  const str = String(input).trim();

  // e.g. Jan 24 2026 (setlist.fm) - timezone shift 없이 문자열 기준으로 변환
  const enMonth = str.match(/^([A-Za-z]{3,9})\s+(\d{1,2})\s+(20\d{2})$/);
  if (enMonth) {
    const monthMap = {
      jan: '01', january: '01',
      feb: '02', february: '02',
      mar: '03', march: '03',
      apr: '04', april: '04',
      may: '05',
      jun: '06', june: '06',
      jul: '07', july: '07',
      aug: '08', august: '08',
      sep: '09', sept: '09', september: '09',
      oct: '10', october: '10',
      nov: '11', november: '11',
      dec: '12', december: '12',
    };
    const mm = monthMap[(enMonth[1] || '').toLowerCase()];
    if (mm) return `${enMonth[3]}-${mm}-${enMonth[2].padStart(2, '0')}`;
  }

  const m = str.match(/(20\d{2})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m) {
    const y = m[1];
    const mm = m[2].padStart(2, '0');
    const dd = m[3].padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  const iso = new Date(str);
  if (!Number.isNaN(iso.getTime())) {
    return iso.toISOString().slice(0, 10);
  }

  return '';
}

function isAfterMinDate(dateStr) {
  return !!dateStr && dateStr >= MIN_DATE;
}

function guessTypeFromTitle(title = '', source = '') {
  const t = `${title} ${source}`.toLowerCase();

  const eventKeywords = [
    'tour', 'live', 'concert', 'festival', 'ticket', 'show', 'hall tour', 'arena', 'world tour', 'asia tour',
    'schedule', '공연', '투어', '라이브', '예매', '티켓', '페스티벌', '내한', '방한', 'フェス', '公演', 'ライブ', 'スケジュール',
  ];

  const releaseKeywords = [
    'release', 'single', 'album', 'ep', 'mv', 'music video', 'digital', 'ost', 'vinyl', 'cd', 'blu-ray',
    '配信', '発売', '新曲', '신곡', '발매', '앨범',
  ];

  const goodsKeywords = [
    'goods', 'merch', 'merchandise', 'store', 'shop', 'preorder', 'pre-order', 'official store',
    'collab', 'collaboration', '콜라보', 'asics', 'coach',
    'グッズ', '굿즈', 'md',
  ];

  if (eventKeywords.some((k) => t.includes(k))) return 'event';
  if (releaseKeywords.some((k) => t.includes(k))) return 'release';
  if (goodsKeywords.some((k) => t.includes(k))) return 'goods';
  return 'news';
}

function parseFeed(xml, source, tier) {
  const items = [];

  // RSS
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = stripTags((block.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '');
    const link = decodeHtml((block.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '').trim();
    const pubDate = decodeHtml((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || '');
    const dcDate = decodeHtml((block.match(/<dc:date>([\s\S]*?)<\/dc:date>/i) || [])[1] || '');

    if (!title || !link) continue;

    items.push({
      date: normalizeDate(pubDate || dcDate),
      title,
      url: link,
      source,
      trust: TRUST[tier] ?? 0.5,
      tier,
      type: guessTypeFromTitle(title, source),
    });
  }

  // Atom
  if (items.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    while ((m = entryRegex.exec(xml)) !== null) {
      const block = m[1];
      const title = stripTags((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');

      const alternateLink = (block.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i) || [])[1] || '';
      const firstLink = (block.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
      const link = decodeHtml(alternateLink || firstLink);

      const updated = decodeHtml((block.match(/<updated>([\s\S]*?)<\/updated>/i) || [])[1] || '');
      const published = decodeHtml((block.match(/<published>([\s\S]*?)<\/published>/i) || [])[1] || '');

      if (!title || !link) continue;

      items.push({
        date: normalizeDate(updated || published),
        title,
        url: link,
        source,
        trust: TRUST[tier] ?? 0.5,
        tier,
        type: guessTypeFromTitle(title, source),
      });
    }
  }

  return items;
}

function googleNewsUrl(query) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
}

function setlistSearchUrl(query) {
  return `https://www.setlist.fm/search?query=${encodeURIComponent(query)}`;
}

function parseSetlistSearch(html, source, tier) {
  const items = [];

  const itemRegex = /<div class="col-xs-12 setlistPreview">[\s\S]*?<span class="month">\s*([^<]+)\s*<\/span>[\s\S]*?<span class="day">\s*([^<]+)\s*<\/span>[\s\S]*?<span class="year">\s*([^<]+)\s*<\/span>[\s\S]*?<h2>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span>\s*Artist:\s*<strong>[\s\S]*?<span>\s*([\s\S]*?)\s*<\/span>/gi;

  let m;
  while ((m = itemRegex.exec(html)) !== null) {
    const month = stripTags(m[1] || '');
    const day = stripTags(m[2] || '');
    const year = stripTags(m[3] || '');
    const href = decodeHtml((m[4] || '').trim());
    const title = stripTags(m[5] || '');
    const artist = stripTags(m[6] || '');

    let url = href;
    if (url && !/^https?:\/\//i.test(url)) url = `https://www.setlist.fm/${url.replace(/^\//, '')}`;

    const date = normalizeDate(`${month} ${day} ${year}`);
    if (!date || !title || !url) continue;

    items.push({
      date,
      title,
      url,
      source: `${source} · ${artist}`,
      trust: TRUST[tier] ?? 0.75,
      tier,
      type: 'event',
      categoryHint: 'event',
    });
  }

  return items;
}

function dcinsideGalleryUrl(galleryId, page = 1, mode = 'all') {
  const base = `https://gall.dcinside.com/mgallery/board/lists?id=${encodeURIComponent(galleryId)}&page=${page}`;
  if (mode === 'recommend') return `${base}&exception_mode=recommend`;
  return base;
}

function isInfoLikeDcinsideTitle(title = '') {
  const t = String(title).toLowerCase();
  const infoKeywords = [
    '정보', '공지', '정리', '가이드', '후기', '리뷰', '셋리스트', '번역', '요약', '모음',
    '자료', '필독', '뉴비', 'faq', 'how to', '이용방법', '가는 법', '티켓팅', '예매 링크',
  ];
  return infoKeywords.some((k) => t.includes(k));
}

function parseDcinsideGallery(html, source, tier, galleryId, mode = 'all') {
  const items = [];
  const rowRegex = /<tr[^>]*class="[^"]*us-post[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;

  let m;
  while ((m = rowRegex.exec(html)) !== null) {
    const block = m[1];

    const href = (
      block.match(/<td[^>]*class="gall_tit[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*\/board\/view\/[^\"]+)"/i)
      || block.match(/<a[^>]*href="([^"]*\/board\/view\/[^\"]+)"/i)
      || []
    )[1] || '';

    const titleHtml = (
      block.match(/<td[^>]*class="gall_tit[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<a[^>]*>([\s\S]*?)<\/a>/i)
      || []
    )[1] || '';

    const dateTitle = (block.match(/<td[^>]*class="gall_date"[^>]*title="([^"]+)"/i) || [])[1] || '';
    const dateHtml = (block.match(/<td[^>]*class="gall_date"[^>]*>([\s\S]*?)<\/td>/i) || [])[1] || '';

    const title = stripTags(titleHtml);
    const date = normalizeDate(stripTags(dateTitle || dateHtml));
    let url = decodeHtml(href.trim());
    if (url.startsWith('/')) url = `https://gall.dcinside.com${url}`;

    if (!url || !title || !date) continue;
    if (mode === 'info' && !isInfoLikeDcinsideTitle(title)) continue;

    const modeLabel = mode === 'recommend' ? '개념글' : mode === 'info' ? '정보' : '일반';

    items.push({
      date,
      title,
      url,
      source: `${source} · ${modeLabel}`,
      trust: TRUST[tier] ?? 0.4,
      tier,
      type: guessTypeFromTitle(title, `${source} ${galleryId}`),
      categoryHint: 'community',
      galleryId,
      mode,
    });
  }

  return items;
}

function isArtistRelevant(item, artistKey) {
  const artist = ARTISTS[artistKey];
  const text = `${item.title || ''} ${item.source || ''}`.toLowerCase();

  const negativeKeywords = [
    'cover', 'reaction', 'lyrics', 'lyric video', 'karaoke', 'fan cam', 'fancam',
    'mashup', 'nightcore', 'sped up', 'tutorial', 'analysis', 'review', 'top 10',
    '커버', '리액션', '팬캠', '해석',
  ];

  if (negativeKeywords.some((k) => text.includes(k))) return false;

  const hasArtistToken = (artist.tokens || []).some((k) => text.includes(String(k).toLowerCase()));
  if (!hasArtistToken) return false;

  // 커뮤니티는 아티스트 연관성만 충족하면 허용
  if (item.tier === 'community') return true;

  // 탭 분류가 이미 명확하면 허용
  if (['event', 'release', 'goods'].includes(item.type)) return true;

  // 뉴스 타입은 활동 키워드 추가 확인
  const positiveKeywords = [
    'official', 'announcement', 'news', 'tour', 'live', 'concert', 'festival',
    'release', 'single', 'album', 'ep', 'mv', 'music video', 'ticket', 'schedule',
    '공식', '공지', '공연', '투어', '발매', '신곡', '앨범',
    '公式', 'お知らせ', '公演', 'ツアー', '発売', '新曲',
  ];

  if (item.tier === 'search' || item.tier === 'media' || item.tier === 'platform') {
    // 검색/매체/플랫폼은 아티스트 토큰이 이미 확인됐으면 기본 허용,
    // 다만 활동 키워드가 있으면 우선적으로 신뢰.
    return positiveKeywords.some((k) => text.includes(k)) || item.type !== 'news' || item.categoryHint === 'news';
  }

  return true;
}

function dedupe(items) {
  const map = new Map();
  for (const item of items) {
    const key = `${(item.title || '').toLowerCase().replace(/[^\w가-힣ぁ-んァ-ン一-龥]+/g, ' ').trim().slice(0, 120)}|${item.date}|${item.type}`;
    const prev = map.get(key);
    if (!prev || (item.trust ?? 0) > (prev.trust ?? 0)) {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

function uniqueByUrl(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.url || `${item.title}|${item.date}|${item.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortNews(items) {
  return [...items].sort((a, b) => {
    const dateDiff = String(b.date || '').localeCompare(String(a.date || ''));
    if (dateDiff !== 0) return dateDiff;
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

function normalizeUrl(url) {
  return /^https?:\/\//i.test(url || '') ? url : '#';
}

function badge(type = 'news') {
  const t = (type || 'news').toLowerCase();
  if (t === 'event') return { cls: 'badge-event', text: '공연' };
  if (t === 'release') return { cls: 'badge-release', text: '발매' };
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

function originKo(tier) {
  return tier === 'official' ? '본인 생산' : '아티스트 관련';
}

function renderCards(items) {
  return (items || []).slice(0, TAB_LIMIT).map((item) => {
    const b = badge(item.type);
    return `      <article class="card news-card">\n        <div class="card-top"><span class="badge ${b.cls}">${b.text}</span><span class="card-date">${esc(item.date || '')}</span></div>\n        <h3>${esc(item.title || '')}</h3>\n        <p style="font-size:12px;color:var(--text3);margin:6px 0 10px">${esc(originKo(item.tier))} · ${esc(tierKo(item.tier))} · ${esc(item.source || '')}</p>\n        <a href="${esc(normalizeUrl(item.url))}" target="_blank" class="card-link">출처 →</a>\n      </article>`;
  }).join('\n\n');
}

function renderEmpty(text) {
  return `      <article class="card news-card">\n        <h3>${esc(text)}</h3>\n        <p style="font-size:12px;color:var(--text3);margin-top:8px">${MIN_DATE} 이후 기준으로 수집 중이며 다음 주기에 자동 갱신됩니다.</p>\n      </article>`;
}

function replaceTabBlock(html, section, tab, cardsHtml) {
  const tabs = ['news', 'events', 'releases', 'goods', 'community'];
  const startToken = `<div class="tab-content" data-section="${section}" data-tab="${tab}"`;
  const sIdx = html.indexOf(startToken);
  if (sIdx === -1) return html;

  const startClose = html.indexOf('>', sIdx) + 1;
  let eIdx = -1;

  const currentIdx = tabs.indexOf(tab);
  for (let i = currentIdx + 1; i < tabs.length; i++) {
    const nextToken = `<div class="tab-content" data-section="${section}" data-tab="${tabs[i]}"`;
    const nextIdx = html.indexOf(nextToken, startClose);
    if (nextIdx !== -1) {
      eIdx = nextIdx;
      break;
    }
  }

  if (eIdx === -1) {
    const sectionEnd = html.indexOf('</section>', startClose);
    eIdx = sectionEnd === -1 ? html.length : sectionEnd;
  }

  return html.slice(0, startClose) + `\n${cardsHtml}\n\n  </div>\n\n  ` + html.slice(eIdx);
}

async function loadFeed(feed) {
  try {
    if (feed.type === 'setlist') {
      const url = setlistSearchUrl(feed.q);
      const html = await fetch(url);
      const parsed = parseSetlistSearch(html, feed.source, feed.tier);
      return dedupe(parsed).slice(0, FEED_ITEM_LIMIT).map((item) => ({
        ...item,
        type: feed.category === 'community' ? item.type : (feed.category || item.type),
        categoryHint: feed.category || item.categoryHint || null,
      }));
    }

    if (feed.type === 'dcinside_gallery') {
      const pages = feed.pages || 2;
      const collected = [];

      for (let page = 1; page <= pages; page++) {
        const url = dcinsideGalleryUrl(feed.id, page, feed.mode || 'all');
        const html = await fetch(url);
        const parsed = parseDcinsideGallery(html, feed.source, feed.tier, feed.id, feed.mode || 'all');
        collected.push(...parsed);
        if (parsed.length === 0) break;
      }

      return dedupe(collected).slice(0, FEED_ITEM_LIMIT).map((item) => ({
        ...item,
        type: feed.category === 'community' ? item.type : (feed.category || item.type),
        categoryHint: feed.category || null,
      }));
    }

    const url = feed.type === 'google' ? googleNewsUrl(feed.q) : feed.url;
    const xml = await fetch(url);
    const parsed = parseFeed(xml, feed.source, feed.tier);

    return parsed.slice(0, FEED_ITEM_LIMIT).map((item) => ({
      ...item,
      type: feed.category === 'community' ? item.type : (feed.category || item.type),
      categoryHint: feed.category || null,
    }));
  } catch (e) {
    console.error(`[WARN] feed failed (${feed.source}): ${e.message}`);
    return [];
  }
}

async function main() {
  const data = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : {};
  let html = fs.readFileSync(INDEX_FILE, 'utf8');

  for (const [artistKey, artistMeta] of Object.entries(ARTISTS)) {
    const scrapedRaw = ((data[artistKey] && data[artistKey].scraped_news) || []).map((x) => {
      const cleanTitle = stripTags(x.title || '');
      const cleanSource = x.source || `${artistMeta.label} official scrape`;
      return {
        ...x,
        title: cleanTitle,
        date: normalizeDate(x.date),
        trust: 1.0,
        tier: 'official',
        source: cleanSource,
        type: x.type || guessTypeFromTitle(cleanTitle, cleanSource),
      };
    });

    // WEG는 레이블 전체가 섞여서 아티스트 토큰 매칭되는 항목만 유지
    const scraped = scrapedRaw.filter((item) => isArtistRelevant(item, artistKey));

    const feedItems = [];
    for (const feed of artistMeta.feeds) {
      const items = await loadFeed(feed);
      feedItems.push(...items);
    }

    const merged = sortNews(
      dedupe([...scraped, ...feedItems])
        .map((item) => ({ ...item, date: normalizeDate(item.date) }))
        .filter((item) => isAfterMinDate(item.date))
        .filter((item) => isArtistRelevant(item, artistKey))
    ).slice(0, 80);

    const nonCommunity = merged.filter((x) => x.tier !== 'community');

    const newsItems = nonCommunity.filter((x) => x.type === 'news').slice(0, TAB_LIMIT);

    const eventCandidates = nonCommunity.filter((x) => x.type === 'event');
    const setlistEvents = eventCandidates.filter((x) => (x.source || '').toLowerCase().includes('setlist.fm'));
    const officialEvents = eventCandidates.filter((x) => x.tier === 'official' && !(x.source || '').toLowerCase().includes('setlist.fm'));
    const otherEvents = eventCandidates.filter((x) => x.tier !== 'official' && !(x.source || '').toLowerCase().includes('setlist.fm'));
    const eventItems = uniqueByUrl([...setlistEvents, ...officialEvents, ...otherEvents]).slice(0, TAB_LIMIT);

    const releaseItems = merged.filter((x) => x.type === 'release').slice(0, TAB_LIMIT);
    const goodsItems = merged.filter((x) => x.type === 'goods').slice(0, TAB_LIMIT);
    const communityItems = merged.filter((x) => x.tier === 'community').slice(0, TAB_LIMIT);

    html = replaceTabBlock(
      html,
      artistKey,
      'news',
      newsItems.length ? renderCards(newsItems) : renderEmpty('최신 뉴스가 아직 없습니다.')
    );
    html = replaceTabBlock(
      html,
      artistKey,
      'events',
      eventItems.length ? renderCards(eventItems) : renderEmpty('공연 일정이 아직 없습니다.')
    );
    html = replaceTabBlock(
      html,
      artistKey,
      'releases',
      releaseItems.length ? renderCards(releaseItems) : renderEmpty('발매 소식이 아직 없습니다.')
    );
    html = replaceTabBlock(
      html,
      artistKey,
      'goods',
      goodsItems.length ? renderCards(goodsItems) : renderEmpty('굿즈 소식이 아직 없습니다.')
    );
    html = replaceTabBlock(
      html,
      artistKey,
      'community',
      communityItems.length ? renderCards(communityItems) : renderEmpty('팬 커뮤니티 신규 글이 아직 없습니다.')
    );

    if (!data[artistKey]) data[artistKey] = {};
    data[artistKey].merged_news = merged;
    data[artistKey].categorized = {
      news: newsItems,
      events: eventItems,
      releases: releaseItems,
      goods: goodsItems,
      community: communityItems,
    };
    data[artistKey].last_merged = new Date().toISOString();
  }

  fs.writeFileSync(INDEX_FILE, html, 'utf8');
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ index.html 업데이트 완료 (${MIN_DATE} 이후 / 5개 분류 / 본인생산+아티스트관련)`);
}

main().catch((e) => {
  console.error('❌ update-index-news 실패:', e.message);
  process.exit(1);
});
