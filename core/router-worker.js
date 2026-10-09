/* =====================================================================
   ルート検索エンジン（Web Worker）
   - 徒歩ネットワーク（OSM）＋ 公共交通（Rapid KL GTFS / KTM / GoKL）
   - いくつかの「好み」で別々に計算し、違う道だけを候補として返す
   ===================================================================== */
let G = null, T = null;
const CACHE = {}; // 地域ごとに読み込んだデータ
const WALK = 1.25; // m/s（約4.5km/h）

function acc(arr) { const o = new Int32Array(arr.length); let s = 0; for (let i = 0; i < arr.length; i++) { s += arr[i]; o[i] = s; } return o; }

async function load(base, region) {
  if (CACHE[region]) { G = CACHE[region].G; T = CACHE[region].T; return; }
  const dir = base + "data/map/" + region + "/";
  const [g, t] = await Promise.all([fetch(dir + "graph.json").then((r) => r.json()), fetch(dir + "transit.json").then((r) => r.json())]);
  const N = g.lat.length, E = g.a.length;
  const lat = acc(g.lat), lon = acc(g.lon);
  // 隣接リスト（CSR）
  const deg = new Int32Array(N + 1);
  for (let i = 0; i < E; i++) { deg[g.a[i]]++; deg[g.b[i]]++; }
  const off = new Int32Array(N + 1);
  for (let i = 0; i < N; i++) off[i + 1] = off[i] + deg[i];
  const fill = off.slice(0, N);
  const adjN = new Int32Array(2 * E), adjE = new Int32Array(2 * E);
  for (let i = 0; i < E; i++) {
    adjN[fill[g.a[i]]] = g.b[i]; adjE[fill[g.a[i]]++] = i;
    adjN[fill[g.b[i]]] = g.a[i]; adjE[fill[g.b[i]]++] = i;
  }
  // 空間インデックス（約110m四方）
  const grid = new Map();
  for (let i = 0; i < N; i++) {
    if (off[i + 1] === off[i]) continue;
    const k = Math.floor(lat[i] / 1000) * 100000 + Math.floor(lon[i] / 1000);
    let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(i);
  }
  G = { g, N, E, lat, lon, off, adjN, adjE, grid, len: g.len, f: g.f, x: g.x, nc: g.nc, F: g.flags };
  // 公共交通
  const S = t.stops.length;
  const stopPats = Array.from({ length: S }, () => []);
  t.pat.forEach((p, pi) => p.s.forEach((s, i) => { if (i < p.s.length - 1) stopPats[s].push([pi, i]); }));
  // 同じ名前の駅どうしの乗り換え
  const transfers = Array.from({ length: S }, () => []);
  const norm = (n) => n.replace(/^KTM /, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const rail = t.stops.map((s, i) => [s, i]).filter(([s]) => s.k === "rail");
  for (const [a, i] of rail) for (const [b, j] of rail) {
    if (i >= j) continue;
    const d = dist(a.la, a.lo, b.la, b.lo);
    if (d < 450 && (norm(a.n) === norm(b.n) || d < 120)) { const c = 180 + d / WALK; transfers[i].push([j, c]); transfers[j].push([i, c]); }
  }
  const nodeStops = new Map();
  t.stops.forEach((s, i) => (s.acc || []).forEach(([n, c]) => { let a = nodeStops.get(n); if (!a) nodeStops.set(n, (a = [])); a.push([i, c]); }));
  T = { t, S, stopPats, transfers, nodeStops };
  CACHE[region] = { G, T };
}

function dist(la1, lo1, la2, lo2) {
  const x = (lo2 - lo1) * Math.cos(((la1 + la2) / 2) * Math.PI / 180) * 111320, y = (la2 - la1) * 110540;
  return Math.hypot(x, y);
}

function nearest(la, lo, maxM) {
  const L = Math.round(la * 1e6), O = Math.round(lo * 1e6);
  let best = -1, bd = 1e18;
  for (let r = 0; r <= 4 && best < 0; r++) {
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const a = G.grid.get((Math.floor(L / 1000) + dx) * 100000 + Math.floor(O / 1000) + dy);
      if (!a) continue;
      for (const i of a) { const d = dist(la, lo, G.lat[i] / 1e6, G.lon[i] / 1e6); if (d < bd) { bd = d; best = i; } }
    }
  }
  return bd <= (maxM || 600) ? [best, bd] : [-1, bd];
}

