/**
 * Drive.gs / drive.js — робочий час водія: оцінка за GPS + ручний тахограф (ADR-058).
 * Один і той самий код працює на сервері (Apps Script) і в телефоні (app.lcorp.com.ua/drive.js) — тож водій і логіст бачать однакові числа,
 * а водій — навіть без інтернету. Чисті функції, без Google API. Основа — прототип аналітика (53 перевірки, 04-Якість/Команда 21.11).
 * Це ОЦІНКА, не тахограф: інформаційно, «орієнтовно», остаточно — тахограф водія.
 */
var DRV = (function () {
'use strict';
const MIN = 60000;
const TZ = 'Europe/Kyiv';

const CFG = {
  pollGapMin: 25,        // > 25 хв між опитуваннями = пропуск даних
  shortStopMin: 15,      // < 15 хв — коротка зупинка: не керування, але й не перерва (мінімальна частина перерви — 15)
  breakMin: 45, breakPart2Min: 30,
  splitRestMin: 180,     // 3 год — перша частина розділеного щоденного відпочинку
  dailyRedMin: 540, dailyMin: 660,      // 9 / 11 год
  weeklyRedMin: 1440, weeklyMin: 2700,  // 24 / 45 год
  contMax: 270, day9: 540, day10: 600, weekMax: 3360, twoWeekMax: 5400,
  reducedMax: 3, extendedMax: 2,
  crewWindowMin: 1800,   // екіпаж: 9 год відпочинку в межах 30 год
  vEstKmh: 65,           // середня швидкість для оцінки «скільки їхав між опитуваннями»
  crawlKm: 1.0,          // рух < 1 км між двома стоянками = повзання (черга)
  crawlAvgKmh: 8,        // середня < 8 км/год між двома «рухається» = повзання
  crawlDriveKmh: 10,     // у черзі реальне керування ≈ км / 10 км/год
  minMoveMin: 1,
  sameStopTolMin: 3,     // «Стоїть …» дає хвилини → похибка початку ±1–2 хв
  staleMin: 40,          // останнє опитування старше 40 хв → «немає даних»
  edgeMin: 5,            // запас біля порогів (9/10 год, 4:30)
  tolMin: 3,             // допуск до порогів стоянки, якщо її кінець оцінений між опитуваннями (позначається «на межі»)
};

// ---------------- час (Київ) ----------------
const _fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });
function kParts(ms) { const o = {}; for (const p of _fmt.formatToParts(new Date(ms))) o[p.type] = p.value; return o; }
function kOffset(ms) { const o = kParts(ms); return (Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour, +o.minute) - Math.floor(ms / MIN) * MIN) / MIN; }
function kTime(y, mo, d, h = 0, mi = 0) { const g = Date.UTC(y, mo - 1, d, h, mi); let ms = g - kOffset(g) * MIN; return g - kOffset(ms) * MIN; }
function K(str) { const [d, t = '00:00'] = str.split(' '); const [y, mo, dd] = d.split('-').map(Number); const [h, mi] = t.split(':').map(Number); return kTime(y, mo, dd, h, mi); }
function kDate(ms) { const o = kParts(ms); return o.year + '-' + o.month + '-' + o.day; }
function kHM(ms) { const o = kParts(ms); return o.hour + ':' + o.minute; }
function kDayStart(ms) { const o = kParts(ms); return kTime(+o.year, +o.month, +o.day); }
function kNextDay(ms) { const o = kParts(ms); return kTime(+o.year, +o.month, +o.day + 1); }
function kWeekStart(ms) { const o = kParts(ms); const wd = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[o.weekday]; return kTime(+o.year, +o.month, +o.day - wd); }
function kWhen(ms, now) { return (kDate(ms) === kDate(now) ? '' : ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][new Date(kDayStart(ms) + 12 * 3600e3).getUTCDay()] + ' ') + kHM(ms); }
function fmtDur(min) { if (min == null) return '—'; min = Math.max(0, Math.round(min)); const h = Math.floor(min / 60), m = min % 60; return h ? h + ' год' + (m ? ' ' + String(m).padStart(2, '0') + ' хв' : '') : m + ' хв'; }

// ---------------- гео ----------------
function distKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return 0;
  const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------------- 1. стан Freetrack ----------------
/** «Рухається. Швидкість - 53 км/год» / «Стоїть 19 год, 10 хв» / «Стоїть 2 дн 3 год» → {moving, speed, since} */
function parseState(text, t) {
  const s = String(text || ''), moving = /рухаєт/i.test(s);
  const sp = (s.match(/(\d+)\s*км\/год/) || [])[1];
  let since = null;
  if (!moving && /стоїть|стоянк|парков/i.test(s)) {
    const g = re => +((s.match(re) || [0, 0])[1]);
    const min = g(/(\d+)\s*д(н|іб|ень)/) * 1440 + g(/(\d+)\s*год/) * 60 + g(/(\d+)\s*хв/);
    since = t - min * MIN;
  }
  return { moving, speed: sp ? +sp : null, since };
}

// ---------------- 2. відрізки ----------------
function mkSeg(type, start, p, extra) {
  return Object.assign({ type, start, end: start, startErr: 0, endErr: 0, km: 0, lat: p.lat, lon: p.lon, place: p.place || '', zone: p.zone || '' }, extra || {});
}
function fin(s) { s.dur = Math.round((s.end - s.start) / MIN * 10) / 10; return s; }

/**
 * Один крок: попередній стан машини + нове опитування → закриті відрізки.
 * poll = {t, moving, speed?, since? (мс, з «Стоїть …»), lat, lon, place?, zone?}
 * state = {last, open} — зберігати між запусками (властивість скрипта, ~300 Б на машину).
 */
