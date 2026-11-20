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
    'адмін': [{ title: 'Дошка машин', hint: 'де кожна машина зараз', action: 'board' }, T('Рейси', 'усі машини', 'Рейси'), T('Кругорейси', '', 'Кругорейси'), T('Заявки', 'актуальні', 'Заявки'),
      T('Рухи коштів', 'аванси, витрати', 'Рухи коштів'), T('Нарахування', 'зарплата за рейси', 'Нарахування'),
      T('Клієнти', '', 'Клієнти'), T('Авто', '', 'Авто'), T('Працівники', '', 'Працівники'),
      T('Документи', 'терміни', 'Терміни документів'), T('Користувачі', 'хто має доступ', 'Користувачі'),
      T('Журнал змін', 'хто що змінив', 'Журнал змін'), { title: 'Видати код', hint: 'вхід для водія', action: 'codes' }],
    'керівник': [{ title: 'Дошка машин', hint: 'де кожна машина зараз', action: 'board' }, T('Рейси', 'усі машини', 'Рейси'), T('Кругорейси', '', 'Кругорейси'), T('Нарахування', 'зарплата', 'Нарахування'),
      T('Виплати й доплати', '', 'Виплати й доплати'), T('Рухи коштів', '', 'Рухи коштів'), T('Клієнти', '', 'Клієнти'),
      T('Документи', 'терміни', 'Терміни документів'), T('Журнал змін', '', 'Журнал змін'), { title: 'Видати код', hint: 'вхід для водія', action: 'codes' }],
    'логіст': [{ title: 'Дошка машин', hint: 'де кожна машина зараз', action: 'board' }, T('Рейси', 'усі машини', 'Рейси'), T('Заявки', 'актуальні', 'Заявки'), T('Кругорейси', '', 'Кругорейси'),
      T('Клієнти', '', 'Клієнти'), T('Водій на авто', 'хто на якій машині', 'Водій на авто'), T('Відстані', '', 'Відстані')],
    'бухгалтер': [T('Рейси', 'оплати клієнтів', 'Рейси'), T('Рухи коштів', '', 'Рухи коштів'), T('Виплати й доплати', '', 'Виплати й доплати'),
      T('Готівка від клієнтів', '', 'Готівка від клієнтів'), T('Клієнти', '', 'Клієнти')],
    'механік': [{ title: 'Дошка машин', hint: 'машини, документи, GPS', action: 'board' }, T('Авто', '', 'Авто'), T('Причепи', '', 'Причепи'), T('Документи', 'терміни', 'Терміни документів'),
      T('Спідометр і пальне', '', 'Спідометр і пальне')],
    'водій': [T('Мої рейси', '', 'Рейси'), T('Мої витрати', 'аванси й витрати', 'Рухи коштів'), T('Заправки й спідометр', '', 'Спідометр і пальне'),
      T('Моя зарплата', 'нарахування', 'Нарахування'), T('Звіт по рейсу', 'з телефона', null, 'етап 5')]
  };
  const HINT = {
    'адмін': 'Повний доступ. Поки екрани показують дані з бази лише для перегляду — редагування з\'явиться в наступних етапах.',
    'керівник': 'Поки — перегляд даних. Робочі екрани кабінету керівника — етап 4.',
    'логіст': 'Поки — перегляд даних. Робочі екрани логіста — етап 3.',
    'бухгалтер': 'Поки — перегляд даних. Рахунки й акти — етап 8.',
    'механік': 'Поки — перегляд даних. Облік техніки — етап 9.',
    'водій': 'Тут ваші рейси, витрати й зарплата. Внесення з телефона — етап 5.'
  };

  /* ── Сервер ── */
  async function api(action, data = {}) {
    if (!CFG.API_URL) throw new Error('Програму ще не підключено до сервера (немає API_URL у config.js)');
    // кожне «Зберегти» має свій opId: якщо зв'язок обірвався і запит повторено, сервер не створить дубль (ADR-038)
    if (action === 'save' && !data.opId) data = { ...data, opId: (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2)) };
    const body = JSON.stringify({ action, token: store.get('token'), ...data });
    const send = () => fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
    let res;
    try { res = await send(); }
    catch (e) {
      if (action === 'save') { try { await new Promise(r => setTimeout(r, 1500)); res = await send(); } catch (e2) { res = null; } }   // повтор — той самий opId
      if (!res) { $('offline').hidden = false; throw new Error('Немає зв\'язку з сервером'); }
    }
    $('offline').hidden = true;
    const out = await res.json();
    if (!out.ok) {
      if (out.code === 'auth' && action !== 'login.code' && action !== 'login.google') { logout(true); }
      const err = new Error(out.error || 'Помилка'); err.code = out.code; err.current = out.current; throw err;
    }
    return out;
  }
  const busy = on => { $('busy').hidden = !on; };

  /* ── Екрани ── */
  function show(id) { ['login', 'home', 'view', 'codes', 'board'].forEach(s => $(s).hidden = s !== id); window.scrollTo(0, 0); }

  function showLogin(msg) {
    $('who').hidden = true; show('login'); $('loginMsg').textContent = msg || '';
    if (CFG.GOOGLE_CLIENT_ID) loadGoogle();
  }

  function enter(out) {
    if (out.token) store.set('token', out.token);
    me = out.me; sheets = out.sheets || [];
    store.set('me', JSON.stringify({ me, sheets }));
    $('whoName').textContent = me.name; $('whoRole').textContent = me.role; $('who').hidden = false;
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
      b.querySelector('span').textContent = ok ? (t.hint || '') : 'скоро' + (t.soon ? ' · ' + t.soon : '');
      if (ok) b.onclick = () => t.action === 'codes' ? openCodes() : t.action === 'board' ? openBoard() : openSheet(t);
      box.appendChild(b);
    });
    show('home');
  }

  async function openSheet(t) {
    busy(true);
    try {
      const out = await api('list', { sheet: t.sheet });
      current = { title: t.title, columns: out.columns, rows: out.rows };
      $('viewTitle').textContent = t.title; $('search').value = '';
      renderTable(); show('view');
    } catch (e) { alert(e.message); } finally { busy(false); }
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
    rows.slice(0, 300).forEach(r => { const tr = tb.insertRow(); cols.forEach(c => { tr.insertCell().textContent = fmt(r[c]); }); });
  }

  /* ── Дошка машин (етап 2, Board.gs) ── */
  let board = null, bFilter = store.get('bFilter') || 'all';
  const dd = s => s ? s.slice(8, 10) + '.' + s.slice(5, 7) : '';
  const daysFrom = s => s ? Math.round((new Date(new Date().toDateString()) - new Date(s + 'T00:00:00')) / 864e5) : 0;
  const PROB = { doc: '📄', tir: '🛃', gps: '📡', trip: '⏱', debt: '💶' };
  async function openBoard(force) {
    show('board'); if (!board || force) $('bRows').innerHTML = '<tr><td colspan="7" class="muted">Завантаження…</td></tr>';
    busy(!board);
    try { board = (await api('board')); renderBoard(); }
    catch (e) { if (!board) $('bRows').innerHTML = '<tr><td colspan="7" class="msg">' + esc(e.message) + '</td></tr>'; else alert(e.message); }
    finally { busy(false); }
  }
  function tripText(t) { return t ? esc(t.from || '?') + ' → ' + esc(t.to || '?') : ''; }
  function stateOf(x) {
    if (x.status === 'trip') return { cls: 'st-trip', t: 'в рейсі' + (x.trip.unload ? ' до ' + dd(x.trip.unload) : '') };
    if (x.status === 'free') { const n = daysFrom(x.since); return { cls: n > 3 ? 'st-idle' : 'st-free', t: 'вільна з ' + dd(x.since) + (n > 0 ? ' · ' + n + ' дн' : '') }; }
    return { cls: 'st-none', t: 'немає рейсів' };
  }
  function gpsText(g) {
    if (!g) return '—';
    if (g.standSince) return 'стоїть з ' + dd(g.standSince);
    return (daysFrom(g.day) <= 1 ? 'вчора' : dd(g.day)) + ' ' + g.km + ' км';
  }
  function renderBoard() {
    const b = board, q = $('bSearch').value.trim().toLowerCase();
    $('bSub').textContent = 'Сьогодні ' + dd(b.today) + ' · оновлено о ' + b.updated + (b.gpsError ? ' · GPS: ' + b.gpsError : '');
    const F = { all: ['Усі', () => true], trip: ['В рейсі', x => x.status === 'trip'], free: ['Вільні', x => x.status === 'free'],
      prob: ['З проблемами', x => x.problems.length > 0] };
    $('bChips').innerHTML = '';
    Object.keys(F).forEach(k => {
      const c = document.createElement('button'); c.className = 'chip'; c.setAttribute('aria-pressed', String(bFilter === k));
      c.innerHTML = esc(F[k][0]) + ' <small>' + b.trucks.filter(F[k][1]).length + '</small>';
      c.onclick = () => { bFilter = k; store.set('bFilter', k); renderBoard(); }; $('bChips').appendChild(c);
    });
    const hay = x => [x.id, x.plate, x.trailer, ...x.drivers.map(d => d.name), ...[x.trip, x.next, x.last].filter(Boolean).flatMap(t => [t.id, t.from, t.to, t.client || ''])].join(' ').toLowerCase();
    const list = b.trucks.filter(F[bFilter][1]).filter(x => !q || hay(x).includes(q));
    $('bEmpty').hidden = list.length > 0;
    const tb = $('bRows'); tb.innerHTML = ''; const cards = $('bCards'); cards.innerHTML = '';
    list.forEach(x => {
      const st = stateOf(x), t = x.trip || x.last;
      const drv = x.drivers.length ? x.drivers.map(d => esc(d.name) + (d.fromTrip ? ' <span class="muted" title="за рейсом; у «Водій на авто» не вказано">?</span>' : '')).join(', ') : '<span class="muted">—</span>';
      const probs = x.problems.map(p => '<span class="prob' + (p.urgent ? ' urgent' : '') + '" title="' + esc(p.t) + '">' + PROB[p.k] + '</span>').join('');
      const next = x.next ? tripText(x.next) + ' <span class="muted">' + dd(x.next.load) + (x.next.order ? ' · заявка' : '') + '</span>' : '<span class="muted">—</span>';
      const tr = tb.insertRow(); tr.className = 'brow';
      tr.innerHTML = '<td><span class="plate">' + esc(x.id) + '</span></td>' +
        '<td>' + drv + (x.trailer ? '<div class="muted small">причіп ' + esc(x.trailer) + '</div>' : '') + '</td>' +
        '<td>' + (t ? tripText(t) + '<div class="muted small">' + esc(t.id) + (t.client ? ' · ' + esc(t.client) : '') + (x.trip ? '' : ' · останній') + '</div>' : '<span class="muted">—</span>') + '</td>' +
        '<td><span class="pill ' + st.cls + '">' + esc(st.t) + '</span></td><td>' + next + '</td><td class="small">' + esc(gpsText(x.gps)) + '</td><td class="probs">' + probs + '</td>';
      const det = tb.insertRow(); det.className = 'bdet'; det.hidden = true;
      det.innerHTML = '<td colspan="7">' + detail(x) + '</td>';
      tr.onclick = () => { det.hidden = !det.hidden; tr.classList.toggle('open', !det.hidden); };
      const c = document.createElement('details'); c.className = 'bcard';
      c.innerHTML = '<summary><div class="bc1"><span class="plate">' + esc(x.id) + '</span><span class="pill ' + st.cls + '">' + esc(st.t) + '</span><span class="probs">' + probs + '</span></div>' +
        '<div class="bc2">' + (t ? tripText(t) : '<span class="muted">немає рейсу</span>') + '</div><div class="muted small">' + drv + ' · GPS ' + esc(gpsText(x.gps)) + '</div></summary>' + detail(x);
      cards.appendChild(c);
    });
    const w = b.waiting || []; $('bWait').hidden = !w.length; $('bWaitN').textContent = w.length;
    $('bWaitList').innerHTML = w.map(z => '<div class="wrow"><b>' + tripText(z) + '</b> <span class="muted">' + (z.load ? 'завантаження ' + dd(z.load) : '') + (z.client ? ' · ' + esc(z.client) : '') + ' · ' + esc(z.status || 'нова') + '</span></div>').join('');
  }
  function detail(x) {
    const row = (k, v) => v ? '<div><span class="muted">' + k + '</span> ' + v + '</div>' : '';
    const t = x.trip || x.last;
    return '<div class="bdetail">' +
      row(x.trip ? 'Поточний рейс:' : 'Останній рейс:', t ? esc(t.id) + ' · ' + tripText(t) + ' · завантаження ' + dd(t.load) + (t.unload ? ', розвантаження ' + dd(t.unload) : ', дата розвантаження не вказана') + (t.client ? ' · ' + esc(t.client) : '') : '') +
      row('Далі:', x.next ? esc(x.next.id) + ' · ' + tripText(x.next) + ' · ' + dd(x.next.load) + (x.next.order ? ' (заявка' + (x.next.status ? ': ' + esc(x.next.status) : '') + ')' : '') : '') +
      row('Кругорейс:', x.circle ? esc(x.circle.id) + (x.circle.status ? ' · ' + esc(x.circle.status) : '') : '') +
      row('Держномер:', esc(x.plate)) +
      (x.problems.length ? '<ul class="plist">' + x.problems.map(p => '<li class="' + (p.urgent ? 'urgent' : '') + '">' + PROB[p.k] + ' ' + esc(p.t) + '</li>').join('') + '</ul>' : '<div class="muted">Проблем не знайдено.</div>') +
      '</div>';
  }

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
    } catch (e) { alert(e.message); } finally { busy(false); }
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
    store.del('token'); store.del('me'); me = null;
    showLogin(silent ? 'Сесія завершилась — увійдіть ще раз' : '');
  }

  /* ── Старт ── */
  $('codeForm').addEventListener('submit', loginCode);
  $('logout').onclick = () => logout(false);
  $('logoutAll').onclick = async () => {
    if (!confirm('Вийти на всіх пристроях? Знадобиться новий вхід (код або Google) на кожному телефоні й комп\'ютері.')) return;
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
  $('search').addEventListener('input', () => renderTable());
  $('bSearch').addEventListener('input', () => board && renderBoard());
  $('bRefresh').onclick = () => openBoard(true);
  $('issue').onclick = issue;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  (async () => {
    if (!store.get('token')) return showLogin();
    // одразу показуємо збережений кабінет, потім уточнюємо в сервера
    try { const c = JSON.parse(store.get('me') || 'null'); if (c) enter(c); } catch (e) {}
    try { enter(await api('me')); }
    catch (e) { if (e.code !== 'auth' && me) return; if (!me) showLogin(e.code === 'auth' ? '' : e.message); }
  })();
})();