/* ---------- 営業時間（"06:00-23:00" のような簡単な形だけ読む） ---------- */
function openAt(str, minutes, dow) {
  if (!str) return true;
  if (/24\/7/.test(str)) return true;
  const ranges = [...str.matchAll(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g)];
  if (!ranges.length) return true;
  for (const m of ranges) {
    const a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4];
    if (b > a ? minutes >= a && minutes < b : minutes >= a || minutes < b) return true;
  }
  return false;
}

/* ---------- 好みごとの重み ---------- */
const PROFILES = {
  short: { label: "最短", cover: 1, cross: 0.3, major: 1.05, steps: 1.1 },
  cover: { label: "屋根・屋内優先", cover: 2.2, cross: 0.6, major: 1.2, steps: 1.15 },
  safe: { label: "横断を避ける", cover: 1.15, cross: 3, major: 1.8, steps: 1.0 },
};
const XPEN = [0, 35, 70, 160, 320, 600, 25, 20, 30, 1e9]; // 横断・信号・エレベーター・門のコスト（秒、cross倍率をかける）

function edgeCost(e, prof, ctx) {
  const F = G.F, f = G.f[e];
  if (f & F.paid) return Infinity; // 改札内の通路は徒歩ルートでは使わない
  if (G.g.ho[e] >= 0 && !openAt(G.g.hours[G.g.ho[e]], ctx.min, ctx.dow)) return Infinity;
  let s = G.len[e] / 10 / WALK;
  let m = 1;
  if (!(f & F.cover)) m *= prof.cover;
  if (f & F.indoor && ctx.night) m *= 3; // 夜はモールの中が閉まっていることが多い
  if (f & F.steps) m *= prof.steps;
  if (f & F.major) m *= prof.major;
  if (G.g.cls[e] === 11) m *= prof.cross > 1 ? 2 : 1.35; // 幹線道路（trunk）沿い
  if (f & F.noside) m *= 1.6 * (prof.cross > 1 ? 1.6 : 1);
  if (f & F.path) m *= 1.25;
  let c = s * m;
  if (f & F.cross) c += XPEN[G.x[e] || 3] * prof.cross;
  return c;
}

/* ---------- 二分ヒープ ---------- */
class Heap {
  constructor() { this.k = []; this.v = []; }
  push(key, val) { const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val); while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; } k[i] = key; v[i] = val; }
  pop() { const k = this.k, v = this.v, top = v[0], last = k.length - 1, lk = k[last], lv = v[last]; k.pop(); v.pop(); if (last > 0) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= last) break; if (c + 1 < last && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; } k[i] = lk; v[i] = lv; } return top; }
  get size() { return this.k.length; }
}

/* ---------- 徒歩のみ ---------- */
function walkRoute(src, dst, prof, ctx) {
  const N = G.N, cost = new Float64Array(N).fill(Infinity), prevE = new Int32Array(N).fill(-1), prevN = new Int32Array(N).fill(-1);
  const h = new Heap();
  cost[src] = 0; h.push(0, src);
  const dl = G.lat[dst] / 1e6, do_ = G.lon[dst] / 1e6;
  while (h.size) {
    const u = h.pop();
    if (u === dst) break;
    const cu = cost[u];
    for (let k = G.off[u]; k < G.off[u + 1]; k++) {
      const v = G.adjN[k], e = G.adjE[k];
      let c = edgeCost(e, prof, ctx);
      if (!isFinite(c)) continue;
      const nc = G.nc[v];
      if (nc) c += (nc === 9 ? 1e9 : XPEN[nc] * (nc === 7 || nc === 8 ? 1 : prof.cross));
      const nv = cu + c;
      if (nv < cost[v]) { cost[v] = nv; prevE[v] = e; prevN[v] = u; h.push(nv + dist(G.lat[v] / 1e6, G.lon[v] / 1e6, dl, do_) / WALK * 0.95, v); }
    }
  }
  if (!isFinite(cost[dst])) return null;
  const edges = [];
  for (let v = dst; v !== src; v = prevN[v]) edges.push([prevE[v], prevN[v], v]);
  edges.reverse();
  return { legs: [{ type: "walk", edges }] };
}