function ingest(st, p, cfg = CFG) {
  const out = [], q = st.last;
  const sinceP = p.moving ? null : (p.since != null ? p.since : p.t);
  if (!q) {
    st.open = p.moving ? mkSeg('drive', p.t, p) : mkSeg('stop', sinceP, p, { startErr: 1 });
    st.open.end = p.t; st.last = p; return out;
  }
  if (p.t <= q.t) return out;
  const dt = (p.t - q.t) / MIN, gap = dt > cfg.pollGapMin, km = distKm(q, p), o = st.open;
  const close = (end, err) => { o.end = Math.max(o.start, end); o.endErr = Math.round(err || 0); if (o.end > o.start) out.push(fin(o)); };
  const push = s => { if (s.end > s.start) out.push(fin(s)); };

  if (!p.moving) {
    if (o.type === 'stop' && Math.abs(sinceP - o.start) <= cfg.sameStopTolMin * MIN) {
      o.end = p.t; st.last = p; return out;                        // та сама стоянка (і через нічний пропуск — точно)
    }
    const S = Math.max(sinceP, q.t);                               // стоянка не почалась раніше попереднього опитування
    if (o.type === 'stop') {                                       // стара стоянка скінчилась, проїхав, нова стоянка з S
      const m = clamp(km / cfg.vEstKmh * 60, Math.min(cfg.minMoveMin, (S - q.t) / MIN), (S - q.t) / MIN) * MIN;
      if (gap) { close(q.t, 0); push(mkSeg('gap', q.t, q, { end: S - m, km: 0 })); }
      else close(S - m, (S - m - q.t) / MIN);
      push(mkSeg(km < cfg.crawlKm ? 'crawl' : 'drive', S - m, q, { end: S, km: Math.round(km * 10) / 10, est: true }));
    } else {                                                       // їхав → став о S (точно з тексту)
      if (gap) { close(q.t, 0); push(mkSeg('gap', q.t, q, { end: S, km: Math.round(km * 10) / 10 })); }
      else { o.km += km; close(S, 1); }
    }
    st.open = mkSeg('stop', S, p, { startErr: sinceP < q.t ? Math.round((q.t - sinceP) / MIN) : 1 });
  } else {
    if (o.type === 'stop') {                                       // стояв → їде: кінець стоянки = зараз − відстань/швидкість
      const v = p.speed >= 20 ? p.speed : cfg.vEstKmh;               // поточна швидкість точніша за середню
      const m = clamp(km / v * 60, cfg.minMoveMin, dt) * MIN, E = p.t - m;
      if (gap) { close(q.t, 0); push(mkSeg('gap', q.t, q, { end: E, km: 0 })); }
      else close(E, (E - q.t) / MIN);
      st.open = mkSeg(km < cfg.crawlKm ? 'crawl' : 'drive', E, q, { km, est: true });
    } else if (gap) {
      close(q.t, 0); push(mkSeg('gap', q.t, q, { end: p.t, km: Math.round(km * 10) / 10 }));
      st.open = mkSeg('drive', p.t, p);
    } else {
      const type = km / (dt / 60) < cfg.crawlAvgKmh ? 'crawl' : 'drive';
      if (type !== o.type) { const mid = q.t + (p.t - q.t) / 2; o.km += km / 2; close(mid, dt / 2); st.open = mkSeg(type, mid, q, { km: km / 2 }); }
      else o.km += km;
    }
  }
  st.open.end = p.t; st.last = p;
  return out;
}

/** Уся послідовність опитувань → відрізки; останній — відкритий (ongoing). */
function buildSegments(polls, cfg = CFG) {
  const st = { last: null, open: null }, out = [];
  polls.slice().sort((a, b) => a.t - b.t).forEach(p => out.push(...ingest(st, p, cfg)));
  if (st.open) out.push(fin(Object.assign({}, st.open, { ongoing: true })));
  out.forEach(s => { if (s.km) s.km = Math.round(s.km * 10) / 10; });
  return out;
}

/** Підпис типу для аркуша «Рух машин». */
function segLabel(s, cfg = CFG) {
  if (s.type === 'drive') return 'Рух';
  if (s.type === 'crawl') return 'Повільний рух (черга)';
  if (s.type === 'gap') return 'Немає даних' + (isRestGap(s, cfg) ? ' (ймовірно стоянка)' : '');
  const d = s.dur;
  return d < cfg.shortStopMin ? 'Коротка зупинка' : d < cfg.breakMin ? 'Стоянка' : d < cfg.splitRestMin ? 'Перерва'
    : d < cfg.dailyRedMin ? 'Довга стоянка' : d < cfg.weeklyRedMin ? 'Щоденний відпочинок' : 'Тижневий відпочинок';
}
/** Рядок аркуша: Авто | Початок | Кінець | Тип | Тривалість, хв | Місце | Зона | Км | ± початок | ± кінець | Джерело */
function segRow(truck, s) {
  return [truck, kDate(s.start) + ' ' + kHM(s.start), s.ongoing ? '' : kDate(s.end) + ' ' + kHM(s.end), segLabel(s), Math.round(s.dur),
    s.place || (s.lat != null ? s.lat.toFixed(4) + ',' + s.lon.toFixed(4) : ''), s.zone || '', s.km || '', s.startErr, s.endErr,
    s.type === 'gap' ? (s.calibrated ? 'калібровано' : 'оцінка') : (s.est ? 'оцінка' : 'опитування')];
}

// ---------------- 3. калібрування добовим звітом ----------------
function isRestGap(s, cfg = CFG) {
  return s.type === 'gap' && !s.open && (s.driveEst != null ? s.driveEst < 10 : (s.km || 0) < cfg.crawlKm);
}
function driveVal(s, cfg = CFG) {
  const dur = (s.end - s.start) / MIN;
  if (s.type === 'drive') return dur;
  if (s.type === 'crawl') return Math.min(dur, Math.max(cfg.minMoveMin, (s.km || 0) / cfg.crawlDriveKmh * 60));
  if (s.type === 'gap' && !s.open) return isRestGap(s, cfg) ? 0 : (s.driveEst != null ? s.driveEst : Math.min(dur, (s.km || 0) / cfg.vEstKmh * 60));
  return 0;
}
function overlap(s, a, b) { const x = Math.max(s.start, a), y = Math.min(s.end, b); return y > x ? (y - x) / (s.end - s.start || 1) : 0; }

