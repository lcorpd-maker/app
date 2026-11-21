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
      { title: 'Документи', hint: 'що спливає', action: 'docs' }, T('Користувачі', 'хто має доступ', 'Користувачі'),
      T('Журнал змін', 'хто що змінив', 'Журнал змін'), { title: 'Видати код', hint: 'вхід для водія', action: 'codes' }, { title: 'Сповіщення на телефон', hint: 'проблеми водіїв одразу', action: 'push' }],
    'керівник': [{ title: 'Дошка машин', hint: 'де кожна машина зараз', action: 'board' }, { title: 'Калькулятор', hint: 'чи вигідна заявка', action: 'calc' }, { title: 'Витрати водіїв', hint: 'чеки, перевірка', action: 'exp' }, { title: 'Здоров\'я програми', hint: 'збої, швидкість, нічні роботи', action: 'health' }, T('Рейси', 'усі машини', 'Рейси'), T('Кругорейси', '', 'Кругорейси'), T('Нарахування', 'зарплата', 'Нарахування'),
      T('Виплати й доплати', '', 'Виплати й доплати'), T('Рухи коштів', '', 'Рухи коштів'), T('Клієнти', '', 'Клієнти'),
      { title: 'Документи', hint: 'що спливає', action: 'docs' }, T('Журнал змін', '', 'Журнал змін'), { title: 'Видати код', hint: 'вхід для водія', action: 'codes' }, { title: 'Сповіщення на телефон', hint: 'проблеми водіїв одразу', action: 'push' }],
    'логіст': [{ title: 'Дошка машин', hint: 'де кожна машина зараз', action: 'board' }, { title: 'Калькулятор', hint: 'чи вигідна заявка', action: 'calc' }, { title: 'Витрати водіїв', hint: 'чеки, перевірка', action: 'exp' }, T('Рейси', 'усі машини', 'Рейси'), T('Заявки', 'актуальні', 'Заявки'), T('Кругорейси', '', 'Кругорейси'),
      T('Клієнти', '', 'Клієнти'), T('Водій на авто', 'хто на якій машині', 'Водій на авто'), T('Відстані', '', 'Відстані'), { title: 'Документи', hint: 'що спливає', action: 'docs' }, { title: 'Сповіщення на телефон', hint: 'проблеми водіїв одразу', action: 'push' }],
    'бухгалтер': [{ title: 'Витрати водіїв', hint: 'чеки, перевірка', action: 'exp' }, T('Рейси', 'оплати клієнтів', 'Рейси'), T('Рухи коштів', '', 'Рухи коштів'), T('Виплати й доплати', '', 'Виплати й доплати'),
      T('Готівка від клієнтів', '', 'Готівка від клієнтів'), T('Клієнти', '', 'Клієнти')],
    'механік': [{ title: 'Дошка машин', hint: 'машини, документи, GPS', action: 'board' }, T('Авто', '', 'Авто'), T('Причепи', '', 'Причепи'), { title: 'Документи', hint: 'що спливає', action: 'docs' },
      T('Спідометр і пальне', '', 'Спідометр і пальне')],
    'водій': [{ title: 'Моя машина', hint: 'прийняти / здати · моя робота', action: 'truck' }, T('Мої рейси', '', 'Рейси'), { title: 'Гроші', hint: 'витрата, обмін, від клієнта', action: 'exp' }, T('Аванси й витрати', 'з бухгалтерії', 'Рухи коштів'), T('Заправки й спідометр', '', 'Спідометр і пальне'),
      T('Моя зарплата', 'нарахування', 'Нарахування'), T('Звіт по рейсу', 'з телефона', null, 'етап 5')]
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
  async function api(action, data = {}) {
    if (!CFG.API_URL) throw new Error('Програму ще не підключено до сервера (немає API_URL у config.js)');
    // кожне «Зберегти» має свій opId: якщо зв'язок обірвався і запит повторено, сервер не створить дубль (ADR-038)
    const ONCE = action === 'save' || action === 'truck.take' || action === 'truck.give' || action === 'trip.status.add' || action === 'tacho.add' || action === 'tripdoc.add';
    if (ONCE && !data.opId) data = { ...data, opId: newId() };
    const perf = perfQ.splice(0, 10), t0 = performance.now();
    const body = JSON.stringify({ action, token: store.get('token'), ...data, ...(perf.length ? { perf } : {}) });
    const send = () => fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
    let res;
    try { res = await send(); }
    catch (e) {
      if (ONCE) { try { await new Promise(r => setTimeout(r, 1500)); res = await send(); } catch (e2) { res = null; } }   // повтор — той самий opId
      if (!res) { $('offline').hidden = false; throw new Error('Немає зв\'язку з сервером'); }
    }
    $('offline').hidden = true;
    const out = await res.json();
    if (action !== 'login.code' && action !== 'login.google') perfQ.push({ a: action === 'batch' ? 'batch:' + (data.calls || []).map(c => c.action).join('+') : action, ms: Math.round(performance.now() - t0), at: Date.now() });
    if (!out.ok) {
      if (out.code === 'auth' && action !== 'login.code' && action !== 'login.google') { logout(true); }
      const err = new Error(out.error || 'Помилка'); err.code = out.code; err.current = out.current; throw err;
    }
    return out;
  }
  /* ── Черга записів без зв'язку (ADR-054): кроки рейсу, прийом/здача машини зберігаються на телефоні й надсилаються самі ── */
  const newId = () => crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
  const isNet = e => !e.code && /зв'язку/.test(e.message || '');
  const outbox = () => { try { return JSON.parse(store.get('outbox') || '[]'); } catch (e) { return []; } };
  const outboxSet = q => { store.set('outbox', JSON.stringify(q)); renderOutbox(); };
  async function apiQ(action, data, label) {
    data = { ...data, clientAt: Date.now(), opId: data.opId || newId() };
    const item = { action, data, label, at: Date.now() };
    if (outbox().length) { outboxSet(outbox().concat([item])); flushOutbox(); return { queued: true, opId: data.opId }; }   // зберегти порядок
    try { return await api(action, data); }
    catch (e) { if (!isNet(e)) throw e; outboxSet(outbox().concat([item])); return { queued: true, opId: data.opId }; }
  }
  let flushing = false;
  async function flushOutbox() {
    if (flushing || !store.get('token') || !outbox().length) return;
    flushing = true; let sent = 0;
    try {
      while (outbox().length) {
        const it = outbox()[0];
        try { const r = await api(it.action, it.data); sent++; if (it.action === 'tacho.add' && r && r.log) { tc = r; saveHomeTc(); } if (it.action === 'expense.add' && r && r.list) ex = r; if (it.action === 'tripdoc.add' && r && r.list) td = r; }
        catch (e) { if (isNet(e)) break; toast('<b>Не прийнято</b> «' + esc(it.label || it.action) + '»: ' + esc(e.message), 'err'); }
        outboxSet(outbox().filter(x => x.data.opId !== it.data.opId));
      }
    } finally { flushing = false; renderOutbox(); if (sent) { if (!$('exp').hidden) renderExp(); if (!$('tdoc').hidden) renderTdoc(); if (!$('tacho').hidden && !document.querySelector('.tsheet')) renderTacho(); } }
    if (sent && !outbox().length) { toast('✔ Надіслано все, що чекало зв\'язку (' + sent + ').'); if (me && me.role === 'водій' && !$('home').hidden) renderHome(); }
  }
  function renderOutbox() {
    const n = outbox().length; let b = $('outboxBar');
    if (!n) { if (b) b.hidden = true; return; }
    if (!b) { b = document.createElement('div'); b.id = 'outboxBar'; b.className = 'outbox'; document.body.appendChild(b); }
    b.hidden = false; b.innerHTML = '<span>📶 Немає зв\'язку. Не надіслано: <b>' + n + '</b> — надішлеться само</span><button class="btn">Надіслати зараз</button>';
    b.querySelector('.btn').onclick = () => flushOutbox();
  }
  window.addEventListener('online', () => flushOutbox());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) flushOutbox(); });
  setInterval(() => { if (outbox().length) flushOutbox(); }, 30000);
  /** Кроки, що ще чекають у черзі, показати поверх даних із сервера (щоб відмітка не «зникала»). */
  function applyOutbox(sv) {
    if (!sv || !sv.trip || !sv.steps) return sv;
    const q = outbox().filter(x => x.action === 'trip.status.add' && x.data.tripId === sv.trip.id && x.data.event !== 'проблема');
    if (!q.length) return sv;
    const o = JSON.parse(JSON.stringify(sv));
    q.forEach(x => { o.steps.forEach(st => { if (st.step === x.data.event && !st.at) { st.at = new Date(x.data.clientAt).toISOString(); st.id = 'q:' + x.data.opId; } }); });
    const li = o.steps.reduce((m, x, i) => x.at ? i : m, -1); o.next = (o.steps[li + 1] || {}).step || '';
    const lq = q[q.length - 1]; o.last = { event: lq.data.event, at: new Date(lq.data.clientAt).toISOString(), id: 'q:' + lq.data.opId, canUndo: true };
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
      document.body.appendChild(w); w.querySelector('[data-a="1"]').focus();
    });
  }
  /* Повідомлення вгорі екрана (замість alert і тексту внизу сторінки) */
  let toastT = null;
  function toast(html, kind, action) {
    let t = $('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.className = 'toast ' + (kind || ''); t.innerHTML = '<span>' + html + '</span>' + (action ? '<button class="btn">' + esc(action.label) + '</button>' : '') + '<button class="toast-x" aria-label="Закрити">×</button>';
    t.hidden = false; if (kind === 'err') vib([120, 60, 120]);
    if (action) t.querySelector('.btn').onclick = () => { t.hidden = true; action.run(); };
    t.querySelector('.toast-x').onclick = () => { t.hidden = true; };
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, kind === 'err' ? 15000 : 4000);
  }

  /* ── Екрани ── */
  let navSeq = 0, meFresh = false;   // кожен перехід між екранами; пізня відповідь сервера не перемикає екран, якщо людина вже пішла далі
  function show(id) { navSeq++; ['login', 'home', 'view', 'codes', 'board', 'trip', 'docs', 'calc', 'truck', 'tacho', 'exp', 'health', 'tdoc', 'rpt'].forEach(s => $(s).hidden = s !== id); window.scrollTo(0, 0); }

  function showLogin(msg) {
    $('who').hidden = true; show('login'); $('loginMsg').textContent = msg || '';
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
      if (ok) b.onclick = () => t.action === 'codes' ? openCodes() : t.action === 'board' ? openBoard() : t.action === 'docs' ? openDocs() : t.action === 'calc' ? openCalc() : t.action === 'truck' ? openTruck() : t.action === 'exp' ? openExp() : t.action === 'health' ? openHealth() : t.action === 'push' ? openPush() : openSheet(t);
      box.appendChild(b);
    });
    $('homeWork').innerHTML = ''; $('tiles').hidden = false; if ($('drvOutBox')) $('drvOutBox').innerHTML = '';
    if (me.role === 'водій') {
      $('homeTitle').textContent = 'Мій рейс'; $('homeHint').textContent = ''; $('tiles').hidden = true;
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
  }
  function drawDriverHome(st, sv) {
    sv = applyOutbox(sv); tk = st; stCur = sv;
    const has = st && st.planned && st.planned.length;
    const prof = '<div class="profile"><span>' + esc(me.name) + '</span><button class="btn" id="pushBtn">🔔 Сповіщення</button><button class="link danger-link" id="drvOut">Вийти з програми</button></div>';
    if ($('drvOutBox')) $('drvOutBox').innerHTML = '';
    if (has && sv && sv.trip) { $('homeWork').innerHTML = '<div id="stBox"></div><div id="timeBox"></div>' + prof; renderTimeBox(); $('tiles').hidden = true; renderStatus(); $('drvOut').onclick = askLogout; $('pushBtn').onclick = openPush; return; }
    // немає поточного рейсу — коротка картка роботи (або «поки немає») і звичайні плитки
    $('homeWork').innerHTML = '<div id="timeBox"></div>' + (has ? '<div id="homeWorkCard">' + workHtml(st.planned, true) + '</div>' : '<div class="card tkwork"><b>Запланованої роботи поки немає.</b><div class="muted small">Щойно логіст призначить рейс — він з\'явиться тут.</div></div>');
    $('homeWork').insertAdjacentHTML('beforeend', docsAlert(st && st.docs)); $('homeWork').querySelectorAll('.docalert').forEach(b => b.onclick = () => openTruck());
    $('tiles').hidden = false; bindWork(); renderTimeBox();
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
  const LOGIST_TEL = '+380970864081';   // «Подзвонити логісту» (поки тестовий номер від власниці, 21.11)
  const QUICK = [['Моя машина', 'truck', 'M3 16V7a1 1 0 011-1h10v10M14 9h4l3 3v4h-7M6.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm11 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z'],
    ['Гроші', 'exp', 'M3 7h18v10H3zM12 15a3 3 0 100-6 3 3 0 000 6zM6 10v4M18 10v4'], ['Фото документів', 'tdoc', 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7'], ['Проблема', 'problem', 'M12 4l9 16H3zM12 10v4M12 17h.01']];
  const svgI = d => '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
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
      '<div class="facts">' + facts + '</div>' + (() => { const n = navPoint(v); return n ? '<a class="navbtn" target="_blank" rel="noopener" href="' + esc(mapsUrl(n.q)) + '">🧭 Навігація: ' + ADDR_L[n.k] + (n.exact ? '' : ' (лише місто)') + '</a>' : ''; })() + '</article>';
    h += '<div class="next-action">' + (v.next ? '<button class="primary stgo" data-st="' + esc(v.next) + '"' + (stPending ? ' disabled' : '') + '>' + svgI('M5 12l5 5L20 7') + esc(ST_LABEL[v.next] || v.next) + '</button><p>' + esc(ST_HINT[v.next] || '') + '</p>' + (ahead.length ? '<p><button class="link" id="stAhead">Я вже далі</button></p><div id="stAheadBox" class="stahead" hidden><p class="muted small">Попередні кроки лишаться невідміченими — їх можна дописати потім.</p>' + ahead.map(x => '<button class="btn" data-st="' + esc(x) + '">' + esc(ST_LABEL[x] || x) + '</button>').join('') + '</div>' : '')
      : '<div class="cinfo">Усі кроки рейсу відмічено. Дякуємо!</div>') + '</div>';
    if (v.last && v.last.canUndo) { const left = me.role === 'водій' ? Math.max(1, 15 - Math.floor((Date.now() - new Date(v.last.at)) / 60000)) : 0;
      h += '<p class="undo-line"><button class="link" id="stUndo">' + svgI('M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3') + 'Скасувати «' + esc(v.last.event) + '»' + (left ? ' (ще ' + left + ' хв)' : '') + '</button></p>'; }
    if (msg) h += '<p class="stmsg" role="status">' + msg + '</p>';
    h += '<div class="quick">' + QUICK.map(q => '<button class="q' + (q[1] === 'problem' ? ' problem' : '') + '" data-q="' + q[1] + '">' + svgI(q[2]) + esc(q[0]) + '</button>').join('') + '</div>';
    h += docsAlert(tk && tk.docs);
    if (v.rmpd && v.rmpd.file && !store.get('rmpdSeen_' + v.rmpd.ver)) h += '<button class="docalert rmpdalert st-' + (v.rmpd.state === 'ok' ? 'ok' : 'soon') + '" data-rmpd="' + esc(v.trip.id) + '" data-ver="' + esc(v.rmpd.ver) + '">📄 RMPD готовий' + (v.rmpd.state === 'ok' ? ' · ✓ перевірено' : ' · ще перевіряється') + ' — відкрити ›</button>';
    if (v.rmpd && v.rmpd.file) { const ver = v.rmpd.ver, tid = v.trip.id; setTimeout(() => { if (!rmpdCached(ver) && navigator.onLine) rmpdFetch(tid, ver).catch(() => {}); }, 1500); }   // на кордоні може не бути зв'язку — завантажуємо заздалегідь
    // «Проблема»: спершу великі готові причини — одне натискання й надіслано; свій текст — за бажанням (без автоматичної клавіатури)
    h += '<div class="stprob card" id="stProbBox" hidden><a class="btn calllog" href="tel:' + LOGIST_TEL + '">📞 Подзвонити логісту</a><b>Що сталося? Натисніть — логіст отримає одразу</b><div class="probgrid">' + ['Довга черга', 'Поломка', 'Документи', 'Затримка на складі', 'ДТП'].map(c => '<button class="btn probone" data-pq="' + c + '">' + c + '</button>').join('') + '</div>' +
      '<details class="probown"><summary>Інше — написати своїми словами</summary><textarea id="stText" rows="3" placeholder="Коротко опишіть. Можна надиктувати — мікрофон на клавіатурі."></textarea><button class="primary" id="stProb">Надіслати логісту</button></details></div>';
    (v.problems || []).slice(-2).forEach(x => h += '<p class="cnote">Проблема ' + tkTime(x.at) + ': ' + esc(x.text) + '</p>');
    h += '<details class="card ststeps"><summary>Усі кроки рейсу · ' + doneN + ' з ' + v.steps.length + '</summary><ol class="stlist">' + v.steps.map((x, i) => '<li class="' + (x.at ? 'done' : x.step === v.next ? 'next' : '') + '"><span>' + (x.at ? '✓' : '○') + '</span><b>' + esc(x.step) + '</b>' +
      (x.at ? '<em>' + tkTime(x.at) + '</em>' : (i < lastIdx ? '<button class="link stany" data-st="' + esc(x.step) + '">пропущено — відмітити</button>' : '')) + '</li>').join('') + '</ol></details>';
    const rest = ((tk && tk.planned) || []).filter(x => x.id !== v.trip.id);
    if (rest.length) h += '<section class="card stnext"><h2>Далі</h2>' + rest.map(w => '<div class="wrow"><span class="pill st-free">' + (w.order ? 'заявка' : 'далі') + '</span><div><b>' + esc(w.from) + ' → ' + esc(w.to) + '</b><div class="muted small">машина ' + esc(w.truck) + ' · завантаження ' + (dd(w.load) || '?') + (w.cargo ? ' · ' + esc(w.cargo) : '') + '</div></div></div>').join('') + '</section>';
    h += '<p class="msg" id="stMsg"></p>';
    box.innerHTML = h;
    const send = async (event, text, fromHint) => {
      if (stPending || Date.now() < stLock) return;
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
    box.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { if (b.dataset.q === 'truck') openTruck(); else if (b.dataset.q === 'exp') openExp(); else if (b.dataset.q === 'fuel') openExp('Пальне'); else if (b.dataset.q === 'tdoc') openTdoc(); else if (b.dataset.q === 'problem') { $('stProbBox').hidden = !$('stProbBox').hidden; if (!$('stProbBox').hidden) $('stProbBox').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } });
    box.querySelectorAll('[data-pq]').forEach(b => b.onclick = async () => { if (await ask('Надіслати логісту: «' + b.dataset.pq + '»?', 'Логіст і керівник отримають повідомлення одразу.', 'Так, надіслати')) { $('stProbBox').hidden = true; stLock = 0; send('проблема', b.dataset.pq); } });
    if ($('hintYes')) $('hintYes').onclick = () => { stLock = 0; send(v.hint.step, undefined, true); };
    if ($('hintNo')) $('hintNo').onclick = () => { store.set(hk, String(Date.now() + 3 * 3600000)); renderStatus(); };
    if ($('stAhead')) $('stAhead').onclick = () => { $('stAheadBox').hidden = !$('stAheadBox').hidden; };
    if ($('stUndo')) $('stUndo').onclick = () => {
      if (stPending) return;
      const prev = stCur, o = JSON.parse(JSON.stringify(v)), ev = v.last.event;
      o.steps.forEach(x => { if (x.id === v.last.id) { x.at = ''; x.id = ''; } });
      const li = o.steps.reduce((m, x, i) => x.at ? i : m, -1); o.next = (o.steps[li + 1] || {}).step || ''; o.last = null;
      if (String(v.last.id).startsWith('q:')) {   // ще не надіслано — прибираємо з черги, сервер нічого не дізнається
        const op = String(v.last.id).slice(2); outboxSet(outbox().filter(x => x.data.opId !== op)); stCur = o; renderStatus('Крок «' + esc(ev) + '» скасовано (він ще не був надісланий).'); return;
      }
      stCur = o; stPending = true; renderStatus('Скасовано: <b>' + esc(ev) + '</b> · <span class="muted">надсилаю…</span>');
      api('trip.status.undo', { tripId: v.trip.id, id: v.last.id })
        .then(r => { stPending = false; stCur = r; if ($('stBox')) renderStatus('Крок «' + esc(ev) + '» скасовано.'); })
        .catch(e => { stPending = false; stCur = prev; if ($('stBox')) { renderStatus(); $('stMsg').textContent = 'Не скасовано: ' + e.message; } });
    };
    box.querySelectorAll('[data-chip]').forEach(c => c.onclick = () => { const t = $('stText'); t.value = c.dataset.chip === 'Інше' ? t.value : c.dataset.chip + (t.value ? '. ' + t.value : '. '); t.focus(); box.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c)); });
    $('stProb').onclick = () => { const t = $('stText').value.trim(); if (!t) { $('stMsg').textContent = 'Опишіть проблему'; return; } send('проблема', t); };
    if ($('homeWorkCard')) $('homeWorkCard').hidden = true;
    try { if (me && me.role === 'водій' && tk) store.set('homeDrv', JSON.stringify({ login: me.login, st: tk, sv: stCur })); } catch (e) {}
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
    const w = document.createElement('div'); w.className = 'ask-wrap'; w.innerHTML = '<div class="ask tsheet" role="dialog" aria-modal="true"><h2></h2>' + html + '<p class="msg" id="tsMsg"></p><div class="ask-btns"><button class="btn" data-a="0">Скасувати</button><button class="primary" data-a="1">Зберегти</button></div>' + (extra || '') + '</div>';
    w.querySelector('h2').textContent = title; document.body.appendChild(w);
    const more = w.querySelector('.ccmore'); if (more) more.onclick = e => { e.stopPropagation(); w.querySelectorAll('.ccx').forEach(x => x.hidden = false); more.remove(); };
    const close = () => { w.remove(); renderTacho(); };
    w.onclick = e => { if (e.target === w) close(); const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === '0') close(); else { const err = onSave(w); if (err) w.querySelector('#tsMsg').textContent = err; else close(); } };
    return w;
  }
  const timeVal = ms => { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  function pickTime(w, dayOff) { const v = w.querySelector('#tsTime').value; if (!/^\d\d:\d\d$/.test(v)) return null; const d = new Date(); d.setDate(d.getDate() - (dayOff || 0)); d.setHours(+v.slice(0, 2), +v.slice(3), 0, 0); return d.getTime(); }
  const timeRow = ms => '<label>Час</label><div class="tsrow"><button class="btn" data-dt="-5">−5</button><input id="tsTime" type="time" value="' + timeVal(ms) + '"><button class="btn" data-dt="5">+5</button></div>';
  const bindTime = w => w.querySelectorAll('[data-dt]').forEach(b => b.onclick = e => { e.stopPropagation(); const i = w.querySelector('#tsTime'), [h, m] = i.value.split(':').map(Number), t = (h * 60 + m + +b.dataset.dt + 1440) % 1440; i.value = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); });
  const chipsSel = (w, sel) => w.querySelectorAll(sel).forEach(c => c.onclick = e => { e.stopPropagation(); w.querySelectorAll(sel).forEach(x => x.setAttribute('aria-pressed', String(x === c))); });
  const chosen = (w, sel, attr) => { const c = w.querySelector(sel + '[aria-pressed="true"]'); return c ? c.dataset[attr] : ''; };
  function tachoDay(kind) {
    const r = tcCalc(), hint = (tc && tc.hint) || {}, start = kind === 'dayStart';
    const cc = hint.country || ((r && r.list.length && r.list[r.list.length - 1].country) || 'UA');
    const odoText = o => o.ft ? 'З Freetrack: ' + o.odo + ' км (на ' + hm(new Date(o.at).getTime()) + '). Перевірте з приладом — якщо інакше, виправте.' : null;
    const odoT = hint.odo ? odoText(hint.odo) || (hint.odo.gpsKm ? 'Підказка: ' + hint.odo.odo + ' км (' + esc(hint.odo.src) + ' ' + hint.odo.base + ' + ' + hint.odo.gpsKm + ' км за GPS). Перевірте з приладом.' : 'Останнє: ' + hint.odo.odo + ' км (' + esc(hint.odo.src) + '). Перевірте з приладом.') : 'Спідометр можна дописати пізніше.';
    const startRec = r && r.list.slice().reverse().find(x => x.kind === 'dayStart');
    const html = timeRow(Date.now()) +
      '<label>Країна</label><div class="chips ccbox">' + CC.map(c => '<button class="chip' + (c[0] === cc ? '' : ' ccx') + '" data-cc="' + c[0] + '" aria-pressed="' + (c[0] === cc) + '"' + (c[0] === cc ? '' : ' hidden') + '>' + c[1] + '</button>').join('') + '<button class="link ccmore" type="button">інша країна</button></div>' +
      (hint.place ? '<p class="muted small">За GPS ви біля: ' + esc(hint.place) + '</p>' : '') +
      '<label for="tsOdo">Спідометр, км</label><input id="tsOdo" inputmode="numeric" value="' + (hint.odo ? hint.odo.odo : '') + '"><p class="muted small" id="tsOdoT">' + odoT + '</p>' +
      (start ? '<label>З чого починаєте</label><div class="chips">' + ['work', 'drive'].map(k => '<button class="chip" data-fm="' + k + '" aria-pressed="' + (k === 'work') + '">' + TM[k][0] + '</button>').join('') + '</div>'
        : (r ? '<p class="muted">За день: за кермом ' + fmtD(r.ev.day || 0) + (startRec && startRec.odo ? ' · спідометр зранку ' + startRec.odo + ' км' : '') + '.</p><p class="muted small">Далі програма сама почне «Відпочинок» і покаже, коли можна їхати.</p>' : ''));
    const w = tsheet(start ? 'Початок дня' : 'Кінець дня', html, w => {
      const at = pickTime(w); if (!at) return 'Вкажіть час';
      if (at > Date.now() + 5 * 60000) return 'Час ще не настав';
      const odo = w.querySelector('#tsOdo').value.replace(/\s/g, '');
      if (odo && !/^\d{3,7}$/.test(odo)) return 'Спідометр — лише цифри';
      const op = { kind, at, country: chosen(w, '[data-cc]', 'cc'), odo: odo ? +odo : '', odoSrc: odo ? ow.src() : '' };
      if (start) op.mode = chosen(w, '[data-fm]', 'fm') || 'work';
      tachoSend(op, start ? 'День почато о ' + hm(at) : 'День закінчено о ' + hm(at) + '. Гарного відпочинку!');
    });
    bindTime(w); chipsSel(w, '[data-cc]'); chipsSel(w, '[data-fm]');
    const ow = odoWidget(w.querySelector('#tsOdo'), w.querySelector('#tsOdoT'), () => (tc && tc.truck) || '');
    w.querySelector('[data-a="1"]').textContent = start ? 'Почати день' : 'Закінчити день';
  }
  function tachoEdit(rec, gpsAt) {
    const r = tcCalc(), lim = Date.now() - ((tc && tc.editDays) || 2) * 86400000;
    const at0 = gpsAt || (rec ? rec.at : Date.now() - 30 * 60000), mode0 = rec ? window.DRV.recMode(rec) : 'drive';
    const dOff = Math.max(0, Math.round((new Date().setHours(0, 0, 0, 0) - new Date(at0).setHours(0, 0, 0, 0)) / 86400000));
    const html = '<label>Що робили</label><div class="tc-modes small">' + Object.keys(TM).map(k => '<button class="tc-mode" data-em="' + k + '" aria-pressed="' + (k === mode0) + '">' + svgI(TM[k][2]) + '<b>' + TM[k][0] + '</b></button>').join('') + '</div>' +
      '<label>День</label><div class="chips">' + ['Сьогодні', 'Вчора', 'Позавчора'].slice(0, ((tc && tc.editDays) || 2) + 1).map((t, i) => '<button class="chip" data-day="' + i + '" aria-pressed="' + (i === Math.min(dOff, 2)) + '">' + t + '</button>').join('') + '</div>' +
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
    const t = $('table'); t.innerHTML = '';
    const hr = t.createTHead().insertRow(); cols.forEach(c => { const th = document.createElement('th'); th.textContent = c; hr.appendChild(th); });
    const tb = t.createTBody();
    const isTrips = current.title && current.sheet === 'Рейси';
    rows.slice(0, 300).forEach(r => { const tr = tb.insertRow(); cols.forEach(c => { tr.insertCell().textContent = fmt(r[c]); });
      if (isTrips && r['Рейс ID']) { tr.className = 'brow'; tr.title = 'Відкрити картку рейсу'; tr.onclick = () => openTrip(r['Рейс ID'], 'view'); } });
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
  async function openBoard(force) {
    show('board'); const nav = navSeq; if ($('bNewTrip')) $('bNewTrip').hidden = !canTrip();
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
    $('bSub').textContent = 'Сьогодні ' + dd(b.today) + ' · оновлено о ' + b.updated + (b.pos && b.pos.at ? ' · місце машин на ' + tkTime(b.pos.at).split(', ').pop() + (b.pos.stale ? ' (давно: вночі не оновлюється)' : '') : '') + (b.gpsError ? ' · GPS: ' + b.gpsError : '');
    const F = { all: ['Усі', () => true], trip: ['В рейсі', x => x.status === 'trip'], free: ['Вільні', x => x.status === 'free'],
      prob: ['З проблемами', x => x.problems.length > 0],
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
      const flags = x.problems.map(p => flag(p.k, p.t, p.urgent)).concat(s && s.problem ? [flag('drv', 'Водій: ' + s.problem, true)] : []).join('');
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
      cols: t instanceof Error ? null : t.columns };
    return tfLists;
  }
  const tfType = (cross, adr) => { const j = String(cross || '').trim().toLowerCase(); return j === 'контейнеровоз' ? 'Контейнеровоз' : j === 'ставка по україні' ? 'Ставка по Україні' : adr ? 'АДР' : j === 'по україні' ? 'По Україні' : 'Міжнародка'; };
  const tfDate = v => { if (!v) return ''; const s = String(v); if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const d = new Date(s); return isNaN(d) ? s.slice(0, 10) : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); } return ''; };
  /** r — рядок рейсу (виправлення) або null (новий). opts.truck — машина для нового. */
  async function tripForm(r, opts) {
    opts = opts || {}; busy(true);
    let L; try { L = await tfLoad(); } catch (e) { toast(esc(e.message), 'err'); return; } finally { busy(false); }
    const isNew = !r, v = r || { 'Авто ID': opts.truck || '', 'Валюта': 'EUR', 'Оплата': 'безгот' };
    const has = c => !L.cols || L.cols.indexOf(c) >= 0;
    const inp = (c, extra, type) => has(c) ? '<label for="tf_' + c.replace(/\W/g, '') + '">' + esc(c.replace(' (як записано)', '')) + '</label><input id="tf_' + c.replace(/\W/g, '') + '" data-c="' + esc(c) + '"' + (type ? ' type="' + type + '"' : '') + ' value="' + esc(type === 'date' ? tfDate(v[c]) : (v[c] == null ? '' : v[c])) + '"' + (extra || '') + '>' : '';
    const sel = (c, list, empty) => has(c) ? '<label for="tf_' + c.replace(/\W/g, '') + '">' + esc(c) + '</label><select id="tf_' + c.replace(/\W/g, '') + '" data-c="' + esc(c) + '">' + (empty ? '<option value="">' + empty + '</option>' : '') + list.map(o => '<option value="' + esc(o[0]) + '"' + (String(v[c] || '') === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>' : '';
    const truckOpts = L.trucks.concat(v['Авто ID'] && L.trucks.indexOf(String(v['Авто ID'])) < 0 ? [String(v['Авто ID'])] : []).map(t => [t, t]);
    const drvOpts = L.drivers.map(d => [d.id, d.name + ' · ' + d.id]);
    const html = '<div class="tform">' +
      (isNew ? '' : '<p class="muted small">Рейс <b>' + esc(v['Рейс ID']) + '</b>. Під час пілоту головні — «Маршрути»: зміну внесіть і там, інакше нічне перенесення збереже обидві версії (програма не затре вашу правку).</p>') +
      '<fieldset><legend>Машина і водій</legend><div class="tfgrid">' + (isNew ? sel('Авто ID', truckOpts, '— оберіть —') + inp('Номер', ' inputmode="numeric" placeholder="номер рейсу машини"') : '') + sel('Водій ID', drvOpts, '— ще не вирішили —') + '</div></fieldset>' +
      '<fieldset><legend>Маршрут</legend><div class="tfgrid">' + inp('Звідки', ' placeholder="місто завантаження"') + inp('Дата завантаження', '', 'date') + inp('Куди', ' placeholder="місто розвантаження"') + inp('Дата розвантаження', '', 'date') +
        inp('Перехід', ' list="tfCross" placeholder="Краківець, Шегині, по Україні…"') + inp('Вантаж') + '</div>' +
        (has('АДР') ? '<label class="tfchk"><input type="checkbox" id="tf_adr"' + (v['АДР'] ? ' checked' : '') + '> АДР (небезпечний вантаж)</label>' : '') + '<p class="muted small" id="tfType"></p></fieldset>' +
      (has('Фрахт') ? '<fieldset><legend>Клієнт і оплата</legend><div class="tfgrid">' + inp('Клієнт (як записано)', ' list="tfClients"') + inp('Фрахт', ' inputmode="decimal"') + sel('Валюта', ['EUR', 'UAH', 'USD', 'PLN'].map(x => [x, x])) +
        inp('Оплата', ' list="tfPay"') + inp('Відстрочка, днів', ' inputmode="numeric"') + inp('Контакт клієнта') + '</div></fieldset>' : '') +
      '<fieldset><legend>Примітки</legend>' + (has('Примітки') ? '<textarea data-c="Примітки" rows="3">' + esc(v['Примітки'] || '') + '</textarea>' : '') + '</fieldset>' +
      '<datalist id="tfCross">' + ['Краківець', 'Шегині', 'Ягодин', 'Рава-Руська', 'Устилуг', 'Переїзд на експорт', 'Контейнеровоз', 'по Україні', 'Ставка по Україні'].map(x => '<option value="' + x + '">').join('') + '</datalist>' +
      '<datalist id="tfPay">' + ['безгот', 'готівка', 'карта', 'безгот на розв', 'готівка на розв'].map(x => '<option value="' + x + '">').join('') + '</datalist>' +
      '<datalist id="tfClients">' + L.clients.map(x => '<option value="' + esc(x) + '">').join('') + '</datalist>' +
      '<p class="msg" id="tfMsg"></p></div>';
    const w = document.createElement('div'); w.className = 'ask-wrap';
    w.innerHTML = '<div class="ask tsheet tfsheet" role="dialog" aria-modal="true"><h2>' + (isNew ? 'Новий рейс' : 'Виправити рейс') + '</h2>' + html + '<div class="ask-btns"><button class="btn" data-a="0">Скасувати</button><button class="primary" data-a="1">' + (isNew ? 'Створити рейс' : 'Зберегти зміни') + '</button></div></div>';
    document.body.appendChild(w);
    const q = s => w.querySelector(s), typeUpd = () => { if (q('#tfType')) q('#tfType').textContent = 'Тип рейсу: ' + tfType(q('[data-c="Перехід"]') ? q('[data-c="Перехід"]').value : v['Перехід'], q('#tf_adr') && q('#tf_adr').checked) + ' (рахується сам — для зарплати водія)'; };
    typeUpd(); w.querySelectorAll('[data-c="Перехід"], #tf_adr').forEach(e => e.oninput = e.onchange = typeUpd);
    // новий рейс: номер — наступний для машини (як у «Маршрутах»), можна виправити
    const sugg = async () => { const t = q('[data-c="Авто ID"]') && q('[data-c="Авто ID"]').value; if (!t || !q('[data-c="Номер"]') || q('[data-c="Номер"]').dataset.touched) return;
      try { const o = await api('list', { sheet: 'Рейси', filter: { 'Авто ID': t } }); const n = Math.max(0, ...o.rows.map(x => +x['Номер'] || 0)) + 1; if (!q('[data-c="Номер"]').dataset.touched) q('[data-c="Номер"]').value = n; } catch (e) {} };
    if (isNew) { if (q('[data-c="Номер"]')) q('[data-c="Номер"]').oninput = e => e.target.dataset.touched = '1'; if (q('[data-c="Авто ID"]')) q('[data-c="Авто ID"]').onchange = sugg; sugg(); }
    const close = () => w.remove();
    const save = async reason => {
      const row = {}; w.querySelectorAll('[data-c]').forEach(e => { const c = e.dataset.c; let val = e.value.trim(); if (c === 'Фрахт' || c === 'Відстрочка, днів' || c === 'Номер') val = val.replace(/\s/g, '').replace(',', '.');
        const old = c in v ? (e.type === 'date' ? tfDate(v[c]) : String(v[c] == null ? '' : v[c])) : ''; if (isNew || val !== old) row[c] = val; });
      if (q('#tf_adr')) { const a = q('#tf_adr').checked ? 'так' : ''; if (isNew || a !== String(v['АДР'] || '')) row['АДР'] = a; }
      const cross = 'Перехід' in row ? row['Перехід'] : v['Перехід'], adr = 'АДР' in row ? row['АДР'] : v['АДР'], tp = tfType(cross, adr);
      if (has('Тип') && (isNew || tp !== String(v['Тип'] || ''))) row['Тип'] = tp;
      if ('Водій ID' in row) { const d = L.drivers.find(x => x.id === row['Водій ID']); if (has('Водій (як записано)')) row['Водій (як записано)'] = d ? d.name : ''; }
      if (isNew) {
        if (!row['Авто ID']) { q('#tfMsg').textContent = 'Оберіть машину'; return; }
        if (!/^\d+$/.test(row['Номер'] || '')) { q('#tfMsg').textContent = 'Номер рейсу — цифрами'; return; }
        if (!row['Звідки'] || !row['Куди'] || !row['Дата завантаження']) { q('#tfMsg').textContent = 'Заповніть: звідки, куди, дата завантаження'; return; }
        if (has('Джерело')) row['Джерело'] = 'програма (логіст ' + (me.name || me.login) + ')';
        Object.keys(row).forEach(k => { if (row[k] === '') delete row[k]; });
      } else { if (!Object.keys(row).length) { close(); toast('Без змін.'); return; } row['Рейс ID'] = v['Рейс ID']; }
      const b = q('[data-a="1"]'); b.disabled = true; busy(true);
      try {
        const out = await api('save', { sheet: 'Рейси', row, ifHash: isNew ? undefined : v._h, reason });
        close(); board = null; try { store.set('boardCache', ''); } catch (e) {}
        toast(isNew ? '✔ Рейс <b>' + esc(out.row['Рейс ID']) + '</b> створено.' : (out.saved ? '✔ Зміни збережено.' : 'Без змін.'));
        openTrip(out.row['Рейс ID'], tripFrom);
      } catch (e) {
        b.disabled = false;
        if (e.code === 'reason') { const why = await askText('Чому змінюється фрахт?', 'Напр. клієнт погодив доплату за простій'); if (why) return save(why); q('#tfMsg').textContent = 'Без причини змінити фрахт не можна.'; }
        else if (e.code === 'conflict') { q('#tfMsg').textContent = 'Поки ви редагували, рейс змінив хтось інший. Закрийте вікно й відкрийте рейс заново.'; }
        else q('#tfMsg').textContent = e.message;
      } finally { busy(false); }
    };
    w.onclick = e => { const bt = e.target.closest('[data-a]'); if (!bt) return; if (bt.dataset.a === '0') close(); else save(); };
  }
  /** Коротке текстове питання (причина зміни). */
  function askText(title, ph) {
    return new Promise(res => {
      const w = document.createElement('div'); w.className = 'ask-wrap';
      w.innerHTML = '<div class="ask" role="dialog" aria-modal="true"><h2></h2><input id="atx" placeholder=""><div class="ask-btns"><button class="btn" data-a="0">Скасувати</button><button class="primary" data-a="1">Зберегти</button></div></div>';
      w.querySelector('h2').textContent = title; w.querySelector('#atx').placeholder = ph || '';
      const done = v => { w.remove(); res(v); };
      w.onclick = e => { const b = e.target.closest('[data-a]'); if (b) done(b.dataset.a === '1' ? w.querySelector('#atx').value.trim() : ''); };
      document.body.appendChild(w); w.querySelector('#atx').focus();
    });
  }

  /* ── RMPD рейсу (з бота RMPD) і адреси рейсу (ADR-070) ── */
  const mapsUrl = q => 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q);
  const ADDR_L = { load: 'Завантаження', cOut: 'Замитнення', cIn: 'Розмитнення', unload: 'Розвантаження' };
  const rmpdMark = st => st === 'ok' ? '✓' : st === 'none' ? '—' : st === 'warn' ? '⚠' : '⏳';
  /** RMPD-файл: спершу з телефона (працює без інтернету на кордоні), інакше — з сервера, і зберігаємо на телефоні. */
  function rmpdCached(ver) { try { const c = JSON.parse(store.get('rmpdFile') || 'null'); return c && c.ver === ver ? c : null; } catch (e) { return null; } }
  async function rmpdFetch(tripId, ver) {
    const hit = rmpdCached(ver); if (hit) return hit;
    const r = await api('rmpd.file', { tripId });
    try { store.set('rmpdFile', JSON.stringify({ ver: r.ver, name: r.name, mime: r.mime, data: r.data })); } catch (e) {}   // лише один, останній
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
  function addrCard(a, tripId, canEdit) {
    a = a || {}; const has = Object.keys(ADDR_L).some(k => a[k]);
    return '<section class="card addrc"><h2>Адреси</h2>' + Object.keys(ADDR_L).map(k => canEdit
      ? '<label for="ad_' + k + '">' + ADDR_L[k] + '</label><div class="adrow"><input id="ad_' + k + '" data-ad="' + k + '" value="' + esc(a[k] || '') + '" placeholder="вулиця, місто, індекс — або посилання з карти">' + (a[k] ? '<a class="btn" target="_blank" rel="noopener" href="' + esc(mapsUrl(a[k])) + '">Карта</a>' : '') + '</div>'
      : (a[k] ? '<div class="kv"><span>' + ADDR_L[k] + '</span><b><a target="_blank" rel="noopener" href="' + esc(mapsUrl(a[k])) + '">' + esc(a[k]) + '</a></b></div>' : '')).join('') +
      (canEdit ? '<p class="msg" id="adMsg"></p><button class="primary" id="adSave" data-adtrip="' + esc(tripId) + '">Зберегти адреси</button><p class="muted small">Водій побачить кнопку «Навігація». З заявки адреси підтягує бот; чого немає — впишіть тут.</p>' : (has ? '' : '<p class="muted">Адрес ще немає.</p>')) + '</section>';
  }
  function bindAddr(box) {
    const b = box.querySelector('#adSave'); if (!b) return;
    b.onclick = async () => {
      const addr = {}; box.querySelectorAll('[data-ad]').forEach(i => addr[i.dataset.ad] = i.value.trim());
      b.disabled = true; busy(true);
      try { const r = await api('trip.addr', { tripId: b.dataset.adtrip, addr }); box.innerHTML = addrCard(r.addr, b.dataset.adtrip, true); bindAddr(box); toast(r.changed ? '✔ Адреси збережено.' : 'Без змін.'); }
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
  async function openTrip(id, from) {
    tripFrom = from || 'board'; $('tripBackT').textContent = tripFrom === 'view' ? 'Таблиця' : board ? 'Дошка' : 'Назад';
    show('trip'); const nav = navSeq; $('tripBody').innerHTML = '<p class="muted">Завантаження рейсу ' + esc(id) + '…</p>';
    const can = new Set(sheets.map(s => s.name));
    const ask = (sheet, filter) => can.has(sheet) ? api('list', { sheet, filter }).catch(() => null) : Promise.resolve(null);
    try {
      const [tr, zv, mv, jr] = await Promise.all([ask('Рейси', { 'Рейс ID': id }), ask('Заявки', { 'Рейс ID': id }),
        ask('Рухи коштів', { 'Рейс ID': id }), ask('Журнал змін', { 'Запис ID': id })]);
      if (nav !== navSeq) return;
      const r = tr && tr.rows[0];
      if (!r) { $('tripBody').innerHTML = '<p class="msg">Рейс ' + esc(id) + ' не знайдено.</p>'; return; }
      $('tripBody').innerHTML = tripHtml(r, tr.columns, zv && zv.rows, mv && mv.rows, jr && jr.rows);
      if ($('tripEdit')) $('tripEdit').onclick = () => tripForm(r);
      api('trip.status', { tripId: id }).then(v => { if (!v || !v.trip || !$('tripSt') || nav !== navSeq) return;
        const any = v.steps.some(x => x.at) || (v.problems || []).length, last = v.steps.map(x => !!x.at).lastIndexOf(true);
        if (last >= 0 && $('tripBadge')) { const ev = v.steps[last].step; $('tripBadge').innerHTML = badge(ST_GRP[ev] || 'go', cap(ev)); }
        $('tripSt').innerHTML = '<section class="card tsteps"><h2>Кроки рейсу від водія</h2>' + (any ? '<ol class="tl">' + v.steps.map((x, i) => '<li class="' + (i === last ? 'now' : x.at ? 'done' : 'todo') + '"><span class="dot" aria-hidden="true"></span><span class="tl-t">' + esc(cap(x.step)) + (i === last ? '<span class="sr"> — зараз</span>' : '') + '</span>' + (x.at ? '<small>' + tkTime(x.at) + '</small>' : i < last ? '<small>пропущено</small>' : '') + '</li>').join('') + '</ol>' +
          (v.problems || []).map(p => '<p class="cnote">Проблема ' + tkTime(p.at) + ': ' + esc(p.text) + '</p>').join('') : '<p class="muted">Водій ще нічого не відмітив.</p>') + '</section>'; }).catch(() => {});
      api('tripdoc', { tripId: id }).then(v => { if (!v || nav !== navSeq || !$('tripDocs')) return;
        const edit = ['адмін', 'керівник', 'логіст'].indexOf(me.role) >= 0;
        $('tripDocs').innerHTML = rmpdCard(v.rmpd, id, true) + '<div id="tripAddr">' + addrCard(v.addr, id, edit) + '</div>' + tdocCard(v.list, true);
        bindTdocList($('tripDocs')); bindRmpd($('tripDocs')); bindAddr($('tripAddr')); }).catch(() => {});
    } catch (e) { if (nav === navSeq) $('tripBody').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  function tripHtml(r, cols, orders, moves, journal) {
    const has = c => cols.indexOf(c) >= 0 && r[c] !== '' && r[c] !== null && r[c] !== undefined;
    const f = (label, c, cls) => has(c) ? '<div class="kv' + (cls ? ' ' + cls : '') + '"><span>' + esc(label) + '</span><b>' + esc(fmt(typeof r[c] === 'number' ? money(r[c]) : r[c])) + '</b></div>' : '';
    const unl = r['Дата розвантаження'], due = r['Очікувана оплата'];
    const late = due && !r['Оплачено'] && new Date(due) < new Date(new Date().toDateString());
    let h = '<div class="thead"><div class="ttl"><h1>Рейс ' + esc(r['Рейс ID']) + '</h1><span id="tripBadge"></span>' + (canTrip() ? '<button class="btn" id="tripEdit">✏️ Виправити</button>' : '') + '</div>' +
      '<p class="tplates">' + [r['Авто ID'] && '<span class="plate ua">' + esc(r['Авто ID']) + '</span>', r['Водій (як записано)'] && esc(r['Водій (як записано)']), r['Тип'] && esc(r['Тип']), r['АДР'] && '<span class="badge b-warn">' + svgI(PROB.drv) + 'АДР</span>', r['Кругорейс ID'] && 'кругорейс ' + esc(r['Кругорейс ID'])].filter(Boolean).join(' · ') + '</p></div>';
    h += '<div class="route card"><div><span class="muted small">Завантаження</span><b>' + esc(r['Звідки'] || '—') + '</b><span>' + esc(fmt(r['Дата завантаження'])) + '</span></div>' +
      '<div class="arrow">→</div><div><span class="muted small">Розвантаження</span><b>' + esc(r['Куди'] || '—') + '</b><span>' + (unl ? esc(fmt(unl)) : '<span class="muted">дата не вказана</span>') + '</span></div></div><div id="tripSt"></div><div id="tripDocs"></div>';
    const cargo = [f('Вантаж', 'Вантаж'), f('Тонн', 'Тонн'), f('Перехід', 'Перехід'), f('Км', 'Км'), f('Пальне, л', 'Пальне, л'), f('Допомагав вантажити', 'Допомагав'), f('ТТН документів', 'ТТН документів')].join('');
    const pay = [f('Клієнт', 'Клієнт (як записано)'), f('Клієнт ID', 'Клієнт ID'), f('Контакт клієнта', 'Контакт клієнта'), (has('Фрахт') ? '<div class="kv big"><span>Фрахт</span><b>' + esc(money(r['Фрахт'])) + '\u00a0' + esc(({ EUR: '€', PLN: 'zł', USD: '$', UAH: 'грн' })[String(r['Валюта'] || '').toUpperCase()] || r['Валюта'] || '') + '</b></div>' : ''), f('Оплата', 'Оплата'),
      f('Відстрочка, днів', 'Відстрочка, днів'), f('Очікувана оплата', 'Очікувана оплата', late ? 'bad' : ''), f('Оплачено', 'Оплачено', 'ok'), f('Коментар оплати', 'Коментар оплати')].join('');
    const sal = [f('Зарплата (Аналітика)', 'Зарплата (Аналітика)'), f('Зарплата (нова)', 'Зарплата (нова)'), f('Особлива ставка', 'Особлива ставка'), f('Як порахована', 'Як порахована')].join('');
    h += '<div class="tgrid">';
    if (cargo) h += '<section class="card"><h2>Вантаж і дорога</h2>' + cargo + '</section>';
    if (pay) h += '<section class="card"><h2>Клієнт і оплата</h2>' + pay + (late ? '<p class="msg small">Строк оплати минув, позначки «Оплачено» немає.</p>' : '') + '</section>';
    if (sal) h += '<section class="card"><h2>Зарплата водія</h2>' + sal + '</section>';
    if (has('Примітки')) h += '<section class="card"><h2>Примітки</h2><p>' + esc(r['Примітки']) + '</p></section>';
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
    h += '</div><p class="muted small">Джерело: ' + esc(r['Джерело'] || 'база') + '. Поки лише перегляд — редагування з\'явиться разом із переходом аркуша «Рейси» на програму.</p>';
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
  const photoStrip = (id, n, multi) => '<div class="phstrip"><span>' + (n ? '📎 ' + n + ' фото' : 'Фото') + '</span><label class="phbtn" for="' + id + 'C">' + svgI(PH_CAM) + 'Камера</label><input id="' + id + 'C" type="file" accept="image/*" capture="environment" hidden>' +
    '<label class="phbtn" for="' + id + 'G">' + svgI(PH_GAL) + 'Галерея</label><input id="' + id + 'G" type="file" accept="image/*"' + (multi ? ' multiple' : '') + ' hidden></div>';
  const CC_CUR = { PL: 'PLN', UA: 'UAH', HU: 'HUF', CZ: 'CZK', RO: 'RON' };
  const fmtSum = (s, c) => Number(s).toLocaleString('uk-UA', { maximumFractionDigits: 2 }) + ' ' + c;
  const exOffice = () => me && me.role !== 'водій';
  async function openExp(type) {
    show('exp'); const nav = navSeq;
    exDraft = { mode: 'exp', type: type || '', sum: '', cur: '', pay: '', liters: '', odo: '', note: '', photo: '', uah: '', more: false };
    $('expTitle').textContent = exOffice() ? 'Витрати водіїв' : 'Гроші';
    if (!ex) $('expBody').innerHTML = '<p class="muted">Завантаження…</p>'; else renderExp();
    try { ex = await api('expense', exOffice() ? { days: 31 } : {}); if (nav === navSeq) renderExp(); }
    catch (e) { if (!ex) $('expBody').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
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
        '<p class="msg" id="exMsg"></p><button class="primary" id="exSave">' + (d.mode === 'xch' ? 'Записати обмін' : d.mode === 'cli' ? 'Записати гроші від клієнта' : d.mode === 'got' ? 'Записати — офіс затвердить' : 'Записати витрату') + '</button></section>';
    }
    const list = (office ? [] : expPending()).concat(ex.list);
    const flt = office ? (store.get('exFlt') || 'нова') : 'all';
    if (office) h += '<div class="chips exflt">' + [['нова', 'Нові'], ['питання', 'Питання'], ['all', 'Усі']].map(([k, t]) => '<button class="chip" data-ef="' + k + '" aria-pressed="' + (flt === k) + '">' + t + ' <small>' + (k === 'all' ? ex.list.length : ex.list.filter(x => x.status === k).length) + '</small></button>').join('') + '</div>';
    const shown = list.filter(x => flt === 'all' || x.status === flt);
    const wk = Date.now() - 7 * 86400000, sums = {}; list.filter(x => x.at >= wk).forEach(x => { sums[x.cur] = (sums[x.cur] || 0) + x.sum; });
    h += '<section class="card exlist"><h2>' + (office ? 'Витрати водіїв за 31 день' : 'Мої гроші за 31 день') + '</h2>' + (Object.keys(sums).length ? '<p class="muted">За 7 днів: ' + Object.keys(sums).map(c => fmtSum(sums[c], c)).join(' · ') + '</p>' : '') +
      (shown.length ? shown.map(x => {
        const gotT = x.type === 'Отримав під звіт';
        const st = x.pending ? '<span class="exst pend">ще на телефоні</span>' : x.status === 'перевірено' ? '<span class="exst ok">✓ ' + (gotT ? 'затверджено' : 'перевірено') + '</span>' : gotT && x.status === 'нова' ? '<span class="exst new">чекає затвердження</span>' : x.status === 'питання' ? '<span class="exst q">? питання' + (x.statusNote ? ': ' + esc(x.statusNote) : '') + '</span>' : '<span class="exst new">нова</span>';
        const canUndo = !office && !x.pending && x.status === 'нова' && Date.now() - (x.saved || x.at) < (ex.undoMin || 15) * 60000;
        return '<div class="exitem"><div class="exmain">' + svgI(EX_ICO[x.type] || EX_ICO['Інше']) + '<div><b>' + esc(fmtSum(x.sum, x.cur)) + '</b> · ' + esc(x.type === 'Обмін валюти' ? 'купив валюту' + (x.uah ? ' за ' + fmtSum(x.uah, 'UAH') : '') : EX_LBL[x.type] || x.type) + (x.liters ? ' · ' + x.liters + ' л' : '') +
          '<small>' + (office ? esc(x.name || x.worker) + ' · ' : '') + new Date(x.at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + (x.truck ? ' · ' + esc(x.truck) : '') + (x.pay && x.pay !== 'Готівка' ? ' · ' + esc(x.pay) : '') + (x.note ? ' · ' + esc(x.note) : '') + '</small>' + st + '</div></div>' +
          '<div class="exact">' + (x.photo && !x.pending ? '<button class="btn" data-eph="' + esc(x.id) + '">Чек</button>' : '') + (canUndo ? '<button class="btn" data-eun="' + esc(x.id) + '">Скасувати</button>' : '') +
          (office && x.status !== 'перевірено' ? '<button class="btn" data-eok="' + esc(x.id) + '">✓ ' + (gotT ? 'Затвердити' : 'Перевірено') + '</button>' : '') + (office && x.status !== 'питання' ? '<button class="btn" data-eq="' + esc(x.id) + '">? Питання</button>' : '') + '</div></div>';
      }).join('') : '<p class="muted">' + (office ? 'Тут порожньо.' : 'Записів за 31 день ще немає.') + '</p>') +
      (office ? '' : '<button class="btn rptlink" id="exRpt">' + svgI('M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h4') + 'Здати звіт за поїздку</button>') + '</section>';
    b.innerHTML = h;
    // форма водія
    const keep = () => { if ($('exSum')) d.sum = $('exSum').value; if ($('exNote')) d.note = $('exNote').value; if ($('exLit')) d.liters = $('exLit').value; if ($('exUah')) d.uah = $('exUah').value; };
    b.querySelectorAll('[data-em]').forEach(e => e.onclick = () => { keep(); d.mode = e.dataset.em; d.cur = ''; d.type = ''; renderExp(); });
    b.querySelectorAll('[data-ep]').forEach(e => e.onclick = () => { keep(); d.pay = e.dataset.ep; renderExp(); });
    b.querySelectorAll('[data-et]').forEach(e => e.onclick = () => { keep(); d.type = e.dataset.et; renderExp(); $('exSum').focus(); });
    b.querySelectorAll('[data-ec]').forEach(e => e.onclick = () => { keep(); d.cur = e.dataset.ec; renderExp(); });
    if ($('exRpt')) $('exRpt').onclick = () => openRpt();
    if (b.querySelector('[data-ecm]')) b.querySelector('[data-ecm]').onclick = () => { keep(); d.curAll = true; renderExp(); };
    if (b.querySelector('[data-emore]')) b.querySelector('[data-emore]').onclick = () => { keep(); d.more = true; renderExp(); };
    if (b.querySelector('[data-exdel]')) b.querySelector('[data-exdel]').onclick = () => { keep(); d.photo = ''; renderExp(); };
    const rateUpd = () => { if (!$('exRate')) return; const a = +String($('exSum').value).replace(',', '.'), u = +String($('exUah').value).replace(',', '.'); $('exRate').textContent = a > 0 && u > 0 ? 'Курс: ' + (u / a).toFixed(2).replace('.', ',') + ' грн за 1 ' + d.cur : 'Курс порахується сам.'; };
    if ($('exUah')) { $('exUah').oninput = rateUpd; $('exSum').oninput = rateUpd; }
    const exPick = async e => { const f = e.target.files[0]; if (!f) return; keep(); try { d.photo = await shrinkPhoto(f); } catch (er) { toast('Не вдалося прочитати фото — спробуйте ще раз', 'err'); } renderExp(); };
    if ($('exFC')) $('exFC').onchange = exPick; if ($('exFG')) $('exFG').onchange = exPick;
    if ($('exSave')) $('exSave').onclick = () => {
      keep(); const num = v => String(v).replace(/\s/g, '').replace(',', '.'), sum = num(d.sum), uah = num(d.uah);
      const type = d.mode === 'xch' ? 'Обмін валюти' : d.mode === 'cli' ? 'Від клієнта' : d.mode === 'got' ? 'Отримав під звіт' : d.type;
      if (!type) { $('exMsg').textContent = 'Оберіть, на що витрата'; return; }
      if (!/^\d+(\.\d{1,2})?$/.test(sum) || +sum <= 0) { $('exMsg').textContent = d.mode === 'xch' ? 'Скільки валюти купили — цифрами' : 'Вкажіть суму цифрами'; $('exSum').focus(); return; }
      if (d.mode === 'xch' && (!/^\d+(\.\d{1,2})?$/.test(uah) || +uah <= 0)) { $('exMsg').textContent = 'Скільки гривень віддали — цифрами'; $('exUah').focus(); return; }
      const op = { id: 'EX-' + newId().slice(0, 18), type, sum: +sum, cur: d.cur, pay: d.mode === 'exp' ? (d.pay || 'Готівка') : 'Готівка', liters: String(d.liters).replace(',', '.'), odo: '', note: d.note.trim(), photo: d.photo, uah: d.mode === 'xch' ? +uah : '',
        country: (tc && tc.hint && tc.hint.country) || '' };
      vib(30); const label = (d.mode === 'xch' ? 'обмін ' : d.mode === 'cli' ? 'від клієнта ' : d.mode === 'got' ? 'отримав під звіт ' : '') + fmtSum(op.sum, op.cur);
      apiQ('expense.add', { op, truck: (tk && tk.current && tk.current.truck) || (tc && tc.truck) || '', trip: (stCur && stCur.trip && stCur.trip.id) || '', opId: op.id }, label)
        .then(r => { if (r.queued) toast('Збережено на телефоні: <b>' + esc(label) + '</b>. Надішлеться само, щойно з\'явиться зв\'язок.'); else ex = r; if (!$('exp').hidden) renderExp(); })
        .catch(e => { toast('<b>Не записано</b>: ' + esc(e.message), 'err'); });
      toast('Записано: ' + esc(label) + (d.mode === 'exp' ? ' · ' + esc(op.type) : ''), '', { label: 'Скасувати', run: () => expUndo(op.id) });
      exDraft = { mode: d.mode, type: '', sum: '', cur: d.cur, pay: d.pay, liters: '', odo: '', note: '', photo: '', uah: '', more: false }; renderExp();
      const nl = document.querySelector('.exlist'); if (nl) nl.scrollIntoView({ block: 'start', behavior: 'smooth' });
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
  const tdIco = k => TD_ICO[k] || 'M4 8h3l2-2h6l2 2h3v11H4zM12 16a3 3 0 100-6 3 3 0 000 6z';
  async function openTdoc() {
    show('tdoc'); const nav = navSeq; tdDraft = { kind: 'CMR', note: '', photos: [] };
    if (!td) $('tdBody').innerHTML = '<p class="muted">Завантаження…</p>'; else renderTdoc();
    try { td = await api('tripdoc', {}); if (nav === navSeq) renderTdoc(); }
    catch (e) { if (!td) $('tdBody').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
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
    let h = msg ? '<div class="cinfo">' + msg + '</div>' : '';
    if (!td.trip) { b.innerHTML = h + '<section class="card"><p>Зараз немає поточного рейсу. Коли логіст призначить рейс, тут можна буде сфотографувати CMR та інші документи.</p></section>'; return; }
    h += '<p class="muted">Рейс <b>' + esc(td.trip.id) + '</b>' + (td.trip.from || td.trip.to ? ' · ' + esc(td.trip.from || '—') + ' → ' + esc(td.trip.to || '—') : '') + '</p>';
    h += rmpdCard(td.rmpd, td.trip.id, false);
    h += '<section class="card exform"><h2>Що фотографуєте?</h2><div class="extypes">' + td.kinds.map(k => '<button class="extype" data-tk="' + esc(k) + '" aria-pressed="' + (k === d.kind) + '">' + svgI(tdIco(k)) + '<span>' + esc(k) + '</span></button>').join('') + '</div>' +
      photoStrip('td', d.photos.length, true) +
      (d.photos.length ? '<div class="tdthumbs">' + d.photos.map((p, i) => '<span><img class="exthumb" alt="Сторінка ' + (i + 1) + '" src="data:image/jpeg;base64,' + p + '"><button class="link" data-tdel="' + i + '">прибрати</button></span>').join('') + '</div>' : '') +
      '<label for="tdNote">Примітка (можна не писати)</label><input id="tdNote" value="' + esc(d.note) + '" placeholder="напр. CMR з печаткою отримувача">' +
      '<p class="msg" id="tdMsg"></p><button class="primary' + (d.photos.length ? '' : ' dim') + '" id="tdSave">' + (d.photos.length > 1 ? 'Записати (' + d.photos.length + ' фото)' : 'Записати фото') + '</button></section>';
    const list = tdPending().map(x => Object.assign(x, { photo: false })).concat(td.list);
    h += tdocCard(list, false);
    b.innerHTML = h;
    const keep = () => { if ($('tdNote')) d.note = $('tdNote').value; };
    b.querySelectorAll('[data-tk]').forEach(e => e.onclick = () => { keep(); d.kind = e.dataset.tk; renderTdoc(); });
    b.querySelectorAll('[data-tdel]').forEach(e => e.onclick = () => { keep(); d.photos.splice(+e.dataset.tdel, 1); renderTdoc(); });
    const tdPick = async e => { const fs = [...e.target.files].slice(0, 10); if (!fs.length) return; keep(); let bad = 0;
      for (const f of fs) { try { d.photos.push(await shrinkPhoto(f)); } catch (er) { bad++; } }
      if (bad) toast('Не вдалося прочитати ' + bad + ' фото — спробуйте ще раз', 'err'); renderTdoc(); };
    $('tdC').onchange = tdPick; $('tdG').onchange = tdPick;
    $('tdSave').onclick = () => {
      keep();
      if (!d.kind) { $('tdMsg').textContent = 'Оберіть, що за документ'; return; }
      if (!d.photos.length) { $('tdMsg').textContent = 'Сфотографуйте документ'; return; }
      vib(30); const n = d.photos.length, kind = d.kind;
      d.photos.forEach((p, i) => {
        const op = { id: 'TD-' + newId().slice(0, 18), kind, note: (d.note.trim() + (n > 1 ? ' (стор. ' + (i + 1) + ' з ' + n + ')' : '')).trim(), photo: p };
        apiQ('tripdoc.add', { op, tripId: td.trip.id, opId: op.id }, kind + (n > 1 ? ' стор. ' + (i + 1) : ''))
          .then(r => { if (!r.queued) td = r; if (!$('tdoc').hidden) renderTdoc(); })
          .catch(e => toast('<b>Не записано</b>: ' + esc(e.message), 'err'));
      });
      toast('Записано: ' + esc(kind) + (n > 1 ? ' · ' + n + ' фото' : ''));
      tdDraft = { kind: 'CMR', note: '', photos: [] }; renderTdoc();
    };
    bindTdocList(b); bindRmpd(b);
  }
  async function tdUndo(id, box) {
    const q = outbox().find(x => x.action === 'tripdoc.add' && x.data.op.id === id);
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
  let rp = null;
  const sums = m => { const k = Object.keys(m || {}).filter(c => m[c]); return k.length ? k.map(c => fmtSum(m[c], c)).join(' · ') : '—'; };
  async function openRpt() {
    show('rpt'); const nav = navSeq; $('rpBody').innerHTML = '<p class="muted">Збираю звіт…</p>';
    try { rp = await api('report', {}); if (nav === navSeq) renderRpt(); } catch (e) { if (nav === navSeq) $('rpBody').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  function renderRpt(msg) {
    const d = rp && rp.draft; if (!d) return;
    const dt = t => new Date(t).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
    const curs = Array.from(new Set(['UAH'].concat(Object.keys(d.calc), Object.keys(d.open)))).filter(c => c === 'UAH' || d.calc[c] || d.open[c]);
    let h = msg ? '<div class="cinfo">' + msg + '</div>' : '';
    h += '<p class="muted">З ' + dt(d.from) + ' по сьогодні' + (d.truck ? ' · машина ' + esc(d.truck) : '') + (d.circle ? ' · кругорейс ' + esc(d.circle) : '') + '</p>';
    h += '<section class="card rpsum"><h2>Гроші</h2>' +
      '<div class="kv"><span>Залишок на початок</span><b>' + sums(d.open) + '</b></div>' +
      '<div class="kv"><span>Отримав під звіт / аванс</span><b>' + sums(d.got) + '</b></div>' +
      '<div class="kv"><span>Витратив готівкою</span><b>' + sums(d.spent) + '</b></div>' +
      (d.card && Object.keys(d.card).length ? '<div class="kv"><span>Оплачено карткою фірми (не з готівки)</span><b>' + sums(d.card) + '</b></div>' : '') +
      (Object.keys(d.xch).length ? '<div class="kv"><span>Обмін валюти</span><b>' + Object.keys(d.xch).map(c => (d.xch[c] > 0 ? '+' : '') + fmtSum(d.xch[c], c)).join(' · ') + '</b></div>' : '') +
      '<div class="kv big"><span>Має лишитись</span><b>' + sums(d.calc) + '</b></div>' +
      (Object.keys(d.client).length ? '<div class="kv"><span>Гроші від клієнта (передати в офіс)</span><b>' + sums(d.client) + '</b></div>' : '') + '</section>';
    h += '<section class="card exform"><h2>Скільки готівки у вас зараз</h2><p class="muted small">Порахуйте гроші й впишіть по кожній валюті. Якщо збігається — просто підтвердіть.</p>' +
      curs.map(c => '<label for="rpF_' + c + '">' + c + '</label><input id="rpF_' + c + '" class="exsum" inputmode="decimal" value="' + (d.calc[c] != null ? Math.max(0, d.calc[c]) : 0) + '">').join('') +
      '<h2 style="margin-top:14px">Спідометр</h2><p class="muted small">На початку: <b>' + (d.odoA ? Number(d.odoA).toLocaleString('uk-UA') + ' км' : 'немає даних') + '</b></p>' +
      '<label for="rpOdo">Зараз, км</label><input id="rpOdo" inputmode="numeric" value="' + (d.odoB || '') + '">' +
      '<label for="rpNote">Коментар (можна не писати)</label><input id="rpNote" placeholder="напр. допомагав вантажити, відміна рейсу">' +
      '<p class="msg" id="rpMsg"></p><button class="primary" id="rpSend">Підтвердити й надіслати звіт</button></section>';
    h += '<details class="card"><summary>Що увійшло у звіт (' + d.items.length + ')</summary>' + (d.items.length ? d.items.map(x => '<div class="kv"><span>' + dt(x.at) + ' · ' + esc(x.kind) + ' · ' + esc(x.text) + '</span><b>' + fmtSum(x.sum, x.cur) + (x.uah ? ' за ' + fmtSum(x.uah, 'UAH') : '') + '</b></div>').join('') : '<p class="muted">Записів ще немає.</p>') +
      (d.trips.length ? '<p class="muted small">Рейси: ' + d.trips.map(t => esc(t.id) + ' ' + esc(t.from) + '→' + esc(t.to)).join('; ') + '</p>' : '') + '</details>';
    if (rp.list && rp.list.length) h += '<section class="card"><h2>Попередні звіти</h2>' + rp.list.map(r => '<div class="kv"><span>' + dt(r.from) + '–' + dt(r.to) + (r.status === 'питання' ? ' · <b>питання: ' + esc(r.statusNote || '') + '</b>' : '') + '</span><b>' + esc(r.status) + '</b></div>').join('') + '</section>';
    $('rpBody').innerHTML = h;
    $('rpSend').onclick = async () => {
      const fact = {}; for (const c of curs) { const v = String($('rpF_' + c).value).replace(/\s/g, '').replace(',', '.'); if (v === '') continue; if (!/^\d+(\.\d{1,2})?$/.test(v)) { $('rpMsg').textContent = 'Залишок ' + c + ' — лише цифри'; return; } fact[c] = +v; }
      const odo = String($('rpOdo').value).replace(/\s/g, ''); if (odo && !/^\d+$/.test(odo)) { $('rpMsg').textContent = 'Спідометр — лише цифри'; return; }
      if (!await ask('Надіслати звіт?', 'Після цього новий звіт почнеться з цих залишків.', 'Так, надіслати')) return;
      busy(true);
      try { rp = await api('report.submit', { fact, odoB: odo, note: $('rpNote').value.trim(), truck: d.truck, opId: 'RP-' + newId().slice(0, 16) });
        const df = rp.diff || {}; renderRpt('✔ Звіт надіслано.' + (Object.keys(df).length ? ' Різниця з розрахунком: ' + Object.keys(df).map(c => (df[c] > 0 ? '+' : '') + fmtSum(df[c], c)).join(' · ') + ' — офіс уточнить.' : ' Усе зійшлося.')); window.scrollTo(0, 0); }
      catch (e) { $('rpMsg').textContent = e.message; } finally { busy(false); }
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
      info.innerHTML = (o ? 'Freetrack: <b>' + Number(o.odo).toLocaleString('uk-UA') + ' км</b> (на ' + when(o.at) + ').' : truckFn() ? 'У Freetrack ще немає показань цієї машини.' : '') +
        (r && r.next ? ' Наступне автоматичне оновлення — ' + when(r.next) + '.' : '') + (note ? ' <b>' + esc(note) + '</b>' : '') +
        (truckFn() ? ' <button class="link odo-live" type="button">Взяти з GPS</button>' : '') + '<br>Якщо на приладі інакше — впишіть з приладу.';
      const b = info.querySelector('.odo-live'); if (b) b.onclick = () => load(true);
    };
    async function load(live) {
      const truck = truckFn(); if (!truck) { last = null; render(); return; }
      if (live) render('Запитую…');
      try {
        const r = await api('tacho.odo', { truck, live: live ? 1 : '' }); last = r;
        if (r.odo && (live || (!typed && !input.value))) { input.value = r.odo.odo; src = 'ft'; typed = false; }
        render(r.busy ? 'Freetrack зайнятий — спробуйте через ' + Math.max(1, Math.ceil(r.busy / 60)) + ' хв або впишіть з приладу.' : live && r.odo ? 'Оновлено.' : '');
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
    if (!tk) $('tkBody').innerHTML = '<p class="muted">Завантаження…</p>';
    const nav = navSeq;
    try { tk = await api('truck.state'); if (nav === navSeq) renderTruck(msg); }
    catch (e) { if (nav === navSeq) $('tkBody').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
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
        '<button class="link" id="tkSwitch" style="margin-top:14px">Пересісти на іншу машину</button><p class="msg" id="tkMsg"></p></div>';
    } else {
      const sel = (c && c.truck) || tk.guess || '';
      h += '<div class="card"><p class="muted" style="margin-top:0">' + (c ? 'Попередню машину ' + esc(c.truck) + ' програма здасть автоматично.' : 'Відмітьте машину, на яку ви сіли. Логіст і керівник одразу побачать це на дошці.') + '</p>' +
        '<label for="tkTruck">Машина</label><select id="tkTruck"><option value="">— оберіть —</option>' +
        tk.trucks.map(t => '<option value="' + esc(t.id) + '"' + (t.id === sel && !(c && c.truck === t.id) ? ' selected' : '') + '>' + esc(t.id) + (t.plate ? ' · ' + esc(t.plate) : '') + (t.holder ? ' (зараз: ' + esc(t.holder) + ')' : '') + '</option>').join('') + '</select>' +
        '<p class="cnote" id="tkWarn" hidden></p>' +
        '<label for="tkTrailer">Причіп (якщо знаєте)</label><select id="tkTrailer"><option value="">—</option>' + tk.trailers.map(p => '<option value="' + esc(p.id) + '">' + esc(p.id) + (p.plate && p.plate !== p.id ? ' · ' + esc(p.plate) : '') + '</option>').join('') + '</select>' +
        '<label for="tkOdo">Спідометр, км</label><input id="tkOdo" inputmode="numeric" placeholder="напр. 512 000"><p class="muted small odo-info" id="tkOdoI"></p>' +
        '<button class="primary" id="tkTake">Прийняти машину</button>' + (c ? '<button class="link" id="tkCancel" style="margin-top:14px">Скасувати</button>' : '') + '<p class="msg" id="tkMsg"></p></div>';
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
      $('cOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    if (!silent) { try { await api('logout'); } catch (e) {} }
    store.del('token'); store.del('me'); store.del('homeDrv'); store.del('boardCache'); store.del('outbox'); me = null;
    showLogin(silent ? 'Сесія завершилась — увійдіть ще раз' : '');
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
      ['Моя машина і проблема', '«Моя машина» — коли сідаєте на машину або здаєте її. «Проблема» — якщо щось не так у дорозі. Кнопка «Аа» вгорі робить шрифт більшим.']],
    'логіст': [['Дошка машин', 'Головний екран логіста: де кожна машина, рейс, що далі, проблеми. Кроки від водіїв видно одразу.'],
      ['Картка рейсу', 'Натисніть номер рейсу — побачите маршрут, дати, оплату, кроки водія.'],
      ['Калькулятор', 'Перед тим як погодити заявку — порахуйте рейс або кругорейс у «Калькуляторі». «Аа» вгорі — більший шрифт.']]
  };
  TOURS['керівник'] = TOURS['логіст']; TOURS['адмін'] = TOURS['логіст'];
  function tour() {
    const steps = me && TOURS[me.role]; if (!steps) return;
    const key = 'tour1_' + me.role; if (store.get(key)) return;
    let i = 0; const w = document.createElement('div'); w.className = 'ask-wrap';
    const draw = () => { const [t, x] = steps[i];
      w.innerHTML = '<div class="ask tour" role="dialog" aria-modal="true"><div class="tour-dots">' + steps.map((_, k) => '<i class="' + (k === i ? 'on' : '') + '"></i>').join('') + '</div><h2>' + esc(t) + '</h2><p>' + esc(x) + '</p><div class="ask-btns"><button class="btn" data-a="skip">Пропустити</button><button class="primary" data-a="next">' + (i < steps.length - 1 ? 'Далі' : 'Зрозуміло') + '</button></div></div>';
      w.querySelector('[data-a="next"]').onclick = () => { if (++i >= steps.length) close(); else draw(); };
      w.querySelector('[data-a="skip"]').onclick = close; };
    const close = () => { store.set(key, '1'); w.remove(); };
    draw(); document.body.appendChild(w);
  }
  async function askLogout() {
    const n = outbox().length;
    if (await ask('Вийти з програми?', (n ? '⚠ На телефоні є ' + n + ' не надісланих записів — після виходу вони пропадуть. Краще дочекатися зв\'язку. ' : '') + (me && me.role === 'водій' ? 'Щоб увійти знову, знадобиться новий код від керівника.' : 'Щоб увійти знову, знадобиться вхід через Google або код.'), 'Так, вийти', true)) logout(false);
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
  $('tachoBack').onclick = () => me && me.role !== 'водій' ? openBoard() : renderHome();
  $('search').addEventListener('input', () => renderTable());
  $('bSearch').addEventListener('input', () => board && renderBoard());
  $('bReset').onclick = () => { $('bSearch').value = ''; bFilter = 'all'; store.set('bFilter', 'all'); if (board) renderBoard(); $('bSearch').focus(); };
  $('bRefresh').onclick = () => openBoard(true);
  if ($('bNewTrip')) $('bNewTrip').onclick = () => tripForm(null);
  if ($('viewNewTrip')) $('viewNewTrip').onclick = () => tripForm(null);
  $('dRefresh').onclick = () => openDocs(true);
  $('dSearch').addEventListener('input', () => docs && renderDocs());
  $('tripBack').onclick = () => tripFrom === 'view' ? show('view') : (board ? (show('board')) : renderHome());
  $('issue').onclick = issue;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  (async () => {
    if (!store.get('token')) return showLogin();
    // одразу показуємо збережений кабінет, потім уточнюємо в сервера
    try { const c = JSON.parse(store.get('me') || 'null'); if (c) enter(c); } catch (e) {}
    renderOutbox(); setTimeout(flushOutbox, 1500);
    if (me && me.role === 'водій') return;   // «хто я» приходить у пакеті головної водія
    try { const r = await api('me'); meFresh = true; enter(r, !!me); }
    catch (e) { if (e.code !== 'auth' && me) return; if (!me) showLogin(e.code === 'auth' ? '' : e.message); }
  })();
})();