/* ---------- 公共交通を含む（時刻つきダイクストラ） ---------- */
function dayKeyHas(key, dow) { return key.indexOf(String(dow)) >= 0; }
function nextDep(p, t0, dow) {
  // その曜日のダイヤで t0 以降の最初の発車（前日の深夜便は考えない）
  for (const key in p.d) {
    if (!dayKeyHas(key, dow)) continue;
    const a = p.d[key];
    let lo = 0, hi = a.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < t0) lo = m + 1; else hi = m; }
    if (lo < a.length) return [a[lo], lo + 1 < a.length ? a[lo + 1] - a[lo] : 0, lo > 0 ? a[lo] - a[lo - 1] : 0];
  }
  return null;
}

function transitRoute(src, dst, t0, dow, opt) {
  const N = G.N, S = T.S, M = N + S;
  const cost = new Float64Array(M).fill(Infinity), time = new Float64Array(M).fill(Infinity);
  const prev = new Array(M); const h = new Heap();
  const wWalk = opt.walk, prof = PROFILES.short, ctx = opt.ctx;
  cost[src] = 0; time[src] = t0; h.push(0, src);
  const done = new Uint8Array(M);
  const pats = T.t.pat;
  while (h.size) {
    const u = h.pop();
    if (done[u]) continue; done[u] = 1;
    if (u === dst) break;
    const cu = cost[u], tu = time[u];
    if (u < N) {
      for (let k = G.off[u]; k < G.off[u + 1]; k++) {
        const v = G.adjN[k], e = G.adjE[k];
        let c = edgeCost(e, prof, ctx); if (!isFinite(c)) continue;
        const sec = G.len[e] / 10 / WALK;
        if (G.nc[v] === 9) continue;
        const nv = cu + c * wWalk;
        if (nv < cost[v]) { cost[v] = nv; time[v] = tu + sec; prev[v] = ["w", u, e]; h.push(nv, v); }
      }
      const ns = T.nodeStops.get(u);
      if (ns) for (const [s, c] of ns) {
        const v = N + s, nv = cu + c * wWalk;
        if (nv < cost[v]) { cost[v] = nv; time[v] = tu + c; prev[v] = ["in", u, s]; h.push(nv, v); }
      }
    } else {
      const s = u - N, st = T.t.stops[s];
      // 降りて歩く
      for (const [n, c] of st.acc || []) {
        const nv = cu + c * wWalk;
        if (nv < cost[n]) { cost[n] = nv; time[n] = tu + c; prev[n] = ["out", u, s]; h.push(nv, n); }
      }
      // 乗り換え（同じ駅の別の路線）
      for (const [s2, c] of T.transfers[s]) {
        const v = N + s2, nv = cu + c * wWalk;
        if (nv < cost[v]) { cost[v] = nv; time[v] = tu + c; prev[v] = ["xfer", u, s2]; h.push(nv, v); }
      }
      // 乗る
      const rides = (prev[u] && prev[u][0] === "ride") ? 1 : 0;
      for (const [pi, i] of T.stopPats[s]) {
        const p = pats[pi];
        if (prev[u] && prev[u][0] === "ride" && prev[u][3] === pi) continue;
        const nd = nextDep(p, tu - p.o[i] + 30, dow);
        if (!nd) continue;
        const dep = nd[0] + p.o[i];
        const wait = dep - tu;
        if (wait > 3600) continue;
        const board = opt.board + (p.k === "bus" ? opt.busExtra : 0);
        for (let j = i + 1; j < p.s.length; j++) {
          const arr = nd[0] + p.o[j];
          const v = N + p.s[j];
          const nv = cu + wait * opt.wait + (arr - dep) + board;
          if (nv < cost[v]) { cost[v] = nv; time[v] = arr; prev[v] = ["ride", u, s, pi, i, j, dep, arr, nd[1] || nd[2]]; h.push(nv, v); }
        }
      }
    }
  }
  if (!isFinite(cost[dst])) return null;
  // 経路の復元
  const steps = [];
  for (let v = dst; v !== src; ) { const p = prev[v]; steps.push([v, p]); v = p[1]; }
  steps.reverse();
  const legs = []; let cur = null;
  for (const [v, p] of steps) {
    if (p[0] === "w") {
      if (!cur || cur.type !== "walk") { cur = { type: "walk", edges: [] }; legs.push(cur); }
      cur.edges.push([p[2], p[1], v]);
    } else if (p[0] === "ride") {
      cur = { type: "ride", pat: p[3], i: p[4], j: p[5], dep: p[6], arr: p[7], hw: p[8] }; legs.push(cur);
    } else if (p[0] === "in" || p[0] === "out") {
      cur = { type: p[0] === "in" ? "enter" : "exit", stop: p[2], node: p[0] === "in" ? p[1] : v }; legs.push(cur);
    } else if (p[0] === "xfer") {
      cur = { type: "xfer", from: p[1] - N, to: p[2] }; legs.push(cur);
    }
  }
  if (!legs.some((l) => l.type === "ride")) return null;
  return { legs, t0, arrive: time[dst] };
}