/**
 * dailyMovingSec = { 'YYYY-MM-DD': durationOfMoving, с } (аркуш «GPS-дні», колонка «Рух, год» × 3600, київська доба).
 * Повертає {segs (копія; у пропусків з'являється driveEst), days: [{date, model, gap, actual, diff}]}.
 * Нерозподілений рух доби ділиться між пропусками цієї доби пропорційно їх тривалості (не більше тривалості пропуску).
 */
function calibrate(segs, dailyMovingSec, cfg = CFG) {
  const list = segs.map(s => Object.assign({}, s)), days = [], add = new Map();
  Object.keys(dailyMovingSec || {}).sort().forEach(date => {
    const a = K(date), b = kNextDay(a), actual = dailyMovingSec[date] / 60;
    let model = 0; const gaps = [];
    list.forEach(s => {
      const f = overlap(s, a, b); if (!f) return;
      if (s.type === 'gap') gaps.push({ s, len: f * (s.end - s.start) / MIN }); else model += f * driveVal(s, cfg);
    });
    if (!gaps.length && model === 0) return;
    // спершу — пропуски, за які машина зрушила (км), потім — «ймовірні стоянки» (лише якщо руху ще бракує > 10 хв)
    let rest = actual - model; const gl = gaps.reduce((x, g) => x + g.len, 0);
    for (const moved of [true, false]) {
      const grp = gaps.filter(g => ((g.s.km || 0) >= cfg.crawlKm) === moved), L = grp.reduce((x, g) => x + g.len, 0);
      if (!grp.length || rest <= (moved ? 0 : 10)) { grp.forEach(g => add.set(g.s, add.get(g.s) || 0)); continue; }
      let used = 0;
      grp.forEach(g => { const v = clamp(rest * g.len / (L || 1), 0, g.len); add.set(g.s, (add.get(g.s) || 0) + v); used += v; });
      rest -= used;
    }
    days.push({ date, model: Math.round(model), gap: Math.round(gl), actual: Math.round(actual), diff: Math.round(model - actual) });
  });
  add.forEach((v, s) => { s.driveEst = Math.round(v); s.calibrated = true; });
  return { segs: list, days };
}

// ---------------- 4. оцінка за нормами ----------------
function toBlocks(list, cfg) {
  const out = [];
  list.forEach(s => {
    const kind = s.open ? 'unknown' : (s.type === 'stop' || isRestGap(s, cfg)) ? 'rest' : 'drive';
    const prev = out[out.length - 1];
    if (kind === 'rest' && prev && prev.kind === 'rest') {
      prev.end = s.end; prev.endErr = s.endErr || 0; prev.gap = prev.gap || s.type === 'gap'; prev.zone = prev.zone || s.zone; prev.segs.push(s);
      if (s.type === 'gap') prev.calibrated = prev.calibrated || !!s.calibrated;
    } else out.push({ kind, start: s.start, end: s.end, drive: kind === 'drive' ? driveVal(s, cfg) : 0, gap: s.type === 'gap', calibrated: !!s.calibrated,
      crawl: s.type === 'crawl', zone: s.zone, startErr: s.startErr || 0, endErr: s.endErr || 0, segs: [s] });
  });
  out.forEach(b => { b.dur = (b.end - b.start) / MIN; });
  return out;
}
function weekKey(ms) { return kDate(kWeekStart(ms)); }
function counters() {
  return { dayStart: null, day: 0, cont: 0, split15: false, split3h: false, reduced: 0, lastWeeklyEnd: null, lastWeeklyDur: null,
    ext: {}, dayGap: false, dayCal: false, dayCrawl: false, contGap: false, breakZone: '', lastRestEnd: null, days: [] };
}
function stepDrive(st, b) {
  st.day += b.drive; st.cont += b.drive;
  if (b.gap || b.kind === 'unknown') { st.dayGap = st.contGap = true; if (b.calibrated) st.dayCal = true; }
  if (b.crawl) st.dayCrawl = true;
}
function endDay(st, b, cfg) {
  if (st.dayStart != null) {
    if (st.day > cfg.day9 + 0.5) { const k = weekKey(st.dayStart); st.ext[k] = (st.ext[k] || 0) + 1; }
    st.days.push({ start: st.dayStart, end: b.start, drive: Math.round(st.day) });
  }
  Object.assign(st, { dayStart: b.end, day: 0, cont: 0, split15: false, split3h: false, dayGap: false, dayCal: false, dayCrawl: false, contGap: false, breakZone: '', edge: false, lastRestEnd: b.end });
}
function applyRest(st, b, cfg) {
  const tol = Math.min(cfg.tolMin, b.endErr || 0), d = b.dur + tol;
  [cfg.breakMin, cfg.breakPart2Min, cfg.dailyRedMin, cfg.dailyMin, cfg.weeklyRedMin].forEach(thr => { if (b.dur < thr - 1 && d >= thr) st.edge = true; });
  if (d >= cfg.weeklyRedMin) { endDay(st, b, cfg); st.reduced = 0; st.lastWeeklyEnd = b.end; st.lastWeeklyDur = d; }
  else if (d >= cfg.dailyRedMin) { if (d < cfg.dailyMin && !st.split3h) st.reduced++; endDay(st, b, cfg); }
  else {
    if (d >= cfg.breakMin || (d >= cfg.breakPart2Min && st.split15)) { st.cont = 0; st.split15 = false; st.contGap = b.gap; st.breakZone = b.zone || ''; }
    else if (d >= cfg.shortStopMin) st.split15 = true;
    if (d >= cfg.splitRestMin) st.split3h = true;
  }
}
function driveIn(blocks, a, b) { return blocks.reduce((x, k) => x + (k.kind === 'drive' ? k.drive * overlap(k, a, b) : 0), 0); }
const RANK = { green: 0, yellow: 1, grey: 2 };
function worse(a, b) { return RANK[b] > RANK[a] ? b : a; }

/**
 * segs — відрізки машини (останній може бути відкритим), now — мс.
 * opts: {crew: 1|2, lastPollAt, speed, dailyMovingSec (для днів до початку історії), cfg}
 */
