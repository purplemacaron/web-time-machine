'use strict';

const STYLE_ID = 'web-time-machine-retro-skin';
const CSS = `
::-webkit-scrollbar { width: 16px; height: 16px; }
::-webkit-scrollbar-track { background: #c0c0c0; }
::-webkit-scrollbar-thumb { background: #c0c0c0; border: 2px outset #dfdfdf; }
::-webkit-scrollbar-corner { background: #c0c0c0; }
button, input[type="button"], input[type="submit"], input[type="reset"], select {
  background: #c0c0c0 !important;
  border: 2px outset #dfdfdf !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  text-shadow: none !important;
  color: #000 !important;
  font-family: Tahoma, "MS Sans Serif", Gulim, sans-serif !important;
  font-size: 11px !important;
}
input[type="text"], input[type="password"], input[type="search"], input[type="email"], input[type="url"], input[type="number"], textarea {
  background: #fff !important;
  border: 2px inset #dfdfdf !important;
  border-radius: 0 !important;
  color: #000 !important;
}
body { font-family: Tahoma, "MS Sans Serif", Gulim, sans-serif; }
::selection { background: #000080; color: #fff; }
`;

function apply(on) {
  let el = document.getElementById(STYLE_ID);
  if (on && !el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    (document.head || document.documentElement).appendChild(el);
  } else if (!on && el) {
    el.remove();
  }
}

chrome.storage.local.get({ retroSkin: true }, (v) => apply(v.retroSkin));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.retroSkin) apply(changes.retroSkin.newValue);
});