/* ---------- 結果を画面で使える形に ---------- */
function summarize(r, mode, t0) {
  const F = G.F;
  let walkM = 0, coverM = 0, crossSig = 0, crossNo = 0, steps = 0, bridges = 0, tunnels = 0, indoor = 0, rides = 0, sec = 0;
  const legs = [];
  for (const l of r.legs) {
    if (l.type === "walk") {
      const coords = []; const segs = []; let legM = 0;
      for (const [e, a, b] of l.edges) {
        const m = G.len[e] / 10, f = G.f[e];
        walkM += m; legM += m; sec += m / WALK;
        if (f & F.cover) coverM += m;
        if (f & F.steps) steps++;
        if (f & F.bridge) bridges++;
        if (f & F.tunnel) tunnels++;
        if (f & F.indoor) indoor++;
        if (f & F.cross) { const x = G.x[e]; if (x === 1) crossSig++; else crossNo++; }
        const nc = G.nc[b]; if (nc >= 1 && nc <= 5 && !(f & F.cross)) { if (nc === 1) crossSig++; else crossNo++; }
        const pts = edgePts(e, a, b);
        if (!coords.length) coords.push(...pts); else coords.push(...pts.slice(1));
        segs.push({ e, a, b, m, f, x: G.x[e], nc: G.nc[b], name: G.g.nm[e] >= 0 ? G.g.names[G.g.nm[e]] : "", note: G.g.nt[e] >= 0 ? G.g.notes[G.g.nt[e]] : "", cls: G.g.cls[e], pts });
      }
      legs.push({ type: "walk", m: legM, coords, segs });
    } else if (l.type === "ride") {
      const p = T.t.pat[l.pat];
      rides++;
      const stops = p.s.slice(l.i, l.j + 1).map((s) => { const st = T.t.stops[s]; return { n: st.n, la: st.la, lo: st.lo }; });
      legs.push({ type: "ride", line: p.sn, name: p.ln, col: p.col, kind: p.k, head: p.hd, dep: l.dep, arr: l.arr, hw: l.hw, stops, approx: !!p.approx, fare: p.fare || "" });
    } else if (l.type === "enter" || l.type === "exit") {
      const st = T.t.stops[l.stop];
      legs.push({ type: l.type, stop: st.n, kind: st.k });
    } else if (l.type === "xfer") {
      legs.push({ type: "xfer", from: T.t.stops[l.from].n, to: T.t.stops[l.to].n });
    }
  }
  const total = r.arrive ? r.arrive - t0 : sec;
  return { mode, total, walkM: Math.round(walkM), coverPct: walkM ? Math.round((coverM / walkM) * 100) : 0, crossSig, crossNo, steps, bridges, tunnels, indoor, rides, legs, edgeSet: r.legs.filter((l) => l.type === "walk").flatMap((l) => l.edges.map((x) => x[0])) };
}