function evaluate(segs, now, opts = {}) {
  const cfg = Object.assign({}, CFG, opts.cfg), crew = opts.crew || 1;
  const res = { crew, status: 'nodata', statusText: 'Немає даних', conf: 'grey', reasons: [], warnings: [] };
  if (!segs.length) { res.reasons.push('немає історії руху'); return res; }
  const lastPoll = opts.lastPollAt != null ? opts.lastPollAt : segs[segs.length - 1].end;
  const stale = (now - lastPoll) / MIN > cfg.staleMin;
  const list = segs.map(s => Object.assign({}, s));
  if (stale) list.push({ type: 'gap', start: lastPoll, end: now, open: true });
  else list[list.length - 1].end = Math.max(list[list.length - 1].end, now);
  list.forEach(fin);
  const blocks = toBlocks(list, cfg), cur = blocks[blocks.length - 1], curRest = cur.kind === 'rest';
  const st = counters();
  blocks.forEach((b, i) => { if (i === blocks.length - 1 && curRest) return; b.kind === 'rest' ? applyRest(st, b, cfg) : stepDrive(st, b); });
  const before = JSON.parse(JSON.stringify(st));
  if (curRest) applyRest(st, cur, cfg);

  // тиждень / два тижні (календарні, пн 00:00 Київ)
  const wk = kWeekStart(now), pwk = kWeekStart(wk - MIN), hist0 = list[0].start;
  let week = driveIn(blocks, wk, now), prev = driveIn(blocks, pwk, wk), weekConf = 'green';
  if (hist0 > pwk) {                                            // історія коротша за 2 тижні — добираємо з «GPS-дні»
    const dm = opts.dailyMovingSec || {};
    for (let d = pwk; d < hist0; d = kNextDay(d)) {
      const key = kDate(d), first = kDayStart(hist0) === d;
      if (dm[key] == null) { weekConf = worse(weekConf, 'grey'); continue; }
      const extra = first ? Math.max(0, dm[key] / 60 - driveIn(blocks, d, kNextDay(d))) : dm[key] / 60;
      if (d >= wk) week += extra; else prev += extra;
      weekConf = worse(weekConf, 'yellow');
    }
  }
  const extUsed = st.ext[weekKey(now)] || 0, dayLimit = extUsed < cfg.extendedMax ? cfg.day10 : cfg.day9;
  const weekLeft = cfg.weekMax - week, twoLeft = cfg.twoWeekMax - (prev + week);
  Object.assign(res, { week: Math.round(week), weekLeft: Math.round(weekLeft), twoWeek: Math.round(prev + week), twoWeekLeft: Math.round(twoLeft), weekConf,
    extendedUsed: extUsed, dayLimit, reducedUsed: st.reduced, lastPollAt: lastPoll });

  // стан зараз
  const recentCrawl = list.filter(s => s.type === 'crawl' && s.end > now - 180 * MIN).length;
  const queue = recentCrawl >= 2 || list[list.length - 1].type === 'crawl';
  const zoneTxt = z => z === 'border' ? ' на кордоні' : z === 'load' ? ' на завантаженні/розвантаженні' : '';
  if (stale) { res.status = 'nodata'; res.statusText = 'Немає даних з ' + kWhen(lastPoll, now); }
  else if (!curRest) {
    res.status = queue ? 'queue' : 'drive';
    res.statusText = queue ? 'Черга / повільний рух' + zoneTxt(cur.zone) : 'Їде' + (opts.speed ? ', ' + opts.speed + ' км/год' : '');
  } else {
    const d = cur.dur;
    res.stopFrom = cur.start; res.stopMin = Math.round(d);
    res.status = queue && d < cfg.splitRestMin ? 'queue' : d < cfg.shortStopMin ? 'short' : d < cfg.breakMin ? 'stop' : d < cfg.splitRestMin ? 'break'
      : d < cfg.dailyRedMin ? 'longstop' : d < cfg.weeklyRedMin ? 'daily' : 'weekly';
    const name = { queue: 'черга', short: 'коротка зупинка', stop: 'стоянка', break: 'перерва', longstop: 'довга стоянка / відпочинок',
      daily: d < cfg.dailyMin ? 'щоденний відпочинок (≥9 год)' : 'щоденний відпочинок (≥11 год)',
      weekly: d < cfg.weeklyMin ? 'тижневий відпочинок (скорочений, ≥24 год)' : 'тижневий відпочинок (≥45 год)' }[res.status];
    res.statusText = 'Стоїть ' + fmtDur(d) + ' (з ' + kWhen(cur.start, now) + ') · ' + name + zoneTxt(cur.zone);
  }

  // ---- пара водіїв: лише сумарний час машини ----
  if (crew >= 2) {
    res.conf = 'grey'; res.reasons.push('пара водіїв — хто за кермом, невідомо; час кожного водія — лише з тахографа');
    if (stale) res.reasons.push('немає свіжих даних');
    res.machineDrive = Math.round(st.day); res.machineDayStart = st.dayStart;
    res.machine24h = Math.round(driveIn(blocks, now - 1440 * MIN, now));
    if (st.lastRestEnd != null) {
      res.crewRestBy = st.lastRestEnd + (cfg.crewWindowMin - cfg.dailyRedMin) * MIN;   // стоянку ≥9 год треба почати до …
      if (now > res.crewRestBy && !(curRest && cur.start <= res.crewRestBy)) res.warnings.push('екіпаж: немає стоянки 9 год у межах 30 год (мала початися до ' + kWhen(res.crewRestBy, now) + ')');
    } else res.reasons.push('у даних немає стоянки ≥9 год — початок доби екіпажу невідомий');
    if (st.day > 2 * cfg.day10) res.warnings.push('машина в русі понад 20 год від останньої стоянки 9 год');
    return res;
  }

  // ---- один водій ----
  const redAvail = n => n < cfg.reducedMax;
  res.day = Math.round(st.day); res.dayStart = st.dayStart; res.cont = Math.round(st.cont);
  res.contLeft = Math.max(0, Math.round(cfg.contMax - st.cont));
  res.dayLeft9 = Math.max(0, Math.round(cfg.day9 - st.day));
  res.dayLeft = Math.max(0, Math.round(Math.min(dayLimit - st.day, weekLeft, twoLeft)));
  res.breakNeeded = st.cont >= cfg.contMax - cfg.edgeMin;
  const inDaily = curRest && cur.dur >= cfg.dailyRedMin;
  if (st.dayStart != null && !inDaily) res.restDeadline = st.dayStart + (1440 - (redAvail(st.reduced) ? cfg.dailyRedMin : cfg.dailyMin)) * MIN;
  if (st.lastWeeklyEnd != null) res.weeklyRestDue = st.lastWeeklyEnd + 6 * 1440 * MIN;

  if (curRest && !stale) {
    const b = before, from = cur.start, ra = redAvail(b.reduced);
    const deadlineB = b.dayStart != null ? b.dayStart + (1440 - (ra ? cfg.dailyRedMin : cfg.dailyMin)) * MIN : null;
    let need = 'none', legal = from, full = null;
    if (weekLeft <= cfg.edgeMin || twoLeft <= cfg.edgeMin || (res.weeklyRestDue && from >= res.weeklyRestDue)) {
      need = 'weekly'; legal = from + ((b.lastWeeklyDur == null || b.lastWeeklyDur >= cfg.weeklyMin) ? cfg.weeklyRedMin : cfg.weeklyMin) * MIN; full = from + cfg.weeklyMin * MIN;
    } else if (b.day >= dayLimit - cfg.edgeMin || (deadlineB && from >= deadlineB - cfg.edgeMin * MIN)) {
      need = 'daily'; legal = from + ((b.split3h || ra) ? cfg.dailyRedMin : cfg.dailyMin) * MIN; full = from + cfg.dailyMin * MIN;
    } else if (b.cont >= cfg.contMax - cfg.edgeMin) {
      need = 'break'; legal = from + (b.split15 ? cfg.breakPart2Min : cfg.breakMin) * MIN;
    }
    Object.assign(res, { need, canStart: legal, canStartFull: full, canStartNow: legal <= now });
    if (cur.dur >= cfg.splitRestMin || need === 'daily' || (cur.dur >= cfg.breakMin && b.day >= cfg.day9 - 120))
      res.restOptions = { r9: (ra || b.split3h) ? from + cfg.dailyRedMin * MIN : null, r11: from + cfg.dailyMin * MIN };
    if (inDaily) res.reasons.push('щоденний відпочинок: новий день керування почнеться з першого руху');
  }
  if (!curRest && !stale) {
    res.breakAt = now + res.contLeft * MIN;
    let t = now, c = st.cont, r = res.dayLeft, guard = 0;
    while (r > 0.5 && guard++ < 10) { const ch = Math.min(cfg.contMax - c, r); if (ch <= 0) { t += cfg.breakMin * MIN; c = 0; continue; } t += ch * MIN; r -= ch; c += ch; }
    res.driveUntil = res.restDeadline ? Math.min(t, res.restDeadline) : t;
  }

  // довіра
  let conf = 'green';
  if (stale) { conf = 'grey'; res.reasons.push('трекер мовчить понад ' + cfg.staleMin + ' хв'); }
  if (st.dayStart == null) { conf = 'grey'; res.reasons.push('у даних немає стоянки ≥9 год — початок дня водія невідомий'); }
  if (st.dayGap || st.contGap) { conf = worse(conf, 'yellow'); res.reasons.push('пропуск даних — частину часу оцінено' + (st.dayCal ? ' (уточнено добовим звітом)' : ' за відстанню')); }
  if (st.edge) { conf = worse(conf, 'yellow'); res.reasons.push('одна зі стоянок на межі порогу (кінець оцінено між опитуваннями)'); }
  if (st.dayCrawl || queue) { conf = worse(conf, 'yellow'); res.reasons.push('повільний рух у черзі — керування приблизне'); }
  const z = curRest && cur.dur >= cfg.breakMin ? cur.zone : st.breakZone;
  if (z === 'load' || z === 'border') { conf = worse(conf, 'yellow'); res.reasons.push('перерва на складі/кордоні може бути «іншою роботою», а не перервою'); }
  if (curRest) [cfg.breakMin, cfg.dailyRedMin, cfg.dailyMin].forEach(thr => {
    if (Math.abs(cur.dur - thr) <= Math.max(cur.startErr, 1) && cur.startErr > 3) { conf = worse(conf, 'yellow'); res.reasons.push('початок стоянки відомий лише ±' + cur.startErr + ' хв'); }
  });
  res.conf = conf;

  // попередження (сигнал перевірити, не висновок)
  if (st.cont > cfg.contMax + 10) res.warnings.push('понад 4:30 без перерви 45 хв (' + fmtDur(st.cont) + ')');
  if (st.day > dayLimit + 10) res.warnings.push('за день понад ' + dayLimit / 60 + ' год (' + fmtDur(st.day) + ')');
  if (res.restDeadline && now > res.restDeadline && !(curRest && cur.start <= res.restDeadline + cfg.edgeMin * MIN))
    res.warnings.push('щоденний відпочинок мав початися до ' + kWhen(res.restDeadline, now) + ' (24 год від кінця попереднього)');
  if (weekLeft < -10) res.warnings.push('тиждень понад 56 год');
  if (twoLeft < -10) res.warnings.push('два тижні понад 90 год');
  if (res.weeklyRestDue && now > res.weeklyRestDue && !(curRest && cur.dur >= cfg.weeklyRedMin)) res.warnings.push('тижневий відпочинок прострочено (мав початися до ' + kWhen(res.weeklyRestDue, now) + ')');
  return res;
}

