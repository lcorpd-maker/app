// Налаштування програми. Заповнюється один раз.
window.APP_CONFIG = {
  // Адреса сервера: Apps Script → Розгорнути → Вебзастосунок → адреса, що закінчується на /exec
  API_URL: 'https://script.google.com/macros/s/AKfycbysCKaTyTkrgx7nOF3W_0fWC52Y6eS0itPusMGjKfYxEBJGqGoK_GV3_7Ab1ITsYc4u/exec',
  // Google-вхід для офісу (необов'язково на старті): Client ID з Google Cloud. Поки порожньо — вхід лише за кодом.
  GOOGLE_CLIENT_ID: '',
  // Кнопка «Логіст» у водія. ТЕСТОВИЙ номер від власниці (21.11) — замінити на робочий номер логіста
  LOGIST_TEL: '+380970864081'
};

// Тестовий сервер (ADR-086). Відкрити: app.lcorp.com.ua/?stage=test · повернутись: ?stage=off.
// У тестовому режимі все, що зберігається на пристрої (вхід, черга, кеш), — окремо від робочого: робочі записи туди не потраплять.
window.APP_CONFIG.STAGING_API_URL = 'https://script.google.com/macros/s/AKfycbwvPx-nAQauM0tixjsq1gydhS1ybWQtXsQwhHd3uJ-VZ0sejUFb7B6Sunm9CCeWv4X5/exec';
(function () {
  try {
    var q = location.search.match(/[?&]stage=(test|off)\b/);
    if (q) {
      if (q[1] === 'test' && window.APP_CONFIG.STAGING_API_URL) localStorage.setItem('STAGE', 'test'); else localStorage.removeItem('STAGE');
      location.replace(location.pathname); return;
    }
    if (localStorage.getItem('STAGE') !== 'test' || !window.APP_CONFIG.STAGING_API_URL) return;
    window.APP_CONFIG.API_URL = window.APP_CONFIG.STAGING_API_URL; window.APP_CONFIG.STAGE = 'test';
    var keep = { STAGE: 1, theme: 1, fontScale: 1 }, P = 'stg_', S = Storage.prototype, g = S.getItem, s = S.setItem, r = S.removeItem;
    S.getItem = function (k) { return g.call(this, keep[k] ? k : P + k); };
    S.setItem = function (k, v) { return s.call(this, keep[k] ? k : P + k, v); };
    S.removeItem = function (k) { return r.call(this, keep[k] ? k : P + k); };
    var o = indexedDB.open.bind(indexedDB); indexedDB.open = function (n, v) { return o(n + '-test', v); };
    document.addEventListener('DOMContentLoaded', function () {
      var b = document.createElement('div'); b.className = 'stage-bar'; b.setAttribute('role', 'status');
      b.innerHTML = 'ТЕСТОВИЙ СЕРВЕР — дані не справжні · <a href="./?stage=off">повернутись до робочого</a>';
      document.body.insertBefore(b, document.body.firstChild);
    });
  } catch (e) {}
})();