function edgePts(e, a, b) {
  const g = G.g.g[e], pts = [];
  pts.push([G.lon[G.g.a[e]] / 1e6, G.lat[G.g.a[e]] / 1e6]);
  for (let i = 0; i < g.length; i += 2) pts.push([g[i + 1] / 1e6, g[i] / 1e6]);
  pts.push([G.lon[G.g.b[e]] / 1e6, G.lat[G.g.b[e]] / 1e6]);
  if (G.g.a[e] !== a) pts.reverse();
  return pts;
}

function overlap(a, b) {
  if (!a.length || !b.length) return 0;
  const s = new Set(a); let n = 0; for (const e of b) if (s.has(e)) n++;
  return n / Math.max(a.length, b.length);
}

self.onmessage = async (ev) => {
  const m = ev.data;
  try {
    if (m.region) await load(m.base, m.region);
    if (m.type === "load") { self.postMessage({ id: m.id, ok: true, nodes: G.N, stops: T.S }); return; }
    if (m.type === "snap") { const [n, d] = nearest(m.la, m.lo, m.max || 400); self.postMessage({ id: m.id, ok: true, node: n, d, la: n >= 0 ? G.lat[n] / 1e6 : null, lo: n >= 0 ? G.lon[n] / 1e6 : null }); return; }
    if (m.type === "route") {
      const [s, ds] = nearest(m.from[0], m.from[1], 600), [d, dd] = nearest(m.to[0], m.to[1], 600);
      if (s < 0 || d < 0) { self.postMessage({ id: m.id, ok: false, err: s < 0 ? "出発地が地図の範囲外です" : "目的地が地図の範囲外です" }); return; }
      const ctx = { min: Math.floor(m.t0 / 60) % 1440, dow: m.dow, night: (m.t0 / 60) % 1440 < 570 || (m.t0 / 60) % 1440 > 1350 };
      const out = [];
      const push = (mode, r) => {
        if (!r) return;
        const sm = summarize(r, mode, m.t0);
        sm.total += (ds + dd) / WALK;
        for (const o of out) if (o.legs.every((l) => l.type === "walk") && sm.legs.every((l) => l.type === "walk") && overlap(o.edgeSet, sm.edgeSet) > 0.93) { o.alsoFor = (o.alsoFor || []).concat(mode); return; }
        out.push(sm);
      };
      for (const k of ["short", "cover", "safe"]) push(k, walkRoute(s, d, PROFILES[k], ctx));
      if (m.transit) {
        const tr1 = transitRoute(s, d, m.t0, m.dow, { walk: 1.0, wait: 1.0, board: 240, busExtra: 120, ctx });
        if (tr1) push("transit", tr1);
        const tr2 = transitRoute(s, d, m.t0, m.dow, { walk: 2.4, wait: 0.8, board: 180, busExtra: 60, ctx });
        if (tr2) {
          const a = summarize(tr2, "transitLess", m.t0);
          const same = out.find((o) => o.mode === "transit" && JSON.stringify(o.legs.filter((l) => l.type === "ride").map((l) => l.line + l.stops[0].n)) === JSON.stringify(a.legs.filter((l) => l.type === "ride").map((l) => l.line + l.stops[0].n)));
          if (!same) push("transitLess", tr2);
        }
      }
      out.forEach((o) => delete o.edgeSet);
      self.postMessage({ id: m.id, ok: true, routes: out, snap: { from: [G.lat[s] / 1e6, G.lon[s] / 1e6, ds], to: [G.lat[d] / 1e6, G.lon[d] / 1e6, dd] } });
    }
  } catch (e) {
    self.postMessage({ id: m.id, ok: false, err: String(e && e.message || e) });
  }
};