// ---------------- 5. текст для дошки ----------------
function boardText(ev, now) {
  const L = { conf: { green: 'надійно', yellow: 'приблизно', grey: ev.crew >= 2 ? 'пара — не рахуємо' : 'немає даних' }[ev.conf] };
  L.now = ev.statusText;
  if (ev.crew >= 2) {
    L.today = 'машина в русі: ' + fmtDur(ev.machineDrive) + (ev.machineDayStart ? ' (з ' + kWhen(ev.machineDayStart, now) + ')' : '');
    L.toBreak = '—'; L.canStart = ev.crewRestBy ? 'стоянку 9 год почати до ' + kWhen(ev.crewRestBy, now) : '—';
  } else if (ev.status === 'nodata' && ev.day == null) { L.today = L.toBreak = L.canStart = '—'; }
  else if (ev.status === 'nodata') { L.today = fmtDur(ev.day) + ' (на ' + kHM(ev.lastPollAt) + ')'; L.toBreak = L.canStart = '—'; }
  else {
    L.today = fmtDur(ev.day) + ' з 9' + (ev.dayLimit > 540 ? ' (можна 10)' : '');
    L.toBreak = ev.status === 'nodata' || ev.need === 'daily' || ev.need === 'weekly' || ev.status === 'daily' || ev.status === 'weekly' ? '—' : ev.breakNeeded ? (ev.status === 'drive' ? 'потрібна перерва 45 хв' : 'перерва зараховується')
      : 'ще ' + fmtDur(ev.contLeft) + (ev.breakAt ? ' (о ' + kWhen(ev.breakAt, now) + ')' : '');
    if (ev.canStart != null) {
      L.canStart = ev.canStartNow ? 'вже може' + (ev.need === 'none' ? ' (сьогодні ще ' + fmtDur(ev.dayLeft) + ')' : '') : 'з ' + kWhen(ev.canStart, now);
      if (ev.restOptions && ev.need !== 'weekly') L.canStart += ' · після відпочинку: ' + (ev.restOptions.r9 ? kWhen(ev.restOptions.r9, now) + ' (9 год) / ' : '') + kWhen(ev.restOptions.r11, now) + ' (11 год)';
      if (ev.need === 'weekly') L.canStart += ' (тижневий; повний — ' + kWhen(ev.canStartFull, now) + ')';
    } else if (ev.driveUntil) L.canStart = 'їхати до ~' + kWhen(ev.driveUntil, now) + ' (сьогодні ще ' + fmtDur(ev.dayLeft) + ')';
    else L.canStart = '—';
  }
  L.week = ev.week != null ? fmtDur(ev.week) + ' з 56' : '—';
  return L;
}

