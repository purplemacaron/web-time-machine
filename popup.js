'use strict';

const $ = (id) => document.getElementById(id);
const yearInput = $('year');
yearInput.max = new Date().getFullYear();
let tab = null;

function setYear(y) {
  yearInput.value = y;
  $('yearLabel').textContent = y;
}
yearInput.addEventListener('input', () => setYear(yearInput.value));
document.querySelectorAll('.presets .btn').forEach((b) =>
  b.addEventListener('click', () => setYear(b.dataset.year)));

chrome.storage.local.get({ retroSkin: true }, (v) => { $('skin').checked = v.retroSkin; });

chrome.tabs.query({ active: true, currentWindow: true }, ([t]) => {
  tab = t;
  const ok = !!(t && t.url && /^https?:/i.test(t.url));
  $('host').textContent = ok ? new URL(t.url).hostname : '사용 불가';
  $('go').disabled = !ok;
  if (!ok) $('msg').textContent = 'http/https 페이지에서만 사용할 수 있습니다.';
});

$('go').addEventListener('click', () => {
  if (!tab) return;
  chrome.storage.local.set({ retroSkin: $('skin').checked });
  const url = chrome.runtime.getURL('viewer.html')
    + '?url=' + encodeURIComponent(tab.url)
    + '&year=' + yearInput.value;
  chrome.tabs.update(tab.id, { url });
  window.close();
});