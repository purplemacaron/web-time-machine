'use strict';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const MIN_YEAR = 1996;
const MAX_YEAR = new Date().getFullYear();
const isExt = typeof chrome !== 'undefined' && !!(chrome.runtime && chrome.runtime.id);

const originalUrl = params.get('url') || '';
let year = clamp(parseInt(params.get('year'), 10) || 2001);
let loadToken = 0;
let lastSrc = '';

function clamp(y) { return Math.min(MAX_YEAR, Math.max(MIN_YEAR, y)); }
function hostOf(u) { try { return new URL(u).hostname; } catch { return u; } }

async function cdx(url, closest, from, to) {
  let api = 'https://web.archive.org/cdx/search/cdx?output=json&filter=statuscode:200&filter=mimetype:text/html&sort=closest&limit=5'
    + '&url=' + encodeURIComponent(url) + '&closest=' + closest;
  if (from) api += '&from=' + from + '&to=' + to;
  const res = await fetch(api);
  if (!res.ok) throw new Error('아카이브 서버 오류 (' + res.status + ')');
  const rows = await res.json();
  return rows.length > 1 ? rows.slice(1) : [];
}

function nearest(rows, target) {
  let best = null;
  let bestDiff = Infinity;
  for (const r of rows) {
    const diff = Math.abs(Number(r[1].slice(0, 8)) - target);
    if (diff < bestDiff) { bestDiff = diff; best = r; }
  }
  return best;
}

async function resolve(url, y) {
  const target = Number(y + '0701');
  let row = nearest(await cdx(url, y + '0701', y + '0101', y + '1231'), target);
  if (row) return { row, exact: true };
  try {
    const u = new URL(url);
    if (u.pathname !== '/' || u.search || u.hash) {
      row = nearest(await cdx(u.origin + '/', y + '0701', y + '0101', y + '1231'), target);
      if (row) return { row, exact: true };
    }
  } catch {}
  row = nearest(await cdx(url, y + '0701'), target);
  return row ? { row, exact: false } : null;
}

function fmtDate(ts) {
  const y = ts.slice(0, 4);
  const m = ts.slice(4, 6);
  const d = ts.slice(6, 8);
  return { title: y + '년 ' + Number(m) + '월 ' + Number(d) + '일', full: y + '-' + m + '-' + d, year: y };
}

function showOverlay(kind, err) {
  $('overlay').classList.remove('hidden');
  $('overlayRetry').hidden = kind === 'loading';
  $('overlaySpinner').style.display = kind === 'loading' ? '' : 'none';
  if (kind === 'loading') {
    $('overlayTitle').textContent = '시간 이동';
    $('overlayText').textContent = '아카이브에서 스냅샷을 찾는 중… 로딩이 느릴 수 있습니다 (최대 1분).';
  } else if (kind === 'empty') {
    $('overlayTitle').textContent = '스냅샷 없음';
    $('overlayText').textContent = year + '년 스냅샷을 찾을 수 없습니다. 다른 연도를 선택해 보세요.';
  } else {
    $('overlayTitle').textContent = '오류';
    $('overlayText').textContent = (err && err.message) || '아카이브에 연결할 수 없습니다. 잠시 후 다시 시도하세요.';
  }
}
function hideOverlay() { $('overlay').classList.add('hidden'); }

async function load() {
  const token = ++loadToken;
  $('yearInput').value = year;
  showOverlay('loading');
  try {
    const snap = await resolve(originalUrl, year);
    if (token !== loadToken) return;
    if (!snap) {
      showOverlay('empty');
      $('status').textContent = '스냅샷 없음';
      return;
    }
    const ts = snap.row[1];
    const orig = snap.row[2];
    const d = fmtDate(ts);
    $('siteHost').textContent = hostOf(originalUrl);
    $('snapBadge').textContent = d.full;
    document.title = '웹 타임머신 — ' + hostOf(originalUrl) + ' (' + d.year + ')';
    $('addr').textContent = orig;
    $('status').textContent = snap.exact
      ? '스냅샷: ' + d.title
      : '요청한 ' + year + '년 스냅샷이 없어 가장 가까운 ' + d.title + ' 스냅샷을 표시합니다';
    lastSrc = 'https://web.archive.org/web/' + ts + 'if_/' + orig;
    $('frame').src = lastSrc;
  } catch (e) {
    if (token === loadToken) showOverlay('error', e);
  }
}

$('frame').addEventListener('load', () => {
  if ($('frame').src && $('frame').src === lastSrc) hideOverlay();
});

function go(y) { year = clamp(y); load(); }
$('prevYear').addEventListener('click', () => go(year - 1));
$('nextYear').addEventListener('click', () => go(year + 1));
$('goYear').addEventListener('click', () => go(parseInt($('yearInput').value, 10) || year));
$('yearInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') go(parseInt($('yearInput').value, 10) || year);
});
$('overlayRetry').addEventListener('click', load);
$('backToPresent').addEventListener('click', () => { if (originalUrl) location.href = originalUrl; });

function renderSkin(on) {
  $('skinToggle').classList.toggle('on', on);
  $('skinToggle').setAttribute('aria-checked', String(on));
}
if (isExt) {
  chrome.storage.local.get({ retroSkin: true }, (v) => renderSkin(v.retroSkin));
  $('skinToggle').addEventListener('click', () =>
    chrome.storage.local.get({ retroSkin: true }, (v) => {
      const next = !v.retroSkin;
      chrome.storage.local.set({ retroSkin: next }, () => renderSkin(next));
    }));
  chrome.storage.onChanged.addListener((c, area) => {
    if (area === 'local' && c.retroSkin) renderSkin(c.retroSkin.newValue);
  });
} else {
  $('skinToggle').closest('.skin-ctl').hidden = true;
}

$('yearInput').max = MAX_YEAR;
if (!originalUrl || !/^https?:/i.test(originalUrl)) {
  showOverlay('error', new Error('이동할 주소가 없습니다. 확장 팝업에서 사이트를 선택하세요.'));
  $('overlayRetry').hidden = true;
  $('status').textContent = '대기';
} else {
  $('siteHost').textContent = hostOf(originalUrl);
  load();
}