// ---------------- 6. ручний тахограф (ADR-058) ----------------
const MODES = { drive: 'Керую', work: 'Інша робота', avail: 'Очікування', rest: 'Перерва / відпочинок' };

/**
 * Журнал записів (лише дописування) → актуальні записи. Виправлення — новий запис з fix = id первісного; видалення — fix + del.
 * r = {id, kind:'mode'|'dayStart'|'dayEnd', mode, at, country, odo, note, fix, del, saved, by}
 */
function foldTacho(recs) {
  const byId = {}, order = [];
  recs.slice().sort((a, b) => (a.saved || 0) - (b.saved || 0)).forEach(r => {
    const key = r.fix || r.id;
    let cur = byId[key];
    if (!cur) { cur = byId[key] = { id: key, hist: [] }; order.push(key); }
    if (r.fix && cur.at != null) cur.hist.push({ saved: r.saved, by: r.by || '', del: !!r.del, was: { mode: cur.mode, at: cur.at, kind: cur.kind } });
    if (r.del) { cur.del = true; return; }
    cur.del = false;
    ['kind', 'mode', 'at', 'country', 'odo', 'note', 'truck'].forEach(k => { if (r[k] != null && r[k] !== '') cur[k] = r[k]; });
    if (r.fix) { cur.edited = r.saved; cur.editedBy = r.by || ''; } else cur.saved = r.saved;
    if (r.late) cur.late = true;
  });
  return order.map(k => byId[k]).filter(x => !x.del && x.at != null).sort((a, b) => a.at - b.at);
}
function recMode(r) { return r.kind === 'dayEnd' ? 'rest' : (r.mode || (r.kind === 'dayStart' ? 'work' : 'rest')); }

/** Актуальні записи → відрізки (кінець запису = початок наступного; останній — до now). */
function manualSegs(list, now) {
  const segs = [];
  list.forEach((r, i) => {
    const end = i + 1 < list.length ? list[i + 1].at : now, mode = recMode(r);
    if (end <= r.at) return;
    const prev = segs[segs.length - 1];
    if (prev && prev.mode === mode && prev.end === r.at) { prev.end = end; prev.ids.push(r.id); return; }
    segs.push({ type: mode === 'drive' ? 'drive' : mode === 'rest' ? 'stop' : 'work', mode, start: r.at, end, startErr: 0, endErr: 0, km: 0, manual: true, ids: [r.id], open: false });
  });
  if (segs.length && list.length) segs[segs.length - 1].tail = true;
  return segs.map(fin);
}

/**
 * Відрізки GPS + ручні: до першого ручного запису — GPS, далі — ручні.
 * Якщо останній ручний режим явно розходиться з GPS (відмітив «Керую», а машина стоїть ≥15 хв; або навпаки — їде ≥15 хв),
 * хвіст після цього беремо з GPS і позначаємо gpsTail (водій, мабуть, забув перемкнути).
 */
function mergeSegs(gps, man, now, gpsNow) {
  if (!man.length) return gps.slice();
  const t0 = man[0].start, out = [];
  gps.forEach(s => { if (s.start < t0) out.push(fin(Object.assign({}, s, { end: Math.min(s.end, t0) }))); });
  man.forEach(s => out.push(Object.assign({}, s)));
  const tail = out[out.length - 1];
  if (tail && tail.tail && gpsNow && !gpsNow.stale) {
    if (tail.mode === 'drive' && !gpsNow.moving && gpsNow.since && gpsNow.since > tail.start && now - gpsNow.since >= 15 * MIN) {
      tail.end = gpsNow.since; fin(tail); out.push(fin({ type: 'stop', start: gpsNow.since, end: now, startErr: 1, endErr: 0, km: 0, gpsTail: true }));
    } else if (tail.mode !== 'drive' && gpsNow.moving && gpsNow.moveFrom && gpsNow.moveFrom > tail.start + 15 * MIN && now - gpsNow.moveFrom >= 15 * MIN) {
      tail.end = gpsNow.moveFrom; fin(tail); out.push(fin({ type: 'drive', start: gpsNow.moveFrom, end: now, startErr: 8, endErr: 0, km: 0, gpsTail: true }));
    }
  }
  return out.filter(s => s.end > s.start);
}

