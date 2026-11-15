'use strict';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ retroSkin: true }, (v) => chrome.storage.local.set(v));
});