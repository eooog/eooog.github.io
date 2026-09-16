/*
  Language toggle.

  - Global toggle (#lang-toggle button in the sidebar): flips <html lang-mode>
    between "en"/"ko", persisted in localStorage, applies site-wide (post
    title/date/content, and hides list entries that don't support the active
    language -- see assets/css/lang-toggle.css).
  - Per-post switch (.i18n-post-switch buttons rendered inside a post's
    article): a temporary, non-persisted override of the language shown for
    that one article, scoped via article[data-post-lang].
*/
(function () {
  'use strict';

  function getStoredMode() {
    try {
      var v = localStorage.getItem('lang-mode');
      return v === 'en' || v === 'ko' ? v : null;
    } catch (e) {
      return null;
    }
  }

  function setGlobalMode(mode) {
    document.documentElement.setAttribute('lang-mode', mode);
    try {
      localStorage.setItem('lang-mode', mode);
    } catch (e) {}
    document.dispatchEvent(new CustomEvent('langchange', { detail: { mode: mode } }));
  }

  function initGlobalToggle() {
    var btn = document.getElementById('lang-toggle');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('lang-mode') === 'ko' ? 'ko' : 'en';
      setGlobalMode(current === 'en' ? 'ko' : 'en');
    });
  }

  function updateRssLink() {
    var link = document.getElementById('rss-link');
    if (!link) return;
    var mode = document.documentElement.getAttribute('lang-mode') === 'ko' ? 'ko' : 'en';
    var feed = mode === 'ko' ? link.getAttribute('data-feed-ko') : link.getAttribute('data-feed-en');
    if (feed) link.setAttribute('href', feed);
  }

  function supportedLangs(article) {
    var raw = article.getAttribute('data-langs') || '';
    return raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function pickInitialLang(article) {
    var langs = supportedLangs(article);
    var global = document.documentElement.getAttribute('lang-mode') === 'ko' ? 'ko' : 'en';
    if (langs.indexOf(global) !== -1) return global;
    return langs[0] || global;
  }

  function setArticleLang(article, lang) {
    article.setAttribute('data-post-lang', lang);
    var switcher = article.querySelector('.i18n-post-switch');
    if (!switcher) return;
    switcher.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-set-lang') === lang);
    });
  }

  function initPostArticles() {
    var articles = document.querySelectorAll('article[data-i18n-post]');
    articles.forEach(function (article) {
      setArticleLang(article, pickInitialLang(article));

      var switcher = article.querySelector('.i18n-post-switch');
      if (switcher) {
        switcher.querySelectorAll('button[data-set-lang]').forEach(function (b) {
          b.addEventListener('click', function () {
            article.setAttribute('data-manual-lang', 'true');
            setArticleLang(article, b.getAttribute('data-set-lang'));
          });
        });
      }
    });

    document.addEventListener('langchange', function () {
      articles.forEach(function (article) {
        if (article.getAttribute('data-manual-lang') === 'true') return;
        setArticleLang(article, pickInitialLang(article));
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    // keep <html lang-mode> in sync with any stored preference (head.html
    // already set it before paint; this just covers browsers where that
    // inline script was skipped, e.g. some prefetch scenarios).
    var stored = getStoredMode();
    if (stored && document.documentElement.getAttribute('lang-mode') !== stored) {
      document.documentElement.setAttribute('lang-mode', stored);
    }

    initGlobalToggle();
    initPostArticles();
    updateRssLink();
    document.addEventListener('langchange', updateRssLink);
  });
})();