/** Рядки «Рух машин» (+ поточний стан FT_POS) → відрізки для evaluate. rows: [{type:'рух'|'стоянка', from, to}] (мс). */
function gpsSegs(rows, cur, now) {
  const segs = rows.slice().sort((a, b) => a.from - b.from).map(r => fin({ type: r.type === 'стоянка' ? 'stop' : 'drive', start: r.from, end: r.to, startErr: 1, endErr: 5, km: 0 }));
  const out = [];
  segs.forEach(s => {                                                   // дірки між відрізками — «немає даних» (km 0 → ймовірно стоянка)
    const p = out[out.length - 1];
    if (p && s.start > p.end + 5 * MIN) out.push(fin({ type: 'gap', start: p.end, end: s.start, km: 0 }));
    if (p && s.start < p.end) s.start = p.end;
    if (s.end > s.start) out.push(fin(s));
  });
  if (cur && !cur.stale) {                                              // поточний відкритий відрізок
    const last = out[out.length - 1], from = cur.moving ? (cur.moveFrom || (last && last.end) || now) : cur.since;
    if (from) {
      const st = Math.max(from, last ? last.end : 0);
      if (last && st > last.end + 5 * MIN) out.push(fin({ type: 'gap', start: last.end, end: st, km: 0 }));
      out.push(fin({ type: cur.moving ? 'drive' : 'stop', start: st, end: now, startErr: cur.moving ? 8 : 1, endErr: 0, km: 0, ongoing: true }));
    }
  }
  return out;
}

/** Розбіжності ручних відміток з GPS (≥10 хв руху, коли відмічено не «Керую»; або «Керую» без руху ≥15 хв). */
function diffs(man, gps) {
  const out = [];
  const moveIn = (a, b) => gps.reduce((x, g) => x + (g.type === 'drive' ? Math.max(0, Math.min(g.end, b) - Math.max(g.start, a)) : 0), 0) / MIN;
  const gpsKnown = (a, b) => gps.reduce((x, g) => x + (g.type !== 'gap' ? Math.max(0, Math.min(g.end, b) - Math.max(g.start, a)) : 0), 0) / MIN;
  man.forEach(s => {
    const mv = moveIn(s.start, s.end), known = gpsKnown(s.start, s.end), dur = (s.end - s.start) / MIN;
    if (known < dur * 0.6) return;                                       // GPS тут майже не бачив — не порівнюємо
    if (s.mode !== 'drive' && mv >= 10) {
      const g = gps.find(x => x.type === 'drive' && x.end > s.start && x.start < s.end);
      out.push({ id: s.ids[0], start: s.start, end: s.end, mode: s.mode, gps: 'рух', min: Math.round(mv), gpsAt: g ? Math.max(g.start, s.start) : null });
    } else if (s.mode === 'drive' && dur - mv >= 15 && mv < dur * 0.5) out.push({ id: s.ids[0], start: s.start, end: s.end, mode: s.mode, gps: 'стоянка', min: Math.round(dur - mv) });
  });
  return out;
}

/** Суми по режимах за київську добу dayMs (для «аркуша»). */
function daySums(man, dayMs, now) {
  const a = kDayStart(dayMs), b = Math.min(kNextDay(dayMs), now), out = { drive: 0, work: 0, avail: 0, rest: 0 };
  man.forEach(s => { const x = Math.max(s.start, a), y = Math.min(s.end, b); if (y > x) out[s.mode] += (y - x) / MIN; });
  Object.keys(out).forEach(k => { out[k] = Math.round(out[k]); });
  return out;
}

/** Повна оцінка для водія / логіста. rows — «Рух машин», cur — FT_POS машини, recs — журнал тахографа. */
function driverTime(o) {
  const now = o.now, list = foldTacho(o.recs || []), man = manualSegs(list, now);
  const gps = gpsSegs(o.rows || [], o.cur, now);
  const segs = mergeSegs(gps, man, now, o.cur);
  const lastAt = o.cur && !o.cur.stale ? now : (man.length ? now : (gps.length ? gps[gps.length - 1].end : now));
  const ev = evaluate(segs, now, { crew: o.crew || 1, lastPollAt: lastAt, dailyMovingSec: o.dailyMovingSec || {} });
  const last = list[list.length - 1], tail = segs[segs.length - 1];
  ev.source = man.length && man[man.length - 1].end >= now - MIN && !(tail && tail.gpsTail) ? 'manual' : man.length ? 'mixed' : 'gps';
  ev.mode = last ? recMode(last) : null; ev.modeFrom = last ? last.at : null;
  ev.gpsTail = !!(tail && tail.gpsTail);
  ev.dayOpen = !!(last && last.kind !== 'dayEnd');
  ev.diffs = diffs(man.filter(s => s.end > now - 2 * 1440 * MIN), gps);
  ev.sums = daySums(man, now, now);
  return { ev, list, man, gps: gps.filter(s => s.end > now - 2 * 1440 * MIN), segs: segs.filter(s => s.end > now - 15 * 1440 * MIN) };
}

