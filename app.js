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
    'логіст': 'Машини зараз — головне. Кроки від водіїв видно в списку машин і в картці рейсу.',
    'бухгалтер': 'Поки — перегляд даних. Рахунки, акти й оплати з банку з\'являться згодом.',
    'механік': 'Дошка машин і документи працюють. Облік ремонтів і ТО з\'явиться згодом.',
    'водій': 'Почніть з «Моя машина»: відмітьте, яку машину ви прийняли. Тут же ваші рейси, витрати й зарплата.'
  };

  /* ── Сервер ── */
  const perfQ = [];
  // скільки чекати відповіді (ADR-019, Водій.md §9): довше — вважаємо, що зв'язку немає, і запис лишається в черзі на телефоні
  const WAIT = { 'expense.add': 45000, 'tripdoc.add': 45000, 'rmpd.file': 60000, 'report.submit': 30000, 'login.code': 30000, 'login.google': 30000, 'batch': 25000 };
  /* «Подивитися як…» (v48): лише читання; ті самі дії, що в білому списку сервера (VIEW.READ) */
  const VIEW_RO = ['me', 'logout', 'batch', 'list', 'board', 'truck.state', 'trip.status', 'problems', 'tacho', 'inv', 'panel', 'trip.journal', 'dups', 'health', 'expense', 'expense.photo',
    'tripdoc', 'tripdoc.photo', 'rmpd.file', 'debts', 'my.pay', 'report', 'tacho.odo', 'calc.init', 'calc', 'home.logist', 'home.boss2', 'push.key', 'ech.prep', 'ech.workload', 'board.moves'];
  function viewErr() { const e = new Error('Режим перегляду — зміни вимкнено. Щоб змінювати, поверніться до свого входу.'); e.code = 'viewonly'; return e; }
  async function api(action, data = {}) {
    if (me && me.viewAs && VIEW_RO.indexOf(action) < 0) { if (action === 'client.err') return { ok: true }; throw viewErr(); }
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
  /** Схоже на номер закордонного паспорта (FX123456) — у звіт про помилку не йде (v49.1). */
  const scrubPass = t => String(t == null ? '' : t).replace(/(^|[^A-Za-zА-Яа-яІіЇїЄєҐґ0-9])([A-Za-zА-ЯІЇЄ]{2})\s?(\d{6,9})(?!\d)/g, '$1[паспорт]')
    .replace(/(паспорт\S*|passport)(\s*[:№#-]?\s*)\d{9}(?!\d)/gi, '$1$2[паспорт]');   // як scrubPass_ на сервері (API.js)
  function reportErr(msg, stack, where) {
    try {
      msg = String(msg || ''); if (!me || errSent >= 5 || !navigator.onLine || !msg || /^Script error\.?$|ResizeObserver loop/i.test(msg)) return;
      errSent++;
      const scr = document.querySelector('main > section:not([hidden])');
      api('client.err', { msg: scrubPass(msg).slice(0, 300), stack: scrubPass(String(stack || '')).slice(0, 1200), where: (scr ? scr.id : '') + (where ? ' · ' + where : ''), ver: 'v51' }).catch(() => {});
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
  const mine = it => !!(me && !me.viewAs && it.login && it.login === me.login);   // у «Подивитися як…» чужу чергу не чіпаємо (критик v48)   // записи без логіна не надсилаємо будь-кому (безпека Н1)
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
    if (me && me.viewAs) throw viewErr();                                  // «Подивитися як…»: у чергу нічого не пишемо (v48)
    data = { ...data, clientAt: Date.now(), opId: data.opId || newId() };
    const it = { action, data, label, at: Date.now(), login: (me && me.login) || '' };
    await obAdd(it);                                                       // кидає 'storage', якщо записати не вдалося — екран покаже помилку і НЕ очистить форму
    const p = new Promise((ok, bad) => { waiters[data.opId] = { ok, bad, t: setTimeout(() => settle(data.opId, { queued: true, opId: data.opId }), 6000) }; });
    flushOutbox();
    return p;
  }
  let flushing = false, flushAt = 0;
  async function flushOutbox() {
    if (me && me.viewAs) return;                                          // перегляд — нічого не надсилаємо
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
    document.body.classList.toggle('drvbar-on', id === 'home' && !!me && me.role === 'водій');   // місце під нижню стрічку водія (етап 1 дизайну)
    document.body.dataset.scr = id;   // ширина сторінки за екраном (дошка — на всю ширину, етап 2)
    if ($('bPanel') && !$('bPanel').hidden && (id !== 'board' || $('bPanel').closest('#home'))) { $('bPanel').hidden = true; $('bPanel').innerHTML = ''; document.body.classList.remove('bpanel-on', 'bpanel-full'); navAuto(); }
    if (id !== 'home') m51Close();   // v51: розгортка головної не лишається відкритою за іншим екраном
    if (id === 'login') navOff(); else { navMark(id); if (isOffice()) navAuto(); } }

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
    viewBar();
    $('whoName').textContent = me.name; $('whoRole').textContent = me.role; try { $('hdrCall').href = 'tel:' + LOGIST_TEL; } catch (e) {} $('who').hidden = false; document.body.dataset.role = me.role;
    // quiet — уточнення від сервера після показу збереженого кабінету: не перемальовуємо й не повертаємо на головну,
    // хіба що змінилися роль чи доступи і людина досі на головній
    if (!quiet) { scrLoad(); setTimeout(flushOutbox, 500); }
    if (quiet && (was === JSON.stringify({ r: me.role, s: sheets.map(x => x.name) }) || $('home').hidden)) { if (isOffice()) { userRender(); navRender(); } return; }
    if (!isOffice()) navOff();
    renderHome();
    if (isOffice() && navHashPending) { const id = navHashPending; navHashPending = ''; clearHash(); navGo(id); }
  }

  function renderHome() {
    bpRescue();   // v51: панель рейсу могла бути в правій колонці головної — повернути на дошку до перемальовування
    const office = isOffice(), m51 = !!me && me.role === 'логіст';
    if (office) { document.body.classList.add('nav-on'); userRender(); navRender(); }
    $('homeTitle').textContent = m51 ? 'Машини зараз' : office ? hGreet() : 'Кабінет: ' + me.role;
    $('homeHint').textContent = m51 ? '' : office ? hDateLine() : HINT[me.role] || '';
    const can = new Set(sheets.map(s => s.name));
    const box = $('tiles'); box.innerHTML = '';
    (office ? [] : TILES[me.role] || []).forEach(t => {   // плитки-розділи лишились лише у водія (у нього вони сховані за нижньою стрічкою); офіс — меню (v47)
      const b = document.createElement('button'); b.className = 'tile';
      const ok = t.action || (t.sheet && can.has(t.sheet));
      if (!ok) b.classList.add('soon');
      b.innerHTML = '<b></b><span></span>';
      b.querySelector('b').textContent = t.title;
      b.querySelector('span').textContent = ok ? (t.hint || '') : 'скоро';
      if (ok) b.onclick = () => t.action === 'truck' ? openTruck() : t.action === 'exp' ? openExp() : t.action === 'mypay' ? openPay('pay') : t.action === 'mytrips' ? openPay('trips') : openSheet(t);
      box.appendChild(b);
    });
    $('homeWork').innerHTML = ''; $('tiles').hidden = office; hHome = false; if ($('drvOutBox')) $('drvOutBox').innerHTML = ''; drvBar(false);
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
    if (office) { $('homeWork').innerHTML = m51 ? mSkel() : (KA.indexOf(me.role) >= 0 ? '<div id="pnlBox"></div>' : '') + (hRole() ? '<div id="hwBox"></div>' : ''); if (m51) { mDropId = ''; mBind(); navAuto(); } homeExtras(); }
    if (me.role === 'керівник' || me.role === 'адмін') { panelLoad(); bossLoad(); }
    if (hRole()) logLoad();   // логіст; керівник і адмін — ті самі віджети під «Панеллю дня» (v48)
  }
  function hGreet() { const h = new Date().getHours(); return h < 5 ? 'Добрий вечір' : h < 12 ? 'Доброго ранку' : h < 18 ? 'Добрий день' : 'Добрий вечір'; }
  function hDateLine() { const d = new Date(); return me.name + ' · ' + d.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · тиждень ' + isoWeek(d).w; }
  /** Разова підказка «Розділи тепер у меню» і (бухгалтер, механік) закріплене — швидкими кнопками на головній. */
  function homeExtras() {
    const w = $('homeWork'), old = document.querySelector('.navhint'); if (old) old.remove();
    if (!store.get('navhint_v47')) {
      const c = document.createElement('div'); c.className = 'navhint'; c.setAttribute('role', 'note');
      c.innerHTML = '<span class="nh-ar" aria-hidden="true">' + ico(window.innerWidth >= 768 ? 'left' : 'menu') + '</span><p><b>Розділи тепер у меню ' + (window.innerWidth >= 1280 ? 'ліворуч' : window.innerWidth >= 768 ? 'ліворуч (значки) — ☰ відкриває весь список' : '☰ угорі') + '.</b> Зірочкою закріпіть до 4 найпотрібніших. Пошук угорі (клавіша /) знайде машину, рейс, водія чи розділ.</p><button type="button" class="btn small" id="navHintOk">Зрозуміло</button>';
      w.before(c); $('navHintOk').onclick = () => { store.set('navhint_v47', '1'); c.remove(); };
    }
    if (me.role === 'бухгалтер' || me.role === 'механік') {
      const items = navItems(), pins = navPins().map(id => items.find(n => n.id === id)).filter(Boolean);
      w.innerHTML = (me.role === 'бухгалтер' ? '<div id="buhBox"></div>' : '') + '<section class="hw hquick" aria-labelledby="hqT"><div class="hw-h"><h2 id="hqT">Закріплене</h2><span class="hw-meta">змінюється зірочкою в меню</span></div><div class="hq">' +
        pins.map(n => '<a class="hq-a" href="' + navHref(n.id) + '" data-nav="' + esc(n.id) + '">' + ico(n.ico) + '<span>' + esc(n.t) + '</span>' + navBadgeHtml(n.id) + '</a>').join('') + '</div></section>';
      w.onclick = e => { const a = e.target.closest('a[data-nav]'); if (a && !(e.ctrlKey || e.metaKey || e.shiftKey)) { e.preventDefault(); navGo(a.dataset.nav); } };
      if (me.role === 'бухгалтер') buhLoad();
    }
  }
  /** Вихід / водій: прибрати меню, пошук, ім'я ▾. */
  function navOff() {
    document.body.classList.remove('nav-on', 'nav-mini', 'nav-open', 'gs-open'); navOpenNow = false;
    ['nav', 'navRail', 'navScrim', 'navBtn', 'gs', 'gsBtn', 'umenu'].forEach(i => { if ($(i)) $(i).hidden = true; });
    const n = document.querySelector('.navhint'); if (n) n.remove();
  }
  /* ── «Панель дня» керівника й адміна (ідея власниці №1, ADR-088): машини, розрахунки з водіями, нагальне ── */
  let panel = null;
  async function panelLoad() {
    try { const c = JSON.parse(store.get('panel_' + me.login) || 'null'); if (c && !panel) panel = c; } catch (e) {}
    const pb = () => $('pnlBox') || $('homeWork');
    if (panel) panelDraw(); else pb().innerHTML = '<div class="card pnl"><p class="muted">Збираю панель дня…</p></div>';
    const nav = navSeq;
    try { panel = await api('panel'); try { store.set('panel_' + me.login, JSON.stringify(panel)); } catch (e) {} if (nav === navSeq && !$('home').hidden) panelDraw(); }
    catch (e) { if (!panel) pb().innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  const pnlSums = o => Object.keys(o || {}).filter(k => o[k]).map(k => money(Math.round(o[k])) + ' ' + k).join(' + ');
  function panelDraw() {
    const p = panel, t = p.trucks || {}, pr = p.problems || {}, q = p.payq || {}, ex = p.exp || {}, dc = p.docs || {}, db = p.debts || {};
    const seg = (n, cls, label) => n ? '<span class="pseg ' + cls + '" style="flex:' + n + '" title="' + esc(label + ': ' + n) + '"></span>' : '';
    const lg = (n, cls, label) => '<span class="plg"><i class="' + cls + '"></i>' + esc(label) + ' <b>' + (n || 0) + '</b></span>';
    // Машини: сегментна смуга + 4 плитки з великими числами (нулі приглушені); тривоги — чипами (дизайн 23.11, «тут треба попрацювати над візуалізацією»)
    const tile = (n, cls, label, act) => '<button type="button" class="ptile' + (n ? '' : ' zero') + '" data-pact="' + act + '"><span class="ptn tnum"><i class="' + cls + '"></i>' + (n || 0) + '</span><span class="ptl">' + esc(label) + '</span></button>';
    const trucks = t.error ? '<p class="muted small">Машини: ' + esc(t.error) + '</p>' :
      '<div class="pbar" role="img" aria-label="' + esc('Машини: у рейсі ' + t.trip + ', вільні до 3 днів ' + t.free + ', вільні понад 3 дні ' + t.idle + ', без рейсів ' + t.none) + '">' + seg(t.trip, 'p-trip', 'у рейсі') + seg(t.free, 'p-free', 'вільні до 3 дн') + seg(t.idle, 'p-idle', 'вільні понад 3 дн') + seg(t.none, 'p-none', 'без рейсів') + '</div>' +
      '<div class="ptiles">' + tile(t.trip, 'p-trip', 'у рейсі', 'board') + tile(t.free, 'p-free', 'вільні до 3 днів', 'board') + tile(t.idle, 'p-idle', 'стоять понад 3 дні', 'board') + tile(t.none, 'p-none', 'без рейсів', 'board') + '</div>' +
      (t.urgent || t.gps ? '<div class="pchips">' + (t.urgent ? '<button type="button" class="pchip bad" data-pact="board">⚠ Термінове: <b>' + t.urgent + '</b></button>' : '') + (t.gps ? '<button type="button" class="pchip warn" data-pact="board">GPS бачить невідмічений крок: <b>' + t.gps + '</b></button>' : '') + '</div>' : '');
    // v51.1: колишній блок «Розрахунки з водіями» (кільце з p.circles) прибрано — одне джерело правди: віджет «Звіти водіїв і розрахунок» (home.boss2);
    // «розраховано N з M» перенесено туди рядком у розгорнуту версію. p.circles сервер ще віддає (сумісність зі старими клієнтами), тут не показуємо.
    const row = (n, lvl, label, sub, act) => '<button class="prow' + (n ? ' p-' + lvl : '') + '" data-pact="' + act + '"><span class="pn">' + (n || 0) + '</span><span><b>' + esc(label) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span></button>';
    const urgent = [
      row(pr.fresh, 'bad', 'Нові проблеми водіїв', pr.boss ? 'керівника: ' + pr.boss + (pr.top && pr.top[0] ? ' · ' + esc(pr.top[0].truck + ' ' + pr.top[0].text) : '') : (pr.top && pr.top[0] ? esc(pr.top[0].truck + ' ' + pr.top[0].text) : ''), 'probs'),
      row(q.open, 'warn', 'Питання по зарплаті', q.open ? 'без відповіді — відповісти тут' : '', 'payq'),
      row(ex.fresh, 'warn', 'Витрати водіїв на перевірку', ex.ask ? 'з питанням: ' + ex.ask : '', 'exp'),
      row((dc.over || 0) + (dc.soon || 0), dc.over ? 'bad' : 'warn', 'Документи', (dc.over ? 'прострочено: ' + dc.over : '') + (dc.soon ? (dc.over ? ' · ' : '') + 'спливають: ' + dc.soon : ''), 'docs'),
      row(db.clients, 'warn', 'Прострочені борги клієнтів', esc(pnlSums(db.recent)), 'debts')].join('');
    const pBox = $('pnlBox') || $('homeWork');
    // v51: дві колонки, як у макеті v0.3 — ліворуч «Нагальне», «Звіти водіїв і розрахунок», «Прострочені борги»; праворуч RMPD (якщо є дані), «Машини»
    pBox.innerHTML = '<div class="pnl pnl-b"><div class="pcol pcol-l"><section class="card pcard pwide"><h2>Нагальне</h2><div class="prows">' + urgent + '</div><p class="muted small">Оновлено ' + tkTime(p.at) + ' · <button class="link" data-pact="reload">оновити</button></p></section>' +
      '<div class="bw-slot" id="bwL"></div></div><div class="pcol pcol-r"><div class="bw-slot" id="bwR"></div>' +
      '<section class="card pcard pc-trucks"><h2>Машини <small>' + (t.total || 0) + '</small></h2>' + trucks + '<button class="link" data-pact="board">Дошка машин →</button></section></div></div>';
    pBox.onclick = e => {
      if (bossClick(e)) return;
      const b = e.target.closest('[data-pact]'); if (!b) return; const a = b.dataset.pact;
      if (a === 'board') openBoard(); else if (a === 'probs') openProbs(); else if (a === 'exp') openExp(); else if (a === 'docs') openDocs(); else if (a === 'debts') openDebts(); else if (a === 'reload') { panelLoad(); bossLoad(true); } else if (a === 'payq') payqOpen(); };
    bossDraw();
    navBadges();
  }

  /* ── v51 (макет v0.3, «Зміни v0.2 → v0.3» п. 1–2): віджети головної керівника й адміна — «Звіти водіїв і розрахунок», «Найбільші прострочені борги»
     (дія home.boss2, BossHome.gs, кеш сервера 5 хв) і «RMPD перед кордоном» з даних дошки (та сама розгортка, що на головній логіста).
     Коротко / розгорнуто — як віджети v50 (hw, ключі lcorp.w.boss.*). Дії ведуть у наявні екрани: кругорейс — аркуш «Кругорейси» з пошуком, борги — «Боржники». ── */
  let boss2 = null, boss2Err = '', boss2At = 0;
  const B2_ST = { noreport: ['bad', 'чекають звіту', 'кругорейс закрито'], review: ['go', 'звіт надіслано', 'на перевірці'], question: ['warn', 'питання водію', ''], accepted: ['vi', 'прийнято', 'чекають розрахунку'], done: ['ok', 'пораховано', ''] };
  const B2_ACT = { remind: ['Нагадати', ''], check: ['Перевірити', ''], open: ['Відкрити', ''], calc: ['Розрахувати', 'primary'] };
  function bossLoad(force) {
    if (!me || KA.indexOf(me.role) < 0) return;
    const login = me.login, nav = navSeq;
    if (!boss2) { try { const c = JSON.parse(store.get('boss2_' + login) || 'null'); if (c) boss2 = c; } catch (e) {} }
    return api('home.boss2', force ? { force: true } : {}).then(r => { boss2 = r; boss2Err = ''; boss2At = Date.now(); try { store.set('boss2_' + login, JSON.stringify(r)); } catch (e) {} if (nav === navSeq && me && me.login === login && !$('home').hidden) bossDraw(); })
      .catch(e => { boss2Err = e.message; if (nav === navSeq && !$('home').hidden) bossDraw(); });
  }
  const b2Sum = o => { const k = Object.keys(o || {}).filter(c => o[c]); k.sort((a, b) => (a === 'UAH' ? -1 : b === 'UAH' ? 1 : 0)); return k.length ? k.map(c => money(Math.round(o[c])) + ' ' + (DBCUR[c] || c)).join(' + ') : '—'; };
  const b2Bar = (st, tot) => '<div class="b2bar" role="img" aria-label="' + esc(st.map(x => B2_ST[x.key][1] + ' ' + x.n).join(', ')) + '">' + st.filter(x => x.n).map(x => '<i class="b2-' + B2_ST[x.key][0] + '" style="flex:' + x.n + '"></i>').join('') + (tot ? '' : '<i class="b2-none" style="flex:1"></i>') + '</div>';
  function bwRpt() {
    const R = boss2 && boss2.reports;
    const act = '<button type="button" class="link hw-lnk" data-bact="circles">Усі звіти</button>';
    if (!R) return hw('rpt', 'Звіти водіїв і розрахунок', boss2Err ? '<p class="msg">' + esc(boss2Err) + '</p>' : hSk(3), { cls: 'bw', act });
    if (R.error) return hw('rpt', 'Звіти водіїв і розрахунок', '<p class="msg">Звіти не зібрались: ' + esc(R.error) + '</p>', { cls: 'bw', act });
    const st = R.stages || [], N = {}; st.forEach(x => N[x.key] = x.n);
    const meta = 'кругорейси, закриті за ' + (R.days || 45) + ' дн · <b class="tnum">' + (R.total || 0) + '</b>';
    if (!R.total) { const calm = '<p class="hcalm">' + svgI(ST_ICO.ok) + ' За ' + (R.days || 45) + ' днів закритих кругорейсів немає</p>'; return hw('rpt', 'Звіти водіїв і розрахунок', calm, { cls: 'bw', meta, act }); }
    const W = R.wait || [], w0 = W[0];
    const dm = v => v ? v.slice(8, 10) + '.' + v.slice(5, 7) : '';
    const stLab = w => w.stage === 'accepted' ? 'прийнято' + (w.since ? ' ' + dm(w.since) : '') : w.stage === 'review' ? 'на перевірці' + (w.since ? ' з ' + dm(w.since) : '') : w.stage === 'question' ? 'питання водію' : 'звіту немає';
    const lvl = d => d > 30 ? 'bad' : d > 14 ? 'warn' : '';
    const longest = w0 ? '<p class="hs-line b2-long">найдовше: <button type="button" class="linkbtn" data-bcirc="' + esc(w0.circle) + '" data-bdo="' + esc(w0.action) + '">' + esc(w0.circle) + ' ' + esc(w0.driver || '') + '</button> — ' + esc(w0.stage === 'accepted' ? 'прийнято, не пораховано' : stLab(w0)) + ' <b class="tnum ' + lvl(w0.days) + '">' + w0.days + ' дн</b></p>' : '';
    const short = '<div class="b2nums">' + st.map(x => '<button type="button" class="b2n b2-' + B2_ST[x.key][0] + (x.n ? '' : ' zero') + '" data-bact="circles" title="' + esc(B2_ST[x.key][1] + (B2_ST[x.key][2] ? ' — ' + B2_ST[x.key][2] : '')) + '"><b class="tnum">' + x.n + '</b> ' + esc(B2_ST[x.key][1]) + '</button>').join('') + '</div>' + b2Bar(st, R.total) + longest;
    const flow = '<div class="b2flow">' + st.map(x => '<button type="button" class="b2t b2-' + B2_ST[x.key][0] + (x.n ? '' : ' zero') + '" data-bact="circles"><b class="tnum">' + x.n + '</b><span>' + esc(B2_ST[x.key][1]) + (B2_ST[x.key][2] ? ' — ' + esc(B2_ST[x.key][2]) : '') + '</span></button>').join('') + '</div>';
    const badge = w => '<span class="badge b2b-' + B2_ST[w.stage][0] + '">' + esc(stLab(w)) + '</span>';
    const table = W.length ? '<div class="tscroll"><table class="b2tab"><thead><tr><th scope="col">Найдовше чекають</th><th scope="col">Водій</th><th scope="col">Де застрягло</th><th scope="col" class="r">Днів</th><th scope="col"><span class="sr">Дія</span></th></tr></thead><tbody>' +
      W.map(w => '<tr><td><button type="button" class="linkbtn t1" data-bcirc="' + esc(w.circle) + '" data-bdo="open">' + esc(w.circle) + '</button></td><td>' + esc(w.driver || '—') + '</td><td>' + badge(w) + '</td><td class="r tnum b2d ' + lvl(w.days) + '">' + w.days + '</td>' +
        '<td class="r"><button type="button" class="btn small' + (B2_ACT[w.action] && B2_ACT[w.action][1] ? ' b2go' : '') + '" data-bcirc="' + esc(w.circle) + '" data-bdo="' + esc(w.action) + '">' + esc((B2_ACT[w.action] || ['Відкрити'])[0]) + '</button></td></tr>').join('') + '</tbody></table></div>'
      : '<p class="hcalm">' + svgI(ST_ICO.ok) + ' Усі закриті кругорейси пораховано</p>';
    const pc = Math.round((N.done || 0) / R.total * 100);
    const paid = '<p class="hs-line b2-paid">Розраховано <b class="tnum">' + (N.done || 0) + '</b> з <b class="tnum">' + R.total + '</b> кругорейсів (' + pc + '%) за ' + (R.days || 45) + ' днів</p>';   // v51.1: з колишнього блоку «Розрахунки з водіями»
    const body = flow + b2Bar(st, R.total) + paid + table + '<p class="muted small">Рахуємо від закриття кругорейсу. Звіт — «Звіти кругорейсів» (надіслано → прийнято / питання); «пораховано» — є нарахування керівника. Дії відкривають кругорейс; нагадування водію — поки вручну.</p>';
    return hw('rpt', 'Звіти водіїв і розрахунок', body, { cls: 'bw', short, meta, act });
  }
  function bwDebt() {
    const act = '<button type="button" class="link hw-lnk" data-bact="debts">Боржники</button>';
    if (!boss2) return hw('debt', 'Найбільші прострочені борги', boss2Err ? '<p class="msg">' + esc(boss2Err) + '</p>' : hSk(2), { cls: 'bw', act });
    if (boss2.debtsError) return hw('debt', 'Найбільші прострочені борги', '<p class="msg">Борги не зібрались: ' + esc(boss2.debtsError) + '</p>', { cls: 'bw', act });
    const L = boss2.debts || [], n = boss2.debtsTotal || 0;
    const meta = 'топ-' + Math.min(5, L.length) + ' з <b class="tnum">' + n + '</b>';
    if (!L.length) return hw('debt', 'Найбільші прострочені борги', '<p class="hcalm">' + svgI(ST_ICO.ok) + ' Прострочених боргів немає</p>', { cls: 'bw', act, meta: '0' });
    const late = d => d > 3650 ? '<span class="tag bad" title="Строк оплати в рейсі схожий на помилку дати — перевірте в «Боржниках»">дата?</span>' : '<span class="tag ' + (d > 30 ? 'bad' : 'warn') + '">' + d + ' дн</span>';   // десятки тисяч днів — помилкова дата в рейсі, не борг
    const t0 = L[0];
    const short = '<p class="hs-line"><b class="tnum">' + n + '</b> ' + plural(n, 'клієнт', 'клієнти', 'клієнтів') + ' з простроченням · найбільший — <button type="button" class="linkbtn" data-bdebt="' + esc(t0.client) + '">' + esc(t0.client) + '</button> <b class="tnum">' + esc(b2Sum(t0.sum)) + '</b>' + (L.some(x => x.maxLate <= 3650) ? ' · найдовше ' + Math.max.apply(null, L.map(x => x.maxLate).filter(d => d <= 3650)) + ' дн' : '') + '</p>';
    const body = '<div class="tscroll"><table class="b2tab b2debt"><thead><tr><th scope="col">Клієнт</th><th scope="col" class="r">Рейсів</th><th scope="col" class="r">Сума</th><th scope="col">Найдовше</th></tr></thead><tbody>' +
      L.map(x => '<tr><td><button type="button" class="linkbtn t1" data-bdebt="' + esc(x.client) + '">' + esc(x.client) + '</button>' + (x.flagged ? ' <span class="tag bad">у списку</span>' : '') + '</td><td class="r tnum">' + x.trips + '</td><td class="r tnum">' + esc(b2Sum(x.sum)) + '</td><td>' + late(x.maxLate) + '</td></tr>').join('') +
      '</tbody></table></div><p class="muted small">Лише прострочені рейси; порядок — за сумою в гривнях (курс ' + esc((boss2.rates && boss2.rates.src) || 'параметри') + '). Рейси й нагадування клієнту — у «Боржниках».</p>';
    return hw('debt', 'Найбільші прострочені борги', body, { cls: 'bw', short, meta, act });
  }
  /** RMPD — лише коли дошка вже з даними RMPD (поле rmpd у рейсах); розгорнуто — та сама розгортка, що на головній логіста (mRmpdDrop). */
  function bwRmpd() {
    if (!board || !board.trucks.some(x => x.trip && x.trip.rmpd)) return '';
    const T = board.trucks, r = mRmpdDrop(T);
    const cand = T.filter(x => x.status === 'trip' && x.trip && !x.trip.order && tKind(x) === 'i' && !(x.trip.st && M_AFTER.indexOf(x.trip.st.event) >= 0));
    const n = s => cand.filter(x => s.indexOf(x.trip.rmpd || '') >= 0).length;
    const rows = cand.map(mRow).filter(q => q.t && (q.t.rmpd === 'none' || q.t.rmpd === 'warn')).sort((a, b) => (b.nearB - a.nearB) || a.x.id.localeCompare(b.x.id));
    const num = (v, cls, l) => '<span class="b2r ' + (v ? cls : 'zero') + '"><b class="tnum">' + v + '</b> ' + l + '</span>';
    const short = '<p class="b2rn">' + num(cand.length, '', 'потрібно') + num(n(['none']), 'bad', 'не надіслано') + num(n(['wait', 'ai']), '', 'на перевірці') + num(n(['warn']), 'warn', 'розбіжн.') + num(n(['ok']), 'ok', 'звірено') + '</p>' +
      (rows.length ? '<ul class="b2rl">' + rows.slice(0, 2).map(q => '<li><button type="button" class="b2rr ' + (q.t.rmpd === 'none' && q.nearB ? 'hot' : '') + '" data-mrmpd="' + esc(q.x.id) + '">' + mPlate(q.x.id) + '<span><b>' + esc(q.who || '—') + '</b> · ' + (q.t.rmpd === 'warn' ? 'розбіжність з CMR' : q.nearB ? 'біля кордону без RMPD' : 'не надіслано') + (q.at && q.at !== '—' ? ' · ' + esc(q.at) : '') + '</span></button></li>').join('') + '</ul>' : '');
    return hw('rmpd', 'RMPD перед кордоном', '<div class="m51 b2rm">' + r.body + '</div><p class="muted small">' + r.foot.replace(/<\/?span>/g, '') + '</p>',
      { cls: 'bw' + (r.lv === 'bad' ? ' bw-alert' : ''), short, meta: esc(r.meta), smeta: cand.length + ' ' + plural(cand.length, 'рейс', 'рейси', 'рейсів'), act: '<button type="button" class="link hw-lnk" data-bact="board">Деталі</button>' });
  }
  function bossDraw() {
    if (!me || KA.indexOf(me.role) < 0 || !$('bwL')) return;
    const ae = document.activeElement, box = $('pnlBox'), fk = ae && box && box.contains(ae) && ae.closest('.bw') ? ['data-wtg', 'data-wtt'].map(a => ae.getAttribute(a) ? '[' + a + '="' + ae.getAttribute(a) + '"]' : '').find(Boolean) : '';
    $('bwL').innerHTML = bwRpt() + bwDebt();
    $('bwR').innerHTML = bwRmpd();
    wallSync();
    if (fk) { const f = box.querySelector(fk); if (f) f.focus({ preventScroll: true }); }
  }
  /** Кліки віджетів v51 у «Панелі дня»; true — оброблено. */
  function bossClick(e) {
    const t = e.target.closest('#bwL [data-wtg], #bwL [data-wtt], #bwR [data-wtg], #bwR [data-wtt], [data-bact], [data-bcirc], [data-bdebt], #bwR [data-mrmpd], #bwR [data-htruck]'); if (!t) return false;
    const d = t.dataset;
    if (d.wtg || d.wtt) { const k = d.wtg || d.wtt; wSet(k, !wOpen(k)); bossDraw(); }
    else if (d.bact === 'circles') openSheetQ('Кругорейси', '');
    else if (d.bact === 'debts') openDebts();
    else if (d.bact === 'board') openBoardF('rmpd');
    else if (d.bcirc) { if (d.bdo === 'remind') toast('Автоматичного нагадування водію ще немає — напишіть йому самі. Відкрито кругорейс ' + esc(d.bcirc) + '.'); openSheetQ('Кругорейси', d.bcirc); }
    else if (d.bdebt) { const c = d.bdebt; dbOld = true; openDebts().then(() => { if ($('dbSearch')) { $('dbSearch').value = c; if (debts) renderDebts(); } }); }
    else if (d.mrmpd) { const x = board && board.trucks.find(y => y.id === d.mrmpd); if (x && x.trip) openTrip(x.trip.id, 'home'); }
    else if (d.htruck) boardTruck(d.htruck);
    return true;
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
  const flag = (k, text, urgent, old) => '<span class="flag ' + (urgent ? 'b' : 'w') + (old ? ' o' : '') + '">' + svgI(PROB[k] || PROB.drv) + '<span>' + (urgent ? '<span class="sr">Терміново: </span>' : '') + esc(text) + '</span></span>';
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
    b.innerHTML = '<button type="button" class="dupchip" id="dupOpen"><span aria-hidden="true">⚠</span> Можливі дублі рейсів <b>' + dups.length + '</b> <span class="dupgo">переглянути ›</span></button>';
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
  /* ── Дошка: зведення-фільтри, компактна таблиця «спершу термінове», бокова панель рейсу (етап 2 дизайну, 23.11) ── */
  const bIdle = x => x.status === 'free' && daysFrom(x.since) > 3;
  const bUrg = x => x.problems.some(p => p.urgent);
  const bDrv = x => x.problems.some(p => p.k === 'drv');
  const bNoUnl = x => x.status === 'trip' && x.trip && !x.trip.unload && !x.trip.order;
  const bProbs = x => x.problems.filter(p => p.k !== 'gps');                       // відсутність GPS — не «проблема», її видно в «Де зараз»
  const BF = {
    drv: ['проблема водія', bDrv, 'bad'], urg: ['термінове', bUrg, 'bad'], idle: ['простій > 3 дн', bIdle, 'warn'],
    trip: ['в рейсі', x => x.status === 'trip'], free: ['вільні', x => x.status === 'free'], all: ['усі', () => true],
    nounl: ['Без дати розвантаження', bNoUnl], addr: ['Без адрес для водія', x => x.problems.some(p => p.k === 'addr')],
    can: ['Можуть їхати зараз', x => !!(x.drive && x.drive.canNow && !x.drive.moving)],
    soon: ['Скоро перерва', x => !!(x.drive && (x.drive.tone === 'soon' || x.drive.tone === 'red'))],
    rest: ['Перерва / відпочинок', x => !!(x.drive && x.drive.tone === 'rest' && !x.drive.canNow)] };
  const BF_TOP = ['drv', 'urg', 'idle', 'trip', 'free', 'all'];
  const bRank = x => x.rank != null ? x.rank : bDrv(x) && bUrg(x) ? 0 : bUrg(x) ? 1 : x.status === 'trip' ? 2 : bIdle(x) ? 3 : x.status === 'free' ? 4 : 5;
  const bStripe = x => bUrg(x) ? 'urg' : bDrv(x) ? 'work' : x.status === 'trip' ? 'trip' : bIdle(x) ? 'idle' : 'free';
  /** Стан машини одним рядком: крапка + слово (колір — не єдиний носій). */
  function bStateHtml(x) {
    if (x.status === 'trip') { const s = x.trip.st; return '<span class="bdot d-trip" aria-hidden="true"></span><b>' + esc(s && s.event ? cap(s.event) : 'В рейсі') + '</b>' + (s && s.at ? ' <span class="muted">' + esc(tkTime(s.at).split(', ').pop()) + '</span>' : ''); }
    if (x.status === 'free') { const n = daysFrom(x.since); return n > 3 ? '<span class="bdot d-idle" aria-hidden="true"></span><b class="tidle">Простій ' + n + ' дн</b>' : '<span class="bdot d-free" aria-hidden="true"></span><b>Вільна</b>' + (x.since ? ' <span class="muted">з ' + dd(x.since) + '</span>' : ''); }
    return '<span class="bdot d-none" aria-hidden="true"></span><span class="muted">Немає рейсів</span>';
  }
  /** Проблеми значками: одна група — один значок з лічильником; повний текст — у title і aria-label. */
  function bIcons(x) {
    const g = {}; bProbs(x).forEach(p => { (g[p.k] = g[p.k] || []).push(p); });
    const NM = { drv: 'водій', doc: 'документи', tir: 'ТІР', trip: 'без дати розвантаження', addr: 'адреси', debt: 'оплата' };
    return Object.keys(g).sort((a, b) => (g[b].some(p => p.urgent) - g[a].some(p => p.urgent)) || (a === 'drv' ? -1 : b === 'drv' ? 1 : 0)).map(k => {
      const l = g[k], u = l.some(p => p.urgent), old = !u && l.every(p => p.old), txt = l.map(p => p.t).join('; ');
      return '<span class="pi ' + (u ? 'pu' : old ? 'po' : 'pw') + '" role="img" title="' + esc(txt) + '" aria-label="' + esc((u ? 'Терміново: ' : '') + (NM[k] || k) + ' — ' + txt) + '">' + svgI(PROB[k] || PROB.drv) + (l.length > 1 ? '<b>' + l.length + '</b>' : '') + '</span>';
    }).join('');
  }
  function bPosText(x) {
    const P = board && board.pos, p = P && P.trucks && P.trucks[x.id];
    if (p) return '<span title="' + esc((p.place || '') + (P.stale ? ' · дані давні' : '')) + '">' + esc(p.place || 'на карті') + ' · ' + (p.moving ? 'їде' : 'стоїть') + '</span>';
    if (x.drive) return '<span class="tone-' + esc(x.drive.tone) + '" title="' + esc(x.drive.main + (x.drive.sub ? ' · ' + x.drive.sub : '')) + '">' + esc(x.drive.icon) + ' ' + esc(x.drive.main) + '</span>';
    if (x.gps) return '<span class="muted">' + esc(gpsText(x.gps)) + '</span>';
    return '<span class="muted" title="немає GPS-даних">—</span>';
  }
  function renderBoard() {
    const b = board, q = $('bSearch').value.trim().toLowerCase();
    $('bSub').textContent = 'Сьогодні ' + dd(b.today) + (/^\d\d:\d\d$/.test(b.updated || '') ? ' · оновлено о ' + b.updated : '') + (b.pos && b.pos.at ? ' · місце машин на ' + tkTime(b.pos.at).split(', ').pop() + (b.pos.stale ? ' (давно: вночі не оновлюється)' : '') : '') + (b.gpsError ? ' · GPS тимчасово недоступний' : '');
    $('bSub').title = b.gpsError ? 'Технічно: ' + b.gpsError : '';
    if (bFilter === 'prob') bFilter = 'urg';                                          // старий фільтр «З проблемами»
    if (!BF[bFilter]) bFilter = 'all';
    const setF = k => { bFilter = bFilter === k && k !== 'all' ? 'all' : k; store.set('bFilter', bFilter); renderBoard(); };
    $('bSum').innerHTML = BF_TOP.map(k => { const n = b.trucks.filter(BF[k][1]).length;
      return '<button type="button" class="bs' + (BF[k][2] && n ? ' bs-' + BF[k][2] : '') + (n ? '' : ' bs-zero') + '" data-bf="' + k + '" aria-pressed="' + (bFilter === k) + '"><b>' + n + '</b> ' + esc(BF[k][0]) + '</button>'; }).join('');
    $('bSum').querySelectorAll('[data-bf]').forEach(c => c.onclick = () => setF(c.dataset.bf));
    $('bChips').innerHTML = '';
    ['nounl', 'addr', 'rmpd', 'stale', 'can', 'soon', 'rest'].forEach(k => {
      const n = b.trucks.filter(BF[k][1]).length; if (!n && bFilter !== k) return;   // нулі не показуємо — менше шуму (власниця: «виглядає лячно»)
      const c = document.createElement('button'); c.className = 'chip'; c.setAttribute('aria-pressed', String(bFilter === k));
      c.className = 'chip bchip' + (['nounl', 'addr', 'rmpd', 'stale'].indexOf(k) >= 0 ? ' bchip-w' : ''); c.innerHTML = esc(BF[k][0]) + ' <small>' + n + '</small>'; c.onclick = () => setF(k); $('bChips').appendChild(c);
    });
    const nUnl = b.trucks.filter(bNoUnl).length; $('bUnlBtn').hidden = !nUnl || !canTrip() || bFilter !== 'nounl'; $('bUnlBtn').textContent = 'Поставити дати розвантаження (' + nUnl + ')'; $('bUnlBtn').onclick = unlMass;   // масова дія — у фільтрі «Без дати розвантаження»
    const hay = x => [x.id, x.plate, x.trailer, ...x.drivers.map(d => d.name), ...[x.trip, x.next, x.last].filter(Boolean).flatMap(t => [t.id, t.from, t.to, t.client || ''])].join(' ').toLowerCase();
    const list = b.trucks.filter(BF[bFilter][1]).filter(x => !q || hay(x).includes(q));
    list.sort((a, c) => bRank(a) - bRank(c));                                          // сервер уже сортує; кеш старої версії — теж «спершу термінове»
    if (bSortCan) { const k = x => !x.drive ? 9e15 : x.drive.moving ? 8e15 : x.drive.canNow ? 0 : (x.drive.canAt || 7e15); list.sort((a, c) => k(a) - k(c)); }
    const sb = document.createElement('button'); sb.className = 'chip bsort'; sb.setAttribute('aria-pressed', String(bSortCan));
    sb.textContent = (bSortCan ? '✓ ' : '↑ ') + 'Хто раніше може їхати'; sb.onclick = () => { bSortCan = !bSortCan; store.set('bSortCan', bSortCan ? '1' : ''); renderBoard(); }; $('bChips').appendChild(sb);
    $('bEmpty').hidden = list.length > 0;
    $('bEmptyT').textContent = q ? 'Нічого не знайдено' : bFilter === 'urg' || bFilter === 'drv' ? 'Термінового немає' : 'Тут поки немає машин';
    $('bEmptyH').textContent = q ? 'Спробуйте номер машини або прізвище водія.' : 'Зміниться після наступного оновлення дошки.';
    $('bReset').hidden = !q && bFilter === 'all';
    const tb = $('bRows'); tb.innerHTML = ''; const cards = $('bCards'); cards.innerHTML = '';
    list.forEach(x => {
      const t = x.trip || x.last, s = x.trip && x.trip.st, nd = daysFrom(x.since), pr = bProbs(x), mv = bMove(x);
      const drv = x.drivers.length ? x.drivers.map(d => '<b>' + esc(d.name) + '</b>' + (d.fromTrip ? ' <span class="muted">(за рейсом)</span>' : '') + (d.fromApp ? ' <span class="ok-mark">✓ прийняв' + (d.since ? ' ' + dd(d.since) : '') + '</span>' : '')).join(', ') : '<span class="muted">водія не вказано</span>';
      const flags = pr.map(p => flag(p.k, p.t, p.urgent, p.old)).join('');
      const route = t ? '<div class="broute">' + tripText(t) + '</div><div class="bsub">' + esc(t.id) + (t.client ? ' · ' + esc(t.client) : '') + (x.trip ? '' : ' · останній') + '</div>' : '<span class="muted">немає рейсу</span>';
      const stSub = x.trip ? (s && s.at ? (s.event ? cap(s.event) + ' ' : '') + 'з ' + tkTime(s.at) : s && s.event ? cap(s.event) : 'кроків від водія ще немає') : x.status === 'free' ? 'з ' + dd(x.since) + (nd > 0 ? ' · ' + nd + ' дн' : '') : '';
      // компактний рядок для комп'ютера: один рядок, повний текст — у title
      const dName = x.drivers.map(d => d.name).join(', ');
      const tr = tb.insertRow(); tr.className = 'brow s-' + bStripe(x); tr.dataset.truck = x.id;
      tr.innerHTML = '<td class="c-car"><button type="button" class="bopen" aria-expanded="false" aria-label="Машина ' + esc(x.id) + (dName ? ', ' + esc(dName) : '') + ': деталі"><span class="plate ua">' + esc(x.id) + '</span></button></td>' +
        '<td class="c-drv" title="' + esc((dName || 'водія не вказано') + (x.trailer ? ' · причіп ' + x.trailer : '')) + '">' + (x.trailer ? '<span class="t1">' : '') + (dName ? esc(dName) : '<span class="muted">—</span>') + (x.drivers.some(d => d.fromApp) ? ' <span class="ok-mark" title="прийняв машину в програмі">✓</span>' : '') +
          (x.trailer ? '</span><span class="t2 trl2">П ' + esc(trlShort(x.trailer)) + '</span>' : '') + '</td>' +   // v51: причіп під водієм — як у макеті («П 4417»)
        '<td class="c-trip" title="' + esc(t ? (t.from || '?') + ' → ' + (t.to || '?') + ' · ' + t.id + (t.client ? ' · ' + t.client : '') + (x.trip ? '' : ' · останній') + (mv && !mv.stale ? ' · ' + mv.text : '') : 'немає рейсу') + '">' + (t ? '<span class="t1">' + tripText(t) + '</span><span class="t2">' + esc(t.id) + (x.trip ? '' : ' · ост.') + (mv && !mv.stale ? ' · ' + esc(mv.text) : '') + '</span>' : '<span class="muted">—</span>') + '</td>' +
        '<td class="c-st"' + (x.ech ? ' title="' + esc(echShort(x.ech)) + '"' : '') + '>' + bStateHtml(x) + (x.ech ? ' <span class="echmark" aria-label="' + esc(echShort(x.ech)) + '">Ч</span>' : '') + '</td>' +
        '<td class="c-unl">' + (x.trip ? (x.trip.unload ? '<b class="tnum">' + dd(x.trip.unload) + '</b>' : '<span class="muted">не вказ.</span>') : '<span class="muted">—</span>') + '</td>' +
        '<td class="c-next">' + (x.next ? '<span class="bnext" title="' + esc(dd(x.next.load) + ' ' + (x.next.from || '?') + ' → ' + (x.next.to || '?') + (x.next.order ? ' · заявка ' + x.next.id + (x.next.status ? ' (' + x.next.status + ')' : '') : ' · ' + x.next.id)) + '">' + dd(x.next.load) + ' ' + tripText(x.next) + '</span>' : '<span class="muted">—</span>') + '</td>' +
        '<td class="c-pos">' + bPosText(x) + '</td>' +
        '<td class="c-prob"><span class="pis">' + bIcons(x) + '</span></td>';
      const det = tb.insertRow(); det.className = 'bdet'; det.hidden = true;
      det.innerHTML = '<td colspan="8">' + detail(x) + '</td>';
      const ob = tr.querySelector('.bopen');
      tr.onclick = e => { if (e.target.closest('a')) return; bPanelOpen(x, ob); };   // v50: ≥ 1200 — панель у сітці; вужче — на весь екран із «‹ Дошка»
      const c = document.createElement('details'); c.className = 'bcard';
      c.innerHTML = '<summary><div class="bc1"><span class="plate ua">' + esc(x.id) + '</span><span class="bwho">' + drv + '</span>' + badgeOf(x) + '</div>' +
        route + (x.trip && x.trip.unload ? '<div class="bsub">розвантаження ' + dd(x.trip.unload) + '</div>' : '') + (stSub ? '<div class="bsub">' + esc(stSub) + '</div>' : '') +
        (mv && !mv.stale ? '<div class="bsub bmv">' + esc(cap(mv.text)) + (mv.place ? ' · ' + esc(mv.place) : '') + '</div>' : posHtml(x.id, true)) + driveHtml(x) + (x.ech ? '<div class="bsub">' + esc(echShort(x.ech)) + '</div>' : '') + (x.gpsHint ? '<div class="bhint">' + svgI(PROB.gps) + esc(x.gpsHint.text) + '</div>' : '') +
        (flags ? '<div class="flags">' + flags + '</div>' : '') +
        (canTrip() ? x.problems.filter(p => p.k === 'drv' && p.pid).map(p => '<div class="bc-ans">' + (p.urgent ? '<button type="button" class="btn small" data-cpa="в роботі" data-pid="' + esc(p.pid) + '" data-trip="' + esc(p.trip) + '">Беру в роботу</button>' : '') +
          '<button type="button" class="btn small" data-cpa="вирішено" data-pid="' + esc(p.pid) + '" data-trip="' + esc(p.trip) + '">Вирішено…</button></div>').join('') : '') +   // телефон: відповісти водію прямо з картки (логісти 23.11)
        '<span class="bmore"><span class="m1">Деталі</span><span class="m2">Згорнути</span></span></summary>' + detail(x);
      c.querySelectorAll('[data-cpa]').forEach(bt => bt.onclick = async e => { e.preventDefault(); e.stopPropagation();
        const state = bt.dataset.cpa; let text = '';
        if (state === 'вирішено') { text = await askText('Як вирішили?', 'Напр. EX передали, митниця пропустила', 'Вирішено'); if (!text) return; }
        busy(true); try { await api('trip.problem.answer', { tripId: bt.dataset.trip, problemId: bt.dataset.pid, state, text, opId: 'PA-' + newId().slice(0, 16) });
          toast(state === 'вирішено' ? '✔ Проблему закрито — водій бачить відповідь.' : '✔ Водій бачить, що проблема в роботі.'); await openBoard(true); }
        catch (er) { toast(esc(er.message), 'err'); } finally { busy(false); } });
      c.querySelector('summary').addEventListener('click', e => { if (e.target.closest('a,button')) return; e.preventDefault(); bPanelOpen(x, c.querySelector('summary')); });   // v50: рейс на весь екран
      cards.appendChild(c);
    });
    if (bPanelX && !$('bPanel').hidden) { const nx = list.find(x => x.id === bPanelX.id); if (nx) { bPanelX = nx; markPanelRow(); } else bPanelClose(); }   // машина пішла з фільтра — панель закривається
    renderQueue(b);
    // «Заявки без машини» — клік відкриває «Новий рейс» із заявки (UX P1-5)
    const w = b.waiting || []; $('bWait').hidden = !w.length; $('bWaitN').textContent = w.length;
    $('bWaitList').innerHTML = w.map(z => '<button type="button" class="wrow wbtn" data-zord="' + esc(z.id) + '"><b>' + tripText(z) + '</b> <span class="muted">' + (z.load ? 'завантаження ' + dd(z.load) : '') + (z.client ? ' · ' + esc(z.client) : '') + ' · ' + esc(z.status || 'нова') + '</span>' + (canTrip() ? '<span class="wgo">Створити рейс ›</span>' : '') + '</button>').join('');
    $('bWaitList').querySelectorAll('[data-zord]').forEach(bt => bt.onclick = () => orderToTrip(bt.dataset.zord));
  }
  /** v51: коротко причіп для рядка дошки: «АО4417ХР» → «4417»; без 3–5 цифр — як є. */
  const trlShort = v => { const m = String(v || '').replace(/\s+/g, '').match(/\d{3,5}/); return m ? m[0] : String(v || ''); };
  /* ── v50 (П1): «Причепи в черзі» — картки; ручні записи (аркуш бази) разом із реєстром бота; «Призначити тягач» → форма рейсу ── */
  const canQueue = () => !!me && !me.viewAs && ['адмін', 'керівник', 'логіст'].indexOf(me.role) >= 0;   // v51: «Подивитися як…» — без «Записати причіп» / «Прибрати» / «Призначити тягач»
  function renderQueue(b) {
    const qu = b.queue || [], dn = b.queueDone || [], cq = canQueue();
    $('bQueue').hidden = false; $('bQueueN').textContent = qu.length; $('bQueueN').hidden = !qu.length;
    $('bQueueAdd').hidden = !cq;
    const card = (z, done) => '<div class="qcard' + (done ? ' qdone' : '') + '"><div class="qtop"><span class="plate trl">' + esc(z.trailer || '?') + '</span>' +
      (done ? '<span class="qwait ok">' + svgI(BP_ICO.ok) + 'призначено</span>' : z.waitDays != null ? '<span class="qwait' + (z.waitDays > 2 ? ' long' : '') + '">' + svgI(BP_ICO.clock) + (z.waitDays ? 'чекає ' + z.waitDays + ' дн' : 'сьогодні') + '</span>' : '') + '</div>' +
      '<p><b>' + tripText(z) + '</b><br><span class="muted">' + [z.load && 'завантажено ' + dd(z.load), z.client && esc(z.client), z.cargo && esc(z.cargo), z.adr && 'АДР', z.border && esc(z.border)].filter(Boolean).join(' · ') + '</span>' +
      (z.note ? '<br><span class="muted small">' + esc(z.note) + '</span>' : '') + (done ? '<br><span class="small">рейс ' + tripLink({ id: z.tripId }) + (z.truck ? ' · тягач ' + esc(z.truck) : '') + '</span>' : !done && z.truck ? '<br><span class="muted small">у боті: тягач ' + esc(z.truck) + ', ще не внесено</span>' : '') + '</p>' +
      '<div class="qrow2"><span class="qsrc"' + (z.by ? ' title="' + esc(z.by + (z.at ? ', ' + tkTime(z.at) : '')) + '"' : '') + '>' + esc(z.src || 'бот') + '</span>' +
      (!done && cq ? '<button type="button" class="linkbtn small qdel" data-qdel="' + esc(z.id) + '" aria-label="Прибрати причіп ' + esc(z.trailer || '') + ' з черги">Прибрати</button><button type="button" class="btn small" data-qas="' + esc(z.id) + '">Призначити тягач</button>' : '') + '</div></div>';
    $('bQueueList').innerHTML = (b.queueError ? '<p class="msg small">Реєстр бота недоступний: ' + esc(b.queueError) + '</p>' : '') +
      (qu.length || dn.length ? '<div class="queue">' + qu.map(z => card(z)).join('') + dn.map(z => card(z, true)).join('') + '</div>' : '');
    $('bQueueList').querySelectorAll('[data-qas]').forEach(bt => bt.onclick = () => queueAssign(qu.find(z => z.id === bt.dataset.qas)));
    // критик v50: «прибрати з черги» (помилковий запис / причіп поїхав повз програму) — queue.set «скасовано» з причиною
    $('bQueueList').querySelectorAll('[data-qdel]').forEach(bt => bt.onclick = async () => {
      const z = qu.find(y => y.id === bt.dataset.qdel); if (!z) return;
      const why = await askText('Прибрати причіп ' + (z.trailer || '') + ' з черги?', 'Чому: напр. записали помилково, забрав чужий тягач', 'Прибрати'); if (!why) return;   // «Скасувати» повертає '' — без причини не прибираємо
      busy(true); try { await api('queue.set', { id: z.id, state: 'скасовано', note: why, opId: 'QC-' + newId().slice(0, 16) }); toast('✔ Причіп ' + esc(z.trailer || '') + ' прибрано з черги.'); board = null; try { store.set('boardCache', ''); } catch (e) {} await openBoard(true); }
      catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); } });
  }
  function queueAssign(z, truck) {
    if (!z) return;
    const preset = { ...(truck ? { 'Авто ID': truck } : {}), 'Звідки': z.from || '', 'Куди': z.to || '', 'Дата завантаження': z.load || '', 'Клієнт (як записано)': z.client || '', 'Вантаж': z.cargo || '', 'Перехід': z.border || '', 'АДР': z.adr ? 'так' : '',
      'Примітки': 'Причіп ' + (z.trailer || '?') + ' з черги' + (z.src === 'бот' ? ' (бот)' : '') + (z.note ? ' · ' + z.note : '') };
    if (z.freight && z.src === 'бот') { preset['Фрахт'] = String(z.freight).replace(/[^\d.,]/g, ''); if (z.currency) preset['Валюта'] = z.currency; }
    tripForm(null, { preset, queue: z, onSaved: async tid => {
      try { await api('queue.set', { id: z.id, state: 'призначено', tripId: tid, opId: 'QS-' + newId().slice(0, 16) }); toast('✔ Рейс ' + esc(tid) + ' створено, причіп ' + esc(z.trailer) + ' — «призначено».'); }
      catch (e) { toast('Рейс ' + esc(tid) + ' створено, але причіп у черзі не позначено: ' + esc(e.message), 'err'); }
      board = null; try { store.set('boardCache', ''); } catch (e) {} } });
  }
  function queueAddOpen() {
    if (!canQueue()) return;
    const tr = (board && board.trailers) || [], today = isoDay(new Date());
    const w = document.createElement('div'); w.className = 'ask-wrap';
    const f = (id, label, inp, cls) => '<div class="field' + (cls ? ' ' + cls : '') + '"><label for="' + id + '">' + label + '</label>' + inp + '</div>';
    w.innerHTML = '<div class="ask tsheet qsheet" role="dialog" aria-modal="true" aria-labelledby="qdT"><h2 id="qdT">Записати причіп у чергу</h2>' +
      '<p class="note small">Для причепів, яких немає в реєстрі бота «Заявки → рейси». Запис іде в аркуш бази «Причепи в черзі»; на дошці — разом із ботовими.</p><div class="qgrid">' +
      f('q1', 'Причіп', '<input id="q1" list="q1l" autocomplete="off" placeholder="номер причепа"><datalist id="q1l">' + tr.map(p => '<option value="' + esc(p.plate || p.id) + '">' + esc([p.id !== p.plate ? p.id : '', p.type].filter(Boolean).join(' · ')) + '</option>').join('') + '</datalist>') +
      f('q2', 'Завантажено', '<input id="q2" type="date" value="' + today + '" max="' + today + '">') +
      f('q3', 'Звідки', '<input id="q3" placeholder="місто завантаження">') + f('q4', 'Куди', '<input id="q4" placeholder="місто, країна">') +
      (board && board.money !== false ? f('q5', 'Клієнт', '<input id="q5" list="q5l" autocomplete="off"><datalist id="q5l">' + [...new Set((board.trucks || []).flatMap(x => [x.trip, x.next, x.last]).filter(Boolean).map(t => t.client).filter(Boolean))].map(c => '<option value="' + esc(c) + '">').join('') + '</datalist>') : '') +
      f('q6', 'Вантаж', '<input id="q6" placeholder="напр. хімія, 16 т">') + f('q7', 'Перехід', '<input id="q7" placeholder="Ягодин, Устилуг…">') +
      '<div class="field qadr"><label class="tfchk"><input type="checkbox" id="q8"> АДР</label></div>' +
      f('q9', 'Примітка', '<input id="q9" placeholder="напр. вивантажити до 27.11, контакт на складі">', 'span2') + '</div>' +
      '<p class="msg" role="alert" id="qMsg"></p><div class="ask-btns"><button class="btn" data-a="0">Скасувати</button><button class="primary" data-a="1">Записати в чергу</button></div></div>';
    const q = s2 => w.querySelector(s2), close = () => w.remove();
    w.onclick = async e => {
      if (e.target === w || e.target.closest('[data-a="0"]')) return close();
      if (!e.target.closest('[data-a="1"]')) return;
      const v = id => (q('#' + id) ? q('#' + id).value.trim() : '');
      const rec = { trailer: v('q1'), load: v('q2'), from: v('q3'), to: v('q4'), client: v('q5'), cargo: v('q6'), cross: v('q7'), adr: q('#q8').checked, note: v('q9') };
      const miss = [!rec.trailer && 'причіп', !rec.load && 'дата завантаження', !rec.from && 'звідки', !rec.to && 'куди'].filter(Boolean);
      if (miss.length) { q('#qMsg').textContent = 'Заповніть: ' + miss.join(', '); return; }
      const bt = q('[data-a="1"]'); bt.disabled = true; busy(true);
      try { await api('queue.add', { rec, opId: 'QA-' + newId().slice(0, 16) }); close(); toast('✔ Причіп ' + esc(rec.trailer) + ' записано в чергу.'); board = null; try { store.set('boardCache', ''); } catch (er) {} openBoard(true); }
      catch (er) { q('#qMsg').textContent = er.message; bt.disabled = false; } finally { busy(false); }
    };
    w.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
    dlgOpener = document.activeElement; document.body.appendChild(w); q('#q1').focus();
  }
  /* ── Меню розділів замість плиток (ідея власниці №8, v47): групи, закріплене, бейджі; ≥1280 — постійне ліворуч, 768–1279 — значки + шухляда, телефон — ☰ ── */
  const NAV_G = [['Перевезення', 'truck'], ['Водії', 'user'], ['Гроші', 'money'], ['Техніка', 'wrench'], ['Довідники', 'book'], ['Керування', 'shield']];
  const NAV_FOLD = { 4: true };   // «Довідники» згорнуті за замовчуванням
  const OFF = ['адмін', 'керівник', 'логіст', 'бухгалтер', 'механік'], LKA = ['адмін', 'керівник', 'логіст'], KA = ['адмін', 'керівник'];
  const NAV = [
    { id: 'home', t: 'Головна', ico: 'home', roles: OFF },
    { id: 'board', t: 'Дошка машин', g: 0, ico: 'board', roles: ['адмін', 'керівник', 'механік'] },   // v52: у логіста дошка = головна «Машини зараз» (рішення власниці 27.11)
    { id: 'sheet:Заявки', t: 'Заявки', g: 0, sheet: 'Заявки', ico: 'inbox', roles: LKA },
    { id: 'sheet:Рейси', t: 'Рейси', g: 0, sheet: 'Рейси', ico: 'route', roles: ['адмін', 'керівник', 'логіст', 'бухгалтер'] },
    { id: 'sheet:Кругорейси', t: 'Кругорейси', g: 0, sheet: 'Кругорейси', ico: 'loop', roles: LKA },
    { id: 'calc', t: 'Калькулятор', g: 0, ico: 'calc', roles: LKA },
    { id: 'probs', t: 'Проблеми водіїв', g: 1, ico: 'alert', roles: LKA },
    { id: 'exp', t: 'Витрати водіїв', g: 1, ico: 'receipt', roles: ['адмін', 'керівник', 'логіст', 'бухгалтер'] },
    { id: 'sheet:Водій на авто', t: 'Водій на авто', g: 1, sheet: 'Водій на авто', ico: 'user', roles: ['логіст'] },
    { id: 'debts', t: 'Боржники', g: 2, sub: 'c', ico: 'money', roles: ['адмін', 'керівник', 'логіст', 'бухгалтер'] },
    { id: 'inv', t: 'До виставлення', g: 2, sub: 'c', ico: 'doc', roles: ['адмін', 'керівник', 'бухгалтер'] },
    { id: 'sheet:Готівка від клієнтів', t: 'Готівка від клієнтів', g: 2, sub: 'c', sheet: 'Готівка від клієнтів', ico: 'money', roles: ['бухгалтер'] },
    { id: 'sheet:Нарахування', t: 'Нарахування', g: 2, sub: 'w', sheet: 'Нарахування', ico: 'table', roles: KA },
    { id: 'sheet:Виплати й доплати', t: 'Виплати й доплати', g: 2, sub: 'w', sheet: 'Виплати й доплати', ico: 'table', roles: ['адмін', 'керівник', 'бухгалтер'] },
    { id: 'sheet:Рухи коштів', t: 'Рухи коштів', g: 2, sub: 'k', sheet: 'Рухи коштів', ico: 'table', roles: ['адмін', 'керівник', 'бухгалтер'] },
    { id: 'docs', t: 'Документи', g: 3, ico: 'doc', roles: ['адмін', 'керівник', 'логіст', 'механік'] },
    { id: 'sheet:Авто', t: 'Авто', g: 3, sheet: 'Авто', ico: 'truck', roles: ['адмін', 'механік'] },
    { id: 'sheet:Причепи', t: 'Причепи', g: 3, sheet: 'Причепи', ico: 'table', roles: ['механік'] },
    { id: 'sheet:Спідометр і пальне', t: 'Спідометр і пальне', g: 3, sheet: 'Спідометр і пальне', ico: 'table', roles: ['механік'] },
    { id: 'sheet:Клієнти', t: 'Клієнти', g: 4, sheet: 'Клієнти', ico: 'table', roles: ['адмін', 'керівник', 'логіст', 'бухгалтер'] },
    { id: 'sheet:Відстані', t: 'Відстані', g: 4, sheet: 'Відстані', ico: 'table', roles: ['логіст'] },
    { id: 'sheet:Працівники', t: 'Працівники', g: 4, sheet: 'Працівники', ico: 'table', roles: ['адмін'] },
    { id: 'sheet:Користувачі', t: 'Користувачі', g: 4, sheet: 'Користувачі', ico: 'table', roles: ['адмін'] },
    { id: 'codes', t: 'Видати код', g: 5, ico: 'key', roles: KA },
    { id: 'sheet:Журнал змін', t: 'Журнал змін', g: 5, sheet: 'Журнал змін', ico: 'table', roles: KA },
    { id: 'health', t: 'Здоров\'я програми', g: 5, ico: 'pulse', roles: KA }
  ];
  const PINS_DEF = { 'логіст': ['board', 'sheet:Заявки', 'calc', 'probs'], 'керівник': ['board', 'probs', 'exp', 'debts'], 'адмін': ['health', 'board', 'codes', 'sheet:Журнал змін'], 'бухгалтер': ['debts', 'inv', 'exp'], 'механік': ['board', 'docs'] };
  const ICO = { home: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10', board: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
    route: 'M6 20a2 2 0 100-4 2 2 0 000 4zM18 8a2 2 0 100-4 2 2 0 000 4zM6 16V9a3 3 0 013-3h7M18 8v7a3 3 0 01-3 3H8', loop: 'M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M18 3v4h-4M6 21v-4h4',
    calc: 'M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01', alert: 'M12 4l9 16H3zM12 10v4M12 17h.01',
    receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0', money: 'M3 6h18v12H3zM12 15a3 3 0 100-6 3 3 0 000 6zM6 9v.01M18 15v.01',
    doc: 'M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8zM14 3v5h5M9 13h6M9 17h4', truck: 'M3 16V7a1 1 0 011-1h10v10M14 9h4l3 3v4h-7M6.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm11 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
    table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14', wrench: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.8-3.8a6 6 0 01-7.9 7.9l-6.9 6.9a2.1 2.1 0 01-3-3l6.9-6.9a6 6 0 017.9-7.9z', book: 'M4 19.5A2.5 2.5 0 016.5 17H20V2H6.5A2.5 2.5 0 004 4.5zM4 19.5A2.5 2.5 0 006.5 22H20v-5',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', key: 'M8 15a4 4 0 110-8 4 4 0 010 8zM12 11h9M18 11v3M21 11v3', pulse: 'M3 12h4l2-5 4 10 2-5h6',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z', menu: 'M4 6h16M4 12h16M4 18h16', left: 'M15 6l-6 6 6 6', right: 'M9 6l6 6-6 6', x: 'M6 6l12 12M18 6L6 18' };
  const ico = k => '<svg class="nico" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICO[k] || ICO.table) + '"/></svg>';
  let navCur = 'home', navOpenNow = false, navOpener = null, navBadge = {}, navGOpen = {};
  const isOffice = () => !!me && me.role !== 'водій' && OFF.indexOf(me.role) >= 0;
  const navItems = () => { const can = new Set(sheets.map(s => s.name)); return NAV.filter(n => n.roles.indexOf(me.role) >= 0 && (!n.sheet || can.has(n.sheet))); };
  const navHref = id => '#' + (id.indexOf('sheet:') === 0 ? 'sheet/' + encodeURIComponent(id.slice(6)) : id);
  const navPins = () => { let p = null; try { p = JSON.parse(store.get('pins_' + me.login) || 'null'); } catch (e) {} const ok = new Set(navItems().map(n => n.id)); return (p || PINS_DEF[me.role] || []).filter(id => ok.has(id) && id !== 'home').slice(0, 4); };
  const navDocked = () => window.innerWidth >= 1280 && !document.body.classList.contains('nav-mini');
  const navDrawerMode = () => !navDocked();
  /** Згорнути до значків: людина вибрала, або відкрита бокова панель рейсу на екрані < 1440 px. */
  function navAuto() {
    if (!isOffice()) return;
    const mini = store.get('navMini') === '1' || (document.body.classList.contains('bpanel-on') && window.innerWidth < 1440) ||
      (store.get('navMini') !== '0' && !!me && me.role === 'логіст' && !!$('m51') && !$('home').hidden && window.innerWidth < 1680);   // v51 (макет v0.5): на головній логіста меню — значками, статуси на всю сторінку
    document.body.classList.toggle('nav-mini', mini);
    if (navOpenNow && navDocked()) navClose(true);
    const n = $('nav'); if (!navOpenNow) { if (navDrawerMode()) { n.removeAttribute('role'); n.removeAttribute('aria-modal'); n.setAttribute('aria-hidden', 'true'); n.inert = true; } else { n.removeAttribute('aria-hidden'); n.inert = false; } }
  }
  function navBadgeHtml(id, rail) {
    const b = navBadge[id]; if (!b || !b.n) return '';
    return rail ? '<span class="nbdot ' + (b.bad ? 'bad' : '') + '" aria-hidden="true"></span>' : '<span class="nbadge' + (b.bad ? ' bad' : '') + '" aria-hidden="true">' + b.n + '</span>';
  }
  const navLabel = n => n.t + (navBadge[n.id] && navBadge[n.id].n ? ', ' + navBadge[n.id].label : '');
  function navLink(n, pinned) {
    const on = navCur === n.id;
    return '<li class="nav-li"><a class="nav-a' + (on ? ' on' : '') + '" href="' + navHref(n.id) + '" data-nav="' + esc(n.id) + '"' + (on && !pinned ? ' aria-current="page"' : '') + ' aria-label="' + esc(navLabel(n)) + '">' + ico(n.ico) + '<span class="nav-t">' + esc(n.t) + '</span>' + navBadgeHtml(n.id) + (n.sheet ? '<span class="nav-sh" aria-hidden="true" title="таблиця">▦</span>' : '') + '</a>' +
      (n.id !== 'home' ? '<button type="button" class="nav-pin" data-pin="' + esc(n.id) + '" aria-pressed="' + (navPins().indexOf(n.id) >= 0) + '" aria-label="' + (navPins().indexOf(n.id) >= 0 ? 'Відкріпити ' : 'Закріпити ') + esc(n.t) + '" title="' + (navPins().indexOf(n.id) >= 0 ? 'Відкріпити' : 'Закріпити вгорі') + '">' + ico('star') + '</button>' : '') + '</li>';
  }
  function navRender() {
    if (!isOffice()) return;
    const items = navItems(), pins = navPins(), home = items.find(n => n.id === 'home');
    let h = '<div class="nav-dh"><span class="logo" aria-hidden="true"></span><b>Розділи</b><button type="button" class="nav-x" id="navX" aria-label="Закрити меню (Esc)">' + ico('x') + '</button></div><div class="nav-sc">';
    h += '<ul class="nav-ul">' + navLink(home) + '</ul>';
    // v48: розгорнуте меню — одна стабільна мапа без дублів; закріплене (зірочка) — у смузі значків і на головній бухгалтера/механіка
    NAV_G.forEach((g, gi) => {
      const l = items.filter(n => n.g === gi); if (!l.length) return;
      if (l.length === 1) { h += '<div class="nav-g nav-one" data-g="' + gi + '"><h2 class="nav-gh nav-gs" id="navG' + gi + '" aria-label="' + esc(g[0]) + '">' + ico(g[1]) + '<span aria-hidden="true">' + esc(g[0].toLocaleUpperCase('uk')) + '</span></h2><ul class="nav-ul nav-flat" aria-labelledby="navG' + gi + '">' + navLink(l[0]) + '</ul></div>'; return; }   // група з одним пунктом — маленький заголовок без згортання (v48)
      const open = navGOpen[gi] != null ? navGOpen[gi] : !NAV_FOLD[gi] || l.some(n => n.id === navCur);
      let prev = null; const lis = l.map(n => { const sep = prev && n.sub && prev.sub && n.sub !== prev.sub; prev = n; return (sep ? '<li class="nav-sep" role="presentation"></li>' : '') + navLink(n); }).join('');
      h += '<div class="nav-g" data-g="' + gi + '"><h2 class="nav-gh"><button type="button" class="nav-gb" id="navG' + gi + '" aria-expanded="' + open + '" aria-controls="navGL' + gi + '" aria-label="' + esc(g[0]) + '">' + ico(g[1]) + '<span aria-hidden="true">' + esc(g[0].toLocaleUpperCase('uk')) + '</span><svg class="nav-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></h2>' +
        '<ul class="nav-ul" id="navGL' + gi + '" aria-labelledby="navG' + gi + '"' + (open ? '' : ' hidden') + '>' + lis + '</ul></div>';
    });
    h += '</div><button type="button" class="nav-mini-b" id="navMiniB" aria-label="Згорнути меню до значків">' + ico('left') + '<span>Згорнути меню</span></button>';
    $('nav').innerHTML = h;
    // смуга значків: Головна, закріплене, групи
    let r = '<button type="button" class="rail-b rail-open" id="railOpen" aria-label="Усі розділи" title="Усі розділи" aria-expanded="false" aria-controls="nav">' + ico('menu') + '</button>';
    r += [home].concat(pins.map(id => items.find(n => n.id === id))).map(n => '<a class="rail-b' + (navCur === n.id ? ' on' : '') + '" href="' + navHref(n.id) + '" data-nav="' + esc(n.id) + '"' + (navCur === n.id ? ' aria-current="page"' : '') + ' aria-label="' + esc(navLabel(n)) + '" title="' + esc(n.t) + '">' + ico(n.ico) + navBadgeHtml(n.id, true) + '</a>').join('');
    r += '<span class="rail-sep" aria-hidden="true"></span>' + NAV_G.map((g, gi) => items.some(n => n.g === gi) ? '<button type="button" class="rail-b' + (items.some(n => n.g === gi && n.id === navCur) ? ' on' : '') + '" data-railg="' + gi + '" aria-label="' + esc(g[0]) + '" title="' + esc(g[0]) + '">' + ico(g[1]) + '</button>' : '').join('');
    $('navRail').innerHTML = r;
    $('nav').hidden = false; $('navRail').hidden = false; $('navBtn').hidden = false; navAuto();
  }
  /** Перехід у розділ з меню, пошуку чи #адреси. */
  function navGo(id) {
    if (!me) return;
    navClose(); closeUser();
    const it = NAV.find(n => n.id === id);
    if (!it || navItems().indexOf(it) < 0) { if (id !== 'home') toast('Розділу «' + esc(it ? it.t : id) + '» у вашій ролі немає.'); return renderHome(); }
    if (it.sheet) return openSheet({ title: it.t, sheet: it.sheet }).then(navFocusH1);
    const go = { home: renderHome, board: () => openBoard(), calc: openCalc, probs: openProbs, exp: () => openExp(), debts: () => openDebts(), inv: () => openInv(), docs: () => openDocs(), codes: openCodes, health: openHealth }[id];
    const r = go ? go() : renderHome(); navFocusH1(); return r;
  }
  function navFocusH1() { setTimeout(() => { if (document.querySelector('.ask-wrap')) return; const s = document.querySelector('main > section:not([hidden])'), h = s && s.querySelector('h1'); if (h && !h.contains(document.activeElement) && (!document.activeElement || document.activeElement === document.body || $('nav').contains(document.activeElement) || $('navRail').contains(document.activeElement) || $('gs').contains(document.activeElement))) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }, 60); }
  const SCR_NAV = { home: 'home', board: 'board', calc: 'calc', probs: 'probs', exp: 'exp', debts: 'debts', bank: 'debts', inv: 'inv', docs: 'docs', codes: 'codes', health: 'health' };
  /** Поточний пункт: aria-current + маркер; вкладені екрани (рейс, виписка банку) — батьківський пункт. */
  function navMark(scr) {
    if (!isOffice()) return;
    let id = SCR_NAV[scr]; if (scr === 'view' && current) id = 'sheet:' + current.sheet; if (!id) id = navCur;
    const it = NAV.find(n => n.id === id); $('scrName').textContent = it ? it.t : (scr === 'trip' ? 'Рейс' : '');
    if (id === navCur && $('nav').innerHTML) return; navCur = id;
    document.querySelectorAll('#nav [data-nav], #navRail [data-nav]').forEach(a => { const on = a.dataset.nav === id; a.classList.toggle('on', on); if (on && !a.closest('.nav-pins')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.querySelectorAll('#navRail [data-railg]').forEach(b => b.classList.toggle('on', !!(it && it.g === +b.dataset.railg)));
    if (it && it.g != null && $('navGL' + it.g) && $('navGL' + it.g).hidden) { navGOpen[it.g] = true; $('navGL' + it.g).hidden = false; $('navG' + it.g).setAttribute('aria-expanded', 'true'); }
  }
  function navOpen(g) {
    if (!isOffice()) return;
    if (navDocked()) { const a = $('nav').querySelector('[aria-current="page"]') || $('nav').querySelector('a'); if (a) a.focus(); return; }
    navOpener = document.activeElement; navOpenNow = true;
    const n = $('nav'); n.classList.add('open'); n.inert = false; n.removeAttribute('aria-hidden'); n.setAttribute('role', 'dialog'); n.setAttribute('aria-modal', 'true');
    $('navScrim').hidden = false; document.body.classList.add('nav-open'); $('navBtn').setAttribute('aria-expanded', 'true'); if ($('railOpen')) $('railOpen').setAttribute('aria-expanded', 'true');
    const mn = document.querySelector('main'); if (mn) mn.inert = true; document.querySelector('header.top').inert = true; $('navRail').inert = true;
    let f = null;
    if (g != null && $('navGL' + g)) { navGOpen[g] = true; $('navGL' + g).hidden = false; $('navG' + g).setAttribute('aria-expanded', 'true'); f = $('navGL' + g).querySelector('a'); $('navG' + g).scrollIntoView({ block: 'nearest' }); }
    f = f || n.querySelector('[aria-current="page"]') || n.querySelector('a');
    const fo = () => { if (f && navOpenNow && !n.contains(document.activeElement)) f.focus(); }; setTimeout(fo, 20); setTimeout(fo, 240);
  }
  function navClose(silent) {
    if (!navOpenNow) return; navOpenNow = false;
    const n = $('nav'); n.classList.remove('open'); n.removeAttribute('role'); n.removeAttribute('aria-modal');
    $('navScrim').hidden = true; document.body.classList.remove('nav-open'); $('navBtn').setAttribute('aria-expanded', 'false'); if ($('railOpen')) $('railOpen').setAttribute('aria-expanded', 'false');
    const mn = document.querySelector('main'); if (mn && !document.querySelector('.ask-wrap')) mn.inert = false; document.querySelector('header.top').inert = false; $('navRail').inert = false;
    navAuto();
    if (!silent && navOpener && navOpener.isConnected) try { navOpener.focus(); } catch (e) {}
  }
  function navPinToggle(id) {
    let p = navPins(); const it = NAV.find(n => n.id === id);
    if (p.indexOf(id) >= 0) p = p.filter(x => x !== id); else { if (p.length >= 4) { toast('Закріпити можна до 4 розділів — спершу відкріпіть один.'); return; } p.push(id); }
    store.set('pins_' + me.login, JSON.stringify(p));
    const wasOpen = navOpenNow; navRender(); if (wasOpen) { navOpenNow = false; navOpen(); }
    const b = $('nav').querySelector('.nav-g [data-pin="' + id + '"], .nav-flat [data-pin="' + id + '"], .nav-ul:not(.nav-pins) [data-pin="' + id + '"]'); if (b) b.focus();
    toast(p.indexOf(id) >= 0 ? '«' + esc(it.t) + '» закріплено вгорі меню.' : '«' + esc(it.t) + '» відкріплено.');
  }
  /** Бейджі: лише «хтось чекає на мою дію», з даних, що головна вже має (дошка / панель дня). */
  function navBadges() {
    if (!isOffice()) return; const nb = {};
    const T = board && board.trucks ? board.trucks : null;
    if (T && LKA.indexOf(me.role) >= 0) {
      const n = T.reduce((a, x) => a + x.problems.filter(p => p.k === 'drv' && p.urgent).length, 0); nb.probs = { n, bad: true, label: n + ' ' + plural(n, 'нова', 'нові', 'нових') };
      const d = T.filter(x => x.problems.some(p => (p.k === 'doc' || p.k === 'tir') && /простроч/.test(p.t) && !p.old)).length; nb.docs = { n: d, bad: true, label: 'прострочено в ' + d + ' ' + plural(d, 'машини', 'машин', 'машин') };
    }
    if (panel && KA.indexOf(me.role) >= 0) {
      const p = panel; if (p.problems && !p.problems.error) nb.probs = { n: p.problems.fresh, bad: true, label: p.problems.fresh + ' ' + plural(p.problems.fresh, 'нова', 'нові', 'нових') };
      if (p.exp && !p.exp.error) nb.exp = { n: p.exp.fresh, label: p.exp.fresh + ' на перевірку' };
      if (p.docs && !p.docs.error) nb.docs = { n: p.docs.over, bad: true, label: 'прострочено: ' + p.docs.over };
      if (p.debts && !p.debts.error && me.role === 'керівник') nb.debts = { n: p.debts.clients, label: p.debts.clients + ' ' + plural(p.debts.clients, 'клієнт', 'клієнти', 'клієнтів') + ' з простроченням' };
    }
    if (JSON.stringify(nb) === JSON.stringify(navBadge)) return; navBadge = nb; if (!navOpenNow) navRender();
  }
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  $('nav').addEventListener('click', e => {
    const pb = e.target.closest('[data-pin]'); if (pb) { e.preventDefault(); navPinToggle(pb.dataset.pin); return; }
    const gb = e.target.closest('button.nav-gb'); if (gb) { const gi = +gb.closest('.nav-g').dataset.g, ul = $('navGL' + gi), open = ul.hidden; ul.hidden = !open; gb.setAttribute('aria-expanded', String(open)); navGOpen[gi] = open; return; }
    if (e.target.closest('#navX')) { navClose(); return; }
    if (e.target.closest('#navMiniB')) { store.set('navMini', '1'); navAuto(); const r = $('railOpen'); if (r) r.focus(); return; }
    const a = e.target.closest('a[data-nav]'); if (a && !(e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) { e.preventDefault(); navGo(a.dataset.nav); }
  });
  $('navRail').addEventListener('click', e => {
    if (e.target.closest('#railOpen')) { if (window.innerWidth >= 1280) { store.set('navMini', '0'); document.body.classList.remove('nav-mini'); navAuto(); if (!navDocked()) navOpen(); else { const a = $('nav').querySelector('a'); if (a) a.focus(); } } else navOpen(); return; }
    const g = e.target.closest('[data-railg]'); if (g) { navOpen(+g.dataset.railg); return; }
    const a = e.target.closest('a[data-nav]'); if (a && !(e.ctrlKey || e.metaKey || e.shiftKey)) { e.preventDefault(); navGo(a.dataset.nav); }
  });
  $('navBtn').onclick = () => navOpenNow ? navClose() : navOpen();
  $('navScrim').onclick = () => navClose();
  $('brand').addEventListener('click', e => { e.preventDefault(); if (me && !(e.ctrlKey || e.metaKey)) { if (isOffice()) navGo('home'); else renderHome(); } });
  $('nav').addEventListener('keydown', e => {
    if (!navOpenNow || e.key !== 'Tab') return;
    const fs = [...$('nav').querySelectorAll('a[href], button')].filter(x => x.offsetParent !== null && !x.closest('[hidden]')); if (!fs.length) return;
    const a = fs[0], z = fs[fs.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });
  // #адреса (Ctrl+клік по пункту меню → нова вкладка): після входу відкрити той розділ
  const hashId = () => { const h = decodeURIComponent((location.hash || '').slice(1)); if (!h) return ''; if (h.indexOf('sheet/') === 0) return 'sheet:' + h.slice(6); return NAV.some(n => n.id === h) ? h : ''; };
  let navHashPending = hashId();
  const clearHash = () => { try { if (location.hash) history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {} };
  window.addEventListener('hashchange', () => { const id = hashId(); if (!id || !isOffice()) return; clearHash(); navGo(id); });
  window.addEventListener('resize', () => { if (isOffice()) { navAuto(); if (hHome && !$('home').hidden && hRole() && hPhoneWas !== hPhone()) logDraw(); } });

  /* ── Ім'я ▾: розмір тексту й тема, сповіщення, вийти ── */
  function closeUser(focus) { const p = $('userPop'); if (p.hidden) return; p.hidden = true; $('userBtn').setAttribute('aria-expanded', 'false'); if (focus) $('userBtn').focus(); }
  $('userBtn').onclick = () => { const p = $('userPop'), open = p.hidden; p.hidden = !open; $('userBtn').setAttribute('aria-expanded', String(open)); if (open) { const f = p.querySelector('button'); if (f) f.focus(); } };
  $('userPop').addEventListener('click', e => { const b = e.target.closest('[data-um]'); if (!b) return; const a = b.dataset.um; closeUser();
    if (a === 'viewas') return viewAsOpen();
    if (a === 'viewback') return viewBack();
    if (a === 'viewswitch') { store.set('vaReopen', '1'); return viewBack(); }   // з перегляду — одразу інша роль (власниця 23.11)
    if (a === 'view') $('fontBtn').onclick(); else if (a === 'push') openPush(); else if (a === 'logout') askLogout(); else if (a === 'logoutAll') $('logoutAll').onclick(); else if (a === 'tour') { store.del('tour1_' + me.role); tour(); } });
  $('userPop').addEventListener('keydown', e => { const bs = [...$('userPop').querySelectorAll('button')].filter(b => !b.hidden), i = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus(); } });
  document.addEventListener('click', e => { if (!$('umenu').contains(e.target)) closeUser(); if (!$('gs').contains(e.target) && e.target !== $('gsBtn') && !$('gsBtn').contains(e.target)) gsHide(); });
  function userRender() {
    if (!isOffice()) { $('umenu').hidden = true; return; }
    $('umenu').hidden = false; $('uName').textContent = me.name; $('uAva').textContent = String(me.name || '?').trim().charAt(0).toUpperCase(); $('uPopName').textContent = me.name; $('uPopRole').textContent = me.role;
    $('umPush').hidden = KA.concat(['логіст']).indexOf(me.role) < 0 || !!me.viewAs;
    $('umViewAs').hidden = me.role !== 'адмін' || !!me.viewAs;
    $('umViewSw').hidden = $('umViewBack').hidden = !me.viewAs; $('umLogout').hidden = $('umLogoutAll').hidden = !!me.viewAs;
    if (me.role === 'адмін' && !me.viewAs && store.get('vaReopen')) { store.del('vaReopen'); setTimeout(viewAsOpen, 300); }
    $('gs').hidden = false; $('gsBtn').hidden = false;
  }

  /* ── Пошук у шапці: лише по даних дошки на пристрої + назви розділів; «Шукати в усіх рейсах…» — аркуш «Рейси» з пошуком ── */
  let gsRes = [], gsAct = -1;
  const gsNorm = s => String(s || '').toLowerCase().replace(/[\s\-]+/g, '');
  function gsFind(q) {
    const out = [], nq = gsNorm(q), lq = q.trim().toLowerCase(); if (!lq) return out;
    const has = s => s && (String(s).toLowerCase().indexOf(lq) >= 0 || (nq.length >= 3 && gsNorm(s).indexOf(nq) >= 0));
    if (!board && isOffice()) { try { const c = JSON.parse(store.get('boardCache') || 'null'); if (c && c.login === me.login) board = c.b; } catch (e) {} }
    const T = board && board.trucks ? board.trucks : [], seenT = {}, seenD = {}, seenC = {};
    T.forEach(x => { if (has(x.id) || has(x.plate) || has(x.trailer)) { seenT[x.id] = 1; out.push({ g: 'Машини', t: x.id + (x.plate ? ' · ' + x.plate : ''), s: [x.drivers.map(d => d.name).join(', '), x.trip ? tripTextP(x.trip) : 'вільна'].filter(Boolean).join(' · '), run: () => boardTruck(x.id) }); } });
    T.forEach(x => [x.trip, x.next, x.last].filter(Boolean).forEach(t => { if (t.order || seenT['r' + t.id]) return; if (has(t.id) || has(t.from) || has(t.to)) { seenT['r' + t.id] = 1; out.push({ g: 'Рейси', t: t.id + ' · ' + tripTextP(t), s: x.id + (t.load ? ' · завантаження ' + dd(t.load) : ''), run: () => openTrip(t.id, 'board') }); } }));
    T.forEach(x => x.drivers.forEach(d => { if (has(d.name) && !seenD[d.name]) { seenD[d.name] = 1; out.push({ g: 'Водії', t: d.name, s: 'машина ' + x.id, run: () => { bFilter = 'all'; store.set('bFilter', 'all'); $('bSearch').value = d.name; openBoard(); } }); } }));
    T.forEach(x => [x.trip, x.next, x.last].filter(Boolean).forEach(t => { if (t.client && has(t.client) && !seenC[t.client]) { seenC[t.client] = 1; out.push({ g: 'Клієнти', t: t.client, s: 'рейси клієнта', run: () => openSheetQ('Рейси', t.client) }); } }));
    ((board && board.waiting) || []).forEach(z => { if (has(z.id) || has(z.from) || has(z.to) || has(z.client)) out.push({ g: 'Заявки без машини', t: tripTextP(z) + (z.load ? ' · ' + dd(z.load) : ''), s: [z.id, z.client, z.status || 'нова'].filter(Boolean).join(' · '), run: () => canTrip() ? orderToTrip(z.id) : openSheetQ('Заявки', z.id) }); });   // v48
    navItems().forEach(n => { if (has(n.t)) out.push({ g: 'Розділи', t: n.t, s: n.sheet ? 'таблиця' : '', run: () => navGo(n.id) }); });
    const lim = {}; const res = out.filter(r => (lim[r.g] = (lim[r.g] || 0) + 1) <= 5);
    if (sheets.some(s => s.name === 'Рейси')) res.push({ g: '', t: 'Шукати «' + q.trim() + '» в усіх рейсах…', s: '', all: true, run: () => openSheetQ('Рейси', q.trim()) });
    return res;
  }
  const tripTextP = t => (t.from || '?') + ' → ' + (t.to || '?');
  async function openSheetQ(sheet, q) { const it = NAV.find(n => n.sheet === sheet); await openSheet({ title: it ? it.t : sheet, sheet }); if (current && current.sheet === sheet) { $('search').value = q; renderTable(); } }
  function gsDraw() {
    const q = $('gsIn').value, L = $('gsList');
    gsRes = gsFind(q); gsAct = gsRes.length ? 0 : -1;
    if (!q.trim()) { L.hidden = true; $('gsIn').setAttribute('aria-expanded', 'false'); $('gsIn').removeAttribute('aria-activedescendant'); $('gsLive').textContent = ''; return; }
    let g = null, h = '';
    gsRes.forEach((r, i) => { if (r.g !== g && r.g) h += '<div class="gs-g" role="presentation">' + esc(r.g) + (r.g === 'Машини' ? ' <span>серед поточних машин і рейсів</span>' : '') + '</div>'; g = r.g;
      h += '<div class="gs-o' + (r.all ? ' all' : '') + '" role="option" id="gso' + i + '" data-gs="' + i + '" aria-selected="' + (i === gsAct) + '"><b>' + esc(r.t) + '</b>' + (r.s ? '<small>' + esc(r.s) + '</small>' : '') + '</div>'; });
    const n = gsRes.filter(r => !r.all).length;
    L.innerHTML = (n ? '' : '<div class="gs-empty">Серед поточних машин і розділів нічого — шукайте в усіх рейсах.</div>') + h; L.hidden = false; $('gsIn').setAttribute('aria-expanded', 'true');
    if (gsAct >= 0) $('gsIn').setAttribute('aria-activedescendant', 'gso' + gsAct);
    $('gsLive').textContent = n ? 'Знайдено: ' + n : 'Нічого не знайдено';
  }
  function gsMove(d) { if (!gsRes.length) return; gsAct = (gsAct + d + gsRes.length) % gsRes.length; $('gsList').querySelectorAll('[role="option"]').forEach((o, i) => o.setAttribute('aria-selected', String(i === gsAct))); const o = $('gso' + gsAct); if (o) { o.scrollIntoView({ block: 'nearest' }); $('gsIn').setAttribute('aria-activedescendant', o.id); } }
  function gsPick(i) { const r = gsRes[i]; if (!r) return; gsHide(true); $('gsIn').value = ''; navClose(); r.run(); }
  function gsHide(keep) { $('gsList').hidden = true; $('gsIn').setAttribute('aria-expanded', 'false'); if (!keep && document.body.classList.contains('gs-open') && !$('gs').contains(document.activeElement)) document.body.classList.remove('gs-open'); }
  function gsOpen() { if (!isOffice()) return; document.body.classList.add('gs-open'); $('gsIn').focus(); if ($('gsIn').value) gsDraw(); }
  $('gsIn').addEventListener('input', gsDraw);
  $('gsIn').addEventListener('focus', () => { if ($('gsIn').value.trim()) gsDraw(); });
  $('gsIn').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if ($('gsList').hidden) gsDraw(); else gsMove(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); gsMove(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (gsAct >= 0) gsPick(gsAct); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!$('gsList').hidden && $('gsIn').value) { $('gsIn').value = ''; gsHide(true); } else { gsHide(true); document.body.classList.remove('gs-open'); $('gsIn').blur(); if (window.innerWidth < 768) $('gsBtn').focus(); } }
  });
  $('gsList').addEventListener('mousedown', e => e.preventDefault());
  $('gsList').addEventListener('click', e => { const o = e.target.closest('[data-gs]'); if (o) gsPick(+o.dataset.gs); });
  $('gsBtn').onclick = gsOpen;
  $('gsClose').onclick = () => { $('gsIn').value = ''; gsHide(true); document.body.classList.remove('gs-open'); $('gsBtn').focus(); };
  document.addEventListener('keydown', e => {
    if (!isOffice() || document.querySelector('.ask-wrap')) return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); gsOpen(); return; }
    if (e.key === '/' && !typing) { e.preventDefault(); gsOpen(); return; }
    if (e.key === 'Escape') {   // Esc: діалог (свій обробник) → бокова панель рейсу (свій) → меню ім'я / шухляда
      if (!$('userPop').hidden) { e.preventDefault(); closeUser(true); return; }
      if (navOpenNow) { e.preventDefault(); navClose(); }
    }
  });
  /** Машина з віджета чи пошуку: дошка + бокова панель (широкий екран) або пошук на дошці (телефон). */
  function boardTruck(id) {
    bFilter = 'all'; store.set('bFilter', 'all'); $('bSearch').value = ''; openBoard();
    const x = board && board.trucks.find(y => y.id === id); if (x) bPanelOpen(x, null);
  }

  /* ── Головна з віджетами (ідея власниці №9). v47 — логіст; v48 — після оцінки трьох логістів, і ті самі віджети під «Панеллю дня» керівника й адміна.
     Дошка (кеш на пристрої, оновлення кожні 5 хв, поки вкладка видима) + одна дія home.logist (кеш сервера 10 хв); кожен віджет малюється, щойно є його дані ── */
  let logRmpd = new Set(), logDups = null, homeL = null, homeLErr = '', hKind = store.get('hKind') || 'all', hOpen = {}, hHome = false, hPhoneWas = null, boardAt = 0, homeLAt = 0;
  BF.rmpd = ['RMPD не перевірено', x => logRmpd.has(x.id)];
  const STEP_AGE = x => { const t = x.trip; if (!t) return 0; const at = t.st && t.st.at ? new Date(t.st.at).getTime() : (t.load ? new Date(t.load + 'T08:00:00').getTime() : 0); return at ? Math.max(0, (Date.now() - at) / 36e5) : 0; };
  BF.stale = ['Немає відмітки водія > 12 год', x => x.status === 'trip' && !!x.trip && !x.trip.order && STEP_AGE(x) > 12];
  const openBoardF = k => { bFilter = k; store.set('bFilter', k); $('bSearch').value = ''; openBoard(); };
  const hPhone = () => window.innerWidth < 768;
  const hRole = () => !!me && (me.role === 'логіст' || KA.indexOf(me.role) >= 0);
  const hKindC = (type, cross) => /україн|контейнер/i.test(type || '') || /україн|контейнер|переїзд|ставка/i.test(cross || '') ? 'd' : 'i';
  const tHas = t => !!(t && (t.type || t.cross));
  const tKind = x => { const t = [x.trip, x.next, x.last].find(tHas); if (t) return hKindC(t.type, t.cross); const r = homeL && homeL.cal && homeL.cal.rows.find(y => y.id === x.id); return r ? r.kind : 'i'; };
  const kWant = () => hKind === 'intl' ? 'i' : 'd';
  const kOk = x => hKind === 'all' || tKind(x) === kWant();
  // «Потребує дії»: фільтр лише там, де тип рейсу відомий; машину без жодного рейсу з типом — не ховаємо
  const kAct = x => hKind === 'all' || ![x.trip, x.next, x.last].some(tHas) || kOk(x);
  const kOrd = z => hKind === 'all' || !tHas(z) || hKindC(z.type, z.cross) === kWant();
  const hNum = v => v == null ? '—' : Number(v).toLocaleString('uk-UA', { maximumFractionDigits: 1 });
  const pad2 = n => String(n).padStart(2, '0');
  const isoDay = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  const DOWS = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const rmpdCalc = b => { const after = ['кордон пройдено', 'розмитнення', 'на розвантаженні', 'розвантажено'];
    const cand = b.trucks.filter(x => x.status === 'trip' && x.trip && !x.trip.order && !(x.trip.st && after.indexOf(x.trip.st.event) >= 0) && !/україн/i.test(x.trip.cross || '') && !/україн/i.test(x.trip.type || ''));
    logRmpd = new Set(cand.filter(x => x.trip.rmpd && x.trip.rmpd !== 'ok').map(x => x.id)); };
  const hLive = (nav, login) => () => nav === navSeq && !$('home').hidden && me && me.login === login && hRole();
  function hBoardFetch(force, live) {
    const login = me.login;
    return api('board', force ? { force: true } : {}).then(b => { board = b; boardAt = Date.now(); try { store.set('boardCache', JSON.stringify({ login, b, at: boardAt })); } catch (e) {} rmpdCalc(b); navBadges(); if (live()) logDraw(); })
      .catch(e => { if (live() && !board) { homeLErr = homeLErr || e.message; logDraw(); } else if (live() && force) toast(esc(e.message), 'err'); });
  }
  function hHomeFetch(force, live) {
    const login = me.login;
    return api('home.logist', force ? { force: true } : {}).then(h => { homeL = h; homeLErr = ''; homeLAt = Date.now(); try { store.set('homeL_' + login, JSON.stringify(h)); } catch (e) {} if (live()) logDraw(); })
      .catch(e => { homeLErr = e.message; if (live()) logDraw(); });
  }
  async function logLoad(force) {
    const nav = navSeq, login = me.login; hHome = true;
    if (!board) { try { const c = JSON.parse(store.get('boardCache') || 'null'); if (c && c.login === login) { board = c.b; boardAt = c.at || 0; } } catch (e) {} }
    if (board) rmpdCalc(board);
    if (!homeL) { try { const c = JSON.parse(store.get('homeL_' + login) || 'null'); if (c) homeL = c; } catch (e) {} }
    logDraw();
    const live = hLive(nav, login);
    const pB = hBoardFetch(force, live);
    if (me.role === 'логіст') echWFetch(live);   // «Черги зараз» (v49)
    if (me.role === 'логіст') api('dups').then(dp => { if (dp && dp.list) { dups = dp.list; dupsAt = Date.now(); logDups = dups.length; if (live()) logDraw(); } }).catch(() => {});
    hHomeFetch(force, live);
    return pB;
  }
  // «Оновлено N хв тому» і автооновлення дошки раз на 5 хв, поки головна відкрита й вкладка видима (home.logist — раз на 10 хв, з кешу сервера)
  const hAgo = () => { if (!boardAt) return 'дошка зі збереженої копії'; const m = Math.floor((Date.now() - boardAt) / 60000); return 'оновлено ' + (m < 1 ? 'щойно' : m + ' хв тому'); };
  function hTick() {
    if (!hHome || !hRole() || $('home').hidden || document.hidden || !$('hAgo')) return;
    $('hAgo').textContent = hAgo();
    const live = hLive(navSeq, me.login);
    if (Date.now() - boardAt >= 5 * 60000) hBoardFetch(false, live);
    if (Date.now() - homeLAt >= 10 * 60000) hHomeFetch(false, live);
    if (KA.indexOf(me.role) >= 0 && Date.now() - boss2At >= 10 * 60000) { boss2At = Date.now(); bossLoad(); }   // v51: home.boss2 — кеш сервера 5 хв
    if (me.role === 'логіст' && Date.now() - echWAt >= 5 * 60000) echWFetch(live);
  }
  setInterval(hTick, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(hTick, 300); });

  const hSk = n => '<div class="hsk" aria-hidden="true">' + '<i></i>'.repeat(n || 3) + '</div><p class="sr">Завантаження…</p>';
  /* v50 (П2, дизайн v0.4): у кожного віджета — коротка і розгорнута версія. За замовчуванням коротко; стан кожного віджета —
     у localStorage (lcorp.w.<сторінка>.<віджет>, через store — у try/catch); «Згорнути все / Розгорнути все» над сіткою.
     Розгорнута = як було у v49; критичне червоне видно і в короткій. */
  const wPage = () => me && me.role === 'логіст' ? 'logist' : 'boss';
  const wKey = k => 'lcorp.w.' + wPage() + '.' + k;
  const wMem = {};   // сховище недоступне (приватне вікно) — стан живе до перезавантаження сторінки
  const wOpen = k => { const v = wKey(k) in wMem ? wMem[wKey(k)] : store.get(wKey(k)); return v === '1' ? true : v === '0' ? false : store.get('lcorp.w.default') === 'open'; };
  const wSet = (k, on) => { wMem[wKey(k)] = on ? '1' : '0'; store.set(wKey(k), on ? '1' : '0'); };
  const W_CHEV = '<svg class="nav-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  /** Оболонка віджета: o.short — коротка версія (без неї коротка = скелет / повідомлення); o.scls — ширина в сітці, коли коротко. */
  function hw(key, title, body, o) {
    o = o || {}; if (hwRaw) return { key, title, body, meta: o.meta || '' };   // v51: розгортка на головній логіста — лише розгорнутий вміст
    const open = wOpen(key), sh = o.short != null ? o.short : body, lab = (open ? 'Згорнути' : 'Розгорнути');
    return '<section class="hw ' + (o.cls || '') + (open ? ' is-open' : ' is-short ' + (o.scls || '')) + '" id="hw-' + key + '" data-w="' + key + '" aria-labelledby="hwt-' + key + '">' +
      '<div class="hw-h"><h2 id="hwt-' + key + '"><button type="button" class="hw-ttl" data-wtg="' + key + '" aria-expanded="' + open + '" aria-controls="hwb-' + key + '" title="' + lab + '">' + esc(title) + '</button></h2>' +
      ((open || o.smeta == null ? o.meta : o.smeta) ? '<span class="hw-meta">' + (open || o.smeta == null ? o.meta : o.smeta) + '</span>' : '') + (o.act && open ? o.act : '') +
      '<button type="button" class="hw-wt" data-wtt="' + key + '" aria-expanded="' + open + '" aria-controls="hwb-' + key + '" aria-label="' + lab + ': ' + esc(title) + '"><span class="hw-wtl">' + lab + '</span>' + W_CHEV + '</button></div>' +
      '<div class="hw-b" id="hwb-' + key + '">' + (open ? body : sh) + '</div></section>';
  }
  /** Міні-графік: 8 повних тижнів + (необов'язково) поточний неповний — порожнистою точкою. Значення — при наведенні на точку (title),
   *  при фокусі графіка — підписи першого, найбільшого й останнього; повний ряд — у aria-label для читача екрана. */
  function spark(vals, label, unit, weeks, partial) {
    const v = vals.map(x => x == null ? null : +x), ok = v.filter(x => x != null); if (ok.length < 2) return '';
    const W = 156, H = 46, P = 5, T = 12, mx = Math.max.apply(null, ok), mn = Math.min(0, Math.min.apply(null, ok)), rg = mx - mn || 1;
    const X = i => P + i * (W - 2 * P) / (v.length - 1), Y = x => H - P - (x - mn) / rg * (H - P - T);
    const pts = v.map((x, i) => x == null ? null : { i, x, px: X(i), py: Y(x) }).filter(Boolean), full = partial ? pts.slice(0, -1) : pts;
    const f1 = n => n.toFixed(1), wl = i => weeks && weeks[i] ? 'тиждень з ' + dd(weeks[i]) + (partial && i === v.length - 1 ? ' (поки)' : '') : '';
    const line = full.map((p, k) => (k ? 'L' : 'M') + f1(p.px) + ' ' + f1(p.py)).join(' '), last = pts[pts.length - 1], pre = full[full.length - 1];
    const area = line + ' L' + f1(pre.px) + ' ' + (H - P) + ' L' + f1(full[0].px) + ' ' + (H - P) + ' Z';
    const iMax = full.reduce((m, p) => p.x > m.x ? p : m, full[0]);
    const lab = (p, cls) => '<text class="sp-v ' + (cls || '') + '" x="' + f1(Math.min(W - 2, Math.max(2, p.px))) + '" y="' + f1(Math.max(9, p.py - 5)) + '" text-anchor="' + (p.px < 20 ? 'start' : p.px > W - 20 ? 'end' : 'middle') + '">' + esc(hNum(p.x)) + '</text>';
    const txt = label + ' за тижнями: ' + pts.map(p => (wl(p.i) || '') + ' — ' + hNum(p.x) + (unit || '')).join('; ');
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" tabindex="0" role="img" aria-label="' + esc(txt) + '"><path class="sp-a" d="' + area + '"/><path class="sp-l" d="' + line + '"/>' +
      (partial ? '<path class="sp-d" d="M' + f1(pre.px) + ' ' + f1(pre.py) + ' L' + f1(last.px) + ' ' + f1(last.py) + '"/>' : '') +
      pts.map(p => '<g class="sp-pt"><circle class="sp-hit" cx="' + f1(p.px) + '" cy="' + f1(p.py) + '" r="7"/><circle class="' + (partial && p === last ? 'sp-now' : 'sp-p') + '" cx="' + f1(p.px) + '" cy="' + f1(p.py) + '" r="' + (p === pre || p === last ? 3 : 2) + '"/><title>' + esc((wl(p.i) ? wl(p.i) + ': ' : '') + hNum(p.x) + (unit || '')) + '</title>' + lab(p, 'pt') + '</g>').join('') +
      '<g class="sp-fl">' + [full[0], iMax, pre].filter((p, k, a) => a.indexOf(p) === k).map(p => lab(p)).join('') + '</g></svg>';
  }
  const hDelta = (a, b, unit, pp, what) => { if (a == null || b == null) return ''; const d = Math.round((a - b) * 10) / 10;
    return '<span class="wm-d">' + (d === 0 ? '= як ' + (what || 'минулого') : (d > 0 ? '↑ ' : '↓ ') + hNum(Math.abs(d)) + (pp ? ' п.п.' : unit || '') + ' <span>до ' + (what || 'минулого') + '</span>') + '</span>'; };

  // 1. Потребує дії (логіст): на телефоні — компактні чипи «число + 2–3 слова», видно щонайменше три
  function hwAct() {
    if (!board) return hw('act', 'Потребує дії', hSk(3), { cls: 'hw-act lpnl s12' });
    const T = board.trucks.filter(kAct), ids = l => l.slice(0, 5).map(x => x.id).join(', ') + (l.length > 5 ? ' і ще ' + (l.length - 5) : '');
    const drvN = T.reduce((a, x) => a + x.problems.filter(p => p.k === 'drv' && p.urgent).length, 0), drvW = T.reduce((a, x) => a + x.problems.filter(p => p.k === 'drv' && !p.urgent).length, 0);
    const urgT = T.filter(bUrg), nounl = T.filter(bNoUnl), addr = T.filter(x => x.problems.some(p => p.k === 'addr')), stale = T.filter(BF.stale[1]), rm = [...logRmpd].filter(id => T.some(x => x.id === id));
    const chip = (n, lvl, label, short, sub, act) => n ? '<button type="button" class="prow hchip p-' + lvl + '" data-lact="' + act + '" title="' + esc(label + (sub ? ' — ' + sub : '')) + '"><span class="pn">' + n + '</span><span class="hc-tx"><b class="hc-l">' + esc(label) + '</b><b class="hc-s" aria-hidden="true">' + esc(short) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span></button>' : '';
    const chips = [
      chip(drvN + drvW, drvN ? 'bad' : 'mute', 'Проблеми водіїв', drvN ? 'Проблеми' : 'В роботі', drvN + ' ' + plural(drvN, 'нова', 'нові', 'нових') + ' · ' + drvW + ' в роботі', 'drv'),
      chip(urgT.length, 'bad', 'Термінове на дошці', 'Термінове', ids(urgT), 'urg'),
      chip(rm.length, 'warn', 'RMPD перед кордоном не перевірено', 'RMPD', rm.slice(0, 5).join(', '), 'rmpd'),
      chip(stale.length, 'warn', 'Давно немає відмітки водія', 'Без відмітки', 'понад 12 год у рейсі: ' + ids(stale), 'stale'),
      chip(addr.length, 'warn', 'Рейси без адрес для водія', 'Без адрес', ids(addr), 'addr'),
      chip(nounl.length, 'warn', 'Без дати розвантаження', 'Без дати розв.', 'через це «Звільняються» і простій неточні', 'nounl'),
      chip(logDups, 'warn', 'Можливі дублі рейсів', 'Дублі', 'та сама машина, дата і «Звідки»', 'dups')].join('');
    // коротко: 3 найважливіші пункти рядками (червоні — першими) + «ще: …» одним рядком
    const L = [[drvN + drvW, drvN ? 'bad' : 'mute', 'Проблеми водіїв', 'проблеми водіїв', drvN + ' ' + plural(drvN, 'нова', 'нові', 'нових') + ' · ' + drvW + ' в роботі', 'drv'], [urgT.length, 'bad', 'Термінове на дошці', 'термінове', ids(urgT), 'urg'],
      [stale.length, stale.some(x => STEP_AGE(x) > 24) ? 'bad' : 'warn', 'Без кроку водія > 12 год', 'без кроку', ids(stale), 'stale'], [rm.length, 'warn', 'RMPD не перевірено', 'RMPD', rm.slice(0, 5).join(', '), 'rmpd'],
      [addr.length, 'warn', 'Без адрес для водія', 'без адрес', ids(addr), 'addr'], [nounl.length, 'warn', 'Без дати розвантаження', 'без дати', ids(nounl), 'nounl'], [logDups || 0, 'warn', 'Можливі дублі', 'можливі дублі', '', 'dups']].filter(r => r[0]);
    L.sort((a, b) => (a[1] === 'bad' ? 0 : 1) - (b[1] === 'bad' ? 0 : 1));
    const top = L.slice(0, 3), rest = L.slice(3), tot = L.reduce((a, r) => a + r[0], 0);
    const short = L.length ? '<ul class="hs-act">' + top.map(r => '<li><button type="button" class="prow hs-r p-' + r[1] + '" data-lact="' + r[5] + '"><span class="pn tnum">' + r[0] + '</span><b>' + esc(r[2]) + '</b><small>' + esc(r[4]) + '</small></button></li>').join('') + '</ul>' +
      (rest.length ? '<p class="hs-more">ще: ' + rest.map(r => '<button type="button" class="linkbtn" data-lact="' + r[5] + '"><b class="tnum">' + r[0] + '</b> ' + esc(r[3]) + '</button>').join(' · ') + '</p>' : '') : '<p class="hcalm">' + svgI(ST_ICO.ok) + ' Термінового немає</p>';
    return hw('act', 'Потребує дії', chips ? '<div class="hchips">' + chips + '</div>' : '<p class="hcalm">' + svgI(ST_ICO.ok) + ' Термінового немає</p>', { cls: 'hw-act lpnl s12', scls: 'ss6', short, meta: tot ? '<b class="tnum">' + L.length + '</b>' : '' });
  }
  // 2. Звільняються за 72 год + прогрес дня. На < 1440 — на всю ширину
  function hwFree() {
    if (!board) return hw('free', 'Звільняються за 72 год', hSk(3), { cls: 's7 w14 o2' });
    const today = new Date(new Date().toDateString()), di = s => s ? Math.round((new Date(s + 'T00:00:00') - today) / 864e5) : null, todayS = isoDay(today);
    const T = board.trucks.filter(kOk), cols = [[], [], []];
    T.forEach(x => { if (x.status !== 'trip' || !x.trip || x.trip.order) return; let d = di(x.trip.unload); if (x.trip.st && x.trip.st.event === 'розвантажено') d = 0; if (d == null || d > 2) return; cols[Math.max(0, d)].push(x); });
    const nUnl = T.filter(bNoUnl).length, n = cols[0].length + cols[1].length + cols[2].length;
    // прогрес дня: розвантажено сьогодні з запланованих на сьогодні
    const plan = T.filter(x => (x.trip && !x.trip.order && x.trip.unload === todayS) || (x.status !== 'trip' && x.last && x.last.unload === todayS));
    const done = plan.filter(x => x.status !== 'trip' || (x.trip.st && x.trip.st.event === 'розвантажено'));
    const prog = plan.length ? '<div class="dprog"><div class="dprog-t">Сьогодні розвантажено <b class="tnum">' + done.length + ' з ' + plan.length + '</b> ' + plural(plan.length, 'запланованого', 'запланованих', 'запланованих') + '</div><div class="pprog" role="progressbar" aria-label="Розвантажено сьогодні" aria-valuemin="0" aria-valuemax="' + plan.length + '" aria-valuenow="' + done.length + '"><span style="width:' + Math.round(done.length / plan.length * 100) + '%"></span></div></div>'
      : '<div class="dprog"><div class="dprog-t muted">Сьогодні розвантажень за датами немає</div></div>';
    const item = (x, d) => { const nx = x.next, alarm = !nx && d <= 1, dr = x.drive;
      const can = dr && dr.canNow ? 'водій може їхати зараз' : dr && dr.canAt && dr.canAt > Date.now() ? 'може їхати з ' + tkTime(new Date(dr.canAt).toISOString()) : '';
      const nxT = nx ? 'Далі: ' + dd(nx.load) + ' ' + (nx.from || '?') + ' → ' + (nx.to || '?') + (nx.order ? ' (заявка)' : '') : 'Немає наступного рейсу чи заявки' + (alarm ? ' — звільняється до 48 год' : '');
      return '<li><button type="button" class="fr-it' + (alarm ? ' bad' : !nx ? ' warn' : '') + '" data-htruck="' + esc(x.id) + '" title="' + esc(x.id + ' → ' + (x.trip.to || '?') + ' · ' + nxT) + '"><span class="fr-1"><span class="plate ua">' + esc(x.id) + '</span><span class="fr-to">' + esc(x.trip.to || '?') + '</span></span>' +
        (can ? '<small>' + esc(can) + '</small>' : '') + '<small class="fr-nx">' + (nx ? svgI(ST_ICO.ok) + '<span>далі ' + dd(nx.load) + ' ' + esc(nx.from || '?') + '</span>' : svgI(PROB.drv) + '<span>немає далі</span><span class="sr"> — ' + esc(nxT) + '</span>') + '</small></button></li>'; };
    const lab = ['Сьогодні', 'Завтра', 'Післязавтра'];
    const W = (board.waiting || []).filter(kOrd), Q = board.queue || [];
    const body = prog + '<div class="fr-cols">' + cols.map((l, i) => { const d = new Date(today); d.setDate(d.getDate() + i);
      return '<div class="fr-col' + (l.length ? '' : ' empty') + '"><div class="fr-h"><b>' + lab[i] + '</b><span>' + DOWS[d.getDay()] + ' ' + dd(isoDay(d)) + '</span><span class="fr-n tnum">' + l.length + '</span></div>' + (l.length ? '<ul class="fr-l">' + l.map(x => item(x, i)).join('') + '</ul>' : '<p class="fr-none">—</p>') + '</div>'; }).join('') + '</div>' +
      '<div class="fr-foot"><button type="button" class="hcount" data-hgo="wait"><b class="tnum">' + W.length + '</b> ' + plural(W.length, 'заявка', 'заявки', 'заявок') + ' без машини</button>' +
      '<button type="button" class="hcount" data-hgo="queue"><b class="tnum">' + Q.length + '</b> ' + plural(Q.length, 'причіп', 'причепи', 'причепів') + ' у черзі' + (Q.some(z => z.waitDays) ? ' <small>найдовше ' + Math.max.apply(null, Q.map(z => z.waitDays || 0)) + ' дн</small>' : '') + '</button></div>' +
      (nUnl ? '<p class="hnote">' + svgI(PROB.trip) + '<span>Ще ' + nUnl + ' ' + plural(nUnl, 'машина', 'машини', 'машин') + ' в рейсі без дати розвантаження — тут їх не видно. <button type="button" class="link" data-lact="nounl">Поставити дати</button></span></p>' : '');
    const noNx = cols.reduce((a, l) => a + l.filter(x => !x.next).length, 0);
    const short = '<p class="hs-line"><b class="tnum">' + n + '</b> ' + plural(n, 'машина', 'машини', 'машин') + (noNx ? ' <span class="hs-bad"><b class="tnum">' + noNx + '</b> без наступного рейсу</span>' : '') + '</p>' +
      '<div class="hs-days">' + cols.map((l, i) => { const d = new Date(today); d.setDate(d.getDate() + i); const nn = l.filter(x => !x.next).length;
        return '<div class="hs-day"><span>' + (i === 0 ? 'сьогодні' : i === 1 ? 'завтра' : DOWS[d.getDay()] + ' ' + dd(isoDay(d))) + '</span><b class="tnum">' + l.length + '</b>' + (nn ? '<small class="hs-bad">' + nn + ' без далі</small>' : '') + '</div>'; }).join('') + '</div>' +
      (W.length ? '<button type="button" class="link" data-hgo="wait">' + W.length + ' ' + plural(W.length, 'заявка', 'заявки', 'заявок') + ' без машини</button>' : '');
    return hw('free', 'Звільняються за 72 год', body, { cls: 's7 w14 o2', scls: 'ss3', short, meta: n ? n + ' ' + plural(n, 'машина', 'машини', 'машин') : 'нікого за датами', smeta: '' });
  }
  // 3. Конвеєр рейсів. Машина, що сьогодні (чи пізніше) завантажується без жодного кроку водія, — «Чекаємо крок», а не «в дорозі»
  const CV = [['Чекаємо крок', []], ['На завантаженні', ['на завантаженні']], ['Завантажено', ['завантажено']], ['Митниця й кордон', ['замитнення', 'на кордоні', 'розмитнення']], ['В дорозі', ['кордон пройдено', '']], ['Розвантаження', ['на розвантаженні']], ['Вільні', ['розвантажено']]];
  function hwConv() {
    if (!board) return hw('conv', 'Конвеєр рейсів', hSk(2), { cls: 's12 o4' });
    const T = board.trucks.filter(kOk), st = CV.map(() => []), todayS = isoDay(new Date()), FREE = CV.length - 1;
    T.forEach(x => { if (x.status === 'trip' && x.trip && !x.trip.order) { const ev = (x.trip.st && x.trip.st.event) || ''; let i = ev ? CV.findIndex(c => c[1].indexOf(ev) >= 0) : (x.trip.load && x.trip.load >= todayS ? 0 : 4); if (i < 0) i = 4; st[i].push(x); } else st[FREE].push(x); });
    const moving = T.length - st[FREE].length;
    const chip = (x, i) => { if (i === FREE) return '<button type="button" class="cv-c free" data-htruck="' + esc(x.id) + '" title="' + esc(x.id + ' · ' + (x.status === 'free' ? 'вільна з ' + dd(x.since) : 'немає рейсів')) + '">' + esc(x.id) + '</button>';
      if (i === 0) return '<button type="button" class="cv-c nost" data-htruck="' + esc(x.id) + '" title="' + esc(x.id + ' · завантаження ' + dd(x.trip.load) + ' · ' + tripTextP(x.trip) + ' · чекаємо першого кроку водія') + '">' + esc(x.id) + '</button>';
      const h = STEP_AGE(x), noSt = !(x.trip.st && x.trip.st.at), lvl = h > 24 ? 'bad' : h > 12 ? 'warn' : '';
      const tip = x.id + ' · ' + tripTextP(x.trip) + ' · ' + (noSt ? 'водій ще нічого не відмічав' : cap(x.trip.st.event) + ' ' + Math.round(h) + ' год тому');
      return '<button type="button" class="cv-c' + (lvl ? ' ' + lvl : '') + (noSt ? ' nost' : '') + '" data-htruck="' + esc(x.id) + '" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">' + esc(x.id) + (lvl ? '<span class="sr"> (' + (lvl === 'bad' ? 'понад добу без відмітки' : 'понад 12 год без відмітки') + ')</span>' : '') + '</button>'; };
    const lim = i => i === FREE ? 10 : 12;
    const bar = '<div class="cv-bar" aria-hidden="true">' + st.map((l, i) => l.length ? '<span class="cv-s' + i + '" style="flex:' + l.length + '"></span>' : '').join('') + '</div>';
    const body = bar + '<ol class="cv">' + st.map((l, i) => '<li class="cv-st' + (i === FREE ? ' cv-free' : '') + (l.length ? '' : ' zero') + '"><div class="cv-h"><span class="cv-n tnum">' + l.length + '</span><span class="cv-t">' + CV[i][0] + '</span></div><div class="cv-cs">' + l.slice(0, lim(i)).map(x => chip(x, i)).join('') + (l.length > lim(i) ? '<span class="cv-more">+' + (l.length - lim(i)) + '</span>' : '') + '</div></li>').join('') + '</ol>' +
      '<p class="hleg"><span class="lg-c warn"></span>крок не оновлювався &gt; 12 год <span class="lg-c bad"></span>&gt; 24 год <span class="lg-c nost"></span>водій ще нічого не відмічав · натисніть машину — рейс збоку</p>';
    const stuck = st.slice(1, FREE).flatMap((l, k) => l.map(x => [x, k + 1])).filter(([x]) => STEP_AGE(x) > 12).sort((a, b) => STEP_AGE(b[0]) - STEP_AGE(a[0]));
    const short = bar + '<p class="hs-cv">' + st.map((l, i) => '<span' + (l.length ? '' : ' class="zero"') + '><b class="tnum">' + l.length + '</b> ' + esc(CV[i][0].toLowerCase()) + '</span>').join('') + '</p>' +
      (stuck.length ? '<div class="cv-cs hs-stuck">' + stuck.slice(0, 8).map(([x, i]) => chip(x, i)).join('') + (stuck.length > 8 ? '<span class="cv-more">+' + (stuck.length - 8) + '</span>' : '') + '<small class="muted">без кроку водія &gt; 12 год</small></div>' : '');
    return hw('conv', 'Конвеєр рейсів', body, { cls: 's12 o4', short, meta: 'у русі <b class="tnum">' + moving + '</b> з ' + T.length });
  }
  const hKey = () => hKind === 'intl' ? 'intl' : hKind === 'dom' ? 'dom' : 'all';
  const frTxt = fr => { const k = Object.keys(fr || {}).sort((a, b) => fr[b] - fr[a]); return k.length ? k.map(c => hNum(Math.round(fr[c])) + ' ' + c).join(' + ') : 'фрахту немає'; };
  // 4. Тиждень у цифрах. У понеділок і вівторок (поточний тиждень < 2 повних днів) головні числа — минулий повний тиждень
  function hwWeek() {
    const cls = (hKind === 'dom' || !hShowBorder() ? 's12' : 's7') + ' o3';
    if (!homeL) return hw('week', 'Тиждень у цифрах', homeLErr ? '<p class="msg small">' + esc(homeLErr) + '</p>' : hSk(4), { cls });
    const K = homeL.kinds[hKey()], W = K.weeks, wk = W.map(w => w.from), lastMode = homeL.dow <= 2;
    const c = lastMode ? W[W.length - 2] : K.toDate.cur, p = lastMode ? W[W.length - 3] : K.toDate.prev, cmp = lastMode ? 'позаминулого' : 'минулого';
    const ser = f => lastMode ? W.slice(0, -1).map(f) : W.map(f), wks = lastMode ? wk.slice(0, -1) : wk;
    const m = (label, v, pv, series, unit, note, big) => '<div class="wm' + (big ? ' wm-big' : '') + '"><div class="wm-l">' + label + '</div><div class="wm-v tnum">' + v + '</div>' + (pv || '') + (series ? spark(series, label, unit, wks, !lastMode) : '') + (note ? '<div class="wm-n">' + note + '</div>' : '') + '</div>';
    const frK = Object.keys(c.fr).concat(Object.keys(p.fr)).filter((x, i, a) => a.indexOf(x) === i).sort((a, b) => (c.fr[b] || 0) - (c.fr[a] || 0));
    const frBody = frK.length ? frK.map(k => '<div class="wm-fr"><b class="tnum">' + hNum(Math.round(c.fr[k] || 0)) + '</b> ' + k + ' <small>було ' + hNum(Math.round(p.fr[k] || 0)) + '</small></div>').join('') : '<div class="wm-v tnum">—</div><div class="wm-n">фрахту немає</div>';
    const cur = K.toDate.cur;
    const sub = lastMode ? '<p class="wk-cur">Цей тиждень поки (' + (homeL.dow === 1 ? 'сьогодні' : 'пн–вт') + '): <b class="tnum">' + cur.unl + '</b> ' + plural(cur.unl, 'розвантаження', 'розвантаження', 'розвантажень') + ' · <b class="tnum">' + cur.load + '</b> ' + plural(cur.load, 'завантаження', 'завантаження', 'завантажень') + ' · <b class="tnum">' + hNum(cur.km) + '</b> км</p>' : '';
    const body = sub + '<div class="wms">' +
      m('Розвантажень', hNum(c.unl), hDelta(c.unl, p.unl, '', false, cmp), ser(w => w.unl), '', '', true) +
      m('Завантажень', hNum(c.load), hDelta(c.load, p.load, '', false, cmp), ser(w => w.load)) +
      m('Км', hNum(c.km), hDelta(c.km, p.km, ' км', false, cmp), ser(w => w.km), ' км', c.unl && c.kmTrips < c.unl ? 'км відомі для ' + c.kmTrips + ' з ' + c.unl : '') +
      (lastMode ? m('Рейсів на машину', hNum(c.perTruck), hDelta(c.perTruck, p.perTruck, '', false, cmp), W.slice(0, -1).map(w => w.perTruck)) : '') +
      '<div class="wm wm-frw"><div class="wm-l">Фрахт розвантажених <small>за валютами, без курсу</small></div>' + frBody + '</div></div>' +
      (homeL.mine && me.role === 'логіст' ? '<p class="wk-mine">' + svgI(ST_ICO.ok) + '<span>Ви завели в програмі <b>' + homeL.mine.cur + '</b> ' + plural(homeL.mine.cur, 'рейс', 'рейси', 'рейсів') + ' цього тижня' + (homeL.mine.prev ? ' (минулого на цей день — ' + homeL.mine.prev + ')' : '') + '</span></p>' : '');
    const lw = W[W.length - 2], sun = new Date(lw.from + 'T00:00:00'); sun.setDate(sun.getDate() + 6);
    const sm = (l, v, d) => '<span class="hs-m">' + l + ' <b class="tnum">' + v + '</b> ' + d + '</span>';
    const short = '<p class="hs-ms">' + sm('Розвантажень', hNum(c.unl), hDelta(c.unl, p.unl, '', false, cmp)) + sm('Завантажень', hNum(c.load), hDelta(c.load, p.load, '', false, cmp)) + sm('Км', hNum(c.km), hDelta(c.km, p.km, '', false, cmp)) +
      (lastMode ? sm('Рейсів на машину', hNum(c.perTruck), hDelta(c.perTruck, p.perTruck, '', false, cmp)) : '') + '</p><p class="hs-line">Фрахт <b class="tnum">' + esc(frTxt(c.fr)) + '</b></p>';
    return hw('week', lastMode ? 'Минулий тиждень у цифрах' : 'Тиждень у цифрах', body, { cls, scls: 'ss8', short, smeta: lastMode ? dd(lw.from) + ' – ' + dd(isoDay(sun)) : 'з пн ' + dd(homeL.weekStart), meta: lastMode ? dd(lw.from) + ' – ' + dd(isoDay(sun)) + ' · порівняння з позаминулим тижнем' : 'пн ' + dd(homeL.weekStart) + ' – сьогодні · порівняння з тими ж днями минулого тижня' });
  }
  // 5. Завантаженість парку
  function hwUtil() {
    if (!homeL) return hw('util', 'Завантаженість парку', homeLErr ? '<p class="msg small">' + esc(homeLErr) + '</p>' : hSk(3), { cls: 's5 w14 o5' });
    const K = homeL.kinds[hKey()], c = K.toDate.cur, p = K.toDate.prev, W = K.weeks;
    const seg = (n, cls, l) => n ? '<span class="ut-' + cls + '" style="flex:' + n + '" title="' + esc(l + ': ' + n) + '"></span>' : '';
    const T = board ? board.trucks.filter(kOk) : [], fr = T.filter(x => x.status === 'free'), real = fr.filter(x => daysFrom(x.since) <= 14), chk = hCheckList(T);
    const md = real.reduce((a, x) => a + Math.max(0, daysFrom(x.since)), 0);
    const body = '<div class="ut-top"><div><div class="ut-big tnum">' + (c.util == null ? '—' : c.util + '<small>%</small>') + '</div><div class="ut-sub">машино-днів у рейсі цього тижня' + (c.util != null && p.util != null ? '<br>' + hDelta(c.util, p.util, '', true) : '') + '</div></div>' + spark(W.map(w => w.util), 'Завантаженість', '%', W.map(w => w.from), true) + '</div>' +
      '<div class="ut-bar" role="img" aria-label="' + esc('Машино-дні цього тижня: у рейсі ' + c.trip + ', у рейсі без дати розвантаження ' + c.nodata + ', простій ' + c.idle + ', перевірити ' + c.check) + '">' + seg(c.trip, 'trip', 'у рейсі') + seg(c.nodata, 'nod', 'у рейсі, без дати розвантаження') + seg(c.idle, 'idle', 'простій') + seg(c.check, 'chk', 'перевірити') + '</div>' +
      '<div class="plgs ut-lg"><span class="plg"><i class="ut-trip"></i>у рейсі <b>' + c.trip + '</b></span>' + (c.nodata ? '<span class="plg"><i class="ut-nod"></i>у рейсі без дати розвант. <b>' + c.nodata + '</b></span>' : '') + '<span class="plg"><i class="ut-idle"></i>простій <b>' + c.idle + '</b></span>' + (c.check ? '<span class="plg"><i class="ut-chk"></i>перевірити <b>' + c.check + '</b> <small>простій &gt; 14 дн</small></span>' : '') + '</div>' +
      (board ? '<div class="ut-rows"><button type="button" class="hrow" data-lact="free"><span>Стоять зараз: <b>' + real.length + ' ' + plural(real.length, 'машина', 'машини', 'машин') + '</b>' + (real.length ? ', разом ' + md + ' машино-' + plural(md, 'день', 'дні', 'днів') : '') + '</span><span class="hgo" aria-hidden="true">›</span></button>' +
        (chk.length ? hCheckRow(chk) : '') + '</div>' : '');
    const short = '<div class="ut-top"><div class="ut-big tnum">' + (c.util == null ? '—' : c.util + '<small>%</small>') + '</div><div class="ut-sub">цей тиждень' + (c.util != null && p.util != null ? '<br>' + hDelta(c.util, p.util, '', true) : '') + '</div></div>' +
      '<div class="ut-bar" aria-hidden="true">' + seg(c.trip, 'trip', 'у рейсі') + seg(c.nodata, 'nod', 'у рейсі, без дати розвантаження') + seg(c.idle, 'idle', 'простій') + seg(c.check, 'chk', 'перевірити') + '</div>' +
      '<div class="plgs ut-lg"><span class="plg"><i class="ut-trip"></i>у рейсі <b>' + c.trip + '</b></span><span class="plg"><i class="ut-idle"></i>простій <b>' + c.idle + '</b></span>' + (board ? '<span class="plg">вільні зараз <b>' + real.length + '</b></span>' : '') + '</div>';
    return hw('util', 'Завантаженість парку', body, { cls: 's5 w14 o5', scls: 'ss3', short, smeta: '', sum: c.util == null ? '' : c.util + '% цього тижня', meta: K.trucks + ' ' + plural(K.trucks, 'машина', 'машини', 'машин') });
  }
  /** «Перевірити, чи внесено рейс» — однаково в логіста й керівника: вільна понад 14 днів або без жодного рейсу. */
  const hCheckList = T => T.filter(x => (x.status === 'free' && daysFrom(x.since) > 14) || x.status === 'none');
  const hCheckRow = chk => '<button type="button" class="hrow hchk" data-lact="idle"><span>' + svgI(PROB.trip) + 'Перевірити, чи внесено рейс: <b>' + chk.map(x => esc(x.id)).slice(0, 6).join(', ') + (chk.length > 6 ? '…' : '') + '</b><small>«простій» понад 14 днів — найчастіше рейс просто не внесли</small></span><span class="hgo" aria-hidden="true">›</span></button>';
  // 6. Календар парку −7…+7. Після сьогодні в машини в рейсі без дати розвантаження — «невідомо», не «вільно»
  function hwCal() {
    if (!homeL) return hw('cal', 'Календар парку', homeLErr ? '<p class="msg small">' + esc(homeLErr) + '</p>' : hSk(5), { cls: 's12 o6' });
    const C = homeL.cal, N = C.days, rows = C.rows.filter(r => hKind === 'all' || r.kind === kWant());
    const d0 = new Date(C.from + 'T00:00:00'), day = i => { const d = new Date(d0); d.setDate(d.getDate() + i); return d; };
    const pc = i => 'calc(' + i + ' * 100% / ' + N + ')';
    let holes = 0;
    const runs = (s, ch) => { const o = []; let i = 0; while (i < s.length) { if (s[i] !== ch) { i++; continue; } let j = i; while (j < s.length && s[j] === ch) j++; o.push([i, j - 1]); i = j; } return o; };
    const head = '<div class="cal-r cal-hd" aria-hidden="true"><span class="cal-k"></span><div class="cal-t">' + Array.from({ length: N }, (_, i) => { const d = day(i), we = d.getDay() === 0 || d.getDay() === 6;
      return '<span class="cal-d' + (i === C.today ? ' now' : '') + (we ? ' we' : '') + '" style="left:' + pc(i) + ';width:' + pc(1) + '">' + DOWS[d.getDay()] + '<b>' + d.getDate() + '</b></span>'; }).join('') + '</div></div>';
    const body = rows.map(r => {
      // кілька рейсів, що перекриваються в днях (контейнеровоз: 2–3 за день), — однією смугою «N рейсів», без налізлих підписів (v48)
      const segs = []; r.segs.map(s => { const a = Math.max(0, s.a); let b = s.b == null ? (() => { let j = a; while (j + 1 < N && r.days[j + 1] === 'u') j++; return j; })() : s.b; b = Math.min(N - 1, b); return Object.assign({}, s, { ca: a, cb: b }); })
        .filter(s => s.cb >= s.ca).sort((x, y) => x.ca - y.ca || x.cb - y.cb).forEach(s => { const g = segs[segs.length - 1]; if (g && s.ca <= g.cb) { g.list.push(s); g.cb = Math.max(g.cb, s.cb); } else segs.push({ ca: s.ca, cb: s.cb, list: [s] }); });
      const bars = segs.map(g => { const s = g.list.length === 1 ? g.list[0] : Object.assign({}, g.list[0], { b: g.list.some(x => x.b == null) ? null : g.cb, t: g.list.length + ' ' + plural(g.list.length, 'рейс', 'рейси', 'рейсів') + ': ' + g.list.map(x => x.t).join('; '), id: g.list.map(x => x.id).join(', '), adr: g.list.some(x => x.adr), k: g.list.some(x => x.k === 'i') ? 'i' : 'd' });
        const a = g.ca, b = g.cb;
        const len = b - a + 1, tip = s.id + ' · ' + s.t + (s.b == null ? ' · без дати розвантаження' : '') + (s.adr ? ' · АДР' : '') + ' — натисніть: рейс збоку';
        return '<button type="button" class="cal-bar k-' + s.k + (s.b == null ? ' open' : '') + (s.adr ? ' adr' : '') + (len < 2 ? ' short' : '') + (s.a < 0 ? ' cut-l' : '') + (s.b != null && s.b > N - 1 ? ' cut-r' : '') + '" style="left:' + pc(a) + ';width:' + pc(len) + '" data-htruck="' + esc(r.id) + '" data-htripid="' + esc(s.id) + '" title="' + esc(tip) + '" aria-label="' + esc(r.id + ': ' + tip) + '">' + (len < 2 ? (g.list.length > 1 ? '<b class="cal-n">' + g.list.length + '</b>' : '') : '<span>' + esc(g.list.length > 1 ? g.list.length + ' ' + plural(g.list.length, 'рейс', 'рейси', 'рейсів') + ' · ' + g.list[0].t : s.t) + '</span>') + '</button>'; }).join('');
      const fut = runs(r.days, '_').filter(([a, b]) => a > C.today && b - a + 1 >= 3); holes += fut.length;
      const lbl = (cls, a, b, t) => '<span class="cal-gap ' + cls + '" style="left:' + pc(a) + ';width:' + pc(b - a + 1) + '">' + t + '</span>';
      const gaps = runs(r.days, '.').filter(([a, b]) => b - a + 1 >= 2).map(([a, b]) => lbl('', a, b, (b - a + 1) + ' дн')).join('') +
        runs(r.days, '?').map(([a, b]) => lbl('cq', a, b, b - a + 1 >= 4 ? 'перевірити, чи внесено рейс' : '?')).join('') +
        runs(r.days, 'n').map(([a, b]) => lbl('cn', a, b, b - a + 1 >= 4 ? 'невідомо — немає дати розвантаження' : '?')).join('') +
        fut.map(([a, b]) => '<button type="button" class="cal-hole" style="left:' + pc(a) + ';width:' + pc(b - a + 1) + '"' + (canTrip() ? ' data-hnew="' + esc(r.id) + '"' : ' disabled') + ' aria-label="' + esc(r.id + ': вільно ' + (b - a + 1) + ' дн з ' + dd(isoDay(day(a))) + (canTrip() ? ' — новий рейс' : '')) + '">вільно ' + (b - a + 1) + (b === N - 1 ? '+' : '') + ' дн</button>').join('');
      return '<div class="cal-r" role="listitem"><span class="cal-k"><span class="plate ua">' + esc(r.id) + '</span></span><div class="cal-t">' + gaps + bars + '<span class="cal-now" style="left:' + pc(C.today) + ';width:' + pc(1) + '" aria-hidden="true"></span></div></div>';
    }).join('');
    const leg = '<p class="hleg"><span class="lg-b k-i"></span>міжнародний <span class="lg-b k-d"></span>внутрішній <span class="lg-b adr"></span>АДР <span class="lg-b lg-short"></span>рейс на 1 день <span class="lg-b open"></span>без дати розвантаження <span class="lg-b cn"></span>невідомо, коли звільниться <span class="lg-b hole"></span>вільно попереду ≥ 3 дн <span class="lg-b cq"></span>перевірити, чи внесено рейс</p>';
    const fd = []; for (let i = C.today; i < Math.min(N, C.today + 8); i++) fd.push([i, rows.filter(r => '_.?'.indexOf(r.days[i]) >= 0).length]);
    const noUnl = rows.filter(r => r.days.slice(C.today + 1).indexOf('n') >= 0).map(r => r.id), chkL = board ? hCheckList(board.trucks.filter(kOk)) : [];
    const short = '<div class="hs-cal" role="list" aria-label="Вільних машин по днях">' + fd.map(([i, v]) => { const d = day(i);
        return '<div class="hs-cd' + (i === C.today ? ' now' : '') + '" role="listitem"><span>' + (i === C.today ? 'сьогодні' : DOWS[d.getDay()]) + '</span><small>' + dd(isoDay(d)) + '</small><b class="tnum">' + v + '</b><span class="sr"> ' + plural(v, 'вільна', 'вільні', 'вільних') + '</span></div>'; }).join('') + '</div>' +
      ((noUnl.length || chkL.length) ? '<p class="hs-tags">' + (noUnl.length ? '<button type="button" class="tag warn" data-lact="nounl">' + svgI(PROB.drv) + esc(noUnl.slice(0, 4).join(', ') + (noUnl.length > 4 ? '…' : '')) + ' — немає дати розвантаження</button>' : '') +
        chkL.slice(0, 2).map(x => '<button type="button" class="tag warn" data-htruck="' + esc(x.id) + '">' + svgI(PROB.trip) + esc(x.id) + (x.status === 'free' ? ' простій ' + daysFrom(x.since) + ' дн' : ' без рейсів') + '</button>').join('') + '</p>' : '');
    return hw('cal', 'Календар парку', '<div class="cal-sc"><div class="cal" role="list" aria-label="Календар парку: 7 днів назад і 7 уперед">' + head + body + '</div></div>' + leg,
      { cls: 's12 o6', scls: 'ss6', short, smeta: 'вільних машин по днях', meta: dd(C.from) + ' – ' + dd(isoDay(day(N - 1))) + ' · сьогодні виділено' + (holes ? ' · <b>дірок попереду: ' + holes + '</b>' : '') });
  }
  // 7. Кордон і документи (логіст, міжнародні): прострочене — окремим рядком, як у «Панелі дня» керівника
  const RMPD_L = { ok: ['ok', 'RMPD ✓'], ai: ['warn', 'RMPD: глянути'], wait: ['warn', 'RMPD: чекає'], warn: ['bad', 'RMPD: розбіжність'], none: ['bad', 'RMPD немає'] };
  const hShowBorder = () => me && me.role === 'логіст' && hKind !== 'dom';
  function hwBorder() {
    if (!hShowBorder()) return '';
    if (!board) return hw('border', 'Кордон і документи', hSk(3), { cls: 's5 o7' });
    const T = board.trucks.filter(kOk), wait = ['замитнення', 'на кордоні', 'розмитнення'];
    const near = T.filter(x => x.ech || (x.status === 'trip' && x.trip && x.trip.st && wait.indexOf(x.trip.st.event) >= 0));
    const docs = [], over = []; T.forEach(x => x.problems.filter(p => p.k === 'doc' || p.k === 'tir').forEach(p => (/простроч/.test(p.t) ? over : docs).push({ x, p })));
    docs.sort((a, b) => b.p.urgent - a.p.urgent);
    const rm = x => { const r = x.trip && !x.trip.order && x.trip.rmpd && RMPD_L[x.trip.rmpd]; return r ? '<span class="tag ' + r[0] + '">' + r[1] + '</span>' : ''; };
    const rmIds = [...logRmpd].filter(id => T.some(x => x.id === id));
    const overM = {}; over.forEach(o => overM[o.x.id] = 1);
    const body = echQueueHtml(T) + '<h3 class="hw-h3">Біля кордону й у черзі <span class="tnum">' + near.length + '</span></h3>' + (near.length ? '<ul class="hl">' + near.map(x => '<li><button type="button" class="hrow" data-htruck="' + esc(x.id) + '" title="' + esc(x.ech ? echShort(x.ech) : cap(x.trip.st.event) + (x.trip.cross ? ' · ' + x.trip.cross : '')) + '"><span class="plate ua">' + esc(x.id) + '</span><span class="hl-t">' + esc(x.ech ? echShort(x.ech) : cap(x.trip.st.event) + (x.trip.cross ? ' · ' + x.trip.cross : '') + ' · ' + tkTime(x.trip.st.at)) + '</span>' + rm(x) + '</button></li>').join('') + '</ul>' : '<p class="muted small">Зараз ніхто не стоїть на кордоні (за кроками водіїв і листами єЧерги).</p>') +
      (rmIds.length ? '<button type="button" class="hrow hchk" data-lact="rmpd"><span>RMPD перед кордоном не перевірено: <b>' + rmIds.join(', ') + '</b></span><span class="hgo" aria-hidden="true">›</span></button>' : '') +
      '<h3 class="hw-h3">Документи й TIR</h3>' +
      (over.length ? '<button type="button" class="hrow hbad" data-hgo="docs"><span><b>Прострочено: ' + over.length + '</b> <small>' + Object.keys(overM).slice(0, 6).join(', ') + (Object.keys(overM).length > 6 ? '…' : '') + '</small></span><span class="hgo" aria-hidden="true">›</span></button>' : '') +
      '<p class="hl-sub">Спливають за 30 днів: <b class="tnum">' + docs.length + '</b></p>' +
      (docs.length ? '<ul class="hl">' + docs.slice(0, 3).map(({ x, p }) => '<li class="hl-doc' + (p.urgent ? ' bad' : '') + '"><span class="plate ua">' + esc(x.id) + '</span><span class="hl-t" title="' + esc(p.t) + '">' + (p.urgent ? '<span class="sr">Терміново: </span>' : '') + esc(p.t) + '</span></li>').join('') + '</ul>' : '') +
      '<button type="button" class="link" data-hgo="docs">Усі документи →</button>';
    const short = '<p class="hs-line"><b class="tnum">' + near.length + '</b> біля кордону й у черзі</p>' +
      (rmIds.length ? '<button type="button" class="hrow hbad" data-lact="rmpd"><span>RMPD не перевірено: <b>' + rmIds.slice(0, 5).join(', ') + '</b></span><span class="hgo" aria-hidden="true">›</span></button>' : '') +
      (over.length ? '<button type="button" class="hrow hbad" data-hgo="docs"><span>Прострочено <b>' + over.length + '</b> · спливає ' + docs.length + '</span><span class="hgo" aria-hidden="true">›</span></button>' : '<p class="hs-line">Документи: спливає за 30 днів <b class="tnum">' + docs.length + '</b></p>');
    return hw('border', 'Кордон і документи', body, { cls: 's5 o7', scls: 'ss4', short, sum: near.length + ' біля кордону · ' + (over.length ? 'прострочено ' + over.length : docs.length + ' докум.') });
  }
  function logDraw() {
    if (hRole() && $('m51')) return mDraw();   // v51: головна логіста — «Машини зараз»
    if (!hRole() || !$('hwBox')) return;
    hPhoneWas = hPhone();
    const box = $('hwBox'), ae = document.activeElement, fk = ae && box.contains(ae) ? ['data-wtg', 'data-wtt', 'data-wall', 'data-lact', 'data-hk', 'data-htg', 'data-htruck', 'data-hgo'].map(a => ae.getAttribute(a) ? '[' + a + '="' + ae.getAttribute(a) + '"]' : '').find(Boolean) : '';
    const seg = '<div class="seg" role="group" aria-label="Які рейси показувати">' + [['all', 'Усі'], ['dom', 'Внутрішні'], ['intl', 'Міжнародні']].map(k => '<button type="button" data-hk="' + k[0] + '" aria-pressed="' + (hKind === k[0]) + '">' + k[1] + '</button>').join('') + '</div>';
    const boss = me.role !== 'логіст';
    const grid = '<div class="hgrid' + (boss ? ' hgrid-boss' : '') + '">' + (boss ? '' : hwAct()) + hwFree() + hwUtil() + hwConv() + hwWeek() + hwBorder() + hwCal() + '</div>';
    const ks = (grid.match(/data-w="[^"]+"/g) || []).map(x => x.slice(8, -1)).concat(wExtra()), nOpen = ks.filter(wOpen).length;
    const wall = '<span class="hwall"><button type="button" class="btn small" data-wall="short"' + (nOpen ? '' : ' disabled') + '>Згорнути все</button><button type="button" class="btn small" data-wall="open"' + (nOpen === ks.length ? ' disabled' : '') + '>Розгорнути все</button></span>';
    box.innerHTML = '<div class="hbar">' + (boss ? '<h2 class="hbar-h">Парк і рейси</h2>' : '') + seg + '<span class="muted small hupd"><span id="hAgo">' + esc(hAgo()) + '</span> · <button type="button" class="link" data-hgo="reload">оновити</button></span>' + wall + '</div>' + grid;
    if (fk) { const f = box.querySelector(fk); if (f) f.focus({ preventScroll: true }); }
    if (boss && $('bwL')) bossDraw();   // дошка прийшла — RMPD у «Панелі дня» (v51)
  }
  /** v51: ключі віджетів «Панелі дня» (bwL / bwR), щоб «Згорнути все / Розгорнути все» охоплювали і їх. */
  const wExtra = () => [...document.querySelectorAll('#bwL .hw[data-w], #bwR .hw[data-w]')].map(w => w.dataset.w);
  function wallSync() {
    const ks = [...document.querySelectorAll('#hwBox .hw[data-w], #bwL .hw[data-w], #bwR .hw[data-w]')].map(w => w.dataset.w), n = ks.filter(wOpen).length;
    const a = document.querySelector('#hwBox [data-wall="short"]'), b = document.querySelector('#hwBox [data-wall="open"]');
    if (a) a.disabled = !n; if (b) b.disabled = n === ks.length;
  }
  $('homeWork').addEventListener('click', e => {
    if (!hRole() || $('home').hidden) return;
    const t = e.target.closest('[data-wtg],[data-wtt],[data-wall],[data-lact],[data-hk],[data-htg],[data-htruck],[data-hnew],[data-hgo]'); if (!t || !t.closest('#hwBox, #m51Drop')) return;
    const d = t.dataset;
    if (d.wtg || d.wtt) { const k = d.wtg || d.wtt; wSet(k, !wOpen(k)); logDraw(); }
    else if (d.wall) { $('homeWork').querySelectorAll('#hwBox .hw[data-w], #bwL .hw[data-w], #bwR .hw[data-w]').forEach(w => wSet(w.dataset.w, d.wall === 'open')); if ($('bwL')) bossDraw(); logDraw(); const b = $('hwBox').querySelector('[data-wall="' + (d.wall === 'open' ? 'short' : 'open') + '"]'); if (b) b.focus(); }
    else if (d.lact) { if (d.lact === 'dups') { if (dups && dups.length) dupsOpen(); else openBoardF('all'); } else openBoardF(d.lact); }
    else if (d.hk) { hKind = d.hk; store.set('hKind', hKind); logDraw(); }
    else if (d.htg) { hOpen[d.htg] = !hOpen[d.htg]; logDraw(); }
    else if (d.htruck) { if (mOn()) mSelect(d.htruck, t); else boardTruck(d.htruck); }
    else if (d.hnew) tripForm(null, { truck: d.hnew });
    else if (d.hgo === 'reload') logLoad(true);
    else if (d.hgo === 'docs') openDocs();
    else if (d.hgo === 'echx') echExtOpen();
    else if (d.hgo === 'wait' || d.hgo === 'queue') { openBoardF('all'); setTimeout(() => { const s = $(d.hgo === 'wait' ? 'bWait' : 'bQueue'); if (s && !s.hidden) { s.scrollIntoView({ behavior: smooth(), block: 'start' }); const h = s.querySelector('h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } } else toast(d.hgo === 'wait' ? 'Заявок без машини зараз немає.' : 'Причепів у черзі зараз немає.'); }, 120); }
  });

  /* ── v51 (ADR-096, макет v0.5): головна логіста = «Машини зараз». Уся сторінка — статуси машин (Хто · Рейс і етап · Де зараз ·
     Чого чекає / чого бракує), групи, пошук, порядок, «Усі / ЄС / Україна», «Мої машини»; рядок етапів — фільтр (колишній конвеєр);
     праворуч — та сама панель рейсу, що на дошці (bPanelOpen), без вибору — «Парк зараз»; решта віджетів — чипи-розгортки зверху
     (вміст — розгорнуті віджети v50 через hwRaw). Дані — ті самі board + home.logist, нових запитів немає (крім truck.logist). ── */
  const M_ST = [['load', 'Завантаження'], ['tob', 'До кордону'], ['brd', 'Кордон'], ['tou', 'Після кордону'], ['dmov', 'По Україні'], ['unl', 'Розвантаження'], ['free', 'Вільні'], ['idle', 'Простій']];
  const M_STN = {}; M_ST.forEach(s => M_STN[s[0]] = s[1]);
  const M_AFTER = ['кордон пройдено', 'розмитнення', 'на розвантаженні', 'розвантажено'];
  const mKey = k => 'lcorp.h51.' + k, mMem = {};   // сховище недоступне (приватне вікно) — вибір живе до перезавантаження
  const mGet = k => k in mMem ? mMem[k] : store.get(mKey(k)), mSet = (k, v) => { mMem[k] = v; store.set(mKey(k), v); };
  const mOn = () => !!me && me.role === 'логіст' && !!$('m51') && !$('home').hidden;
  /** Причіп із черги, що підходить вільній машині: те саме місто (де стоїть за GPS або куди привіз останній рейс). Відстаней немає — лише збіг міста. */
  const mCity = s => String(s || '').toLowerCase().replace(/^≈\s*/, '').split(/[,(·]/)[0].replace(/\s+/g, ' ').trim();
  function mFit(x) {
    if (x.status === 'trip' || x.next || !board || !(board.queue || []).length) return null;
    const mv = bMove(x), here = [mv && mv.place, x.last && x.last.to].map(mCity).filter(Boolean);
    return (board.queue || []).find(z => here.indexOf(mCity(z.from)) >= 0) || null;
  }
  /** Модель рядка: етап, «де», «чого чекає», «чого бракує» (ті самі пункти, що в «Що не закрито» панелі й у розгортках). */
  function mRow(x) {
    const t = x.status === 'trip' && x.trip ? x.trip : null, real = !!t && !t.order, ev = (real && t.st && t.st.event) || '', k = t ? tKind(x) : (x.status === 'free' && daysFrom(x.since) <= 3 ? 'free' : 'idle');
    let st = k;
    if (t) {
      if (k === 'i') st = !ev || ev === 'на завантаженні' ? 'load' : ev === 'завантажено' || ev === 'замитнення' ? 'tob' : ev === 'на кордоні' ? 'brd' : ev === 'кордон пройдено' || ev === 'розмитнення' ? 'tou' : 'unl';
      else st = !ev || ev === 'на завантаженні' ? 'load' : ev === 'на розвантаженні' || ev === 'розвантажено' ? 'unl' : 'dmov';
      if (k === 'i' && x.ech && /черз|готуйт|виклик/.test(x.ech.state || '') && (st === 'load' || st === 'tob')) st = 'brd';
    }
    const miss = [], add = (lv, tx, act, key) => miss.push({ lv, tx, act: act || 'Відкрити', key: key || '' });
    const passed = t && M_AFTER.indexOf(ev) >= 0, nearB = st === 'brd' || !!(x.ech && /черз|готуйт|виклик/.test(x.ech.state || '')) || !!(x.gpsHint && /кордон/.test(x.gpsHint.step || ''));
    if (t && t.order) add('warn', 'заявка — рейс не створено', 'Відкрити');
    if (real && k === 'i' && !passed && t.rmpd === 'none') add(nearB ? 'bad' : 'warn', 'немає RMPD', 'Відкрити', 'rmpd');
    if (real && k === 'i' && !passed && t.rmpd === 'warn') add('warn', 'RMPD ≠ CMR', 'Звірити', 'rmpd');
    x.problems.filter(p => p.k === 'drv').forEach(p => add(p.urgent ? 'bad' : 'warn', p.urgent ? 'проблема водія' : 'проблема в роботі', 'Відкрити'));
    if (real) { const h = STEP_AGE(x); if (h > 12) add(h > 24 ? 'bad' : 'warn', 'без кроку ' + (h >= 48 ? Math.floor(h / 24) + ' дн' : h >= 24 ? '1 дн ' + Math.round(h - 24) + ' год' : Math.round(h) + ' год'), 'Відкрити'); }
    x.problems.filter(p => p.k === 'addr').forEach(p => add(p.urgent ? 'bad' : 'warn', (p.t.match(/: (.*)$/) || [])[1] ? 'немає адрес' : 'адреси', 'Вписати'));
    if (real && !t.unload) add('warn', 'без дати розвант.', 'Поставити');
    x.problems.filter(p => p.k === 'doc' || p.k === 'tir').forEach(p => add(p.urgent && (t || k === 'i') ? 'bad' : 'warn', String(p.t).split(' — ')[0] + (/простроч/.test(p.t) ? ' прострочено' : ''), 'Відкрити'));
    x.problems.filter(p => p.k === 'trip').forEach(() => add('warn', 'рейс без дати розвант. > 14 дн', 'Поставити'));
    x.problems.filter(p => p.k === 'debt').forEach(() => add('warn', 'без позначки оплати', 'Відкрити'));
    if (t && !x.next && t.unload && daysFrom(t.unload) >= -1) add('warn', 'немає далі', 'Відкрити');
    const fit = mFit(x);
    if (!t && k === 'idle') add('warn', x.status === 'none' ? 'немає рейсів' : 'простій ' + daysFrom(x.since) + ' дн', 'Новий рейс');
    else if (!t && !x.next) add('warn', 'немає рейсу', fit ? 'Призначити' : 'Новий рейс');
    miss.sort((a, b) => (a.lv === 'bad' ? 0 : 1) - (b.lv === 'bad' ? 0 : 1));
    const lvl = miss.some(m => m.lv === 'bad') ? 'bad' : miss.length ? 'warn' : '';
    // де зараз
    const mv = bMove(x), at = mv ? mv.place || 'на карті' : x.gps ? '—' : '—';
    const mvT = mv ? (mv.moving ? 'їде' : 'стоїть') + (mv.min != null && mv.min >= 0 ? ' ' + durTxt(mv.min) : '') + (mv.stale ? ' · дані давні' : '') : x.drive ? x.drive.main : x.gps ? gpsText(x.gps) : 'немає GPS';
    // чого чекає: єЧерга → план рейсу → наступний рейс → причіп з черги
    let nx = '';
    if (x.ech && real && !passed) nx = 'Кордон' + (x.ech.call ? ' ≈ ' + whenTxt(x.ech.call) : '') + ' · єЧерга' + (x.ech.queue ? ' №' + x.ech.queue : ' · ' + x.ech.state);
    else if (t) nx = st === 'load' && t.load && daysFrom(t.load) <= 0 ? 'Завантаження ' + (daysFrom(t.load) === 0 ? 'сьогодні' : dd(t.load)) + ' · ' + (t.from || '?') : t.unload ? 'Розвантаження ' + (daysFrom(t.unload) === 0 ? 'сьогодні' : dd(t.unload)) + ' · ' + (t.to || '?') : 'Розвантаження не вказано · ' + (t.to || '?');
    else if (x.next) nx = 'Далі ' + dd(x.next.load) + ' · ' + (x.next.from || '?') + ' → ' + (x.next.to || '?') + (x.next.order ? ' (заявка)' : '');
    else if (fit) nx = 'Підходить причіп ' + (fit.trailer || '?') + ' · ' + (fit.from || '');
    else nx = k === 'idle' && daysFrom(x.since) > 14 ? 'Чи внесено рейс?' : 'Немає заявки';
    const stage = !t ? (k === 'free' ? 'Вільна з ' + dd(x.since) : x.status === 'none' ? 'Немає рейсів' : 'Простій з ' + dd(x.since) + ' · ' + daysFrom(x.since) + ' дн')
      : st === 'tob' && t.cross ? 'До МП ' + t.cross : st === 'brd' && t.cross ? 'Кордон · ' + t.cross : M_STN[st];
    return { x, t, k, st, miss, lvl, at, mvT, go: !!(mv && mv.moving), nx, stage, fit, nearB,
      route: t ? (t.from || '?') + ' → ' + (t.to || '?') : 'Без рейсу', who: x.drivers.map(d => d.name).join(', ') };
  }
  const mScore = r => (r.lvl === 'bad' ? 100 : r.lvl === 'warn' ? 40 : 0) + r.miss.length * 5 + r.miss.filter(m => m.lv === 'bad').length * 10;
  const mSort = () => { const v = mGet('sort'); return v === 'stage' || v === 'plate' ? v : 'prob'; };
  /* «Мої машини» / «Закріпити…» — лише коли в даних дошки більше одного логіста (поки логісти заходять одним спільним входом — сховано,
     а збережений вибір «Мої» ігнорується — показуємо «Усі») */
  const lgMany = () => ((board && board.logists) || []).length > 1;
  const mMine = () => lgMany() && mGet('mine') === '1';
  const mIsMine = x => !!me && !!me.name && (x.logist === me.name || x.lead === me.name);
  const M = { stage: '', q: '' };   // фільтр етапу (рядок етапів) і пошук — до перезавантаження сторінки
  var mDropId = '';                  // відкрита розгортка (одна за раз)
  function mVisible(rows) {
    const q = M.q.trim().toLowerCase(), mine = mMine();
    return rows.filter(r => {
      if (!kOk(r.x)) return false;
      if (mine && !mIsMine(r.x)) return false;
      if (M.stage && r.st !== M.stage) return false;
      if (q && [r.x.id, r.who, r.x.trailer, r.at, r.route, r.t && r.t.cross, r.x.plate].join(' ').toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  const mPlate = (id, cls) => '<span class="plate ua' + (cls ? ' ' + cls : '') + '">' + esc(id) + '</span>';
  function mPipe(r) {
    if (!r.t) return '';
    const s = r.k === 'i' ? ['load', 'tob', 'brd', 'tou', 'unl'] : ['load', 'dmov', 'unl'], ci = s.indexOf(r.st);
    return '<span class="pp' + (r.k === 'i' ? '' : ' dom') + '" aria-hidden="true">' + s.map((k, i) => '<i class="' + (i < ci ? 'done' : i === ci ? 'cur ' + r.lvl : '') + '"></i>').join('') + '</span>';
  }
  function mRowHtml(r) {
    const x = r.x, sel = bPanelX && bPanelX.id === x.id && !$('bPanel').hidden, m = r.miss;
    const mt = m.length ? m.slice(0, 2).map(q => q.tx).join(' · ') + (m.length > 2 ? ' · +' + (m.length - 2) : '') : '';
    const st2 = !r.t ? '<span class="l2 ' + (r.k === 'free' ? 'free' : 'w') + '">' + esc(r.stage) + '</span>' : '<span class="ppt">' + mPipe(r) + '<span class="tx">' + esc(r.stage) + '</span></span>';
    const qa = m.length ? (me.viewAs && m[0].act !== 'Відкрити' ? 'Відкрити' : m[0].act) : '';
    const lab = x.id + (r.who ? ', ' + r.who : '') + '. ' + r.route + ', ' + r.stage + '. ' + r.at + ', ' + r.mvT + '. ' + r.nx + (mt ? '. Бракує: ' + m.map(q => q.tx).join(', ') : '. Усе є');
    return '<div class="m51-rw" role="listitem"><div class="m51-r' + (r.lvl ? ' ' + r.lvl : '') + '" role="button" tabindex="0" data-mid="' + esc(x.id) + '" aria-pressed="' + sel + '" aria-label="' + esc(lab) + '">' +
      '<div class="ca"><span class="p">' + mPlate(x.id) + '<b>' + esc(r.who || '—') + '</b></span><span class="l2">' + (x.trailer ? 'причіп ' + esc(x.trailer) : 'без причепа') + '</span></div>' +
      '<div class="cb"><span class="l1">' + esc(r.route) + '</span>' + st2 + '</div>' +
      '<div class="cc"><span class="l1">' + esc(r.at) + '</span><span class="l2"><span class="' + (r.go ? 'go' : 'stop') + '" aria-hidden="true"></span>' + esc(r.mvT) + '</span></div>' +
      '<div class="cd"><span class="l1">' + esc(r.nx) + '</span>' + (mt ? '<span class="l2 ' + (r.lvl === 'bad' ? 'b' : 'w') + '">' + esc(mt) + '</span>' : '<span class="l2 ok">усе є</span>') + '</div></div>' +
      (qa ? '<span class="qa"><button type="button" class="btn small" tabindex="-1" data-mqa="' + esc(x.id) + '" aria-label="' + esc(qa + ': ' + x.id) + '">' + esc(qa) + '</button></span>' : '') + '</div>';
  }
  function mListHtml(rows) {
    const l = mVisible(rows), s = mSort(); let g;
    if (s === 'prob') {
      g = [['Потрібна дія зараз', 'bad', l.filter(r => r.lvl === 'bad')], ['Варто глянути', '', l.filter(r => r.lvl === 'warn' && r.t)], ['У дорозі за планом', '', l.filter(r => !r.lvl && r.t)], ['Вільні й простій', '', l.filter(r => !r.t && r.lvl !== 'bad')]];
      g.forEach(x => x[2].sort((a, b) => mScore(b) - mScore(a) || a.x.id.localeCompare(b.x.id)));
    } else if (s === 'stage') g = M_ST.map(st => [st[1], '', l.filter(r => r.st === st[0]).sort((a, b) => mScore(b) - mScore(a))]);
    else g = [['', '', l.slice().sort((a, b) => a.x.id.localeCompare(b.x.id))]];
    const body = g.filter(x => x[2].length).map(x => (x[0] ? '<div class="gh ' + x[1] + '" role="presentation"><h3>' + esc(x[0]) + ' <span class="c">' + x[2].length + '</span></h3></div>' : '') + x[2].map(mRowHtml).join('')).join('');
    return '<div class="lh" aria-hidden="true"><span>Хто</span><span>Рейс і етап</span><span>Де зараз</span><span>Чого чекає · чого бракує</span></div>' +
      (body || '<div class="nores">' + (mMine() && !rows.some(r => mIsMine(r.x)) ? 'За вами ще немає машин. Закріпіть машину в її панелі («Закріпити за мною») або вимкніть «Мої машини».' : 'Нічого не знайдено. Шукайте за знаком, прізвищем, причепом або містом.') + '</div>');
  }
  function mFlowHtml(rows) {
    rows = rows.filter(r => kOk(r.x));
    return M_ST.map((s, i) => { const l = rows.filter(r => r.st === s[0]), hot = l.some(r => r.lvl === 'bad');
      if (!l.length && M.stage !== s[0]) return '';   // v52 (принцип 5): етап без машин мовчить
      return '<button type="button" data-mst="' + s[0] + '" aria-pressed="' + (M.stage === s[0]) + '"' + (hot ? ' class="hot"' : '') + ' aria-label="' + esc(s[1] + ': ' + l.length + (hot ? ', є потрібна дія' : '') + ' — показати лише цей етап') + '">' + s[1] + '<b>' + l.length + '</b></button>'; }).join('');
  }

  /* ── v52: «План роботи · 14 днів» (рішення власниці 27.11): поточний рейс з етапом, наступний, порожні дні — «без роботи» ── */
  const PL_D = 14;
  function mPlanHtml(rows) {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const ix = iso => { if (!iso) return null; const d = new Date(iso + 'T00:00:00'); return Math.round((d - t0) / 864e5); };
    const cl = n => Math.max(0, Math.min(PL_D, n)), dl = n => { const d = new Date(t0); d.setDate(d.getDate() + n); return dd(isoDay(d)); };
    let win = 0;
    const L = rows.filter(r => kOk(r.x)).slice().sort((a, b) => a.x.id.localeCompare(b.x.id)).map(r => {
      const segs = []; let open = false;   // open — дата розвантаження невідома: далі не вгадуємо
      const add = (t, lab, kind) => { if (open) return; const a = cl(ix(t.load) == null ? 0 : ix(t.load)), u = ix(t.unload);
        const b = u == null ? PL_D : cl(u + 1); if (u == null) open = true; if (b > a) segs.push({ a, b, lab: lab + (u == null ? ' · без дати розвантаження' : ''), kind: kind + (u == null ? ' unk' : '') }); };
      if (r.t) add(r.t, (r.t.from || '?') + ' → ' + (r.t.to || '?') + ' · ' + String(M_STN[r.st] || '').toLowerCase(), 'trip' + (r.t.order ? ' ord' : ''));
      if (r.x.next) add(r.x.next, (r.x.next.from || '?') + ' → ' + (r.x.next.to || '?') + (r.x.next.order ? ' (заявка)' : ''), 'trip' + (r.x.next.order ? ' ord' : ''));
      const busy = Array(PL_D).fill(false); segs.forEach(g => { for (let i = g.a; i < g.b; i++) busy[i] = true; });
      const gaps = []; for (let i = 0; i < PL_D;) { if (busy[i]) { i++; continue; } let j = i; while (j < PL_D && !busy[j]) j++; gaps.push({ a: i, b: j }); i = j; }
      if (gaps.some(g => g.a < 7)) win++;
      return { r, segs, gaps };
    });
    const head = Array.from({ length: PL_D }, (_, i) => { const d = new Date(t0); d.setDate(d.getDate() + i); const we = d.getDay() === 0 || d.getDay() === 6;
      return '<span class="' + (i === 0 ? 'td' : '') + (we ? ' we' : '') + '">' + (i === 0 ? 'сьогодні' : dl(i)) + '</span>'; }).join('');
    const bar = (g, lab, cls) => '<span class="pb ' + cls + '" style="grid-column:' + (g.a + 1) + '/' + (g.b + 1) + '" title="' + esc(lab) + '">' + esc(lab) + '</span>';
    const rowsH = L.map(o => '<div class="pl-r"><button type="button" class="pl-w" data-msel="' + esc(o.r.x.id) + '">' + mPlate(o.r.x.id) + '<span>' + esc((o.r.who || '').split(',')[0]) + '</span></button><div class="pl-g">' +
      o.segs.map(g => bar(g, g.lab, g.kind)).join('') + o.gaps.map(g => bar(g, (g.a === 0 ? 'вільна зараз' : 'без роботи з ' + dl(g.a)) + ' · ' + (g.b - g.a) + ' дн', 'gap')).join('') + '</div></div>').join('');
    // телефон (принцип 11): замість смуг — коли кожна машина звільняється
    const ph = L.filter(o => o.gaps.length).sort((a, b) => a.gaps[0].a - b.gaps[0].a).map(o => '<li><button type="button" class="linkbtn" data-msel="' + esc(o.r.x.id) + '">' + mPlate(o.r.x.id) + '</button><span>' + esc((o.r.who || '').split(',')[0]) + '</span><b>' + (o.gaps[0].a === 0 ? 'вільна зараз' : 'вільна з ' + dl(o.gaps[0].a)) + '</b></li>').join('');
    return { sum: win ? '<b>' + win + ' ' + plural(win, 'машина має', 'машини мають', 'машин мають') + ' вільні дні цього тижня</b> · пунктир — шукати вантаж' : 'усі машини зайняті на тиждень вперед',
      body: '<div class="pl-desk"><div class="pl-r pl-hd"><span></span><div class="pl-g">' + head + '</div></div>' + rowsH + '</div>' + (ph ? '<ul class="pl-ph">' + ph + '</ul>' : '') };
  }
  function mTagsHtml() {
    const t = []; const kn = { intl: 'ЄС', dom: 'Україна' }[hKind];
    if (kn) t.push(['hk', kn]); if (mSort() !== 'prob') t.push(['sort', mSort() === 'stage' ? 'за етапом' : 'за знаком']); if (M.stage) t.push(['st', M_STN[M.stage] || '']);
    return t.map(x => '<button type="button" class="tag-x" data-mtag="' + x[0] + '" aria-label="Прибрати: ' + esc(x[1]) + '">' + esc(x[1]) + ' ×</button>').join('');
  }

  /* ── розгортки ── */
  var hwRaw = false;
  const hwBody = fn => { hwRaw = true; try { const o = fn(); return o && typeof o === 'object' ? o : { body: o || '', meta: '' }; } finally { hwRaw = false; } };
  function mRmpdDrop(T) {
    const cand = T.filter(x => x.status === 'trip' && x.trip && !x.trip.order && tKind(x) === 'i' && !(x.trip.st && M_AFTER.indexOf(x.trip.st.event) >= 0));
    const n = s => cand.filter(x => s.indexOf(x.trip.rmpd || '') >= 0).length;
    const rows = cand.map(mRow).filter(r => r.t && (r.t.rmpd === 'none' || r.t.rmpd === 'warn')).sort((a, b) => (b.nearB - a.nearB) || ((a.t.rmpd === 'none' ? 0 : 1) - (b.t.rmpd === 'none' ? 0 : 1)) || a.x.id.localeCompare(b.x.id));
    const bad = rows.some(r => r.t.rmpd === 'none' && r.nearB);
    const li = r => '<li><span class="who">' + mPlate(r.x.id) + '<span>' + esc(r.who || '—') + '</span></span><div><div class="t ' + (r.t.rmpd === 'none' && r.nearB ? 'b' : 'w') + '">' +
      (r.t.rmpd === 'warn' ? 'Розбіжність з CMR' : r.nearB ? 'Біля кордону без RMPD' : 'Не надіслано') + '</div><div class="s">' + esc([r.at, r.mvT, r.x.ech ? echShort(r.x.ech) : r.t.cross ? 'перехід ' + r.t.cross : ''].filter(Boolean).join(' · ')) + '</div></div>' +
      '<div class="acts"><button type="button" class="btn small" data-mrmpd="' + esc(r.x.id) + '">' + (r.t.rmpd === 'warn' ? 'Звірити' : 'Відкрити') + '</button></div></li>';
    const near = cand.filter(x => x.ech || mRow(x).st === 'brd' || mRow(x).st === 'tob');
    const byB = {}; near.forEach(x => { const k = (x.ech && x.ech.checkpoint) || x.trip.cross || 'перехід не вказано'; (byB[k] = byB[k] || []).push(x); });
    const bp = Object.keys(byB).length ? '<ul class="bp">' + Object.keys(byB).map(k => '<li><b>' + esc(k) + '</b><span>' + byB[k].map(x => '<button type="button" class="linkbtn" data-htruck="' + esc(x.id) + '">' + esc(x.id) + '</button> ' +
        esc(x.ech ? echShort(x.ech) : cap((x.trip.st && x.trip.st.event) || 'в дорозі')) + (x.trip.rmpd === 'none' ? '<span class="s b">без RMPD</span>' : x.trip.rmpd === 'warn' ? '<span class="s">розбіжність з CMR</span>' : '')).join('<br>') + '</span></li>').join('') + '</ul>'
      : '<p class="muted small">Біля кордону зараз нікого (за кроками водіїв і листами єЧерги).</p>';
    const body = '<div class="dcols"><div><div class="nums"><div><b>' + cand.length + '</b><span>потрібно</span></div><div class="' + (n(['none']) ? 'b' : '') + '"><b>' + n(['none']) + '</b><span>не надіслано</span></div>' +
      '<div><b>' + n(['wait', 'ai']) + '</b><span>на перевірці</span></div><div class="' + (n(['warn']) ? 'w' : '') + '"><b>' + n(['warn']) + '</b><span>розбіжність</span></div><div><b>' + n(['ok']) + '</b><span>звірено</span></div></div>' +
      (rows.length ? '<ul class="ilist">' + rows.map(li).join('') + '</ul>' : '<p class="hcalm">' + svgI(ST_ICO.ok) + ' Усі RMPD перед кордоном надіслано</p>') + '</div>' +
      '<div><div class="dsub">Пункти пропуску зараз · єЧерга</div>' + bp + (me.role === 'логіст' ? '<div class="m51-ech">' + echQueueHtml(T) + '</div>' : '') + '</div></div>';
    return { n: rows.length, lv: bad ? 'bad' : rows.length ? 'warn' : '', body, meta: cand.length + ' ' + plural(cand.length, 'рейс', 'рейси', 'рейсів') + ' до кордону',
      foot: '<span>«Відкрити» — картка рейсу з файлом RMPD. Кому нагадувати автоматично — ще не вирішено, тож поки нагадуйте водієві самі.</span>' };
  }
  function mQueueDrop() {
    const qu = (board && board.queue) || [], cq = canQueue(), T = board ? board.trucks : [];
    const fitOf = z => T.filter(x => x.status !== 'trip' && !x.next).map(mRow).find(r => r.fit && r.fit.id === z.id) || null;
    const card = z => { const f = fitOf(z);
      return '<div class="qc"><div class="top2"><span class="plate trl">' + esc(z.trailer || '?') + '</span><span class="' + (z.waitDays > 2 ? 'long' : '') + '">' + (z.waitDays ? 'чекає ' + z.waitDays + ' дн' : 'сьогодні') + '</span></div>' +
        '<p><b>' + tripText(z) + '</b><br><span class="muted">' + [z.load && 'завантажено ' + dd(z.load), z.client && esc(z.client), z.cargo && esc(z.cargo), z.adr && 'АДР', z.border && esc(z.border)].filter(Boolean).join(' · ') + '</span></p>' +
        '<div class="fit"><span class="l">Підходить</span>' + (f ? '<span class="row1">' + mPlate(f.x.id) + '<span>' + esc(f.who || '') + '</span></span>' + (cq ? '<button type="button" class="btn small" data-mqas="' + esc(z.id) + '" data-truck="' + esc(f.x.id) + '">Призначити</button>' : '<span></span>') +
          '<span class="muted" style="grid-column:1/-1">' + esc(f.at || '') + ' — те саме місто</span>' : '<span class="muted" style="grid-column:1/-1">вільної машини в цьому місті немає</span>') + '</div></div>'; };
    const long = qu.filter(z => (z.waitDays || 0) > 2);
    return { n: qu.length, lv: long.length ? 'warn' : '', meta: 'завантажені, чекають тягач · підказка — вільна машина в тому самому місті',
      body: qu.length ? '<div class="qgrid">' + qu.map(card).join('') + '</div>' : '<p class="hcalm">' + svgI(ST_ICO.ok) + ' Причепів у черзі немає</p>',
      foot: (cq ? '<button type="button" class="btn small" data-mqadd="1">+ Записати причіп</button>' : '') + (long.length ? '<span>Бурштинова крапка — причіп чекає довше 2 дн (' + esc(long.map(z => z.trailer).join(', ')) + ')</span>' : '') };
  }
  function mDocsDrop(T) {
    const l = []; T.forEach(x => x.problems.filter(p => p.k === 'doc' || p.k === 'tir').forEach(p => l.push({ x, p, lv: p.urgent && x.status === 'trip' ? 'b' : p.urgent || /простроч/.test(p.t) ? 'w' : '' })));
    l.sort((a, b) => (a.lv === 'b' ? 0 : a.lv === 'w' ? 1 : 2) - (b.lv === 'b' ? 0 : b.lv === 'w' ? 1 : 2));
    const over = l.filter(o => /простроч/.test(o.p.t)).length, wr = !me.viewAs;
    return { n: l.length, lv: l.some(o => o.lv === 'b') ? 'bad' : l.some(o => o.lv) ? 'warn' : '', meta: 'прострочено ' + over + ' · спливає за 30 дн ' + (l.length - over) + ' · червоне — машина в рейсі',
      body: l.length ? '<ul class="ilist">' + l.map(o => '<li><span class="who">' + mPlate(o.x.id) + '<span>' + esc(o.x.drivers.map(d => d.name).join(', ') || '—') + '</span></span><div><div class="t ' + o.lv + '">' + esc(String(o.p.t).split(' — ')[0]) + '</div><div class="s">' + esc(String(o.p.t).split(' — ').slice(1).join(' — ')) + (o.p.old ? ' · давно, машина ' + (o.x.status === 'trip' ? 'в рейсі' : 'на базі') : '') + '</div></div>' +
        '<div class="acts"><button type="button" class="btn small" data-hgo="docs">' + (wr ? 'Оновити' : 'Відкрити') + '</button></div></li>').join('') + '</ul>' : '<p class="hcalm">' + svgI(ST_ICO.ok) + ' Документи — без зауважень на 30 днів</p>',
      foot: '<button type="button" class="link" data-hgo="docs">Усі документи →</button>' };
  }
  function mDrops() {
    const T = board ? board.trucks.filter(kOk) : [], D = [];
    const sk = { n: '', lv: '', body: hSk(3), meta: '' };
    D.push(Object.assign({ id: 'rmpd', t: 'RMPD', ttl: 'RMPD перед кордоном' }, board ? mRmpdDrop(T) : sk));
    const a = hwBody(hwAct), an = +(String(a.meta || '').match(/\d+/) || [0])[0];
    D.push({ id: 'act', t: 'Потребує дії', ttl: 'Потребує дії', n: board ? an : '', lv: /p-bad/.test(a.body) ? 'bad' : an ? 'warn' : '', body: a.body, meta: 'усе, що зручно зробити пакетом; окремі машини вже стоять першими у списку' });
    D.push(Object.assign({ id: 'trl', t: 'Причепи в черзі', ttl: 'Причепи в черзі' }, board ? mQueueDrop() : sk));
    const f = hwBody(hwFree);
    D.push({ id: 'free', t: 'Звільняються', ttl: 'Звільняються за 72 год', n: board ? +(String(f.meta || '').match(/\d+/) || [0])[0] : '', lv: /fr-it (bad|warn)/.test(f.body) ? 'warn' : '', body: f.body, meta: f.meta && /\d/.test(f.meta) ? f.meta : '' });
    D.push(Object.assign({ id: 'docs', t: 'Документи й TIR', ttl: 'Документи й TIR' }, board ? mDocsDrop(T) : sk));
    const u = hwBody(hwUtil), w = hwBody(hwWeek), cl = hwBody(hwCal);
    D.push({ id: 'stats', t: 'Показники', ttl: 'Показники парку', n: '', lv: '', quiet: true, meta: '',
      body: '<h3 class="drop-sub">Завантаженість</h3>' + u.body + '<h3 class="drop-sub">' + (homeL && homeL.dow <= 2 ? 'Минулий тиждень у цифрах' : 'Тиждень у цифрах') + '</h3>' + w.body + '<h3 class="drop-sub">Календар парку</h3>' + cl.body });
    // v52 (принцип 5): розгортка з нулем мовчить, крім відкритої зараз
    D.forEach(d => { if (d.id === 'trl' && !d.n && canQueue()) { d.n = ''; d.quiet = true; } });   // причепів 0 — тиха кнопка без нуля: звідси записують новий причіп
    return D.filter(d => !(d.n === 0 || d.n === '0') || d.id === mDropId);
  }
  function mChipsHtml(D) {
    return D.map(d => '<button type="button" class="dchip' + (d.lv === 'bad' ? ' bad' : '') + (d.quiet ? ' quiet' : '') + '" data-mdrop="' + d.id + '" aria-expanded="' + (mDropId === d.id) + '" aria-controls="m51Drop"' +
      ' aria-label="' + esc(d.ttl + (d.n !== '' && d.n != null ? ': ' + d.n + (d.u || '') : '') + (d.lv === 'bad' ? ' — потрібна дія' : d.lv === 'warn' ? ' — варто глянути' : '')) + '">' +
      (d.lv ? '<i class="sig" aria-hidden="true"></i>' : '') + esc(d.t) + (d.n !== '' && d.n != null ? ' <span class="n">' + esc(d.n) + (d.u ? '<small>' + esc(d.u) + '</small>' : '') + '</span>' : '') + '</button>').join('');
  }
  function mDropDraw(D) {
    const dp = $('m51Drop'); if (!dp) return;
    const d = mDropId ? (D || mDrops()).find(x => x.id === mDropId) : null;
    document.querySelectorAll('#m51Chips .dchip').forEach(c => c.setAttribute('aria-expanded', String(!!d && c.dataset.mdrop === d.id)));
    if (!d) { dp.hidden = true; dp.innerHTML = ''; document.body.classList.remove('m51-drop-on'); return; }
    dp.innerHTML = '<div class="drop-h"><h2 id="m51DropT">' + esc(d.ttl) + '</h2>' + (d.meta ? '<span class="meta">' + d.meta + '</span>' : '') + '<button type="button" class="bp-x m51-dx" aria-label="Закрити (Esc)">' + svgI(BP_ICO.x) + '</button></div>' +
      '<div class="drop-b">' + d.body + '</div>' + (d.foot ? '<div class="drop-f">' + d.foot + '</div>' : '');
    dp.setAttribute('aria-labelledby', 'm51DropT'); dp.hidden = false; document.body.classList.add('m51-drop-on');
  }
  function mDropOpen(id, focus) {
    mDropId = id || ''; mDropDraw();
    if (mDropId && focus) { const h = $('m51Drop').querySelector('.drop-b button, .drop-b a, .m51-dx'); if (h) h.focus({ preventScroll: true }); }
  }
  function m51Close() { if (mDropId) { mDropId = ''; mDropDraw(); } }

  /* ── праворуч без вибору: «Парк зараз» (варіант Б) ── */
  function mSumHtml(rows) {
    const T = rows.filter(r => kOk(r.x)), nBad = T.filter(r => r.lvl === 'bad').length, nTrip = T.filter(r => r.t).length, nFree = T.filter(r => r.k === 'free' && !r.t).length, nIdle = T.filter(r => r.k === 'idle' && !r.t).length;
    const first = [], ids = l => l.slice(0, 3).map(r => r.x.id).join(', ') + (l.length > 3 ? ' +' + (l.length - 3) : '');
    const rm = T.filter(r => r.miss.some(m => m.key === 'rmpd' && m.tx === 'немає RMPD')).sort((a, b) => b.nearB - a.nearB);
    if (rm.length) first.push(['RMPD для ' + ids(rm), rm.filter(r => r.nearB).length ? rm.filter(r => r.nearB).length + ' вже біля кордону' : 'потрібен до кордону', 'Відкрити', 'data-mdrop="rmpd"']);
    const drv = T.filter(r => r.x.problems.some(p => p.k === 'drv' && p.urgent));
    drv.slice(0, 2).forEach(r => { const p = r.x.problems.find(q => q.k === 'drv' && q.urgent); first.push(['Проблема водія · ' + r.x.id, String(p.t).replace(/^Водій[^:]*: /, ''), 'Відкрити', 'data-msel="' + esc(r.x.id) + '"']); });
    T.filter(r => r.fit).slice(0, 1).forEach(r => first.push([r.x.id + ' + причіп ' + (r.fit.trailer || '?'), 'обидва: ' + (r.fit.from || ''), canQueue() ? 'Призначити' : 'Відкрити', canQueue() ? 'data-mqas="' + esc(r.fit.id) + '" data-truck="' + esc(r.x.id) + '"' : 'data-msel="' + esc(r.x.id) + '"']));
    const stale = T.filter(r => r.t && STEP_AGE(r.x) > 24);
    if (stale.length) first.push(['Без кроку водія > 24 год', ids(stale), 'Показати', 'data-msel="' + esc(stale[0].x.id) + '"']);
    const adr = T.filter(r => r.x.problems.some(p => p.k === 'addr' && p.urgent));
    if (adr.length) first.push(['Адреси для водія', ids(adr) + ' — завантаження скоро', 'Вписати', 'data-msel="' + esc(adr[0].x.id) + '"']);
    // найближчі події сьогодні / завтра: виклик єЧерги, розвантаження, завантаження наступного рейсу
    const today = isoDay(new Date()), tmr = isoDay(new Date(Date.now() + 864e5)), ev = [];
    T.forEach(r => { const x = r.x;
      if (x.ech && x.ech.call) { const d = isoDay(new Date(x.ech.call)); if (d === today || d === tmr) ev.push([d, hhmm(x.ech.call), x.id, 'єЧерга ' + ((x.ech.checkpoint || (r.t && r.t.cross)) || '') + (r.t && r.t.rmpd === 'none' ? ' · без RMPD' : ''), r.t && r.t.rmpd === 'none']); }
      if (r.t && (r.t.unload === today || r.t.unload === tmr)) ev.push([r.t.unload, 'день', x.id, 'розвант. ' + (r.t.to || '?') + (x.next ? '' : ' · далі немає'), false]);
      if (r.t && (r.t.load === today || r.t.load === tmr) && r.st === 'load') ev.push([r.t.load, 'день', x.id, 'завант. ' + (r.t.from || '?'), false]);
      if (x.next && (x.next.load === today || x.next.load === tmr)) ev.push([x.next.load, 'день', x.id, (x.next.from || '?') + ' → ' + (x.next.to || '?'), false]); });
    ev.sort((a, b) => a[0].localeCompare(b[0]) || (a[1] === 'день') - (b[1] === 'день') || a[1].localeCompare(b[1]));
    const evH = d => { const l = ev.filter(e => e[0] === d).slice(0, 6); return l.length ? '<li class="day">' + (d === today ? 'Сьогодні' : 'Завтра, ' + dd(d)) + '</li>' + l.map(e => '<li><span class="tm">' + esc(e[1]) + '</span><button type="button" class="linkbtn" data-msel="' + esc(e[2]) + '">' + mPlate(e[2]) + '</button><span class="tx' + (e[4] ? ' b' : '') + '">' + esc(e[3]) + '</span></li>').join('') : ''; };
    const now = new Date();
    return '<section class="bp-sec"><div class="bp-ttl"><h2 id="m51SumT">Парк зараз</h2><span class="bp-cap">' + DOWS[now.getDay()] + ' ' + dd(isoDay(now)) + ' · ' + hhmm(now.toISOString()) + '</span></div>' +
      '<div class="sum4"><div class="' + (nBad ? 'b' : '') + '"><b>' + nBad + '</b><span>потребують дії</span></div><div><b>' + nTrip + '</b><span>у рейсі</span></div><div><b>' + nFree + '</b><span>вільні</span></div><div class="' + (nIdle ? 'w' : '') + '"><b>' + nIdle + '</b><span>простій</span></div></div></section>' +
      '<section class="bp-sec"><h3>Спершу зробити</h3>' + (first.length ? '<ol class="first">' + first.slice(0, 3).map(f => '<li><span>' + esc(f[0]) + '<span class="s">' + esc(f[1]) + '</span></span><button type="button" class="btn small" ' + f[3] + '>' + esc(f[2]) + '</button></li>').join('') + '</ol>' : '<p class="hcalm">' + svgI(ST_ICO.ok) + ' Термінового немає</p>') + '</section>' +
      '<section class="bp-sec"><h3>Найближчі події по парку</h3>' + (ev.length ? '<ul class="agenda">' + evH(today) + evH(tmr) + '</ul>' : '<p class="muted small">На сьогодні й завтра подій за датами немає.</p>') + '</section>' +
      '<section class="bp-sec"><p class="hint5">' + svgI(BP_ICO.clock).replace('class="ico"', 'class="ico" aria-hidden="true"') + '<span>Клік по машині — тут її рейс. <kbd>↑</kbd> <kbd>↓</kbd> — по списку, <kbd>/</kbd> — пошук.</span></p></section>';
  }

  /* ── малювання ── */
  function m51Side() { const box = $('m51'); if (!box) return; const open = !$('bPanel').hidden && $('bPanel').parentNode === $('m51Side');
    box.classList.toggle('side-off', !open); if ($('m51Sum')) { $('m51Sum').hidden = true; $('m51Sum').innerHTML = ''; } }
  let mRows = [];
  function mDraw() {
    const box = $('m51'); if (!box) return;
    hPhoneWas = hPhone();
    const ae = document.activeElement, fk = ae && box.contains(ae) ? (ae.dataset.mid ? '[data-mid="' + ae.dataset.mid + '"]' : ae.dataset.mdrop ? '[data-mdrop="' + ae.dataset.mdrop + '"]' : ae.dataset.mst ? '[data-mst="' + ae.dataset.mst + '"]' : '') : '';
    mRows = board ? board.trucks.map(mRow) : [];
    const D = mDrops();
    $('m51Chips').innerHTML = mChipsHtml(D);
    if (mDropId) mDropDraw(D);
    const vis = mVisible(mRows), all = mRows.filter(r => kOk(r.x));
    $('m51Flow').innerHTML = board ? mFlowHtml(mRows) : '';
    if (board) { const P = mPlanHtml(mVisible(mRows)); $('m51PlanSum').innerHTML = P.sum; $('m51PlanB').innerHTML = P.body; $('m51Plan').hidden = false; } else $('m51Plan').hidden = true;
    $('m51Tags').innerHTML = mTagsHtml();
    $('m51List').innerHTML = board ? mListHtml(mRows) : (homeLErr && !board ? '<p class="msg">' + esc(homeLErr) + '</p>' : hSk(6));
    $('m51Cnt').textContent = board ? (vis.length === all.length ? all.length + ' ' + plural(all.length, 'машина', 'машини', 'машин') : vis.length + ' з ' + all.length) : '';
    const now = new Date();
    $('m51Sub').innerHTML = esc(now.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })) + (board ? ' · ' + all.length + ' ' + plural(all.length, 'машина', 'машини', 'машин') + ' · ' + all.filter(r => r.t).length + ' у рейсі' : '') + ' · <span id="hAgo">' + esc(hAgo()) + '</span>' + (board && board.pos && board.pos.at ? ', GPS ' + esc(hhmm(board.pos.at)) : '');
    document.querySelectorAll('#m51 [data-msort]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.msort === mSort())));
    document.querySelectorAll('#m51 [data-hk]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hk === hKind)));
    { const n = (hKind !== 'all' ? 1 : 0) + (mSort() !== 'prob' ? 1 : 0) + (M.stage ? 1 : 0); $('m51Flt').innerHTML = 'Фільтр' + (n ? ' <small>' + n + '</small>' : ''); }
    $('m51Mine').setAttribute('aria-pressed', String(mMine())); $('m51Mine').hidden = !lgMany();
    m51Side();   // v52: «Парк зараз» прибрано (рішення 27.11) — праворуч лише рейс вибраної машини, без вибору список на всю ширину
    if (fk) { const f = box.querySelector(fk); if (f) f.focus({ preventScroll: true }); }
  }
  /** Каркас головної логіста — один раз на показ; далі mDraw лише перемальовує частини (панель машини не скидається). */
  function mSkel() {
    return '<div id="m51" class="m51">' +
      '<div class="m51-hd"><span class="m51-meta"><span class="m51-sub" id="m51Sub"></span><button type="button" class="m51-ref" id="m51Ref" title="Оновити зараз" aria-label="Оновити дані">↻</button></span><span class="m51-acts">' +
        (canTrip() && !me.viewAs ? '<button type="button" class="primary small" id="m51New">+ Новий рейс</button>' : '') + '</span></div>' +
      '<div class="m51-drops"><div class="dbar" id="m51Chips" role="toolbar" aria-label="Розгортки: RMPD, справи, причепи, документи, показники"></div><div class="drop" id="m51Drop" role="region" hidden></div></div>' +
      '<div class="m51-work"><div class="m51-l">' +
        '<div class="lbar"><label class="m51-q"><span class="sr">Знайти машину</span><input id="m51Q" type="search" placeholder="Знак, водій, місто" autocomplete="off" enterkeyhint="search"><kbd aria-hidden="true">/</kbd></label>' +
          '<button type="button" class="btn small m51-flt" id="m51Flt" aria-expanded="false" aria-controls="m51FltP">Фільтр</button><span class="m51-tags" id="m51Tags"></span>' +   // v52 (принцип 2): на виду пошук і один «Фільтр»
          '<button type="button" class="btn small m51-mine" id="m51Mine" aria-pressed="false" hidden title="Машини, чий рейс ви ведете, і закріплені за вами">Мої машини</button>' +
          '<span class="m51-cnt" id="m51Cnt" role="status"></span></div>' +
        '<div class="m51-fltp card" id="m51FltP" hidden><div class="fg"><span class="fl">Порядок</span><div class="seg" role="group" aria-label="Порядок">' + [['prob', 'Спершу дія'], ['stage', 'За етапом'], ['plate', 'За знаком']].map(s => '<button type="button" data-msort="' + s[0] + '" aria-pressed="false">' + s[1] + '</button>').join('') + '</div></div>' +
          '<div class="fg"><span class="fl">Які рейси</span><div class="seg" role="group" aria-label="Які рейси">' + [['all', 'Усі'], ['intl', 'ЄС'], ['dom', 'Україна']].map(k => '<button type="button" data-hk="' + k[0] + '" aria-pressed="false">' + k[1] + '</button>').join('') + '</div></div>' +
          '<p class="muted small">Етап — кнопками над «Планом роботи».</p></div>' +
        '<div class="m51-list" id="m51List" role="list" aria-label="Статуси машин"></div>' +
        '<section class="card m51-plan" id="m51Plan" aria-labelledby="m51PlanT"><div class="pl-h"><h2 id="m51PlanT">План роботи · 14 днів</h2><span class="pl-sum" id="m51PlanSum"></span></div>' +
          '<div class="flow" id="m51Flow" role="group" aria-label="Етапи зараз: клік — показати лише цей етап"></div><div id="m51PlanB"></div></section>' +
      '</div><aside class="m51-side" id="m51Side" aria-label="Вибрана машина або парк зараз"><div class="card m51-sum" id="m51Sum" aria-labelledby="m51SumT"></div></aside></div></div>';
  }
  /** Панель рейсу (bPanelOpen) живе на дошці; на головній логіста її вузол переїжджає в праву колонку. */
  function bpRescue() { const p = $('bPanel'), w = document.querySelector('#board .bwork'); if (p && w && p.parentNode !== w) { p.hidden = true; p.innerHTML = ''; w.appendChild(p); document.body.classList.remove('bpanel-on', 'bpanel-full'); bPanelX = null; } }
  function mSelect(id, from) {
    const x = board && board.trucks.find(y => y.id === id); if (!x) return;
    m51Close(); bPanelOpen(x, from || document.querySelector('#m51List [data-mid="' + id + '"]'));
  }
  function mMove(d) {
    const ids = [...document.querySelectorAll('#m51List [data-mid]')].map(r => r.dataset.mid); if (!ids.length) return;
    const i = bPanelX && !$('bPanel').hidden ? ids.indexOf(bPanelX.id) : -1, id = ids[Math.max(0, Math.min(ids.length - 1, i < 0 ? 0 : i + d))];
    mSelect(id); const r = document.querySelector('#m51List [data-mid="' + id + '"]'); if (r) { r.focus({ preventScroll: true }); r.scrollIntoView({ block: 'nearest' }); }
  }
  function mBind() {
    const box = $('m51');
    $('m51Q').value = M.q;
    $('m51Q').addEventListener('input', () => { M.q = $('m51Q').value; mDraw(); const v = mVisible(mRows); if (v.length === 1 && M.q.trim().length >= 3 && bWide()) mSelect(v[0].x.id, $('m51Q')); });
    $('m51Q').addEventListener('keydown', e => { if (e.key === 'Escape' && $('m51Q').value && !mDropId) { e.preventDefault(); e.stopPropagation(); $('m51Q').value = ''; M.q = ''; mDraw(); } });
    $('m51Ref').onclick = () => logLoad(true);
    if ($('m51New')) $('m51New').onclick = () => tripForm(null, {});
    box.addEventListener('click', e => {
      const c = e.target.closest('[data-mdrop]'); if (c) { mDropOpen(mDropId === c.dataset.mdrop && c.closest('#m51Chips') ? '' : c.dataset.mdrop, !c.closest('#m51Chips')); return; }
      if (e.target.closest('.m51-dx')) { const id = mDropId; m51Close(); const ch = document.querySelector('#m51Chips [data-mdrop="' + id + '"]'); if (ch) ch.focus(); return; }
      const so = e.target.closest('[data-msort]'); if (so) { mSet('sort', so.dataset.msort); mDraw(); return; }
      const hk = e.target.closest('#m51 [data-hk]'); if (hk) { hKind = hk.dataset.hk; store.set('hKind', hKind); mDraw(); return; }
      if (e.target.closest('#m51More')) { const on = !box.classList.contains('kind-on'); box.classList.toggle('kind-on', on); $('m51More').setAttribute('aria-expanded', String(on)); if (on) { const b = box.querySelector('#m51Kind [aria-pressed="true"]') || box.querySelector('#m51Kind button'); if (b) b.focus(); } return; }
      if (e.target.closest('#m51Flt')) { const p = $('m51FltP'), on = p.hidden; p.hidden = !on; $('m51Flt').setAttribute('aria-expanded', String(on)); if (on) { const b = p.querySelector('[aria-pressed="true"]'); if (b) b.focus(); } return; }
      const tg = e.target.closest('[data-mtag]'); if (tg) { const k = tg.dataset.mtag; if (k === 'hk') { hKind = 'all'; store.set('hKind', 'all'); } else if (k === 'sort') mSet('sort', 'prob'); else M.stage = ''; mDraw(); return; }
      if (e.target.closest('#m51Mine')) { mSet('mine', mMine() ? '0' : '1'); mDraw(); return; }
      const fs = e.target.closest('[data-mst]'); if (fs) { M.stage = M.stage === fs.dataset.mst ? '' : fs.dataset.mst; mDraw(); return; }
      const rm = e.target.closest('[data-mrmpd]'); if (rm) { const x = board.trucks.find(y => y.id === rm.dataset.mrmpd); m51Close(); if (x && x.trip) openTrip(x.trip.id, 'home'); return; }
      const qs = e.target.closest('[data-mqas]'); if (qs) { const z = ((board && board.queue) || []).find(q => q.id === qs.dataset.mqas); m51Close(); queueAssign(z, qs.dataset.truck); return; }
      if (e.target.closest('[data-mqadd]')) { m51Close(); queueAddOpen(); return; }
      const qa = e.target.closest('[data-mqa]'); if (qa) { const r = mRows.find(y => y.x.id === qa.dataset.mqa); if (r && r.miss[0] && r.miss[0].key === 'rmpd' && r.t) openTrip(r.t.id, 'home'); else mSelect(qa.dataset.mqa); return; }
      const ms = e.target.closest('[data-msel]'); if (ms) { mSelect(ms.dataset.msel, ms); return; }
      const r = e.target.closest('[data-mid]'); if (r && !(bPanelX && bPanelX.id === r.dataset.mid && !$('bPanel').hidden)) mSelect(r.dataset.mid, r);
    });
    box.addEventListener('keydown', e => { const r = e.target.closest('[data-mid]'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); mSelect(r.dataset.mid, r); } });
  }
  // Esc / «/» / ↑↓ і клік поза розгорткою — раніше за загальні обробники (пошук у шапці, панель рейсу)
  document.addEventListener('keydown', e => {
    if (!mOn() || document.querySelector('.ask-wrap')) return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (e.key === 'Escape' && mDropId) { e.preventDefault(); e.stopImmediatePropagation(); const id = mDropId; m51Close(); const ch = document.querySelector('#m51Chips [data-mdrop="' + id + '"]'); if (ch) ch.focus(); return; }
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !(bPanelX && !$('bPanel').hidden && !bWide())) { e.preventDefault(); e.stopImmediatePropagation(); $('m51Q').focus(); $('m51Q').select(); return; }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !typing && !e.altKey && !mDropId && bWide() && !(e.target.closest && e.target.closest('#bPanel, #nav, #navRail, .dbar, .flow, .seg'))) { e.preventDefault(); mMove(e.key === 'ArrowDown' ? 1 : -1); }
  }, true);
  document.addEventListener('click', e => {
    if (!mDropId || !mOn() || document.querySelector('.ask-wrap')) return;
    if (e.target.closest('#m51Drop, #m51Chips')) return;
    m51Close();   // v51.1: клік поза розгорткою закриває її і далі робить своє (меню, машина, кнопка) — з першого разу
  }, true);
  /* «Закріпити за мною / Відкріпити» (панель машини): логіст — за собою, керівник / адмін — за будь-ким; у «Подивитися як…» кнопок немає */
  const mLgCan = () => !!me && !me.viewAs && LKA.indexOf(me.role) >= 0;
  function bpLgHtml(x) {
    const pin = x.logist || '', lead = x.lead || '', boss = KA.indexOf(me.role) >= 0, mine = pin && pin === me.name;
    const txt = pin ? 'Закріплено за <b>' + esc(pin) + '</b>' + (mine ? ' (ви)' : '') : 'Не закріплено';
    const by = lead && lead !== pin ? '<span class="muted"> · рейс веде ' + esc(lead) + (lead === me.name ? ' (ви)' : '') + '</span>' : '';
    let b = '';
    if (mLgCan()) {
      if (boss) b = '<button type="button" class="linkbtn" data-bplg="pick">' + (pin ? 'Змінити' : 'Закріпити за…') + '</button>' + (pin ? ' · <button type="button" class="linkbtn" data-bplg="">Відкріпити</button>' : '');
      else if (mine) b = '<button type="button" class="linkbtn" data-bplg="">Відкріпити</button>';
      else if (!pin) b = '<button type="button" class="btn small" data-bplg="me">Закріпити за мною</button>';
    }
    return '<span class="bp-lgt">' + txt + by + '</span>' + (b ? '<span class="bp-lgb">' + b + '</span>' : '');
  }
  function pickLogist(x) {
    return new Promise(res => {
      const names = ((board && board.logists) || []).slice(); if (me.role === 'логіст' && names.indexOf(me.name) < 0) names.unshift(me.name);
      const w = document.createElement('div'); w.className = 'ask-wrap';
      w.innerHTML = '<div class="ask" role="dialog" aria-modal="true" aria-labelledby="plgT"><h2 id="plgT">Закріпити ' + esc(x.id) + ' за логістом</h2><p class="muted small">Машина з\'явиться в нього у «Мої машини».</p>' +
        (names.length ? '<div class="plg-l">' + names.map(n => '<button type="button" class="btn" data-plg="' + esc(n) + '"' + (n === x.logist ? ' aria-current="true"' : '') + '>' + esc(n) + '</button>').join('') + '</div>' : '') +
        '<label for="plgIn">Інше ім\'я</label><input id="plgIn" maxlength="60" placeholder="як у «Користувачах», напр. Олена К."><div class="ask-btns"><button class="btn" data-a="0">Скасувати</button><button class="primary" data-a="1">Закріпити</button></div></div>';
      const done = v => { w.remove(); res(v); };
      w.onclick = e => { const p = e.target.closest('[data-plg]'); if (p) return done(p.dataset.plg); const b = e.target.closest('[data-a]'); if (b) done(b.dataset.a === '1' ? w.querySelector('#plgIn').value.trim() || null : null); else if (e.target === w) done(null); };
      w.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } if (e.key === 'Enter' && e.target.id === 'plgIn') { e.preventDefault(); done(e.target.value.trim() || null); } });
      dlgOpener = document.activeElement; document.body.appendChild(w); (w.querySelector('[data-plg]') || w.querySelector('#plgIn')).focus();
    });
  }
  async function bpLgSet(x, how) {
    let name = how === 'me' ? me.name : how === 'pick' ? await pickLogist(x) : '';
    if (name == null) return;
    if (!name && how === '' && !await ask('Відкріпити ' + x.id + '?', 'Машина зникне з «Мої машини» у ' + (x.logist || 'логіста') + ' (якщо він не веде її рейс).', 'Відкріпити')) return;
    busy(true);
    try { const r = await api('truck.logist', { truck: x.id, logist: name, opId: 'TL-' + newId().slice(0, 16) });
      x.logist = r.logist || ''; const y = board && board.trucks.find(z => z.id === x.id); if (y) y.logist = x.logist;
      if (board && x.logist && (board.logists = board.logists || []).indexOf(x.logist) < 0) board.logists.push(x.logist);
      try { store.set('boardCache', JSON.stringify({ login: me.login, b: board, at: boardAt })); } catch (e) {}
      toast(x.logist ? '✔ ' + esc(x.id) + ' закріплено за ' + esc(x.logist) + '.' : '✔ ' + esc(x.id) + ' відкріплено.');
      const lg = $('bpLg'); if (lg) lg.innerHTML = bpLgHtml(x); if (mOn()) mDraw(); else if (!$('board').hidden) renderBoard();
      const f = $('bpLg') && $('bpLg').querySelector('button'); if (f) f.focus(); }
    catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); }
  }

  /* ── Головна бухгалтера (v48): невеликий дашборд з дій, що вже є для ролі (inv, debts, expense) — без нових прав ── */
  async function buhLoad() {
    const box = $('buhBox'); if (!box) return; const nav = navSeq;
    let c = null; try { c = JSON.parse(store.get('buh_' + me.login) || 'null'); } catch (e) {}
    const draw = (v, loading) => {
      const card = (key, title, go, body) => '<button type="button" class="hw bcard2" data-buh="' + go + '" aria-labelledby="bk-' + key + '"><span class="hw-h"><span class="bk-h" id="bk-' + key + '">' + esc(title) + '</span><span class="hgo" aria-hidden="true">›</span></span>' + body + '</button>';
      const sk = '<span class="hsk" aria-hidden="true"><i></i><i></i></span>';
      const inv = v && v.inv, db = v && v.debts, ex = v && v.exp;
      box.innerHTML = '<div class="buhg">' +
        card('inv', 'До виставлення', 'inv', inv ? '<span class="bk-n tnum">' + inv.n + '</span><span class="bk-s">' + plural(inv.n, 'рейс', 'рейси', 'рейсів') + ' без рахунку</span>' + (inv.blocked ? '<span class="tag warn">заблоковано: ' + inv.blocked + '</span>' : inv.n ? '<span class="tag ok">усі можна виставити</span>' : '') : (loading ? sk : '<span class="muted small">немає даних</span>')) +
        card('debts', 'Боржники', 'debts', db ? '<span class="bk-n tnum">' + db.clients + '</span><span class="bk-s">' + plural(db.clients, 'клієнт', 'клієнти', 'клієнтів') + ' з простроченням</span><span class="bk-m">' + esc(frTxt(db.sum)) + '</span>' : (loading ? sk : '<span class="muted small">немає даних</span>')) +
        card('exp', 'Витрати водіїв', 'exp', ex ? '<span class="bk-n tnum">' + ex.fresh + '</span><span class="bk-s">на перевірку</span>' + (ex.ask ? '<span class="tag warn">з питанням: ' + ex.ask + '</span>' : '') : (loading ? sk : '<span class="muted small">немає даних</span>')) + '</div>';
    };
    draw(c, true);
    const [inv, db, ex] = await Promise.all([api('inv').catch(() => null), api('debts').catch(() => null), api('expense', { days: 31 }).catch(() => null)]);
    if (nav !== navSeq || $('home').hidden) return;
    const v = { inv: inv && inv.todo ? { n: inv.todo.length, blocked: inv.todo.filter(x => x.check).length } : null,
      debts: db && db.clients ? { clients: db.clients.filter(g => Object.keys(g.recent || {}).length).length, sum: (db.total && db.total.recent) || {} } : null,
      exp: ex && ex.list ? { fresh: ex.list.filter(x => !x.status || x.status === 'нова').length, ask: ex.list.filter(x => x.status === 'питання').length } : null };
    try { store.set('buh_' + me.login, JSON.stringify(v)); } catch (e) {}
    draw(v, false);
  }
  $('homeWork').addEventListener('click', e => { const b = e.target.closest('[data-buh]'); if (!b || !me || me.role !== 'бухгалтер') return; const a = b.dataset.buh; if (a === 'inv') openInv(); else if (a === 'debts') openDebts(); else openExp(); });
  /** Рейс із заявки: повний рядок заявки → та сама форма «Новий рейс», що з таблиці заявок. */
  async function orderToTrip(zid) {
    if (!canTrip()) return toast('Створювати рейси можуть логіст, керівник і бухгалтер.');
    busy(true); let z = null;
    try { const r = await api('list', { sheet: 'Заявки', filter: { 'Заявка ID': zid } }); z = r && r.rows && r.rows[0]; } catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); }
    if (!z) return toast('Заявку ' + esc(zid) + ' не знайдено — оновіть дошку.', 'err');
    tripForm(null, { order: z });
  }
  /* Журнал змін рейсу (етап 2 дизайну): хто, коли, що було → що стало. Логісту — без зарплатних полів (сервер). */
  async function jrnLoad(tid, box) {
    box.innerHTML = '<p class="muted small">Завантажую…</p>';
    try {
      const r = await api('trip.journal', { tripId: tid }), l = r.list || [];
      if (!l.length) { box.innerHTML = '<p class="muted small">Змін через програму ще не було.</p>'; return; }
      const row = j => '<li><span class="jr-at">' + esc(tkTime(j.at)) + '</span> <b>' + esc(j.who.replace(/ \([^)]*\)$/, '')) + '</b> · ' + esc(j.col) +
        (j.was || j.now ? ': <span class="jr-was">' + esc(j.was || '—') + '</span> → ' + esc(j.now || '—') : '') + '</li>';
      box.innerHTML = '<ul class="jr-list">' + l.slice(0, 15).map(row).join('') + '</ul>' + (l.length > 15 ? '<button type="button" class="btn small" id="jrMore">Ще ' + (l.length - 15) + '</button>' : '');
      const m = box.querySelector('#jrMore'); if (m) m.onclick = () => { box.querySelector('.jr-list').innerHTML = l.map(row).join(''); m.remove(); };
    } catch (e) { box.innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  /* ── Бокова панель рейсу (P2): клік по рядку на широкому екрані — деталі справа, дошка лишається на місці ── */
  let bPanelX = null, bPanelFrom = null, bPanelSeq = 0;
  const bWide = () => window.innerWidth >= 1200;
  function markPanelRow() { document.querySelectorAll('#m51List [data-mid]').forEach(r => r.setAttribute('aria-pressed', String(!$('bPanel').hidden && !!bPanelX && r.dataset.mid === bPanelX.id)));
    m51Side();
    document.querySelectorAll('#bRows tr.brow').forEach(r => { const on = !$('bPanel').hidden && bPanelX && r.dataset.truck === bPanelX.id; r.classList.toggle('sel', on); const o = r.querySelector('.bopen'); if (o) o.setAttribute('aria-expanded', String(on)); }); }
  function bPanelClose() {
    const p = $('bPanel'); if (p.hidden) return; p.hidden = true; p.innerHTML = ''; document.body.classList.remove('bpanel-on', 'bpanel-full'); navAuto(); markPanelRow();
    const f = bPanelX && document.querySelector('#bRows tr[data-truck="' + bPanelX.id + '"] .bopen, #m51List [data-mid="' + bPanelX.id + '"]'); bPanelX = null; if (f) f.focus(); else if (bPanelFrom) try { bPanelFrom.focus(); } catch (e) {}
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.defaultPrevented && !$('bPanel').hidden && !document.querySelector('.ask-wrap') && !navOpenNow && $('userPop').hidden && !$('gs').contains(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); bPanelClose(); } });
  /* ── v50 (П1, дизайн v0.3): панель рейсу як у прототипі — шапка, «Рух зараз», «Що не закрито», хронологія статусів ── */
  const durTxt = min => { min = Math.max(0, Math.round(min)); if (min < 60) return min + ' хв'; if (min < 1440) { const h = Math.floor(min / 60), m = min % 60; return h >= 10 || !m ? h + ' год' : h + ' год ' + String(m).padStart(2, '0') + ' хв'; } return Math.floor(min / 1440) + ' дн'; };
  const hhmm = iso => { const d = new Date(iso); return isNaN(d) ? '' : pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
  const whenTxt = iso => { const d = new Date(iso); if (isNaN(d)) return ''; return d.toDateString() === new Date().toDateString() ? hhmm(iso) : tkTime(iso); };
  /** Рух машини зараз (Freetrack, FT_POS): «їде 2 год 10 хв» / «стоїть 1 год 07 хв». Без позиції — null (не вигадуємо). */
  function bMove(x) {
    const P = board && board.pos, p = P && P.trucks && P.trucks[x.id]; if (!p) return null;
    const from = p.moving ? p.moveFrom : p.since, min = from ? (Date.now() - new Date(from)) / 60000 : null;
    return { moving: !!p.moving, min, place: String(p.place || '').replace(/^≈ /, ''), stale: !!P.stale, at: P.at, speed: p.speed, lat: p.lat, lon: p.lon,
      text: (p.moving ? 'їде' : 'стоїть') + (min != null && min >= 0 ? ' ' + durTxt(min) : '') };
  }
  const BP_ICO = { go: ST_ICO.go, stop: PROB.trip, file: PROB.doc, alert: PROB.drv, pin: PROB.gps, clock: PROB.trip, ok: 'M5 12l5 5L20 7', back: 'M15 6l-6 6 6 6', x: 'M6 6l12 12M18 6L6 18', plus: 'M12 5v14M5 12h14' };
  const CUR_S = { EUR: '€', USD: '$', PLN: 'zł', UAH: 'грн' };
  const money0 = n => Math.round(n).toLocaleString('uk-UA').replace(/ /g, ' ');
  function bFreight(t) {
    if (!t.freight) return '';
    const cur = t.cur || 'EUR', r = board && board.rates && board.rates[cur];
    return '<span class="num">' + money0(t.freight) + ' ' + esc(CUR_S[cur] || cur) + '</span>' + (cur !== 'UAH' && r ? ' <span class="muted" title="курс НБУ' + (board.rates.date ? ' на ' + esc(board.rates.date) : '') + ': ' + esc(String(r)) + '">= ' + money0(t.freight * r) + ' грн</span>' : '');
  }
  const bpSec = (h, body, attrs) => '<section class="bp-sec"' + (attrs || '') + '>' + (h ? '<h3>' + h + '</h3>' : '') + body + '</section>';
  const bpKv = (k, v) => v ? '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>' : '';
  /** «Рух зараз»: одразу з позиції дошки; «Було» і км — після board.moves. */
  function bpMoveHtml(x, mv, mvx) {
    const cur = mv || null, km = mvx && mvx.km;
    if (!cur) return '<p class="muted bp-nodata">Немає даних Freetrack про цю машину' + (x.gps ? ' · ' + esc(gpsText(x.gps)) : '') + '.</p>';
    const link = cur.lat != null ? 'https://www.google.com/maps?q=' + cur.lat + ',' + cur.lon : '';
    return '<div class="bp-move"><span class="bp-mi ' + (cur.moving ? 'go' : 'stop') + '">' + svgI(cur.moving ? BP_ICO.go : BP_ICO.clock) + '</span><div><div class="m1">' + esc(cap(cur.text)) + (cur.moving && cur.speed ? ' <span class="muted">· ' + esc(cur.speed) + ' км/год</span>' : '') + '</div>' +
      '<div class="m2">' + (link ? '<a class="link link-quiet" target="_blank" rel="noopener" href="' + link + '" title="Відкрити на карті">' + esc(cur.place || 'на карті') + '</a>' : esc(cur.place)) + (cur.stale ? ' · <span class="bpw">дані давні (вночі не оновлюється)</span>' : '') + '</div></div>' +
      (km ? '<span class="bp-km">' + (km.today ? 'сьогодні' : 'вчора') + '<br><b>' + esc(km.km) + ' км</b></span>' : '') + '</div>';
  }
  const MV_T = { drive: 'В дорозі', stop: 'Стоянка', short: 'Зупинка', rest: 'Відпочинок', cust: 'Митниця' };
  function bpHistHtml(segs) {
    return '<ul class="bp-mh">' + segs.map(s => '<li><span class="tm">' + esc(whenTxt(s.from)) + (s.ongoing ? ' → зараз' : '–' + esc(hhmm(s.to))) + '</span><i class="k ' + esc(s.type) + '" aria-hidden="true"></i><span><b>' + esc(MV_T[s.type] || s.type) + ' ' + esc(durTxt(s.min)) + '</b>' +
      (s.place ? ' · ' + esc(s.place) : '') + (s.step ? ' <span class="sub">— крок водія «' + esc(s.step) + '»</span>' : '') + '</span></li>').join('') + '</ul>';
  }
  /** Сітка/панель: на ≥ 1200 — картка праворуч у сітці дошки; вужче — на весь екран із «‹ Дошка». */
  async function bPanelOpen(x, from) {
    const p = $('bPanel'), seq = ++bPanelSeq; bPanelX = x; bPanelFrom = from || null;
    const onHome = !$('home').hidden && !!$('m51Side'), host = onHome ? $('m51Side') : document.querySelector('#board .bwork');   // v51: та сама панель — і на головній логіста
    if (host && p.parentNode !== host) host.appendChild(p);
    const t = x.trip, tid = t && !t.order ? t.id : '', office = ['адмін', 'керівник', 'логіст'].indexOf(me.role) >= 0, ro = !!me.viewAs, wr = office && !ro, ct = canTrip() && !ro;   // v51: у «Подивитися як…» — без кнопок змін
    const dName = x.drivers.map(d => d.name).join(', '), ph = (x.drivers.find(d => d.phone) || {}).phone || '';
    const mv = bMove(x);
    const back = '<div class="bp-mback"><button type="button" class="bp-back">' + svgI(BP_ICO.back) + (onHome ? 'Машини' : 'Дошка') + '</button></div>';
    const lgH = LKA.indexOf(me.role) >= 0 && lgMany() ? '<div class="bp-lg" id="bpLg">' + bpLgHtml(x) + '</div>' : '';   // v51: «Мої машини» — закріплення
    const fit = !tid && typeof mFit === 'function' ? mFit(x) : null;
    const fitH = fit ? bpSec('Що далі', '<div class="qc bp-fit"><div class="top2"><span>Підходить <span class="plate trl">' + esc(fit.trailer || '?') + '</span></span><span>' + (fit.waitDays ? 'чекає ' + fit.waitDays + ' дн' : 'сьогодні') + '</span></div><p><b>' + tripText(fit) + '</b><br><span class="muted">' + esc([fit.load && 'завантажено ' + dd(fit.load), fit.cargo].filter(Boolean).join(' · ')) + '</span></p>' +
      '<div class="row1"><span class="muted small">те саме місто: ' + esc(fit.from || '') + '</span>' + (canQueue() ? '<button type="button" class="btn small primary" data-bpfit="' + esc(fit.id) + '">Призначити</button>' : '') + '</div></div>') : '';
    const xBtn = '<button type="button" class="bp-x" aria-label="Закрити панель (Esc)">' + svgI(BP_ICO.x) + '</button>';
    const plates = '<div class="bp-plates"><span class="plate ua">' + esc(x.id) + '</span>' + (x.trailer ? '<span class="plate trl" title="причіп">' + esc(x.trailer) + '</span>' : '') +
      (dName ? '<span class="bp-who">' + esc(dName) + '</span>' : '<span class="muted">водія не вказано</span>') + (ph ? ' · <a class="link link-quiet" href="tel:' + esc(ph.replace(/[^\d+]/g, '')) + '">' + esc(ph) + '</a>' : '') + '</div>';
    const docs = bProbs(x).filter(q => q.k === 'doc' || q.k === 'tir');
    const nextH = x.next ? bpSec('Далі', '<div class="bp-next"><b>' + dd(x.next.load) + ' ' + tripText(x.next) + '</b> <span class="muted">' + (x.next.order ? 'заявка ' + esc(x.next.id) + (x.next.status ? ' · ' + esc(x.next.status) : '') : esc(x.next.id)) + '</span>' +
      (x.next.order && ct ? '<div><button type="button" class="btn small" data-bpz="' + esc(x.next.id) + '">Створити рейс із заявки</button></div>' : !x.next.order ? '<div><a href="#" class="tlink" data-trip="' + esc(x.next.id) + '">Відкрити ' + esc(x.next.id) + '</a></div>' : '') + '</div>') : '';
    const docH = docs.map(q => '<li class="' + (q.urgent ? 'bad' : 'warn') + '"><span class="bp-m" aria-hidden="true">✕</span><span>' + esc(q.t) + '</span></li>').join('');
    const echH = '<li><span class="bp-m" aria-hidden="true">·</span><span>єЧерга: ' + (x.ech ? esc(echShort(x.ech)) : 'листів немає') + '</span>' + (() => { const pl = (x.ech && x.ech.plate) || echLatin(x.plate); return pl ? '<a class="bp-a" target="_blank" rel="noopener" href="https://echerha.gov.ua?plate_number=' + encodeURIComponent(pl) + '">Черга ↗</a>' : ''; })() + '</li>';
    const drvH = x.drive ? '<div class="bp-drv">' + driveHtml(x) + '</div>' : '';
    const drvBtn = x.drive && x.drive.worker ? '<button class="btn tdrv" data-tdrv="' + esc(x.drive.worker) + '" data-truck="' + esc(x.id) + '" data-name="' + esc(dName) + '">Час водія</button>' : '';
    p.hidden = false; document.body.classList.add('bpanel-on'); document.body.classList.toggle('bpanel-full', !bWide()); navAuto(); markPanelRow();
    if (!tid) {   // без поточного рейсу: машина, останній рейс, «Далі», документи
      const l = x.last;
      p.innerHTML = back + '<section class="bp-sec bp-top"><div class="bp-ttl"><h2 id="bpTitle">Машина ' + esc(x.id) + '</h2>' + badgeOf(x) + xBtn + '</div>' + plates +
        '<div class="bp-big">' + bStateHtml(x) + '</div>' + (l ? '<div class="bp-sub">останній рейс ' + tripLink(l) + ' · ' + tripText(l) + (l.unload ? ' · розвантаження ' + dd(l.unload) : '') + '</div>' : '') + lgH + '</section>' +
        bpSec('Рух зараз' + (mv && mv.at ? ' <span class="bp-cap">GPS ' + esc(hhmm(mv.at)) + '</span>' : ''), bpMoveHtml(x, mv) + drvH) + fitH + nextH +
        bpSec('Документи і черга', '<ul class="bp-list">' + (docH || '<li><span class="bp-m">✓</span><span>Документи — без зауважень</span></li>') + echH + '</ul>') +
        '<div class="bp-act">' + (ct ? '<button type="button" class="primary" data-bpnew="' + esc(x.id) + '">+ Новий рейс для ' + esc(x.id) + '</button>' : '') + drvBtn + '</div>';
      bindPanel(x, null); p.scrollTop = 0; p.focus({ preventScroll: onHome }); return;
    }
    const ev = t.st && t.st.event, intl = !!t.cross && echIntl(t.type, t.cross);
    p.innerHTML = back + '<section class="bp-sec bp-top"><div class="bp-ttl"><h2 id="bpTitle"><span class="sr">Рейс </span>' + esc(tid) + '</h2>' + badge(ST_GRP[ev] || 'go', ev ? cap(ev) : 'В рейсі') + xBtn + '</div>' +
      '<div class="bp-route">' + esc(t.from || '?') + ' — ' + esc(t.to || '?') + '</div>' + plates +
      '<dl class="bp-kv">' + bpKv('Клієнт', esc(t.client || '')) + bpKv('Тип', esc([t.type, t.adr ? 'АДР' : ''].filter(Boolean).join(', '))) + bpKv('Перехід', esc(t.cross || '')) + bpKv('Фрахт', bFreight(t)) +
        bpKv('Дати', 'завантаження ' + (dd(t.load) || '?') + ' · розвантаження ' + (t.unload ? dd(t.unload) : '<span class="bpr">не вказано</span>')) + '</dl>' + lgH + '</section>' +
      bpSec('Рух зараз' + (mv && mv.at ? ' <span class="bp-cap">GPS ' + esc(hhmm(mv.at)) + '</span>' : ''), '<div id="bpMoveNow">' + bpMoveHtml(x, mv) + '</div>' + drvH + '<details class="bp-fold" id="bpMv"><summary>Рух і зупинки · план до розвантаження</summary><div id="bpMvBody"><p class="muted small">Завантажую…</p></div></details>', ' id="bpMoveSec"') +
      bpSec('Що не закрито <span class="count-pill" id="bpOpenN">…</span>', '<ul class="bp-open" id="bpProb"><li class="muted"><span></span><span>Перевіряю RMPD, адреси, проблеми…</span></li></ul>', ' id="bpOpenSec"') +
      bpSec('Статуси', '<ol class="bp-tl2" id="bpSteps"></ol><div id="bpMark"></div>') + nextH +
      '<section class="bp-sec"><details class="bp-fold" id="bpMore"><summary>Документи · RMPD · адреси · історія змін</summary><h4 class="bp-h">Перед кордоном</h4><ul class="bp-list" id="bpBorder"><li class="muted"><span class="bp-m">…</span><span>Перевіряю RMPD і адреси…</span></li>' + docH + echH + '</ul>' +
        '<h4 class="bp-h">Історія змін</h4><div id="bpJrn"><button type="button" class="btn small" id="bpJrnB">Хто і що змінював</button></div></details></section>' +
      ((office && echIntl(t.type, t.cross)) || drvBtn ? '<section class="bp-sec bp-more">' + (office && echIntl(t.type, t.cross) ? '<button type="button" class="btn small" id="bpEch">Підготувати реєстрацію в єЧергу</button>' : '') + (drvBtn ? drvBtn.replace('class="btn tdrv"', 'class="btn small tdrv"') : '') + '</section>' : '') +
      '<div class="bp-act">' + (ct ? '<button type="button" class="btn" id="bpEdit">' + svgI('M4 20h4L19 9l-4-4L4 16zM14 6l4 4') + 'Виправити</button>' : '') + '<button type="button" class="primary" id="bpFull">' + svgI('M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5') + 'Повна картка</button>' +
'</div>';
    bindPanel(x, tid); p.scrollTop = 0; p.focus({ preventScroll: onHome });   // v51: на головній сторінка не стрибає
    $('bpJrnB').onclick = () => jrnLoad(tid, $('bpJrn'));
    let st = null, td = null, mvx = null;
    try { [st, td, mvx] = await apiBatch([{ action: 'trip.status', tripId: tid, who: true }, { action: 'tripdoc', tripId: tid }, { action: 'board.moves', truck: x.id, tripId: tid }]); } catch (e) { st = e; }
    if (seq !== bPanelSeq || p.hidden) return;
    if (st instanceof Error || !st) { $('bpProb').innerHTML = '<li class="bad"><span></span><span>' + esc((st && st.message) || 'Не вдалося завантажити') + '</span></li>'; $('bpOpenN').textContent = '?'; return; }
    if (td instanceof Error) td = null; if (mvx instanceof Error) mvx = null;
    const reload = async () => { if (onHome) await hBoardFetch(true, hLive(navSeq, me.login)); else await openBoard(true); const nx = board && board.trucks.find(y => y.id === x.id); if (nx) bPanelOpen(nx, bPanelFrom); };
    const steps = st.steps || [], last = steps.map(s => !!s.at).lastIndexOf(true), done = k => steps.some(s => s.step === k && s.at);
    const passed = last >= 0 && ['кордон пройдено', 'розмитнення', 'на розвантаженні', 'розвантажено'].indexOf(steps[last].step) >= 0;
    const r = (td && td.rmpd) || st.rmpd, a = (td && td.addr) || st.addr || {}, need = (td && td.need) || [];
    // «Рух зараз» — поточний відрізок і «Було» / «План»
    if (mvx && mvx.km) $('bpMoveNow').innerHTML = bpMoveHtml(x, mv, mvx);
    const e = x.ech, plan = [];
    const aTxt = k => a[k] ? '<a class="link link-quiet" target="_blank" rel="noopener" href="' + esc(mapsUrl(a[k])) + '">' + esc(a[k]) + '</a>' : '<span class="bpr">адреса не вписана</span>';
    if (intl && !done('замитнення') && last < steps.findIndex(s => s.step === 'замитнення')) plan.push(['—', 'Замитнення', aTxt('cOut')]);
    if (intl && !done('на кордоні') && !passed) plan.push([e && e.call ? '≈ ' + whenTxt(e.call) : e && e.eta ? esc(e.eta) : '—', 'Кордон ' + esc(t.cross), e ? '<span class="sub">єЧерга' + (e.queue ? ' №' + esc(e.queue) : '') + ' · ' + esc(e.state) + (e.call ? ', виклик о ' + esc(hhmm(e.call)) : '') + '</span>' : '<span class="sub">єЧерга: листів немає</span>']);
    if (intl && !done('розмитнення')) plan.push(['—', 'Розмитнення', aTxt('cIn')]);
    if (!done('на розвантаженні') && !done('розвантажено')) plan.push([t.unload ? dd(t.unload) : 'не вказано', 'Розвантаження', esc(t.to || '') + ' · ' + aTxt('unload')]);
    const segs = (mvx && mvx.segs) || [];
    $('bpMvBody').innerHTML = (segs.length ? '<div class="mh-h">Було (Freetrack)</div>' + bpHistHtml(segs) : '<p class="muted small">Відрізків руху Freetrack за останню добу немає.</p>') +
      (plan.length ? '<div class="mh-h">План</div><ul class="bp-mh">' + plan.map(q => '<li><span class="tm">' + q[0] + '</span><i class="k plan" aria-hidden="true"></i><span><b>' + q[1] + '</b> · ' + q[2] + '</span></li>').join('') + '</ul>' : '');
    // «Що не закрито»: що блокує кордон — першим
    const open = [];
    const row = (cls, ico, txt, sub, act) => open.push('<li><span class="' + cls + '">' + svgI(ico) + '</span><span>' + txt + (sub ? '<span class="s">' + sub + '</span>' : '') + '</span>' + (act || '<span></span>') + '</li>');
    const nearB = !!(e && /черз|готуйт|виклик/.test(e.state)) || !!(x.gpsHint && /кордон/.test(x.gpsHint.step || ''));
    if (r && !passed && r.state === 'none') row('bpr', BP_ICO.file, 'RMPD не надіслано', nearB ? 'біля кордону — першим' : 'потрібен до кордону · надішліть у бот RMPD', '<button type="button" class="btn small" data-bpo="rmpd">Відкрити</button>');
    if (r && !passed && r.state === 'warn') row('bpr', BP_ICO.file, 'RMPD: ' + esc(r.label), 'розбіжність із CMR', '<button type="button" class="btn small" data-bpo="rmpd">Звірити</button>');
    const probs = (st.problems || []).filter(q => q.state !== 'вирішено'), canAns = q => me.role !== 'логіст' || q.owner !== 'керівник';
    probs.forEach(q => {
      const main = q.state !== 'в роботі' ? ['в роботі', 'Беру в роботу'] : canAns(q) ? ['вирішено', 'Вирішено…'] : null;
      const more = [q.state !== 'в роботі' && canAns(q) ? ['вирішено', 'вирішено…'] : null, me.role === 'логіст' && q.owner !== 'керівник' ? ['керівнику', 'керівнику…'] : null].filter(Boolean);
      row('bpr', BP_ICO.alert, esc(q.text), 'проблема водія · ' + esc(whenTxt(q.at)) + ' · ' + esc(q.state || 'нова') + (q.owner === 'керівник' ? ' · вирішує керівник' : '') + (q.answer ? ' · відповідь: ' + esc(q.answer) : '') +
        (wr ? more.map(m => ' · <button type="button" class="linkbtn" data-bpa="' + m[0] + '" data-pid="' + esc(q.id) + '">' + m[1] + '</button>').join('') : ''),
        wr && main ? '<button type="button" class="btn small" data-bpa="' + main[0] + '" data-pid="' + esc(q.id) + '">' + main[1] + '</button>' : '');
    });
    const miss = Object.keys(ADDR_L).filter(k => need.indexOf(k) >= 0 && !a[k]);
    if (miss.length) row('bpw', BP_ICO.pin, 'Адреси: бракує ' + miss.length, esc(miss.map(k => ADDR_L[k].toLowerCase()).join(', ')), wr ? '<button type="button" class="btn small" data-bpo="addr">Вписати</button>' : '');
    if (!t.unload) row('bpw', BP_ICO.clock, 'Дата розвантаження не вказана', '', ct ? '<button type="button" class="btn small" data-bpo="unl">Поставити</button>' : '');
    $('bpOpenN').textContent = open.length; $('bpOpenN').className = 'count-pill' + (open.length ? ' bad' : ' ok');
    $('bpProb').innerHTML = open.length ? open.join('') : '<li class="bp-allok"><span class="bpg">' + svgI(BP_ICO.ok) + '</span><span>Усе закрито</span><span></span></li>';
    // v51: на телефоні червоне (RMPD біля кордону, проблема водія) — вище за «Рух зараз»
    if (window.innerWidth < 768 && open.some(h => h.indexOf('<span class="bpr">') === 4)) { const ms = $('bpMoveSec'), os = $('bpOpenSec'); if (ms && os) { ms.parentNode.insertBefore(os, ms); os.classList.add('bp-first'); } }
    // «Статуси» — вертикальна хронологія: хто (водій / офіс за водія · ім'я), поточний — «N год тому», майбутні — план
    const who = s => s.by === 'водій' ? 'водій' : s.by === 'офіс' ? 'офіс за водія' + (s.name ? ' · ' + esc(s.name) : '') : '';
    const planOf = s => s.step === 'на кордоні' && e && (e.call || e.eta) ? 'план ' + (e.call ? whenTxt(e.call) : esc(e.eta)) : s.step === 'на розвантаженні' ? 'план ' + (t.unload ? dd(t.unload) : 'не вказано') : '';
    const li = [];
    if (st.planned) li.push('<li class="done"><span class="dot"></span><span class="nm">Заплановано</span><small>' + esc(tkTime(st.planned.at)) + '<span class="wh">офіс' + (st.planned.name ? ' · ' + esc(st.planned.name) : '') + '</span></small></li>');
    steps.forEach((s, i) => {
      const nm = '<span class="nm">' + esc(cap(s.step)) + '</span>';
      if (i === last) li.push('<li class="now" aria-current="step"><span class="dot"></span>' + nm + '<small><b>' + esc(tkTime(s.at)) + '</b><span class="wh">' + [who(s), durTxt((Date.now() - new Date(s.at)) / 60000) + ' тому'].filter(Boolean).join(' · ') + '</span></small></li>');
      else if (i < last) li.push('<li class="' + (s.at ? 'done' : 'skp') + '"><span class="dot"></span>' + nm + '<small>' + (s.at ? esc(tkTime(s.at)) + '<span class="wh">' + who(s) + '</span>' : 'пропущено') + '</small></li>');
      else { const pl = planOf(s), g = x.gpsHint && x.gpsHint.step === s.step ? 'GPS: ' + esc(x.gpsHint.text.replace(/^за GPS — /, '')) : '';
        li.push('<li class="todo"><span class="dot"></span>' + nm + '<small>' + (pl || '—') + (g ? '<span class="wh">' + g + '</span>' : '') + '</small></li>'); }
    });
    $('bpSteps').innerHTML = li.join(''); $('bpSteps').setAttribute('aria-label', 'Кроки рейсу: ' + (last + 1) + ' з ' + steps.length);
    // «Перед кордоном» (у згортці): RMPD, усі адреси з картою, документи, єЧерга
    const bl = (cls, m, txt, act) => '<li class="' + cls + '"><span class="bp-m" aria-hidden="true">' + m + '</span><span>' + txt + '</span>' + (act || '') + '</li>';
    let bh = r ? bl(r.state === 'ok' ? 'ok' : r.state === 'warn' || r.state === 'none' ? 'bad' : 'warn', r.state === 'ok' ? '✓' : r.state === 'none' ? '✕' : '!', 'RMPD: ' + esc(r.label) + (passed ? ' <span class="muted">(кордон пройдено)</span>' : ''), r.file ? '<button type="button" class="bp-a linkbtn" data-rmpd="' + esc(tid) + '" data-ver="' + esc(r.ver) + '">Відкрити</button>' : '') : bl('', '·', 'RMPD: для цього рейсу не потрібен');
    Object.keys(ADDR_L).forEach(k => { if (a[k]) bh += bl('ok', '✓', ADDR_L[k] + ': ' + esc(a[k]), '<a class="bp-a" target="_blank" rel="noopener" href="' + esc(mapsUrl(a[k])) + '">Карта ↗</a>');
      else if (need.indexOf(k) >= 0) bh += bl('bad', '✕', ADDR_L[k] + (k === 'load' || k === 'unload' ? ' — водій бачить лише місто' : ' — водій не бачить нічого'), wr ? '<button type="button" class="bp-a linkbtn" data-bpad="' + k + '">Вписати</button>' : ''); });
    $('bpBorder').innerHTML = bh + docH + echH;
    $('bpBorder').querySelectorAll('[data-rmpd]').forEach(b => b.onclick = () => rmpdOpen(b.dataset.rmpd, b.dataset.ver));
    const addrSave = async ks => {
      const v = await askForm(ks.length > 1 ? 'Адреси для водія' : ADDR_L[ks[0]] + ': точна адреса', ks.map(k => ({ id: k, label: ADDR_L[k], ph: 'вулиця, місто, індекс — або посилання з карти' })), 'Зберегти', 'Порожні поля не змінюються. Водій побачить адреси в «Навігації».');
      if (!v || !ks.some(k => v[k])) return;
      const addr = {}; Object.keys(ADDR_L).forEach(j => addr[j] = (v[j] || a[j] || '').trim());
      busy(true); try { await api('trip.addr', { tripId: tid, addr }); toast('✔ Адресу збережено — водій бачить «Навігацію».'); board = null; try { store.set('boardCache', ''); } catch (er) {} await reload(); }
      catch (er) { toast(esc(er.message), 'err'); } finally { busy(false); } };
    $('bpBorder').querySelectorAll('[data-bpad]').forEach(b => b.onclick = () => addrSave([b.dataset.bpad]));
    $('bpProb').querySelectorAll('[data-bpo]').forEach(b => b.onclick = async () => {
      const k = b.dataset.bpo;
      if (k === 'addr') return addrSave(miss);
      if (k === 'rmpd') { if (r && r.file) return rmpdOpen(tid, r.ver); bPanelClose(); return openTrip(tid, onHome ? 'home' : 'board'); }
      if (k === 'unl') { const v = await askForm('Дата розвантаження · ' + tid, [{ id: 'd', label: 'Розвантаження', type: 'date', req: true }], 'Поставити'); if (!v || !v.d) return;
        busy(true); try { await api('save', { sheet: 'Рейси', row: { 'Рейс ID': tid, 'Дата розвантаження': v.d }, opId: 'UNL-' + newId().slice(0, 16) }); toast('✔ Дату розвантаження поставлено.'); board = null; try { store.set('boardCache', ''); } catch (er) {} await reload(); }
        catch (er) { toast(esc(er.message), 'err'); } finally { busy(false); } }
    });
    if (wr && st.next) { $('bpMark').innerHTML = '<button type="button" class="btn small bp-mark" id="bpMarkB">Відмітити за водія: «' + esc(ST_LABEL[st.next] || cap(st.next)) + '»</button>';
      $('bpMarkB').onclick = async () => { if (!await ask('Відмітити за водія «' + (ST_LABEL[st.next] || st.next) + '»?', 'У кроці буде позначка «офіс за водія».', 'Відмітити')) return;
        busy(true); try { await api('trip.status.add', { tripId: tid, event: st.next, opId: 'OM-' + newId().slice(0, 16) }); await reload(); } catch (er) { toast(esc(er.message), 'err'); } finally { busy(false); } }; }
    if (document.documentElement.dataset.mvOpen) $('bpMv').open = true;
    $('bpProb').querySelectorAll('[data-bpa]').forEach(b => b.onclick = async () => {
      const state = b.dataset.bpa; let text = '';
      if (state === 'вирішено') { text = await askText('Як вирішили?', 'Напр. EX передали, митниця пропустила', 'Вирішено'); if (!text) return; }
      if (state === 'керівнику') { text = await askText('Що потрібно від керівника?', 'Напр. ремонт за рахунок фірми? клієнт вимагає штраф', 'Передати'); if (text === null || text === undefined) return; }
      busy(true); try { await api('trip.problem.answer', { tripId: tid, problemId: b.dataset.pid, state, text, opId: 'PA-' + newId().slice(0, 16) });
        toast(state === 'вирішено' ? '✔ Проблему закрито — водій бачить відповідь.' : state === 'керівнику' ? '✔ Передано керівнику.' : '✔ Водій бачить, що проблема в роботі.');
        await reload(); }
      catch (er) { toast(esc(er.message), 'err'); } finally { busy(false); } });
  }
  function bindPanel(x, tid) {
    const p = $('bPanel');
    p.querySelector('.bp-x').onclick = bPanelClose; p.querySelectorAll('.bp-back').forEach(b => b.onclick = bPanelClose);
    p.querySelectorAll('[data-bpz]').forEach(b => b.onclick = () => orderToTrip(b.dataset.bpz));
    p.querySelectorAll('[data-bpnew]').forEach(b => b.onclick = () => tripForm(null, { truck: b.dataset.bpnew }));
    const from = p.closest('#home') ? 'home' : 'board';
    if ($('bpFull')) $('bpFull').onclick = () => { bPanelClose(); openTrip(tid, from); };
    p.querySelectorAll('[data-bplg]').forEach(b => b.onclick = () => bpLgSet(x, b.dataset.bplg));   // v51: «Закріпити за мною / Відкріпити»
    p.querySelectorAll('[data-bpfit]').forEach(b => b.onclick = () => queueAssign(((board && board.queue) || []).find(z => z.id === b.dataset.bpfit), x.id));
    if ($('bpEch')) $('bpEch').onclick = () => echPrepOpen(tid);
    if ($('bpEdit')) $('bpEdit').onclick = async () => { busy(true); let r = null; try { const l = await api('list', { sheet: 'Рейси', filter: { 'Рейс ID': tid } }); r = l && l.rows && l.rows[0]; } catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); }
      if (r) tripForm(r); };
  }
  /* ── Масово: дати розвантаження для рейсів без них (P2) ── */
  function unlMass() {
    const l = (board ? board.trucks : []).filter(bNoUnl); if (!l.length) return;
    const today = new Date(); const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const w = document.createElement('div'); w.className = 'ask-wrap';
    w.innerHTML = '<div class="ask tsheet unlsheet" role="dialog" aria-modal="true" aria-labelledby="unlT"><h2 id="unlT">Дати розвантаження</h2><p class="muted small">Рейси на дошці без дати розвантаження. Впишіть дату там, де знаєте, — порожні не змінюються. Коли водій відмітив «розвантажено», дату підставлено.</p>' +
      l.map((x, i) => { const s = x.trip.st, pre = s && s.event === 'розвантажено' && s.at ? iso(new Date(s.at)) : '';
        return '<div class="unlrow"><label for="unl' + i + '"><span class="plate ua">' + esc(x.id) + '</span> <b>' + tripText(x.trip) + '</b> <span class="muted">' + esc(x.trip.id) + ' · завантаження ' + dd(x.trip.load) + '</span></label><input type="date" id="unl' + i + '" data-unl="' + esc(x.trip.id) + '" min="' + esc(x.trip.load || '') + '" max="' + iso(new Date(today.getTime() + 60 * 864e5)) + '" value="' + pre + '"></div>'; }).join('') +
      '<p class="msg" role="alert" id="unlMsg"></p><div class="ask-btns"><button class="btn" data-a="0">Скасувати</button><button class="primary" data-a="1">Зберегти</button></div></div>';
    const close = () => { w.remove(); try { $('bUnlBtn').focus(); } catch (e) {} };
    w.onclick = async e => {
      if (e.target === w || e.target.closest('[data-a="0"]')) return close();
      if (!e.target.closest('[data-a="1"]')) return;
      const todo = [...w.querySelectorAll('[data-unl]')].filter(i => i.value); if (!todo.length) { $('unlMsg').textContent = 'Не вписано жодної дати.'; return; }
      busy(true); let ok = 0; const bad = [];
      for (const i of todo) { try { await api('save', { sheet: 'Рейси', row: { 'Рейс ID': i.dataset.unl, 'Дата розвантаження': i.value }, opId: 'UNL-' + newId().slice(0, 16) }); ok++; i.closest('.unlrow').classList.add('done'); i.disabled = true; } catch (er) { bad.push(i.dataset.unl + ': ' + er.message); } }
      busy(false);
      if (bad.length) { $('unlMsg').textContent = 'Не збережено: ' + bad.join('; '); } else close();
      toast('✔ Дати розвантаження: збережено ' + ok + (bad.length ? ', не вдалося ' + bad.length : '') + '.'); board = null; try { store.set('boardCache', ''); } catch (e) {} openBoard(true);
    };
    w.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
    dlgOpener = document.activeElement; document.body.appendChild(w); const f = w.querySelector('input'); if (f) f.focus();
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
  /* ── єЧерга для логістів (ідея власниці №10, v49): підготовка реєстрації (ech.prep — лише читання), ключ розширення Chrome, «Черги зараз» ── */
  const ECH_URL = { login: 'https://echerha.gov.ua/login', workload: 'https://echerha.gov.ua/workload/truck/1' };
  const echOffice = () => !!me && ['адмін', 'керівник', 'логіст'].indexOf(me.role) >= 0;
  const echIntl = (type, cross) => !!String(cross || '').trim() && !(/україн|контейнер/i.test(type || '') || /україн|контейнер|переїзд|ставка/i.test(cross || ''));
  /** Копіювання в обробнику кліку: буфер обміну → запасний варіант (тимчасове поле + copy) → виділити текст, щоб людина натиснула Ctrl+C. */
  async function copyTxt(text, sel) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) {}
    const back = document.activeElement;
    try { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
      (document.querySelector('.ask-wrap:last-of-type') || document.body).appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); try { back && back.focus(); } catch (e) {} if (ok) return true; } catch (e) {}
    if (sel) { try { const r = document.createRange(); r.selectNodeContents(sel); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {} }
    return false;
  }
  function copyBtnDone(b, ok) {
    const t0 = b.dataset.t0 || b.textContent; b.dataset.t0 = t0;
    b.textContent = ok ? '✓ Скопійовано' : 'Виділено — Ctrl+C'; b.classList.toggle('done', ok);
    clearTimeout(b._t); b._t = setTimeout(() => { b.textContent = t0; b.classList.remove('done'); }, 1800);
    const live = document.getElementById('ecLive'); if (live) live.textContent = ok ? 'Скопійовано' : 'Не вдалося скопіювати — текст виділено, натисніть Ctrl+C';
  }
  /* v49.1: паспорт водія — перевірка як на сервері (EchQueue.js echqPassCheck_), строк дії */
  const fdt = iso => { const d = new Date(iso); return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); };
  const ymdDot = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; };
  function passState(v) {
    const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return '';
    const d = new Date(+m[1], +m[2] - 1, +m[3]), t = new Date(); t.setHours(0, 0, 0, 0); const soon = new Date(t.getFullYear(), t.getMonth() + 6, t.getDate());
    return d < t ? 'expired' : d < soon ? 'soon' : '';
  }
  const passWarnTxt = d => d.passState === 'expired' ? 'Паспорт прострочений (дійсний до ' + ymdDot(d.passValidTo) + ') — з ним не пропустять через кордон.' : d.passState === 'soon' ? 'Паспорт спливає менш ніж за 6 місяців (' + ymdDot(d.passValidTo) + ') — частина країн не впускає з таким строком.' : '';
  const passSub = d => (d.passValidTo ? 'дійсний до ' + ymdDot(d.passValidTo) : 'строк дії не вказано') + (d.passState ? ' — ' + (d.passState === 'expired' ? 'прострочений' : 'спливає < 6 міс') : '');
  function passCheck(v) {
    const bad = [], pass = String(v.passport || '').trim().toUpperCase(), cit = String(v.citizenship || '').replace(/\s+/g, ' ').trim() || 'Україна', mail = String(v.email || '').trim().toLowerCase(), valid = String(v.validTo || '').trim();
    if (pass) { if (/\s/.test(pass)) bad.push(['pass', 'номер паспорта — без пробілів']); else if (/[А-ЯІЇЄҐ]/.test(pass)) bad.push(['pass', 'літери в номері — латиницею, не кирилицею']); else if (/[^A-Z0-9]/.test(pass)) bad.push(['pass', 'номер — лише латинські літери й цифри']); else if (pass.length < 6 || pass.length > 12) bad.push(['pass', 'номер — від 6 до 12 символів']); }
    if (valid && !/^\d{4}-\d{2}-\d{2}$/.test(valid)) bad.push(['valid', '«Дійсний до» — дата']);
    if (cit.length > 60 || !/^[A-Za-zА-Яа-яІіЇїЄєҐґ'’ʼ .\-()]+$/.test(cit)) bad.push(['cit', 'громадянство — назва країни']);
    if (mail && !/^[^\s@<>"'=+][^\s@<>"'=]{0,63}@[a-z0-9.-]+\.[a-z]{2,}$/.test(mail)) bad.push(['mail', 'неправильна пошта']);
    if (!pass && !valid && !mail) bad.push(['pass', 'впишіть номер паспорта']);
    return { bad, val: { citizenship: cit, passport: pass, validTo: valid, email: mail } };
  }
  /** Дані для розширення «Л-КОРП → єЧерга»: лише те, що вписується у форму. Паспорт і пошта — лише якщо збережені (v49.1). */
  function echFillJson(p) {
    return JSON.stringify({ lcorp: 'ech-fill', v: 1, trip: p.tripId, at: new Date().toISOString(),
      checkpoint: { name: p.checkpoint.name, queue: p.checkpoint.queueText || '' },
      drivers: p.drivers.map(d => Object.assign({ citizenship: d.citizenship, first: d.first, last: d.last, firstLat: d.firstLat, lastLat: d.lastLat, phone: d.phone, phoneCode: d.phoneCode, phoneLocal: d.phoneLocal },
        d.passport ? { passport: d.passport } : {}, d.email ? { email: d.email } : {})),
      truck: { country: p.truck.country, type: p.truck.type, brand: p.truck.brand, plate: p.truck.plate },
      trailer: { has: p.trailer.has, country: p.trailer.country, plate: p.trailer.plate },
      cargo: { has: p.cargo.has, docType: p.cargo.docType, docNo: p.cargo.docNo } });
  }
  async function echPrepOpen(tid) {
    if (!echOffice()) return;
    busy(true); let p = null;
    try { p = await api('ech.prep', { tripId: tid }); } catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); }
    if (!p) return;
    let n = 0, editing = -1, formMsg = null;
    const F = (label, val, o) => { o = o || {}; const id = 'ecv' + (++n), v = val == null ? '' : String(val);
      return '<div class="ef' + (o.todo || !v ? ' ef-todo' : '') + '"><span class="ef-l">' + esc(label) + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</span>' +
        (v && !o.todo ? '<span class="ef-v" id="' + id + '">' + esc(v) + '</span><button type="button" class="btn small ef-c" data-ecopy="' + id + '" aria-label="Копіювати: ' + esc(label) + '">Копіювати</button>'
          : '<span class="ef-v ef-w">' + esc(o.todo || 'вписати') + '</span><span class="tag warn">впишіть вручну</span>') + '</div>'; };
    const yn = v => v === true ? 'Так' : v === false ? 'Ні' : '';
    const cp = p.checkpoint, ds = p.drivers.length ? p.drivers : [{ citizenship: 'Україна', first: '', last: '', phone: '', firstHint: 'водія не знайдено' }];
    const canPass = !me.viewAs;
    const passRow = (d, i) => {
      if (editing === i) return passForm(d, i);
      const msg = formMsg && formMsg.i === i ? '<p class="pf-msg ' + formMsg.kind + '" role="status" tabindex="-1" data-pmsg="' + i + '">' + esc(formMsg.text) + '</p>' : '';
      const st = d.passport && d.passState ? '<span class="tag ' + (d.passState === 'expired' ? 'bad' : 'warn') + '">' + (d.passState === 'expired' ? 'прострочений' : 'спливає < 6 міс') + '</span>' : '';
      const btn = canPass && d.id ? '<button type="button" class="btn small" data-epass="' + i + '">' + (d.passSaved ? 'Змінити паспорт' : 'Зберегти для цього водія') + '</button>' : '';
      const who = d.passSaved && d.passUpdated ? '<span class="muted small">оновлено ' + esc(fdt(d.passUpdated)) + (d.passWho ? ' · ' + esc(d.passWho) : '') + '</span>' : (canPass || !d.id ? '' : '<span class="muted small">режим перегляду — лише читання</span>');
      return st || btn || who || msg ? '<div class="ef-pass">' + st + who + btn + '</div>' + msg : '';
    };
    const passForm = (d, i) => { const id = 'pf' + i;
      return '<form class="ef-form" data-pform="' + i + '" novalidate aria-label="Паспорт водія ' + esc(d.last || '') + '">' +
        '<div><label for="' + id + 'c">Громадянство</label><input id="' + id + 'c" name="cit" value="' + esc(d.citizenship || 'Україна') + '" autocomplete="off" maxlength="60"></div>' +
        '<div><label for="' + id + 'p">Серія і номер закордонного паспорта</label><input id="' + id + 'p" name="pass" value="' + esc(d.passport || '') + '" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="14" placeholder="FX123456" aria-describedby="' + id + 'ph"><small class="pf-h" id="' + id + 'ph">латиницею, 6–12 символів, без пробілів</small></div>' +
        '<div><label for="' + id + 'v">Дійсний до</label><input id="' + id + 'v" name="valid" type="date" value="' + esc(d.passValidTo || '') + '" aria-describedby="' + id + 'vh"><small class="pf-date' + (d.passState ? ' ' + (d.passState === 'expired' ? 'bad' : 'warn') : '') + '" id="' + id + 'vh" aria-live="polite">' + esc(passWarnTxt(d)) + '</small></div>' +
        '<div><label for="' + id + 'm">Пошта для єЧерги</label><input id="' + id + 'm" name="mail" type="email" value="' + esc(d.email || '') + '" autocomplete="off" placeholder="пошта водія або фірми"></div>' +
        '<p class="pf-msg" role="alert"></p>' +
        '<div class="pf-btns">' + (d.passSaved && ['адмін', 'керівник'].indexOf(me.role) >= 0 ? '<button type="button" class="btn danger pf-del" data-pdel="' + i + '">Видалити паспорт</button>' : '') + '<button type="button" class="btn" data-pcancel="1">Скасувати</button><button type="submit" class="primary">Зберегти</button></div>' +
        '<p class="muted small pf-note">Бачать лише логіст, керівник і адмін. У журналі змін — лише перші й останні 2 знаки.</p></form>'; };
    const drvH = () => ds.map((d, i) => (ds.length > 1 ? '<h4 class="ef-h4">Водій ' + (i + 1) + (i ? ' <small>у формі — «Ще один водій»</small>' : '') + '</h4>' : '') +
      F('Громадянство', d.citizenship) + F('Ім\'я', d.first, { todo: d.first ? '' : (d.firstHint || 'вписати') }) + F('Прізвище', d.last) +
      (d.lastLat ? F('Латиницею (як у паспорті)', [d.firstLat, d.lastLat].filter(Boolean).join(' '), { sub: 'якщо форма просить латиницю — звірте з паспортом' }) : '') +
      F('Серія та номер закордонного паспорта', d.passport, { todo: d.passport ? '' : 'з паспорта водія — у програмі ще немає', sub: d.passport ? passSub(d) : '' }) +
      passRow(d, i) +
      F('Електронна пошта', d.email, { todo: d.email ? '' : 'пошта водія або фірми' }) +
      F('Код країни', d.phoneCode || (d.phone ? '' : '+380'), { todo: d.phone && !d.phoneCode ? 'див. номер нижче' : '' }) +
      F('Номер телефону', d.phoneLocal || d.phone, { todo: d.phone ? '' : 'телефону водія в базі немає', sub: d.phoneLocal ? 'без коду країни; повністю ' + d.phone : '' })).join('');
    const tr = p.trailer, cg = p.cargo;
    const body = () => '<p class="muted small">Форма <b>echerha.gov.ua</b> → «Стати в чергу»: після старту є 30 хв на заповнення — підготуйте дані тут. Кнопку «Стати в чергу» натискаєте ви, програма й розширення — ніколи.</p>' +
      '<div class="ec-top"><a class="primary ec-go" href="' + ECH_URL.login + '" target="_blank" rel="noopener">Відкрити єЧергу ↗</a><button type="button" class="btn" id="ecAll">Скопіювати все для розширення</button><button type="button" class="link" id="ecExt">Підключити розширення</button></div>' +
      (p.warn && p.warn.length ? '<ul class="ec-warn">' + p.warn.map(w => '<li>' + esc(w) + '</li>').join('') + '</ul>' : '') +
      '<section class="ec-b" aria-labelledby="ecb1"><h3 id="ecb1"><span class="ec-n">1</span>Пункт пропуску</h3>' +
        F('Пункт пропуску', cp.name, { sub: cp.cross && cp.cross !== cp.name ? '«Перехід» у рейсі: ' + cp.cross : '' }) +
        F('Черга', cp.queueText, { todo: cp.queueText ? '' : 'оберіть: «для вантажівок ≥ 7,5 тонн» або «для порожніх вантажівок ≥ 7,5 тонн»' }) +
        '<p class="ec-hint">' + esc(cp.hint) + '</p></section>' +
      '<section class="ec-b" aria-labelledby="ecb2"><h3 id="ecb2"><span class="ec-n">2</span>Водій' + (ds.length > 1 ? 'і' : '') + '</h3>' + drvH() + '</section>' +
      '<section class="ec-b" aria-labelledby="ecb3"><h3 id="ecb3"><span class="ec-n">3</span>Транспорт</h3>' +
        F('Країна реєстрації', p.truck.country) + F('Тип ТЗ', p.truck.type, { todo: p.truck.type ? '' : 'оберіть у формі (тягач)' }) + F('Марка', p.truck.brand, { todo: p.truck.brand ? '' : 'марки в базі немає' }) +
        F('Номер', p.truck.plate, { todo: p.truck.plate ? '' : 'держномера в базі немає', sub: p.truck.plateRaw && p.truck.plateRaw !== p.truck.plate ? 'латиницею; у базі ' + p.truck.plateRaw : 'латиницею' }) +
        F('VIN-код', '', { todo: 'лише якщо форма вимагає' }) +
        F('Їдемо з напівпричепом?', yn(tr.has), { todo: tr.has == null ? 'уточніть (у базі причепа немає)' : '' }) +
        (tr.has ? F('Країна реєстрації напівпричепа', tr.country) + F('Номер напівпричепа', tr.plate, { todo: tr.plate ? '' : 'вписати', sub: tr.src }) : '') + '</section>' +
      '<section class="ec-b" aria-labelledby="ecb4"><h3 id="ecb4"><span class="ec-n">4</span>Вантаж</h3>' +
        F('Їдете з вантажем?', yn(cg.has), { todo: cg.has == null ? 'уточніть' : '' }) +
        (cg.has !== false ? F('Тип митного документа', cg.docType, { todo: cg.docType ? '' : 'Митна декларація/МД-2, Транзитна декларація/Т1, Carnet TIR/МДП або Інший' }) +
          F('Номер документа', cg.docNo, { todo: cg.docNo ? '' : 'номер з документа', sub: cg.src }) : '') + '</section>' +
      '<section class="ec-b ec-last"><h3><span class="ec-n">5</span>Підтвердження</h3><p class="ec-hint">Перевірте все на сторінці «Підтвердження» і натисніть «Стати в чергу» самі. Після реєстрації лист єЧерги підтягнеться в програму (стан машини на дошці).</p></section>' +
      '<p class="sr" aria-live="polite" id="ecLive"></p>';
    const w = document.createElement('div'); w.className = 'ask-wrap';
    const draw = () => { n = 0; w.innerHTML = '<div class="ask tsheet echsheet" role="dialog" aria-modal="true" aria-labelledby="ecT"><h2 id="ecT">Реєстрація в єЧергу · <span class="nw">' + esc(p.tripId) + '</span></h2>' + body() +
      '<div class="ask-btns one"><button class="btn" data-a="0">Закрити</button></div></div>'; };
    draw();
    /* v49.1: паспорт водія — «Зберегти для цього водія» / «Змінити» (ech.pass.save; у «Журнал змін» — лише маска) */
    w.addEventListener('submit', async e => {
      const f = e.target.closest('[data-pform]'); if (!f) return; e.preventDefault();
      const i = +f.dataset.pform, d = ds[i], val = { citizenship: f.querySelector('[name=cit]').value, passport: f.querySelector('[name=pass]').value, validTo: f.querySelector('[name=valid]').value, email: f.querySelector('[name=mail]').value };
      const chk = passCheck(val);
      f.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
      if (chk.bad.length) { chk.bad.forEach(([k]) => { const x = f.querySelector('[name=' + k + ']'); if (x) x.setAttribute('aria-invalid', 'true'); });
        const m = f.querySelector('.pf-msg'); m.className = 'pf-msg bad'; m.textContent = 'Перевірте: ' + chk.bad.map(b => b[1]).join('; ');
        const x0 = f.querySelector('[aria-invalid]'); if (x0) x0.focus(); return; }
      const sb = f.querySelector('[type=submit]'); sb.disabled = true; busy(true); let r = null;
      try { r = await api('ech.pass.save', Object.assign({ workerId: d.id }, chk.val)); }
      catch (er) { const m = f.querySelector('.pf-msg'); m.className = 'pf-msg bad'; m.textContent = er.message || 'Не вдалося зберегти'; }
      finally { busy(false); sb.disabled = false; }
      if (!r) return;
      ['citizenship', 'passport', 'passValidTo', 'passState', 'email', 'passSaved', 'passUpdated', 'passWho'].forEach(k => { if (r[k] !== undefined) d[k] = r[k]; });
      editing = -1; formMsg = { i, kind: d.passState ? 'warn' : 'ok', text: (r.saved ? 'Збережено для ' + (d.last || 'водія') + '.' : 'Без змін.') + (d.passState ? ' ' + passWarnTxt(d) : '') };
      draw(); const c = w.querySelector('[data-pmsg="' + i + '"]'); if (c) c.focus();
    });
    w.addEventListener('input', e => { const f = e.target.closest('[data-pform]'); if (!f) return;
      if (e.target.getAttribute('aria-invalid')) { e.target.removeAttribute('aria-invalid'); const m = f.querySelector('.pf-msg'); if (m && /bad/.test(m.className)) { m.textContent = ''; m.className = 'pf-msg'; } }
      if (e.target.name === 'pass') { const st = e.target.selectionStart, v = e.target.value.toUpperCase(); if (v !== e.target.value) { e.target.value = v; try { e.target.setSelectionRange(st, st); } catch (er) {} } }
      if (e.target.name === 'valid') { const m = f.querySelector('.pf-date'), st = passState(e.target.value); m.textContent = st ? passWarnTxt({ passState: st, passValidTo: e.target.value }) : ''; m.className = 'pf-date' + (st ? ' ' + (st === 'expired' ? 'bad' : 'warn') : ''); }
    });
    w.onclick = async e => {
      if (e.target === w || e.target.closest('[data-a="0"]')) { w.remove(); return; }
      const pe = e.target.closest('[data-epass]'); if (pe) { editing = +pe.dataset.epass; formMsg = null; draw(); const x = w.querySelector('[data-pform] [name=pass]'); if (x) x.focus(); return; }
      const pd = e.target.closest('[data-pdel]'); if (pd) { const i = +pd.dataset.pdel, d = ds[i];
        if (!await ask('Видалити паспорт водія ' + (d.last || '') + '?', 'Номер, строк дії і пошту буде прибрано з програми. У журналі змін залишиться лише запис «видалено» з маскою номера.', 'Видалити', true)) return;
        busy(true); let r = null; try { r = await api('ech.pass.del', { workerId: d.id }); } catch (er) { toast(esc(er.message), 'err'); } finally { busy(false); }
        if (!r) return;
        ['citizenship', 'passport', 'passValidTo', 'passState', 'email', 'passSaved', 'passUpdated', 'passWho'].forEach(k => { if (r[k] !== undefined) d[k] = r[k]; });
        editing = -1; formMsg = { i, kind: 'ok', text: 'Паспорт видалено.' }; draw(); const c = w.querySelector('[data-pmsg="' + i + '"]'); if (c) c.focus(); return; }
      if (e.target.closest('[data-pcancel]')) { const i = editing; editing = -1; draw(); const b = w.querySelector('[data-epass="' + i + '"]'); if (b) b.focus(); return; }
      if (e.target.closest('#ecExt')) { w.remove(); echExtOpen(); return; }
      const c = e.target.closest('[data-ecopy]'); if (c) { const el = $(c.dataset.ecopy); copyBtnDone(c, await copyTxt(el.textContent, el)); return; }
      if (e.target.closest('#ecAll')) { const b = $('ecAll'); copyBtnDone(b, await copyTxt(echFillJson(p))); if (b.classList.contains('done')) toast('Скопійовано. На сторінці форми єЧерги: плашка «Заповнити з Л-КОРП» → Ctrl+V. Розширення лише заповнює поля — «Продовжити» й «Стати в чергу» натискаєте ви.' + (p.drivers.some(d => d.passport) ? '<br><b>У буфері обміну — паспорт водія.</b> Після вставки скопіюйте щось інше.' : '')); }
    };
    dlgOpener = document.activeElement; document.body.appendChild(w); setTimeout(() => { const f = w.querySelector('.ec-go'); if (f) f.focus(); }, 40);
  }
  /** «Підключити розширення»: окремий ключ (лише для надсилання часу черг), код-рядок для вставки в налаштування розширення. */
  async function echExtOpen() {
    if (!echOffice()) return;
    if (me.viewAs) return toast('Режим перегляду — підключити розширення може лише сам працівник.', 'err');
    if (!await ask('Підключити розширення «Л-КОРП → єЧерга»?', 'Програма покаже код для налаштувань розширення. Новий код вимикає попередній (якщо підключали раніше на іншому комп\'ютері).', 'Показати код')) return;
    busy(true); let r = null; try { r = await api('ech.ext.link'); } catch (e) { toast(esc(e.message), 'err'); } finally { busy(false); }
    if (!r || !r.token) return;
    const code = 'LKORP-ECH1|' + CFG.API_URL + '|' + r.token;
    const w = document.createElement('div'); w.className = 'ask-wrap';
    w.innerHTML = '<div class="ask tsheet" role="dialog" aria-modal="true" aria-labelledby="ecCodeT" aria-describedby="ecCodeD"><h2 id="ecCodeT">Код для розширення</h2><ol class="ec-steps"><li>Chrome → значок розширення «Л-КОРП → єЧерга» → <b>Налаштування</b>.</li><li>Вставте код у поле «Код з програми» → <b>Зберегти</b>.</li><li>Відкрийте «Черга зараз» (або «Стежити за чергами» в розширенні) — раз на 10 хв час черг буде на головній.</li></ol>' +
      '<div class="ec-code" id="ecCode" tabindex="0">' + esc(code) + '</div><p class="muted small" id="ecCodeD">Код — як пароль: лише для цього розширення, ним можна тільки надсилати час черг. Не пересилайте його.</p><p class="sr" aria-live="polite" id="ecLive"></p>' +
      '<div class="ask-btns"><button class="btn" data-a="0">Закрити</button><button class="primary" id="ecCopy">Копіювати код</button></div></div>';
    w.onclick = async e => { if (e.target === w || e.target.closest('[data-a="0"]')) { w.remove(); return; } if (e.target.closest('#ecCopy')) copyBtnDone($('ecCopy'), await copyTxt(code, $('ecCode'))); };
    dlgOpener = document.activeElement; document.body.appendChild(w); $('ecCopy').focus();
  }
  /* «Черги зараз» (віджет «Кордон і документи»): знімок від розширення + «наші: зазвичай» з листів + наші машини в черзі */
  let echW = null, echWAt = 0;
  function echWFetch(live) { return api('ech.workload').then(r => { echW = r; echWAt = Date.now(); if (live()) logDraw(); }).catch(() => {}); }
  const echK = s => String(s || '').toLowerCase().replace(/[«»"'’]/g, '').replace(/^(ммпп|мапп|пп)\s+/, '').trim().slice(0, 5);
  function minTxt(m) { if (m == null || m === '') return '—'; const d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = Math.round(m % 60); return d ? d + ' д ' + h + ' год' : h ? h + ' год' + (mm ? ' ' + mm + ' хв' : '') : mm + ' хв'; }
  function echQueueHtml(T) {
    const w = echW; if (!w) return '<h3 class="hw-h3">Черги зараз</h3>' + hSk(2);
    const age = w.at ? Math.max(0, Math.floor((Date.now() - Date.parse(w.at)) / 60000)) : null, stale = age === null || age > 30;
    const inQ = T.filter(x => x.ech && (x.ech.state === 'у черзі' || x.ech.state === 'готуйтесь'));
    const used = {};
    const mine = r => inQ.filter(x => { if (used[x.id]) return false; const k = echK(x.ech.checkpoint || x.ech.typicalAt || (x.trip && x.trip.cross)); const hit = k && r.key && r.key.slice(0, 5) === k; if (hit) used[x.id] = 1; return hit; });   // машина — під першим (головним) рядком свого пункту
    const truckLi = x => '<li class="ech-tr"><button type="button" class="hrow" data-htruck="' + esc(x.id) + '"><span class="plate ua">' + esc(x.id) + '</span><span class="hl-t">' + (x.ech.state === 'готуйтесь' ? 'готуйтесь' : 'чекає ' + esc(hrs(x.ech.waited))) + (x.ech.eta ? ' · в\'їзд ≈ ' + esc(x.ech.eta) : '') + '</span></button></li>';
    const typ = t => t ? '<span class="ech-us">наші: зазвичай ' + esc(hrs(t.med)) + '</span>' : '';
    const rowH = r => '<li class="ech-r' + (r.ours ? ' ours' : '') + '"><div class="ech-l"><b>' + esc(r.name) + '</b>' + (r.queue ? '<small>' + esc(r.queue) + '</small>' : '') + '</div>' +
      '<div class="ech-m"><span class="ech-w tnum" title="Час очікування">' + esc(minTxt(r.waitMin)) + '</span><span class="ech-c tnum">' + (r.cars == null ? '' : esc(r.cars) + ' авто') + '</span>' + typ(r.typical) + '</div>' +
      ((m => m.length ? '<ul class="hl ech-trs">' + m.map(truckLi).join('') + '</ul>' : '')(mine(r))) + '</li>';
    const rows = (w.rows || []), top = rows.filter(r => r.ours).concat(rows.filter(r => !r.ours)).slice(0, Math.max(4, rows.filter(r => r.ours).length));
    const miss = (w.missing || []).slice(0, 2).map(m => '<li class="ech-r ours none"><div class="ech-l"><b>' + esc(m.name) + '</b><small>немає в знімку</small></div><div class="ech-m">' + typ(m.typical) + '</div>' + ((q => q.length ? '<ul class="hl ech-trs">' + q.map(truckLi).join('') + '</ul>' : '')(mine(m))) + '</li>').join('');
    const rest = () => inQ.filter(x => !w.at || !used[x.id]);
    const upd = w.at ? '<span class="ech-upd' + (stale ? ' stale' : '') + '">оновлено ' + (age < 1 ? 'щойно' : age < 120 ? age + ' хв тому' : tm(w.at)) + '</span>' : '<span class="ech-upd stale">даних ще немає</span>';
    return '<h3 class="hw-h3">Черги зараз ' + upd + '</h3>' +
      '<div class="ech-box' + (stale ? ' stale' : '') + '">' +
      (w.at && (top.length || miss) ? '<ul class="ech-list">' + top.map(rowH).join('') + miss + '</ul>' : '<p class="muted small">Час черг ще не надходив. Встановіть розширення «Л-КОРП → єЧерга» в Chrome і підключіть його — тоді, поки відкрита сторінка «Черга зараз», час оновлюється раз на 10 хв.</p>') +
      (w.at && stale ? '<p class="muted small ech-old">Дані старші 30 хв — відкрийте «Черга зараз» у Chrome з розширенням.</p>' : '') +
      (rest().length ? '<p class="hl-sub">Наші машини в черзі</p><ul class="hl ech-trs">' + rest().map(x => truckLi(x).replace('</span></button>', (x.ech.checkpoint ? ' · ' + esc(x.ech.checkpoint) : '') + '</span></button>')).join('') + '</ul>' : '') +
      '<p class="ech-foot"><a href="' + esc(w.url || ECH_URL.workload) + '" target="_blank" rel="noopener">Черга зараз ↗</a>' + (w.linked ? '' : ' · <button type="button" class="link" data-hgo="echx">Підключити розширення</button>') + '</p></div>';
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
      (!x.gps ? '<div><span class="muted">GPS:</span> немає даних про пробіг</div>' : '') +
      (bProbs(x).length ? '<div class="flags">' + bProbs(x).map(p => flag(p.k, p.t, p.urgent, p.old)).join('') + '</div>' : '<div class="muted">Проблем не знайдено.</div>') +
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
    const v = r || fromZ || Object.assign({ 'Авто ID': opts.truck || '', 'Валюта': 'EUR', 'Оплата': 'безгот' }, opts.preset || {});   // v50: preset — з «Причепи в черзі»
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
      (opts.queue ? '<p class="muted small">З черги причепів: <b>' + esc(opts.queue.trailer || '') + '</b>' + (opts.queue.load ? ', завантажено ' + esc(dd(opts.queue.load)) : '') + '. Оберіть машину (тягач), номер і водія — після створення запис у черзі стане «призначено» з номером рейсу.</p>' : '') +
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
        if (isNew && opts.onSaved) { try { await opts.onSaved(out.row['Рейс ID']); } catch (e) {} }
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
        if (isNew && opts.onSaved) openBoard(true); else openTrip(out.row['Рейс ID'], z ? 'view' : tripFrom);   // v50: з «Причепи в черзі» — назад на дошку, запис «призначено»
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
    // згортається (власниця 23.11: «тут треба мати можливість згорнути»); стан пам'ятаємо на пристрої
    const nHas = Object.keys(ADDR_L).filter(k => a[k]).length, openA = store.get('addrOpen') === '1';
    const sumTxt = miss.length ? '<span class="adsum bad">бракує водію: ' + esc(miss.join(', ')) + '</span>' : nHas ? '<span class="adsum ok">вписано ' + nHas + ' з ' + Object.keys(ADDR_L).length + '</span>' : '<span class="adsum">не вписано</span>';
    return '<details class="card addrc"' + (openA ? ' open' : '') + ' ontoggle="try{localStorage.setItem(\'addrOpen\',this.open?\'1\':\'\')}catch(e){}"><summary><h2>Адреси</h2>' + sumTxt + '<span class="adtog" aria-hidden="true"></span></summary>' + drv + Object.keys(ADDR_L).map(k => canEdit
      ? '<label for="ad_' + k + '">' + ADDR_L[k] + '</label><div class="adrow"><input id="ad_' + k + '" data-ad="' + k + '" value="' + esc(a[k] || '') + '" placeholder="вулиця, місто, індекс — або посилання з карти">' + (a[k] ? '<a class="btn" target="_blank" rel="noopener" href="' + esc(mapsUrl(a[k])) + '">Карта</a>' : '') + '</div>'
      : (a[k] ? '<div class="kv"><span>' + ADDR_L[k] + '</span><b><a target="_blank" rel="noopener" href="' + esc(mapsUrl(a[k])) + '">' + esc(a[k]) + '</a></b></div>' : '')).join('') +
      (canEdit ? '<p class="msg" role="alert" id="adMsg"></p><button class="primary" id="adSave" data-adtrip="' + esc(tripId) + '">Зберегти адреси</button><p class="muted small">Водій побачить кнопку «Навігація». З заявки адреси підтягує бот; чого немає — впишіть тут.</p>' : (has ? '' : '<p class="muted">Адрес ще немає.</p>')) + '</details>';
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
      '<div class="rbtns">' + rptNav(p, 'primary') + '<button class="btn" id="rAll" aria-label="Усі адреси (' + all.length + ')">Усі <span class="rlong">адреси </span>(' + all.length + ')</button></div></section>';
  }
  function routeAll() {
    const v = stCur; if (!v || !v.trip) return; const all = routePoints(v), cur = all.find(x => !x.done);
    const w = document.createElement('div'); w.className = 'ask-wrap';
    w.innerHTML = '<div class="ask tsheet" role="dialog" aria-modal="true"><h2>Усі адреси рейсу ' + esc(v.trip.id) + '</h2>' + all.map(p => '<div class="rpt' + (p === cur ? ' rnext' : '') + (p.done ? ' rdone' : '') + '"><div class="rlab">' + (p.done ? '✓ ' : '') + esc(p.label) + (p === cur ? ' · зараз' : '') + '</div><div class="raddr">' + rptAddr(p, v) + '</div>' + rptNav(p, p === cur ? 'primary' : 'btn') + '</div>').join('') +
      '<div class="ask-btns"><button class="btn" data-a="0">Закрити</button></div></div>';
    const from = document.activeElement, close = () => { w.remove(); if (from && from.isConnected) try { from.focus(); } catch (e) {} };   // фокус — назад на «Усі адреси»
    w.onclick = e => { if (e.target === w || e.target.closest('[data-a="0"]')) close(); };
    w.onkeydown = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    document.body.appendChild(w); w.querySelector('[data-a="0"]').focus();
  }
  async function openTrip(id, from) {
    tripFrom = from || 'board'; $('tripBackT').textContent = tripFrom === 'view' ? 'Таблиця' : tripFrom === 'debts' ? 'Боржники' : tripFrom === 'inv' ? 'До виставлення' : tripFrom === 'mypay' ? 'Мої рейси' : tripFrom === 'probs' ? 'Проблеми водіїв' : tripFrom === 'home' ? 'Головна' : board ? 'Дошка' : 'Назад';
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
      if ($('tripEch')) $('tripEch').onclick = () => echPrepOpen(id);
      if (r['Водій ID'] && can.has('Працівники') && me.role !== 'водій') getRows('Працівники', { 'Працівник ID': r['Водій ID'] }).then(p => {   // телефон водія — одним натиском (логіст №5)
        const tel = p && p.rows[0] && String(p.rows[0]['Телефон'] || '').trim(); if (!tel || nav !== navSeq || !$('tripCall')) return;
        $('tripCall').innerHTML = '<a class="btn calldrv" href="tel:' + esc(tel.replace(/[^\d+]/g, '')) + '">📞 Водій: ' + esc(tel) + '</a>'; });
      api('trip.status', { tripId: id }).then(v => { if (!v || !v.trip || !$('tripSt') || nav !== navSeq) return;
        const any = v.steps.some(x => x.at) || (v.problems || []).length, last = v.steps.map(x => !!x.at).lastIndexOf(true);
        if (last >= 0 && $('tripBadge')) { const ev = v.steps[last].step; $('tripBadge').innerHTML = badge(ST_GRP[ev] || 'go', cap(ev)); }
        const office = ['адмін', 'керівник', 'логіст'].indexOf(me.role) >= 0 && !me.viewAs, ST_W = { 'нова': 'нова', 'в роботі': 'в роботі', 'вирішено': 'вирішено' };   // v51: перегляд — без «Відмітити за водія» / відповідей
        const canAns = p => me.role !== 'логіст' || p.owner !== 'керівник';
        const probH = p => '<div class="cnote prob-' + (p.state === 'вирішено' ? 'done' : p.state === 'в роботі' ? 'work' : 'new') + '"><b>Проблема ' + tkTime(p.at) + ' · ' + esc(ST_W[p.state] || 'нова') + ' · ' + (p.owner === 'керівник' ? 'керівника' : 'логіста') + '</b><br>' + esc(p.text) +
          (p.answer ? '<br><span class="muted small">Відповідь (' + [esc(p.answerWho || ''), p.answerAt ? tkTime(p.answerAt) : ''].filter(Boolean).join(', ') + '): </span>' + esc(p.answer) : '') +
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
    let h = '<div class="thead"><div class="ttl"><h1>Рейс ' + esc(r['Рейс ID']) + '</h1><span id="tripBadge"></span>' + (canTrip() ? '<button class="btn" id="tripEdit">✏️ Виправити</button>' : '') + (echOffice() && echIntl(r['Тип'], r['Перехід']) ? '<button class="btn" id="tripEch">Підготувати реєстрацію в єЧергу</button>' : '') + '<span id="tripCall"></span></div>' +
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
    if (store.get('tokenAdmin') && !viewBacking) return viewBack();                     // у перегляді «Вийти» / сесія скінчилась — назад до входу адміна (v48)
    if (!silent) { let ep = ''; try { const reg = navigator.serviceWorker && await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 1500))]); const sub = reg && reg.pushManager && await reg.pushManager.getSubscription(); ep = sub ? sub.endpoint : ''; } catch (e) {}
      try { await api('logout', { endpoint: ep }); } catch (e) {} }   // вимкнути сповіщення лише цього телефона, не напарника (безпека-10)
    // черга НЕ стирається: записи прив'язані до входу й надішлються, коли ця людина увійде знову (критик У3, QA-8)
    const lg = me && me.login;
    store.del('token'); store.del('me'); store.del('homeDrv'); store.del('boardCache'); if (lg) { store.del('homeL_' + lg); store.del('boss2_' + lg); } board = null; homeL = null; panel = null; boss2 = null; boss2Err = ''; boss2At = 0;   // v51: борги клієнтів (home.boss2) не лишаються на пристрої
    navBadge = {};
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
    'логіст': [['Машини зараз', 'Головна — статуси всіх машин: хто, рейс і етап, де зараз, чого чекає і чого бракує. Червона смуга — потрібна дія зараз. Клік по машині — її рейс праворуч. Зверху — розгортки: RMPD, справи, причепи, документи, показники. «Мої машини» — ті, що ви ведете або закріпили за собою.'],
      ['Меню і пошук', 'Усі розділи — у меню ліворуч (на телефоні — ☰ угорі). Зірочкою закріпіть до 4 найпотрібніших. Пошук угорі (Ctrl+K, а поза головною — клавіша /) знайде машину, рейс, водія чи розділ.'],
      ['Головна і дошка', 'На головній — що потребує дії, хто звільняється за 72 год, конвеєр рейсів і цифри тижня. Натисніть машину — відкриється дошка з рейсом збоку.'],
      ['Картка рейсу', 'Натисніть номер рейсу — побачите маршрут, дати, оплату, кроки водія.'],
      ['Калькулятор', 'Перед тим як погодити заявку — порахуйте рейс або кругорейс у «Калькуляторі». Більший шрифт і кольори — у меню вашого імені вгорі праворуч.'],
      ['Новий рейс', '«+ Новий рейс» на дошці — завести рейс вручну. У «Заявках» рядок «+ рейс» — створити рейс із заявки: поля підставляться самі, лишиться обрати водія. Постійні клієнти без заявок — «Із шаблону».']],
    'бухгалтер': [['Меню і пошук', 'Усі розділи — у меню ліворуч (на телефоні — ☰ угорі). Зірочкою закріпіть найпотрібніші — вони будуть і на головній. Пошук угорі (клавіша /) знайде розділ або рейс.'],
      ['Витрати водіїв', 'Чеки й витрати від водіїв — на перевірку. Фото чеків відкриваються лише в програмі.'],
      ['Дві суми в рейсі', '«Фрахт» — від нього рахується зарплата водію. «Сума для рахунку» — на неї виставляють рахунок клієнту (більша, коли є повернення). Порожня — як фрахт.'],
      ['Боржники', 'Хто не оплатив: за клієнтом, з прострочкою. «Текст нагадування» копіює готовий лист. Рейс без позначки «Оплачено» може бути вже оплачений — звіряйте з банком.']]
  };
  // «Що нового» — один раз на пристрої для тих, хто вже бачив підказки (ADR-076)
  const NEWS49 = { key: 'news_v49', roles: ['адмін', 'керівник', 'логіст'], title: 'Що нового: єЧерга',
    items: ['Рейс (бокова панель або повна картка) → «Підготувати реєстрацію в єЧергу»: усі дані для форми єЧерги в її порядку — пункт пропуску й черга, водії, тягач і причіп, вантаж. Кожне поле — кнопка «Копіювати». Закордонний паспорт водія можна зберегти один раз («Зберегти для цього водія») — далі він підставляється сам.',
      'Розширення Chrome «Л-КОРП → єЧерга»: на сторінці форми — плашка «Заповнити з Л-КОРП». Вставте те, що скопіювала кнопка «Скопіювати все для розширення», — поля поточного кроку заповняться. «Продовжити» і «Стати в чергу» натискаєте лише ви.',
      'Головна логіста → чип «RMPD» → «Черги зараз»: скільки чекають на пунктах, якими ми їздимо, поруч — скільки зазвичай чекаємо ми, і наші машини в черзі. Дані надсилає розширення, поки в Chrome відкрита сторінка «Черга зараз» (раз на 10 хв).'] };
  const NEWS = { key: 'news_v48', roles: ['адмін', 'керівник', 'логіст', 'бухгалтер'], title: 'Що нового',
    items: ['«Звільняються за 72 год»: прогрес дня («розвантажено 2 з 4»), машини без наступного рейсу. У понеділок «Тиждень у цифрах» показує минулий повний тиждень.',
      'Календар парку: машина в рейсі без дати розвантаження — «невідомо», а не «вільно». Натисніть смугу — рейс відкриється збоку.',
      'Головна й дошка оновлюються самі кожні 5 хв; угорі видно, коли оновлено. Пошук знаходить і заявки без машини.',
      'Меню — без повторів: закріплене зірочкою — у смузі значків. Керівник і адмін: під «Панеллю дня» — ті самі віджети парку. Бухгалтер: на головній — до виставлення, боржники, витрати на перевірку.'],
    admin: 'Адміну: меню імені ▾ → «Подивитися як…» — програма очима логіста, керівника, бухгалтера, механіка чи конкретного водія, без кодів. Лише перегляд, «Повернутись» — одним натиском.' };
  function news() {
    if (!me || document.querySelector('.ask-wrap')) return;
    const N = [NEWS49, NEWS].find(n => n.roles.indexOf(me.role) >= 0 && !store.get(n.key)); if (!N) return;
    const latest = N === NEWS49;   // офісу — лише найновіше; минулі «Що нового» позначаємо переглянутими
    const w = document.createElement('div'); w.className = 'ask-wrap';
    w.innerHTML = '<div class="ask tour" role="dialog" aria-modal="true"><h2>' + esc(N.title) + '</h2><ul class="newsl">' + N.items.concat(me.role === 'адмін' && N.admin ? [N.admin] : []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul><div class="ask-btns"><button class="primary" data-a="ok">Зрозуміло</button></div></div>';
    w.querySelector('[data-a="ok"]').onclick = () => { store.set(N.key, '1'); if (latest) store.set(NEWS.key, '1'); w.remove(); };
    document.body.appendChild(w);
  }
  TOURS['керівник'] = TOURS['логіст'].slice(1); TOURS['адмін'] = TOURS['логіст'].slice(1);   // v51: крок «Машини зараз» — лише логісту
  function tour() {
    const steps = me && TOURS[me.role]; if (!steps) return;
    const key = 'tour1_' + me.role; if (store.get(key)) return news();
    let i = 0; const w = document.createElement('div'); w.className = 'ask-wrap';
    const draw = () => { const [t, x] = steps[i];
      w.innerHTML = '<div class="ask tour" role="dialog" aria-modal="true"><div class="tour-dots">' + steps.map((_, k) => '<i class="' + (k === i ? 'on' : '') + '"></i>').join('') + '</div><h2>' + esc(t) + '</h2><p>' + esc(x) + '</p><div class="ask-btns"><button class="btn" data-a="skip">Пропустити</button><button class="primary" data-a="next">' + (i < steps.length - 1 ? 'Далі' : 'Зрозуміло') + '</button></div></div>';
      w.querySelector('[data-a="next"]').onclick = () => { if (++i >= steps.length) close(); else draw(); };
      w.querySelector('[data-a="skip"]').onclick = close; };
    const close = () => { store.set(key, '1'); store.set(NEWS.key, '1'); store.set(NEWS49.key, '1'); w.remove(); };   // новачку «Що нового» не потрібне — підказки вже про все
    draw(); document.body.appendChild(w);
  }
  /* ── «Подивитися як…» для адміна (v48): окрема тимчасова сесія лише для читання; токен адміна зберігається окремо, «Повернутись» — без коду ── */
  const VIEW_KEYS = /^(me|boardCache|homeDrv|homeL_.*|panel_.*|boss2_.*|buh_.*|tacho_.*)$/;   // v51.1: boss2_* — головна керівника (звіти, борги), кешована під час перегляду
  function viewClear() { Object.keys(localStorage).filter(k => VIEW_KEYS.test(k)).forEach(k => store.del(k)); }
  function viewBar() {
    const on = !!(me && me.viewAs); document.body.classList.toggle('viewing', on); $('viewBar').hidden = !on;
    if (on) $('viewBarT').textContent = 'Ви дивитесь як ' + (String(me.name).split(' як ').slice(1).join(' як ') || me.role) + ' · лише перегляд';
  }
  async function viewAsOpen() {
    const w = document.createElement('div'); w.className = 'ask-wrap';
    w.innerHTML = '<div class="ask tsheet" role="dialog" aria-modal="true"><h2>Подивитися як…</h2><p class="muted small">Програма покаже, що бачить ця роль чи водій. Лише перегляд: змінювати нічого не можна. Діє до 12 год; «Повернутись» — до вашого входу без коду. Запис про перегляд іде в «Журнал змін».</p>' +
      '<div class="zgrid va-roles">' + [['логіст', 'Логіст'], ['керівник', 'Керівник'], ['бухгалтер', 'Бухгалтер'], ['механік', 'Механік']].map(r => '<button type="button" class="zbtn" data-va="' + r[0] + '"><span>' + r[1] + '</span></button>').join('') + '</div>' +
      '<label for="vaDrv">Або водій</label><div class="va-drv"><select id="vaDrv"><option value="">Завантажую водіїв…</option></select><button type="button" class="primary" id="vaDrvGo" disabled>Як водій</button></div>' +
      '<p class="msg" role="alert" id="vaMsg"></p><div class="ask-btns"><button class="btn" data-a="0">Скасувати</button></div></div>';
    const go = async (as, workerId) => { busy(true); try { const out = await api('view.as', { as, workerId }); store.set('tokenAdmin', store.get('token')); viewClear(); store.set('token', out.token); location.reload(); } catch (e) { $('vaMsg').textContent = e.message; } finally { busy(false); } };
    w.onclick = e => { if (e.target === w || e.target.closest('[data-a="0"]')) { w.remove(); return; } const r = e.target.closest('[data-va]'); if (r) go(r.dataset.va); if (e.target.closest('#vaDrvGo') && $('vaDrv').value) go('водій', $('vaDrv').value); };
    dlgOpener = document.activeElement; document.body.appendChild(w);
    try { const l = await api('list', { sheet: 'Працівники' }), ds = (l.rows || []).filter(r => /водій/i.test(String(r['Посада'] || '')) && r['Працює'] !== false).sort((a, b) => String(a['Прізвище']).localeCompare(String(b['Прізвище']), 'uk'));
      if (!w.isConnected) return; $('vaDrv').innerHTML = '<option value="">— оберіть водія —</option>' + ds.map(r => '<option value="' + esc(r['Працівник ID']) + '">' + esc(r['Прізвище'] + ' (' + r['Працівник ID'] + ')') + '</option>').join('');
      $('vaDrv').onchange = () => { $('vaDrvGo').disabled = !$('vaDrv').value; }; }
    catch (e) { if (w.isConnected) { $('vaDrv').innerHTML = '<option value="">Список водіїв недоступний</option>'; $('vaMsg').textContent = e.message; } }
  }
  let viewBacking = false;
  async function viewBack() {
    if (viewBacking) return; viewBacking = true;
    const t = store.get('tokenAdmin'); busy(true);
    try { await Promise.race([api('logout'), new Promise(r => setTimeout(r, 3000))]); } catch (e) {}
    viewClear(); store.del('tokenAdmin'); if (t) store.set('token', t); else store.del('token');
    location.reload();
  }
  $('viewBack').onclick = viewBack;
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
  $('bQueueAdd').onclick = queueAddOpen;   // v50: «Записати причіп»
  if ($('bNewTrip')) $('bNewTrip').onclick = () => tripForm(null);
  if ($('viewNewTrip')) $('viewNewTrip').onclick = () => tripForm(null);
  $('dRefresh').onclick = () => openDocs(true);
  $('dSearch').addEventListener('input', () => docs && renderDocs());
  $('tripBack').onclick = () => tripFrom === 'home' ? renderHome() : tripFrom === 'probs' ? openProbs() : tripFrom === 'mypay' ? show('mypay') : tripFrom === 'debts' ? show('debts') : tripFrom === 'inv' ? show('inv') : tripFrom === 'view' ? (show('view'), current && renderTable()) : (board ? (show('board')) : renderHome());
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
