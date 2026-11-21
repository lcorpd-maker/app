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
    'адмін': [{ title: 'Дошка машин', hint: 'де кожна машина зараз', action: 'board' }, { title: 'Калькулятор', hint: 'чи вигідна заявка', action: 'calc' }, T('Рейси', 'усі машини', 'Рейси'), T('Кругорейси', '', 'Кругорейси'), T('Заявки', 'актуальні', 'Заявки'),
      T('Рухи коштів', 'аванси, витрати', 'Рухи коштів'), T('Нарахування', 'зарплата за рейси', 'Нарахування'),
      T('Клієнти', '', 'Клієнти'), T('Авто', '', 'Авто'), T('Працівники', '', 'Працівники'),
      { title: 'Документи', hint: 'що спливає', action: 'docs' }, T('Користувачі', 'хто має доступ', 'Користувачі'),
      T('Журнал змін', 'хто що змінив', 'Журнал змін'), { title: 'Видати код', hint: 'вхід для водія', action: 'codes' }],
    'керівник': [{ title: 'Дошка машин', hint: 'де кожна машина зараз', action: 'board' }, { title: 'Калькулятор', hint: 'чи вигідна заявка', action: 'calc' }, T('Рейси', 'усі машини', 'Рейси'), T('Кругорейси', '', 'Кругорейси'), T('Нарахування', 'зарплата', 'Нарахування'),
      T('Виплати й доплати', '', 'Виплати й доплати'), T('Рухи коштів', '', 'Рухи коштів'), T('Клієнти', '', 'Клієнти'),
      { title: 'Документи', hint: 'що спливає', action: 'docs' }, T('Журнал змін', '', 'Журнал змін'), { title: 'Видати код', hint: 'вхід для водія', action: 'codes' }],
    'логіст': [{ title: 'Дошка машин', hint: 'де кожна машина зараз', action: 'board' }, { title: 'Калькулятор', hint: 'чи вигідна заявка', action: 'calc' }, T('Рейси', 'усі машини', 'Рейси'), T('Заявки', 'актуальні', 'Заявки'), T('Кругорейси', '', 'Кругорейси'),
      T('Клієнти', '', 'Клієнти'), T('Водій на авто', 'хто на якій машині', 'Водій на авто'), T('Відстані', '', 'Відстані'), { title: 'Документи', hint: 'що спливає', action: 'docs' }],
    'бухгалтер': [T('Рейси', 'оплати клієнтів', 'Рейси'), T('Рухи коштів', '', 'Рухи коштів'), T('Виплати й доплати', '', 'Виплати й доплати'),
      T('Готівка від клієнтів', '', 'Готівка від клієнтів'), T('Клієнти', '', 'Клієнти')],
    'механік': [{ title: 'Дошка машин', hint: 'машини, документи, GPS', action: 'board' }, T('Авто', '', 'Авто'), T('Причепи', '', 'Причепи'), { title: 'Документи', hint: 'що спливає', action: 'docs' },
      T('Спідометр і пальне', '', 'Спідометр і пальне')],
    'водій': [{ title: 'Моя машина', hint: 'прийняти / здати · моя робота', action: 'truck' }, T('Мої рейси', '', 'Рейси'), T('Мої витрати', 'аванси й витрати', 'Рухи коштів'), T('Заправки й спідометр', '', 'Спідометр і пальне'),
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
    const ONCE = action === 'save' || action === 'truck.take' || action === 'truck.give' || action === 'trip.status.add';
    if (ONCE && !data.opId) data = { ...data, opId: (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2)) };
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
  function show(id) { navSeq++; ['login', 'home', 'view', 'codes', 'board', 'trip', 'docs', 'calc', 'truck'].forEach(s => $(s).hidden = s !== id); window.scrollTo(0, 0); }

  function showLogin(msg) {
    $('who').hidden = true; show('login'); $('loginMsg').textContent = msg || '';
    if (CFG.GOOGLE_CLIENT_ID) loadGoogle();
  }

  function enter(out, quiet) {
    if (out.token) store.set('token', out.token);
    const was = JSON.stringify({ r: me && me.role, s: sheets.map(x => x.name) });
    me = out.me; sheets = out.sheets || [];
    store.set('me', JSON.stringify({ me, sheets }));
    $('whoName').textContent = me.name; $('whoRole').textContent = me.role; $('who').hidden = false; document.body.dataset.role = me.role;
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
      if (ok) b.onclick = () => t.action === 'codes' ? openCodes() : t.action === 'board' ? openBoard() : t.action === 'docs' ? openDocs() : t.action === 'calc' ? openCalc() : t.action === 'truck' ? openTruck() : openSheet(t);
      box.appendChild(b);
    });
    $('homeWork').innerHTML = ''; $('tiles').hidden = false; if ($('drvOutBox')) $('drvOutBox').innerHTML = '';
    if (me.role === 'водій') {
      $('homeTitle').textContent = 'Мій рейс'; $('homeHint').textContent = ''; $('tiles').hidden = true;
      // один запит паралельно з другим і один показ екрана: без проміжних «Завантаження…» → картка → «Мій рейс»
      let cache = null; try { cache = JSON.parse(store.get('homeDrv') || 'null'); } catch (e) {}
      if (cache && cache.login === me.login) drawDriverHome(cache.st, cache.sv); else $('homeWork').innerHTML = '<div class="card tkwork"><p class="muted">Завантаження вашого рейсу…</p></div>';
      const nav = navSeq + 1;   // show('home') нижче
      const calls = [{ action: 'truck.state' }, { action: 'trip.status' }]; if (!meFresh) calls.push({ action: 'me' });
      apiBatch(calls).then(([st, sv, mr]) => {
        if (st instanceof Error) throw st; if (sv instanceof Error) sv = null;
        if (mr && !(mr instanceof Error)) { meFresh = true; enter(mr, true); }
        const fresh = JSON.stringify({ login: me.login, st, sv });
        if (store.get('homeDrv') !== fresh) { store.set('homeDrv', fresh); if (nav === navSeq) drawDriverHome(st, sv); }
        else { tk = st; stCur = sv; }
      }).catch(e => { if (nav === navSeq && !cache) $('homeWork').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; });
    }
    show('home');
  }
  function drawDriverHome(st, sv) {
    tk = st; stCur = sv;
    const has = st && st.planned && st.planned.length;
    const prof = '<div class="profile"><span>Ви увійшли як <b>' + esc(me.name) + '</b></span><button class="btn" id="drvOut">Вийти з програми</button></div>';
    if ($('drvOutBox')) $('drvOutBox').innerHTML = '';
    if (has && sv && sv.trip) { $('homeWork').innerHTML = '<div id="stBox"></div>' + prof; $('tiles').hidden = true; renderStatus(); $('drvOut').onclick = askLogout; return; }
    // немає поточного рейсу — коротка картка роботи (або «поки немає») і звичайні плитки
    $('homeWork').innerHTML = has ? '<div id="homeWorkCard">' + workHtml(st.planned, true) + '</div>' : '<div class="card tkwork"><b>Запланованої роботи поки немає.</b><div class="muted small">Щойно логіст призначить рейс — він з\'явиться тут.</div></div>';
    $('tiles').hidden = false; bindWork();
    if (!$('drvOutBox')) { const d = document.createElement('div'); d.id = 'drvOutBox'; $('tiles').after(d); }
    $('drvOutBox').innerHTML = prof; $('drvOut').onclick = askLogout;
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
  const QUICK = [['Моя машина', 'truck', 'M3 16V7a1 1 0 011-1h10v10M14 9h4l3 3v4h-7M6.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm11 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z'],
    ['Витрата', '', 'M12 5v14M5 12h14'], ['Заправка', '', 'M4 20V5a1 1 0 011-1h7a1 1 0 011 1v15M4 11h9M13 8h2l3 3v6a1.5 1.5 0 003 0V9l-3-3'],
    ['Спідометр', '', 'M4 18a8 8 0 1116 0M12 18l4-5'], ['Документ', '', 'M4 8h3l2-2h6l2 2h3v11H4zM12 16a3 3 0 100-6 3 3 0 000 6z'], ['Проблема', 'problem', 'M12 4l9 16H3zM12 10v4M12 17h.01']];
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
    let h = '<article class="hero">' +
      '<div class="meta"><span>Рейс ' + esc(v.trip.id) + '</span><span class="st">' + esc(chip) + '</span></div>' +
      '<div><div class="to">' + (loaded ? 'Розвантаження' : 'Завантаження') + '</div><div class="city">' + esc(loaded ? v.trip.to : v.trip.from) + '</div>' +
      '<div class="when">' + (loaded ? (p.unload ? dayName(p.unload) : 'дату уточнить логіст') : (p.load ? dayName(p.load) : '')) + '</div></div>' +
      '<div><div class="road" style="--p:' + pct + '%"><i></i><b></b></div><div class="ends"><span>' + esc(v.trip.from) + (p.load ? ', ' + dd(p.load) : '') + '</span><span>' + esc(v.trip.to) + '</span></div></div>' +
      '<div class="addr"><div><b>' + esc(v.trip.from) + ' → ' + esc(v.trip.to) + '</b><span>' + facts + '</span></div></div></article>';
    if (msg) h += '<div class="cinfo" style="margin-top:14px">' + msg + '</div>';
    h += '<div class="next-action">' + (v.next ? '<button class="primary stgo" data-st="' + esc(v.next) + '"' + (stPending ? ' disabled' : '') + '>' + svgI('M5 12l5 5L20 7') + esc(ST_LABEL[v.next] || v.next) + '</button><p>' + esc(ST_HINT[v.next] || '') + '</p>' + (ahead.length ? '<p><button class="link" id="stAhead">Я вже далі — відмітити інший крок</button></p><div id="stAheadBox" class="stahead" hidden><p class="muted small">Попередні кроки лишаться невідміченими — їх можна дописати потім.</p>' + ahead.map(x => '<button class="btn" data-st="' + esc(x) + '">' + esc(ST_LABEL[x] || x) + '</button>').join('') + '</div>' : '')
      : '<div class="cinfo">Усі кроки рейсу відмічено. Дякуємо!</div>') + '</div>';
    if (v.last && v.last.canUndo) { const left = me.role === 'водій' ? Math.max(1, 15 - Math.floor((Date.now() - new Date(v.last.at)) / 60000)) : 0;
      h += '<button class="undo-btn" id="stUndo">' + svgI('M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3') + '<span>Скасувати «' + esc(v.last.event) + '»' + (left ? '<small>натиснули помилково? ще ' + left + ' хв</small>' : '') + '</span></button>'; }
    h += '<div class="quick">' + QUICK.filter(q => q[1]).map(q => '<button class="q' + (q[1] === 'problem' ? ' problem' : '') + (q[1] ? '' : ' soonq') + '" data-q="' + q[1] + '"' + (q[1] ? '' : ' disabled') + '>' + svgI(q[2]) + esc(q[0]) + (q[1] ? '' : '<small>скоро</small>') + '</button>').join('') + '</div>';
    h += '<div class="stprob card" id="stProbBox" hidden><b>Що сталося?</b><div class="chips">' + ['Довга черга', 'Поломка', 'Проблема з документами', 'Затримка на складі', 'ДТП', 'Інше'].map(c => '<button class="chip" data-chip="' + c + '">' + c + '</button>').join('') + '</div>' +
      '<textarea id="stText" rows="3" placeholder="Коротко опишіть. Можна надиктувати — кнопка мікрофона на клавіатурі."></textarea><button class="primary" id="stProb">Надіслати логісту</button></div>';
    (v.problems || []).slice(-2).forEach(x => h += '<p class="cnote">Проблема ' + tkTime(x.at) + ': ' + esc(x.text) + '</p>');
    h += '<details class="card ststeps"><summary>Усі кроки рейсу · ' + doneN + ' з ' + v.steps.length + '</summary><ol class="stlist">' + v.steps.map((x, i) => '<li class="' + (x.at ? 'done' : x.step === v.next ? 'next' : '') + '"><span>' + (x.at ? '✓' : '○') + '</span><b>' + esc(x.step) + '</b>' +
      (x.at ? '<em>' + tkTime(x.at) + '</em>' : (i < lastIdx ? '<button class="link stany" data-st="' + esc(x.step) + '">пропущено — відмітити</button>' : '')) + '</li>').join('') + '</ol></details>';
    const rest = ((tk && tk.planned) || []).filter(x => x.id !== v.trip.id);
    if (rest.length) h += '<section class="card stnext"><h2>Далі</h2>' + rest.map(w => '<div class="wrow"><span class="pill st-free">' + (w.order ? 'заявка' : 'далі') + '</span><div><b>' + esc(w.from) + ' → ' + esc(w.to) + '</b><div class="muted small">машина ' + esc(w.truck) + ' · завантаження ' + (dd(w.load) || '?') + (w.cargo ? ' · ' + esc(w.cargo) : '') + '</div></div></div>').join('') + '</section>';
    h += '<p class="msg" id="stMsg"></p>';
    box.innerHTML = h;
    const send = async (event, text) => {
      if (stPending || Date.now() < stLock) return;
      if ((event === 'розвантажено' || event === 'кордон пройдено') && !await ask(event === 'розвантажено' ? 'Машину розвантажили?' : 'Перетнули кордон?', 'Логіст побачить це одразу.', 'Так, ' + (event === 'розвантажено' ? 'розвантажився' : 'перетнув'))) return;
      stLock = Date.now() + 2000; vib(30);
      // одразу показуємо відмітку (сервер Google відповідає 3–5 с), надсилаємо у фоні; не прийняв — повертаємо як було
      const prev = stCur, now = new Date().toISOString(), o = JSON.parse(JSON.stringify(v));
      if (event === 'проблема') o.problems = (o.problems || []).concat([{ at: now, text }]);
      else { o.steps.forEach(x => { if (x.step === event) { x.at = now; x.id = 'new'; } });
        const li = o.steps.reduce((m, x, i) => x.at ? i : m, -1); o.next = (o.steps[li + 1] || {}).step || ''; o.last = { event, at: now, id: 'new', canUndo: false }; }
      stCur = o; stPending = true;
      renderStatus((event === 'проблема' ? '✔ Проблему записано' : '✔ Відмічено: <b>' + esc(event) + '</b>') + ' · <span class="muted">надсилаю логісту…</span>'); window.scrollTo(0, 0);
      api('trip.status.add', { tripId: v.trip.id, event, text })
        .then(r => { stPending = false; stCur = r; if ($('stBox')) renderStatus(r.already ? 'Цей крок уже був відмічений.' : (event === 'проблема' ? '✔ Логіст отримав повідомлення про проблему.' : '✔ Відмічено: <b>' + esc(event) + '</b>. Логіст бачить.')); })
        .catch(e => { stPending = false; stCur = prev; if ($('stBox')) renderStatus();
          toast('<b>Не надіслано</b> «' + esc(event) + '»: ' + esc(e.message), 'err', { label: 'Спробувати ще раз', run: () => { stLock = 0; send(event, text); } }); });
    };
    box.querySelectorAll('[data-st]').forEach(b => b.onclick = e => { e.stopPropagation(); send(b.dataset.st); });
    box.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { if (b.dataset.q === 'truck') openTruck(); else if (b.dataset.q === 'problem') { $('stProbBox').hidden = !$('stProbBox').hidden; if (!$('stProbBox').hidden) $('stText').focus(); } });
    if ($('stAhead')) $('stAhead').onclick = () => { $('stAheadBox').hidden = !$('stAheadBox').hidden; };
    if ($('stUndo')) $('stUndo').onclick = () => {
      if (stPending) return;
      const prev = stCur, o = JSON.parse(JSON.stringify(v)), ev = v.last.event;
      o.steps.forEach(x => { if (x.id === v.last.id) { x.at = ''; x.id = ''; } });
      const li = o.steps.reduce((m, x, i) => x.at ? i : m, -1); o.next = (o.steps[li + 1] || {}).step || ''; o.last = null;
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
  function bindWork() { const c = document.querySelector('#homeWork .tkclick'); if (c) c.onclick = () => openTruck(); }

  async function openSheet(t) {
    busy(true); const nav = navSeq;
    try {
      const out = await api('list', { sheet: t.sheet });
      if (nav !== navSeq) return;
      current = { title: t.title, sheet: t.sheet, columns: out.columns, rows: out.rows };
      $('viewTitle').textContent = t.title; $('search').value = '';
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
  let board = null, bFilter = store.get('bFilter') || 'all';
  const dd = s => s ? s.slice(8, 10) + '.' + s.slice(5, 7) : '';
  const daysFrom = s => s ? Math.round((new Date(new Date().toDateString()) - new Date(s + 'T00:00:00')) / 864e5) : 0;
  const PROB = { doc: '📄 документ', tir: '🛃 ТІР', gps: '📡 GPS', trip: '⏱ рейс довго', debt: '💶 оплата' };
  async function openBoard(force) {
    show('board'); const nav = navSeq;
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
      const drv = x.drivers.length ? x.drivers.map(d => esc(d.name) + (d.fromTrip ? ' <span class="muted" title="за рейсом; у «Водій на авто» не вказано">?</span>' : '') + (d.fromApp ? ' <span class="ok-mark" title="водій сам відмітив у програмі' + (d.since ? ' з ' + dd(d.since) : '') + '">✓</span>' : '')).join(', ') : '<span class="muted">—</span>';
      const probs = x.problems.map(p => '<span class="prob' + (p.urgent ? ' urgent' : '') + '" title="' + esc(p.t) + '">' + PROB[p.k] + '</span>').join('');
      const next = x.next ? tripText(x.next) + ' <span class="muted">' + dd(x.next.load) + (x.next.order ? ' · заявка' : '') + '</span>' : '<span class="muted">—</span>';
      const tr = tb.insertRow(); tr.className = 'brow';
      tr.innerHTML = '<td><span class="plate">' + esc(x.id) + '</span></td>' +
        '<td>' + drv + (x.trailer ? '<div class="muted small">причіп ' + esc(x.trailer) + '</div>' : '') + '</td>' +
        '<td>' + (t ? tripText(t) + '<div class="muted small">' + esc(t.id) + (t.client ? ' · ' + esc(t.client) : '') + (x.trip ? '' : ' · останній') + '</div>' : '<span class="muted">—</span>') + '</td>' +
        '<td><span class="pill ' + st.cls + '">' + esc(st.t) + '</span>' + (x.trip && x.trip.st ? '<div class="small"><b>' + esc(x.trip.st.event) + '</b> <span class="muted">' + tkTime(x.trip.st.at) + '</span>' + (x.trip.st.problem ? ' <span class="prob urgent" title="' + esc(x.trip.st.problem) + '">⚠</span>' : '') + '</div>' : '') + (x.ech ? '<div class="muted small">' + esc(echShort(x.ech)) + '</div>' : '') + '</td><td>' + next + '</td><td class="small">' + esc(gpsText(x.gps)) + '</td><td class="probs">' + probs + '</td>';
      const det = tb.insertRow(); det.className = 'bdet'; det.hidden = true;
      det.innerHTML = '<td colspan="7">' + detail(x) + '</td>';
      tr.onclick = () => { det.hidden = !det.hidden; tr.classList.toggle('open', !det.hidden); };
      const c = document.createElement('details'); c.className = 'bcard';
      c.innerHTML = '<summary><div class="bc1"><span class="plate">' + esc(x.id) + '</span><span class="pill ' + st.cls + '">' + esc(st.t) + '</span><span class="probs">' + probs + '</span></div>' +
        '<div class="bc2">' + (t ? tripText(t) : '<span class="muted">немає рейсу</span>') + '</div><div class="muted small">' + drv + ' · GPS ' + esc(gpsText(x.gps)) + '</div>' + (x.trip && x.trip.st ? '<div class="small"><b>' + esc(x.trip.st.event) + '</b> <span class="muted">' + tkTime(x.trip.st.at) + '</span>' + (x.trip.st.problem ? ' ⚠ ' + esc(x.trip.st.problem) : '') + '</div>' : '') + (x.ech ? '<div class="muted small">' + esc(echShort(x.ech)) + '</div>' : '') + '</summary>' + detail(x);
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
      (x.problems.length ? '<ul class="plist">' + x.problems.map(p => '<li class="' + (p.urgent ? 'urgent' : '') + '">' + PROB[p.k] + ' ' + esc(p.t) + '</li>').join('') + '</ul>' : '<div class="muted">Проблем не знайдено.</div>') +
      '</div>';
  }

  /* ── Картка рейсу (етап 2): перегляд одного рейсу з усім, що до нього прив'язано ── */
  let tripFrom = 'board';
  function tripLink(t) {
    if (t.order) return esc(t.id);
    return '<a href="#" class="tlink" data-trip="' + esc(t.id) + '">' + esc(t.id) + '</a>';
  }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-trip]');
    if (a) { e.preventDefault(); e.stopPropagation(); openTrip(a.dataset.trip, 'board'); }
  }, true);
  const money = v => (v === '' || v == null) ? '' : (typeof v === 'number' ? v.toLocaleString('uk-UA', { maximumFractionDigits: 2 }) : String(v));
  async function openTrip(id, from) {
    tripFrom = from || 'board';
    show('trip'); const nav = navSeq; $('tripBody').innerHTML = '<p class="muted">Завантаження рейсу ' + esc(id) + '…</p>';
    const can = new Set(sheets.map(s => s.name));
    const ask = (sheet, filter) => can.has(sheet) ? api('list', { sheet, filter }).catch(() => null) : Promise.resolve(null);
    try {
      const [tr, zv, mv, jr] = await Promise.all([ask('Рейси', { 'Рейс ID': id }), ask('Заявки', { 'Рейс ID': id }),
        ask('Рухи коштів', { 'Рейс ID': id }), ask('Журнал змін', { 'Запис ID': id })]);
      if (nav !== navSeq) return;
      const r = tr && tr.rows[0];
      if (!r) { $('tripBody').innerHTML = '<p class="msg">Рейс ' + esc(id) + ' не знайдено.</p>'; return; }
      $('tripBody').innerHTML = tripHtml(r, tr.columns, zv && zv.rows, mv && mv.rows, jr && jr.rows) + '<div id="tripSt"></div>';
      api('trip.status', { tripId: id }).then(v => { if (!v || !v.trip || !$('tripSt') || nav !== navSeq) return;
        const any = v.steps.some(x => x.at) || (v.problems || []).length;
        $('tripSt').innerHTML = '<section class="card" style="margin-top:12px"><h2>Кроки рейсу (від водія)</h2>' + (any ? '<ol class="stlist">' + v.steps.map(x => '<li class="' + (x.at ? 'done' : '') + '"><span>' + (x.at ? '✓' : '○') + '</span><b>' + esc(x.step) + '</b>' + (x.at ? '<em>' + tkTime(x.at) + '</em>' : '') + '</li>').join('') + '</ol>' +
          (v.problems || []).map(p => '<p class="cnote">Проблема ' + tkTime(p.at) + ': ' + esc(p.text) + '</p>').join('') : '<p class="muted">Водій ще нічого не відмітив.</p>') + '</section>'; }).catch(() => {});
    } catch (e) { if (nav === navSeq) $('tripBody').innerHTML = '<p class="msg">' + esc(e.message) + '</p>'; }
  }
  function tripHtml(r, cols, orders, moves, journal) {
    const has = c => cols.indexOf(c) >= 0 && r[c] !== '' && r[c] !== null && r[c] !== undefined;
    const f = (label, c, cls) => has(c) ? '<div class="kv' + (cls ? ' ' + cls : '') + '"><span>' + esc(label) + '</span><b>' + esc(fmt(typeof r[c] === 'number' ? money(r[c]) : r[c])) + '</b></div>' : '';
    const unl = r['Дата розвантаження'], due = r['Очікувана оплата'];
    const late = due && !r['Оплачено'] && new Date(due) < new Date(new Date().toDateString());
    let h = '<div class="thead"><h1>Рейс ' + esc(r['Рейс ID']) + '</h1>' +
      '<p class="muted">' + [r['Авто ID'] && 'авто ' + esc(r['Авто ID']), r['Водій (як записано)'] && esc(r['Водій (як записано)']), r['Тип'] && esc(r['Тип']), r['АДР'] && '<span class="pill st-idle">АДР</span>', r['Кругорейс ID'] && 'кругорейс ' + esc(r['Кругорейс ID'])].filter(Boolean).join(' · ') + '</p></div>';
    h += '<div class="route card"><div><span class="muted small">Завантаження</span><b>' + esc(r['Звідки'] || '—') + '</b><span>' + esc(fmt(r['Дата завантаження'])) + '</span></div>' +
      '<div class="arrow">→</div><div><span class="muted small">Розвантаження</span><b>' + esc(r['Куди'] || '—') + '</b><span>' + (unl ? esc(fmt(unl)) : '<span class="muted">дата не вказана</span>') + '</span></div></div>';
    const cargo = [f('Вантаж', 'Вантаж'), f('Тонн', 'Тонн'), f('Перехід', 'Перехід'), f('Км', 'Км'), f('Пальне, л', 'Пальне, л'), f('Допомагав вантажити', 'Допомагав'), f('ТТН документів', 'ТТН документів')].join('');
    const pay = [f('Клієнт', 'Клієнт (як записано)'), f('Клієнт ID', 'Клієнт ID'), f('Контакт клієнта', 'Контакт клієнта'), f('Фрахт', 'Фрахт', 'big'), f('Валюта', 'Валюта'), f('Оплата', 'Оплата'),
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

  /* ── Моя машина (етап 3): прийняти / здати ── */
  let tk = null, tkMode = '';
  const tkTime = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };
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
        '<label for="tkOdo">Спідометр при здачі, км (якщо знаєте)</label><input id="tkOdo" inputmode="numeric" placeholder="напр. 512 340">' +
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
        '<label for="tkOdo">Спідометр, км (якщо знаєте)</label><input id="tkOdo" inputmode="numeric" placeholder="напр. 512 000">' +
        '<button class="primary" id="tkTake">Прийняти машину</button>' + (c ? '<button class="link" id="tkCancel" style="margin-top:14px">Скасувати</button>' : '') + '<p class="msg" id="tkMsg"></p></div>';
    }
    h += '<p class="muted small">Якщо помилились — просто прийміть правильну машину: попередня здасться сама. Логіст бачить усі зміни.</p>';
    $('tkBody').innerHTML = h;
    const warn = () => { const t = T[$('tkTruck').value]; $('tkWarn').hidden = !(t && t.holder); if (t && t.holder) $('tkWarn').textContent = 'За програмою на цій машині зараз ' + t.holder + '. Якщо ви її справді прийняли — продовжуйте, логіст перевірить.'; };
    if ($('tkTruck')) { $('tkTruck').onchange = warn; warn(); }
    if ($('tkSwitch')) $('tkSwitch').onclick = () => { tkMode = 'take'; renderTruck(); };
    if ($('tkCancel')) $('tkCancel').onclick = () => { tkMode = ''; renderTruck(); };
    const odo = () => String($('tkOdo').value || '').replace(/[\s ]/g, '');
    if ($('tkTake')) $('tkTake').onclick = async () => {
      const truck = $('tkTruck').value; if (!truck) { $('tkMsg').textContent = 'Оберіть машину'; return; }
      if (odo() && !/^\d{1,7}$/.test(odo())) { $('tkMsg').textContent = 'Спідометр — лише цифри'; return; }
      $('tkTake').disabled = true; busy(true);
      try { const r = await api('truck.take', { truck, trailer: $('tkTrailer').value, odo: odo() }); tk = r.state; tkMode = '';
        renderTruck(r.already ? 'Ви вже на цій машині.' : '✔ Машину <b>' + esc(truck) + '</b> прийнято.' + (r.checks && r.checks.length ? ' Логіст перевірить: ' + esc(r.checks.join('; ')) : '')); }
      catch (e) { $('tkMsg').textContent = e.message; $('tkTake').disabled = false; }
      finally { busy(false); }
    };
    if ($('tkGive')) $('tkGive').onclick = async () => {
      if (!await ask('Здати машину?', 'Логіст побачить, що ви більше не на цій машині.', 'Так, здати')) return;
      if (odo() && !/^\d{1,7}$/.test(odo())) { $('tkMsg').textContent = 'Спідометр — лише цифри'; return; }
      $('tkGive').disabled = true; busy(true);
      try { const r = await api('truck.give', { odo: odo(), note: $('tkNote').value }); tk = r.state; renderTruck('✔ Машину здано.' + (r.checks && r.checks.length ? ' Логіст перевірить: ' + esc(r.checks.join('; ')) : '')); }
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
    store.del('token'); store.del('me'); store.del('homeDrv'); store.del('boardCache'); me = null;
    showLogin(silent ? 'Сесія завершилась — увійдіть ще раз' : '');
  }

  /* ── Старт ── */
  $('codeForm').addEventListener('submit', loginCode);
  $('logout').onclick = () => askLogout();
  async function askLogout() {
    if (await ask('Вийти з програми?', me && me.role === 'водій' ? 'Щоб увійти знову, знадобиться новий код від керівника.' : 'Щоб увійти знову, знадобиться вхід через Google або код.', 'Так, вийти', true)) logout(false);
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
  $('search').addEventListener('input', () => renderTable());
  $('bSearch').addEventListener('input', () => board && renderBoard());
  $('bRefresh').onclick = () => openBoard(true);
  $('dRefresh').onclick = () => openDocs(true);
  $('dSearch').addEventListener('input', () => docs && renderDocs());
  $('tripBack').onclick = () => tripFrom === 'view' ? show('view') : (board ? (show('board')) : renderHome());
  $('issue').onclick = issue;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  (async () => {
    if (!store.get('token')) return showLogin();
    // одразу показуємо збережений кабінет, потім уточнюємо в сервера
    try { const c = JSON.parse(store.get('me') || 'null'); if (c) enter(c); } catch (e) {}
    if (me && me.role === 'водій') return;   // «хто я» приходить у пакеті головної водія
    try { const r = await api('me'); meFresh = true; enter(r, !!me); }
    catch (e) { if (e.code !== 'auth' && me) return; if (!me) showLogin(e.code === 'auth' ? '' : e.message); }
  })();
})();
