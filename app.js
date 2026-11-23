/* Л-КОРП — оболонка програми (етап 2): вхід, кабінет ролі, перегляд даних, видача кодів. */
(() => {
  const CFG = window.APP_CONFIG || {};
  const $ = id => document.getElementById(id);
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
    del: k => { try { localStorage.removeItem(k); } catch (e) {} }
  };
  let me = null, sheets = [], current = null;

  /* ── Розділи кабінету за ролями. sheet — аркуш бази; soon — етап, коли з'явиться повноцінний екран. ── */
  const T = (title, hint, sheet, soon) => ({ title, hint, sheet, soon });
  const TILES = {
    'адмін': [{ title: 'Дошка машин', hint: 'де кожна машина зараз', action: 'board' }, { title: 'Калькулятор', hint: 'чи вигідна заявка', action: 'calc' }, { title: 'Витрати водіїв', hint: 'чеки, перевірка', action: 'exp' }, { title: 'Здоров\'я програми', hint: 'збої, швидкість, нічні роботи', action: 'health' }, T('Рейси', 'усі машини', 'Рейси'), T('Кругорейси', '', 'Кругорейси'), T('Заявки', 'актуальні', 'Заявки'),
      T('Рухи коштів', 'аванси, витрати', 'Рухи коштів'), T('Нарахування', 'зарплата за рейси', 'Нарахування'),
      T('Клієнти', '', 'Клієнти'), T('Авто', '', 'Авто'), T('Працівники', '', 'Працівники'),
      { title: 'Документи', hint: 'що спливає', action: 'docs' }, { title: 'Боржники', hint: 'без позначки оплати', action: 'debts' }, { title: 'До виставлення', hint: 'рахунки для BAS', action: 'inv' }, { title: 'Проблеми водіїв', hint: 'історія й відповіді', action: 'probs' }, T('Користувачі', 'хто має доступ', 'Користувачі'),
      T('Журнал змін', 'хто що змінив', 'Журнал змін'), { title: 'Видати код', hint: 'вхід для водія', action: 'codes' }, { title: 'Сповіщення на телефон', hint: 'проблеми водіїв одразу', action: 'push' }],
    'керівник': [{ title: 'Дошка машин', hint: 'де кожна машина зараз', action: 'board' }, { title: 'Калькулятор', hint: 'чи вигідна заявка', action: 'calc' }, { title: 'Витрати водіїв', hint: 'чеки, перевірка', action: 'exp' }, { title: 'Здоров\'я програми', hint: 'збої, швидкість, нічні роботи', action: 'health' }, T('Рейси', 'усі машини', 'Рейси'), T('Кругорейси', '', 'Кругорейси'), T('Нарахування', 'зарплата', 'Нарахування'),
      T('Виплати й доплати', '', 'Виплати й доплати'), T('Рухи коштів', '', 'Рухи коштів'), T('Клієнти', '', 'Клієнти'),
      { title: 'Документи', hint: 'що спливає', action: 'docs' }, { title: 'Боржники', hint: 'без позначки оплати', action: 'debts' }, { title: 'До виставлення', hint: 'рахунки для BAS', action: 'inv' }, { title: 'Проблеми водіїв', hint: 'історія й відповіді', action: 'probs' }, T('Журнал змін', '', 'Журнал змін'), { title: 'Видати код', hint: 'вхід для водія', action: 'codes' }, { title: 'Сповіщення на телефон', hint: 'проблеми водіїв одразу', action: 'push' }],
    'логіст': [{ title: 'Дошка машин', hint: 'де кожна машина зараз', action: 'board' }, { title: 'Калькулятор', hint: 'чи вигідна заявка', action: 'calc' }, { title: 'Витрати водіїв', hint: 'чеки, перевірка', action: 'exp' }, T('Рейси', 'усі машини', 'Рейси'), T('Заявки', 'актуальні', 'Заявки'), T('Кругорейси', '', 'Кругорейси'),
      T('Клієнти', '', 'Клієнти'), T('Водій на авто', 'хто на якій машині', 'Водій на авто'), T('Відстані', '', 'Відстані'), { title: 'Документи', hint: 'що спливає', action: 'docs' }, { title: 'Боржники', hint: 'без позначки оплати', action: 'debts' }, { title: 'Проблеми водіїв', hint: 'історія й відповіді', action: 'probs' }, { title: 'Сповіщення на телефон', hint: 'проблеми водіїв одразу', action: 'push' }],
    'бухгалтер': [{ title: 'Витрати водіїв', hint: 'чеки, перевірка', action: 'exp' }, { title: 'Боржники', hint: 'хто не оплатив', action: 'debts' }, { title: 'До виставлення', hint: 'рахунки для BAS', action: 'inv' }, T('Рейси', 'оплати клієнтів', 'Рейси'), T('Рухи коштів', '', 'Рухи коштів'), T('Виплати й доплати', '', 'Виплати й доплати'),
      T('Готівка від клієнтів', '', 'Готівка від клієнтів'), T('Клієнти', '', 'Клієнти')],
    'механік': [{ title: 'Дошка машин', hint: 'машини, документи, GPS', action: 'board' }, T('Авто', '', 'Авто'), T('Причепи', '', 'Причепи'), { title: 'Документи', hint: 'що спливає', action: 'docs' },
      T('Спідометр і пальне', '', 'Спідометр і пальне')],
    'водій': [{ title: 'Моя машина', hint: 'прийняти / здати · моя робота', action: 'truck' }, { title: 'Мої рейси', hint: 'історія · скільки нараховано', action: 'mytrips' }, { title: 'Гроші', hint: 'витрата, обмін, від клієнта', action: 'exp' },
      { title: 'Моя зарплата', hint: 'нараховано · виплати · до виплати', action: 'mypay' }]
  };
  const HINT = {
    'адмін': 'Повний доступ. Таблиці поки лише для перегляду — змінювати їх можна буде згодом.',
    'керівник': 'Дошка, калькулятор і документи працюють. Таблиці поки лише для перегляду.',
    'логіст': 'Дошка машин — головне. Кроки від водіїв видно на дошці й у картці рейсу.',
    'бухгалтер': 'Поки — перегляд даних. Рахунки, акти й оплати з банку з\'являться згодом.',
    'механік': 'Дошка машин і документи працюють. Облік ремонтів і ТО з\'явиться згодом.',
    'водій': 'Почніть з «Моя машина»: відмітьте, яку машину ви прийняли. Тут же ваші рейси, витрати й зарплата.'
  };

  /* ── Сервер ── */
  const perfQ = [];
  // скільки чекати відповіді (ADR-019, Водій.md §9): довше — вважаємо, що зв'язку немає, і запис лишається в черзі на телефоні
  const WAIT = { 'expense.add': 45000, 'tripdoc.add': 45000, 'rmpd.file': 60000, 'report.submit': 30000, 'login.code': 30000, 'login.google': 30000, 'batch': 25000 };
  async function api(action, data = {}) {
    if (!CFG.API_URL) throw new Error('Програму ще не підключено до сервера (немає API_URL у config.js)');
    // кожне «Зберегти» має свій opId: якщо зв'язок обірвався і запит повторено, сервер не створить дубль (ADR-038)
    const ONCE = action === 'save' || action === 'truck.take' || action === 'truck.give' || action === 'trip.status.add' || action === 'tacho.add' || action === 'tripdoc.add' || action === 'report.submit' || action === 'pay.ask';
    if (ONCE && !data.opId) data = { ...data, opId: newId() };
    const perf = perfQ.splice(0, 10), t0 = performance.now();
    const body = JSON.stringify({ action, token: store.get('token'), ...data, ...(perf.length ? { perf } : {}) });
    const send = () => { const ac = window.AbortController ? new AbortController() : null, tm = ac ? setTimeout(() => ac.abort(), WAIT[action] || 20000) : 0;
      return fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, ...(ac ? { signal: ac.signal } : {}) }).finally(() => clearTimeout(tm)); };
    let res, lastErr;
    try { res = await send(); }
    catch (e) {
      lastErr = e;
      if (ONCE && e.name !== 'AbortError') { try { await new Promise(r => setTimeout(r, 1500)); res = await send(); } catch (e2) { res = null; lastErr = e2; } }   // повтор — той самий opId
      if (!res) { $('offline').hidden = false; const er = new Error(lastErr && lastErr.name === 'AbortError' ? 'Немає зв\'язку з сервером (не відповідає)' : 'Немає зв\'язку з сервером'); er.net = true; er.timeout = !!(lastErr && lastErr.name === 'AbortError'); throw er; }
    }
    $('offline').hidden = true;
    let out;
    try { out = await res.json(); } catch (e) { const er = new Error('Сервер тимчасово не відповідає (' + res.status + ') — спробуємо ще'); er.code = 'server'; throw er; }   // HTML 500 від Google
    if (action !== 'login.code' && action !== 'login.google') perfQ.push({ a: action === 'batch' ? 'batch:' + (data.calls || []).map(c => c.action).join('+') : action, ms: Math.round(performance.now() - t0), at: Date.now() });
    if (!out.ok) {
      if (out.code === 'auth' && action !== 'login.code' && action !== 'login.google') { logout(true); }
      const err = new Error(out.error || 'Помилка'); err.code = out.code; err.current = out.current; err.twin = out.twin; throw err;
    }
    return out;
  }
  /* ── Помилки на телефоні → сервер («Здоров'я програми» → «Найчастіші помилки»), ADR-086. Не більше 5 за сеанс, лише після входу ── */
  let errSent = 0;
  function reportErr(msg, stack, where) {
    try {
      msg = String(msg || ''); if (!me || errSent >= 5 || !navigator.onLine || !msg || /^Script error\.?$|ResizeObserver loop/i.test(msg)) return;
      errSent++;
      const scr = document.querySelector('main > section:not([hidden])');
      api('client.err', { msg: msg.slice(0, 300), stack: String(stack || '').slice(0, 1200), where: (scr ? scr.id : '') + (where ? ' · ' + where : ''), ver: 'v44' }).catch(() => {});
    } catch (e) {}
  }
  window.addEventListener('error', e => reportErr(e.message, e.error && e.error.stack, e.filename ? String(e.filename).split('/').pop() + ':' + e.lineno : ''));
  window.addEventListener('unhandledrejection', e => { const r = e.reason || {}; if (r.net || r.code || r.name === 'AbortError') return; reportErr('Promise: ' + (r.message || r), r.stack); });

  /* ── Сховище телефона для черги й фото: IndexedDB (сотні МБ), а не localStorage (≈5 МБ — влазило лише ~20 фото). QA-1, UX-Б3 ── */
  const IDB = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((ok, bad) => {
      if (!window.indexedDB) return bad(new Error('no idb'));
      const r = indexedDB.open('lcorp', 1);
      r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('ob')) db.createObjectStore('ob', { keyPath: 'id' }); if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv'); };
      r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error || new Error('idb')); r.onblocked = () => bad(new Error('idb blocked'));
    }));
    const tx = (st, mode, fn) => open().then(db => new Promise((ok, bad) => {
      const t = db.transaction(st, mode), rq = fn(t.objectStore(st)); let out;
      if (rq) rq.onsuccess = () => { out = rq.result; };
      t.oncomplete = () => ok(out); t.onerror = () => bad(t.error || new Error('idb')); t.onabort = () => bad(t.error || new Error('Пам\'ять заповнена'));
    }));
    return { put: (st, v, k) => tx(st, 'readwrite', s => k === undefined ? s.put(v) : s.put(v, k)), del: (st, k) => tx(st, 'readwrite', s => s.delete(k)),
      all: st => tx(st, 'readonly', s => s.getAll()), get: (st, k) => tx(st, 'readonly', s => s.get(k)), ok: () => open().then(() => true, () => false) };
  })();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}   // просимо Android не чистити дані програми
  const kvGet = async k => { try { return await IDB.get('kv', k); } catch (e) { try { return JSON.parse(store.get('kv_' + k) || 'null'); } catch (e2) { return null; } } };
  const kvSet = async (k, v) => { try { await IDB.put('kv', v, k); } catch (e) { try { localStorage.setItem('kv_' + k, JSON.stringify(v)); } catch (e2) {} } };
  const kvDel = async k => { try { await IDB.del('kv', k); } catch (e) {} store.del('kv_' + k); };
  /* Останні відповіді екранів водія — щоб без зв'язку форми відкривались (критик У1, UX-Б1, QA-4). Без фото. */
  let SCR = {}, RMPD_MEM = null;
  async function scrLoad() { if (!me) return; SCR = (await kvGet('scr_' + me.login)) || {}; try { RMPD_MEM = await kvGet('rmpd'); } catch (e) {} }
  let keepT = 0;
  const draftSave = (k, v) => { if (!me) return; v ? kvSet('draft_' + k + '_' + me.login, Object.assign({}, v, { _at: Date.now() })) : kvDel('draft_' + k + '_' + me.login); };
  const draftGet = async k => { if (!me) return null; const v = await kvGet('draft_' + k + '_' + me.login); return v && Date.now() - (v._at || 0) < 2 * 86400000 ? v : null; };
  const smooth = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  function scrSet(k, v) { if (!me || !v) return; SCR[k] = v; kvSet('scr_' + me.login, SCR); }

  /* ── Черга записів без зв'язку (ADR-054, переписано 22.11): СПЕРШУ записати на телефон, ПОТІМ надсилати.
     Запис зникає з черги лише тоді, коли сервер його прийняв. Тимчасові збої (немає мережі, сервер не відповідає / перевантажений,
     сесія скінчилась) — лишається й надсилається пізніше. Відмову (наприклад, неправильна сума) — у список «Не прийнято» з кнопками, а не мовчки. ── */
  const newId = () => crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
  const isNet = e => !!(e && (e.net || (!e.code && /зв'язку/.test(e.message || ''))));
  const isTemp = e => isNet(e) || ['error', 'server', 'auth', 'busy'].indexOf(e && e.code) >= 0;
  let OB = [], REJ = [], obReady = false, obIdb = true;
  const mine = it => !!(me && it.login && it.login === me.login);   // записи без логіна не надсилаємо будь-кому (безпека Н1)
  const outbox = () => OB.filter(mine);
  const obSending = q => flushing && outbox()[0] === q;
  async function obLoad() {
    obIdb = await IDB.ok();
    try { OB = obIdb ? (await IDB.all('ob')) : JSON.parse(store.get('outbox2') || '[]'); } catch (e) { OB = []; }
    OB.sort((a, b) => a.at - b.at);
    // перенести стару чергу з localStorage (до 22.11)
    try { const old = JSON.parse(store.get('outbox') || '[]'); if (old.length) { for (const it of old) { it.id = it.data.opId; it.login = it.login || (me && me.login) || (() => { try { return JSON.parse(store.get('me') || 'null').login || ''; } catch (e) { return ''; } })(); if (!OB.some(x => x.id === it.id)) { OB.push(it); if (obIdb) await IDB.put('ob', it); } } if (!obIdb) store.set('outbox2', JSON.stringify(OB)); store.del('outbox'); } } catch (e) {}
    REJ = (await kvGet('rej')) || [];
    obReady = true; renderOutbox();
  }
  async function obPersistLS() { const s = JSON.stringify(OB); localStorage.setItem('outbox2', s); if (localStorage.getItem('outbox2').length !== s.length) throw new Error('quota'); }
  async function obAdd(it) {
    it.id = it.data.opId;
    try { if (obIdb) await IDB.put('ob', it); else { OB.push(it); await obPersistLS(); OB.pop(); } }
    catch (e) { const er = new Error('Пам\'ять телефона заповнена — запис НЕ збережено. Дочекайтесь зв\'язку, щоб надіслалось те, що чекає, і спробуйте ще раз.'); er.code = 'storage'; throw er; }
    OB.push(it); renderOutbox();
  }
  async function obDel(id) { OB = OB.filter(x => x.id !== id); try { if (obIdb) await IDB.del('ob', id); else localStorage.setItem('outbox2', JSON.stringify(OB)); } catch (e) {} renderOutbox(); }
  const outboxSet = q => { const keep = {}; q.forEach(x => keep[x.id || x.data.opId] = 1); outbox().filter(x => !keep[x.id]).forEach(x => obDel(x.id)); };   // для старих викликів «прибрати з черги»
  // хто чекає на відповідь (екран, який щойно записав): коротко чекаємо сервер, далі «збережено на телефоні»
  const waiters = {};
  const settle = (id, r, err) => { const w = waiters[id]; if (!w) return; delete waiters[id]; clearTimeout(w.t); err ? w.bad(err) : w.ok(r); };
  async function apiQ(action, data, label) {
    data = { ...data, clientAt: Date.now(), opId: data.opId || newId() };
    const it = { action, data, label, at: Date.now(), login: (me && me.login) || '' };
    await obAdd(it);                                                       // кидає 'storage', якщо записати не вдалося — екран покаже помилку і НЕ очистить форму
    const p = new Promise((ok, bad) => { waiters[data.opId] = { ok, bad, t: setTimeout(() => settle(data.opId, { queued: true, opId: data.opId }), 6000) }; });
    flushOutbox();
    return p;
  }
  let flushing = false, flushAt = 0;
  async function flushOutbox() {
    if (flushing && Date.now() - flushAt < 150000) return;               // завислий запит не блокує чергу назавжди (QA-7)
    if (!obReady) return;
    if (!store.get('token')) { outbox().forEach(it => settle(it.id, { queued: true, opId: it.id })); return; }
    flushing = true; flushAt = Date.now(); let sent = 0, bg = 0, rejNow = false;
    try {
      for (;;) {
        const it = outbox()[0]; if (!it) break;
        try {
          const r = await api(it.action, it.data); sent++; if (!waiters[it.id]) bg++;   // фонові — ті, на які людина вже не чекає на екрані
          if (it.action === 'tacho.add' && r && r.log) { tc = r; saveHomeTc(); } if (it.action === 'expense.add' && r && r.list) ex = r; if (it.action === 'tripdoc.add' && r && r.list) td = r;
          await obDel(it.id); settle(it.id, r);
        } catch (e) {
          const hard = e.code === 'error' && (it.tries = (it.tries || 0) + 1) >= 6;   // HTML 500 від Google (server) — завжди повторюємо (критик Д1)   // збій сервера 6 разів поспіль — у «Не прийнято», щоб не блокував чергу (критик Н5)
          if (isTemp(e) && !hard) { try { await IDB.put('ob', it); } catch (er) {} outbox().forEach(x => settle(x.id, { queued: true, opId: x.id })); break; }   // спробуємо пізніше, запис лишається
          await obDel(it.id);
          if (waiters[it.id]) settle(it.id, null, e);                   // людина ще на екрані — покаже помилку там
          else { REJ.push({ id: it.id, action: it.action, data: it.data, label: it.label, at: it.at, login: it.login, error: e.message, when: Date.now() }); await kvSet('rej', REJ); rejNow = true; }
        }
      }
    } finally { flushing = false; renderOutbox(); if (sent) { if (!$('exp').hidden) renderExp(); if (!$('tdoc').hidden) renderTdoc(); if (!$('tacho').hidden && !document.querySelector('.tsheet')) renderTacho(); } }
    if (rejNow && me && me.role === 'водій') { stCur = stripQ(stCur); if (!$('home').hidden) renderHome(); }   // відхилений крок не лишається «виконаним» на головній (критик Н6)
    if (bg && !outbox().length) { toast('✔ Надіслано все, що чекало зв\'язку (' + bg + ').'); if (me && me.role === 'водій' && !$('home').hidden) renderHome(); }
  }
  function renderOutbox() {
    const n = outbox().length, rj = REJ.filter(mine); let b = $('outboxBar');
    if (!n && !rj.length) { if (b) b.hidden = true; document.documentElement.style.setProperty('--obh', '0px'); return; }
    if (!b) { b = document.createElement('div'); b.id = 'outboxBar'; b.className = 'outbox'; b.setAttribute('role', 'status'); document.body.appendChild(b);
      try { new ResizeObserver(() => document.documentElement.style.setProperty('--obh', (b.hidden ? 0 : b.offsetHeight) + 'px')).observe(b); } catch (e) {} }   // висота смужки → відступ сторінки й тосту (дизайнер №3)
    b.hidden = false;
    b.innerHTML = (n ? '<span>📶 Чекають зв\'язку: <b>' + n + '</b><small class="obtail"> — збережено на телефоні, надішлеться само</small></span><button class="btn" data-ob="send">Надіслати зараз</button>' : '') +
      (rj.length ? '<span class="obrej">⚠ Не прийнято: <b>' + rj.length + '</b></span><button class="btn" data-ob="rej">Переглянути</button>' : '');
    if (n) $('offline').hidden = true;                                  // одна плашка замість двох суперечливих (UX-В1)
    b.querySelectorAll('[data-ob]').forEach(x => x.onclick = () => x.dataset.ob === 'send' ? flushOutbox() : showRejected());
  }
  function showRejected() {
    const rj = REJ.filter(mine), w = document.createElement('div'); w.className = 'ask-wrap';
    w.innerHTML = '<div class="ask" role="dialog" aria-modal="true" aria-labelledby="rjH"><h2 id="rjH">Не прийнято сервером</h2><p class="muted small">Ці записи сервер не прийняв. Можна спробувати ще раз (наприклад, коли логіст виправить рейс) або прибрати.</p>' +
      rj.map(x => '<div class="exitem"><div><b>' + esc(x.label || x.action) + '</b><small>' + new Date(x.at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' · ' + esc(x.error) + '</small></div>' +
        '<div class="exact"><button class="btn" data-rr="' + esc(x.id) + '">Надіслати ще раз</button><button class="btn" data-rd="' + esc(x.id) + '">Прибрати</button></div></div>').join('') +
      '<div class="ask-btns"><button class="primary" data-a="0">Закрити</button></div></div>';
    document.body.appendChild(w);
    w.onclick = async e => {
      const rr = e.target.closest('[data-rr]'), rd = e.target.closest('[data-rd]');
      if (rr || rd) { const id = (rr || rd).dataset[rr ? 'rr' : 'rd'], x = REJ.find(y => y.id === id); REJ = REJ.filter(y => y.id !== id); await kvSet('rej', REJ);
        if (rr && x) { try { await obAdd({ action: x.action, data: x.data, label: x.label, at: x.at, login: x.login }); flushOutbox(); } catch (er) { toast(esc(er.message), 'err'); } }
        w.remove(); renderOutbox(); if (REJ.filter(mine).length) showRejected(); return; }
      if (e.target === w || e.target.closest('[data-a]')) w.remove();
    };
  }
  window.addEventListener('online', () => flushOutbox());
  window.addEventListener('popstate', () => {
    if (ignorePop) { ignorePop--; return; }
    const dlg = [...document.querySelectorAll('.ask-wrap')].pop();
    if (dlg) { dlgEntries = Math.max(0, dlgEntries - 1); popClosing = true; try { dlgClose(dlg); } finally { popClosing = false; } histOn = !!(history.state && history.state.s); return; }   // «Назад» закриває віконце (критик Н4)
    histOn = false;
    if (me && $('home').hidden && $('login').hidden) renderHome();
  });
  let hidAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hidAt = Date.now(); return; }
    flushOutbox();
    if (me && me.role === 'водій' && hidAt && Date.now() - hidAt > 5 * 60000 && !$('home').hidden && !document.querySelector('.ask-wrap')) renderHome();   // повернувся з фону — оновити рейс (QA-18)
  });
  setInterval(() => { if (outbox().length) flushOutbox(); }, 30000);
  function stripQ(sv) {
    if (!sv || !sv.steps || !sv.steps.some(x => String(x.id || '').startsWith('q:'))) return sv;
    const o = JSON.parse(JSON.stringify(sv)); o.steps.forEach(x => { if (String(x.id || '').startsWith('q:')) { x.at = ''; x.id = ''; } });
    const li = o.steps.reduce((m, x, i) => x.at ? i : m, -1); o.next = (o.steps[li + 1] || {}).step || ''; if (o.last && String(o.last.id || '').startsWith('q:')) o.last = null; return o;
  }
  /** Кроки, що ще чекають у черзі, показати поверх даних із сервера (щоб відмітка не «зникала»). */
  function applyOutbox(sv) {
    if (!sv || !sv.trip || !sv.steps) return sv;
    const q = outbox().filter(x => x.action === 'trip.status.add' && x.data.tripId === sv.trip.id && x.data.event !== 'проблема');
    if (!q.length) return sv;
    const o = JSON.parse(JSON.stringify(sv));
    q.forEach(x => { o.steps.forEach(st => { if (st.step === x.data.event && !st.at) { st.at = new Date(x.data.clientAt).toISOString(); st.id = 'q:' + x.data.opId; } }); });
    const li = o.steps.reduce((m, x, i) => x.at ? i : m, -1); o.next = (o.steps[li + 1] || {}).step || '';
    const lq = q[q.length - 1]; o.last = { event: lq.data.event, at: new Date(lq.data.clientAt).toISOString(), id: 'q:' + lq.data.opId, canUndo: !flushing };
    return o;
  }

  async function apiBatch(calls) {
    const out = await api('batch', { calls });
    return out.results.map(r => { if (!r.ok) { const e = new Error(r.error || 'Помилка'); e.code = r.code; return e; } return r; });
  }
  const busy = on => { $('busy').hidden = !on; };
  const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  /* Власне вікно-питання замість системного confirm(): великі кнопки, зрозумілі слова */
  function ask(title, text, ok, danger) {
    return new Promise(res => {
      const w = document.createElement('div'); w.className = 'ask-wrap';
      w.innerHTML = '<div class="ask" role="dialog" aria-modal="true"><h2></h2><p></p><div class="ask-btns"><button class="btn" data-a="0">Ні, назад</button><button class="primary' + (danger ? ' danger' : '') + '" data-a="1"></button></div></div>';
      w.querySelector('h2').textContent = title; w.querySelector('p').textContent = text || ''; w.querySelector('[data-a="1"]').textContent = ok || 'Так';
      const done = v => { w.remove(); res(v); };
      w.onclick = e => { if (e.target === w) done(false); const b = e.target.closest('[data-a]'); if (b) done(b.dataset.a === '1'); };
      dlgOpener = document.activeElement; document.body.appendChild(w); w.querySelector('[data-a="1"]').focus();
    });
  }
  /* Діалоги (ask, askText, tsheet, фото…): підпис із заголовка, Esc, фокус усередині, повернення фокусу (a11y-6) */
  document.addEventListener('keydown', e => { const l = e.target.closest && e.target.closest('label.phbtn'); if (l && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); l.click(); } });   // «Камера»/«Галерея» з клавіатури (a11y-12)
  function dlgClose(w) { const c = w.querySelector('[data-a="0"], [data-a="skip"]'); if (c) c.click(); if (w.isConnected) w.remove(); }   // лише «скасувати»; інакше просто закрити — не тиснути «Вимкнути» / «звичайний» (критик Н2)
  const dlgFocus = new WeakMap(); let dlgOpener = null;
  new MutationObserver(ms => ms.forEach(m => {
    m.addedNodes.forEach(n => { if (!(n instanceof HTMLElement) || !n.classList.contains('ask-wrap')) return;
      dlgFocus.set(n, dlgOpener && !n.contains(dlgOpener) ? dlgOpener : (n.contains(document.activeElement) ? null : document.activeElement)); dlgOpener = null;
      const mn = document.querySelector('main'); if (mn) mn.inert = true;
      try { history.pushState({ dlg: 1, s: history.state && history.state.s }, ''); n._h = true; dlgEntries++; } catch (e) {}
      const box = n.querySelector('[role="dialog"]') || n.firstElementChild, h = n.querySelector('h2');
      if (box && h && !box.getAttribute('aria-labelledby') && !box.getAttribute('aria-label')) { h.id = h.id || 'dlg' + Math.random().toString(36).slice(2, 8); box.setAttribute('aria-labelledby', h.id); }
      n.querySelectorAll('.msg').forEach(x => x.setAttribute('role', 'alert'));
      setTimeout(() => { if (n.isConnected && !n.contains(document.activeElement)) { const f = n.querySelector('input, textarea, [data-a="1"], button'); if (f) f.focus(); } }, 30);
      n.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); dlgClose(n); return; }
        if (e.key !== 'Tab') return;
        const fs = [...n.querySelectorAll('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null); if (!fs.length) return;
        const a = fs[0], z = fs[fs.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }); });
    m.removedNodes.forEach(n => { if (n instanceof HTMLElement && n.classList.contains('ask-wrap') && n._h && !popClosing) setTimeout(() => { try { if (history.state && history.state.dlg && dlgEntries > document.querySelectorAll('.ask-wrap').length) { dlgEntries--; ignorePop++; history.back(); } } catch (e) {} }, 0);
      if (n instanceof HTMLElement && n.classList.contains('ask-wrap') && !document.querySelector('.ask-wrap')) { const mn = document.querySelector('main'); if (mn) mn.inert = false; } let f = n instanceof HTMLElement && dlgFocus.get(n); if (f && !f.isConnected && f.id) f = document.getElementById(f.id); if (f && f.isConnected && !document.querySelector('.ask-wrap')) try { f.focus(); } catch (e) {} });   // екран перемальовано — фокус на ту саму кнопку за id (a11y r3-6а)
  })).observe(document.body, { childList: true });
  /* Повідомлення вгорі екрана (замість alert і тексту внизу сторінки) */
  let toastT = null;
  (() => { const t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.hidden = true; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); })();   // живий регіон існує до першого повідомлення
  function toast(html, kind, action) {
    let t = $('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.className = 'toast ' + (kind || ''); t.innerHTML = '<span>' + html + '</span>' + (action ? '<button class="btn">' + esc(action.label) + '</button>' : '') + '<button class="toast-x" aria-label="Закрити">×</button>';
    t.hidden = false; if (kind === 'err') vib([120, 60, 120]);
    if (action) t.querySelector('.btn').onclick = () => { t.hidden = true; action.run(); };
    t.querySelector('.toast-x').onclick = () => { t.hidden = true; };
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, kind === 'err' ? 15000 : action ? 10000 : 5000);   // з кнопкою «Скасувати» — 10 с (a11y-15)
  }

  /* ── Екрани ── */
  let navSeq = 0, meFresh = false;   // кожен перехід між екранами; пізня відповідь сервера не перемикає екран, якщо людина вже пішла далі
  let histOn = false, ignorePop = 0, popClosing = false, dlgEntries = 0;
  function show(id) { navSeq++;
    { const t = $('toast'); if (t && !t.hidden && !t.classList.contains('err')) t.hidden = true; }   // тост не лишається над новим екраном (UX Н4)
    try { if (id !== 'login' && id !== 'home') { if (!histOn) { history.pushState({ s: id }, ''); histOn = true; } }
      else { if (histOn && history.state && history.state.s) { ignorePop++; history.back(); } histOn = false; } } catch (e) {}   // «‹ Назад» у програмі прибирає свій запис історії   // «Назад» Android — на головну, а не вихід (QA-12)
    ['login', 'home', 'view', 'codes', 'board', 'trip', 'docs', 'calc', 'truck', 'tacho', 'exp', 'health', 'tdoc', 'rpt', 'debts', 'bank', 'mypay', 'probs', 'inv'].forEach(s => $(s) && ($(s).hidden = s !== id)); window.scrollTo(0, 0);
    document.body.classList.toggle('drvbar-on', id === 'home' && !!me && me.role === 'водій'); }   // місце під нижню стрічку водія (етап 1 дизайну)

  function showLogin(msg) {
    $('who').hidden = true; show('login'); $('loginMsg').textContent = msg || '';
    if (!msg && OB.length) $('loginMsg').textContent = 'На телефоні є записи, що ще не надіслані (' + OB.length + '). Увійдіть — вони надішлються.';   // критик У3
    if (CFG.GOOGLE_CLIENT_ID) loadGoogle();
  }

  function enter(out, quiet) {
    if (out.token) store.set('token', out.token);
    const was = JSON.stringify({ r: me && me.role, s: sheets.map(x => x.name) });
    me = out.me; sheets = out.sheets || [];
    store.set('me', JSON.stringify({ me, sheets }));
    $('whoName').textContent = me.name; $('whoRole').textContent = me.role; try { $('hdrCall').href = 'tel:' + LOGIST_TEL; } catch (e) {} $('who').hidden = false; document.body.dataset.role = me.role;
    // quiet — уточнення від сервера після показу збереженого кабінету: не перемальовуємо й не повертаємо на головну,
    // хіба що змінилися роль чи доступи і людина досі на головній
    if (!quiet) { scrLoad(); setTimeout(flushOutbox, 500); }
    if (quiet && (was === JSON.stringify({ r: me.role, s: sheets.map(x => x.name) }) || $('home').hidden)) return;
    renderHome();
  }

  function renderHome() {
    $('homeTitle').textContent = 'Кабінет: ' + me.role;
    $('homeHint').textContent = HINT[me.role] || '';
    const can = new Set(sheets.map(s => s.name));
    const box = $('tiles'); box.innerHTML = '';
    (TILES[me.role] || []).forEach(t => {
      const b = document.createElement('button'); b.className = 'tile';
      const ok = t.action || (t.sheet && can.has(t.sheet));
      if (!ok) b.classList.add('soon');
      b.innerHTML = '<b></b><span></span>';
      b.querySelector('b').textContent = t.title;
      b.querySelector('span').textContent = ok ? (t.hint || '') : 'скоро';
      if (ok) b.onclick = () => t.action === 'inv' ? openInv() : t.action === 'probs' ? openProbs() : t.action === 'codes' ? openCodes() : t.action === 'board' ? openBoard() : t.action === 'docs' ? openDocs() : t.action === 'calc' ? openCalc() : t.action === 'truck' ? openTruck() : t.action === 'exp' ? openExp() : t.action === 'health' ? openHealth() : t.action === 'push' ? openPush() : t.action === 'debts' ? openDebts() : t.action === 'mypay' ? openPay('pay') : t.action === 'mytrips' ? openPay('trips') : openSheet(t);
      box.appendChild(b);
    });
    $('homeWork').innerHTML = ''; $('tiles').hidden = false; if ($('drvOutBox')) $('drvOutBox').innerHTML = ''; drvBar(false);
    if (me.role === 'водій') {
      $('homeTitle').textContent = 'Мій рейс'; $('homeHint').textContent = ''; $('tiles').hidden = true; drvBar(true);
      // один запит паралельно з другим і один показ екрана: без проміжних «Завантаження…» → картка → «Мій рейс»
      let cache = null; try { cache = JSON.parse(store.get('homeDrv') || 'null'); } catch (e) {}
      if (cache && cache.login === me.login) drawDriverHome(cache.st, cache.sv); else $('homeWork').innerHTML = '<div class="card tkwork"><p class="muted">Завантаження вашого рейсу…</p></div>';
      const nav = navSeq + 1;   // show('home') нижче
      if (!tc) { try { tc = JSON.parse(store.get('tacho_' + me.login) || 'null'); } catch (e) {} }
      const calls = [{ action: 'truck.state' }, { action: 'trip.status' }, { action: 'tacho' }]; if (!meFresh) calls.push({ action: 'me' });
      apiBatch(calls).then(([st, sv, tr, mr]) => {
        if (st instanceof Error) throw st; if (sv instanceof Error) sv = null;
        if (tr && !(tr instanceof Error)) { tc = tr; saveHomeTc(); if (nav === navSeq) renderTimeBox(); }
        if (mr && !(mr instanceof Error)) { meFresh = true; enter(mr, true); }
        const fresh = JSON.stringify({ login: me.login, st, sv });
        if (store.get('homeDrv') !== fresh) { store.set('homeDrv', fresh); if (nav === navSeq) drawDriverHome(st, sv); }
        else { tk = st; stCur = sv; }
      }).catch(e => { if (nav === navSeq && !cache) $('homeWork').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; });
    }
    show('home'); setTimeout(tour, 700);
    if (me.role === 'керівник' || me.role === 'адмін') panelLoad();
  }
  /* ── «Панель дня» керівника й адміна (ідея власниці №1, ADR-088): машини, розрахунки з водіями, нагальне ── */
  let panel = null;
  async function panelLoad() {
    try { const c = JSON.parse(store.get('panel_' + me.login) || 'null'); if (c && !panel) panel = c; } catch (e) {}
    if (panel) panelDraw(); else $('homeWork').innerHTML = '<div class="card pnl"><p class="muted">Збираю панель дня…</p></div>';
    const nav = navSeq;
    try { panel = await api('panel'); try { store.set('panel_' + me.login, JSON.stringify(panel)); } catch (e) {} if (nav === navSeq && !$('home').hidden) panelDraw(); }
    catch (e) { if (!panel) $('homeWork').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  const pnlSums = o => Object.keys(o || {}).filter(k => o[k]).map(k => money(Math.round(o[k])) + ' ' + k).join(' + ');
  function panelDraw() {
    const p = panel, t = p.trucks || {}, c = p.circles || {}, pr = p.problems || {}, q = p.payq || {}, ex = p.exp || {}, dc = p.docs || {}, db = p.debts || {};
    const seg = (n, cls, label) => n ? '<span class="pseg ' + cls + '" style="flex:' + n + '" title="' + esc(label + ': ' + n) + '"></span>' : '';
    const lg = (n, cls, label) => '<span class="plg"><i class="' + cls + '"></i>' + esc(label) + ' <b>' + (n || 0) + '</b></span>';
    const trucks = t.error ? '<p class="muted small">Машини: ' + esc(t.error) + '</p>' :
      '<div class="pbar" role="img" aria-label="' + esc('Машини: у рейсі ' + t.trip + ', вільні до 3 днів ' + t.free + ', вільні понад 3 дні ' + t.idle + ', без рейсів ' + t.none) + '">' + seg(t.trip, 'p-trip', 'у рейсі') + seg(t.free, 'p-free', 'вільні до 3 дн') + seg(t.idle, 'p-idle', 'вільні понад 3 дн') + seg(t.none, 'p-none', 'без рейсів') + '</div>' +
      '<div class="plgs">' + lg(t.trip, 'p-trip', 'у рейсі') + lg(t.free, 'p-free', 'вільні до 3 дн') + lg(t.idle, 'p-idle', 'вільні понад 3 дн') + lg(t.none, 'p-none', 'без рейсів') + '</div>' +
      (t.urgent || t.gps ? '<p class="small">' + (t.urgent ? '⚠ з терміновим: <b>' + t.urgent + '</b>' : '') + (t.gps ? (t.urgent ? ' · ' : '') + 'GPS бачить невідмічений крок: <b>' + t.gps + '</b>' : '') + '</p>' : '');
    const pct = c.total ? Math.round(c.done / c.total * 100) : 0;
    const circles = c.error ? '<p class="muted small">' + esc(c.error) + '</p>' : !c.total ? '<p class="muted small">За ' + (c.days || 45) + ' днів кругорейсів немає.</p>' :
      '<div class="pprog" role="progressbar" aria-valuemin="0" aria-valuemax="' + c.total + '" aria-valuenow="' + c.done + '" aria-label="Розраховано кругорейсів"><span style="width:' + pct + '%"></span></div>' +
      '<p class="small">Розраховано керівником <b>' + c.done + ' з ' + c.total + '</b> кругорейсів за ' + c.days + ' днів' + (c.todo ? ' · чекають: <b>' + c.todo + '</b>' : ' ✓') + '</p>' +
      (c.wait && c.wait.length ? '<div class="muted small">Найдовше чекають: ' + c.wait.map(w => esc(w.id) + (w.drivers ? ' (' + esc(w.drivers) + ')' : '') + ' — з ' + esc(ddmm(w.end))).join(' · ') + '</div>' : '');
    const row = (n, lvl, label, sub, act) => '<button class="prow' + (n ? ' p-' + lvl : '') + '" data-pact="' + act + '"><span class="pn">' + (n || 0) + '</span><span><b>' + esc(label) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span></button>';
    const urgent = [
      row(pr.fresh, 'bad', 'Нові проблеми водіїв', pr.boss ? 'керівника: ' + pr.boss + (pr.top && pr.top[0] ? ' · ' + esc(pr.top[0].truck + ' ' + pr.top[0].text) : '') : (pr.top && pr.top[0] ? esc(pr.top[0].truck + ' ' + pr.top[0].text) : ''), 'probs'),
      row(q.open, 'warn', 'Питання по зарплаті', q.open ? 'без відповіді — відповісти тут' : '', 'payq'),
      row(ex.fresh, 'warn', 'Витрати водіїв на перевірку', ex.ask ? 'з питанням: ' + ex.ask : '', 'exp'),
      row((dc.over || 0) + (dc.soon || 0), dc.over ? 'bad' : 'warn', 'Документи', (dc.over ? 'прострочено: ' + dc.over : '') + (dc.soon ? (dc.over ? ' · ' : '') + 'спливають: ' + dc.soon : ''), 'docs'),
      row(db.clients, 'warn', 'Прострочені борги клієнтів', esc(pnlSums(db.recent)), 'debts')].join('');
    $('homeWork').innerHTML = '<div class="pnl"><section class="card pcard"><h2>Машини <small>' + (t.total || 0) + '</small></h2>' + trucks + '<button class="link" data-pact="board">Дошка машин →</button></section>' +
      '<section class="card pcard"><h2>Розрахунки з водіями</h2>' + circles + '</section>' +
      '<section class="card pcard pwide"><h2>Нагальне</h2><div class="prows">' + urgent + '</div><p class="muted small">Оновлено ' + tkTime(p.at) + ' · <button class="link" data-pact="reload">оновити</button></p></section></div>';
    $('homeWork').onclick = e => { const b = e.target.closest('[data-pact]'); if (!b) return; const a = b.dataset.pact;
      if (a === 'board') openBoard(); else if (a === 'probs') openProbs(); else if (a === 'exp') openExp(); else if (a === 'docs') openDocs(); else if (a === 'debts') openDebts(); else if (a === 'reload') panelLoad(); else if (a === 'payq') payqOpen(); };
  }
  /** Відповіді на «Є питання» водіїв — тут, а не в таблиці. */
  function payqOpen() {
    const list = (panel && panel.payq && panel.payq.list) || [];
    const w = document.createElement('div'); w.className = 'ask-wrap';
    const body = () => list.length ? list.map((x, i) => '<div class="dupg"><p><b>' + esc(x.name || x.worker) + '</b> <span class="muted small">' + esc(x.at ? tkTime(x.at) : '') + (x.circle ? ' · кругорейс ' + esc(x.circle) : '') + '</span></p><p>' + esc(x.text) + '</p><button class="primary small" data-pqa="' + i + '">Відповісти…</button></div>').join('') : '<p class="muted">Питань без відповіді немає.</p>';
    w.innerHTML = '<div class="ask tsheet" role="dialog" aria-modal="true"><h2>Питання по зарплаті</h2><p class="muted small">Відповідь водій побачить у «Моя зарплата» → «Мої питання» і отримає сповіщення.</p><div id="pqBody">' + body() + '</div><div class="ask-btns"><button class="btn" data-a="0">Закрити</button></div></div>';
    w.onclick = async e => {
      if (e.target === w || e.target.closest('[data-a="0"]')) { w.remove(); return; }
      const b = e.target.closest('[data-pqa]'); if (!b) return; const x = list[+b.dataset.pqa];
      const text = await askText('Відповідь: ' + (x.name || x.worker), 'Напр.: допомогу в рейсі 231 враховано, доплата у наступній виплаті', 'Надіслати'); if (!text) return;
      busy(true); try { await api('pay.answer', { id: x.id, text }); list.splice(+b.dataset.pqa, 1); panel.payq.open = list.length; w.querySelector('#pqBody').innerHTML = body(); (w.querySelector('[data-pqa]') || w.querySelector('[data-a="0"]')).focus(); panelDraw(); toast('Відповідь надіслано водію.'); }
      catch (er) { toast(esc(er.message), 'err'); } finally { busy(false); }
    };
    dlgOpener = document.activeElement; document.body.appendChild(w);
  }
  function drawDriverHome(st, sv) {
    sv = applyOutbox(sv); tk = st; stCur = sv;
    const has = st && st.planned && st.planned.length;
    const prof = '<div class="profile"><span>' + esc(me.name) + '</span><button class="btn" id="pushBtn">🔔 Сповіщення</button><button class="link" id="drvOut">Вийти з програми</button></div>';
    if ($('drvOutBox')) $('drvOutBox').innerHTML = '';
    if (has && sv && sv.trip) { $('homeWork').innerHTML = '<div id="stBox"></div><div id="timeBox"></div>' + prof; renderTimeBox(); $('tiles').hidden = true; renderStatus(); $('drvOut').onclick = askLogout; $('pushBtn').onclick = openPush; return; }
    // немає поточного рейсу — коротка картка роботи (або «поки немає») і звичайні плитки
    $('homeWork').innerHTML = '<div id="timeBox"></div>' + (has ? '<div id="homeWorkCard">' + workHtml(st.planned, true) + '</div>' : '<div class="card tkwork"><b>Запланованої роботи поки немає.</b><div class="muted small">Щойно логіст призначить рейс — він з\'явиться тут.</div></div>');
    $('homeWork').insertAdjacentHTML('beforeend', docsAlert(st && st.docs)); $('homeWork').querySelectorAll('.docalert').forEach(b => b.onclick = () => openTruck());
    $('tiles').hidden = true; bindWork(); renderTimeBox();   // плитки водія дублювали нижню стрічку — прибрано (етап 1 дизайну)
    if (!$('drvOutBox')) { const d = document.createElement('div'); d.id = 'drvOutBox'; $('tiles').after(d); }
    $('drvOutBox').innerHTML = prof; $('drvOut').onclick = askLogout; $('pushBtn').onclick = openPush;
  }
  /* «На вас запланована робота» — поточний і наступні рейси водія (без фрахту й клієнта) */
  function workHtml(list, compact) {
    if (!list || !list.length) return compact ? '' : '<div class="card tkwork"><b>Запланованої роботи поки немає.</b><div class="muted small">Щойно логіст призначить рейс — він з\'явиться тут.</div></div>';
    const one = w => '<div class="wrow"><span class="pill ' + (w.state === 'зараз' ? 'st-trip' : 'st-free') + '">' + (w.state === 'зараз' ? 'зараз' : w.order ? 'заявка' : 'далі') + '</span>' +
      '<div><b>' + esc(w.from) + ' → ' + esc(w.to) + '</b><div class="muted small">машина ' + esc(w.truck) + ' · завантаження ' + (dd(w.load) || '?') + (w.unload ? ' · розвантаження ' + dd(w.unload) : '') +
      (w.cargo ? ' · ' + esc(w.cargo) : '') + (w.crossing ? ' · перехід ' + esc(w.crossing) : '') + (w.adr ? ' · <b>АДР</b>' : '') + '</div></div></div>';
    return '<div class="card tkwork' + (compact ? ' tkclick' : '') + '"><div class="tkwhead">На вас запланована робота</div>' + (compact ? one(list[0]) + (list.length > 1 ? '<div class="muted small">і ще ' + (list.length - 1) + ' →</div>' : '') : list.map(one).join('')) + '</div>';
  }
  /* ── Статуси рейсу (етап 3): водій натискає крок — логіст бачить на дошці й у картці рейсу ── */
  let stCur = null, stPending = false, stLock = 0;
  const ST_LABEL = { 'на завантаженні': 'Я на завантаженні', 'завантажено': 'Завантажився', 'замитнення': 'Замитнився', 'на кордоні': 'Я на кордоні / в черзі',
    'кордон пройдено': 'Перетнув кордон', 'розмитнення': 'Розмитнився', 'на розвантаженні': 'Я на розвантаженні', 'розвантажено': 'Розвантажився' };
  async function loadStatus(msg) {
    try { stCur = await api('trip.status'); renderStatus(msg); } catch (e) { if ($('stBox')) $('stBox').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  const ST_HINT = { 'на завантаженні': 'Натисніть, коли приїдете на склад завантаження. Час зафіксується сам.', 'завантажено': 'Натисніть, коли машину завантажили.',
    'замитнення': 'Натисніть, коли пройшли митне оформлення.', 'на кордоні': 'Натисніть, коли стали в чергу або під\'їхали до кордону.', 'кордон пройдено': 'Натисніть, коли перетнули кордон.',
    'розмитнення': 'Натисніть, коли пройшли розмитнення.', 'на розвантаженні': 'Натисніть, коли приїдете на склад розвантаження.', 'розвантажено': 'Натисніть, коли машину розвантажили.' };
  // ADR-065: на головній — лише 4 кнопки (за звітами водіїв-тестувальників і побажанням власниці): заправки йдуть картками UTA, «Спідометр» — у «Моя машина»
  const LOGIST_TEL = CFG.LOGIST_TEL || '';   // «Подзвонити логісту» — номер у config.js (критик У6)
  const QUICK = [['Машина', 'truck', 'M3 16V7a1 1 0 011-1h10v10M14 9h4l3 3v4h-7M6.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm11 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z'],
    ['Гроші', 'exp', 'M3 7h18v10H3zM12 15a3 3 0 100-6 3 3 0 000 6zM6 10v4M18 10v4'], ['Фото', 'tdoc', 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7'], ['Зарплата', 'pay', 'M4 19V5M4 19h16M8 15l3-4 3 2 5-6'], ['Проблема', 'problem', 'M12 4l9 16H3zM12 10v4M12 17h.01']];
  // етап 1 дизайну (23.11): розділи водія — у закріпленій нижній стрічці; на кнопці — коротке слово, у aria-label — повна назва (містить видиме слово)
  const QUICK_ARIA = { truck: 'Моя машина', exp: 'Гроші', tdoc: 'Фото документів', pay: 'Рейси й зарплата', problem: 'Проблема — повідомити логіста' };
  const svgI = d => '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  /** Нижня стрічка водія (етап 1 дизайну, 23.11): 5 розділів з підписами, видно на головній і з рейсом, і без нього. */
  function drvBar(on) {
    const n = $('drvBar'); if (!n) return;
    if (!on) { n.hidden = true; return; }
    if (!n.dataset.ready) {
      n.innerHTML = QUICK.map(q => '<button type="button" class="q' + (q[1] === 'problem' ? ' problem' : '') + '" data-q="' + q[1] + '" aria-label="' + esc(QUICK_ARIA[q[1]] || q[0]) + '">' + svgI(q[2]) + '<span>' + esc(q[0]) + '</span></button>').join('');
      n.onclick = e => { const b = e.target.closest('[data-q]'); if (!b) return; const q = b.dataset.q;
        if (q === 'truck') openTruck(); else if (q === 'exp') openExp(); else if (q === 'tdoc') openTdoc(); else if (q === 'pay') openPay('pay'); else if (q === 'problem') drvProblem(); };
      n.dataset.ready = '1';
    }
    n.hidden = false;
  }
  // відкрита клавіатура (поле вводу у фокусі) — нижню стрічку ховаємо, щоб не лягала на поле
  document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('textarea, select, input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file])')) document.body.classList.add('kbd'); });
  document.addEventListener('focusout', () => document.body.classList.remove('kbd'));
  /** «Проблема» зі стрічки: та сама форма на головній, з прокруткою до неї; без поточного рейсу — дзвінок логісту. */
  async function drvProblem() {
    const box = $('stProbBox');
    if (!box) { if (await ask('Проблема', 'Зараз у вас немає поточного рейсу — повідомлення нема до чого прив\'язати. Подзвоніть логісту, він допоможе.', '📞 Подзвонити логісту') && LOGIST_TEL) location.href = 'tel:' + LOGIST_TEL; return; }
    if (!box.hidden) { const r = box.getBoundingClientRect(); if (r.top >= 0 && r.top < innerHeight * .6) { box.hidden = true; return; } }   // уже перед очима — друге натискання ховає
    box.hidden = false; box.scrollIntoView({ block: 'start', behavior: smooth() });
    const f = box.querySelector('.probone'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  const dayName = iso => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? '' : dd(iso) + ', ' + d.toLocaleDateString('uk-UA', { weekday: 'long' }); };
  function renderStatus(msg) {
    const box = $('stBox'); if (!box) return;
    const v = stCur; if (!v || !v.trip) { box.innerHTML = ''; return; }
    const p = ((tk && tk.planned) || []).find(x => x.id === v.trip.id) || {};
    const doneN = v.steps.filter(x => x.at).length, loaded = v.steps.some(x => x.step === 'завантажено' && x.at);
    const pct = Math.round(doneN / v.steps.length * 100);
    const lastIdx = v.steps.reduce((m, x, i) => x.at ? i : m, -1), nextIdx = v.steps.findIndex(x => x.step === v.next);
    const ahead = nextIdx >= 0 ? v.steps.slice(nextIdx + 1).map(x => x.step) : [];
    const chip = v.last ? v.last.event : (p.state === 'зараз' ? 'в роботі' : 'заплановано');
    const facts = ['машина ' + esc(v.trip.truck), p.cargo ? esc(p.cargo) : '', v.trip.crossing ? 'перехід ' + esc(v.trip.crossing) : '', p.adr ? '<b>АДР</b>' : ''].filter(Boolean).join(' · ');
    // підказка за GPS (Hints.gs): «Схоже, ви на кордоні — підтвердіть»; «Ні, ще не там» — ховаємо на 3 год для цього кроку
    const hk = v.hint ? 'hint_' + v.trip.id + '_' + v.hint.step : '', snoozed = hk && +(store.get(hk) || 0) > Date.now();
    let h = v.hint && !snoozed && !stPending ? '<section class="hintcard" role="status"><b>📍 ' + esc(v.hint.text) + '?</b><span>' + (v.hint.stoppedMin ? 'Машина стоїть тут ' + (v.hint.stoppedMin >= 60 ? Math.floor(v.hint.stoppedMin / 60) + ' год ' : '') + (v.hint.stoppedMin % 60) + ' хв. ' : 'Так показує GPS. ') + 'Якщо так — підтвердіть.</span>' +
      '<div class="ask-btns"><button class="btn" id="hintNo">Ні, ще не там</button><button class="primary" id="hintYes">Так, підтверджую</button></div></section>' : '';
    h += '<article class="hero">' +
      '<div class="meta"><span>Рейс ' + esc(v.trip.id) + '</span><span class="st">' + esc(chip) + '</span></div>' +
      '<div><div class="to">' + (loaded ? 'Розвантаження' : 'Завантаження') + '</div><div class="city">' + esc(loaded ? v.trip.to : v.trip.from) + '</div>' +
      '<div class="when">' + (loaded ? (p.unload ? dayName(p.unload) : 'дату уточнить логіст') : (p.load ? dayName(p.load) : '')) + '</div></div>' +
      '<div><div class="road" style="--p:' + pct + '%"><i></i><b></b></div><div class="ends"><span>' + esc(v.trip.from) + (p.load ? ', ' + dd(p.load) : '') + '</span><span>' + esc(v.trip.to) + '</span></div></div>' +
      '<div class="facts">' + facts + '</div></article>' + routeCard(v);   // актуальна адреса за статусом (рішення власниці 23.11)
    // етап 1 дизайну (23.11): картка рейсу → «Зараз — …» з адресою → документ / RMPD → кнопка кроку; розділи — у нижній стрічці (drvBarInit)
    h += docsAlert(tk && tk.docs);
    if (v.rmpd && v.rmpd.file && !store.get('rmpdSeen_' + v.rmpd.ver)) h += '<button class="docalert rmpdalert st-' + (v.rmpd.state === 'ok' ? 'ok' : 'soon') + '" data-rmpd="' + esc(v.trip.id) + '" data-ver="' + esc(v.rmpd.ver) + '">📄 RMPD готовий' + (v.rmpd.state === 'ok' ? ' · ✓ перевірено' : ' · ще перевіряється') + ' — відкрити ›</button>';
    if (v.rmpd && v.rmpd.file && store.get('rmpdSeen_' + v.rmpd.ver)) h += '<button class="docalert rmpdbtn st-' + (v.rmpd.state === 'ok' ? 'ok' : 'soon') + '" data-rmpd="' + esc(v.trip.id) + '" data-ver="' + esc(v.rmpd.ver) + '">📄 RMPD' + (v.rmpd.state === 'ok' ? ' · ✓ перевірено' : ' · ще перевіряється') + (rmpdCached(v.rmpd.ver) ? ' · є на телефоні' : '') + ' — відкрити ›</button>';   // переглянутий RMPD — рядком на головній (у нижній стрічці лише 5 розділів, етап 1 дизайну 23.11)
    h += '<div class="next-action">' + (v.next ? '<button class="primary stgo" data-st="' + esc(v.next) + '"' + (stPending ? ' disabled' : '') + '>' + svgI('M5 12l5 5L20 7') + esc(ST_LABEL[v.next] || v.next) + '</button><p>' + esc(ST_HINT[v.next] || '') + '</p>' + (ahead.length ? '<p><button class="link" id="stAhead">Я вже далі</button></p><div id="stAheadBox" class="stahead" hidden><p class="muted small">Попередні кроки лишаться невідміченими — їх можна дописати потім.</p>' + ahead.map(x => '<button class="btn" data-st="' + esc(x) + '">' + esc(ST_LABEL[x] || x) + '</button>').join('') + '</div>' : '')
      : '<div class="cinfo">Усі кроки рейсу відмічено. Дякуємо!</div>') + '</div>';
    if (v.last && v.last.canUndo) { const left = me.role === 'водій' ? (String(v.last.id).startsWith('q:') ? 0 : Math.max(1, 15 - Math.floor((Date.now() - new Date(v.last.at)) / 60000))) : 0;
      h += '<p class="undo-line"><button class="link" id="stUndo">' + svgI('M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3') + 'Скасувати «' + esc(v.last.event) + '»' + (left ? ' (ще ' + left + ' хв)' : '') + '</button></p>'; }
    if (msg) h += '<p class="stmsg" role="status">' + msg + '</p>';
    if (v.rmpd && v.rmpd.file) { const ver = v.rmpd.ver, tid = v.trip.id; setTimeout(() => { if (!rmpdCached(ver) && navigator.onLine) rmpdFetch(tid, ver).catch(() => {}); }, 1500); }   // на кордоні може не бути зв'язку — завантажуємо заздалегідь
    // «Проблема»: спершу великі готові причини — одне натискання й надіслано; свій текст — за бажанням (без автоматичної клавіатури)
    h += '<div class="stprob card" id="stProbBox" hidden><a class="btn calllog" href="tel:' + LOGIST_TEL + '">📞 Подзвонити логісту</a><b>Що сталося? Натисніть — логіст отримає одразу (поломка й ДТП — і керівник)</b><div class="probgrid">' + ['Довга черга', 'Поломка', 'Документи', 'Затримка на складі', 'ДТП'].map(c => '<button class="btn probone" data-pq="' + c + '">' + c + '</button>').join('') + '</div>' +
      '<details class="probown"><summary>Інше — написати своїми словами</summary><textarea id="stText" aria-label="Опис проблеми своїми словами" rows="3" placeholder="Коротко опишіть. Можна надиктувати — мікрофон на клавіатурі."></textarea><button class="primary" id="stProb">Надіслати логісту</button></details></div>';
    (v.problems || []).slice(-2).forEach(x => h += '<p class="cnote">Проблема ' + tkTime(x.at) + ': ' + esc(x.text) + (x.state === 'в роботі' ? '<br><b>Логіст узяв у роботу.</b>' : x.state === 'вирішено' ? '<br><b>✔ Вирішено.</b>' : '') + (x.answer ? ' ' + esc(x.answer) : '') + '</p>');   // водій бачить відповідь (логіст №3)
    h += '<details class="card ststeps"><summary>Усі кроки рейсу · ' + doneN + ' з ' + v.steps.length + '</summary><ol class="stlist">' + v.steps.map((x, i) => '<li class="' + (x.at ? 'done' : x.step === v.next ? 'next' : '') + '"><span>' + (x.at ? '✓' : '○') + '</span><b>' + esc(x.step) + '</b>' +
      (x.at ? '<em>' + tkTime(x.at) + '</em>' : (i < lastIdx ? '<button class="link stany" data-st="' + esc(x.step) + '">пропущено — відмітити</button>' : '')) + '</li>').join('') + '</ol></details>';
    const rest = ((tk && tk.planned) || []).filter(x => x.id !== v.trip.id);
    if (rest.length) h += '<section class="card stnext"><h2>Далі</h2>' + rest.map(w => '<div class="wrow"><span class="pill st-free">' + (w.order ? 'заявка' : 'далі') + '</span><div><b>' + esc(w.from) + ' → ' + esc(w.to) + '</b><div class="muted small">машина ' + esc(w.truck) + ' · завантаження ' + (dd(w.load) || '?') + (w.cargo ? ' · ' + esc(w.cargo) : '') + '</div></div></div>').join('') + '</section>';
    h += '<p class="msg" role="alert" id="stMsg"></p>';
    box.innerHTML = h;
    const send = async (event, text, fromHint) => {
      if (stPending || Date.now() < stLock) { toast('Зачекайте секунду — попередня відмітка ще зберігається.'); return; }   // QA Н5
      if (!fromHint && (event === 'розвантажено' || event === 'кордон пройдено') && !await ask(event === 'розвантажено' ? 'Машину розвантажили?' : 'Перетнули кордон?', 'Логіст побачить це одразу.', 'Так, ' + (event === 'розвантажено' ? 'розвантажився' : 'перетнув'))) return;
      stLock = Date.now() + 2000; vib(30);
      // одразу показуємо відмітку (сервер Google відповідає 3–5 с), надсилаємо у фоні; не прийняв — повертаємо як було
      const prev = stCur, now = new Date().toISOString(), o = JSON.parse(JSON.stringify(v));
      if (event === 'проблема') o.problems = (o.problems || []).concat([{ at: now, text }]);
      else { o.steps.forEach(x => { if (x.step === event) { x.at = now; x.id = 'new'; } });
        const li = o.steps.reduce((m, x, i) => x.at ? i : m, -1); o.next = (o.steps[li + 1] || {}).step || ''; o.last = { event, at: now, id: 'new', canUndo: false }; }
      stCur = o; stPending = true;
      renderStatus((event === 'проблема' ? '✔ Проблему записано' : '✔ Відмічено: <b>' + esc(event) + '</b>') + ' · <span class="muted">надсилаю логісту…</span>'); window.scrollTo(0, 0);
      apiQ('trip.status.add', { tripId: v.trip.id, event, text }, event === 'проблема' ? 'проблема' : event)
        .then(r => { stPending = false;
          if (r.queued) { if (event !== 'проблема') stCur.last = { event, at: now, id: 'q:' + r.opId, canUndo: true }; stCur.steps.forEach(x => { if (x.id === 'new') x.id = 'q:' + r.opId; });
            if ($('stBox')) renderStatus('✔ Відмічено: <b>' + esc(event) + '</b> · збережено на телефоні — <b>надішлеться само</b>, щойно з\'явиться зв\'язок.'); return; }
          stCur = r; if ($('stBox')) renderStatus(r.already ? 'Цей крок уже був відмічений.' : (event === 'проблема' ? '✔ Логіст отримав повідомлення про проблему.' : '✔ Відмічено: <b>' + esc(event) + '</b>. Логіст бачить.')); })
        .catch(e => { stPending = false; stCur = prev; if ($('stBox')) renderStatus();
          toast('<b>Не надіслано</b> «' + esc(event) + '»: ' + esc(e.message), 'err', { label: 'Спробувати ще раз', run: () => { stLock = 0; send(event, text); } }); });
    };
    box.querySelectorAll('[data-st]').forEach(b => b.onclick = e => { e.stopPropagation(); send(b.dataset.st); });
    box.querySelectorAll('.rmpdalert').forEach(b => b.onclick = () => { rmpdOpen(b.dataset.rmpd, b.dataset.ver); b.remove(); });
    box.querySelectorAll('.rmpdbtn').forEach(b => b.onclick = () => rmpdOpen(b.dataset.rmpd, b.dataset.ver));   // UX r2-Н1
    box.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { if (b.dataset.q === 'truck') openTruck(); else if (b.dataset.q === 'exp') openExp(); else if (b.dataset.q === 'fuel') openExp('Пальне'); else if (b.dataset.q === 'tdoc') openTdoc(); else if (b.dataset.q === 'pay') openPay('pay'); else if (b.dataset.q === 'problem') drvProblem(); });
    box.querySelectorAll('[data-pq]').forEach(b => b.onclick = async () => { if (await ask('Надіслати логісту: «' + b.dataset.pq + '»?', navigator.onLine ? 'Логіст і керівник отримають повідомлення одразу.' : 'Зараз немає зв\'язку — повідомлення збережеться на телефоні й піде саме, щойно з\'явиться зв\'язок. Терміново — подзвоніть.', 'Так, надіслати')) { $('stProbBox').hidden = true; stLock = 0; send('проблема', b.dataset.pq); } });
    if ($('hintYes')) $('hintYes').onclick = () => { stLock = 0; send(v.hint.step, undefined, true); };
    if ($('hintNo')) $('hintNo').onclick = () => { store.set(hk, String(Date.now() + 3 * 3600000)); renderStatus(); };
    if ($('rAll')) $('rAll').onclick = routeAll;
    if ($('stAhead')) $('stAhead').onclick = () => { $('stAheadBox').hidden = !$('stAheadBox').hidden; };
    if ($('stUndo')) $('stUndo').onclick = () => {
      if (stPending) return;
      const prev = stCur, o = JSON.parse(JSON.stringify(v)), ev = v.last.event;
      o.steps.forEach(x => { if (x.id === v.last.id) { x.at = ''; x.id = ''; } });
      const li = o.steps.reduce((m, x, i) => x.at ? i : m, -1); o.next = (o.steps[li + 1] || {}).step || ''; o.last = null;
      if (String(v.last.id).startsWith('q:')) {   // ще не надіслано — прибираємо з черги, сервер нічого не дізнається
        const op = String(v.last.id).slice(2);
        if (flushing && outbox().some(x => x.data.opId === op && x === outbox()[0])) { renderStatus('Крок «' + esc(ev) + '» саме надсилається — зачекайте кілька секунд і скасуйте ще раз.'); return; }   // QA-11
        if (!outbox().some(x => x.data.opId === op)) { renderStatus('Крок «' + esc(ev) + '» уже надіслано — оновіть екран, щоб скасувати.'); return; }
        outboxSet(outbox().filter(x => x.data.opId !== op)); stCur = o; renderStatus('Крок «' + esc(ev) + '» скасовано (він ще не був надісланий).'); return;
      }
      stCur = o; stPending = true; renderStatus('Скасовано: <b>' + esc(ev) + '</b> · <span class="muted">надсилаю…</span>');
      api('trip.status.undo', { tripId: v.trip.id, id: v.last.id })
        .then(r => { stPending = false; stCur = r; if ($('stBox')) renderStatus('Крок «' + esc(ev) + '» скасовано.'); })
        .catch(e => { stPending = false; stCur = prev; if ($('stBox')) { renderStatus(); $('stMsg').textContent = 'Не скасовано: ' + e.message; } });
    };
    box.querySelectorAll('[data-chip]').forEach(c => c.onclick = () => { const t = $('stText'); t.value = c.dataset.chip === 'Інше' ? t.value : c.dataset.chip + (t.value ? '. ' + t.value : '. '); t.focus(); box.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c)); });
    $('stProb').onclick = () => { const t = $('stText').value.trim(); if (!t) { $('stMsg').textContent = 'Опишіть проблему'; return; } send('проблема', t); };
    if ($('homeWorkCard')) $('homeWorkCard').hidden = true;
    try { if (me && me.role === 'водій' && tk) store.set('homeDrv', JSON.stringify({ login: me.login, st: tk, sv: stripQ(stCur) })); } catch (e) {}   // у кеш — без кроків з черги: їх щоразу накладає applyOutbox (критик Н6)
    if (me.role === 'водій' && $('tiles')) $('tiles').hidden = true;      // усе потрібне — у швидких кнопках «Мого рейсу»                 // рейс показано в «Мій рейс» — коротка картка роботи не потрібна
  }
  /* ── «Мій час» і ручний тахограф (ADR-058). Розрахунок — drive.js (той самий код, що на сервері), тож працює й без зв'язку ── */
  let tc = null, tcLocal = [];                 // tc — відповідь сервера 'tacho'; tcLocal — щойно натиснуте, ще без відповіді
  const TM = { drive: ['Керую', '', 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 6a3 3 0 100 6 3 3 0 000-6zM3.5 10.5h5.6M14.9 10.5h5.6M12 15v6'],
    work: ['Інша робота', 'склад, митниця, огляд', 'M14 6l4 4M4 20l8-8M13 7l4 4 3-3-4-4z'],
    avail: ['Очікування', 'черга, готовність', 'M4 4h16v16H4zM4 20L20 4'],
    rest: ['Перерва / відпочинок', '', 'M3 18V8M3 14h18v4M21 14v-2a3 3 0 00-3-3h-7v5M7 12a2 2 0 100-4 2 2 0 000 4z'] };
  const CC = [['UA', 'Україна'], ['PL', 'Польща'], ['DE', 'Німеччина'], ['LT', 'Литва'], ['SK', 'Словаччина'], ['HU', 'Угорщина'], ['RO', 'Румунія'], ['CZ', 'Чехія']];
  const hm = ms => new Date(ms).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const fmtD = m => window.DRV ? DRV.fmtDur(m) : Math.round(m) + ' хв';
  /** Журнал: сервер + черга без зв'язку + щойно натиснуте. */
  function tcLog() {
    const base = (tc && tc.log) || [], seen = new Set(base.map(r => r.id + '|' + (r.saved || '')));
    const q = outbox().filter(x => x.action === 'tacho.add').map(x => Object.assign({}, x.data.op, { at: x.data.op.fix ? x.data.op.at : (x.data.op.at || x.data.clientAt), saved: x.data.clientAt, pending: true }));
    return base.concat(q, tcLocal).filter(r => r.pending || seen.has(r.id + '|' + (r.saved || '')));
  }
  function tcCalc() {
    if (!window.DRV || !tc) return null;
    const now = Date.now(), cur = tc.cur ? Object.assign({}, tc.cur, { stale: tc.cur.stale || now - tc.now > 40 * 60000 }) : null;
    const r = DRV.driverTime({ now, recs: tcLog(), rows: tc.rows || [], cur, dailyMovingSec: tc.daily || {} });
    r.text = DRV.shortText(r.ev, now, me && me.role === 'водій' ? 'driver' : 'logist'); r.now = now; return r;
  }
  const todayStarted = r => r.list.some(x => x.kind === 'dayStart' && new Date(x.at).toDateString() === new Date().toDateString()) || (r.ev.dayOpen && r.list.length && Date.now() - r.list[r.list.length - 1].at < 20 * 3600000);
  /** Блок «Мій час» на головній водія: 3 рядки і одна кнопка. */
  function renderTimeBox() {
    const box = $('timeBox'); if (!box) return;
    const r = tcCalc(); if (!r) { box.innerHTML = ''; return; }
    const x = r.text, started = todayStarted(r), m = r.ev.mode && started ? r.ev.mode : null;
    box.classList.toggle('urgent', started && (x.tone === 'red' || x.tone === 'soon'));   // попередження про час — нагору, над рейсом
    // день не почато: один тонкий рядок і кнопка-обведення — головна темна кнопка на екрані одна (крок рейсу)
    box.innerHTML = !started && $('stBox') ? '<section class="card timebox compact tone-grey"><div class="tb-head"><b>Мій час: день не почато</b><button class="link" id="tbOpen">Відкрити ›</button></div><button class="btn tb-start" id="tbStart">Почати день</button></section>'
      : '<section class="card timebox tone-' + x.tone + '"><div class="tb-head"><b>Мій час</b><button class="link" id="tbOpen">Відкрити ›</button></div>' +
      (started && m ? '<button class="btn tb-mode" id="tbMode">' + svgI(TM[m][2]) + '<span><b>' + esc(TM[m][0]) + '</b> · змінити</span></button>' : '<button class="primary tb-start" id="tbStart">Почати день</button>') +
      (started || r.ev.source !== 'gps' ? '<div class="tb-main"><span class="tb-ico" aria-hidden="true">' + esc(x.icon) + '</span>' + esc(x.main) + '</div>' + (x.sub ? '<div class="tb-sub">' + esc(x.sub) + '</div>' : '') : '<div class="tb-sub">Відмітьте час і спідометр — програма підкаже, коли перерва.</div>') + '</section>';
    $('tbOpen').onclick = () => openTacho();
    if ($('tbMode')) $('tbMode').onclick = () => openTacho();
    if ($('tbStart')) $('tbStart').onclick = () => openTacho('dayStart');
  }
  async function openTacho(then, who) {
    const office = me.role !== 'водій';
    if (office) { tc = null; $('tachoBack').textContent = '‹ Дошка'; $('tachoTitle').textContent = 'Час водія' + (who && who.name ? ' — ' + who.name : ''); }
    show('tacho'); const nav = navSeq;
    if (tc) renderTacho(); else $('tcBody').innerHTML = '<p class="muted">Завантаження…</p>';
    if (then) tachoDay(then);
    try { const r = await api('tacho', office ? { workerId: who.id, truck: who.truck } : {}); tc = r; if (nav === navSeq && !$('tacho').hidden && !document.querySelector('.tsheet')) renderTacho(); saveHomeTc(); }
    catch (e) { if (!tc) $('tcBody').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  const saveHomeTc = () => { if (me.role === 'водій') try { store.set('tacho_' + me.login, JSON.stringify(tc)); } catch (e) {} };
  /** Надіслати запис (через чергу без зв'язку). Час — натискання на телефоні. */
  function tachoSend(op, okText) {
    op = Object.assign({ id: 'TH-' + newId().slice(0, 18) }, op);
    const loc = Object.assign({}, op, { at: op.fix ? op.at : (op.at || Date.now()), saved: Date.now(), pending: true }); tcLocal.push(loc);
    vib(30); renderTacho(); renderTimeBox();
    const drop = () => { tcLocal = tcLocal.filter(x => x !== loc); };
    apiQ('tacho.add', { op, truck: (tc && tc.truck) || '', workerId: me.role === 'водій' ? undefined : tc.worker, opId: op.id }, op.fix ? 'виправлення в «Мій час»' : 'режим «' + (TM[op.mode] ? TM[op.mode][0] : op.kind) + '»')
      .then(r => { drop(); if (!r.queued) { tc = r; saveHomeTc(); } if (!$('tacho').hidden && !document.querySelector('.tsheet')) renderTacho(); renderTimeBox(); })
      .catch(e => { drop(); renderTacho(); renderTimeBox(); toast('<b>Не записано</b>: ' + esc(e.message), 'err'); });
    if (okText) toast(okText, '', op.fix || op.del ? null : { label: 'Скасувати', run: () => tachoUndo(op.id) });
    return op.id;
  }
  function tachoUndo(id) {
    const q = outbox().find(x => x.action === 'tacho.add' && x.data.op.id === id);
    if (q && obSending(q)) { toast('Запис саме надсилається — спробуйте «Скасувати» за кілька секунд.'); return; }   // критик Н3
    if (q) { outboxSet(outbox().filter(x => x !== q && x.data.opId !== q.data.opId)); renderTacho(); renderTimeBox(); toast('Скасовано.'); return; }
    tachoSend({ fix: id, del: true }, 'Запис прибрано.');
  }
  /** Екран «Мій час». */
  function renderTacho() {
    const b = $('tcBody'); if (!b) return;
    if (!window.DRV) { b.innerHTML = '<p class="msg">Оновіть програму (потягніть сторінку вниз).</p>'; return; }
    const r = tcCalc(); if (!r) return;
    const office = me.role !== 'водій', ev = r.ev, x = r.text, now = r.now, started = todayStarted(r) && !office, m = todayStarted(r) ? ev.mode : null;
    const moving = tc.cur && tc.cur.moving && !tc.cur.stale && (tc.cur.speed || 0) > 10;
    let h = '<div class="tc-top"><div class="tc-now">' + (m ? 'Зараз: <b>' + esc(TM[m][0]) + '</b> з ' + hm(ev.modeFrom) : 'День ще не почато') + '</div>' +
      (office ? '<span class="muted small">' + (tc.truck ? 'машина ' + esc(tc.truck) : '') + '</span>' : started ? '<button class="btn" id="tcEnd"' + (moving ? ' disabled' : '') + '>Кінець дня</button>' : '<button class="primary" id="tcStart">Почати день</button>') + '</div>';
    h += '<section class="card timebox tone-' + x.tone + '"><div class="tb-main"><span class="tb-ico" aria-hidden="true">' + esc(x.icon) + '</span>' + esc(x.main) + '</div>' + (x.sub ? '<div class="tb-sub">' + esc(x.sub) + '</div>' : '') + '</section>';
    if (started) {
      h += '<p class="muted tc-hint">' + (moving ? 'Машина їде — доступні лише «Керую» і «Перерва». Виправлення — на стоянці.' : 'Змінився режим — натисніть один раз:') + '</p><div class="tc-modes">' +
        Object.keys(TM).filter(k => !moving || k === 'drive' || k === 'rest').map(k => '<button class="tc-mode' + (k === m ? ' on' : '') + '" data-mode="' + k + '">' + svgI(TM[k][2]) + '<b>' + esc(TM[k][0]) + '</b>' + (TM[k][1] ? '<small>' + esc(TM[k][1]) + '</small>' : '') + (k === m ? '<em>зараз</em>' : '') + '</button>').join('') + '</div>';
    }
    // GPS бачить інакше — одна підказка, найновіша, якщо водій її ще не закрив
    const dif = (ev.diffs || []).filter(d => !store.get('gpsAck_' + d.id)).pop();
    if (office) h += (ev.diffs || []).length ? '<section class="card tc-gps"><b>Відмітки водія і GPS розходяться</b>' + ev.diffs.map(d => '<p>' + hm(d.start) + '–' + hm(d.end) + ': водій — «' + esc(TM[d.mode][0]) + '», GPS — ' + d.gps + ' ' + fmtD(d.min) + '</p>').join('') + '<p class="muted small">Це не порушення: GPS не бачить завантаження, митницю, пором. Уточніть у водія, якщо важливо.</p></section>' : '';
    else if (dif && !moving) h += '<section class="card tc-gps"><b>GPS бачить інакше</b><p>' + hm(dif.start) + '–' + hm(dif.end) + ': у вас «' + esc(TM[dif.mode][0]) + '», а GPS ' + (dif.gps === 'рух' ? 'бачив рух ' + fmtD(dif.min) : 'бачив стоянку ' + fmtD(dif.min)) + '.</p>' +
      '<div class="ask-btns"><button class="btn" id="gpsOk">Усе правильно</button><button class="primary" id="gpsFix">Виправити</button></div></section>';
    // перевищення — червоним і словами «понад норму на …», а не тим самим жирним, що й норма (дизайн-огляд 21.11)
    const lim = (name, v, max, of) => { v = v || 0; const over = v > max; return '<div class="' + (over ? 'bad' : '') + '"><span>' + name + '</span><b>' + fmtD(v) + ' з ' + of + (over ? '<small>⚠ понад норму на ' + fmtD(v - max) + '</small>' : '') + '</b></div>'; };
    h += '<section class="card tc-nums"><h2>Орієнтовно на сьогодні</h2>' +
      lim('За кермом без перерви', ev.cont, 270, '4 год 30 хв') +
      lim('За кермом сьогодні', ev.day, ev.dayLimit > 540 ? 600 : 540, ev.dayLimit > 540 ? '9 (можна 10)' : '9') +
      lim('Цей тиждень', ev.week, 3360, '56 год') +
      lim('Два тижні', ev.twoWeek, 5400, '90 год') +
      (ev.source !== 'manual' ? '<p class="muted small">' + (ev.source === 'gps' ? 'Поки за GPS. Відмічайте режими — буде точніше.' : 'Частина часу — за GPS (схоже, режим не перемкнули).') + '</p>' : '') + '</section>';
    h += recordsHtml(r, now);
    h += '<details class="card tc-more"><summary>Показати весь день і тиждень</summary>' + sheetHtml(r, now) + weekHtml(r, now) + '</details>';
    h += '<p class="muted small tc-foot">' + (office ? 'Орієнтовно: відмітки водія, де їх немає — GPS. Остаточно — тахограф водія. Оцінка не є доказом проти водія.' : 'Це ваш облік і підказка, не штраф і не контроль. Числа приблизні. Офіційно рахує тахограф.') + '</p>';
    b.innerHTML = h;
    b.querySelectorAll('[data-mode]').forEach(e => e.onclick = () => {
      const k = e.dataset.mode; if (k === m) return;
      tachoSend({ kind: 'mode', mode: k }, '«' + esc(TM[k][0]) + '» з ' + hm(Date.now()) + ' записано');
    });
    if ($('tcStart')) $('tcStart').onclick = () => tachoDay('dayStart');
    if ($('tcEnd')) $('tcEnd').onclick = () => tachoDay('dayEnd');
    if ($('gpsOk')) $('gpsOk').onclick = () => { store.set('gpsAck_' + dif.id, '1'); renderTacho(); };
    if ($('gpsFix')) $('gpsFix').onclick = () => tachoEdit(r.list.find(y => y.id === dif.id), dif.gpsAt);
    b.querySelectorAll('[data-edit]').forEach(e => e.onclick = () => tachoEdit(r.list.find(y => y.id === e.dataset.edit)));
    if ($('tcAdd')) $('tcAdd').onclick = () => tachoEdit(null);
  }
  /** Стрічка доби «як на аркуші»: 4 доріжки ручних відміток + доріжка GPS. */
  function sheetHtml(r, now, day) {
    const d0 = new Date(day || now); d0.setHours(0, 0, 0, 0); const a = d0.getTime(), bnd = a + 86400000, pct = t => ((Math.min(Math.max(t, a), bnd) - a) / 864000).toFixed(2);
    const lane = (k, segs, cls) => '<div class="lane"><span>' + k + '</span><div class="track">' + segs.filter(s => s.end > a && s.start < bnd).map(s => '<i class="' + cls + '" style="left:' + pct(s.start) + '%;width:' + Math.max(0.3, pct(s.end) - pct(s.start)) + '%"></i>').join('') +
      (now >= a && now < bnd ? '<u style="left:' + pct(now) + '%"></u>' : '') + '</div></div>';
    const man = r.man, sums = window.DRV.daySums(man, a + 12 * 3600000, now);
    const names = { drive: 'Керую', work: 'Робота', avail: 'Чекаю', rest: 'Відпочинок' };
    return '<section class="card tc-sheet"><h2>Доба ' + d0.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) + ' — як на аркуші</h2><div class="hours">' + [0, 6, 12, 18, 24].map(h => '<span style="left:' + (h / 24 * 100) + '%">' + h + '</span>').join('') + '</div>' +
      Object.keys(names).map(k => lane(names[k] + ' <b>' + fmtD(sums[k]) + '</b>', man.filter(s => s.mode === k), 'm-' + k)).join('') +
      lane('GPS: рух', r.gps.filter(s => s.type === 'drive'), 'm-gps') + '</section>';
  }
  function recordsHtml(r, now) {
    const lim = now - ((tc && tc.editDays) || 2) * 86400000, from = now - 2 * 86400000;
    const list = r.list.filter(x => x.at >= from).slice().reverse();
    const nextAt = id => { const i = r.list.findIndex(y => y.id === id); return i >= 0 && i + 1 < r.list.length ? r.list[i + 1].at : now; };
    return '<section class="card tc-recs"><h2>Мої відмітки (2 доби)</h2>' + (list.length ? list.map(x => {
      const mode = window.DRV.recMode(x), lab = x.kind === 'dayStart' ? 'Початок дня · ' + TM[mode][0] : x.kind === 'dayEnd' ? 'Кінець дня' : TM[mode][0];
      return '<div class="trec"><span class="tt">' + (new Date(x.at).toDateString() === new Date().toDateString() ? '' : new Date(x.at).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) + ' ') + hm(x.at) + '</span>' + svgI(TM[mode][2]) +
        '<div><b>' + esc(lab) + '</b><small>' + fmtD((nextAt(x.id) - x.at) / 60000) + [x.country, x.odo ? x.odo + ' км' : '', x.note].filter(Boolean).map(s => ' · ' + esc(s)).join('') + (x.edited ? ' · виправлено' : '') + (x.pending ? ' · ще на телефоні' : '') + '</small>' +
        (me.role !== 'водій' && x.hist && x.hist.length ? '<small class="thist">' + x.hist.map(hh => (hh.del ? 'видалено' : 'було ' + (hh.was.at ? hm(hh.was.at) : '?') + ' «' + esc(TM[window.DRV.recMode(hh.was)] ? TM[window.DRV.recMode(hh.was)][0] : '') + '»') + ' — змінено ' + new Date(hh.saved).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + (hh.by ? ' (' + esc(hh.by) + ')' : '')).join('; ') + '</small>' : '') + '</div>' +
        (x.at >= lim && !x.pending ? '<button class="btn icon" data-edit="' + esc(x.id) + '" aria-label="Виправити запис ' + hm(x.at) + '">' + svgI('M4 20h4L19 9l-4-4L4 16zM14 6l4 4') + '</button>' : '') + '</div>';
    }).join('') : '<p class="muted">Записів ще немає.</p>') + '<button class="link" id="tcAdd">+ Забув відмітити — додати</button>' +
      '<p class="muted small">Виправити можна записи за ' + ((tc && tc.editDays) || 2) + ' доби. Старші — попросіть логіста.</p></section>';
  }
  function weekHtml(r, now) {
    const ws = new Date(now); ws.setHours(0, 0, 0, 0); ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7));
    const days = []; for (let i = 0; i < 7; i++) { const a = ws.getTime() + i * 86400000; days.push({ a, d: 0 }); }
    (r.segs || []).forEach(s => { if (s.type !== 'drive') return; days.forEach(x => { const lo = Math.max(s.start, x.a), hi = Math.min(s.end, x.a + 86400000, now); if (hi > lo) x.d += (hi - lo) / 60000; }); });
    const dn = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'];
    return '<section class="card tc-week"><h2>Тиждень · за кермом</h2><div class="wbars">' + days.map((x, i) => '<div class="wb' + (x.a > now ? ' fut' : '') + '"><i style="height:' + Math.min(100, x.d / 600 * 100).toFixed(1) + '%"></i><b>' + (x.d >= 6 ? (x.d / 60).toFixed(1).replace('.0', '').replace('.', ',') : '') + '</b><span>' + dn[i] + '</span></div>').join('') +
      '<div class="w9" title="9 год"></div></div><p class="muted small">Пунктир — 9 год на день. Тиждень ' + fmtD(r.ev.week || 0) + ' з 56 · два тижні ' + fmtD(r.ev.twoWeek || 0) + ' з 90.' + (r.ev.weeklyRestDue ? ' Тижневий відпочинок — почати до ≈ ' + window.DRV.kWhen(r.ev.weeklyRestDue, now) + '.' : '') + '</p></section>';
  }
  /** Нижній аркуш (вікно знизу) для виправлення / початку і кінця дня. */
  function tsheet(title, html, onSave, extra) {
    const w = document.createElement('div'); w.className = 'ask-wrap'; w.innerHTML = '<div class="ask tsheet" role="dialog" aria-modal="true"><h2></h2>' + html + '<p class="msg" role="alert" id="tsMsg"></p><div class="ask-btns"><button class="btn" data-a="0">Скасувати</button><button class="primary" data-a="1">Зберегти</button></div>' + (extra || '') + '</div>';
    w.querySelector('h2').textContent = title; dlgOpener = document.activeElement; document.body.appendChild(w);
    const more = w.querySelector('.ccmore'); if (more) more.onclick = e => { e.stopPropagation(); w.querySelectorAll('.ccx').forEach(x => x.hidden = false); more.remove(); };
    const close = () => { w.remove(); renderTacho(); };
    w.onclick = e => { if (e.target === w) close(); const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === '0') close(); else { const err = onSave(w); if (err) w.querySelector('#tsMsg').textContent = err; else close(); } };
    return w;
  }
  const timeVal = ms => { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  function pickTime(w, dayOff) { const v = w.querySelector('#tsTime').value; if (!/^\d\d:\d\d$/.test(v)) return null; const d = new Date(); d.setDate(d.getDate() - (dayOff || 0)); d.setHours(+v.slice(0, 2), +v.slice(3), 0, 0); return d.getTime(); }
  const timeRow = ms => '<label for="tsTime">Час</label><div class="tsrow"><button class="btn" data-dt="-5">−5</button><input id="tsTime" type="time" value="' + timeVal(ms) + '"><button class="btn" data-dt="5">+5</button></div>';
  const bindTime = w => w.querySelectorAll('[data-dt]').forEach(b => b.onclick = e => { e.stopPropagation(); const i = w.querySelector('#tsTime'), [h, m] = i.value.split(':').map(Number), t = (h * 60 + m + +b.dataset.dt + 1440) % 1440; i.value = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    const raw = h * 60 + m + +b.dataset.dt, dc = w.querySelectorAll('[data-day]');   // через північ — перемкнути день (QA r2-Н6)
    if (dc.length && (raw < 0 || raw >= 1440)) { const cur = +chosen(w, '[data-day]', 'day') || 0, nx = Math.max(0, Math.min(dc.length - 1, cur + (raw < 0 ? 1 : -1))); dc.forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.day === nx))); } });
  const chipsSel = (w, sel) => w.querySelectorAll(sel).forEach(c => c.onclick = e => { e.stopPropagation(); w.querySelectorAll(sel).forEach(x => x.setAttribute('aria-pressed', String(x === c))); });
  const chosen = (w, sel, attr) => { const c = w.querySelector(sel + '[aria-pressed="true"]'); return c ? c.dataset[attr] : ''; };
  function tachoDay(kind) {
    const r = tcCalc(), hint = (tc && tc.hint) || {}, start = kind === 'dayStart';
    const cc = hint.country || ((r && r.list.length && r.list[r.list.length - 1].country) || 'UA');
    const odoText = o => o.ft ? 'З трекера: ' + o.odo + ' км (на ' + hm(new Date(o.at).getTime()) + '). Перевірте з приладом — якщо інакше, виправте.' : null;
    const odoT = hint.odo ? odoText(hint.odo) || (hint.odo.gpsKm ? 'Підказка: ' + hint.odo.odo + ' км (' + esc(hint.odo.src) + ' ' + hint.odo.base + ' + ' + hint.odo.gpsKm + ' км за GPS). Перевірте з приладом.' : 'Останнє: ' + hint.odo.odo + ' км (' + esc(hint.odo.src) + '). Перевірте з приладом.') : 'Спідометр можна дописати пізніше.';
    const startRec = r && r.list.slice().reverse().find(x => x.kind === 'dayStart');
    const html = timeRow(Date.now()) +
      '<label id="lbg0">День</label><div role="group" aria-labelledby="lbg0" class="chips">' + ['Сьогодні', 'Вчора'].map((t, i) => '<button class="chip" data-day="' + i + '" aria-pressed="' + (i === 0) + '">' + t + '</button>').join('') + '</div>' +   // забув відмітити ввечері — можна вчора (QA-14)
      '<label id="lbg1">Країна</label><div role="group" aria-labelledby="lbg1" class="chips ccbox">' + CC.map(c => '<button class="chip' + (c[0] === cc ? '' : ' ccx') + '" data-cc="' + c[0] + '" aria-pressed="' + (c[0] === cc) + '"' + (c[0] === cc ? '' : ' hidden') + '>' + c[1] + '</button>').join('') + '<button class="link ccmore" type="button">інша країна</button></div>' +
      (hint.place ? '<p class="muted small">За GPS ви біля: ' + esc(hint.place) + '</p>' : '') +
      '<label for="tsOdo">Спідометр, км</label><input id="tsOdo" inputmode="numeric" value="' + (hint.odo ? hint.odo.odo : '') + '"><p class="muted small" id="tsOdoT">' + odoT + '</p>' +
      (start ? '<label id="lbg2">З чого починаєте</label><div role="group" aria-labelledby="lbg2" class="chips">' + ['work', 'drive'].map(k => '<button class="chip" data-fm="' + k + '" aria-pressed="' + (k === 'work') + '">' + TM[k][0] + '</button>').join('') + '</div>'
        : (r ? '<p class="muted">За день: за кермом ' + fmtD(r.ev.day || 0) + (startRec && startRec.odo ? ' · спідометр зранку ' + startRec.odo + ' км' : '') + '.</p><p class="muted small">Далі програма сама почне «Відпочинок» і покаже, коли можна їхати.</p>' : ''));
    const w = tsheet(start ? 'Початок дня' : 'Кінець дня', html, w => {
      const at = pickTime(w, +chosen(w, '[data-day]', 'day') || 0); if (!at) return 'Вкажіть час';
      if (at > Date.now() + 5 * 60000) return 'Час ще не настав';
      const odo = w.querySelector('#tsOdo').value.replace(/\s/g, '');
      if (odo && !/^\d{3,7}$/.test(odo)) return 'Спідометр — лише цифри';
      const op = { kind, at, country: chosen(w, '[data-cc]', 'cc'), odo: odo ? +odo : '', odoSrc: odo ? ow.src() : '' };
      if (start) op.mode = chosen(w, '[data-fm]', 'fm') || 'work';
      const yd = new Date(at).toDateString() !== new Date().toDateString() ? 'вчора ' : '';
      tachoSend(op, start ? 'День почато ' + yd + 'о ' + hm(at) : 'День закінчено ' + yd + 'о ' + hm(at) + '. Гарного відпочинку!');
    });
    bindTime(w); chipsSel(w, '[data-cc]'); chipsSel(w, '[data-fm]'); chipsSel(w, '[data-day]');   // «Вчора» перемикається (QA r2-14)
    const ow = odoWidget(w.querySelector('#tsOdo'), w.querySelector('#tsOdoT'), () => (tc && tc.truck) || '');
    w.querySelector('[data-a="1"]').textContent = start ? 'Почати день' : 'Закінчити день';
  }
  function tachoEdit(rec, gpsAt) {
    const r = tcCalc(), lim = Date.now() - ((tc && tc.editDays) || 2) * 86400000;
    const at0 = gpsAt || (rec ? rec.at : Date.now() - 30 * 60000), mode0 = rec ? window.DRV.recMode(rec) : 'drive';
    const dOff = Math.max(0, Math.round((new Date().setHours(0, 0, 0, 0) - new Date(at0).setHours(0, 0, 0, 0)) / 86400000));
    const html = '<label>Що робили</label><div class="tc-modes small">' + Object.keys(TM).map(k => '<button class="tc-mode" data-em="' + k + '" aria-pressed="' + (k === mode0) + '">' + svgI(TM[k][2]) + '<b>' + TM[k][0] + '</b></button>').join('') + '</div>' +
      '<label id="lbg0">День</label><div role="group" aria-labelledby="lbg0" class="chips">' + ['Сьогодні', 'Вчора', 'Позавчора'].slice(0, ((tc && tc.editDays) || 2) + 1).map((t, i) => '<button class="chip" data-day="' + i + '" aria-pressed="' + (i === Math.min(dOff, 2)) + '">' + t + '</button>').join('') + '</div>' +
      timeRow(at0).replace('>Час<', '>Почав о<') + (gpsAt ? '<p class="muted small">За GPS машина рушила о ' + hm(gpsAt) + '.</p>' : '') + '<p class="muted small">Закінчив — до наступного запису (сусідні записи зсунуться самі).</p>' +
      '<label for="tsNote">Примітка (можна не писати)</label><div class="chips">' + ['Завантаження', 'Розвантаження', 'Митниця', 'Огляд машини', 'Заправка', 'Черга на кордоні', 'Пором'].map(c => '<button class="chip" data-note="' + c + '">' + c + '</button>').join('') + '</div><input id="tsNote" value="' + esc((rec && rec.note) || '') + '">' +
      (rec && rec.hist && rec.hist.length ? '<p class="muted small">Виправлено ' + rec.hist.length + ' раз(и) — логіст бачить історію.</p>' : '');
    const w = tsheet(rec ? 'Виправити запис' : 'Додати пропущений запис', html, w => {
      const at = pickTime(w, +chosen(w, '[data-day]', 'day') || 0); if (!at) return 'Вкажіть час';
      if (at > Date.now() + 5 * 60000) return 'Час ще не настав'; if (at < lim) return 'Так давно — лише через логіста';
      const op = { at, mode: chosen(w, '[data-em]', 'em') || mode0, note: w.querySelector('#tsNote').value.trim() };
      if (rec) { op.fix = rec.id; op.kind = rec.kind === 'dayEnd' ? 'mode' : rec.kind; if (rec.kind === 'dayStart') { op.country = rec.country; op.odo = rec.odo; } }
      else op.kind = 'mode';
      tachoSend(op, rec ? 'Запис виправлено' : 'Запис додано');
    }, rec ? '<button class="link danger-link" id="tsDel">Видалити запис</button>' : '');
    bindTime(w); chipsSel(w, '[data-em]'); chipsSel(w, '[data-day]');
    w.querySelectorAll('[data-note]').forEach(c => c.onclick = e => { e.stopPropagation(); const i = w.querySelector('#tsNote'); i.value = c.dataset.note; });
    if (w.querySelector('#tsDel')) w.querySelector('#tsDel').onclick = e => { e.stopPropagation(); w.remove(); tachoSend({ fix: rec.id, del: true }, 'Запис видалено'); };
  }
  function bindWork() { const c = document.querySelector('#homeWork .tkclick'); if (c) c.onclick = () => openTruck(); }

  async function openSheet(t) {
    busy(true); const nav = navSeq;
    try {
      const out = await api('list', { sheet: t.sheet });
      if (nav !== navSeq) return;
      current = { title: t.title, sheet: t.sheet, columns: out.columns, rows: out.rows };
      $('viewTitle').textContent = t.title; $('search').value = ''; if ($('viewNewTrip')) $('viewNewTrip').hidden = !(t.sheet === 'Рейси' && canTrip());
      renderTable(); show('view');
    } catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); }
  }

  function fmt(v) {
    if (v === '' || v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? '✓' : '';
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, dd] = v.split('-'); return dd + '.' + m + '.' + y; }   // логіст №18г
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) { const [d] = v.split('T'); const [y, m, dd] = d.split('-'); return dd + '.' + m + '.' + y; }
    return String(v);
  }

  function renderTable() {
    const q = $('search').value.trim().toLowerCase();
    const cols = current.columns;
    // нові записи зверху: у базі вони додаються в кінець
    let rows = current.rows.slice().reverse();
    if (q) rows = rows.filter(r => cols.some(c => fmt(r[c]).toLowerCase().includes(q)));
    $('count').textContent = rows.length + ' записів' + (rows.length > 300 ? ' (показано 300 — уточніть пошук)' : '');
    if (current.sheet === 'Заявки' && canTrip()) $('count').textContent += ' · натисніть заявку без рейсу, щоб створити рейс';
    const t = $('table'); t.innerHTML = '';
    const hr = t.createTHead().insertRow(); cols.forEach(c => { const th = document.createElement('th'); th.textContent = c; hr.appendChild(th); });
    const tb = t.createTBody();
    const isTrips = current.title && current.sheet === 'Рейси', isOrders = current.sheet === 'Заявки';
    // ADR-080: однакові рейси по Україні / контейнеровоз — одним рядком (машина + клієнт + маршрут + тип + тиждень)
    let gBtn = $('tGroupBtn');
    if (!gBtn) { gBtn = document.createElement('button'); gBtn.id = 'tGroupBtn'; gBtn.className = 'chip'; $('count').after(gBtn); gBtn.onclick = () => { store.set('tGroup', tGroupOn() ? '0' : '1'); renderTable(); }; }
    gBtn.hidden = current.sheet !== 'Рейси'; gBtn.setAttribute('aria-pressed', String(tGroupOn())); gBtn.textContent = 'Групувати однакові (Україна, контейнеровоз)';
    let list = rows.slice(0, 300).map(r => ({ r })), nGrp = 0;
    if (current.sheet === 'Рейси' && tGroupOn()) {
      const by = {}; list.forEach(x => { const k = tripGroupKey(x.r); if (k) (by[k] = by[k] || []).push(x.r); });
      const seen = {}; const out = [];
      list.forEach(x => { const k = tripGroupKey(x.r), g = k && by[k];
        if (!g || g.length < 2) { out.push(x); return; }
        if (seen[k]) return; seen[k] = 1; nGrp++;
        out.push({ g, k }); if (tOpen[k]) g.slice().sort((a, b) => String(a['Дата завантаження']).localeCompare(String(b['Дата завантаження']))).forEach(r => out.push({ r, sub: true })); });
      list = out;
    }
    if (nGrp) $('count').textContent += ' · згруповано ' + nGrp;
    list.forEach(({ r, g, k, sub }) => {
      if (g) { const tr = tb.insertRow(); tr.className = 'grow brow' + (tOpen[k] ? ' open' : ''); const td = tr.insertCell(); td.colSpan = cols.length; td.innerHTML = tripGroupHtml(g, k, cols); tr.title = 'Показати всі рейси групи'; tr.onclick = () => { tOpen[k] = !tOpen[k]; renderTable(); }; return; }
      const tr = tb.insertRow(); if (sub) tr.classList.add('gsub'); cols.forEach(c => { tr.insertCell().textContent = fmt(r[c]); });
      if (isTrips && r['Рейс ID']) { tr.classList.add('brow'); tr.title = 'Відкрити картку рейсу'; tr.onclick = () => openTrip(r['Рейс ID'], 'view'); }
      else if (isOrders && r['Рейс ID']) { tr.className = 'brow'; tr.title = 'Відкрити рейс ' + r['Рейс ID']; tr.onclick = () => openTrip(r['Рейс ID'], 'view'); }
      else if (isOrders && canTrip() && !/відмов/i.test(String(r['Статус'] || ''))) { tr.className = 'brow zrow'; tr.title = 'Створити рейс із цієї заявки'; tr.dataset.zid = r['Заявка ID']; tr.onclick = () => tripForm(null, { order: r }); } });
  }

  /* ── Групи однакових рейсів (ADR-080) ── */
  const tOpen = {};
  const tGroupOn = () => store.get('tGroup') !== '0';
  const REP_T = /^(по україні|контейнеровоз|ставка по україні)$/i;
  function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = t.getUTCFullYear(); return { y, w: Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7) }; }
  function tripGroupKey(r) {
    if (!REP_T.test(String(r['Тип'] || '').trim())) return '';
    const ds = tfDate(r['Дата завантаження']); if (!ds) return '';
    const wk = isoWeek(new Date(ds + 'T00:00:00')), n = x => String(x == null ? '' : x).trim().toLowerCase();
    return [n(r['Авто ID']), n(r['Клієнт ID']) || n(r['Клієнт (як записано)']), n(r['Звідки']), n(r['Куди']), n(r['Тип']), wk.y + '-' + wk.w].join('|');
  }
  function tripGroupHtml(g, k, cols) {
    const r0 = g[0], days = g.map(r => tfDate(r['Дата завантаження'])).sort(), d1 = new Date(days[0] + 'T00:00:00'), wk = isoWeek(d1);
    const mon = new Date(d1); mon.setDate(d1.getDate() - ((d1.getDay() + 6) % 7)); const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const dm = d => String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0');
    let money1 = '';
    if (cols.indexOf('Фрахт') >= 0) { const by = {}; g.forEach(r => { const v = +String(r['Фрахт'] == null ? '' : r['Фрахт']).replace(/[\s\u00a0]/g, '').replace(',', '.'); if (v) { const c = String(r['Валюта'] || ''); by[c] = (by[c] || 0) + v; } });
      money1 = Object.keys(by).map(c => money(Math.round(by[c] * 100) / 100) + '\u00a0' + c).join(' + '); }
    return '<span class="garr" aria-hidden="true">' + (tOpen[k] ? '▾' : '▸') + '</span> <b>' + g.length + ' однакових рейсів</b> · ' + esc(r0['Тип'] || '') + ' · ' + esc(String(r0['Авто ID'] || '')) + ' · ' + esc(r0['Клієнт (як записано)'] || r0['Клієнт ID'] || 'без клієнта') +
      ' · ' + esc([r0['Звідки'], r0['Куди']].filter(Boolean).join(' → ')) + ' <span class="muted">· тиждень ' + wk.w + ' (' + dm(mon) + '–' + dm(sun) + ') · дати: ' + days.map(d => d.slice(8, 10)).join(', ') + '.' + days[0].slice(5, 7) + '</span>' + (money1 ? ' · <b>разом ' + esc(money1) + '</b>' : '');
  }

  /* ── Дошка машин (етап 2, Board.gs) ── */
  let board = null, bFilter = store.get('bFilter') || 'all', bSortCan = !!store.get('bSortCan');
  const dd = s => s ? s.slice(8, 10) + '.' + s.slice(5, 7) : '';
  const daysFrom = s => s ? Math.round((new Date(new Date().toDateString()) - new Date(s + 'T00:00:00')) / 864e5) : 0;
  // Проблеми й стани на дошці — лінійна іконка + слово (дизайн-система §5, правила доступності §5). Текст проблеми — з сервера, повністю.
  const PROB = { doc: 'M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8zM14 3v5h5M9 13h6M9 17h4', tir: 'M4 21V4M4 4h11l-2 4 2 4H4',
    gps: 'M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z', trip: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    debt: 'M4 10h12M4 14h9M19 6a7.7 7.7 0 00-5.2-2A7.9 7.9 0 006 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2', drv: 'M12 4l9 16H3zM12 10v4M12 17h.01' };
  const flag = (k, text, urgent) => '<span class="flag ' + (urgent ? 'b' : 'w') + '">' + svgI(PROB[k] || PROB.drv) + '<span>' + (urgent ? '<span class="sr">Терміново: </span>' : '') + esc(text) + '</span></span>';
  const ST_GRP = { 'на завантаженні': 'go', 'завантажено': 'go', 'на розвантаженні': 'go', 'замитнення': 'wait', 'на кордоні': 'wait', 'кордон пройдено': 'wait', 'розмитнення': 'wait', 'розвантажено': 'ok' };
  const ST_ICO = { go: 'M3 16V7a1 1 0 011-1h10v10M14 9h4l3 3v4h-7M6.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm11 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z', wait: PROB.tir, ok: 'M5 12l5 5L20 7', warn: PROB.trip, plan: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z' };
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const badge = (g, t) => '<span class="badge b-' + g + '">' + svgI(ST_ICO[g]) + esc(t) + '</span>';
  /** Стан машини: крок рейсу від водія (x.trip.st) або «В рейсі»; вільна понад 3 дні — «увага». */
  function badgeOf(x) {
    if (x.status === 'trip') { const ev = x.trip.st && x.trip.st.event; return badge(ST_GRP[ev] || 'go', ev ? cap(ev) : 'В рейсі'); }
    if (x.status === 'free') return badge(daysFrom(x.since) > 3 ? 'warn' : 'ok', 'Вільна');
    return badge('plan', 'Немає рейсів');
  }
  /* ── Можливі дублі рейсів (логіст №9, ADR-087): та сама машина, дата завантаження і «Звідки» під різними номерами ── */
  let dups = null, dupsAt = 0;
  async function dupsCheck(force) {
    if (!me || ['адмін', 'керівник', 'логіст'].indexOf(me.role) < 0) return;
    if (!force && Date.now() - dupsAt < 5 * 60000 && dups) return dupsBar();
    try { dups = (await api('dups')).list; dupsAt = Date.now(); dupsBar(); } catch (e) {}
  }
  function dupsBar() {
    const b = $('dupBar'); if (!b) return; b.hidden = !(dups && dups.length);
    if (b.hidden) return;
    b.innerHTML = '<button class="link" id="dupOpen">⚠ Можливі дублі рейсів: <b>' + dups.length + '</b> — переглянути</button>';
    $('dupOpen').onclick = dupsOpen;
  }
  function dupsOpen() {
    const w = document.createElement('div'); w.className = 'ask-wrap';
    const body = () => (dups.length ? dups.map((g, i) => '<div class="dupg"><p><b>' + esc(g.truck) + '</b> · завантаження ' + esc(ddmm(g.day)) + ' · ' + esc(g.from) + '</p>' +
      g.trips.map(t => '<a href="#" class="drow" data-dupt="' + esc(t.id) + '"><div class="dmain"><b>' + esc(t.id) + '</b> → ' + esc(t.to || '?') + '<div class="muted small">' + esc([t.driver, t.client, t.freight ? t.freight + ' ' + t.cur : '', t.src].filter(Boolean).join(' · ')) + '</div></div></a>').join('') +
      '<button class="btn small" data-dupok="' + i + '">Не дубль — це різні рейси</button></div>').join('') : '<p class="muted">Дублів немає.</p>');
    w.innerHTML = '<div class="ask tsheet" role="dialog" aria-modal="true"><h2>Можливі дублі рейсів</h2><p class="muted small">Та сама машина, дата завантаження і «Звідки» під різними номерами — найчастіше рейс від бота чи з програми і той самий з «Маршрутів». Відкрийте рейс і виправте в «Маршрутах» (поки вони головні) або позначте «Не дубль». Програма нічого не видаляє сама.</p><div id="dupBody">' + body() + '</div><div class="ask-btns"><button class="btn" data-a="0">Закрити</button></div></div>';
    w.onclick = async e => {
      if (e.target === w || e.target.closest('[data-a="0"]')) { w.remove(); return; }
      const a = e.target.closest('[data-dupt]'); if (a) { e.preventDefault(); w.remove(); openTrip(a.dataset.dupt, 'board'); return; }
      const ok = e.target.closest('[data-dupok]'); if (ok) { const g = dups[+ok.dataset.dupok]; busy(true);
        try { await api('dups.ok', { key: g.key }); dups = dups.filter(x => x !== g); dupsBar(); w.querySelector('#dupBody').innerHTML = body(); (w.querySelector('[data-dupok]') || w.querySelector('[data-a="0"]')).focus(); toast('Позначено: не дубль.'); } catch (er) { toast(esc(er.message), 'err'); } finally { busy(false); } }
    };
    dlgOpener = document.activeElement; document.body.appendChild(w);
  }
  async function openBoard(force) {
    show('board'); const nav = navSeq; if ($('bNewTrip')) $('bNewTrip').hidden = !canTrip();
    dupsCheck(force);
    // одразу — збережена дошка (з позначкою, коли оновлено), свіжа — у фоні
    if (!board) { try { const c = JSON.parse(store.get('boardCache') || 'null'); if (c && c.login === me.login) board = c.b; } catch (e) {} }
    if (board) renderBoard(); else $('bRows').innerHTML = '<tr><td colspan="7" class="muted">Завантаження дошки…</td></tr>';
    $('bRefresh').disabled = true; $('bRefresh').textContent = '↻ Оновлюю…';
    try { const b = await api('board', force ? { force: true } : {}); board = b; try { store.set('boardCache', JSON.stringify({ login: me.login, b })); } catch (e) {} if (nav === navSeq) renderBoard(); }
    catch (e) { if (!board) $('bRows').innerHTML = '<tr><td colspan="7" class="msg">' + esc(e.message) + '</td></tr>'; else toast(esc(e.message), 'err', { label: 'Спробувати ще раз', run: () => openBoard(true) }); }
    finally { $('bRefresh').disabled = false; $('bRefresh').textContent = '↻ Оновити'; }
  }
  function tripText(t) { return t ? esc(t.from || '?') + ' → ' + esc(t.to || '?') : ''; }
  function stateOf(x) {
    if (x.status === 'trip') return { cls: 'st-trip', t: 'в рейсі' + (x.trip.unload ? ' до ' + dd(x.trip.unload) : '') };
    if (x.status === 'free') { const n = daysFrom(x.since); return { cls: n > 3 ? 'st-idle' : 'st-free', t: 'вільна з ' + dd(x.since) + (n > 0 ? ' · ' + n + ' дн' : '') }; }
    return { cls: 'st-none', t: 'немає рейсів' };
  }
  /** Де машина зараз (Freetrack, Track.gs): «📍 Мостиська, UA · їде 53 км/год» / «стоїть з 14:20». */
  function posHtml(id, short) {
    const P = board && board.pos, p = P && P.trucks && P.trucks[id]; if (!p) return '';
    const since = p.since ? (new Date(p.since).toDateString() === new Date().toDateString() ? tkTime(p.since).split(', ').pop() : tkTime(p.since)) : '';
    const what = p.moving ? 'їде' + (p.speed ? ' ' + p.speed + ' км/год' : '') : (since ? 'стоїть з ' + since : esc(p.text || ''));
    const link = 'https://www.google.com/maps?q=' + p.lat + ',' + p.lon;
    return '<div class="pos' + (P.stale ? ' stale' : '') + '"><a href="' + link + '" target="_blank" rel="noopener" title="Відкрити на карті">' + svgI(PROB.gps) + esc(p.place || 'на карті') + '</a> · ' + what +
      (short ? (P.stale ? ' · дані давні' : '') : '<div class="muted small">оновлено ' + tkTime(P.at).split(', ').pop() + (P.stale ? ' — давно: вночі місце не оновлюється' : '') + '</div>') + '</div>';
  }
  /** Час водія (Tacho.gs): з відміток водія, де їх немає — за GPS. Колір — не єдиний носій: є значок і слова. */
  function driveHtml(x) {
    const d = x.drive; if (!d) return '';
    return '<div class="bdrive tone-' + esc(d.tone) + '"><b>' + esc(d.icon) + ' ' + esc(d.main) + '</b>' + (d.sub ? '<small>' + esc(d.sub) + '</small>' : '') +
      '<small>' + (d.src === 'manual' ? 'за відмітками водія' : d.src === 'mixed' ? 'відмітки водія + GPS' : 'орієнтовно за GPS') + (d.diffs ? ' · розбіжностей з GPS: ' + d.diffs : '') + '</small></div>';
  }
  function gpsText(g) {
    if (!g) return '—';
    if (g.standSince) return 'стоїть з ' + dd(g.standSince);
    return (daysFrom(g.day) <= 1 ? 'вчора' : dd(g.day)) + ' ' + g.km + ' км';
  }
  function renderBoard() {
    const b = board, q = $('bSearch').value.trim().toLowerCase();
    $('bSub').textContent = 'Сьогодні ' + dd(b.today) + ' · оновлено о ' + b.updated + (b.pos && b.pos.at ? ' · місце машин на ' + tkTime(b.pos.at).split(', ').pop() + (b.pos.stale ? ' (давно: вночі не оновлюється)' : '') : '') + (b.gpsError ? ' · GPS недоступний (' + b.gpsError + ')' : '');
    const F = { all: ['Усі', () => true], trip: ['В рейсі', x => x.status === 'trip'], free: ['Вільні', x => x.status === 'free'],
      prob: ['З проблемами', x => x.problems.some(p => p.urgent || p.k === 'drv' || p.k === 'gps')],   // лише термінове (логіст №4)
      can: ['Можуть їхати зараз', x => !!(x.drive && x.drive.canNow && !x.drive.moving)],
      soon: ['Скоро перерва', x => !!(x.drive && (x.drive.tone === 'soon' || x.drive.tone === 'red'))],
      rest: ['Перерва / відпочинок', x => !!(x.drive && x.drive.tone === 'rest' && !x.drive.canNow)] };
    if (!F[bFilter]) bFilter = 'all';
    $('bChips').innerHTML = '';
    Object.keys(F).forEach(k => {
      const c = document.createElement('button'); c.className = 'chip'; c.setAttribute('aria-pressed', String(bFilter === k));
      c.innerHTML = esc(F[k][0]) + ' <small>' + b.trucks.filter(F[k][1]).length + '</small>';
      c.onclick = () => { bFilter = k; store.set('bFilter', k); renderBoard(); }; $('bChips').appendChild(c);
    });
    const hay = x => [x.id, x.plate, x.trailer, ...x.drivers.map(d => d.name), ...[x.trip, x.next, x.last].filter(Boolean).flatMap(t => [t.id, t.from, t.to, t.client || ''])].join(' ').toLowerCase();
    const list = b.trucks.filter(F[bFilter][1]).filter(x => !q || hay(x).includes(q));
    if (bSortCan) {                                                  // «хто раніше може їхати»: вільні зараз → за часом «може з» → без даних
      const k = x => !x.drive ? 9e15 : x.drive.moving ? 8e15 : x.drive.canNow ? 0 : (x.drive.canAt || 7e15);
      list.sort((a, c) => k(a) - k(c));
    }
    const sb = document.createElement('button'); sb.className = 'chip'; sb.setAttribute('aria-pressed', String(bSortCan));
    sb.textContent = '↑ Хто раніше може їхати'; sb.onclick = () => { bSortCan = !bSortCan; store.set('bSortCan', bSortCan ? '1' : ''); renderBoard(); }; $('bChips').appendChild(sb);
    $('bEmpty').hidden = list.length > 0;
    $('bEmptyT').textContent = q ? 'Нічого не знайдено' : bFilter === 'prob' ? 'Машин з проблемами немає' : 'Тут поки немає машин';
    $('bEmptyH').textContent = q ? 'Спробуйте номер машини або прізвище водія.' : 'Зміниться після наступного оновлення дошки.';
    $('bReset').hidden = !q && bFilter === 'all';
    const tb = $('bRows'); tb.innerHTML = ''; const cards = $('bCards'); cards.innerHTML = '';
    list.forEach(x => {
      const t = x.trip || x.last, s = x.trip && x.trip.st, nd = daysFrom(x.since);
      const drv = x.drivers.length ? x.drivers.map(d => '<b>' + esc(d.name) + '</b>' + (d.fromTrip ? ' <span class="muted">(за рейсом)</span>' : '') + (d.fromApp ? ' <span class="ok-mark">✓ прийняв' + (d.since ? ' ' + dd(d.since) : '') + '</span>' : '')).join(', ') : '<span class="muted">водія не вказано</span>';
      const trl = x.trailer ? '<span class="plate trl" title="Причіп"><span class="sr">причіп </span>' + esc(String(x.trailer).replace(/^П(?=\d)/, '')) + '</span>' : '<span class="muted">без причепа</span>';
      const flags = x.problems.map(p => flag(p.k, p.t, p.urgent)).join('');
      const route = t ? '<div class="broute">' + tripText(t) + '</div><div class="bsub">' + esc(t.id) + (t.client ? ' · ' + esc(t.client) : '') + (x.trip ? '' : ' · останній') + '</div>' : '<span class="muted">немає рейсу</span>';
      const stSub = x.trip ? (s ? 'з ' + tkTime(s.at) : 'кроків від водія ще немає') : x.status === 'free' ? 'з ' + dd(x.since) + (nd > 0 ? ' · ' + nd + ' дн' : '') : '';
      const stHtml = badgeOf(x) + (stSub ? '<div class="bsub">' + esc(stSub) + '</div>' : '') + (x.ech ? '<div class="bsub">' + esc(echShort(x.ech)) + '</div>' : '') + (x.gpsHint ? '<div class="bhint">' + svgI(PROB.gps) + esc(x.gpsHint.text) + '</div>' : '');
      const unl = x.trip ? (x.trip.unload ? '<b class="tnum">' + dd(x.trip.unload) + '</b>' : '<span class="muted">дата не вказана</span>') : '<span class="muted">—</span>';
      const next = x.next ? '<div class="bsub">далі: ' + tripText(x.next) + ', ' + dd(x.next.load) + (x.next.order ? ' · заявка' : '') + '</div>' : '';
      const tr = tb.insertRow(); tr.className = 'brow';
      tr.innerHTML = '<td><button type="button" class="bopen" aria-expanded="false" aria-label="Машина ' + esc(x.id) + ': показати деталі"><span class="plate ua">' + esc(x.id) + '</span></button></td>' +
        '<td><div class="bdrv"><div>' + drv + '</div>' + trl + '</div></td>' +
        '<td>' + route + '</td>' +
        '<td><div class="bst">' + stHtml + '</div></td>' +
        '<td>' + unl + next + '</td>' +
        '<td>' + posHtml(x.id, true) + driveHtml(x) + '<div class="bsub">пробіг: ' + esc(gpsText(x.gps)) + '</div></td>' +
        '<td><div class="flags">' + flags + '</div></td>';
      const det = tb.insertRow(); det.className = 'bdet'; det.hidden = true;
      det.innerHTML = '<td colspan="7">' + detail(x) + '</td>';
      const ob = tr.querySelector('.bopen');
      tr.onclick = () => { det.hidden = !det.hidden; tr.classList.toggle('open', !det.hidden); ob.setAttribute('aria-expanded', String(!det.hidden)); };
      const c = document.createElement('details'); c.className = 'bcard';
      c.innerHTML = '<summary><div class="bc1"><span class="plate ua">' + esc(x.id) + '</span><span class="bwho">' + drv + '</span>' + badgeOf(x) + '</div>' +
        route + (x.trip && x.trip.unload ? '<div class="bsub">розвантаження ' + dd(x.trip.unload) + '</div>' : '') + (stSub ? '<div class="bsub">' + esc(stSub) + '</div>' : '') +
        posHtml(x.id, true) + driveHtml(x) + (x.ech ? '<div class="bsub">' + esc(echShort(x.ech)) + '</div>' : '') + (x.gpsHint ? '<div class="bhint">' + svgI(PROB.gps) + esc(x.gpsHint.text) + '</div>' : '') +
        (flags ? '<div class="flags">' + flags + '</div>' : '') + '<span class="bmore"><span class="m1">Деталі</span><span class="m2">Згорнути</span></span></summary>' + detail(x);
      cards.appendChild(c);
    });
    const qu = b.queue || []; $('bQueue').hidden = false; $('bQueueN').textContent = qu.length;
    $('bQueueList').innerHTML = (b.queueError ? '<p class="msg small">Реєстр причепів недоступний: ' + esc(b.queueError) + '</p>' : '') + (qu.length ? '' : '<p class="muted">Зараз немає завантажених причепів, що чекають тягач.</p>') + qu.map(z => '<div class="wrow qrow"><span class="plate">' + esc(z.trailer || '?') + '</span> <b>' + tripText(z) + '</b>' +
      (z.waitDays != null ? ' <span class="pill ' + (z.waitDays >= 2 ? 'st-idle' : 'st-free') + '">' + (z.waitDays ? 'чекає ' + z.waitDays + ' дн' : 'сьогодні') + '</span>' : '') +
      '<div class="muted small">' + [z.load && 'завантаження ' + dd(z.load), z.cargo && esc(z.cargo), z.adr && 'АДР', z.border && esc(z.border), z.client && esc(z.client),
        z.freight && esc(z.freight) + ' ' + esc(z.currency || ''), z.truck && 'призначено ' + esc(z.truck) + ', ще не внесено'].filter(Boolean).join(' · ') + '</div></div>').join('');
    const w = b.waiting || []; $('bWait').hidden = !w.length; $('bWaitN').textContent = w.length;
    $('bWaitList').innerHTML = w.map(z => '<div class="wrow"><b>' + tripText(z) + '</b> <span class="muted">' + (z.load ? 'завантаження ' + dd(z.load) : '') + (z.client ? ' · ' + esc(z.client) : '') + ' · ' + esc(z.status || 'нова') + '</span></div>').join('');
  }
  /* єЧерга (листи єЧерги → Echerha.gs): короткий стан і посилання на сторінку черги за номером */
  function echLatin(p) { const m = { 'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'І': 'I', 'К': 'K', 'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X', 'У': 'Y' }; return String(p || '').toUpperCase().replace(/[\s-]/g, '').replace(/[АВСЕНІКМОРТХУ]/g, c => m[c]); }
  function hrs(h) { if (h == null || h === '') return ''; const d = Math.floor(h / 24), r = Math.round(h - d * 24); return d ? d + ' д ' + r + ' год' : r + ' год'; }
  function tm(iso) { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  function echShort(e) {
    if (!e) return '';
    if (e.state === 'у черзі') return 'єЧерга: чекає ' + hrs(e.waited) + (e.typical ? ' (зазвичай ' + hrs(e.typical.med) + ')' : '');
    if (e.state === 'готуйтесь') return 'єЧерга: готуйтесь' + (e.eta ? ', ' + e.eta : '');
    if (e.state === 'викликано') return 'єЧерга: викликано ' + tm(e.call) + (e.checkpoint ? ' · ' + e.checkpoint : '');
    return 'єЧерга: скасовано ' + tm(e.cancel);
  }
  function echRow(x) {
    const e = x.ech, plate = (e && e.plate) || echLatin(x.plate);
    const link = plate ? ' <a href="https://echerha.gov.ua?plate_number=' + encodeURIComponent(plate) + '" target="_blank" rel="noopener">Черга ↗</a>' : '';
    if (!e) return link ? '<div><span class="muted">єЧерга:</span> листів за 2 тижні немає ·' + link + '</div>' : '';
    const parts = [esc(e.state)];
    if (e.checkpoint || e.typicalAt) parts.push(esc(e.checkpoint || e.typicalAt));
    if (e.reg) parts.push('зареєстровано ' + tm(e.reg));
    if (e.state === 'у черзі') parts.push('чекає ' + hrs(e.waited) + (e.typical ? ' · зазвичай ' + hrs(e.typical.p25) + '–' + hrs(e.typical.p75) + ' (' + e.typical.n + ' записів)' : ''));
    if (e.call) parts.push('викликано ' + tm(e.call));
    if (e.eta) parts.push('орієнтовно ' + esc(e.eta));
    if (e.cancel) parts.push('скасовано ' + tm(e.cancel) + (e.reason ? ' (' + esc(e.reason) + ')' : ''));
    return '<div><span class="muted">єЧерга:</span> ' + parts.join(' · ') + ' ·' + link + '</div>';
  }
  function detail(x) {
    const row = (k, v) => v ? '<div><span class="muted">' + k + '</span> ' + v + '</div>' : '';
    const t = x.trip || x.last;
    return '<div class="bdetail">' +
      row(x.trip ? 'Поточний рейс:' : 'Останній рейс:', t ? tripLink(t) + ' · ' + tripText(t) + ' · завантаження ' + dd(t.load) + (t.unload ? ', розвантаження ' + dd(t.unload) : ', дата розвантаження не вказана') + (t.client ? ' · ' + esc(t.client) : '') : '') +
      row('Далі:', x.next ? tripLink(x.next) + ' · ' + tripText(x.next) + ' · ' + dd(x.next.load) + (x.next.order ? ' (заявка' + (x.next.status ? ': ' + esc(x.next.status) : '') + ')' : '') : '') +
      row('Кругорейс:', x.circle ? esc(x.circle.id) + (x.circle.status ? ' · ' + esc(x.circle.status) : '') : '') +
      row('Держномер:', esc(x.plate)) + echRow(x) +
      (x.drive && x.drive.worker ? '<div><button class="btn tdrv" data-tdrv="' + esc(x.drive.worker) + '" data-truck="' + esc(x.id) + '" data-name="' + esc((x.drivers[0] || {}).name || '') + '">Час водія докладно — аркуш доби, відмітки, GPS</button></div>' : '') +
      (x.problems.length ? '<div class="flags">' + x.problems.map(p => flag(p.k, p.t, p.urgent)).join('') + '</div>' : '<div class="muted">Проблем не знайдено.</div>') +
      '</div>';
  }

  /* ── Картка рейсу (етап 2): перегляд одного рейсу з усім, що до нього прив'язано ── */
  let tripFrom = 'board';
  function tripLink(t) {
    if (t.order) return esc(t.id);
    return '<a href="#" class="tlink" data-trip="' + esc(t.id) + '">' + esc(t.id) + '</a>';
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-tdrv]');
    if (t) { e.preventDefault(); e.stopPropagation(); openTacho(null, { id: t.dataset.tdrv, truck: t.dataset.truck, name: t.dataset.name }); return; }
    const a = e.target.closest && e.target.closest('[data-trip]');
    if (a) { e.preventDefault(); e.stopPropagation(); openTrip(a.dataset.trip, 'board'); }
  }, true);
  const money = v => (v === '' || v == null) ? '' : (typeof v === 'number' ? v.toLocaleString('uk-UA', { maximumFractionDigits: 2 }) : String(v));
  /* ── Логіст: новий рейс і виправлення в програмі (ADR-072, пілот логістів) ──
     Зберігає звичайний 'save' (журнал змін, захист від одночасних змін, причина зміни фрахту). Тип рахується сам — як у нічному перенесенні. */
  const TF_ROLES = ['адмін', 'керівник', 'логіст', 'бухгалтер'];
  const canTrip = () => me && TF_ROLES.indexOf(me.role) >= 0;
  let tfLists = null;
  async function tfLoad() {
    if (tfLists) return tfLists;
    const [a, w, c, t] = await apiBatch([{ action: 'list', sheet: 'Авто' }, { action: 'list', sheet: 'Працівники' }, { action: 'list', sheet: 'Клієнти' }, { action: 'list', sheet: 'Рейси', filter: { 'Рейс ID': '—' } }]);
    if (a instanceof Error) throw a;
    tfLists = { trucks: a.rows.filter(x => x['Активне'] !== false).map(x => String(x['Авто ID'])).sort(),
      drivers: w instanceof Error ? [] : w.rows.filter(x => /водій/i.test(x['Посада'] || '') && x['Працює'] !== false).map(x => ({ id: String(x['Працівник ID']), name: String(x['Прізвище'] || '') })).sort((x, y) => x.name.localeCompare(y.name, 'uk')),
      clients: c instanceof Error ? [] : [...new Set(c.rows.map(x => String(x['Назва'] || '').trim()).filter(Boolean))].slice(0, 600),
      cl: c instanceof Error ? [] : c.rows.filter(x => String(x['Назва'] || '').trim()).map(x => ({ id: String(x['Клієнт ID'] || ''), name: String(x['Назва']).trim(), code: String(x['Код (ЄДРПОУ / РНОКПП / VAT)'] || '').trim(), terms: x['Відстрочка, днів'] })),
      cols: t instanceof Error ? null : t.columns };
    return tfLists;
  }
  // «Оплата» — лише зі списку (логіст №3: у базі 25 написань); старі значення показуються як «(як було записано)»
  const TF_PAY = ['безгот', 'готівка', 'безгот + готівка', 'карта', 'безгот на розв', 'готівка на розв'];
  const tfType = (cross, adr) => { const j = String(cross || '').trim().toLowerCase(); return j === 'контейнеровоз' ? 'Контейнеровоз' : j === 'ставка по україні' ? 'Ставка по Україні' : adr ? 'АДР' : j === 'по україні' ? 'По Україні' : 'Міжнародка'; };
  const tfDate = v => { if (!v) return ''; const s = String(v); if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const d = new Date(s); return isNaN(d) ? s.slice(0, 10) : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); } return ''; };
  /** r — рядок рейсу (виправлення) або null (новий). opts.truck — машина для нового. */
  async function tripForm(r, opts) {
    opts = opts || {}; busy(true);
    let L, TPL = []; try { L = await tfLoad(); if (!r && !opts.order) { try { TPL = (await api('list', { sheet: 'Шаблони рейсів' })).rows.filter(x => x['Назва']).sort((a, b) => (+b['Використано'] || 0) - (+a['Використано'] || 0)); } catch (e) {} } }
    catch (e) { toast(esc(e.message), 'err'); return; } finally { busy(false); }
    const isNew = !r, z = opts.order || null;
    const TPL_F = ['Клієнт ID', 'Клієнт (як записано)', 'Звідки', 'Куди', 'Перехід', 'Вантаж', 'АДР', 'Фрахт', 'Валюта', 'Сума для рахунку', 'Готівкою', 'Оплата', 'Відстрочка, днів', 'Контакт клієнта', 'Адреса завантаження', 'Адреса розвантаження', 'Замитнення', 'Розмитнення', 'Примітки'];
    // ADR-075: рейс із заявки — поля підставляються з заявки, логіст лише перевіряє
    const zNum = z ? (String(z['Номер рейсу'] || '').match(/^\d+$/) ? String(z['Номер рейсу']) : ((String(z['Заявка ID'] || '').match(/-(\d+)$/) || [])[1] || '')) : '';   // номер із заявки Z-1105-302 → 302 (логіст №1)
    const fromZ = z ? { 'Авто ID': String(z['Авто ID'] || ''), 'Номер': zNum, 'Звідки': z['Звідки'] || '', 'Дата завантаження': z['Дата завантаження'] || '', 'Куди': z['Куди'] || '', 'Дата розвантаження': z['Дата розвантаження'] || '',
      'Фрахт': z['Фрахт'] == null ? '' : z['Фрахт'], 'Валюта': z['Валюта'] || 'EUR', 'Клієнт (як записано)': z['Клієнт (як записано)'] || '', 'Вантаж': z['Вантаж'] || '', 'Перехід': z['Перехід'] || '', 'Оплата': z['Оплата'] || 'безгот' } : null;
    const v = r || fromZ || { 'Авто ID': opts.truck || '', 'Валюта': 'EUR', 'Оплата': 'безгот' };
    const has = c => !L.cols || L.cols.indexOf(c) >= 0;
    // id поля з назви колонки: кирилиця раніше зникала (\W), і всі підписи вказували на одне id «tf_» — тепер кожен label[for] веде на своє поле
    const tfId = c => 'tf_' + Array.from(c).map(ch => /\w/.test(ch) ? ch : ch.codePointAt(0).toString(36)).join('');
    const inpR = (c, extra, type) => has(c) ? '<label for="' + tfId(c) + '">' + esc(c.replace(' (як записано)', '')) + '</label><input id="' + tfId(c) + '" data-c="' + esc(c) + '"' + (type ? ' type="' + type + '"' : '') + ' value="' + esc(type === 'date' ? tfDate(v[c]) : (v[c] == null ? '' : v[c])) + '"' + (extra || '') + '>' : '';
    const selR = (c, list, empty) => has(c) ? '<label for="' + tfId(c) + '">' + esc(c) + '</label><select id="' + tfId(c) + '" data-c="' + esc(c) + '">' + (empty ? '<option value="">' + empty + '</option>' : '') + list.map(o => '<option value="' + esc(o[0]) + '"' + (String(v[c] || '') === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>' : '';
    // підпис і поле — одна комірка сітки .tfgrid (інакше на ширині ≥ 900 px підписи стояли над чужими полями)
    const cell = h => h ? '<div class="tff">' + h + '</div>' : '';
    const inp = (c, extra, type) => cell(inpR(c, extra, type)), sel = (c, list, empty) => cell(selR(c, list, empty));
    const truckOpts = L.trucks.concat(v['Авто ID'] && L.trucks.indexOf(String(v['Авто ID'])) < 0 ? [String(v['Авто ID'])] : []).map(t => [t, t]);
    const drvOpts = L.drivers.map(d => [d.id, d.name + ' · ' + d.id]);
    const html = '<div class="tform">' +
      (z ? '<p class="muted small">З заявки <b>' + esc(z['Заявка ID']) + '</b>: перевірте поля й оберіть водія. Після створення заявка отримає позначку «рейс створено».</p>' : '') + (isNew ? '' : '<p class="muted small">Рейс <b>' + esc(v['Рейс ID']) + '</b>. Під час пілоту головні — «Маршрути»: зміну внесіть і там, інакше нічне перенесення збереже обидві версії (програма не затре вашу правку).</p>') +
      (isNew && !z && canTrip() ? '<fieldset class="tftpl"><legend>Шаблон</legend>' + (TPL.length ? '<label for="tfTpl">Із шаблону (постійні клієнти без заявок)</label><select id="tfTpl"><option value="">— заповнити вручну —</option>' + TPL.map((t, i) => '<option value="' + i + '">' + esc(t['Назва']) + (+t['Використано'] ? ' · ' + t['Використано'] + '×' : '') + '</option>').join('') + '</select>' : '<p class="muted small">Шаблонів ще немає. Заповніть рейс вручну — програма запропонує зберегти його як шаблон.</p>') +
        '<label class="tfchk" id="tfSaveTplW" hidden><input type="checkbox" id="tfSaveTpl"> Зберегти як шаблон:</label><input id="tfTplName" hidden placeholder="назва шаблону"></fieldset>' : '') +
      '<fieldset><legend>Машина і водій</legend><div class="tfgrid">' + (isNew ? sel('Авто ID', truckOpts, '— оберіть —') + inp('Номер', ' inputmode="numeric" placeholder="номер рейсу машини"') : sel('Авто ID', truckOpts, '— оберіть —')) + sel('Водій ID', drvOpts, '— ще не вирішили —') + '</div></fieldset>' +
      '<fieldset><legend>Маршрут</legend><div class="tfgrid">' + inp('Звідки', ' placeholder="місто завантаження"') + inp('Дата завантаження', '', 'date') + inp('Куди', ' placeholder="місто розвантаження"') + inp('Дата розвантаження', '', 'date') +
        inp('Перехід', ' list="tfCross" placeholder="Краківець, Шегині, по Україні…"') + inp('Вантаж') + '</div>' +
        (has('АДР') ? '<label class="tfchk"><input type="checkbox" id="tf_adr"' + (v['АДР'] ? ' checked' : '') + '> АДР (небезпечний вантаж)</label>' : '') + '<p class="muted small" id="tfType"></p>' +
        (isNew && !z ? '<div id="tfMoreW" hidden><label for="tfMore">Ще такі самі рейси — дати завантаження</label><input id="tfMore" placeholder="напр. 26.11, 27.11, 29.11" autocomplete="off"><p class="muted small">Кожна дата — окремий рейс з наступним номером; маршрут, клієнт, фрахт — однакові. У переліку рейсів вони покажуться одним рядком.</p></div>' : '') + '</fieldset>' +
      (has('Фрахт') ? '<fieldset><legend>Клієнт і оплата</legend><div class="tfgrid">' + '<div class="tff tfcl">' + inpR('Клієнт (як записано)', ' list="tfClients" autocomplete="off" placeholder="почніть вводити назву"') + (has('Клієнт ID') ? '<input type="hidden" data-c="Клієнт ID" value="' + esc(v['Клієнт ID'] || '') + '">' : '') +
        '<p class="muted small tfclhint" id="tfClHint"></p><button type="button" class="btn small" id="tfNewCl">+ Новий клієнт</button></div>' + inp('Фрахт', ' inputmode="decimal"') + sel('Валюта', ['EUR', 'UAH', 'USD', 'PLN'].map(x => [x, x])) +
        inp('Сума для рахунку', ' inputmode="decimal" placeholder="порожньо — як фрахт"') + inp('Причина різниці', ' placeholder="напр. повернення клієнту за…"') +
        sel('Оплата', TF_PAY.concat(v['Оплата'] && TF_PAY.indexOf(String(v['Оплата'])) < 0 ? [String(v['Оплата'])] : []).map(x => [x, TF_PAY.indexOf(x) < 0 ? x + ' (як було записано)' : x]), '— оберіть —') + '<div class="tff tfcash" id="tfCashW">' + inpR('Готівкою', ' inputmode="decimal" placeholder="скільки клієнт платить готівкою"') + '</div>' + inp('Відстрочка, днів', ' inputmode="numeric"') + inp('Контакт клієнта') + '</div>' +
        (has('Сума для рахунку') ? '<p class="muted small" id="tfInv"></p>' : '') + '<p class="muted small">Зарплата водію рахується від фрахту. Рахунок клієнту — на «Суму для рахунку» (більша, коли є повернення). Оплата «безгот + готівка» — вкажіть, скільки готівкою; рахунок — на решту.</p></fieldset>' : '') +
      '<fieldset><legend>Примітки</legend>' + (has('Примітки') ? '<textarea data-c="Примітки" rows="3">' + esc(v['Примітки'] || '') + '</textarea>' : '') + '</fieldset>' +
      (has('Простій, днів') ? '<fieldset><legend>Для зарплати водія</legend><p class="muted small">Факт фіксує логіст, скільки з цього водію — вирішує керівник.</p>' +
        inp('Простій, днів', ' inputmode="decimal" placeholder="0"') + sel('Причина простою', ['черга на кордоні', 'клієнт / склад', 'митниця', 'поломка', 'інше'].map(x => [x, x]), '—') +
        sel('Відмова / недовантаження', [['відмова', 'відмова (не завантажили)'], ['недовантаження', 'недовантаження'], ['перевантаження', 'перевантаження']], '— ні —') +
        sel('Допомагав', (() => { const o = L.drivers.map(d => { const sn = String(d.name || '').split(' ')[0]; return [sn, d.name]; }); const cur = String(v['Допомагав'] || ''); if (cur && !o.some(x => x[0] === cur)) o.unshift([cur, cur]); return o; })(), '— ніхто —') + inp('Допомога, грн', ' inputmode="numeric" placeholder="2000"') + '</fieldset>' : '') +
      '<datalist id="tfCross">' + ['Краківець', 'Шегині', 'Ягодин', 'Рава-Руська', 'Устилуг', 'Переїзд на експорт', 'Контейнеровоз', 'по Україні', 'Ставка по Україні'].map(x => '<option value="' + x + '">').join('') + '</datalist>' +
      '<datalist id="tfClients">' + L.cl.map(x => '<option value="' + esc(x.name) + '"' + (x.code ? ' label="' + esc(x.name + ' · ' + x.code) + '"' : '') + '>').join('') + '</datalist>' +
      '<p class="msg" role="alert" id="tfMsg"></p></div>';
    const w = document.createElement('div'); w.className = 'ask-wrap';
    w.innerHTML = '<div class="ask tsheet tfsheet" role="dialog" aria-modal="true"><h2>' + (isNew ? 'Новий рейс' : 'Виправити рейс') + '</h2>' + html + '<div class="ask-btns"><button class="btn" data-a="0">Скасувати</button><button class="primary" data-a="1">' + (isNew ? 'Створити рейс' : 'Зберегти зміни') + '</button></div></div>';
    document.body.appendChild(w);
    const q = s => w.querySelector(s), typeUpd = () => { if (q('#tfType')) q('#tfType').textContent = 'Тип рейсу: ' + tfType(q('[data-c="Перехід"]') ? q('[data-c="Перехід"]').value : v['Перехід'], q('#tf_adr') && q('#tf_adr').checked) + ' (рахується сам — для зарплати водія)'; };
    const moreUpd = () => { const m = q('#tfMoreW'); if (m) m.hidden = !REP_T.test(tfType(q('[data-c="Перехід"]') ? q('[data-c="Перехід"]').value : '', q('#tf_adr') && q('#tf_adr').checked)); };
    typeUpd(); moreUpd(); w.querySelectorAll('[data-c="Перехід"], #tf_adr').forEach(e => e.oninput = e.onchange = () => { typeUpd(); moreUpd(); });
    // ADR-073: дві суми — фрахт (від нього зарплата водію) і сума для рахунку (більша, коли є повернення клієнту)
    const tfNum = x => { const t = String(x == null ? '' : x).replace(/[\s\u00a0]/g, '').replace(',', '.'); return t === '' ? null : +t; };
    // ADR-078: «безгот + готівка» — поле «Готівкою»; рахунок — на решту
    const isMix = () => { const p = q('[data-c="Оплата"]'); return !!p && /безгот/i.test(p.value) && /готів/i.test(p.value); };
    const cashOf = () => { const c = q('[data-c="Готівкою"]'); return c && isMix() ? (tfNum(c.value) || 0) : 0; };
    const invUpd = () => { if (q('#tfCashW')) q('#tfCashW').hidden = !isMix() && !tfNum(q('[data-c="Готівкою"]') && q('[data-c="Готівкою"]').value);
      const el = q('#tfInv'); if (!el) return; const fr = tfNum(q('[data-c="Фрахт"]') && q('[data-c="Фрахт"]').value), iv = tfNum(q('[data-c="Сума для рахунку"]').value), cash = cashOf();
      el.className = 'muted small'; if (fr == null || isNaN(fr)) { el.textContent = ''; return; }
      const bill = iv == null || isNaN(iv) ? Math.round((fr - cash) * 100) / 100 : iv, diff = Math.round((bill + cash - fr) * 100) / 100;
      if (iv == null) { el.textContent = cash ? 'Готівкою ' + money(cash) + ', рахунок буде на ' + money(bill) + '.' : 'Рахунок буде на суму фрахту.'; return; }
      if (!diff) { el.textContent = cash ? 'Готівкою ' + money(cash) + ' + рахунок ' + money(bill) + ' = фрахт.' : ''; return; }
      if (diff > 0) el.textContent = 'Повернення клієнту: ' + money(diff) + '. Вкажіть причину різниці.';
      else { el.textContent = '⚠ Рахунок' + (cash ? ' + готівка' : '') + ' менші за фрахт на ' + money(-diff) + '. Якщо частину платять готівкою — оберіть оплату «безгот + готівка».'; el.className = 'small bad'; } };
    invUpd(); w.querySelectorAll('[data-c="Фрахт"], [data-c="Сума для рахунку"], [data-c="Готівкою"], [data-c="Оплата"]').forEach(e => e.addEventListener('input', invUpd));
    // ADR-079: шаблони рейсів
    const tplSel = q('#tfTpl'), tplName = () => { const g = c => (q('[data-c="' + c + '"]') || {}).value || ''; return [g('Клієнт (як записано)'), [g('Звідки'), g('Куди')].filter(Boolean).join(' → ')].filter(Boolean).join(' · '); };
    const tplUpd = () => { const w0 = q('#tfSaveTplW'); if (!w0) return; const cl = ((q('[data-c="Клієнт (як записано)"]') || {}).value || '').trim(); const on = !(tplSel && tplSel.value) && !!cl;
      w0.hidden = q('#tfTplName').hidden = !on; if (on && !q('#tfTplName').dataset.touched) q('#tfTplName').value = tplName(); };
    if (tplSel) tplSel.onchange = () => { const t = TPL[+tplSel.value]; if (t) TPL_F.forEach(c => { const e = q('[data-c="' + c + '"]'); if (e && t[c] != null && String(t[c]) !== '') e.value = String(t[c]); if (c === 'АДР' && q('#tf_adr')) q('#tf_adr').checked = !!t['АДР']; }); typeUpd(); invUpd(); tplUpd(); clUpd(); };
    // клієнт — з довідника «Клієнти» (логіст №3): Клієнт ID і ЄДРПОУ для рахунку; немає — «+ Новий клієнт»
    const clIn = q('[data-c="Клієнт (як записано)"]'), clId = q('[data-c="Клієнт ID"]');
    const clFind = n => { n = String(n || '').trim().toLowerCase(); return n ? L.cl.find(x => x.name.toLowerCase() === n) : null; };
    function clUpd() {
      if (!clIn) return; const c = clFind(clIn.value), h = q('#tfClHint');
      if (c) { if (clIn.value !== c.name) clIn.value = c.name; if (clId) clId.value = c.id;
        const tr = q('[data-c="Відстрочка, днів"]'); if (tr && !tr.value && c.terms !== '' && c.terms != null) tr.value = c.terms;
        h.textContent = '✓ з довідника' + (c.code ? ' · код ' + c.code : ' · ⚠ без ЄДРПОУ — рахунок не виставиться, допишіть у «Клієнти»'); h.className = 'muted small tfclhint'; }
      else { if (clId) clId.value = ''; h.textContent = clIn.value.trim() ? '⚠ Такого клієнта немає в довіднику — оберіть зі списку або «+ Новий клієнт»' : ''; h.className = 'small tfclhint warn'; }
    }
    if (clIn) { clIn.addEventListener('input', clUpd); clIn.addEventListener('change', clUpd); clUpd(); if (!isNew && !clFind(clIn.value)) q('#tfClHint').textContent = clIn.value.trim() ? 'Клієнт записаний як «' + clIn.value.trim() + '» — немає в довіднику. Можна лишити або вибрати зі списку.' : ''; }
    if (q('#tfNewCl')) q('#tfNewCl').onclick = async () => {
      const f = await askForm('Новий клієнт', [{ id: 'name', label: 'Назва (як називаєте)', value: clIn ? clIn.value.trim() : '', req: true }, { id: 'code', label: 'ЄДРПОУ / РНОКПП / VAT', mode: 'numeric', ph: 'для рахунку' }, { id: 'full', label: 'Повна назва (для рахунку)', ph: 'ТОВ «…»' }, { id: 'terms', label: 'Відстрочка оплати, днів', mode: 'numeric', ph: 'напр. 14' }], 'Додати клієнта', 'Клієнт з\'явиться в довіднику «Клієнти» для всіх.');
      if (!f) return;
      const ex = clFind(f.name); if (ex) { clIn.value = ex.name; clUpd(); toast('Такий клієнт уже є — вибрано його.'); return; }
      if (f.terms && !/^\d+$/.test(f.terms)) { toast('Відстрочка — числом днів', 'err'); return; }
      const row = { 'Назва': f.name }; if (f.code) row['Код (ЄДРПОУ / РНОКПП / VAT)'] = f.code; if (f.full) row['Повна назва'] = f.full; if (f.terms) row['Відстрочка, днів'] = f.terms;
      busy(true); try { const out = await api('save', { sheet: 'Клієнти', row }); const c = { id: String(out.row['Клієнт ID']), name: f.name, code: f.code, terms: f.terms };
        L.cl.push(c); const o = document.createElement('option'); o.value = c.name; q('#tfClients').appendChild(o); clIn.value = c.name; clUpd(); toast('Клієнта «' + esc(c.name) + '» додано.'); }
      catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); }
    };
    if (q('#tfTplName')) { q('#tfTplName').oninput = e => e.target.dataset.touched = '1'; w.querySelectorAll('[data-c="Клієнт (як записано)"], [data-c="Звідки"], [data-c="Куди"]').forEach(e => e.addEventListener('input', tplUpd)); tplUpd(); }
    // новий рейс: номер — наступний для машини (як у «Маршрутах»), можна виправити
    const truckHint = () => {   // логіст №8, №9: хто зараз на машині і чи вона ще в рейсі — з дошки (без заборони)
      const t = q('[data-c="Авто ID"]') && q('[data-c="Авто ID"]').value, bt = t && board && board.trucks ? board.trucks.find(x => x.id === t) : null; let h = '';
      if (bt && q('[data-c="Водій ID"]') && !q('[data-c="Водій ID"]').value && bt.drivers && bt.drivers[0] && bt.drivers[0].id && [...q('[data-c="Водій ID"]').options].some(o => o.value === bt.drivers[0].id)) { q('[data-c="Водій ID"]').value = bt.drivers[0].id; h += 'Водій — ' + esc(bt.drivers[0].name) + ' (зараз на машині). '; }
      if (bt && bt.trip && (!v || bt.trip.id !== v['Рейс ID'])) { const ld = q('[data-c="Дата завантаження"]') && q('[data-c="Дата завантаження"]').value; if (!bt.trip.unload || (ld && bt.trip.unload > ld)) h += '⚠ ' + esc(t) + ' ще в рейсі ' + esc(bt.trip.id) + ' (' + esc(bt.trip.from || '') + ' → ' + esc(bt.trip.to || '?') + (bt.trip.unload ? ', розвантаження ' + dd(bt.trip.unload) : ', розвантаження не вказане') + ') — це вкладений рейс?'; }
      if (q('#tfMsg') && (h || q('#tfMsg').dataset.hint)) { q('#tfMsg').innerHTML = h; q('#tfMsg').dataset.hint = h ? '1' : ''; } };
    w.querySelectorAll('[data-c="Авто ID"], [data-c="Дата завантаження"]').forEach(e => e.addEventListener('change', truckHint));
    if (board) setTimeout(truckHint, 50); else api('board').then(b => { if (!board) board = b; if (w.isConnected) truckHint(); }).catch(() => {});   // дошку ще не відкривали (шлях «Заявки → + рейс») — підтягуємо (логіст r2-3)
    if (!isNew && q('[data-c="Авто ID"]')) q('[data-c="Авто ID"]').addEventListener('change', e => { if (e.target.value !== String(v['Авто ID'] || '')) q('#tfMsg').innerHTML = '⚠ Рейс лишиться з номером ' + esc(v['Рейс ID']) + '. Поки головні — «Маршрути»: перенесіть там рядок на аркуш ' + esc(e.target.value) + ' з тим самим номером, інакше вночі з\'явиться дубль.'; });
    const sugg = async () => { const t = q('[data-c="Авто ID"]') && q('[data-c="Авто ID"]').value; if (!t || !q('[data-c="Номер"]') || q('[data-c="Номер"]').dataset.touched) return;
      try { const o = await api('list', { sheet: 'Рейси', filter: { 'Авто ID': t } }); const idn = x => +((String(x['Рейс ID'] || '').match(/-(\d+)$/) || [])[1] || 0);   // номер беремо й з «Рейс ID»: у рейсів від бота поле «Номер» буває порожнім (логіст №1)
        const n = Math.max(0, ...o.rows.map(x => Math.max(+x['Номер'] || 0, idn(x)))) + 1; if (!q('[data-c="Номер"]').dataset.touched) q('[data-c="Номер"]').value = n; } catch (e) {} };
    if (isNew) { if (q('[data-c="Номер"]')) { q('[data-c="Номер"]').oninput = e => e.target.dataset.touched = '1'; if (fromZ && /^\d+$/.test(String(fromZ['Номер']))) q('[data-c="Номер"]').dataset.touched = '1'; } if (q('[data-c="Авто ID"]')) q('[data-c="Авто ID"]').onchange = sugg; sugg(); }
    const close = () => w.remove();
    const save = async reason => {
      const row = {}; w.querySelectorAll('[data-c]').forEach(e => { const c = e.dataset.c; let val = e.value.trim(); if (c === 'Фрахт' || c === 'Сума для рахунку' || c === 'Готівкою' || c === 'Відстрочка, днів' || c === 'Номер' || c === 'Простій, днів' || c === 'Допомога, грн') val = val.replace(/\s/g, '').replace(',', '.');
        const old = c in v ? (e.type === 'date' ? tfDate(v[c]) : String(v[c] == null ? '' : v[c])) : ''; if (isNew || val !== old) row[c] = val; });
      if (q('#tf_adr')) { const a = q('#tf_adr').checked ? 'так' : ''; if (isNew || a !== String(v['АДР'] || '')) row['АДР'] = a; }
      const cross = 'Перехід' in row ? row['Перехід'] : v['Перехід'], adr = 'АДР' in row ? row['АДР'] : v['АДР'], tp = tfType(cross, adr);
      if (has('Тип') && (isNew || tp !== String(v['Тип'] || ''))) row['Тип'] = tp;
      if ('Водій ID' in row) { const d = L.drivers.find(x => x.id === row['Водій ID']); if (has('Водій (як записано)')) row['Водій (як записано)'] = d ? d.name : ''; }
      { const g = c => c in row ? row[c] : (v[c] == null ? '' : String(v[c])), fr = tfNum(g('Фрахт')), iv = tfNum(g('Сума для рахунку')), mix = /безгот/i.test(g('Оплата')) && /готів/i.test(g('Оплата')), cash = tfNum(g('Готівкою'));
        if (iv != null && (isNaN(iv) || iv < 0)) { q('#tfMsg').textContent = 'Сума для рахунку — числом'; return; }
        if (cash != null && (isNaN(cash) || cash < 0)) { q('#tfMsg').textContent = '«Готівкою» — числом'; return; }
        if (mix && !(cash > 0)) { q('#tfMsg').textContent = 'Оплата «безгот + готівка» — вкажіть, скільки готівкою'; return; }
        if (mix && fr != null && cash >= fr) { q('#tfMsg').textContent = 'Готівкою не може бути весь фрахт — тоді оберіть оплату «готівка»'; return; }
        if (!mix && cash > 0) row['Готівкою'] = '';
        const c0 = mix ? cash : 0;
        if (iv != null && fr != null && Math.abs(iv + c0 - fr) > 0.009 && !String(g('Причина різниці')).trim()) { q('#tfMsg').textContent = 'Рахунок' + (c0 ? ' + готівка' : '') + ' не дорівнює фрахту — вкажіть причину різниці'; return; } }
      if (clIn && 'Клієнт (як записано)' in row && row['Клієнт (як записано)'] && !clFind(row['Клієнт (як записано)'])) { q('#tfMsg').textContent = 'Клієнта «' + row['Клієнт (як записано)'] + '» немає в довіднику — оберіть зі списку або «+ Новий клієнт»'; return; }
      if (isNew && has('Оплата') && !row['Оплата']) { q('#tfMsg').textContent = 'Оберіть оплату'; return; }
      if (isNew) {
        if (!row['Авто ID']) { q('#tfMsg').textContent = 'Оберіть машину'; return; }
        if (!/^\d+$/.test(row['Номер'] || '')) { q('#tfMsg').textContent = 'Номер рейсу — цифрами'; return; }
        if (!row['Звідки'] || !row['Куди'] || !row['Дата завантаження']) { q('#tfMsg').textContent = 'Заповніть: звідки, куди, дата завантаження'; return; }
        var extra = [];
        if (q('#tfMoreW') && !q('#tfMoreW').hidden && q('#tfMore').value.trim()) {
          const y0 = +row['Дата завантаження'].slice(0, 4), bad = [];
          q('#tfMore').value.split(/[,;\s]+/).filter(Boolean).forEach(t => { const m = t.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/); if (!m) { bad.push(t); return; }
            const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : y0; const d = y + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); if (isNaN(new Date(d + 'T00:00:00'))) bad.push(t); else if (d !== row['Дата завантаження'] && extra.indexOf(d) < 0) extra.push(d); });
          if (bad.length) { q('#tfMsg').textContent = 'Не зрозуміла дати: ' + bad.join(', ') + ' — пишіть як 26.11'; return; }
          if (extra.length > 20) { q('#tfMsg').textContent = 'За раз — до 20 додаткових рейсів'; return; }
          extra.sort();
        }
        if (has('Джерело')) row['Джерело'] = 'програма (логіст ' + (me.name || me.login) + ')' + (z ? ' · заявка ' + z['Заявка ID'] : '');
        Object.keys(row).forEach(k => { if (row[k] === '') delete row[k]; });
      } else { if (!Object.keys(row).length) { close(); toast('Без змін.'); return; } row['Рейс ID'] = v['Рейс ID']; }
      const b = q('[data-a="1"]'); b.disabled = true; busy(true);
      try {
        const out = await api('save', { sheet: 'Рейси', row, ifHash: isNew ? undefined : v._h, reason });
        close(); board = null; try { store.set('boardCache', ''); } catch (e) {}
        if (z && isNew) { try { await api('save', { sheet: 'Заявки', row: { 'Заявка ID': z['Заявка ID'], 'Рейс ID': out.row['Рейс ID'], 'Статус': 'рейс створено' }, ifHash: z._h }); z['Рейс ID'] = out.row['Рейс ID']; z['Статус'] = 'рейс створено'; } catch (e) { toast('Рейс створено, але заявку не позначено: ' + esc(e.message), 'err'); } }
        let tplMsg = '';
        // ADR-080: ще такі самі рейси на інші дати — наступні номери
        if (isNew && typeof extra !== 'undefined' && extra.length) {
          const made = [], shift = row['Дата розвантаження'] ? Math.round((new Date(row['Дата розвантаження'] + 'T00:00:00') - new Date(row['Дата завантаження'] + 'T00:00:00')) / 864e5) : null;
          let num = +row['Номер'];
          for (const d of extra) {
            const r2 = Object.assign({}, row); num++; r2['Номер'] = String(num); r2['Дата завантаження'] = d;
            if (shift != null) { const u = new Date(d + 'T00:00:00'); u.setDate(u.getDate() + shift); r2['Дата розвантаження'] = u.getFullYear() + '-' + String(u.getMonth() + 1).padStart(2, '0') + '-' + String(u.getDate()).padStart(2, '0'); }
            try { const o2 = await api('save', { sheet: 'Рейси', row: r2 }); made.push(o2.row['Рейс ID']); }
            catch (e) { tplMsg += ' Рейс на ' + d.split('-').reverse().join('.') + ' не створено: ' + esc(e.message) + '.'; break; }
          }
          if (made.length) tplMsg = ' І ще ' + made.length + ': ' + made.map(esc).join(', ') + '.' + tplMsg;
        }
        if (isNew && !z && q('#tfSaveTplW')) {
          try {
            const used = tplSel && tplSel.value !== '' ? TPL[+tplSel.value] : null;
            if (used) await api('save', { sheet: 'Шаблони рейсів', row: { 'Шаблон ID': used['Шаблон ID'], 'Використано': (+used['Використано'] || 0) + 1, 'Останнє використання': new Date().toISOString().slice(0, 10) }, ifHash: used._h });
            else if (!q('#tfSaveTplW').hidden && q('#tfSaveTpl').checked) {
              const name = (q('#tfTplName').value || tplName()).trim(), same = TPL.find(t => String(t['Назва']).toLowerCase() === name.toLowerCase());
              const tr = { 'Назва': name, 'Використано': 1, 'Останнє використання': new Date().toISOString().slice(0, 10), 'Хто створив': me.name || me.login };
              TPL_F.forEach(c => { if (row[c] != null && row[c] !== '') tr[c] = row[c]; });
              if (same) { tr['Шаблон ID'] = same['Шаблон ID']; tr['Використано'] = (+same['Використано'] || 0) + 1; }
              await api('save', { sheet: 'Шаблони рейсів', row: tr, ifHash: same ? same._h : undefined }); tplMsg += ' Шаблон «' + esc(name) + '» ' + (same ? 'оновлено' : 'збережено') + '.';
            }
          } catch (e) { tplMsg += ' Шаблон не збережено: ' + esc(e.message); }
        }
        toast((isNew ? '✔ Рейс <b>' + esc(out.row['Рейс ID']) + '</b> створено.' : (out.saved ? '✔ Зміни збережено.' : 'Без змін.')) + tplMsg);
        openTrip(out.row['Рейс ID'], z ? 'view' : tripFrom);
      } catch (e) {
        b.disabled = false;
        if (e.code === 'reason') { const m = String(e.message || ''), both = /Фрахт/.test(m) && /Сума для рахунку/.test(m); const why = /Авто ID/.test(m) && !/Фрахт|Сума для рахунку|Готівкою/.test(m) ? await askText('Чому рейс переходить на іншу машину?', 'Напр. 1105 зламалась — завантажує 1951') : await askText('Чому змінюється ' + (both ? 'фрахт і сума для рахунку' : /Сума для рахунку/.test(m) ? 'сума для рахунку' : 'фрахт') + '?', 'Напр. клієнт погодив доплату за простій'); if (why) return save(why); q('#tfMsg').textContent = 'Без причини змінити суму не можна.'; }
        else if (e.code === 'dup') { if (await ask('Схоже, такий рейс уже є', e.message + '. Якщо це справді окремий рейс — створіть.', 'Так, окремий рейс')) return save('окремий рейс'); if (e.twin) { close(); openTrip(e.twin, tripFrom); } }   // логіст №1
        else if (e.code === 'conflict') { q('#tfMsg').textContent = 'Поки ви редагували, рейс змінив хтось інший. Закрийте вікно й відкрийте рейс заново.'; }
        else q('#tfMsg').textContent = e.message;
      } finally { busy(false); }
    };
    w.onclick = e => { const bt = e.target.closest('[data-a]'); if (!bt) return; if (bt.dataset.a === '0') close(); else save(); };
  }
  /** Коротке текстове питання (причина зміни). */
  function askText(title, ph, okText) {
    return new Promise(res => {
      const w = document.createElement('div'); w.className = 'ask-wrap';
      w.innerHTML = '<div class="ask" role="dialog" aria-modal="true"><h2></h2><textarea id="atx" rows="3" placeholder=""></textarea><div class="ask-btns"><button class="btn" data-a="0">Скасувати</button><button class="primary" data-a="1"></button></div></div>';
      w.querySelector('h2').textContent = title; w.querySelector('#atx').placeholder = ph || ''; w.querySelector('[data-a="1"]').textContent = okText || 'Зберегти';
      const hid = 'askT' + Date.now(); w.querySelector('h2').id = hid; w.querySelector('.ask').setAttribute('aria-labelledby', hid); w.querySelector('#atx').setAttribute('aria-labelledby', hid);
      w.querySelector('#atx').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); done(w.querySelector('#atx').value.trim()); } };
      const done = v => { w.remove(); res(v); };
      w.onclick = e => { const b = e.target.closest('[data-a]'); if (b) done(b.dataset.a === '1' ? w.querySelector('#atx').value.trim() : ''); };
      dlgOpener = document.activeElement; document.body.appendChild(w); w.querySelector('#atx').focus();
    });
  }

  /** Віконце з кількома полями: fields — [{id, label, type, value, ph, req}]. Повертає {id: значення} або null. */
  function askForm(title, fields, okText, note) {
    return new Promise(res => {
      const w = document.createElement('div'); w.className = 'ask-wrap';
      w.innerHTML = '<div class="ask" role="dialog" aria-modal="true"><h2></h2>' + (note ? '<p class="muted small">' + esc(note) + '</p>' : '') + fields.map(f => '<label for="af_' + f.id + '">' + esc(f.label) + '</label><input id="af_' + f.id + '" type="' + (f.type || 'text') + '" value="' + esc(f.value || '') + '" placeholder="' + esc(f.ph || '') + '"' + (f.mode ? ' inputmode="' + f.mode + '"' : '') + '>').join('') +
        '<p class="msg" id="afMsg"></p><div class="ask-btns"><button class="btn" data-a="0">Скасувати</button><button class="primary" data-a="1"></button></div></div>';
      w.querySelector('h2').textContent = title; w.querySelector('[data-a="1"]').textContent = okText || 'Зберегти';
      const val = () => fields.reduce((o, f) => (o[f.id] = w.querySelector('#af_' + f.id).value.trim(), o), {});
      const done = v => { w.remove(); res(v); };
      w.onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a !== '1') return done(null); const v = val(); const miss = fields.find(f => f.req && !v[f.id]); if (miss) { w.querySelector('#afMsg').textContent = 'Заповніть: ' + miss.label; return; } done(v); };
      w.querySelectorAll('input').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); w.querySelector('[data-a="1"]').click(); } });
      dlgOpener = document.activeElement; document.body.appendChild(w); w.querySelector('input').focus();
    });
  }
  /** Завантажити текст файлом на пристрій (CSV для BAS). */
  function saveFile(name, text, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/csv;charset=utf-8' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ── RMPD рейсу (з бота RMPD) і адреси рейсу (ADR-070) ── */
  const mapsUrl = q => 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q);
  const ADDR_L = { load: 'Завантаження', cOut: 'Замитнення', cIn: 'Розмитнення', unload: 'Розвантаження' };
  const rmpdMark = st => st === 'ok' ? '✓' : st === 'none' ? '—' : st === 'warn' ? '⚠' : '⏳';
  /** RMPD-файл: спершу з телефона (працює без інтернету на кордоні), інакше — з сервера, і зберігаємо на телефоні. */
  // файл RMPD — у сховищі IndexedDB (не забирає місце в черги); лише один, останній (QA-5)
  function rmpdCached(ver) { const c = RMPD_MEM; return c && (!ver || c.ver === ver) ? c : null; }
  async function rmpdFetch(tripId, ver) {
    const hit = rmpdCached(ver); if (hit) return hit;
    const r = await api('rmpd.file', { tripId });
    RMPD_MEM = { ver: r.ver, name: r.name, mime: r.mime, data: r.data, trip: tripId }; kvSet('rmpd', RMPD_MEM); store.del('rmpdFile');
    return r;
  }
  async function rmpdOpen(tripId, ver) {
    busy(true);
    try {
      const r = await rmpdFetch(tripId, ver); try { store.set('rmpdSeen_' + ver, '1'); } catch (e) {}
      if (/^image\//.test(r.mime)) {
        const w = document.createElement('div'); w.className = 'ask-wrap'; w.innerHTML = '<div class="ask exphotobox" role="dialog" aria-modal="true" aria-label="RMPD"><img alt="RMPD" src="data:' + esc(r.mime) + ';base64,' + r.data + '"><div class="ask-btns"><button class="primary">Закрити</button></div></div>';
        document.body.appendChild(w); w.querySelector('button').onclick = () => w.remove(); return;
      }
      const bin = atob(r.data), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([u], { type: r.mime || 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; if (/iP(hone|ad)/.test(navigator.userAgent)) a.download = r.name || 'RMPD.pdf';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { toast('<b>RMPD не відкрився</b>: ' + esc(e.message) + (navigator.onLine ? '' : ' Немає зв\'язку — відкрийте, коли з\'явиться інтернет.'), 'err'); }
    finally { busy(false); }
  }
  function rmpdCard(r, tripId, office) {
    if (!r) return '';
    return '<section class="card rmpdc st-' + r.state + '"><div class="rmpdh"><b>RMPD</b><span>' + rmpdMark(r.state) + ' ' + esc(r.label) + '</span></div>' +
      (r.state === 'ok' && r.who ? '<p class="muted small">' + esc(r.who) + (r.when ? ', ' + esc(r.when) : '') + '</p>' : '') +
      (office && r.issues ? '<p class="cnote">' + esc(r.issues) + '</p>' : '') +
      (r.file ? '<button class="' + (office ? 'btn' : 'primary') + ' rmpdgo" data-rmpd="' + esc(tripId) + '" data-ver="' + esc(r.ver) + '">📄 Відкрити RMPD</button>' : (r.state !== 'none' && !office ? '<p class="muted small">Файл з\'явиться тут, щойно логіст надішле його боту.</p>' : '')) + '</section>';
  }
  const bindRmpd = box => box.querySelectorAll('[data-rmpd]').forEach(b => b.onclick = () => rmpdOpen(b.dataset.rmpd, b.dataset.ver));
  /** Логіст: адреси рейсу (з заявки — бот; немає — вписати). */
  function addrCard(a, tripId, canEdit, need) {
    a = a || {}; const has = Object.keys(ADDR_L).some(k => a[k]);
    // ідея власниці №5: логіст бачить, яких адрес бракує водію (лише точки, що ще попереду)
    const miss = (need || []).filter(k => !a[k]).map(k => ADDR_L[k].toLowerCase());
    const drv = canEdit && need ? (miss.length ? '<p class="addrwarn">⚠ Водію бракує точних адрес: <b>' + esc(miss.join(', ')) + '</b>. Зараз водій бачить лише ' + (miss.some(m => /завант|розвант/.test(m)) ? 'місто' : 'назву переходу') + '.</p>' : '<p class="addrok">✓ Водій бачить усі адреси, що попереду.</p>') : '';
    return '<section class="card addrc"><h2>Адреси</h2>' + drv + Object.keys(ADDR_L).map(k => canEdit
      ? '<label for="ad_' + k + '">' + ADDR_L[k] + '</label><div class="adrow"><input id="ad_' + k + '" data-ad="' + k + '" value="' + esc(a[k] || '') + '" placeholder="вулиця, місто, індекс — або посилання з карти">' + (a[k] ? '<a class="btn" target="_blank" rel="noopener" href="' + esc(mapsUrl(a[k])) + '">Карта</a>' : '') + '</div>'
      : (a[k] ? '<div class="kv"><span>' + ADDR_L[k] + '</span><b><a target="_blank" rel="noopener" href="' + esc(mapsUrl(a[k])) + '">' + esc(a[k]) + '</a></b></div>' : '')).join('') +
      (canEdit ? '<p class="msg" role="alert" id="adMsg"></p><button class="primary" id="adSave" data-adtrip="' + esc(tripId) + '">Зберегти адреси</button><p class="muted small">Водій побачить кнопку «Навігація». З заявки адреси підтягує бот; чого немає — впишіть тут.</p>' : (has ? '' : '<p class="muted">Адрес ще немає.</p>')) + '</section>';
  }
  function bindAddr(box) {
    const b = box.querySelector('#adSave'); if (!b) return;
    b.onclick = async () => {
      const addr = {}; box.querySelectorAll('[data-ad]').forEach(i => addr[i.dataset.ad] = i.value.trim());
      b.disabled = true; busy(true);
      try { const r = await api('trip.addr', { tripId: b.dataset.adtrip, addr }); box.innerHTML = addrCard(r.addr, b.dataset.adtrip, true, box._need); bindAddr(box); toast(r.changed ? '✔ Адреси збережено.' : 'Без змін.'); }
      catch (e) { $('adMsg').textContent = e.message; b.disabled = false; }
      finally { busy(false); }
    };
  }
  /** Водій: наступна точка за кроками рейсу. */
  function navPoint(v) {
    const a = v.addr || {}, done = s => v.steps.some(x => x.step === s && x.at), has = s => v.steps.some(x => x.step === s);
    let k = 'load';
    if (done('завантажено')) k = has('замитнення') && !done('замитнення') && a.cOut ? 'cOut' : has('розмитнення') && done('кордон пройдено') && !done('розмитнення') && a.cIn ? 'cIn' : 'unload';
    const q = a[k] || (k === 'load' ? v.trip.from : k === 'unload' ? v.trip.to : '');
    return q ? { k, q, exact: !!a[k] } : null;
  }
  /** Водій: усі точки рейсу (ідея власниці №5) — завантаження, замитнення, перехід, розмитнення, розвантаження; пройдені позначені. */
  function routePoints(v) {
    const a = v.addr || {}, done = s => v.steps.some(x => x.step === s && x.at), has = s => v.steps.some(x => x.step === s), out = [];
    const add = (k, label, step, exact, city) => out.push({ k, label, q: exact || city || '', exact: exact || '', city: city || '', done: done(step) });
    add('load', 'Завантаження', 'завантажено', a.load, v.trip.from);
    if (has('замитнення')) add('cOut', 'Замитнення', 'замитнення', a.cOut, '');
    if (has('кордон пройдено') && v.trip.crossing) add('cross', 'Перехід', 'кордон пройдено', '', 'пункт пропуску ' + v.trip.crossing);
    if (has('розмитнення')) add('cIn', 'Розмитнення', 'розмитнення', a.cIn, '');
    add('unload', 'Розвантаження', 'розвантажено', a.unload, v.trip.to);
    return out;
  }
  const rptAddr = (p, v) => p.exact ? esc(p.exact) : p.k === 'cross' ? esc(v.trip.crossing) : p.city ? esc(p.city) + ' <span class="rwarn">· точну адресу уточнює логіст</span>' : '<span class="rwarn">адресу ще не надано — уточніть у логіста</span>';
  const rptNav = (p, cls) => p.q ? '<a class="' + cls + ' rnav" target="_blank" rel="noopener" href="' + esc(mapsUrl(p.q)) + '">' + svgI('M12 2l7 19-7-4-7 4z') + 'Навігація</a>' : '';
  /** На головній — лише актуальна адреса за статусом рейсу; «Усі адреси» — окремим віконцем (рішення власниці 23.11). */
  function routeCard(v) {
    const all = routePoints(v), p = all.find(x => !x.done); if (!p) return '';
    return '<section class="card drvroute" aria-label="Куди їхати зараз"><div class="rlab rnow">Зараз — ' + esc(p.label.toLowerCase()) + '</div><div class="raddr rbig">' + rptAddr(p, v) + '</div>' +
      '<div class="rbtns">' + rptNav(p, 'primary') + '<button class="btn" id="rAll">Усі адреси (' + all.length + ')</button></div></section>';
  }
  function routeAll() {
    const v = stCur; if (!v || !v.trip) return; const all = routePoints(v), cur = all.find(x => !x.done);
    const w = document.createElement('div'); w.className = 'ask-wrap';
    w.innerHTML = '<div class="ask tsheet" role="dialog" aria-modal="true"><h2>Усі адреси рейсу ' + esc(v.trip.id) + '</h2>' + all.map(p => '<div class="rpt' + (p === cur ? ' rnext' : '') + (p.done ? ' rdone' : '') + '"><div class="rlab">' + (p.done ? '✓ ' : '') + esc(p.label) + (p === cur ? ' · зараз' : '') + '</div><div class="raddr">' + rptAddr(p, v) + '</div>' + rptNav(p, p === cur ? 'primary' : 'btn') + '</div>').join('') +
      '<div class="ask-btns"><button class="btn" data-a="0">Закрити</button></div></div>';
    w.onclick = e => { if (e.target === w || e.target.closest('[data-a="0"]')) w.remove(); };
    dlgOpener = document.activeElement; document.body.appendChild(w);
  }
  async function openTrip(id, from) {
    tripFrom = from || 'board'; $('tripBackT').textContent = tripFrom === 'view' ? 'Таблиця' : tripFrom === 'debts' ? 'Боржники' : tripFrom === 'inv' ? 'До виставлення' : tripFrom === 'mypay' ? 'Мої рейси' : tripFrom === 'probs' ? 'Проблеми водіїв' : board ? 'Дошка' : 'Назад';
    show('trip'); const nav = navSeq; $('tripBody').innerHTML = '<p class="muted">Завантаження рейсу ' + esc(id) + '…</p>';
    const can = new Set(sheets.map(s => s.name));
    const getRows = (sheet, filter) => can.has(sheet) ? api('list', { sheet, filter }).catch(() => null) : Promise.resolve(null);
    try {
      const [tr, zv, mv, jr] = await Promise.all([getRows('Рейси', { 'Рейс ID': id }), getRows('Заявки', { 'Рейс ID': id }),
        getRows('Рухи коштів', { 'Рейс ID': id }), getRows('Журнал змін', { 'Запис ID': id })]);
      if (nav !== navSeq) return;
      const r = tr && tr.rows[0];
      if (!r) { $('tripBody').innerHTML = '<p class="msg">Рейс ' + esc(id) + ' не знайдено.</p>'; return; }
      $('tripBody').innerHTML = tripHtml(r, tr.columns, zv && zv.rows, mv && mv.rows, jr && jr.rows);
      if ($('tripEdit')) $('tripEdit').onclick = () => tripForm(r);
      if (r['Водій ID'] && can.has('Працівники') && me.role !== 'водій') getRows('Працівники', { 'Працівник ID': r['Водій ID'] }).then(p => {   // телефон водія — одним натиском (логіст №5)
        const tel = p && p.rows[0] && String(p.rows[0]['Телефон'] || '').trim(); if (!tel || nav !== navSeq || !$('tripCall')) return;
        $('tripCall').innerHTML = '<a class="btn calldrv" href="tel:' + esc(tel.replace(/[^\d+]/g, '')) + '">📞 Водій: ' + esc(tel) + '</a>'; });
      api('trip.status', { tripId: id }).then(v => { if (!v || !v.trip || !$('tripSt') || nav !== navSeq) return;
        const any = v.steps.some(x => x.at) || (v.problems || []).length, last = v.steps.map(x => !!x.at).lastIndexOf(true);
        if (last >= 0 && $('tripBadge')) { const ev = v.steps[last].step; $('tripBadge').innerHTML = badge(ST_GRP[ev] || 'go', cap(ev)); }
        const office = ['адмін', 'керівник', 'логіст'].indexOf(me.role) >= 0, ST_W = { 'нова': 'нова', 'в роботі': 'в роботі', 'вирішено': 'вирішено' };
        const canAns = p => me.role !== 'логіст' || p.owner !== 'керівник';
        const probH = p => '<div class="cnote prob-' + (p.state === 'вирішено' ? 'done' : p.state === 'в роботі' ? 'work' : 'new') + '"><b>Проблема ' + tkTime(p.at) + ' · ' + esc(ST_W[p.state] || 'нова') + ' · ' + (p.owner === 'керівник' ? 'керівника' : 'логіста') + '</b><br>' + esc(p.text) +
          (p.answer ? '<br><span class="muted small">Відповідь (' + esc(p.answerWho) + ', ' + tkTime(p.answerAt) + '): </span>' + esc(p.answer) : '') +
          (office && p.state !== 'вирішено' ? '<div class="probact">' + (p.state !== 'в роботі' ? '<button class="btn" data-pa="в роботі" data-pid="' + esc(p.id) + '">Беру в роботу</button>' : '') + (canAns(p) ? '<button class="btn" data-pa="вирішено" data-pid="' + esc(p.id) + '">Вирішено…</button>' : '<span class="muted small">Вирішує керівник</span>') + (me.role === 'логіст' && p.owner !== 'керівник' ? '<button class="btn" data-pa="керівнику" data-pid="' + esc(p.id) + '">Передати керівнику…</button>' : '') + '</div>' : '') + '</div>';
        const unlSt = v.steps.find(x => x.step === 'розвантажено' && x.at), unlD = unlSt ? new Date(unlSt.at) : null, unlIso = unlD ? unlD.getFullYear() + '-' + String(unlD.getMonth() + 1).padStart(2, '0') + '-' + String(unlD.getDate()).padStart(2, '0') : '';
        const unlBtn = office && unlSt && !r['Дата розвантаження'] && canTrip() ? '<p><button class="btn" id="tripUnl">Поставити дату розвантаження: ' + esc(unlIso.split('-').reverse().join('.')) + '</button></p>' : '';   // логіст №12
        const markBtn = (office && v.next ? '<p><button class="btn" id="tripMark">Відмітити за водія: «' + esc(ST_LABEL[v.next] || cap(v.next)) + '»</button></p>' : '') + unlBtn;   // логіст №11
        $('tripSt').innerHTML = '<section class="card tsteps"><h2>Кроки рейсу від водія</h2>' + (any ? '<ol class="tl">' + v.steps.map((x, i) => '<li class="' + (i === last ? 'now' : x.at ? 'done' : 'todo') + '"><span class="dot" aria-hidden="true"></span><span class="tl-t">' + esc(cap(x.step)) + (i === last ? '<span class="sr"> — зараз</span>' : '') + '</span>' + (x.at ? '<small>' + tkTime(x.at) + '</small>' : i < last ? '<small>пропущено</small>' : '') + '</li>').join('') + '</ol>' +
          (v.problems || []).map(probH).join('') : '<p class="muted">Водій ще нічого не відмітив.</p>') + markBtn + '</section>';
        $('tripSt').querySelectorAll('[data-pa]').forEach(b => b.onclick = async () => {   // логіст №3: відповідь водію
          const state = b.dataset.pa; let text = '';
          if (state === 'вирішено') { text = await askText('Як вирішили?', 'Напр. EX передали, митниця пропустила', 'Вирішено'); if (!text) return; }
          if (state === 'керівнику') { text = await askText('Що потрібно від керівника?', 'Напр. ремонт за рахунок фірми? клієнт вимагає штраф', 'Передати'); if (text === null || text === undefined) return; }
          busy(true); try { await api('trip.problem.answer', { tripId: id, problemId: b.dataset.pid, state, text, opId: 'PA-' + newId().slice(0, 16) }); board = null; try { store.set('boardCache', ''); } catch (e) {} toast(state === 'вирішено' ? '✔ Проблему закрито — водій бачить відповідь.' : state === 'керівнику' ? '✔ Передано керівнику — він отримав сповіщення.' : '✔ Водій бачить, що проблема в роботі.'); openTrip(id, tripFrom); }
          catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); } });
        if ($('tripUnl')) $('tripUnl').onclick = async () => { busy(true); try { await api('save', { sheet: 'Рейси', row: { 'Рейс ID': id, 'Дата розвантаження': unlIso }, ifHash: r._h }); board = null; try { store.set('boardCache', ''); } catch (e) {} toast('✔ Дату розвантаження поставлено.'); openTrip(id, tripFrom); } catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); } };
        if ($('tripMark')) $('tripMark').onclick = async () => { if (!await ask('Відмітити за водія «' + (ST_LABEL[v.next] || v.next) + '»?', 'У кроці буде позначка «офіс».', 'Відмітити')) return;
          busy(true); try { await api('trip.status.add', { tripId: id, event: v.next, opId: 'OM-' + newId().slice(0, 16) }); board = null; try { store.set('boardCache', ''); } catch (e) {} openTrip(id, tripFrom); } catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); } };
      }).catch(() => {});
      api('tripdoc', { tripId: id }).then(v => { if (!v || nav !== navSeq || !$('tripDocs')) return;
        const edit = ['адмін', 'керівник', 'логіст'].indexOf(me.role) >= 0;
        $('tripDocs').innerHTML = rmpdCard(v.rmpd, id, true) + '<div id="tripAddr">' + addrCard(v.addr, id, edit, v.need) + '</div>' + tdocCard(v.list, true);
        bindTdocList($('tripDocs')); bindRmpd($('tripDocs')); $('tripAddr')._need = v.need; bindAddr($('tripAddr')); }).catch(() => {});
    } catch (e) { if (nav === navSeq) $('tripBody').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  function tripHtml(r, cols, orders, moves, journal) {
    const has = c => cols.indexOf(c) >= 0 && r[c] !== '' && r[c] !== null && r[c] !== undefined;
    const invKv = r => { if (cols.indexOf('Сума для рахунку') < 0 || !has('Фрахт')) return ''; const n = x => { const t = String(x == null ? '' : x).replace(/[\s ]/g, '').replace(',', '.'); return t === '' ? null : +t; };
      const fr = n(r['Фрахт']), iv0 = n(r['Сума для рахунку']), cash = n(r['Готівкою']) || 0, cur = ({ EUR: '€', PLN: 'zł', USD: '$', UAH: 'грн' })[String(r['Валюта'] || '').toUpperCase()] || r['Валюта'] || '';
      const mm = x => esc(money(Math.round(x * 100) / 100)) + ' ' + esc(cur);
      let h = cash ? '<div class="kv"><span>Готівкою</span><b>' + mm(cash) + '</b></div>' : '';
      if ((iv0 == null || isNaN(iv0)) && !cash) return fr != null ? '<div class="kv"><span>Сума для рахунку</span><b class="muted">як фрахт</b></div>' : '';
      const iv = iv0 == null || isNaN(iv0) ? (fr || 0) - cash : iv0;
      h += '<div class="kv"><span>Сума для рахунку</span><b>' + mm(iv) + (iv0 == null ? ' <span class="muted small">(фрахт − готівка)</span>' : '') + '</b></div>';
      const diff = fr != null && !isNaN(fr) ? Math.round((iv + cash - fr) * 100) / 100 : 0;
      if (diff) h += '<div class="kv' + (diff < 0 ? ' bad' : '') + '"><span>' + (diff > 0 ? 'Повернення клієнту' : 'Рахунок' + (cash ? ' + готівка' : '') + ' менші за фрахт') + '</span><b>' + mm(Math.abs(diff)) + '</b></div>';
      if (r['Причина різниці']) h += '<div class="kv"><span>Причина різниці</span><b>' + esc(r['Причина різниці']) + '</b></div>';
      return h; };
    const f = (label, c, cls) => has(c) ? '<div class="kv' + (cls ? ' ' + cls : '') + '"><span>' + esc(label) + '</span><b>' + esc(fmt(typeof r[c] === 'number' ? money(r[c]) : r[c])) + '</b></div>' : '';
    const realDate = x => { if (x == null || x === '' || typeof x !== 'string' && !(x instanceof Date)) return false; const d = new Date(x); return !isNaN(d) && d.getFullYear() >= 2000; };   // 0/1 з таблиці — не дата («27.01.1900», етап 1 дизайну)
    const unl = r['Дата розвантаження'], due = realDate(r['Очікувана оплата']) ? r['Очікувана оплата'] : '';
    const late = due && !r['Оплачено'] && new Date(due) < new Date(new Date().toDateString());
    let h = '<div class="thead"><div class="ttl"><h1>Рейс ' + esc(r['Рейс ID']) + '</h1><span id="tripBadge"></span>' + (canTrip() ? '<button class="btn" id="tripEdit">✏️ Виправити</button>' : '') + '<span id="tripCall"></span></div>' +
      '<p class="tplates">' + [r['Авто ID'] && '<span class="plate ua">' + esc(r['Авто ID']) + '</span>', r['Водій (як записано)'] && esc(r['Водій (як записано)']), r['Тип'] && esc(r['Тип']), r['АДР'] && '<span class="badge b-warn">' + svgI(PROB.drv) + 'АДР</span>', r['Кругорейс ID'] && 'кругорейс ' + esc(r['Кругорейс ID'])].filter(Boolean).join(' · ') + '</p></div>';
    h += '<div class="route card"><div><span class="muted small">Завантаження</span><b>' + esc(r['Звідки'] || '—') + '</b><span>' + esc(fmt(r['Дата завантаження'])) + '</span></div>' +
      '<div class="arrow">→</div><div><span class="muted small">Розвантаження</span><b>' + esc(r['Куди'] || '—') + '</b><span>' + (unl ? esc(fmt(unl)) : '<span class="muted">дата не вказана</span>') + '</span></div></div><div id="tripSt"></div><div id="tripDocs"></div>';
    const cargo = [f('Вантаж', 'Вантаж'), f('Тонн', 'Тонн'), f('Перехід', 'Перехід'), f('Км', 'Км'), f('Пальне, л', 'Пальне, л'), f('Допомагав вантажити', 'Допомагав'), f('ТТН документів', 'ТТН документів')].join('');
    const pay = [f('Клієнт', 'Клієнт (як записано)'), f('Клієнт ID', 'Клієнт ID'), f('Контакт клієнта', 'Контакт клієнта'), (has('Фрахт') ? '<div class="kv big"><span>Фрахт</span><b>' + esc(money(r['Фрахт'])) + '\u00a0' + esc(({ EUR: '€', PLN: 'zł', USD: '$', UAH: 'грн' })[String(r['Валюта'] || '').toUpperCase()] || r['Валюта'] || '') + '</b></div>' : ''), invKv(r), f('Оплата', 'Оплата'),
      f('Відстрочка, днів', 'Відстрочка, днів'), (due ? f('Очікувана оплата', 'Очікувана оплата', late ? 'bad' : '') : ''), f('Оплачено', 'Оплачено', 'ok'), f('Коментар оплати', 'Коментар оплати')].join('');
    const sal = [f('Зарплата (Аналітика)', 'Зарплата (Аналітика)'), f('Зарплата (нова)', 'Зарплата (нова)'), f('Особлива ставка', 'Особлива ставка'), f('Як порахована', 'Як порахована')].join('');
    h += '<div class="tgrid">';
    if (cargo) h += '<section class="card"><h2>Вантаж і дорога</h2>' + cargo + '</section>';
    if (pay) h += '<section class="card"><h2>Клієнт і оплата</h2>' + pay + (late ? '<p class="msg small">Строк оплати минув, позначки «Оплачено» немає.</p>' : '') + '</section>';
    if (sal) h += '<section class="card"><h2>Зарплата водія</h2>' + sal + '</section>';
    if (has('Примітки')) h += '<section class="card"><h2>Примітки</h2><p>' + esc(r['Примітки']) + '</p></section>';
    { const pz = []; if (r['Простій, днів']) pz.push('Простій: ' + esc(r['Простій, днів']) + ' дн.' + (r['Причина простою'] ? ' (' + esc(r['Причина простою']) + ')' : '')); if (r['Відмова / недовантаження']) pz.push(esc(cap(r['Відмова / недовантаження'])));
      if (r['Допомагав'] || r['Допомога, грн']) pz.push('Допомога з вантаженням: ' + esc(r['Допомагав'] || '') + (r['Допомога, грн'] ? ' · ' + esc(money(r['Допомога, грн'])) + ' грн' : ''));
      if (pz.length) h += '<section class="card"><h2>Для зарплати водія</h2><p>' + pz.join('<br>') + '</p><p class="muted small">Факт від логіста; скільки з цього водію — вирішує керівник.</p></section>'; }
    if (orders && orders.length) h += '<section class="card"><h2>Заявка</h2>' + orders.map(z => '<div class="kv"><span>' + esc(z['Заявка ID']) + '</span><b>' + esc(z['Статус'] || '') + (z['Джерело'] ? ' · ' + esc(z['Джерело']) : '') + '</b></div>').join('') + '</section>';
    if (moves) {
      const live = moves.filter(m => !m['Скасовано']);
      h += '<section class="card wide"><h2>Гроші водія по рейсу <span class="count">' + live.length + '</span></h2>' + (live.length ?
        '<div class="tablewrap"><table><thead><tr><th>Дата</th><th>Тип</th><th>Сума</th><th>Опис</th></tr></thead><tbody>' +
        live.map(m => '<tr><td>' + esc(fmt(m['Дата'])) + '</td><td>' + esc(m['Тип'] || '') + '</td><td>' + esc(money(m['Сума'])) + ' ' + esc(m['Валюта'] || '') + '</td><td>' + esc(m['Опис'] || '') + '</td></tr>').join('') +
        '</tbody></table></div>' : '<p class="muted">Записів немає.</p>') + '</section>';
    }
    if (journal) h += '<section class="card wide"><h2>Хто що змінював <span class="count">' + journal.length + '</span></h2>' + (journal.length ?
      journal.slice().reverse().slice(0, 50).map(j => '<div class="jrow"><span class="muted small">' + esc(fmt(j['Коли'])) + ' · ' + esc(j['Хто'] || '') + '</span> ' + esc(j['Колонка'] || '') + ': <s>' + esc(String(j['Було'] || '').slice(0, 80)) + '</s> → ' + esc(String(j['Стало'] || '').slice(0, 80)) + '</div>').join('')
      : '<p class="muted">Змін через програму ще не було.</p>') + '</section>';
    h += '</div><p class="muted small">Джерело: ' + esc(r['Джерело'] || 'база') + '.</p>';
    return h;
  }

  /* ── «Здоров'я програми» (ADR-061): адмін і керівник ── */
  async function openHealth() {
    show('health'); const nav = navSeq; $('hlBody').innerHTML = '<p class="muted">Перевіряю…</p>';
    try { const r = await api('health'); if (nav !== navSeq) return;
      const ico = { ok: '●', warn: '▲', bad: '■' }, word = { ok: 'гаразд', warn: 'подивитись', bad: 'потрібна дія' }, groups = {};
      r.items.forEach(x => (groups[x.group] = groups[x.group] || []).push(x));
      const worst = r.items.some(x => x.level === 'bad') ? 'bad' : r.items.some(x => x.level === 'warn') ? 'warn' : 'ok';
      let h = '<div class="hl-sum lv-' + worst + '">' + ico[worst] + ' ' + (worst === 'ok' ? 'Усе працює' : worst === 'warn' ? 'Працює, є що переглянути' : 'Є проблеми — див. червоне') + ' <small>перевірено ' + tkTime(r.at) + '</small></div>';
      Object.keys(groups).forEach(g => { h += '<section class="card hl-group"><h2>' + esc(g) + '</h2>' + groups[g].map(x => '<div class="hl-row lv-' + x.level + '"><span class="hl-dot" aria-label="' + word[x.level] + '">' + ico[x.level] + '</span><div><b>' + esc(x.label) + '</b><small>' + esc(x.text) + '</small></div></div>').join('') + '</section>'; });
      if (r.errTop.length) h += '<section class="card hl-group"><h2>Найчастіші помилки (7 днів)</h2>' + r.errTop.map(e => '<div class="hl-row"><span class="hl-n">' + e.n + '×</span><div>' + esc(e.text) + '<small>останній раз ' + esc(e.last) + '</small></div></div>').join('') + '</section>';
      if (r.speed.length) h += '<section class="card hl-group"><h2>Швидкість на телефоні (3 дні)</h2><table class="hl-tab"><tr><th>Дія</th><th>Зазвичай</th><th>У гірших випадках</th><th>Замірів</th></tr>' + r.speed.map(s => '<tr><td>' + esc(s.action) + '</td><td>' + (s.p50 / 1000).toFixed(1) + ' с</td><td>' + (s.p95 / 1000).toFixed(1) + ' с</td><td>' + s.n + '</td></tr>').join('') + '</table></section>';
      if (r.people && r.people.length) h += '<section class="card hl-group"><h2>Хто працює в програмі (7 днів)</h2><div class="use-wrap"><table class="hl-tab use-tab"><tr><th>Хто</th><th>Днів</th><th>Дій</th><th>Змін</th><th>Востаннє</th></tr>' +
        r.people.map(p => '<tr><td>' + esc(p.who) + '<small>' + esc([p.role].concat(p.top).join(' · ')) + '</small></td><td>' + p.days + '</td><td>' + p.actions + '</td><td>' + p.changes + '</td><td>' + (p.last ? esc(tkTime(p.last).split(',')[0]) : '—') + '</td></tr>').join('') +
        '</table></div><p class="muted small">Дія — будь-яке звернення до сервера (відкрити екран, зберегти). Зміна — запис у базі через програму. Хто є в довіднику, але не заходив, — у рядках вище «з N».</p></section>';
      h += '<button class="btn" id="hlAgain">Перевірити ще раз</button>';
      $('hlBody').innerHTML = h; $('hlAgain').onclick = openHealth;
    } catch (e) { if (nav === navSeq) $('hlBody').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }

  /* ── «Витрата за 10 секунд» (ADR-060): тип → сума → валюта → фото чека → Зберегти. Без зв'язку — у чергу, фото теж ── */
  let ex = null, exDraft = null;
  // коротші підписи для водія (дизайн-огляд 21.11); у базу йде повна назва, як і раніше
  const EX_LBL = { 'Завантаження / розвантаження': 'Склад (вантаж)', 'Копії / друк': 'Друк', 'Отримав під звіт': 'Мені дали гроші', 'Від клієнта': 'Гроші від клієнта' };
  const EX_ICO = { 'Пальне': 'M4 20V5a1 1 0 011-1h7a1 1 0 011 1v15M4 11h9M13 8h2l3 3v6a1.5 1.5 0 003 0V9l-3-3', 'AdBlue': 'M12 3c3 4 6 7 6 11a6 6 0 01-12 0c0-4 3-7 6-11z',
    'Дорога / віньєтка': 'M8 3L4 21M16 3l4 18M12 5v3M12 11v3M12 17v3', 'Стоянка': 'M6 21V3h7a5 5 0 010 10H6', 'Мийка': 'M5 13h14l-1.5 6h-11zM8 9c0-2 1-3 2-4M12 9c0-2 1-3 2-4M16 9c0-2 1-3 2-4',
    'Ремонт / запчастини': 'M14 6l4 4M4 20l8-8M13 7l4 4 3-3-4-4z', 'Митниця / документи': 'M6 3h9l4 4v14H6zM9 12h7M9 16h7', 'Обмін валюти': 'M4 8h13l-3-3M20 16H7l3 3', 'Інше': 'M5 12h.01M12 12h.01M19 12h.01' };
  Object.assign(EX_ICO, { 'Парковка': EX_ICO['Стоянка'], 'Кордон': 'M4 21V4M4 4h12l-2 4 2 4H4', 'Зв\'язок': 'M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2',
    'Копії / друк': 'M7 8V3h10v5M6 17H4v-7h16v7h-2M7 14h10v7H7z', 'Завантаження / розвантаження': 'M3 17V7h11v10M14 10h4l3 3v4h-7M7 12h4M9 10v4', 'Митниця': EX_ICO['Митниця / документи'],
    'Ремонт / мийка': EX_ICO['Ремонт / запчастини'], 'Від клієнта': 'M12 3v12M7 10l5 5 5-5M4 21h16' });
  const PH_CAM = 'M4 8h3l2-2h6l2 2h3v11H4zM12 16a3 3 0 100-6 3 3 0 000 6z', PH_GAL = 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15 9h.01';
  /** Одна тонка смуга «Камера · Галерея» (побажання власниці: фото — в одному місці, не на пів екрана). */
  const photoStrip = (id, n, multi) => '<div class="phstrip"><span>' + (n ? '📎 ' + n + ' фото' : 'Фото') + '</span><label class="phbtn" tabindex="0" role="button" for="' + id + 'C">' + svgI(PH_CAM) + 'Камера</label><input id="' + id + 'C" type="file" accept="image/*" capture="environment" hidden>' +
    '<label class="phbtn" tabindex="0" role="button" for="' + id + 'G">' + svgI(PH_GAL) + 'Галерея</label><input id="' + id + 'G" type="file" accept="image/*"' + (multi ? ' multiple' : '') + ' hidden></div>';
  const CC_CUR = { PL: 'PLN', UA: 'UAH', HU: 'HUF', CZ: 'CZK', RO: 'RON' };
  const fmtSum = (s, c) => Number(s).toLocaleString('uk-UA', { maximumFractionDigits: 2 }) + '\u00a0' + c;
  const exOffice = () => me && me.role !== 'водій';
  const EXP_DEF = { types: ['Парковка', 'Кордон', 'Зв\'язок', 'Копії / друк', 'Завантаження / розвантаження', 'Митниця', 'Ремонт / мийка', 'Інше'], typesMore: ['Пальне', 'AdBlue', 'Дорога / віньєтка', 'Харчування', 'Штраф'],
    pay: ['Готівка', 'Картка фірми'], cur: ['UAH', 'EUR', 'PLN'], curMore: ['USD', 'HUF', 'CZK', 'RON'], last: {}, list: [], undoMin: 15 };
  async function openExp(type) {
    show('exp'); const nav = navSeq;
    exDraft = { mode: 'exp', type: type || '', sum: '', cur: '', pay: '', liters: '', odo: '', note: '', photo: '', uah: '', more: false };
    if (!exOffice() && !type) draftGet('exp').then(dr => { if (dr && (dr.sum || dr.photo || dr.note) && nav === navSeq) { exDraft = dr; if (ex) renderExp('Відновлено незбережений запис — перевірте й натисніть «Записати».'); } });
    $('expTitle').textContent = exOffice() ? 'Витрати водіїв' : 'Гроші';
    if (!ex && !exOffice()) ex = SCR.exp || null;
    if (!ex) $('expBody').innerHTML = '<p class="muted">Завантаження…</p>'; else renderExp();
    try { ex = await api('expense', exOffice() ? { days: 31 } : {}); if (!exOffice()) scrSet('exp', ex); if (nav === navSeq) renderExp(); }
    catch (e) {
      if (exOffice()) { if (!ex) $('expBody').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; return; }
      if (!ex) ex = EXP_DEF;                                         // без зв'язку й без збереженого — форма все одно працює
      if (nav === navSeq && isNet(e)) ($('offline').hidden = true, renderExp)('<b>Немає зв\'язку.</b> Показую збережене на телефоні. Нові записи збережуться тут і надішлються самі.'); else if (nav === navSeq) renderExp('<b>Не оновилось:</b> ' + esc(e.message));
    }
  }
  /** Фото → JPEG до 1280 px, ≈150–250 КБ (щоб влізло в чергу без зв'язку). */
  async function shrinkPhoto(file) {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = URL.createObjectURL(file); });
    const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
    let q = 0.62, d = c.toDataURL('image/jpeg', q); while (d.length > 420000 && q > 0.3) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
    return d.split(',')[1];
  }
  function expPending() {
    return outbox().filter(x => x.action === 'expense.add').map(x => Object.assign({}, x.data.op, { at: x.data.clientAt, pending: true, photo: !!x.data.op.photo, status: 'нова' }));
  }
  function renderExp(msg) {
    if (!ex) return;
    const b = $('expBody'), d = exDraft, office = exOffice();
    let h = msg ? '<div class="cinfo">' + msg + '</div>' : '';
    if (!office) h += '<p><button class="btn rptlink" id="exRpt">' + svgI('M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h4') + 'Здати звіт за поїздку ›</button></p>';   // угорі, а не під списком (UX-В7)
    if (!office) {
      // ADR-065: «Гроші» — три дії вгорі; витрати — 8 кнопок за реальними даними (парковка, кордон, зв'язок…); валюти UAH/EUR/PLN, решта — «ще»; оплата — готівка (не питаємо)
      const types = ex.types || [], more = ex.typesMore || [], curs = (ex.cur || ['UAH', 'EUR', 'PLN']), curMore = ex.curMore || [];
      if (!d.cur) d.cur = d.mode === 'xch' ? 'EUR' : (ex.last.cur && curs.concat(curMore).indexOf(ex.last.cur) >= 0 ? ex.last.cur : 'UAH');
      if (d.mode === 'xch' && d.cur === 'UAH') d.cur = 'EUR';
      const curChips = list => '<div class="chips" role="group" aria-label="Валюта">' + list.filter(c => !(d.mode === 'xch' && c === 'UAH')).map(c => '<button class="chip" data-ec="' + c + '" aria-pressed="' + (c === d.cur) + '">' + c + '</button>').join('') +
        (curMore.length && !d.curAll && curMore.indexOf(d.cur) < 0 ? '<button class="chip chipmore" data-ecm>ще…</button>' : curMore.map(c => '<button class="chip" data-ec="' + c + '" aria-pressed="' + (c === d.cur) + '">' + c + '</button>').join('')) + '</div>';
      h += '<div class="seg" role="tablist">' + [['exp', 'Витрата'], ['got', 'Мені дали гроші'], ['xch', 'Обмін валюти'], ['cli', 'Гроші від клієнта']].map(m => '<button role="tab" data-em="' + m[0] + '" aria-selected="' + (d.mode === m[0]) + '">' + m[1] + '</button>').join('') + '</div>';
      h += '<section class="card exform">';
      if (d.mode === 'exp') {
        const showMore = d.more || more.indexOf(d.type) >= 0, fuel = d.type === 'Пальне' || d.type === 'AdBlue';
        h += '<div class="extypes">' + types.concat(showMore ? more : []).map(t => '<button class="extype" data-et="' + esc(t) + '" aria-pressed="' + (t === d.type) + '">' + svgI(EX_ICO[t] || EX_ICO['Інше']) + '<span>' + esc(EX_LBL[t] || t) + '</span></button>').join('') + '</div>' +
          (showMore ? '' : '<button class="link exmore" data-emore>Пальне, AdBlue, дорога, харчування, штраф…</button>') +
          '<label for="exSum">Скільки заплатили</label><input id="exSum" class="exsum" inputmode="decimal" autocomplete="off" value="' + esc(d.sum) + '">' + curChips(curs) +
          (fuel ? '<label for="exLit">Літри</label><input id="exLit" inputmode="decimal" value="' + esc(d.liters) + '">' : '') +
          // ADR-067: картка фірми — теж записуємо (є у звіті), але вона не зменшує готівку під звіт
          '<label>Чим платили</label><div class="chips" role="group" aria-label="Чим платили">' + ['Готівка', 'Картка фірми'].map(p => '<button class="chip" data-ep="' + p + '" aria-pressed="' + (p === (d.pay || 'Готівка')) + '">' + p + '</button>').join('') + '</div>';
      } else if (d.mode === 'got') {
        h += '<p class="muted small">Скільки грошей вам видали під звіт (або аванс). Офіс затвердить — і сума піде у звіт кругорейсу.</p>' +
          '<label for="exSum">Отримав</label><input id="exSum" class="exsum" inputmode="decimal" autocomplete="off" value="' + esc(d.sum) + '">' + curChips(curs);
      } else if (d.mode === 'xch') {
        h += '<label for="exSum">Купив валюти</label><input id="exSum" class="exsum" inputmode="decimal" autocomplete="off" value="' + esc(d.sum) + '">' + curChips(curs) +
          '<label for="exUah">Віддав гривень</label><input id="exUah" class="exsum" inputmode="decimal" autocomplete="off" value="' + esc(d.uah) + '">' +
          '<p class="muted small" id="exRate">' + (+d.sum > 0 && +d.uah > 0 ? 'Курс: ' + (d.uah / d.sum).toFixed(2).replace('.', ',') + ' грн за 1 ' + d.cur : 'Курс порахується сам.') + '</p>';
      } else {
        h += '<p class="muted small">Готівка, яку ви взяли в клієнта (експедиційні, оплата за рейс). Офіс побачить і внесе в розрахунок.</p>' +
          '<label for="exSum">Скільки взяли</label><input id="exSum" class="exsum" inputmode="decimal" autocomplete="off" value="' + esc(d.sum) + '">' + curChips(curs.concat(['USD'].filter(c => curs.indexOf(c) < 0)));
      }
      h += photoStrip('exF', d.photo ? 1 : 0, false) + (d.photo ? '<div class="tdthumbs"><span><img class="exthumb" alt="Фото чека" src="data:image/jpeg;base64,' + d.photo + '"><button class="link" data-exdel>прибрати</button></span></div>' : '') +
        '<label for="exNote">Примітка (можна не писати)</label><input id="exNote" value="' + esc(d.note) + '" placeholder="' + ({ cli: 'від кого, за який рейс', got: 'хто видав, на яку поїздку', xch: 'де міняли' }[d.mode] || 'напр. стоянка біля кордону') + '">' +
        '<p class="msg" role="alert" id="exMsg"></p><button class="primary" id="exSave">' + (d.mode === 'xch' ? 'Записати обмін' : d.mode === 'cli' ? 'Записати гроші від клієнта' : d.mode === 'got' ? 'Записати — офіс затвердить' : 'Записати витрату') + '</button></section>';
    }
    const list = (office ? [] : expPending()).concat(ex.list);
    const flt = office ? (store.get('exFlt') || 'нова') : 'all';
    if (office) h += '<div class="chips exflt">' + [['нова', 'Нові'], ['питання', 'Питання'], ['all', 'Усі']].map(([k, t]) => '<button class="chip" data-ef="' + k + '" aria-pressed="' + (flt === k) + '">' + t + ' <small>' + (k === 'all' ? ex.list.length : ex.list.filter(x => x.status === k).length) + '</small></button>').join('') + '</div>';
    const shown = list.filter(x => flt === 'all' || x.status === flt);
    const wk = Date.now() - 7 * 86400000, sums = {}, NOTEXP = ['Обмін валюти', 'Від клієнта', 'Отримав під звіт'];
    list.filter(x => x.at >= wk && NOTEXP.indexOf(x.type) < 0 && (!x.pay || x.pay === 'Готівка')).forEach(x => { sums[x.cur] = (sums[x.cur] || 0) + x.sum; });   // лише витрати готівкою (UX-В2, QA-21)
    h += '<section class="card exlist"><h2>' + (office ? 'Витрати водіїв за 31 день' : 'Мої гроші за 31 день') + '</h2>' + (Object.keys(sums).length ? '<p class="muted">Витрачено готівкою за 7 днів: ' + Object.keys(sums).map(c => fmtSum(sums[c], c)).join(' · ') + '</p>' : '') +
      (shown.length ? shown.map(x => {
        const gotT = x.type === 'Отримав під звіт';
        const st = x.pending ? '<span class="exst pend">ще на телефоні</span>' : x.status === 'перевірено' ? '<span class="exst ok">✓ ' + (gotT ? 'затверджено' : 'перевірено') + '</span>' : gotT && x.status === 'нова' ? '<span class="exst new">чекає затвердження</span>' : x.status === 'питання' ? '<span class="exst q">? питання' + (x.statusNote ? ': ' + esc(x.statusNote) : '') + '</span>' : '<span class="exst new">нова</span>';
        const canUndo = !office && (x.pending || (x.status === 'нова' && Date.now() - (x.saved || x.at) < (ex.undoMin || 15) * 60000));   // у черзі — теж можна скасувати (UX Д3)
        return '<div class="exitem"><div class="exmain">' + svgI(EX_ICO[x.type] || EX_ICO['Інше']) + '<div><b>' + esc(fmtSum(x.sum, x.cur)) + '</b> · ' + esc(x.type === 'Обмін валюти' ? 'купив валюту' + (x.uah ? ' за ' + fmtSum(x.uah, 'UAH') : '') : EX_LBL[x.type] || x.type) + (x.liters ? ' · ' + x.liters + ' л' : '') +
          '<small>' + (office ? esc(x.name || x.worker) + ' · ' : '') + new Date(x.at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + (x.truck ? ' · ' + esc(x.truck) : '') + (x.pay && x.pay !== 'Готівка' ? ' · ' + esc(x.pay) : '') + (x.note ? ' · ' + esc(x.note) : '') + '</small>' + st + '</div></div>' +
          '<div class="exact">' + (x.photo && !x.pending ? '<button class="btn" data-eph="' + esc(x.id) + '">Чек</button>' : '') + (canUndo ? '<button class="btn" data-eun="' + esc(x.id) + '">Скасувати</button>' : '') +
          (office && x.status !== 'перевірено' ? '<button class="btn" data-eok="' + esc(x.id) + '">✓ ' + (gotT ? 'Затвердити' : 'Перевірено') + '</button>' : '') + (office && x.status !== 'питання' ? '<button class="btn" data-eq="' + esc(x.id) + '">? Питання</button>' : '') + '</div></div>';
      }).join('') : '<p class="muted">' + (office ? 'Тут порожньо.' : 'Записів за 31 день ще немає.') + '</p>') +
      '</section>';
    b.innerHTML = h;
    // форма водія
    const keep = () => { if ($('exSum')) d.sum = $('exSum').value; if ($('exNote')) d.note = $('exNote').value; if ($('exLit')) d.liters = $('exLit').value; if ($('exUah')) d.uah = $('exUah').value; if (!office) draftSave('exp', d); };
    b.querySelectorAll('#exSum, #exNote, #exLit, #exUah').forEach(i => { i.addEventListener('change', keep); i.addEventListener('input', () => { clearTimeout(keepT); keepT = setTimeout(keep, 400); }); });
    b.querySelectorAll('[data-em]').forEach(e => e.onclick = () => { keep(); d.mode = e.dataset.em; d.cur = ''; d.type = ''; renderExp(); });
    b.querySelectorAll('[data-ep]').forEach(e => e.onclick = () => { keep(); d.pay = e.dataset.ep; renderExp(); });
    b.querySelectorAll('[data-et]').forEach(e => e.onclick = () => { keep(); if (d.type !== e.dataset.et) d.liters = ''; d.type = e.dataset.et; renderExp(); $('exSum').focus(); });
    b.querySelectorAll('[data-ec]').forEach(e => e.onclick = () => { keep(); d.cur = e.dataset.ec; renderExp(); });
    if ($('exRpt')) $('exRpt').onclick = () => openRpt();
    if (b.querySelector('[data-ecm]')) b.querySelector('[data-ecm]').onclick = () => { keep(); d.curAll = true; renderExp(); };
    if (b.querySelector('[data-emore]')) b.querySelector('[data-emore]').onclick = () => { keep(); d.more = true; renderExp(); };
    if (b.querySelector('[data-exdel]')) b.querySelector('[data-exdel]').onclick = () => { keep(); d.photo = ''; renderExp(); };
    const rateUpd = () => { if (!$('exRate')) return; const a = +String($('exSum').value).replace(/\s/g, '').replace(',', '.'), u = +String($('exUah').value).replace(/\s/g, '').replace(',', '.'); $('exRate').textContent = a > 0 && u > 0 ? 'Курс: ' + (u / a).toFixed(2).replace('.', ',') + ' грн за 1 ' + d.cur : 'Курс порахується сам.'; };
    if ($('exUah')) { $('exUah').oninput = rateUpd; $('exSum').oninput = rateUpd; }
    const exPick = async e => { const f = e.target.files[0]; if (!f) return; keep(); try { d.photo = await shrinkPhoto(f); } catch (er) { toast('Не вдалося прочитати фото — спробуйте ще раз', 'err'); } renderExp(); };
    if ($('exFC')) $('exFC').onchange = exPick; if ($('exFG')) $('exFG').onchange = exPick;
    if ($('exSave')) $('exSave').onclick = async () => {
      keep(); const num = v => String(v).replace(/\s/g, '').replace(',', '.'), sum = num(d.sum), uah = num(d.uah);
      const type = d.mode === 'xch' ? 'Обмін валюти' : d.mode === 'cli' ? 'Від клієнта' : d.mode === 'got' ? 'Отримав під звіт' : d.type;
      if (!type) { $('exMsg').textContent = 'Оберіть, на що витрата'; return; }
      if (!/^\d+(\.\d{1,2})?$/.test(sum) || +sum <= 0) { $('exMsg').textContent = d.mode === 'xch' ? 'Скільки валюти купили — цифрами' : 'Вкажіть суму цифрами'; $('exSum').focus(); return; }
      if (d.mode === 'xch' && (!/^\d+(\.\d{1,2})?$/.test(uah) || +uah <= 0)) { $('exMsg').textContent = 'Скільки гривень віддали — цифрами'; $('exUah').focus(); return; }
      if (+sum >= 1e7) { $('exMsg').textContent = 'Завелика сума — перевірте'; $('exSum').focus(); return; }
      const lit = String(d.liters).replace(',', '.'); if (!$('exLit')) d.liters = '';   // поле літрів лише для пального (QA r2-Н2)
      else if (lit && !(+lit > 0 && +lit < 2000)) { $('exMsg').textContent = 'Літри — лише число до 2000'; return; }
      const BIG = { UAH: 20000, EUR: 500, PLN: 2000, USD: 500, HUF: 200000, CZK: 12000, RON: 2500 };   // незвично велика сума — перепитати (QA-16, критик В6)
      if (+sum >= (BIG[d.cur] || 1e6) && !await ask('Сума ' + fmtSum(+sum, d.cur) + ' — усе правильно?', 'Перевірте валюту й кількість нулів.', 'Так, ' + fmtSum(+sum, d.cur))) return;
      const op = { id: 'EX-' + newId().slice(0, 18), type, sum: +sum, cur: d.cur, pay: d.mode === 'exp' ? (d.pay || 'Готівка') : 'Готівка', liters: String(d.liters).replace(',', '.'), odo: '', note: d.note.trim(), photo: d.photo, uah: d.mode === 'xch' ? +uah : '',
        country: (tc && tc.hint && tc.hint.country) || '' };
      vib(30); const label = (d.mode === 'xch' ? 'обмін ' : d.mode === 'cli' ? 'від клієнта ' : d.mode === 'got' ? 'отримав під звіт ' : '') + fmtSum(op.sum, op.cur);
      const btn = $('exSave'); btn.disabled = true; btn.textContent = 'Записую…';
      let r;
      try { r = await apiQ('expense.add', { op, trip: (stCur && stCur.trip && stCur.trip.id) || '', opId: op.id }, label); }
      catch (e) { btn.disabled = false; renderExp(); $('exMsg').textContent = 'Не записано: ' + e.message; return; }   // форму НЕ стираємо (QA-17)
      if (!r.queued) ex = r;
      exDraft = { mode: d.mode, type: '', sum: '', cur: d.cur, pay: d.pay, liters: '', odo: '', note: '', photo: '', uah: '', more: false }; draftSave('exp', null);
      if (!$('exp').hidden) renderExp();
      toast((r.queued ? 'Збережено на телефоні: <b>' + esc(label) + '</b> — надішлеться само.' : '✔ Записано: ' + esc(label) + (d.mode === 'exp' ? ' · ' + esc(op.type) : '')), '', { label: 'Скасувати', run: () => expUndo(op.id) });
      const nl = document.querySelector('.exlist'); if (nl) nl.scrollIntoView({ block: 'start', behavior: smooth() });
    };
    // список
    b.querySelectorAll('[data-eun]').forEach(e => e.onclick = () => expUndo(e.dataset.eun));
    b.querySelectorAll('[data-eph]').forEach(e => e.onclick = () => expShowPhoto(e.dataset.eph));
    b.querySelectorAll('[data-ef]').forEach(e => e.onclick = () => { store.set('exFlt', e.dataset.ef); renderExp(); });
    b.querySelectorAll('[data-eok]').forEach(e => e.onclick = () => expSet(e.dataset.eok, 'перевірено'));
    b.querySelectorAll('[data-eq]').forEach(e => e.onclick = () => {
      const row = e.closest('.exitem'); if (row.querySelector('.exqbox')) return;
      const box = document.createElement('div'); box.className = 'exqbox'; box.innerHTML = '<input placeholder="Що уточнити у водія? напр. немає чека"><button class="primary">Надіслати питання</button>';
      row.appendChild(box); box.querySelector('input').focus(); box.querySelector('button').onclick = () => expSet(e.dataset.eq, 'питання', box.querySelector('input').value);
    });
  }
  async function expUndo(id) {
    const q = outbox().find(x => x.action === 'expense.add' && x.data.op.id === id);
    if (q && obSending(q)) { toast('Запис саме надсилається — спробуйте «Скасувати» за кілька секунд.'); return; }   // критик Н3
    if (q) { outboxSet(outbox().filter(x => x !== q)); renderOutbox(); renderExp(); toast('Скасовано.'); return; }
    try { ex = await api('expense.status', { id, status: 'скасовано', opId: 'EXU-' + newId().slice(0, 16) }); renderExp(); toast('Витрату скасовано.'); }
    catch (e) { toast('<b>Не скасовано</b>: ' + esc(e.message), 'err'); }
  }
  async function expSet(id, status, note) {
    busy(true);
    try { ex = await api('expense.status', { id, status, note: note || '', opId: 'EXS-' + newId().slice(0, 16) }); renderExp(); toast(status === 'перевірено' ? 'Позначено: перевірено.' : 'Питання записано — водій побачить у «Мої витрати».'); }
    catch (e) { toast('<b>Не збережено</b>: ' + esc(e.message), 'err'); } finally { busy(false); }
  }
  async function expShowPhoto(id) {
    busy(true);
    try {
      const r = await api('expense.photo', { id });
      const w = document.createElement('div'); w.className = 'ask-wrap'; w.innerHTML = '<div class="ask exphotobox" role="dialog" aria-modal="true" aria-label="Фото чека"><img alt="Фото чека" src="data:' + esc(r.mime) + ';base64,' + r.data + '"><div class="ask-btns"><button class="primary">Закрити</button></div></div>';
      document.body.appendChild(w); w.onclick = e => { if (e.target === w || e.target.closest('button')) w.remove(); };
    } catch (e) { toast('<b>Фото не відкрилось</b>: ' + esc(e.message), 'err'); } finally { busy(false); }
  }

  /* ── Фото документів рейсу (ADR-063): вид → фото → Зберегти. Без зв'язку — у чергу. Офіс бачить у картці рейсу ── */
  let td = null, tdDraft = null;
  const TD_ICO = { 'CMR': 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7', 'Пломба': 'M12 3a4 4 0 014 4v3H8V7a4 4 0 014-4zM6 10h12v11H6z', 'Пошкодження': 'M12 4l9 16H3zM12 10v4M12 17h.01' };
  const TD_KINDS = ['CMR', 'Накладна / ТТН', 'Митні (T1 / EX / TIR)', 'Вантаж', 'Пошкодження', 'Інше'];
  const tdIco = k => TD_ICO[k] || 'M4 8h3l2-2h6l2 2h3v11H4zM12 16a3 3 0 100-6 3 3 0 000 6z';
  async function openTdoc() {
    show('tdoc'); const nav = navSeq; tdDraft = { kind: 'CMR', note: '', photos: [] };
    draftGet('tdoc').then(dr => { if (dr && dr.photos && dr.photos.length && nav === navSeq && !tdDraft.photos.length) { tdDraft = { kind: dr.kind || 'CMR', note: dr.note || '', photos: dr.photos }; if (td) { renderTdoc(); $('tdMsg').textContent = 'Відновлено незаписані фото (' + dr.photos.length + ') — натисніть «Записати».'; } } });   // QA r2-Н3
    const curTrip = stCur && stCur.trip;
    if (!td || (curTrip && td.trip && td.trip.id !== curTrip.id)) td = SCR.tdoc && (!curTrip || (SCR.tdoc.trip && SCR.tdoc.trip.id === curTrip.id)) ? SCR.tdoc : null;
    if (!td) $('tdBody').innerHTML = '<p class="muted">Завантаження…</p>'; else renderTdoc();
    try { td = await api('tripdoc', {}); scrSet('tdoc', td); if (nav === navSeq) renderTdoc(); }
    catch (e) {
      if (!td && curTrip) td = { trip: { id: curTrip.id, truck: curTrip.truck, from: curTrip.from, to: curTrip.to }, list: [], kinds: TD_KINDS, undoMin: 15, rmpd: stCur.rmpd || null };
      if (!td) { $('tdBody').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; return; }
      if (nav === navSeq) (isNet(e) && ($('offline').hidden = true), renderTdoc)(isNet(e) ? '<b>Немає зв\'язку.</b> Показую збережене на телефоні. Нові записи збережуться тут і надішлються самі.' : '<b>Не оновилось:</b> ' + esc(e.message));
    }
  }
  function tdPending() {
    return outbox().filter(x => x.action === 'tripdoc.add').map(x => ({ id: x.data.op.id, kind: x.data.op.kind, note: x.data.op.note, at: x.data.clientAt, pending: true, thumb: x.data.op.photo }));
  }
  const tdWhen = t => new Date(t).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  function tdocCard(list, office) {
    return '<section class="card tdlist"><h2>Документи рейсу <span class="count">' + list.length + '</span></h2>' + (list.length ? list.map(x => {
      const canUndo = x.pending || office || (me && x.who === me.login && Date.now() - x.at < ((td && td.undoMin) || 15) * 60000);
      return '<div class="exitem"><div class="exmain">' + svgI(tdIco(x.kind)) + '<div><b>' + esc(x.kind) + '</b><small>' + tdWhen(x.at) + (x.note ? ' · ' + esc(x.note) : '') + '</small>' +
        (x.pending ? '<span class="exst pend">ще на телефоні</span>' : '') + '</div></div><div class="exact">' + (x.photo && !x.pending ? '<button class="btn" data-tph="' + esc(x.id) + '">Фото</button>' : '') +
        (canUndo ? '<button class="btn" data-tun="' + esc(x.id) + '">' + (office ? 'Прибрати' : 'Скасувати') + '</button>' : '') + '</div></div>';
    }).join('') : '<p class="muted">' + (office ? 'Водій ще не надсилав фото документів.' : 'Ще немає фото документів цього рейсу.') + '</p>') + '</section>';
  }
  function bindTdocList(box) {
    box.querySelectorAll('[data-tph]').forEach(e => e.onclick = () => tdShowPhoto(e.dataset.tph));
    box.querySelectorAll('[data-tun]').forEach(e => e.onclick = () => tdUndo(e.dataset.tun, box));
  }
  function renderTdoc(msg) {
    if (!td) return;
    const b = $('tdBody'), d = tdDraft || (tdDraft = { kind: 'CMR', note: '', photos: [] });
    draftSave('tdoc', d.photos.length ? d : null);
    let h = msg ? '<div class="cinfo">' + msg + '</div>' : '';
    if (!td.trip) { b.innerHTML = h + '<section class="card"><p>Зараз немає поточного рейсу. Коли логіст призначить рейс, тут можна буде сфотографувати CMR та інші документи.</p></section>'; return; }
    h += '<p class="muted">Рейс <b>' + esc(td.trip.id) + '</b>' + (td.trip.from || td.trip.to ? ' · ' + esc(td.trip.from || '—') + ' → ' + esc(td.trip.to || '—') : '') + '</p>';
    h += rmpdCard(td.rmpd, td.trip.id, false);
    h += '<section class="card exform"><h2>Що фотографуєте?</h2><div class="extypes">' + td.kinds.map(k => '<button class="extype" data-tk="' + esc(k) + '" aria-pressed="' + (k === d.kind) + '">' + svgI(tdIco(k)) + '<span>' + esc(k) + '</span></button>').join('') + '</div>' +
      photoStrip('td', d.photos.length, true) +
      (d.photos.length ? '<div class="tdthumbs">' + d.photos.map((p, i) => '<span><img class="exthumb" alt="Сторінка ' + (i + 1) + '" src="data:image/jpeg;base64,' + p + '"><button class="link" data-tdel="' + i + '">прибрати</button></span>').join('') + '</div>' : '') +
      '<label for="tdNote">Примітка (можна не писати)</label><input id="tdNote" value="' + esc(d.note) + '" placeholder="напр. CMR з печаткою отримувача">' +
      '<p class="msg" role="alert" id="tdMsg"></p><button class="primary' + (d.photos.length ? '' : ' dim') + '" id="tdSave">' + (d.photos.length > 1 ? 'Записати (' + d.photos.length + ' фото)' : 'Записати фото') + '</button></section>';
    const list = tdPending().map(x => Object.assign(x, { photo: false })).concat(td.list);
    h += tdocCard(list, false);
    b.innerHTML = h;
    const keep = () => { if ($('tdNote')) d.note = $('tdNote').value; };
    b.querySelectorAll('[data-tk]').forEach(e => e.onclick = () => { keep(); d.kind = e.dataset.tk; renderTdoc(); });
    b.querySelectorAll('[data-tdel]').forEach(e => e.onclick = () => { keep(); d.photos.splice(+e.dataset.tdel, 1); renderTdoc(); });
    const tdPick = async e => { const fs = [...e.target.files].slice(0, 10); if (!fs.length) return; keep(); let bad = 0; if ($('tdSave')) { $('tdSave').disabled = true; $('tdSave').textContent = 'Обробляю фото…'; }
      for (let i = 0; i < fs.length; i++) {   // по одному з показом ходу — екран не «завмирає» на 10 сторінках (a11y-8)
        if ($('tdMsg')) { $('tdMsg').setAttribute('role', 'status'); $('tdMsg').textContent = 'Обробляю фото ' + (i + 1) + ' з ' + fs.length + '…'; }
        await new Promise(r => setTimeout(r, 30));
        try { d.photos.push(await shrinkPhoto(fs[i])); } catch (er) { bad++; } }
      if (bad) toast('Не вдалося прочитати ' + bad + ' фото — спробуйте ще раз', 'err'); renderTdoc(); };
    $('tdC').onchange = tdPick; $('tdG').onchange = tdPick;
    $('tdSave').onclick = async () => {
      keep();
      if (!d.kind) { $('tdMsg').textContent = 'Оберіть, що за документ'; return; }
      if (!d.photos.length) { $('tdMsg').textContent = 'Сфотографуйте документ'; return; }
      if (!td.trip || !td.trip.id) { $('tdMsg').textContent = 'Немає поточного рейсу — фото не до чого прив\'язати'; return; }
      vib(30); const n = d.photos.length, kind = d.kind, tripId = td.trip.id, btn = $('tdSave');
      btn.disabled = true; let ok = 0, queued = 0, err = '';
      for (let i = 0; i < n; i++) {   // по черзі: кожне фото спершу зберігається на телефоні (QA-1)
        btn.textContent = 'Зберігаю ' + (i + 1) + ' з ' + n + '…';
        const op = { id: 'TD-' + newId().slice(0, 18), kind, note: (d.note.trim() + (n > 1 ? ' (стор. ' + (i + 1) + ' з ' + n + ')' : '')).trim(), photo: d.photos[0] };
        try { const r = await apiQ('tripdoc.add', { op, tripId, opId: op.id }, kind + (n > 1 ? ' стор. ' + (i + 1) : ''));
          if (r.queued) queued++; else td = r; ok++; d.photos.shift(); }
        catch (e) { err = e.message; break; }
      }
      if (err) { renderTdoc(); $('tdMsg').textContent = (ok ? 'Збережено ' + ok + ' з ' + n + '. ' : '') + 'Не записано: ' + err + ' — фото, що лишились, на екрані; спробуйте ще раз.'; return; }
      toast((queued ? 'Збережено на телефоні: ' : '✔ Записано: ') + esc(kind) + (n > 1 ? ' · ' + n + ' фото' : '') + (queued ? ' — надішлеться само.' : ''));
      tdDraft = { kind: 'CMR', note: '', photos: [] }; draftSave('tdoc', null); if (!$('tdoc').hidden) renderTdoc();
    };
    bindTdocList(b); bindRmpd(b);
  }
  async function tdUndo(id, box) {
    const q = outbox().find(x => x.action === 'tripdoc.add' && x.data.op.id === id);
    if (q && obSending(q)) { toast('Запис саме надсилається — спробуйте «Скасувати» за кілька секунд.'); return; }   // критик Н3
    if (q) { outboxSet(outbox().filter(x => x !== q)); renderOutbox(); renderTdoc(); toast('Скасовано.'); return; }
    busy(true);
    try { const r = await api('tripdoc.undo', { id, opId: 'TDU-' + newId().slice(0, 16) });
      if (box && box.id === 'tripDocs') { box.innerHTML = tdocCard(r.list, true); bindTdocList(box); } else { td = r; renderTdoc(); }
      toast('Фото прибрано з рейсу.'); }
    catch (e) { toast('<b>Не скасовано</b>: ' + esc(e.message), 'err'); } finally { busy(false); }
  }
  async function tdShowPhoto(id) {
    busy(true);
    try {
      const r = await api('tripdoc.photo', { id });
      const w = document.createElement('div'); w.className = 'ask-wrap'; w.innerHTML = '<div class="ask exphotobox" role="dialog" aria-modal="true" aria-label="Фото документа"><img alt="Фото документа" src="data:' + esc(r.mime) + ';base64,' + r.data + '"><div class="ask-btns"><button class="primary">Закрити</button></div></div>';
      document.body.appendChild(w); w.onclick = e => { if (e.target === w || e.target.closest('button')) w.remove(); };
    } catch (e) { toast('<b>Фото не відкрилось</b>: ' + esc(e.message), 'err'); } finally { busy(false); }
  }

  /* ── Звіт кругорейсу (ADR-066): усе вже внесено по ходу — водій перевіряє, вписує фактичний залишок і надсилає ── */
  let rp = null, rpSent = false;
  const sums = m => { const k = Object.keys(m || {}).filter(c => m[c]); return k.length ? k.map(c => fmtSum(m[c], c)).join(' · ') : '—'; };
  async function openRpt() {
    show('rpt'); const nav = navSeq; rpSent = false;
    if (SCR.rpt) { rp = SCR.rpt; renderRpt(); } else $('rpBody').innerHTML = '<p class="muted">Збираю звіт…</p>';
    try { rp = await api('report', {}); scrSet('rpt', rp); if (nav === navSeq) renderRpt(); }
    catch (e) { if (nav !== navSeq) return; if (rp && rp.draft) renderRpt(isNet(e) ? '<b>Немає зв\'язку.</b> Показано звіт, збережений на телефоні' + (rp.draft.to ? ' (на ' + new Date(rp.draft.to).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ')' : '') + '. Надіслати можна — звіт піде, щойно з\'явиться зв\'язок, після всіх записів, що чекають.' : esc(e.message)); else $('rpBody').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  /** До чернетки звіту додати витрати, що ще чекають зв'язку (сервер їх ще не бачив) — та сама логіка, що Report.gs. */
  function rptPending(d0) {
    const q = outbox().filter(x => x.action === 'expense.add' && x.data && x.data.op); if (!q.length) return d0;
    const d = JSON.parse(JSON.stringify(d0)), add = (m, c, v) => { m[c] = Math.round(((m[c] || 0) + v) * 100) / 100; };
    d.client = d.client || {}; d.card = d.card || {};
    q.forEach(x => { const o = x.data.op, sum = +o.sum || 0, cur = o.cur || 'UAH';
      if (o.type === 'Обмін валюти') { add(d.xch, cur, sum); add(d.xch, 'UAH', -(+o.uah || 0)); add(d.calc, cur, sum); add(d.calc, 'UAH', -(+o.uah || 0)); }
      else if (o.type === 'Від клієнта') add(d.client, cur, sum);
      else if (o.type === 'Отримав під звіт') { add(d.got, cur, sum); add(d.calc, cur, sum); }
      else if (o.pay === 'Картка фірми' || o.pay === 'Паливна картка') add(d.card, cur, sum);
      else { add(d.spent, cur, sum); add(d.calc, cur, -sum); }
      d.items.unshift({ at: x.at || Date.now(), kind: 'ще на телефоні', text: o.type + (o.note ? ' · ' + o.note : ''), sum, cur, uah: o.uah || null }); });
    return d;
  }
  function renderRpt(msg) {
    const d = rp && rp.draft && rptPending(rp.draft); if (!d) return;
    const dt = t => new Date(t).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
    const curs = Array.from(new Set(['UAH'].concat(Object.keys(d.calc), Object.keys(d.open), Object.keys(d.client || {})))).filter(c => c === 'UAH' || d.calc[c] || d.open[c] || (d.client && d.client[c]));   // і валюти грошей клієнта (критик Н1)
    let h = msg ? '<div class="cinfo">' + msg + '</div>' : '';
    h += '<p class="muted">З ' + dt(d.from) + ' по сьогодні' + (d.truck ? ' · машина ' + esc(d.truck) : '') + (d.circle ? ' · кругорейс ' + esc(d.circle) : '') + '</p>';
    h += '<section class="card rpsum"><h2>Гроші</h2>' +
      '<div class="kv"><span>Залишок на початок</span><b>' + sums(d.open) + '</b></div>' +
      '<div class="kv"><span>Отримав під звіт / аванс</span><b>' + sums(d.got) + '</b></div>' +
      '<div class="kv"><span>Витратив готівкою</span><b>' + sums(d.spent) + '</b></div>' +
      (d.card && Object.keys(d.card).length ? '<div class="kv"><span>Оплачено карткою фірми (не з готівки)</span><b>' + sums(d.card) + '</b></div>' : '') +
      (Object.keys(d.xch).length ? '<div class="kv"><span>Обмін валюти</span><b>' + Object.keys(d.xch).map(c => (d.xch[c] > 0 ? '+' : '') + fmtSum(d.xch[c], c)).join(' · ') + '</b></div>' : '') +
      '<div class="kv big"><span>Має лишитись (гроші під звіт)</span><b>' + sums(d.calc) + '</b></div>' +
      (Object.keys(d.client).length ? (() => { const all = Object.assign({}, d.calc); Object.keys(d.client).forEach(c => all[c] = Math.round(((all[c] || 0) + d.client[c]) * 100) / 100);
        return '<div class="kv"><span>+ гроші від клієнта (передати в офіс)</span><b>' + sums(d.client) + '</b></div><div class="kv big"><span>Разом на руках має бути</span><b>' + sums(all) + '</b></div>'; })() : '') + '</section>';
    if (rpSent) { h += '<section class="card"><p><b>' + (outbox().some(x => x.action === 'report.submit') ? '📶 Звіт збережено на телефоні — чекає зв\'язку, потім перевірки офісу.' : '✔ Звіт надіслано — чекає перевірки офісу.') + '</b></p><p class="muted small">Новий звіт почнеться з цих залишків. Якщо офіс матиме питання — побачите тут.</p></section>'; }
    else h += '<section class="card exform"><h2>Скільки готівки у вас зараз</h2><p class="muted small">Порахуйте гроші на руках і впишіть по кожній валюті (0 — якщо немає). Під полем — скільки має бути за розрахунком.</p>' +
      curs.map(c => '<label for="rpF_' + c + '">' + c + '</label><input id="rpF_' + c + '" class="exsum" inputmode="decimal" placeholder="порахуйте" value="" aria-describedby="rpH_' + c + '"><p class="muted small" id="rpH_' + c + '">За розрахунком: ' + fmtSum(Math.round(((d.calc[c] || 0) + ((d.client || {})[c] || 0)) * 100) / 100, c) + '</p>').join('') +
      '<h2 style="margin-top:14px">Спідометр</h2><p class="muted small">На початку: <b>' + (d.odoA ? Number(d.odoA).toLocaleString('uk-UA') + ' км' : 'немає даних') + '</b></p>' +
      '<label for="rpOdo">Зараз, км (обов\'язково)</label><input id="rpOdo" inputmode="numeric" value="' + (d.odoB || '') + '">' +
      '<label for="rpNote">Коментар (можна не писати)</label><input id="rpNote" placeholder="напр. допомагав вантажити, відміна рейсу">' +
      '<p class="msg" role="alert" id="rpMsg"></p><button class="primary" id="rpSend">Підтвердити й надіслати звіт</button></section>';
    h += '<details class="card"><summary>Що увійшло у звіт (' + d.items.length + ')</summary>' + (d.items.length ? d.items.map(x => '<div class="kv"><span>' + dt(x.at) + ' · ' + esc(x.kind) + ' · ' + esc(x.text) + '</span><b>' + fmtSum(x.sum, x.cur) + (x.uah ? ' за ' + fmtSum(x.uah, 'UAH') : '') + '</b></div>').join('') : '<p class="muted">Записів ще немає.</p>') +
      (d.trips.length ? '<p class="muted small">Рейси: ' + d.trips.map(t => esc(t.id) + ' ' + esc(t.from) + '→' + esc(t.to)).join('; ') + '</p>' : '') + '</details>';
    if (rp.list && rp.list.length) h += '<section class="card"><h2>Попередні звіти</h2>' + rp.list.map(r => '<div class="kv"><span>' + dt(r.from) + '–' + dt(r.to) + (r.status === 'питання' ? ' · <b>питання: ' + esc(r.statusNote || '') + '</b>' : '') + '</span><b>' + esc(r.status) + '</b></div>').join('') + '</section>';
    $('rpBody').innerHTML = h;
    if ($('rpSend')) {   // чернетка звіту переживає перезавантаження (QA r3)
      const ids = curs.map(c => 'rpF_' + c).concat(['rpOdo', 'rpNote']);
      draftGet('rpt').then(dr => { if (!dr || !$('rpSend')) return; ids.forEach(i => { if ($(i) && dr[i] != null && dr[i] !== '' && !$(i).value) $(i).value = dr[i]; }); });
      ids.forEach(i => $(i) && $(i).addEventListener('input', () => { const v = {}; ids.forEach(k => { if ($(k)) v[k] = $(k).value; }); draftSave('rpt', v); }));
    }
    if ($('rpSend')) $('rpSend').onclick = async () => {
      const fact = {};
      for (const c of curs) { const v = String($('rpF_' + c).value).replace(/\s/g, '').replace(',', '.'); if (v === '') { $('rpMsg').textContent = 'Впишіть, скільки ' + c + ' у вас зараз (0 — якщо немає)'; $('rpF_' + c).focus(); return; }
        if (!/^\d+(\.\d{1,2})?$/.test(v)) { $('rpMsg').textContent = 'Залишок ' + c + ' — лише цифри'; return; } fact[c] = +v; }
      const odo = String($('rpOdo').value).replace(/\s/g, '');
      if (!/^\d+$/.test(odo)) { $('rpMsg').textContent = 'Впишіть спідометр — лише цифри, км'; $('rpOdo').focus(); return; }
      if (d.odoA && +odo < d.odoA) { $('rpMsg').textContent = 'Спідометр менший, ніж на початку (' + d.odoA + ') — перевірте'; return; }
      const pend = outbox().filter(x => x.action !== 'report.submit').length;
      if (!await ask('Надіслати звіт?', (pend ? 'На телефоні ще ' + pend + ' записів чекають зв\'язку — звіт піде після них і врахує їх. ' : '') + 'Після цього новий звіт почнеться з цих залишків.', 'Так, надіслати')) return;
      const b = $('rpSend'); b.disabled = true;
      try { const r = await apiQ('report.submit', { fact, odoB: odo, note: $('rpNote').value.trim(), opId: 'RP-' + newId().slice(0, 16) }, 'звіт кругорейсу');
        rpSent = true; draftSave('rpt', null);
        if (r.queued) renderRpt('✔ Звіт збережено на телефоні — <b>надішлеться сам</b>, щойно з\'явиться зв\'язок.');
        else { rp = r; const df = r.diff || {}; renderRpt(r.already ? 'Звіт уже надіслано щойно.' : '✔ Звіт надіслано.' + (Object.keys(df).length ? ' Різниця з розрахунком: ' + Object.keys(df).map(c => (df[c] > 0 ? '+' : '') + fmtSum(df[c], c)).join(' · ') + ' — офіс уточнить.' : ' Усе зійшлося.')); }
        window.scrollTo(0, 0); }
      catch (e) { b.disabled = false; $('rpMsg').textContent = e.message; }
    };
  }

  /* ── Сповіщення на телефон (ADR-064): підписка цього телефона, пробне, вимкнути ── */
  const b64ToU8 = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
  async function openPush() {
    const ios = /iPhone|iPad/.test(navigator.userAgent), installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const can = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const w = document.createElement('div'); w.className = 'ask-wrap'; document.body.appendChild(w);
    const draw = (txt, btns) => { w.innerHTML = '<div class="ask" role="dialog" aria-modal="true" aria-label="Сповіщення"><h2>Сповіщення на телефон</h2><p>' + txt + '</p><div class="ask-btns' + (btns.length === 1 ? ' one' : '') + '">' + btns.map((b, i) => '<button class="' + (b[2] ? 'primary' : 'btn') + '" data-pb="' + i + '">' + b[0] + '</button>').join('') + '</div></div>';
      w.querySelectorAll('[data-pb]').forEach(e => e.onclick = () => btns[+e.dataset.pb][1]()); };
    const close = () => w.remove(); w.onclick = e => { if (e.target === w) close(); };
    if (!can || (ios && !installed)) return draw(ios && !installed ? 'На iPhone сповіщення працюють, коли програма додана на головний екран: у Safari натисніть «Поділитися» → «На початковий екран», відкрийте програму звідти й увімкніть тут.' : 'Цей браузер не вміє сповіщення. Відкрийте програму в Chrome (Android) або додайте на головний екран (iPhone).', [['Зрозуміло', close, 1]]);
    draw('Перевіряю…', [['Закрити', close]]);
    let k; try { k = await api('push.key'); } catch (e) { return draw(esc(e.message), [['Закрити', close]]); }
    if (!k.on) return draw('Сповіщення ще налаштовуються. Спробуйте трохи згодом.', [['Зрозуміло', close, 1]]);
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    const enable = async () => {
      draw('Телефон зараз спитає дозвіл — натисніть «Дозволити».', [['Закрити', close]]);
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return draw('Дозволу немає. Увімкнути можна в налаштуваннях телефона: Сповіщення → браузер / «Л-КОРП».', [['Зрозуміло', close, 1]]);
      try { const ns = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(k.key) });
        await api('push.sub', { sub: ns.toJSON(), device: (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '' }); await api('push.test');
        draw('Готово ✓ Зараз прийде пробне сповіщення. Вночі (22:00–7:00) програма мовчить, крім термінового.', [['Добре', close, 1]]);
      } catch (e) { draw('Не вдалося увімкнути: ' + esc(e.message), [['Закрити', close]]); }
    };
    if (sub && Notification.permission === 'granted') draw((me.role === 'водій' ? 'Увімкнено ✓ Ви отримуєте: нова робота, питання щодо витрат.' : 'Увімкнено ✓ Ви отримуєте: проблеми в рейсах від водіїв.') + ' Вночі програма мовчить, крім термінового.',
      [['Вимкнути', async () => { try { await api('push.unsub', { endpoint: sub.endpoint }); await sub.unsubscribe(); } catch (e) {} draw('Сповіщення вимкнено на цьому телефоні.', [['Добре', close, 1]]); }], ['Надіслати пробне', async () => { try { await api('push.test'); toast('Пробне надіслано.'); } catch (e) { toast(esc(e.message), 'err'); } close(); }, 1]]);
    else draw(me.role === 'водій' ? 'Програма повідомить, коли на вас призначать рейс або логіст спитає про витрату. Мало й по ділу, вночі — ні.' : 'Ви одразу дізнаєтесь, коли водій натисне «Проблема».', [['Не зараз', close], ['Увімкнути', enable, 1]]);
  }

  /* ── Спідометр з Freetrack (ADR-058): знімки на 06:00 і 20:00, «Оновити зараз», або з приладу вручну ── */
  function odoWidget(input, info, truckFn) {
    let src = '', last = null, typed = false;
    const when = iso => { const d = new Date(iso), t = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }); return d.toDateString() === new Date().toDateString() ? 'сьогодні ' + t : d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) + ' ' + t; };
    const render = note => {
      const r = last, o = r && r.odo;
      info.innerHTML = (o ? 'Трекер: <b>' + Number(o.odo).toLocaleString('uk-UA') + ' км</b> (на ' + when(o.at) + ').' : truckFn() ? 'У Freetrack ще немає показань цієї машини.' : '') +
        (r && r.next ? ' Наступне автоматичне оновлення — ' + when(r.next) + '.' : '') + (note ? ' <b>' + esc(note) + '</b>' : '') +
        (truckFn() ? ' <button class="link odo-live" type="button">Взяти з трекера</button>' : '') + '<br>Якщо на приладі інакше — впишіть з приладу.';
      const b = info.querySelector('.odo-live'); if (b) b.onclick = () => load(true);
    };
    async function load(live) {
      const truck = truckFn(); if (!truck) { last = null; render(); return; }
      if (live) render('Запитую…');
      try {
        const r = await api('tacho.odo', { truck, live: live ? 1 : '' }); last = r;
        if (r.odo && (live || (!typed && !input.value))) { input.value = r.odo.odo; src = 'ft'; typed = false; }
        render(r.busy ? 'Трекер зайнятий — спробуйте через ' + Math.max(1, Math.ceil(r.busy / 60)) + ' хв або впишіть з приладу.' : live && r.odo ? 'Оновлено.' : '');
      } catch (e) { render(live ? 'Немає зв\'язку — впишіть з приладу.' : ''); }
    }
    input.addEventListener('input', () => { typed = true; src = 'manual'; });
    load(false);
    return { src: () => (input.value ? src || 'manual' : ''), reload: () => { typed = false; load(false); } };
  }

  /* ── Моя машина (етап 3): прийняти / здати ── */
  let tk = null, tkMode = '';
  const tkTime = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };
  /* ── Документи машини й водія за терміном дії (ADR-069): статус рахується сам від дати «Діє до» ── */
  const dmy = iso => String(iso || '').slice(0, 10).split('-').reverse().join('.');
  const docLeft = d => d.left < 0 ? 'прострочено з ' + dmy(d.until) : d.left === 0 ? 'сьогодні останній день' : d.left <= 30 ? 'ще ' + d.left + ' дн. · до ' + dmy(d.until) : 'до ' + dmy(d.until);
  function docsCard(list) {
    if (!list || !list.length) return '';
    const row = d => '<div class="dcrow st-' + d.state + '"><span class="dcmark" aria-hidden="true">' + (d.state === 'over' ? '✗' : d.state === 'soon' ? '⚠' : '✓') + '</span><span><b>' + esc(d.type) + '</b><small>' + esc(docLeft(d)) + '</small></span></div>';
    const tr = list.filter(d => d.kind === 'truck'), me_ = list.filter(d => d.kind === 'driver');
    return '<section class="card dcard"><h2>Документи</h2>' + (tr.length ? '<h3>Машина</h3>' + tr.map(row).join('') : '') + (me_.length ? '<h3>Мої</h3>' + me_.map(row).join('') : '') +
      (list.some(d => d.state !== 'ok') ? '<p class="muted small">Строк спливає — повідомте логіста. Дати оновлює офіс.</p>' : '') + '</section>';
  }
  /** На головній — один рядок, лише якщо щось прострочено або спливає за 14 днів. */
  function docsAlert(list) {
    const bad = (list || []).filter(d => d.left <= 14).sort((a, b) => a.left - b.left); if (!bad.length) return '';
    const d = bad[0];
    return '<button class="docalert st-' + d.state + '" data-q="truck">' + (d.state === 'over' ? '✗ ' : '⚠ ') + esc((d.kind === 'truck' ? 'Машина: ' : '') + d.type) + ' — ' + esc(d.left < 0 ? 'прострочено' : d.left === 0 ? 'сьогодні останній день' : 'ще ' + d.left + ' дн.') + (bad.length > 1 ? ' · і ще ' + (bad.length - 1) : '') + ' ›</button>';
  }
  async function openTruck(msg) {
    show('truck'); tkMode = '';
    if (!tk) { try { const c = JSON.parse(store.get('homeDrv') || 'null'); if (c && me && c.login === me.login) tk = c.st; } catch (e) {} }
    if (!tk) $('tkBody').innerHTML = '<p class="muted">Завантаження…</p>'; else renderTruck(msg);
    const nav = navSeq;
    try { tk = await api('truck.state'); if (nav === navSeq) renderTruck(msg); }
    catch (e) { if (nav !== navSeq) return; if (tk) (isNet(e) && ($('offline').hidden = true), renderTruck)(isNet(e) ? '<b>Немає зв\'язку.</b> Показую збережене на телефоні. Нові записи збережуться тут і надішлються самі.' : '<b>Не оновилось:</b> ' + esc(e.message)); else $('tkBody').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  function renderTruck(msg) {
    const c = tk.current, T = {}; tk.trucks.forEach(t => T[t.id] = t);
    let h = (msg ? '<div class="cinfo">' + msg + '</div>' : '') + workHtml(tk.planned, false);
    if (c && tkMode !== 'take') {
      const t = T[c.truck] || {};
      h += '<div class="card tkcur"><div class="muted small">Ви зараз на машині</div><div class="tkbig"><span class="plate">' + esc(c.truck) + '</span> ' + esc(t.plate || '') + '</div>' +
        '<div class="muted">' + (c.trailer ? 'причіп ' + esc(c.trailer) + ' · ' : '') + 'прийняли ' + tkTime(c.at) + (c.odo ? ' · спідометр ' + Number(c.odo).toLocaleString('uk-UA') : '') + '</div>' +
        '<label for="tkOdo">Спідометр при здачі, км</label><input id="tkOdo" inputmode="numeric" placeholder="напр. 512 340"><p class="muted small odo-info" id="tkOdoI"></p>' +
        '<label for="tkNote">Примітка (необов\'язково)</label><input id="tkNote" placeholder="напр. залишив на стоянці в Стрию">' +
        '<button class="primary" id="tkGive">Здати машину</button>' +
        '<button class="link" id="tkSwitch" style="margin-top:14px">Пересісти на іншу машину</button><p class="msg" role="alert" id="tkMsg"></p></div>';
    } else {
      const sel = (c && c.truck) || tk.guess || '';
      h += '<div class="card"><p class="muted" style="margin-top:0">' + (c ? 'Попередню машину ' + esc(c.truck) + ' програма здасть автоматично.' : 'Відмітьте машину, на яку ви сіли. Логіст і керівник одразу побачать це на дошці.') + '</p>' +
        '<label for="tkTruck">Машина</label><select id="tkTruck"><option value="">— оберіть —</option>' +
        tk.trucks.map(t => '<option value="' + esc(t.id) + '"' + (t.id === sel && !(c && c.truck === t.id) ? ' selected' : '') + '>' + esc(t.id) + (t.plate ? ' · ' + esc(t.plate) : '') + (t.holder ? ' (зараз: ' + esc(t.holder) + ')' : '') + '</option>').join('') + '</select>' +
        '<p class="cnote" id="tkWarn" hidden></p>' +
        '<label for="tkTrailer">Причіп (якщо знаєте)</label><select id="tkTrailer"><option value="">—</option>' + tk.trailers.map(p => '<option value="' + esc(p.id) + '">' + esc(p.id) + (p.plate && p.plate !== p.id ? ' · ' + esc(p.plate) : '') + '</option>').join('') + '</select>' +
        '<label for="tkOdo">Спідометр, км</label><input id="tkOdo" inputmode="numeric" placeholder="напр. 512 000"><p class="muted small odo-info" id="tkOdoI"></p>' +
        '<button class="primary" id="tkTake">Прийняти машину</button>' + (c ? '<button class="link" id="tkCancel" style="margin-top:14px">Скасувати</button>' : '') + '<p class="msg" role="alert" id="tkMsg"></p></div>';
    }
    h += docsCard(tk.docs);
    h += '<p class="muted small">Якщо помилились — просто прийміть правильну машину: попередня здасться сама. Логіст бачить усі зміни.</p>';
    $('tkBody').innerHTML = h;
    const warn = () => { const t = T[$('tkTruck').value]; $('tkWarn').hidden = !(t && t.holder); if (t && t.holder) $('tkWarn').textContent = 'За програмою на цій машині зараз ' + t.holder + '. Якщо ви її справді прийняли — продовжуйте, логіст перевірить.'; };
    const ow = odoWidget($('tkOdo'), $('tkOdoI'), () => $('tkTruck') ? $('tkTruck').value : (c && c.truck) || '');
    if ($('tkTruck')) { $('tkTruck').onchange = () => { warn(); ow.reload(); }; warn(); }
    if ($('tkSwitch')) $('tkSwitch').onclick = () => { tkMode = 'take'; renderTruck(); };
    if ($('tkCancel')) $('tkCancel').onclick = () => { tkMode = ''; renderTruck(); };
    const odo = () => String($('tkOdo').value || '').replace(/[\s ]/g, '');
    if ($('tkTake')) $('tkTake').onclick = async () => {
      const truck = $('tkTruck').value; if (!truck) { $('tkMsg').textContent = 'Оберіть машину'; return; }
      if (odo() && !/^\d{1,7}$/.test(odo())) { $('tkMsg').textContent = 'Спідометр — лише цифри'; return; }
      $('tkTake').disabled = true; busy(true);
      try { const r = await apiQ('truck.take', { truck, trailer: $('tkTrailer').value, odo: odo(), odoSrc: ow.src() }, 'прийняти машину ' + truck);
        if (r.queued) { tkMode = ''; renderTruck('✔ Збережено на телефоні: прийняти машину <b>' + esc(truck) + '</b>. Надішлеться само, щойно з\'явиться зв\'язок.'); return; }
        tk = r.state; tkMode = '';
        renderTruck(r.already ? 'Ви вже на цій машині.' : '✔ Машину <b>' + esc(truck) + '</b> прийнято.' + (r.checks && r.checks.length ? ' Логіст перевірить: ' + esc(r.checks.join('; ')) : '')); }
      catch (e) { $('tkMsg').textContent = e.message; $('tkTake').disabled = false; }
      finally { busy(false); }
    };
    if ($('tkGive')) $('tkGive').onclick = async () => {
      if (!await ask('Здати машину?', 'Логіст побачить, що ви більше не на цій машині.', 'Так, здати')) return;
      if (odo() && !/^\d{1,7}$/.test(odo())) { $('tkMsg').textContent = 'Спідометр — лише цифри'; return; }
      $('tkGive').disabled = true; busy(true);
      try { const r = await apiQ('truck.give', { odo: odo(), odoSrc: ow.src(), note: $('tkNote').value }, 'здати машину');
        if (r.queued) { renderTruck('✔ Збережено на телефоні: здати машину. Надішлеться само, щойно з\'явиться зв\'язок.'); return; }
        tk = r.state; renderTruck('✔ Машину здано.' + (r.checks && r.checks.length ? ' Логіст перевірить: ' + esc(r.checks.join('; ')) : '')); }
      catch (e) { $('tkMsg').textContent = e.message; $('tkGive').disabled = false; }
      finally { busy(false); }
    };
  }

  /* ── Документи й терміни (етап 2): що спливає по машинах, водіях і ТІР ── */
  let docs = null, dKind = store.get('dKind') || 'all', dHorizon = store.get('dHorizon') || '30';
  async function openDocs(force) {
    show('docs'); if (!docs || force) $('dList').innerHTML = '<p class="muted">Завантаження…</p>';
    const can = new Set(sheets.map(s => s.name));
    const ask = sheet => can.has(sheet) ? api('list', { sheet }).then(o => o.rows).catch(() => []) : Promise.resolve([]);
    try {
      const [dd_, tir, trucks, onTruck, workers] = await Promise.all([ask('Терміни документів'), ask('ТІР карнети'), ask('Авто'), ask('Водій на авто'), ask('Працівники')]);
      const today = new Date(new Date().toDateString());
      const W = {}; workers.forEach(w => W[w['Працівник ID']] = w);
      const nowTruck = {}; onTruck.filter(o => (!o['З'] || new Date(o['З']) <= today) && (!o['По'] || new Date(o['По']) >= today)).forEach(o => nowTruck[o['Працівник ID']] = o['Авто ID']);
      const truckIds = trucks.filter(a => a['Активне'] !== false).map(a => String(a['Авто ID']));
      const items = [];
      dd_.forEach(d => {
        if (!d['Діє до']) return;
        const who = String(d['Чий'] || ''), until = new Date(String(d['Діє до']).slice(0, 10) + 'T00:00:00');
        const wm = who.match(/\bD\d+\b/), tm = who.match(/\d{4}/);
        let kind, owner, truck = '';
        if (wm) { const w = W[wm[0]]; if (w && w['Працює'] === false) return; kind = 'driver'; owner = (w ? w['Прізвище'] : who.replace(/^Працівник\s*/, '')); truck = nowTruck[wm[0]] || ''; }
        else { kind = 'truck'; truck = tm ? tm[0] : ''; owner = truck || who.replace(/^Авто\s*/, ''); if (truck && truckIds.length && truckIds.indexOf(truck) < 0) return; }
        items.push({ kind, owner, truck, type: String(d['Тип'] || 'документ'), num: d['Номер'] || '', until, left: Math.round((until - today) / 864e5) });
      });
      tir.forEach(t => {
        if (/здан/i.test(String(t['Статус'] || '') + String(t['Використано'] || '')) || !t['Діє до']) return;
        const until = new Date(String(t['Діє до']).slice(0, 10) + 'T00:00:00');
        items.push({ kind: 'tir', owner: String(t['Авто ID'] || '—'), truck: String(t['Авто ID'] || ''), type: 'ТІР карнет', num: t['Карнет'] || '', until, left: Math.round((until - today) / 864e5) });
      });
      docs = items.sort((a, b) => a.left - b.left);
      renderDocs();
    } catch (e) { $('dList').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  function renderDocs() {
    const q = $('dSearch').value.trim().toLowerCase();
    const K = { all: 'Усі', truck: 'Машини', driver: 'Водії', tir: 'ТІР' }, Hz = { '30': '≤ 30 днів', '90': '≤ 90 днів', 'all': 'усі терміни' };
    const inH = x => dHorizon === 'all' || x.left <= +dHorizon;
    $('dChips').innerHTML = '';
    const chip = (label, n, on, fn) => { const c = document.createElement('button'); c.className = 'chip'; c.setAttribute('aria-pressed', String(on)); c.innerHTML = esc(label) + (n != null ? ' <small>' + n + '</small>' : ''); c.onclick = fn; $('dChips').appendChild(c); };
    Object.keys(K).forEach(k => chip(K[k], docs.filter(x => (k === 'all' || x.kind === k) && inH(x)).length, dKind === k, () => { dKind = k; store.set('dKind', k); renderDocs(); }));
    Object.keys(Hz).forEach(h => chip(Hz[h], null, dHorizon === h, () => { dHorizon = h; store.set('dHorizon', h); renderDocs(); }));
    const list = docs.filter(x => (dKind === 'all' || x.kind === dKind) && inH(x) && (!q || [x.owner, x.truck, x.type, x.num].join(' ').toLowerCase().includes(q)));
    const over = docs.filter(x => x.left < 0).length, soon = docs.filter(x => x.left >= 0 && x.left <= 7).length;
    $('dSub').textContent = 'Прострочено: ' + over + ' · спливає за 7 днів: ' + soon;
    const groups = [['Прострочено', x => x.left < 0, 'bad'], ['Сьогодні – 7 днів', x => x.left >= 0 && x.left <= 7, 'warn'], ['8 – 30 днів', x => x.left > 7 && x.left <= 30, ''], ['31 – 90 днів', x => x.left > 30 && x.left <= 90, ''], ['Пізніше', x => x.left > 90, '']];
    const icon = { truck: '🚛', driver: '👤', tir: '🛃' };
    let h = '';
    groups.forEach(([title, f, cls]) => {
      const g = list.filter(f); if (!g.length) return;
      h += '<section class="card dgroup ' + cls + '"><h2>' + esc(title) + ' <span class="count">' + g.length + '</span></h2>' + g.map(x =>
        '<div class="drow"><span class="dico">' + icon[x.kind] + '</span><div class="dmain"><b>' + esc(x.type) + '</b>' + (x.num ? ' <span class="muted small">' + esc(x.num) + '</span>' : '') +
        '<div class="muted small">' + (x.kind === 'driver' ? esc(x.owner) + (x.truck ? ' · зараз на ' + esc(x.truck) : '') : 'авто ' + esc(x.owner)) + '</div></div>' +
        '<div class="dwhen"><b>' + x.until.toLocaleDateString('uk-UA') + '</b><span class="pill ' + (x.left < 0 ? 'st-bad' : x.left <= 7 ? 'st-idle' : x.left <= 30 ? 'st-trip' : 'st-none') + '">' +
        (x.left < 0 ? 'прострочено ' + (-x.left) + ' дн' : x.left === 0 ? 'сьогодні' : 'через ' + x.left + ' дн') + '</span></div></div>').join('') + '</section>';
    });
    $('dList').innerHTML = h || '<p class="muted">Нічого не знайдено.</p>';
  }

  /* ── Боржники (ADR-074): безготівкові рейси без позначки оплати, за клієнтом. Сума — «Сума для рахунку» (ADR-073) ── */
  let debts = null, dbOld = false;
  const DBCUR = { EUR: '€', PLN: 'zł', USD: '$', UAH: 'грн' };
  const dbSums = o => Object.keys(o || {}).map(c => money(o[c]) + ' ' + (DBCUR[c] || c)).join(' + ') || '—';
  /* Проблеми водіїв (рішення власниці 22.11): логіст — свої (черга, документи, склад…) і передає керівнику; керівник — поломка, ДТП, передані + історія всіх. */
  let probs = null, probOpen = true, probW = '';
  async function openProbs() {
    show('probs'); $('prList').innerHTML = '<p class="muted">Завантаження…</p>';
    try { probs = await api('problems', { open: false }); renderProbs(); } catch (e) { $('prList').innerHTML = '<p class="msg" role="alert">' + esc(e.message) + '</p>'; }
  }
  const dtm = v => { const d = new Date(v); return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  function renderProbs() {
    const d = probs, q = $('prSearch').value.trim().toLowerCase(), ST_W = { 'нова': 'нова', 'в роботі': 'в роботі', 'вирішено': 'вирішено' };
    $('prChips').innerHTML = ''; [['Відкриті', true], ['Усі' + (d.boss ? ' (історія)' : ' за 14 днів'), false]].forEach(([l, v]) => { const c = document.createElement('button'); c.className = 'chip'; c.setAttribute('aria-pressed', String(probOpen === v)); c.textContent = l; c.onclick = () => { probOpen = v; renderProbs(); }; $('prChips').appendChild(c); });
    const drivers = [...new Map(d.list.map(p => [p.worker, p.name])).entries()].filter(x => x[0]).sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'uk'));
    $('prWorker').innerHTML = '<option value="">Усі водії</option>' + drivers.map(([w, n]) => '<option value="' + esc(w) + '"' + (w === probW ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
    const rows = d.list.filter(p => (!probOpen || p.state !== 'вирішено') && (!probW || p.worker === probW) && (!q || (p.text + ' ' + p.trip + ' ' + p.truck + ' ' + p.name + ' ' + p.answer).toLowerCase().includes(q)));
    const open = d.list.filter(p => p.state !== 'вирішено'), mine = open.filter(p => p.owner === (me.role === 'логіст' ? 'логіст' : 'керівник'));
    $('prSub').textContent = 'Відкритих: ' + open.length + (mine.length ? ' · ваших: ' + mine.length : '');
    $('prList').innerHTML = rows.length ? '<div class="prl">' + rows.map(p => '<button class="card prrow st-' + (p.state === 'вирішено' ? 'ok' : p.state === 'в роботі' ? 'soon' : 'bad') + '" data-prtrip="' + esc(p.trip) + '"><div class="prhead"><b>' + esc(p.name || p.worker || '—') + '</b> · ' + esc(p.truck) + ' · рейс ' + esc(p.trip) + ' <span class="pill">' + esc(ST_W[p.state] || p.state) + '</span> <span class="pill">' + (p.owner === 'керівник' ? 'керівника' : 'логіста') + '</span></div><div>' + esc(p.text) + '</div><div class="muted small">' + dtm(p.at) + (p.answer ? ' · відповідь (' + esc(p.answerWho) + '): ' + esc(p.answer) : '') + '</div></button>').join('') + '</div>' : '<p class="muted">Немає проблем за цим відбором.</p>';
    $('prList').querySelectorAll('[data-prtrip]').forEach(b => b.onclick = e => { e.stopPropagation(); openTrip(b.dataset.prtrip, 'probs'); });
  }
  $('prSearch').oninput = () => probs && renderProbs(); $('prWorker').onchange = e => { probW = e.target.value; renderProbs(); }; $('prRefresh').onclick = openProbs;
  /* ── «До виставлення» (ADR-087): бухгалтер позначає рахунки з BAS; адмін, керівник — перегляд ── */
  let inv = null, invTab = 'todo';
  async function openInv(force) {
    show('inv'); if (!inv || force) $('invList').innerHTML = '<p class="muted">Збираю рейси до виставлення…</p>';
    try { inv = await api('inv'); renderInv(); } catch (e) { $('invList').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  const ddmm = s => s ? s.split('-').reverse().join('.') : '';
  function renderInv() {
    const d = inv, q = $('invSearch').value.trim().toLowerCase(), warnN = d.todo.filter(t => t.check).length, noCode = d.todo.filter(t => /ЄДРПОУ/.test(t.check)).length;
    $('invSub').textContent = 'До виставлення: ' + d.todo.length + ' рейс(ів) з ' + ddmm(d.from) + (warnN ? ' · ⚠ не готові до виставлення: ' + warnN + (noCode ? ' (без ЄДРПОУ клієнта: ' + noCode + ')' : '') : '');
    $('invCsv').hidden = !d.todo.length;
    $('invChips').innerHTML = '';
    [['До виставлення · ' + d.todo.length, 'todo'], ['Виставлені нещодавно · ' + d.done.length, 'done']].forEach(([l, v]) => { const c = document.createElement('button'); c.className = 'chip'; c.setAttribute('aria-pressed', String(invTab === v)); c.textContent = l; c.onclick = () => { invTab = v; renderInv(); }; $('invChips').appendChild(c); });
    const list = (invTab === 'todo' ? d.todo : d.done).filter(t => !q || (t.client + ' ' + t.code + ' ' + t.id + ' ' + t.from + ' ' + t.to + ' ' + t.truck + ' ' + t.num).toLowerCase().includes(q));
    const groups = []; const gi = {}; list.forEach(t => { const k = t.client || '— без клієнта —'; if (!(k in gi)) { gi[k] = groups.length; groups.push({ client: k, code: t.code, full: t.full, trips: [] }); } groups[gi[k]].trips.push(t); });
    const sums = ts => { const o = {}; ts.forEach(t => { if (typeof t.sum === 'number') o[t.cur] = (o[t.cur] || 0) + t.sum; }); return Object.keys(o).map(c => money(Math.round(o[c] * 100) / 100) + ' ' + c).join(' + '); };
    let h = '';
    groups.forEach(g => {
      h += '<section class="card dgroup invg"><div class="dbhead"><div><h2>' + esc(g.client) + '</h2><p class="muted small">' + (g.code ? 'код ' + esc(g.code) : '⚠ немає ЄДРПОУ — допишіть у «Клієнти»') + (g.full ? ' · ' + esc(g.full) : '') + '</p></div>' +
        '<div class="dwhen"><b>' + esc(sums(g.trips)) + '</b><span class="muted small">' + g.trips.length + ' рейс(ів)</span></div></div>' +
        g.trips.map(t => '<div class="drow invrow"><div class="dmain"><a href="#" data-itrip="' + esc(t.id) + '"><b>' + esc(t.id) + '</b></a> <span class="muted small">' + esc(ddmm(t.day)) + ' · ' + esc(t.from) + ' → ' + esc(t.to) + ' · ' + esc(t.truck) + (t.trailer ? '/' + esc(t.trailer) : '') + '</span>' +
          '<div class="small invtext">' + esc(t.text) + '</div>' +
          (t.check ? '<div class="small invchk">⚠ ' + esc(t.check) + '</div>' : '') +
          (t.note ? '<div class="muted small">' + esc(t.note) + '</div>' : '') +
          (t.num ? '<div class="small">✓ рахунок № <b>' + esc(t.num) + '</b>' + (t.date ? ' від ' + esc(ddmm(t.date)) : '') + '</div>' : '') + '</div>' +
          '<div class="dwhen"><b>' + esc(typeof t.sum === 'number' ? money(t.sum) : String(t.sum || '—')) + ' ' + esc(t.cur) + '</b>' + (typeof t.net === 'number' ? '<span class="muted small">без ПДВ ' + esc(money(t.net)) + ' · ПДВ ' + esc(t.rate) + '</span>' : '') +
          '<span class="row"><button class="btn small" data-icopy="' + esc(t.id) + '">Копіювати текст</button>' + (d.canMark ? (t.num ? '<button class="btn small" data-iundo="' + esc(t.id) + '">Зняти позначку</button>' : '<button class="primary small" data-imark="' + esc(t.id) + '">Виставлено…</button>') : '') + '</span></div></div>').join('') + '</section>';
    });
    $('invList').innerHTML = h || '<p class="muted">' + (invTab === 'todo' ? 'Усі рейси виставлено.' : 'Ще нічого не позначено.') + '</p>';
  }
  async function invMark(id, undo) {
    const t = inv.todo.concat(inv.done).find(x => x.id === id); if (!t) return;
    let v = { num: '', date: '' };
    if (!undo) { v = await askForm('Рахунок для рейсу ' + id, [{ id: 'num', label: '№ рахунку (з BAS)', ph: 'напр. 245', req: true }, { id: 'date', label: 'Дата рахунку', type: 'date', value: new Date().toISOString().slice(0, 10), req: true }], 'Позначити виставленим', t.client + ' · ' + (typeof t.sum === 'number' ? money(t.sum) : t.sum) + ' ' + t.cur); if (!v) return; }
    else if (!await ask('Зняти позначку?', 'Рейс ' + id + ' повернеться в «До виставлення».', 'Зняти')) return;
    busy(true); try { await api('inv.mark', { tripId: id, num: v.num, date: v.date, undo: !!undo }); toast(undo ? 'Позначку знято.' : 'Рейс ' + esc(id) + ' — виставлено.'); await openInv(); } catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); }
  }
  $('invList').onclick = async e => {
    const a = e.target.closest('[data-itrip]'); if (a) { e.preventDefault(); openTrip(a.dataset.itrip, 'inv'); return; }
    const m = e.target.closest('[data-imark]'); if (m) return invMark(m.dataset.imark);
    const u = e.target.closest('[data-iundo]'); if (u) return invMark(u.dataset.iundo, true);
    const c = e.target.closest('[data-icopy]'); if (c) { const t = inv.todo.concat(inv.done).find(x => x.id === c.dataset.icopy); try { await navigator.clipboard.writeText(t.text); toast('Текст послуги скопійовано.'); } catch (er) { toast('Не вдалося скопіювати — виділіть текст вручну.', 'err'); } }
  };
  $('invSearch').oninput = () => inv && renderInv();
  $('invRefresh').onclick = () => openInv(true);
  $('invCsv').onclick = async () => { busy(true); try { const r = await api('inv.csv', {}); saveFile(r.name, r.csv); toast('Файл для BAS: ' + r.n + ' рейс(ів) — ' + esc(r.name)); } catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); } };

  async function openDebts(force) {
    show('debts'); $('dbBank').hidden = !me || ['адмін', 'керівник', 'бухгалтер'].indexOf(me.role) < 0; if (!debts || force) $('dbList').innerHTML = '<p class="muted">Завантаження…</p>';
    try { debts = await api('debts', {}); renderDebts(); } catch (e) { $('dbList').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  function remindText(g) {
    const tr = g.trips.filter(t => t.late >= 0);
    return 'Добрий день! Нагадуємо про оплату за перевезення:\n' + tr.map(t => '• ' + t.route + (t.unload ? ', розвантаження ' + t.unload.split('-').reverse().join('.') : '') + ' — ' + money(t.sum) + ' ' + t.cur + ', строк оплати ' + t.due.split('-').reverse().join('.')).join('\n') +
      '\nЯкщо оплату вже здійснено — дякуємо, надішліть, будь ласка, платіжку.\nТОВ «Л-КОРП»';
  }
  function renderDebts() {
    const d = debts, q = $('dbSearch').value.trim().toLowerCase(), R = d.recentDays;
    $('dbSub').textContent = 'Прострочено (до ' + R + ' дн.): ' + dbSums(d.total.recent) + ' · строк за ' + d.soonDays + ' дн.: ' + dbSums(d.total.soon);
    $('dbChips').innerHTML = '';
    [['Актуальні', false], ['+ старіші за ' + R + ' дн.', true]].forEach(([l, v]) => { const c = document.createElement('button'); c.className = 'chip'; c.setAttribute('aria-pressed', String(dbOld === v)); c.textContent = l; c.onclick = () => { dbOld = v; renderDebts(); }; $('dbChips').appendChild(c); });
    const vis = t => t.late < 0 || t.late <= R || t.flagged || dbOld;
    const list = d.clients.map(g => ({ ...g, show: g.trips.filter(vis) })).filter(g => g.show.length && (!q || (g.client + ' ' + g.trips.map(t => t.trip + ' ' + t.truck + ' ' + t.route).join(' ')).toLowerCase().includes(q)));
    let h = '';
    list.forEach((g, gi) => {
      const late = g.show.filter(t => t.late >= 0).length, cls = g.flagged || g.maxLate > 30 ? 'bad' : late ? 'warn' : '';
      h += '<section class="card dgroup dbg ' + cls + '"><div class="dbhead"><div><h2>' + esc(g.client) + (g.flagged ? ' <span class="badge b-bad">у списку боржників</span>' : '') + '</h2>' +
        '<p class="muted small">' + (late ? 'прострочено: ' + dbSums(g.recent) + (dbOld && Object.keys(g.old).length ? ' · старіші: ' + dbSums(g.old) : '') : '') + (Object.keys(g.soon).length ? (late ? ' · ' : '') + 'скоро строк: ' + dbSums(g.soon) : '') + (g.contact ? ' · ' + esc(g.contact) : '') + '</p></div>' +
        (late ? '<button class="btn" data-remind="' + gi + '">Текст нагадування</button>' : '') + '</div>' +
        g.show.map(t => '<a href="#" class="drow dbrow" data-dtrip="' + esc(t.trip) + '"><div class="dmain"><b>' + esc(t.trip) + '</b> <span class="muted small">' + esc(t.route) + '</span>' +
          '<div class="muted small">строк ' + esc(t.due.split('-').reverse().join('.')) + (t.guessed ? ' (розвантаження + відстрочка)' : '') + (t.note && !t.flagged ? ' · ' + esc(t.note) : '') + '</div></div>' +
          '<div class="dwhen"><b>' + esc(money(t.sum)) + ' ' + esc(DBCUR[t.cur] || t.cur) + '</b><span class="pill ' + (t.late < 0 ? 'st-none' : t.late <= 7 ? 'st-idle' : 'st-bad') + '">' +
          (t.late < 0 ? 'через ' + (-t.late) + ' дн' : t.late === 0 ? 'сьогодні' : t.late + ' дн прострочки') + '</span></div></a>').join('') + '</section>';
    });
    $('dbList').innerHTML = h || '<p class="muted">Боржників немає' + (dbOld ? '' : ' (за останні ' + R + ' днів)') + '.</p>';
    $('dbList').onclick = async e => {
      const a = e.target.closest('[data-dtrip]'); if (a) { e.preventDefault(); openTrip(a.dataset.dtrip, 'debts'); return; }
      const b = e.target.closest('[data-remind]'); if (!b) return;
      const txt = remindText(list[+b.dataset.remind]);
      try { await navigator.clipboard.writeText(txt); toast('Текст скопійовано — вставте в лист чи месенджер клієнту.'); }
      catch (err) { const w = document.createElement('div'); w.className = 'ask-wrap'; w.innerHTML = '<div class="ask" role="dialog" aria-modal="true"><h2>Скопіюйте текст нагадування</h2><textarea rows="8" readonly style="width:100%"></textarea><div class="ask-btns"><button class="primary" data-a="1">Готово</button></div></div>'; w.querySelector('textarea').value = txt; document.body.appendChild(w); w.querySelector('textarea').select(); w.onclick = ev => { if (ev.target.closest('[data-a]')) w.remove(); }; }
    };
  }

  /* ── Виписка банку → «Оплачено» (ADR-077). Файл читається тут, на сервер ідуть лише надходження ── */
  let bk = null;
  function openBank() { show('bank'); bk = null; $('bkFile').value = ''; $('bkMap').innerHTML = ''; $('bkList').innerHTML = ''; $('bkBar').hidden = true; }
  const bkNum = v => { if (typeof v === 'number') return v; let t = String(v == null ? '' : v).replace(/[\s ']/g, '').replace(/[^\d,.\-]/g, ''); if (!t) return NaN;
    const c = t.lastIndexOf(','), d = t.lastIndexOf('.'); if (c > d) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(/,/g, ''); return +t; };
  const bkDate = v => { if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
    const t = String(v == null ? '' : v).trim(); let m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/); if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0]; if (/^\d{5}(\.\d+)?$/.test(t)) { const d = new Date(Math.round((+t - 25569) * 864e5)); return d.toISOString().slice(0, 10); } return ''; };
  function bkCsv(text) {
    const first = text.split(/\r?\n/).slice(0, 15).join('\n'), dl = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) { const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true; else if (ch === dl) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch; }
    if (cell || row.length) { row.push(cell); rows.push(row); } return rows;
  }
  const BKF = [['date', 'Дата', /дата/i], ['credit', 'Надходження (кредит)', /кредит|надходж|зарахов|credit|прихід/i], ['debit', 'Списання (дебет)', /дебет|списан|debit|витрат/i], ['amount', 'Сума (якщо одна колонка)', /^сума|сума операц|amount|сума в валют/i],
    ['cur', 'Валюта', /валют|currency/i], ['payer', 'Платник', /контрагент|платник|кореспондент|відправник|найменування|назва/i], ['code', 'Код платника', /єдрпоу|едрпоу|окпо|ідентиф|іпн|код/i], ['purpose', 'Призначення', /призначен|опис|деталі|коментар|purpose|description/i]];
  async function bankFile(f) {
    $('bkMap').innerHTML = '<p class="muted">Читаю файл…</p>'; $('bkList').innerHTML = ''; $('bkBar').hidden = true;
    try {
      let rows;
      if (/\.xlsx?$/i.test(f.name)) {
        if (!window.XLSX) await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; sc.onload = res; sc.onerror = () => rej(new Error('Не вдалося завантажити читач Excel — збережіть виписку як CSV')); document.head.appendChild(sc); });
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true }); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
      } else {
        const buf = await f.arrayBuffer(); let text = new TextDecoder('utf-8').decode(buf); if (/�/.test(text.slice(0, 2000))) text = new TextDecoder('windows-1251').decode(buf);
        rows = bkCsv(text.replace(/^﻿/, ''));
      }
      let hi = 0, best = 0; rows.slice(0, 40).forEach((r, i) => { const n = BKF.filter(([, , re]) => r.some(c => re.test(String(c)))).length; if (n > best) { best = n; hi = i; } });
      if (best < 2) throw new Error('Не знайшла рядок із заголовками (дата, сума, призначення…). Надішліть приклад виписки — налаштую під ваш банк.');
      const head = rows[hi].map(String), map = {};
      BKF.forEach(([k, , re]) => { const j = head.findIndex((h, jj) => re.test(h) && !Object.values(map).includes(jj) && !(k === 'code' && /рахун|iban/i.test(h))); if (j >= 0) map[k] = j; });
      bk = { name: f.name, head, rows: rows.slice(hi + 1).filter(r => r.some(c => String(c).trim())), map, cur: 'UAH' };
      bankMapUi();
    } catch (e) { $('bkMap').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  function bankMapUi() {
    const opt = (k, lbl) => '<label>' + esc(lbl) + '<select data-bk="' + k + '"><option value="">—</option>' + bk.head.map((h, j) => '<option value="' + j + '"' + (bk.map[k] === j ? ' selected' : '') + '>' + esc(h || ('колонка ' + (j + 1))) + '</option>').join('') + '</select></label>';
    $('bkMap').innerHTML = '<section class="card"><h2>' + esc(bk.name) + ' · ' + bk.rows.length + ' рядків</h2><p class="muted small">Перевірте, які колонки що означають.</p><div class="tfgrid">' + BKF.map(([k, l]) => opt(k, l)).join('') +
      '<label>Валюта, якщо колонки немає<select id="bkCur">' + ['UAH', 'EUR', 'USD', 'PLN'].map(c => '<option' + (c === bk.cur ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></label></div>' +
      '<p class="row"><button class="primary" id="bkGo">Знайти оплачені рейси</button> <span class="muted small" id="bkCnt"></span></p></section>';
    $('bkMap').querySelectorAll('[data-bk]').forEach(s => s.onchange = () => { const v = s.value; if (v === '') delete bk.map[s.dataset.bk]; else bk.map[s.dataset.bk] = +v; bankCnt(); });
    $('bkCur').onchange = e => { bk.cur = e.target.value; }; $('bkGo').onclick = bankMatch; bankCnt();
  }
  function bankPays() {
    const m = bk.map, g = (r, k) => m[k] == null ? '' : r[m[k]];
    return bk.rows.map(r => { let a = NaN; if (m.credit != null) a = bkNum(g(r, 'credit')); if (!(a > 0) && m.credit == null && m.amount != null) a = bkNum(g(r, 'amount'));
      if (m.debit != null && bkNum(g(r, 'debit')) > 0 && !(m.credit != null && a > 0)) a = NaN;
      return { date: bkDate(g(r, 'date')), amount: Math.round(a * 100) / 100, cur: (String(g(r, 'cur')).trim().toUpperCase().replace('ГРН', 'UAH').replace('UAH.', 'UAH') || bk.cur).slice(0, 3), payer: String(g(r, 'payer')).trim(), code: String(g(r, 'code')).trim(), purpose: String(g(r, 'purpose')).trim() }; })
      .filter(p => p.amount > 0 && p.date);
  }
  function bankCnt() { const n = bankPays().length; $('bkCnt').textContent = n ? 'Надходжень: ' + n : 'Надходжень не знайдено — перевірте колонки дати й суми'; $('bkGo').disabled = !n; }
  async function bankMatch() {
    const pays = bankPays(); bk.cur = $('bkCur').value;
    $('bkList').innerHTML = '<p class="muted">Шукаю рейси…</p>';
    try { bk.res = await api('bank.match', { payments: pays }); bk.pick = {}; bk.res.payments.forEach(p => { if (p.cands[0] && p.cands[0].sure) bk.pick[p.i] = 0; }); bankRender(); }
    catch (e) { $('bkList').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  function bankRender() {
    const R = bk.res, P = R.payments, st = R.stats, fd = d => d ? d.split('-').reverse().join('.') : '';
    const card = p => { const sel = bk.pick[p.i];
      const head = '<div class="bkp"><b>' + esc(money(p.amount)) + ' ' + esc(p.cur) + '</b> · ' + esc(fd(p.date)) + ' · ' + esc(p.payer || 'платник не вказаний') + (p.code ? ' <span class="muted small">' + esc(p.code) + '</span>' : '') + '<div class="muted small bkpur">' + esc(p.purpose) + '</div></div>';
      if (p.done) return '<div class="bkrow done">' + head + '<p class="muted small">Уже розібрано раніше: ' + esc(p.done) + '</p></div>';
      const cs = p.cands.map((c, k) => '<label class="bkc"><input type="radio" name="bk' + p.i + '" value="' + k + '"' + (sel === k ? ' checked' : '') + '><span><b>' + c.trips.map(t => esc(t.trip)).join(' + ') + '</b> · ' + esc(c.trips[0].client || '') + (c.trips.length === 1 ? ' · ' + esc(c.trips[0].route || '') + (c.trips[0].unload ? ', розвант. ' + esc(fd(c.trips[0].unload)) : '') : ' · ' + c.trips.length + ' рейси') +
        ' <span class="pill ' + (c.sure ? 'st-ok' : 'st-idle') + '">' + (c.sure ? 'впевнено' : 'перевірте') + '</span></span></label>').join('');
      return '<div class="bkrow">' + head + (cs ? cs + '<label class="bkc"><input type="radio" name="bk' + p.i + '" value=""' + (sel == null ? ' checked' : '') + '><span class="muted">не цей / пропустити</span></label>' : '<p class="muted small">Рейс не знайдено — платіж лишиться нерозібраним.</p>') + '</div>'; };
    const sure = P.filter(p => !p.done && p.cands[0] && p.cands[0].sure), check = P.filter(p => !p.done && p.cands.length && !(p.cands[0].sure)), none = P.filter(p => !p.done && !p.cands.length), done = P.filter(p => p.done);
    const sec = (t, arr, open) => arr.length ? '<details class="card bksec"' + (open ? ' open' : '') + '><summary><h2>' + esc(t) + ' · ' + arr.length + '</h2></summary>' + arr.map(card).join('') + '</details>' : '';
    $('bkList').innerHTML = sec('Впевнено знайдено', sure, true) + sec('Перевірте — кілька варіантів або схожа сума', check, true) + sec('Рейс не знайдено', none, false) + sec('Уже розібрані раніше', done, false) +
      (P.length ? '' : '<p class="muted">Надходжень немає.</p>');
    $('bkList').onchange = e => { const r = e.target.closest('input[type=radio]'); if (!r) return; const i = +r.name.slice(2); if (r.value === '') delete bk.pick[i]; else bk.pick[i] = +r.value; bankSum(); };
    bankSum();
  }
  function bankSum() { const n = Object.keys(bk.pick).length, trips = Object.keys(bk.pick).reduce((a, i) => a + bk.res.payments[i].cands[bk.pick[i]].trips.length, 0);
    $('bkBar').hidden = !n; $('bkSum').textContent = n ? n + ' платежів → ' + trips + ' рейсів' : ''; }
  async function bankApply() {
    const items = Object.keys(bk.pick).map(i => { const p = bk.res.payments[i]; return { key: p.key, date: p.date, amount: p.amount, cur: p.cur, payer: p.payer, code: p.code, purpose: p.purpose, trips: p.cands[bk.pick[i]].trips.map(t => t.trip) }; });
    const n = items.reduce((a, x) => a + x.trips.length, 0);
    if (!await ask('Позначити оплаченими ' + n + ' рейсів?', 'У рейсах з\'явиться дата оплати й примітка «оплата за випискою». Зміни видно в журналі змін; помилкову позначку можна виправити в рейсі.', 'Так, позначити')) return;
    $('bkApply').disabled = true;
    try { const r = await api('bank.apply', { items }); toast('Позначено оплаченими: ' + r.paid + (r.skipped ? ', уже були розібрані: ' + r.skipped : '') + (r.errors && r.errors.length ? '. Не вдалося: ' + r.errors.join('; ') : ''), r.errors && r.errors.length ? 'err' : '');
      debts = null; board = null; try { store.set('boardCache', ''); } catch (e) {} openDebts(true); }
    catch (e) { toast(esc(e.message), 'err'); } finally { $('bkApply').disabled = false; }
  }

  /* ── Мої рейси й моя зарплата (ADR-081) — лише читання; «Є питання» — керівнику ── */
  let pay = null, payTab = 'pay';
  const pyUah = v => v == null || v === '' ? '—' : money(Math.round(v * 100) / 100) + ' грн';
  const pyD = d => d ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : '';
  const pyN = n => n + ' ' + (n % 10 === 1 && n % 100 !== 11 ? 'рейс' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'рейси' : 'рейсів');
  const MONTHS = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'];
  async function openPay(tab, force) {
    payTab = tab || payTab; show('mypay'); $('pyTitle').textContent = payTab === 'trips' ? 'Мої рейси' : 'Моя зарплата';
    if (!pay) pay = SCR.pay || null;
    if (!pay) $('pyBody').innerHTML = '<p class="muted">Завантаження…</p>'; else renderPay();
    try { pay = await api('my.pay', {}); scrSet('pay', pay); renderPay(); }
    catch (e) { if (pay) { renderPay(); toast(isNet(e) ? 'Немає зв\'язку — показано збережене на телефоні.' : esc(e.message), isNet(e) ? '' : 'err'); } else $('pyBody').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  function renderPay() {
    const d = pay, S = d.summary;
    $('pyTabs').innerHTML = '';
    [['pay', 'Зарплата'], ['trips', 'Рейси · ' + S.trips]].forEach(([k, l]) => { const b = document.createElement('button'); b.className = 'chip'; b.setAttribute('aria-pressed', String(payTab === k)); b.textContent = l; b.onclick = () => { payTab = k; $('pyTitle').textContent = k === 'trips' ? 'Мої рейси' : 'Моя зарплата'; renderPay(); }; $('pyTabs').appendChild(b); });
    const tripRow = t => '<a href="#" class="drow pyrow" data-ptrip="' + esc(t.id) + '"><div class="dmain"><b>' + esc([t.from, t.to].filter(Boolean).join(' → ') || t.id) + '</b>' +
      '<div class="muted small">' + esc(t.id) + (t.type ? ' · ' + esc(t.type) : '') + (t.load || t.unload ? ' · ' + [t.load, t.unload].filter(Boolean).map(pyD).map(esc).join('–') : '') + (t.cross ? ' · ' + esc(t.cross) : '') + '</div>' +
      (t.how ? '<div class="muted small">' + esc(t.how) + (t.special ? ' · ' + esc(t.special) : '') + '</div>' : '') + '</div>' +
      '<div class="dwhen"><b>' + (t.salary != null ? esc(pyUah(t.salary)) : '<span class="muted">ще не нараховано</span>') + '</b></div></a>';
    let h = '';
    if (payTab === 'trips') {
      const by = {}; d.trips.forEach(t => { const k = (t.load || t.unload || '').slice(0, 7) || '—'; (by[k] = by[k] || []).push(t); });
      Object.keys(by).sort().reverse().forEach(k => { const L = by[k], sum = L.reduce((a, t) => a + (t.salary || 0), 0), nm = k === '—' ? 'Без дати' : MONTHS[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4);
        h += '<section class="card dgroup"><div class="dbhead"><h2>' + esc(nm.charAt(0).toUpperCase() + nm.slice(1)) + '</h2><span class="muted small">' + pyN(L.length) + ' · нараховано ' + esc(pyUah(sum)) + '</span></div>' + L.map(tripRow).join('') + '</section>'; });
      $('pyBody').innerHTML = h || '<p class="muted">Рейсів ще немає.</p>';
    } else {
      const b = S.balance;
      h += '<section class="card pysum">' + (b ? '<div class="pybig ' + (b.sum < 0 ? 'neg' : '') + '"><span>До виплати на ' + esc(pyD(b.date)) + (b.approved === false ? ' · орієнтовно' : '') + '</span><b>' + esc(pyUah(b.sum)) + '</b></div>' +
          (b.approved === false ? '<p class="muted small">Орієнтовно: керівник ще не затвердив останній кругорейс — сума може змінитись.</p>' : '') +
          (b.sum < 0 ? '<p class="muted small">Мінус — аванси й виплати були більші за нараховане; закриється наступними рейсами.</p>' : '') : '<p class="muted">Розрахунку «до виплати» ще немає в програмі.</p>') +
        (S.fresh.sum ? '<div class="kv"><span>Нараховано за рейси ' + (S.fresh.since ? 'після ' + esc(pyD(S.fresh.since)) : '') + ' (' + pyN(S.fresh.trips) + ')</span><b>' + esc(pyUah(S.fresh.sum)) + '</b></div><p class="muted small">Увійде в наступний розрахунок керівника.</p>' : '') +
        '<div class="kv"><span>Нараховано за ' + esc(S.year) + ' рік</span><b>' + esc(pyUah(S.yearSum)) + '</b></div></section>';
      if (d.circles.length) h += '<h2 class="pyh">Кругорейси</h2>' + d.circles.map((c, i) => {
        const ts = d.trips.filter(t => c.trips.indexOf(t.id) >= 0);
        return '<details class="card pyc"' + (i === 0 ? ' open' : '') + '><summary><div><b>' + esc(pyD(c.from)) + (c.to ? ' – ' + esc(pyD(c.to)) : ' – триває') + '</b> <span class="muted small">· ' + esc(c.id) + ' · ' + pyN(ts.length) + '</span></div>' +
          '<div class="pycr"><b>' + esc(pyUah(c.salary)) + '</b>' + (c.settled ? '<span class="pill st-ok">розраховано</span>' : '') + '<span class="pill ' + (c.approved ? 'st-ok' : c.salary != null ? 'st-idle' : 'st-none') + '">' + (c.approved ? 'затверджено' : c.salary != null ? esc(c.status || 'пораховано') : 'ще не пораховано') + '</span></div></summary>' +
          (c.due ? '<div class="kv"><span>До виплати після кругорейсу (' + esc(pyD(c.due.date)) + ')</span><b>' + esc(pyUah(c.due.sum)) + '</b></div>' : '') +
          (ts.length ? ts.map(tripRow).join('') : '') +
          (c.pays.length ? '<h3>Виплати й утримання</h3>' + c.pays.map(p => '<div class="kv"><span>' + esc(pyD(p.date)) + ' · ' + esc(p.type) + (p.note ? ' — ' + esc(p.note) : '') + '</span><b>' + esc(money(p.sum)) + ' ' + esc(p.cur) + '</b></div>').join('') : '') +
          (c.text ? '<h3>Розрахунок керівника</h3><pre class="pytext">' + esc(c.text) + '</pre>' : '') +
          '<p><button class="btn" data-pask="' + esc(c.id) + '">Є питання по цьому розрахунку</button></p></details>'; }).join('');
      const other = d.pays.filter(p => !p.circle || !d.circles.some(c => c.id === p.circle));
      if (other.length) h += '<section class="card"><h2>Інші виплати, доплати, допомога</h2>' + other.slice(0, 60).map(p => '<div class="kv"><span>' + esc(pyD(p.date)) + ' · ' + esc(p.type) + (p.note ? ' — ' + esc(p.note) : '') + '</span><b>' + esc(money(p.sum)) + ' ' + esc(p.cur) + '</b></div>').join('') + '</section>';
      if (d.questions && d.questions.length) h += '<section class="card"><h2>Мої питання</h2>' + d.questions.map(q => '<div class="pyq"><div class="muted small">' + esc(pyD(q.date)) + (q.circle ? ' · ' + esc(q.circle) : '') + ' · ' + esc(q.answer ? 'є відповідь' : q.status) + '</div><p>' + esc(q.text) + '</p>' + (q.answer ? '<p class="pyans"><b>Відповідь:</b> ' + esc(q.answer) + '</p>' : '') + '</div>').join('') + '</section>';
      h += '<p class="muted small">' + esc(d.note) + '</p><p><button class="btn" data-pask="">Є питання по зарплаті</button></p>';
      $('pyBody').innerHTML = h;
    }
    $('pyBody').onclick = async e => {
      const a = e.target.closest('[data-ptrip]'); if (a) { e.preventDefault(); openTrip(a.dataset.ptrip, 'mypay'); return; }
      const q = e.target.closest('[data-pask]'); if (!q) return;
      const text = await askText(q.dataset.pask ? 'Питання по кругорейсу ' + q.dataset.pask : 'Питання по зарплаті', 'Що незрозуміло? Напр.: не врахована допомога в рейсі 231', 'Надіслати');
      if (!text) return;
      try { const r = await apiQ('pay.ask', { text, circle: q.dataset.pask, opId: 'PQ-' + newId().slice(0, 16) }, 'питання по зарплаті');
        if (r.queued) toast('Питання збережено на телефоні — надішлеться само, щойно буде зв\'язок.');
        else { if (r.questions && SCR.pay) { SCR.pay.questions = r.questions; scrSet('pay', SCR.pay); } toast('Питання надіслано керівнику. Відповідь з\'явиться тут, у «Мої питання».'); if (!$('mypay').hidden) renderPay(); } }
      catch (err) { toast(esc(err.message), 'err'); }
    };
  }

  /* ── Калькулятор рейсу / кругорейсу (Calc.gs): той самий розрахунок, що у файлі прибутковості v51 ── */
  let calcInit = null, cTrips = [];
  const CTYPES = ['Міжнародний', 'Україна', 'Україна: окремий рейс (км + дні)', 'Контейнеровоз'], CCURS = ['EUR', 'UAH', 'PLN', 'USD'];
  const grn = v => (v == null || v === '' || isNaN(v)) ? '—' : Math.round(v).toLocaleString('uk-UA') + ' грн';
  const sgn = v => (v > 0 ? '+' : '') + grn(v);
  const newTrip = () => ({ from: '', via: '', to: '', type: 'Міжнародний', freight: '', cur: 'EUR', t: '', cross: '', km: '', empty: '', queue: '', extra: '', extraCur: '', adr: false });
  function calcSave() { store.set('calcDraft', JSON.stringify({ trips: cTrips, truck: $('cTruck').value, date: $('cDate').value, idle: $('cIdle').value })); }
  async function openCalc() {
    show('calc');
    if (!cTrips.length) { try { const d = JSON.parse(store.get('calcDraft') || 'null'); if (d && d.trips && d.trips.length) { cTrips = d.trips; $('cDate').value = d.date || ''; $('cIdle').value = d.idle || ''; $('cTruck').dataset.want = d.truck || ''; } } catch (e) {} }
    if (!cTrips.length) cTrips = [newTrip()];
    renderCTrips();
    if (!calcInit) {
      $('cSub').textContent = 'Завантаження довідників…';
      try { calcInit = await api('calc.init'); } catch (e) { $('cSub').textContent = e.message; return; }
    }
    const ci = calcInit, sel = $('cTruck'), want = sel.value || sel.dataset.want || '';
    sel.innerHTML = '<option value="">Середнє по парку</option>' + ci.trucks.map(t => '<option value="' + esc(t.id) + '">' + esc(t.id) + (t.driver ? ' · ' + esc(t.driver) : '') + (t.pct ? ' · ' + Math.round(t.pct * 100) + '%' : '') + '</option>').join('');
    sel.value = want;
    $('cCities').innerHTML = ci.cities.map(c => '<option value="' + esc(c) + '">').join('');
    $('cCross').innerHTML = ci.crossings.map(c => '<option value="' + esc(c) + '">').join('');
    const r = ci.rates || {};
    $('cSub').textContent = 'EUR ' + (r.EUR || '?') + ' · PLN ' + (r.PLN || '?') + ' · USD ' + (r.USD || '?') + (r.src === 'НБУ' ? ' (НБУ' + (r.date ? ', ' + r.date : '') + ')' : ' (з параметрів)') +
      ' · паливо ' + (ci.params.fuel ? ci.params.fuel.toFixed(2) : '?') + ' грн/л після ПДВ · дані від ' + (ci.params.updated ? new Date(ci.params.updated).toLocaleDateString('uk-UA') : '?') + (ci.params.stale ? ' ⚠ старі' : '');
  }
  function renderCTrips() {
    const box = $('cTrips');
    box.innerHTML = cTrips.map((t, i) => {
      const inp = (k, label, ph, extra) => '<div><label>' + label + '</label><input data-i="' + i + '" data-k="' + k + '" value="' + esc(t[k] == null ? '' : t[k]) + '" placeholder="' + esc(ph || '') + '"' + (extra || '') + '></div>';
      const sel = (k, opts) => '<select data-i="' + i + '" data-k="' + k + '">' + opts.map(o => '<option' + (t[k] === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
      const more = t.via || t.cross || t.t || t.km || t.empty || t.queue || t.extra || t.adr;
      return '<section class="card ctrip"><div class="ctop"><b>Рейс ' + (i + 1) + '</b>' + (cTrips.length > 1 ? '<button class="link small" data-del="' + i + '">Прибрати</button>' : '') + '</div>' +
        '<div class="cgrid">' + inp('from', 'Звідки', 'місто завантаження', ' list="cCities" autocomplete="off"') + inp('to', 'Куди', 'місто розвантаження', ' list="cCities" autocomplete="off"') +
        '<div><label>Тип рейсу</label>' + sel('type', CTYPES) + '</div>' +
        '<div><label>Фрахт</label><div class="cfr"><input data-i="' + i + '" data-k="freight" inputmode="decimal" value="' + esc(t.freight) + '" placeholder="порожньо — наша ціна">' + sel('cur', CCURS) + '</div></div></div>' +
        '<details class="cmore"' + (more ? ' open' : '') + '><summary>Більше: дозавантаження, перехід, км, подача, черги, тонни, АДР, дод. витрати</summary><div class="cgrid">' +
        inp('via', 'Дозавантаження', 'міста через ;', ' list="cCities"') + inp('cross', 'Перехід (кордон)', 'найкоротший', ' list="cCross"') +
        inp('km', 'Км (якщо знаєте точно)', 'з бібліотеки або Google', ' inputmode="decimal"') + inp('empty', 'Подача порожнем, км', i ? 'рахується сама' : 'до завантаження', ' inputmode="decimal"') +
        inp('queue', 'Черги / очікування, днів', 'типові для маршруту', ' inputmode="decimal"') + inp('t', 'Тонн', '18,7 (середнє)', ' inputmode="decimal"') +
        '<div><label>Дод. витрати (TIR, T1…)</label><div class="cfr"><input data-i="' + i + '" data-k="extra" inputmode="decimal" value="' + esc(t.extra) + '" placeholder="0">' + sel('extraCur', [''].concat(CCURS)) + '</div></div>' +
        '<label class="cchk"><input type="checkbox" data-i="' + i + '" data-k="adr"' + (t.adr ? ' checked' : '') + '> АДР (+1 % водію)</label></div></details></section>';
    }).join('');
  }
  const cEdit = e => {
    const el = e.target, i = +el.dataset.i, k = el.dataset.k; if (!k || isNaN(i) || !cTrips[i]) return;
    const val = el.type === 'checkbox' ? el.checked : el.value;
    if (cTrips[i][k] === val) return;
    cTrips[i][k] = val;
    if (k === 'type' && !cTrips[i].freight) { cTrips[i].cur = val === 'Міжнародний' ? 'EUR' : 'UAH'; renderCTrips(); }
    calcSave();
  };
  $('cTrips').addEventListener('input', cEdit);
  $('cTrips').addEventListener('change', cEdit);
  $('cTrips').addEventListener('click', e => { const d = e.target.closest('[data-del]'); if (d) { cTrips.splice(+d.dataset.del, 1); renderCTrips(); calcSave(); } });
  async function runCalc() {
    const trips = cTrips.filter(t => String(t.from).trim() && String(t.to).trim());
    if (!trips.length) { $('cOut').innerHTML = '<p class="msg">Заповніть хоча б один рейс: звідки і куди.</p>'; return; }
    busy(true); $('cGo').disabled = true;
    try {
      const r = await api('calc', { truck: $('cTruck').value, date: $('cDate').value, idle: $('cIdle').value, trips });
      $('cOut').innerHTML = calcHtml(r);
      $('cOut').scrollIntoView({ behavior: smooth(), block: 'start' });
    } catch (e) { $('cOut').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
    finally { busy(false); $('cGo').disabled = false; }
  }
  function calcHtml(r) {
    const v = r.verdict || {}, ok = r.result >= 0, pct = x => (Math.round(x * 1000) / 10).toLocaleString('uk-UA') + ' %';
    const head = v.kind === 'price' ? 'Ціну для клієнта розраховано — дивіться нижче' : ok ? '✔ Вигідно. Запас ≈ ' + v.eur.toLocaleString('uk-UA') + ' € фрахту'
      : v.kind === 'cover' ? '◐ Повних витрат фірми не покриває (не вистачає ≈ ' + v.eur.toLocaleString('uk-UA') + ' €), але це краще, ніж машині стояти, на ' + grn(r.vsIdle)
      : '✖ Збитково. Щоб вийти в нуль, фрахт має бути більшим на ≈ ' + v.eur.toLocaleString('uk-UA') + ' €';
    const m = (label, val, sub, neg) => '<div class="cm' + (neg ? ' neg' : '') + '"><span>' + label + '</span><b>' + val + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    const max = Math.max(r.bench * 1.4, r.perDay, r.threshold * 1.2, 1), pos = x => Math.max(0, Math.min(100, x / max * 100)).toFixed(1) + '%';
    let h = '<section class="card cres ' + (v.kind === 'price' ? '' : ok ? 'ok' : v.kind === 'cover' ? 'mid' : 'bad') + '"><div class="cverdict">' + head + '</div><div class="cmetrics">' +
      m('Прибуток після прямих витрат', grn(r.p1), (r.p1km || 0).toLocaleString('uk-UA') + ' грн/км', r.p1 < 0) +
      m('Утримання фірми, кредит, черги, простій', grn(-r.other), r.days.all + ' дн. машини' + (r.queueMoney ? ' · з них паливо й витрати водія в черзі ' + grn(r.queueMoney) : ''), false) +
      m('Результат', grn(r.result), 'рентабельність ' + pct(r.margin) + ' · ' + (r.reskm || 0).toLocaleString('uk-UA') + ' грн/км', r.result < 0) +
      m('Прибуток на день машини', grn(r.perDay), 'поріг ' + grn(r.threshold) + ' · середнє фірми ' + grn(r.bench), r.perDay < r.threshold) + '</div>' +
      '<div class="cbar" title="Прибуток після прямих на день машини"><i style="width:' + pos(r.perDay) + '"></i><em style="left:' + pos(r.threshold) + '" data-l="поріг"></em><em style="left:' + pos(r.bench) + '" data-l="середнє"></em></div>' +
      '<p class="muted small">' + esc(r.route) + ' · ' + r.km.toLocaleString('uk-UA') + ' км · ' + r.days.road + ' дн. у дорозі + ' + r.days.queue + ' дн. черг + ' + r.days.idle + ' дн. простою · фрахт ' + grn(r.freight) + (r.vat ? ' (ПДВ ' + grn(r.vat) + ')' : '') + '</p>';
    if (r.range) h += '<p class="small">Звичайний розкид км на цих маршрутах (8 з 10 минулих рейсів): результат від <b>' + grn(r.range.lo) + '</b> до <b>' + grn(r.range.hi) + '</b>.</p>';
    if (r.worse != null && v.kind !== 'price') h += '<p class="small muted">Якщо піде гірше (км +15 %, на 2 дні довше, паливо +5 %, простій удвічі довший — так буває приблизно в 1 з 5 рейсів): ' + grn(r.worse) + '.</p>';
    h += '</section>';
    (r.notes || []).forEach(n => h += '<p class="cnote">' + esc(n) + '</p>');
    if (r.params && r.params.stale) h += '<p class="cnote">Середні показники (паливо, утримання, норми) старші за 35 днів — результат може відставати від сьогоднішніх цін.</p>';
    if (r.price) {
      if (r.price.error) h += '<p class="cnote">Наша ціна: ' + esc(r.price.error) + '</p>';
      else h += '<div class="cinfo"><b>Наша ціна для клієнта</b> (прибутковість ' + Math.round(r.price.target * 100) + ' %): ' + r.price.trips.map(p => 'рейс ' + p.n + ' — <b>' + p.target.toLocaleString('uk-UA') + ' ' + esc(p.cur) + '</b> (у нуль ' + p.zero.toLocaleString('uk-UA') + ', мінімум, що покриває лише прямі витрати, ' + p.min.toLocaleString('uk-UA') + ')').join('; ') + ' · ' + r.price.perKm + ' грн/км.</div>';
    }
    if (r.exportNeed) h += '<div class="cinfo"><b>Експорт без зворотного рейсу.</b> Щоб кругорейс окупився, типовий імпорт назад (≈ ' + r.exportNeed.km.toLocaleString('uk-UA') + ' км, ' + r.exportNeed.days + ' дн.) має дати щонайменше <b>' + r.exportNeed.zero.toLocaleString('uk-UA') + ' €</b>; щоб вийти на середнє фірми — <b>' + r.exportNeed.bench.toLocaleString('uk-UA') + ' €</b>. Додайте імпорт «+ рейс», щоб порахувати точно.</div>';
    (r.uaVsEmpty || []).forEach(u => { if (u.gain > 0) h += '<div class="cinfo">Рейс ' + u.n + ' по Україні: якщо машині все одно треба туди доїхати, порожній переїзд тих самих ' + u.km.toLocaleString('uk-UA') + ' км коштував би ≈ ' + grn(u.empty) + ', тож цей рейс <b>на ' + grn(u.gain) + ' кращий</b>.</div>'; });
    if (v.kind !== 'price' && r.vsIdle != null && !ok) h += '<div class="cinfo">Проти простою: якщо не брати цей рейс і машина стоятиме ті самі ' + r.days.all + ' дн., фірма ' + (r.vsIdle > 0 ? 'втратить ще <b>' + grn(r.vsIdle) + '</b>' : 'втратить менше на <b>' + grn(-r.vsIdle) + '</b> — рейс гірший за простій') + '. Утримання й кредит платимо в обох випадках.</div>';
    const full = !!r.lines;
    h += '<div class="tablewrap"><table class="ctable"><thead><tr><th>Рейс</th><th class="n">Км</th><th>Звідки км</th><th class="n">Днів</th><th class="n">Фрахт</th>' + (full ? '<th class="n">Паливо</th><th class="n">Дороги</th><th class="n">ЗП водія</th>' : '') + '<th class="n">Після прямих</th></tr></thead><tbody>' +
      r.trips.map(t => '<tr><td>' + t.n + '. ' + esc(t.route) + '<div class="muted small">' + esc(t.type) + '</div></td><td class="n">' + t.km.toLocaleString('uk-UA') + (t.empty ? '<div class="muted small">порожнем ' + t.empty + '</div>' : '') + '</td><td class="small">' + esc(t.kmSrc || '') + '</td><td class="n">' + t.days + (t.queue ? ' + ' + t.queue : '') + '</td><td class="n">' + grn(t.freight) + '</td>' +
        (full ? '<td class="n">' + grn(t.fuel) + '<div class="muted small">' + t.litres + ' л</div></td><td class="n">' + grn(t.tolls) + '</td><td class="n">' + grn(t.salary) + (t.pct ? '<div class="muted small">' + Math.round(t.pct * 1000) / 10 + ' %</div>' : '') + '</td>' : '') + '<td class="n">' + grn(t.p1) + '</td></tr>').join('') + '</tbody></table></div>';
    if (full) {
      const L = r.lines, row = (k, v) => '<div class="kv"><span>' + k + '</span><b>' + sgn(v) + '</b></div>';
      h += '<div class="tgrid" style="margin-top:12px"><section class="card"><h2>Розшифровка (керівник)</h2>' +
        row('Фрахт', r.freight) + (r.vat ? row('− ПДВ з виручки (Україна, контейнери)', -r.vat) : '') + row('− Паливо (' + r.litres.toLocaleString('uk-UA') + ' л по ' + r.fuelPrice + ' грн/л, за кордоном ' + r.litresAbroad + ' л)', L.fuel) + row('− AdBlue', L.adblue) +
        row('− Дороги і збори', L.tolls) + row('− Зарплата водія', L.salary) + row('− Витрати водія в дорозі', L.driver) + row('− Запчастини, шини, ремонти', L.parts) +
        row('− Податок 1,2 %', L.tax) + row('− Необліковані (резерв)', L.unacc) + (L.extra ? row('− Дод. витрати', L.extra) : '') +
        '<div class="kv big"><span>Прибуток після прямих</span><b>' + sgn(r.p1) + '</b></div></section><section class="card"><h2>Час машини</h2>' +
        row('− Утримання й кредит за дні в дорозі (' + r.days.road + ' × ' + grn(r.tc) + ')', r.timeRoad) + row('− Черги (' + r.days.queue + ' дн.: утримання, паливо, витрати водія)', r.queueCost) +
        row('− Простій після (' + r.days.idle + ' дн.)', r.idleCost) + '<div class="kv big ' + (r.result >= 0 ? 'ok' : 'bad') + '"><span>Результат</span><b>' + sgn(r.result) + '</b></div>' +
        '<div class="kv"><span>Знос тягача й причепа (окремо від прибутку)</span><b>' + grn(r.dep) + '</b></div></section></div>';
    }
    return h;
  }
  $('cAdd').onclick = () => { if (cTrips.length >= 12) return; const prev = cTrips[cTrips.length - 1]; const t = newTrip(); if (prev && prev.to) t.from = ''; cTrips.push(t); renderCTrips(); calcSave(); };
  $('cGo').onclick = runCalc;
  $('cClear').onclick = async () => { if (!await ask('Очистити калькулятор?', 'Усі введені рейси буде стерто.', 'Так, очистити', true)) return; cTrips = [newTrip()]; $('cIdle').value = ''; $('cDate').value = ''; $('cOut').innerHTML = ''; renderCTrips(); calcSave(); };
  ['cTruck', 'cDate', 'cIdle'].forEach(id => $(id).addEventListener('change', calcSave));

  async function openCodes() {
    show('codes'); $('issued').hidden = true; $('worker').value = '';
    try {
      const out = await api('list', { sheet: 'Працівники' });
      $('workers').innerHTML = '';
      out.rows.filter(r => r['Працює'] !== false).forEach(r => {
        const o = document.createElement('option'); o.value = r['Працівник ID'] + ' — ' + r['Прізвище']; $('workers').appendChild(o);
      });
    } catch (e) { /* список не обов'язковий — можна вписати вручну */ }
  }

  async function issue() {
    const v = $('worker').value.trim(); if (!v) return;
    const who = /@/.test(v) ? v : v.split(' ')[0];
    busy(true);
    try {
      const out = await api('issueCode', { workerId: who });
      $('issued').hidden = false;
      $('issued').innerHTML = '<div class="muted">Код для ' + esc(out.name) + ':</div><div class="big">' + out.code + '</div>' +
        '<div class="muted small">Одноразовий, діє ' + out.validHours + ' год. Вхід: app.lcorp.com.ua</div>';
    } catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); }
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ── Вхід ── */
  async function loginCode(e) {
    e.preventDefault();
    const code = $('code').value.replace(/\D/g, '');
    if (code.length !== 6) { $('loginMsg').textContent = 'Код — 6 цифр'; return; }
    busy(true);
    try { enter(await api('login.code', { code })); $('code').value = ''; }
    catch (err) { $('loginMsg').textContent = err.message; } finally { busy(false); }
  }

  let googleLoaded = false;
  function loadGoogle() {
    $('googleBox').hidden = false;
    if (googleLoaded) return; googleLoaded = true;
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => {
      google.accounts.id.initialize({ client_id: CFG.GOOGLE_CLIENT_ID, callback: async r => {
        busy(true);
        try { enter(await api('login.google', { idToken: r.credential })); }
        catch (err) { $('loginMsg').textContent = err.message; } finally { busy(false); }
      } });
      google.accounts.id.renderButton($('googleBtn'), { theme: 'outline', size: 'large', text: 'signin_with', locale: 'uk', width: 300 });
    };
    document.head.appendChild(s);
  }

  async function logout(silent) {
    if (!silent) { let ep = ''; try { const reg = navigator.serviceWorker && await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 1500))]); const sub = reg && reg.pushManager && await reg.pushManager.getSubscription(); ep = sub ? sub.endpoint : ''; } catch (e) {}
      try { await api('logout', { endpoint: ep }); } catch (e) {} }   // вимкнути сповіщення лише цього телефона, не напарника (безпека-10)
    // черга НЕ стирається: записи прив'язані до входу й надішлються, коли ця людина увійде знову (критик У3, QA-8)
    const lg = me && me.login;
    store.del('token'); store.del('me'); store.del('homeDrv'); store.del('boardCache');
    if (lg) { store.del('tacho_' + lg); kvDel('scr_' + lg); kvDel('draft_exp_' + lg); kvDel('draft_tdoc_' + lg); kvDel('draft_rpt_' + lg); } kvDel('rmpd'); RMPD_MEM = null; store.del('rmpdFile');   // приватне — не лишаємо на телефоні (безпека-11)
    Object.keys(localStorage).filter(k => /^rmpdSeen_|^hint_/.test(k)).forEach(k => store.del(k));
    me = null; SCR = {};
    showLogin(silent ? 'Сесія завершилась — увійдіть ще раз.' + (OB.length ? ' На телефоні є не надіслані записи (' + OB.length + ') — після входу вони надішлються.' : '') : '');
  }

  /* ── Старт ── */
  $('codeForm').addEventListener('submit', loginCode);
  $('logout').onclick = () => askLogout();
  /* ── Розмір шрифту (UX P2): звичайний → великий → дуже великий; запам'ятовується на цьому пристрої ── */
  const ZOOMS = [['1', 'звичайний'], ['1.2', 'великий'], ['1.4', 'дуже великий']];
  function applyZoom(z) { const d = document.documentElement; if (z === '1') { d.style.removeProperty('--zoom'); delete d.dataset.zoom; } else { d.style.setProperty('--zoom', z); d.dataset.zoom = z; } }
  // «Аа» — одне велике вікно: розмір шрифту трьома кнопками (видно, який зараз) і тема. Замість дрібних «◐ Авто» й «Аа» в шапці.
  $('fontBtn').onclick = () => {
    const cur = store.get('fontScale') || '1', th = store.get('theme') || 'auto';
    const w = document.createElement('div'); w.className = 'ask-wrap'; w.innerHTML = '<div class="ask viewbox" role="dialog" aria-modal="true" aria-label="Вигляд"><h2>Розмір тексту</h2><div class="zgrid">' +
      ZOOMS.map((z, i) => '<button class="zbtn" data-z="' + z[0] + '" aria-pressed="' + (z[0] === cur) + '"><b style="font-size:' + (16 + i * 5) + 'px">Аа</b><span>' + z[1] + '</span></button>').join('') + '</div>' +
      '<h2>Кольори</h2><div class="zgrid">' + [['auto', 'Самі (день / ніч)'], ['light', 'Світлі'], ['dark', 'Темні']].map(t => '<button class="zbtn" data-th="' + t[0] + '" aria-pressed="' + (t[0] === th) + '"><span>' + t[1] + '</span></button>').join('') + '</div>' +
      '<div class="ask-btns one"><button class="primary" data-x>Готово</button></div></div>';
    document.body.appendChild(w);
    w.onclick = e => {
      if (e.target === w || e.target.closest('[data-x]')) return w.remove();
      const z = e.target.closest('[data-z]'), t = e.target.closest('[data-th]');
      if (z) { store.set('fontScale', z.dataset.z); applyZoom(z.dataset.z); w.querySelectorAll('[data-z]').forEach(x => x.setAttribute('aria-pressed', String(x === z))); }
      if (t) { store.set('theme', t.dataset.th); applyTheme(); w.querySelectorAll('[data-th]').forEach(x => x.setAttribute('aria-pressed', String(x === t))); }
    };
  };

  /* ── Підказки при першому вході (UX P2): 3 короткі картки, один раз на пристрої для кожної ролі ── */
  const TOURS = {
    'водій': [['Головна кнопка', 'Велика темна кнопка — це те, що сталося зараз: «Я на завантаженні», «Замитнився»… Натисніть, коли це сталося. Логіст побачить одразу.'],
      ['Без інтернету — не страшно', 'Якщо немає зв\'язку, програма збереже натискання на телефоні й надішле сама. Помилились — кнопка «Скасувати» під великою кнопкою.'],
      ['Моя машина і проблема', '«Моя машина» — коли сідаєте на машину або здаєте її. «Проблема» — якщо щось не так у дорозі. «📞 Логіст» угорі — дзвінок.'],
      ['Гроші й фото', '«Гроші» — витрати з фото чека, обмін, гроші від клієнта і звіт за поїздку. «Фото документів» — CMR та інші папери рейсу. Усе працює й без зв\'язку.'],
      ['Мій час', 'Унизу головної — «Мій час»: «Почати день», режими, «Кінець дня». Підказує перерви; тахограф не замінює.'],
      ['Рейси й зарплата', 'Ваші рейси, скільки нараховано і «до виплати». Незрозуміло — «Є питання».'],
      ['Зручніше', 'Додайте програму на головний екран телефону (меню ⋮ → «Встановити»). «Аа» вгорі — більший шрифт.']],
    'логіст': [['Дошка машин', 'Головний екран логіста: де кожна машина, рейс, що далі, проблеми. Кроки від водіїв видно одразу.'],
      ['Картка рейсу', 'Натисніть номер рейсу — побачите маршрут, дати, оплату, кроки водія.'],
      ['Калькулятор', 'Перед тим як погодити заявку — порахуйте рейс або кругорейс у «Калькуляторі». «Аа» вгорі — більший шрифт.'],
      ['Новий рейс', '«+ Новий рейс» на дошці — завести рейс вручну. У «Заявках» рядок «+ рейс» — створити рейс із заявки: поля підставляться самі, лишиться обрати водія. Постійні клієнти без заявок — «Із шаблону».']],
    'бухгалтер': [['Витрати водіїв', 'Чеки й витрати від водіїв — на перевірку. Фото чеків відкриваються лише в програмі.'],
      ['Дві суми в рейсі', '«Фрахт» — від нього рахується зарплата водію. «Сума для рахунку» — на неї виставляють рахунок клієнту (більша, коли є повернення). Порожня — як фрахт.'],
      ['Боржники', 'Хто не оплатив: за клієнтом, з прострочкою. «Текст нагадування» копіює готовий лист. Рейс без позначки «Оплачено» може бути вже оплачений — звіряйте з банком.']]
  };
  // «Що нового» — один раз на пристрої для тих, хто вже бачив підказки (ADR-076)
  const NEWS = { key: 'news_v41', roles: ['адмін', 'керівник', 'логіст', 'бухгалтер'], title: 'Що нового',
    items: ['Новий рейс: клієнт — зі списку «Клієнти» (з ЄДРПОУ для рахунку). Немає в списку — кнопка «+ Новий клієнт». «Оплата» — лише зі списку.',
      'Дошка: плашка «Можливі дублі рейсів» — та сама машина, дата й «Звідки» під різними номерами. Відкрийте рейс або позначте «Не дубль».',
      'Сповіщення логісту: новий рейс від бота заявок; машина за ~2 год до кордону, а RMPD не перевірено.',
      'Бухгалтерія: екран «До виставлення» — рейси без рахунку по клієнтах, «Файл для BAS» і позначка «Виставлено» з № і датою рахунку.'] };
  function news() {
    if (!me || NEWS.roles.indexOf(me.role) < 0 || store.get(NEWS.key) || document.querySelector('.ask-wrap')) return;
    const w = document.createElement('div'); w.className = 'ask-wrap';
    w.innerHTML = '<div class="ask tour" role="dialog" aria-modal="true"><h2>' + esc(NEWS.title) + '</h2><ul class="newsl">' + NEWS.items.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul><div class="ask-btns"><button class="primary" data-a="ok">Зрозуміло</button></div></div>';
    w.querySelector('[data-a="ok"]').onclick = () => { store.set(NEWS.key, '1'); w.remove(); };
    document.body.appendChild(w);
  }
  TOURS['керівник'] = TOURS['логіст']; TOURS['адмін'] = TOURS['логіст'];
  function tour() {
    const steps = me && TOURS[me.role]; if (!steps) return;
    const key = 'tour1_' + me.role; if (store.get(key)) return news();
    let i = 0; const w = document.createElement('div'); w.className = 'ask-wrap';
    const draw = () => { const [t, x] = steps[i];
      w.innerHTML = '<div class="ask tour" role="dialog" aria-modal="true"><div class="tour-dots">' + steps.map((_, k) => '<i class="' + (k === i ? 'on' : '') + '"></i>').join('') + '</div><h2>' + esc(t) + '</h2><p>' + esc(x) + '</p><div class="ask-btns"><button class="btn" data-a="skip">Пропустити</button><button class="primary" data-a="next">' + (i < steps.length - 1 ? 'Далі' : 'Зрозуміло') + '</button></div></div>';
      w.querySelector('[data-a="next"]').onclick = () => { if (++i >= steps.length) close(); else draw(); };
      w.querySelector('[data-a="skip"]').onclick = close; };
    const close = () => { store.set(key, '1'); store.set(NEWS.key, '1'); w.remove(); };   // новачку «Що нового» не потрібне — підказки вже про все
    draw(); document.body.appendChild(w);
  }
  async function askLogout() {
    const n = outbox().length;
    if (await ask('Вийти з програми?', (n ? '⚠ На телефоні є ' + n + ' не надісланих записів. Вони збережуться й надішлються, коли ви знову ввійдете. ' : '') + (me && me.role === 'водій' ? 'Щоб увійти знову, знадобиться новий код від керівника.' : 'Щоб увійти знову, знадобиться вхід через Google або код.'), 'Так, вийти', true)) logout(false);
  }
  $('logoutAll').onclick = async () => {
    if (!await ask('Вийти на всіх пристроях?', 'Знадобиться новий вхід (код або Google) на кожному телефоні й комп\'ютері. Робіть так, якщо загубили телефон.', 'Так, вийти всюди', true)) return;
    try { await api('logout.all'); } catch (e) {}
    logout(true);
  };

  /* ── Тема (ADR-024): «Авто» — світла вдень, темна після заходу сонця (Львів); або вручну світла/темна ── */
  function sunHours(d, lat, lon) {   // схід і захід сонця, години за місцевим часом пристрою (алгоритм NOAA, точність ±2 хв)
    const rad = Math.PI / 180, start = new Date(d.getFullYear(), 0, 0), day = Math.floor((d - start) / 864e5);
    const g = 2 * Math.PI / 365 * (day - 1);
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g);
    const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl)) / rad;
    const tz = -d.getTimezoneOffset();
    return { rise: (720 - 4 * (lon + ha) - eq + tz) / 60, set: (720 - 4 * (lon - ha) - eq + tz) / 60 };
  }
  function applyTheme() {
    const mode = store.get('theme') || 'auto', root = document.documentElement;
    let t = mode;
    if (mode === 'auto') { const n = new Date(), h = n.getHours() + n.getMinutes() / 60, s = sunHours(n, 49.84, 24.03); t = (h >= s.rise && h < s.set) ? 'light' : 'dark'; }
    root.dataset.theme = t;
    $('theme').textContent = mode === 'auto' ? '◐ Авто' : (mode === 'light' ? '☀ Світла' : '☾ Темна');
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = t === 'dark' ? '#070B20' : '#0C1333';
  }
  $('theme').onclick = () => { const m = store.get('theme') || 'auto'; store.set('theme', m === 'auto' ? 'light' : m === 'light' ? 'dark' : 'auto'); applyTheme(); };
  applyTheme(); setInterval(applyTheme, 5 * 60 * 1000);
  $('back').onclick = () => renderHome();
  document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => renderHome());
  if ($('dbRefresh')) { $('dbRefresh').onclick = () => openDebts(true); $('dbSearch').oninput = () => debts && renderDebts(); }
  if ($('pyRefresh')) $('pyRefresh').onclick = () => openPay(null, true);
  if ($('dbBank')) { $('dbBank').onclick = openBank; $('bkBack').onclick = () => show('debts'); $('bkFile').onchange = e => e.target.files[0] && bankFile(e.target.files[0]); $('bkApply').onclick = bankApply; }
  $('tachoBack').onclick = () => me && me.role !== 'водій' ? openBoard() : renderHome();
  $('search').addEventListener('input', () => renderTable());
  $('bSearch').addEventListener('input', () => board && renderBoard());
  $('bReset').onclick = () => { $('bSearch').value = ''; bFilter = 'all'; store.set('bFilter', 'all'); if (board) renderBoard(); $('bSearch').focus(); };
  $('bRefresh').onclick = () => openBoard(true);
  if ($('bNewTrip')) $('bNewTrip').onclick = () => tripForm(null);
  if ($('viewNewTrip')) $('viewNewTrip').onclick = () => tripForm(null);
  $('dRefresh').onclick = () => openDocs(true);
  $('dSearch').addEventListener('input', () => docs && renderDocs());
  $('tripBack').onclick = () => tripFrom === 'probs' ? openProbs() : tripFrom === 'mypay' ? show('mypay') : tripFrom === 'debts' ? show('debts') : tripFrom === 'inv' ? show('inv') : tripFrom === 'view' ? (show('view'), current && renderTable()) : (board ? (show('board')) : renderHome());
  $('issue').onclick = issue;
  $('closeSes').onclick = async () => {   // утрачений телефон водія (безпека-10)
    const v = $('worker').value.trim(); if (!v) { toast('Оберіть, кому закрити вхід', 'err'); return; }
    const who = /@/.test(v) ? v : v.split(' ')[0];
    if (!await ask('Закрити вхід ' + v + '?', 'Людина вийде з програми на всіх телефонах. Для входу знову — новий код.', 'Закрити вхід', true)) return;
    busy(true); try { const r = await api('sessions.close', { login: who }); toast('Вхід закрито (' + r.closed + ' пристр.).'); } catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); } };
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  (async () => {
    if (!store.get('token')) { showLogin(); obLoad().then(() => { if (!$('login').hidden && !$('loginMsg').textContent && OB.length) $('loginMsg').textContent = 'На телефоні є записи, що ще не надіслані (' + OB.length + '). Увійдіть — вони надішлються.'; }); return; }   // критик У3
    // одразу показуємо збережений кабінет, потім уточнюємо в сервера
    try { const c = JSON.parse(store.get('me') || 'null'); if (c) enter(c); } catch (e) {}
    obLoad().then(() => { if (me && me.role === 'водій' && !$('home').hidden && tk) drawDriverHome(tk, stCur); setTimeout(flushOutbox, 800); });
    if (me && me.role === 'водій') return;   // «хто я» приходить у пакеті головної водія
    try { const r = await api('me'); meFresh = true; enter(r, !!me); }
    catch (e) { if (e.code !== 'auth' && me) return; if (!me) showLogin(e.code === 'auth' ? '' : e.message); }
  })();
})();
