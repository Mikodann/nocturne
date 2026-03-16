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
    tokens: ['yoasobi', 'ikura', 'ayase'],
    feeds: [
      { type: 'google', q: after('YOASOBI'), tier: 'search', source: 'google news', category: 'news' },
      { type: 'google', q: after('YOASOBI (live OR tour OR concert OR ticket)'), tier: 'platform', source: 'event search', category: 'event' },
      { type: 'google', q: after('YOASOBI (release OR single OR album OR new song OR EP OR MV)'), tier: 'search', source: 'release search', category: 'release' },
      { type: 'google', q: after('YOASOBI (goods OR merch OR official store OR popup)'), tier: 'search', source: 'goods search', category: 'goods' },
      { type: 'google', q: after('site:yoasobi-music.jp YOASOBI'), tier: 'official', source: 'yoasobi-music.jp', category: 'news' },
      { type: 'rss', url: 'https://www.reddit.com/r/YOASOBI/new/.rss', tier: 'community', source: 'reddit r/YOASOBI', category: 'community' },
    ],
  },

  yorushika: {
    label: 'Yorushika',
    tokens: ['yorushika', 'ヨルシカ', 'n-buna', 'suis'],
    feeds: [
      { type: 'google', q: after('Yorushika'), tier: 'search', source: 'google news', category: 'news' },
      { type: 'google', q: after('Yorushika (live OR tour OR concert OR ticket)'), tier: 'platform', source: 'event search', category: 'event' },
      { type: 'google', q: after('Yorushika (release OR single OR album OR new song OR EP OR MV OR 発売)'), tier: 'search', source: 'release search', category: 'release' },
      { type: 'google', q: after('Yorushika (goods OR merch OR official store OR グッズ)'), tier: 'search', source: 'goods search', category: 'goods' },
      { type: 'google', q: after('site:yorushika.com Yorushika'), tier: 'official', source: 'yorushika.com', category: 'news' },
      { type: 'rss', url: 'https://www.reddit.com/r/Yorushika/new/.rss', tier: 'community', source: 'reddit r/Yorushika', category: 'community' },
    ],
  },

  zutomayo: {
    label: 'Zutomayo',
    tokens: ['zutomayo', 'ずっと真夜中でいいのに', 'acaね', 'aca-ne'],
    feeds: [
      { type: 'google', q: after('ZUTOMAYO OR ずっと真夜中でいいのに。'), tier: 'search', source: 'google news', category: 'news' },
      { type: 'google', q: after('ZUTOMAYO (live OR tour OR concert OR ticket)'), tier: 'platform', source: 'event search', category: 'event' },
      { type: 'google', q: after('ZUTOMAYO (release OR single OR album OR new song OR EP OR MV OR 発売)'), tier: 'search', source: 'release search', category: 'release' },
      { type: 'google', q: after('ZUTOMAYO (goods OR merch OR グッズ OR store)'), tier: 'search', source: 'goods search', category: 'goods' },
      { type: 'google', q: after('site:zutomayo.net ZUTOMAYO'), tier: 'official', source: 'zutomayo.net', category: 'news' },
      { type: 'rss', url: 'https://www.reddit.com/r/ZutoMayo/new/.rss', tier: 'community', source: 'reddit r/ZutoMayo', category: 'community' },
    ],
  },

  weg: {
    label: 'WEG',
    tokens: ["world's end girlfriend", 'worlds end girlfriend', 'weg'],
    feeds: [
      { type: 'google', q: after("\"World's End Girlfriend\""), tier: 'search', source: 'google news', category: 'news' },
      { type: 'google', q: after("\"World's End Girlfriend\" (live OR tour OR concert OR ticket)"), tier: 'platform', source: 'event search', category: 'event' },
      { type: 'google', q: after("\"World's End Girlfriend\" (release OR single OR album OR EP OR vinyl OR CD)"), tier: 'search', source: 'release search', category: 'release' },
      { type: 'google', q: after("\"World's End Girlfriend\" (goods OR merch OR store)"), tier: 'search', source: 'goods search', category: 'goods' },
      { type: 'google', q: after("\"World's End Girlfriend\" (site:virginbabylonrecords.bandcamp.com OR site:virginbabylonrecords.com)"), tier: 'official', source: "World's End Girlfriend official", category: 'news' },
      { type: 'rss', url: 'https://www.reddit.com/search.rss?q=%22world%27s%20end%20girlfriend%22&sort=new&t=year', tier: 'community', source: 'reddit search: worlds end girlfriend', category: 'community' },
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
          return fetch(res.headers.location).then(resolve).catch(reject);
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

  const iso = new Date(str);
  if (!Number.isNaN(iso.getTime())) {
    return iso.toISOString().slice(0, 10);
  }

  const m = str.match(/(20\d{2})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m) {
    const y = m[1];
    const mm = m[2].padStart(2, '0');
    const dd = m[3].padStart(2, '0');
    return `${y}-${mm}-${dd}`;
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
    'schedule', '공연', '투어', '라이브', '예매', '티켓', '페스티벌', 'フェス', '公演', 'ライブ', 'スケジュール',
  ];

  const releaseKeywords = [
    'release', 'single', 'album', 'ep', 'mv', 'music video', 'digital', 'ost', 'vinyl', 'cd', 'blu-ray',
    '配信', '発売', '新曲', '신곡', '발매', '앨범',
  ];

  const goodsKeywords = [
    'goods', 'merch', 'merchandise', 'store', 'shop', 'preorder', 'pre-order', 'official store',
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

  return html.slice(0, startClose) + `\n${cardsHtml}\n\n  ` + html.slice(eIdx);
}

async function loadFeed(feed) {
  try {
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
    const useScraped = artistKey !== 'weg'; // WEG 스크랩은 레이블 전체가 섞여 정확도가 떨어져 제외
    const scraped = (useScraped ? ((data[artistKey] && data[artistKey].scraped_news) || []) : []).map((x) => ({
      ...x,
      date: normalizeDate(x.date),
      trust: 1.0,
      tier: 'official',
      source: x.source || `${artistMeta.label} official scrape`,
      type: x.type || guessTypeFromTitle(x.title || '', x.source || ''),
    }));

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
    const eventItems = nonCommunity.filter((x) => x.type === 'event').slice(0, TAB_LIMIT);
    const releaseItems = nonCommunity.filter((x) => x.type === 'release').slice(0, TAB_LIMIT);
    const goodsItems = nonCommunity.filter((x) => x.type === 'goods').slice(0, TAB_LIMIT);
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