// ---------------- 7. короткий текст: головна водія і дошка логіста ----------------
/** who: 'driver' | 'logist'. Повертає {icon, main, sub, tone: ok|soon|red|rest|grey|start}. Інформаційно, з «≈». */
function shortText(ev, now, who) {
  const D = who === 'driver', w = t => kWhen(t, now);
  if (!ev) return null;
  if (ev.crew >= 2) return { icon: '👥', tone: 'grey', main: 'Пара водіїв · машина в русі сьогодні ' + fmtDur(ev.machineDrive || 0), sub: 'Час кожного водія — за тахографом' };
  const day = 'сьогодні ' + fmtDur(ev.day || 0) + ' з 9' + (ev.dayLimit > 540 ? ' (можна 10)' : '');
  const week = ev.week != null ? 'тиждень ' + fmtDur(ev.week) + ' з 56' : '';
  if (ev.status === 'nodata' && ev.source === 'gps')
    return D ? { icon: '▶', tone: 'start', main: 'Почніть день — відмітьте час і спідометр', sub: '' } : { icon: '…', tone: 'grey', main: ev.statusText || 'Немає даних', sub: '' };
  const manual = ev.source !== 'gps' && !ev.gpsTail, mode = manual ? ev.mode : null;
  const gpsRest = ['break', 'longstop', 'daily', 'weekly'].indexOf(ev.status) >= 0, resting = mode ? mode === 'rest' : gpsRest;
  if (resting) {
    let r9 = null, r11 = null;
    const longRest = ev.need === 'daily' || ['longstop', 'daily'].indexOf(ev.status) >= 0 || (mode === 'rest' && !ev.dayOpen);
    if (ev.restOptions && longRest) { r9 = ev.restOptions.r9; r11 = ev.restOptions.r11; }
    else if (mode === 'rest' && !ev.dayOpen && ev.modeFrom) { r11 = ev.modeFrom + CFG.dailyMin * MIN; r9 = (ev.reducedUsed || 0) < CFG.reducedMax ? ev.modeFrom + CFG.dailyRedMin * MIN : null; }
    if (ev.need === 'weekly' && ev.canStart) return { icon: '🛏', tone: 'rest', main: 'Тижневий відпочинок · ' + (D ? 'їхати можна' : 'може їхати') + ' з ≈ ' + w(ev.canStart), sub: ev.canStartFull ? 'Повний (45 год) — до ≈ ' + w(ev.canStartFull) : '' };
    const from0 = ev.stopFrom || ev.modeFrom, took0 = from0 ? Math.round((now - from0) / MIN) : 0;
    if ((r11 && r11 <= now) || (!r11 && took0 >= CFG.dailyRedMin && ev.canStartNow !== false))
      return { icon: '🛏', tone: 'rest', main: 'Відпочинок · ' + (D ? 'їхати вже можна' : 'вже може їхати'), sub: (D ? 'Відпочиваєте ' : 'стоїть ') + fmtDur(took0) + (from0 ? ' (з ' + w(from0) + ')' : '') };
    if (r11) return { icon: '🛏', tone: 'rest', main: 'Відпочинок · ' + (D ? 'їхати можна' : 'може їхати') + ' з ≈ ' + w(r11), sub: r9 ? (D ? 'Це після 11 год. Якщо скорочений (9 год) — з ≈ ' : 'з ≈ ') + w(r9) + (D ? '.' : ', якщо скорочений') : 'після 11 год' };
    const from = ev.stopFrom || ev.modeFrom, took = from ? Math.round((now - from) / MIN) : null;
    const can = ev.canStart && !ev.canStartNow ? (D ? 'їхати можна з ≈ ' : 'може їхати з ≈ ') + w(ev.canStart) : (D ? 'їхати вже можна' : 'вже може їхати');
    const tookTxt = took != null ? (D ? 'Відпочиваєте ' : 'стоїть ') + fmtDur(took) + (ev.need === 'break' && took < CFG.breakMin ? ' з 45 хв' : '') : '';
    const night = ev.restOptions && ev.restOptions.r11 ? (D ? 'Якщо це відпочинок на ніч — їхати з ≈ ' : 'якщо відпочинок — з ≈ ') + w(ev.restOptions.r11) : '';
    return { icon: '⏸', tone: 'rest', main: 'Перерва · ' + can, sub: [tookTxt, day, night].filter(Boolean).join(' · ') };
  }
  const cont = ev.cont || 0, left = ev.contLeft != null ? ev.contLeft : Math.max(0, CFG.contMax - cont);
  const sub = (D ? '' : 'без перерви ' + fmtDur(cont) + ' · ') + day + (week ? ' · ' + week : '');
  const icon = mode === 'work' ? '⚒' : mode === 'avail' ? '⊠' : '▶';
  if (cont > CFG.contMax + 15)
    return D ? { icon: '♥', tone: 'red', main: 'Ви за кермом ' + fmtDur(cont) + ' без перерви', sub: 'Схоже, час відпочити. Зупиніться, коли буде безпечно, — і відмітьте «Перерва».' }
             : { icon: '⚠', tone: 'red', main: 'Без перерви ' + fmtDur(cont) + ' — зателефонуйте водію', sub: day };
  if (ev.day > (ev.dayLimit || 540) + 15)
    return D ? { icon: '♥', tone: 'red', main: 'Сьогодні за кермом уже ' + fmtDur(ev.day), sub: 'Схоже, на сьогодні досить. Плануйте відпочинок.' }
             : { icon: '⚠', tone: 'red', main: 'За день ' + fmtDur(ev.day) + ' — зателефонуйте водію', sub: week };
  if (left <= 30) return { icon: '⏱', tone: 'soon', main: 'Скоро перерва — ≈ через ' + fmtDur(left), sub: D ? 'Підшукайте місце для стоянки. ' + day : sub };
  return { icon, tone: 'ok', main: (D ? '' : (mode === 'work' ? 'Інша робота · ' : mode === 'avail' ? 'Очікування · ' : 'За кермом · ')) + 'перерва через ≈ ' + fmtDur(left), sub: D ? (mode && mode !== 'drive' ? MODES[mode] + ' · ' : '') + day + (week ? ' · ' + week : '') : sub };
}

return { CFG, shortText, MODES, K, kDate, kHM, kWhen, kDayStart, kNextDay, kWeekStart, fmtDur, parseState, buildSegments, calibrate, evaluate, boardText,
  foldTacho, recMode, manualSegs, mergeSegs, gpsSegs, diffs, daySums, driverTime };
})();
if (typeof module !== 'undefined') module.exports = DRV;
