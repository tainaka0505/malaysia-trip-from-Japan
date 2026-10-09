/* =====================================================================
   地図（オフライン）＋ 現在地 ＋ ルート検索
   - 地図データ：OpenStreetMap（KL中心部・バトゥ洞窟周辺）
   - ルート：徒歩（最短／屋根・屋内優先／横断を避ける）＋ 電車・バス
   ===================================================================== */
(function () {
  const BASE = (document.querySelector("base") || {}).href || location.href.replace(/[^/]*$/, "");
  const AREA = [[101.655, 3.07], [101.745, 3.185]];
  const CENTER = [101.703, 3.148];
  const MODE = {
    short: { t: "最短", d: "いちばん短い道", col: "#2563EB" },
    cover: { t: "屋根・屋内優先", d: "暑さ・スコール対策", col: "#0E7A4D" },
    safe: { t: "横断を避ける", d: "歩道橋・地下道・信号を優先", col: "#7C3AED" },
    transit: { t: "電車・バス（早い）", d: "", col: "#D9480F" },
    transitLess: { t: "電車・バス（歩き少なめ）", d: "", col: "#B45309" },
  };

  /* ---------- ルート検索エンジン（Worker） ---------- */
  let worker = null, wid = 0;
  const waits = {};
  function rpc(msg) {
    if (!worker) {
      worker = new Worker(BASE + "core/router-worker.js");
      worker.onmessage = (e) => { const w = waits[e.data.id]; if (w) { delete waits[e.data.id]; w(e.data); } };
    }
    return new Promise((res) => { const id = ++wid; waits[id] = res; worker.postMessage(Object.assign({ id }, msg)); });
  }
  let loaded = null;
  const loadEngine = () => (loaded = loaded || rpc({ type: "load", base: BASE }));

  /* ---------- マレーシア時間 ---------- */
  function myNow() {
    const d = new Date(Date.now() + 8 * 3600 * 1000);
    return { t0: d.getUTCHours() * 3600 + d.getUTCMinutes() * 60, dow: (d.getUTCDay() + 6) % 7, date: d.toISOString().slice(0, 10) };
  }
  const hm = (s) => { s = Math.round(s / 60) % 1440; return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
  const mins = (s) => { const m = Math.max(1, Math.round(s / 60)); return m >= 60 ? Math.floor(m / 60) + "時間" + (m % 60 ? (m % 60) + "分" : "") : m + "分"; };
  const meters = (m) => (m >= 1000 ? (m / 1000).toFixed(1) + "km" : Math.round(m / 10) * 10 + "m");
  const DOWJ = ["月", "火", "水", "木", "金", "土", "日"];

  /* ---------- 地図のスタイル ---------- */
  function style(dark) {
    const c = dark
      ? { bg: "#151B19", park: "#1D3328", water: "#173447", bld: "#252D2A", bldLine: "#2F3935", road: "#3A4440", roadCase: "#111614", major: "#5B5136", foot: "#7A8A84", label: "#C9D3CF", halo: "#151B19", cov: "#3FBF8F", indoor: "#A78BFA" }
      : { bg: "#F2F1EC", park: "#D6E8CF", water: "#B9D7EA", bld: "#E2DFD6", bldLine: "#D2CEC3", road: "#FFFFFF", roadCase: "#CFCBC0", major: "#FBE3A7", foot: "#8C8B85", label: "#3B3A36", halo: "#FFFFFF", cov: "#14935F", indoor: "#7C3AED" };
    const w = (a, b) => ["interpolate", ["exponential", 1.6], ["zoom"], 12, a, 18, b];
    const isK = (...k) => ["in", ["get", "k"], ["literal", k]];
    // 道の種類ごとの太さ（ズーム12と18の値）
    const rw = (big, mid, ter, minor) => ["interpolate", ["exponential", 1.6], ["zoom"],
      12, ["match", ["get", "k"], ["motorway", "trunk"], big[0], ["primary", "secondary"], mid[0], "tertiary", ter[0], minor[0]],
      18, ["match", ["get", "k"], ["motorway", "trunk"], big[1], ["primary", "secondary"], mid[1], "tertiary", ter[1], minor[1]]];
    return {
      version: 8,
      glyphs: BASE + "fonts/{fontstack}/{range}.pbf",
      sources: { kl: { type: "vector", tiles: [BASE + "tiles/{z}/{x}/{y}.pbf"], minzoom: 12, maxzoom: 16, bounds: [101.655, 3.07, 101.745, 3.247] } },
      layers: [
        { id: "bg", type: "background", paint: { "background-color": c.bg } },
        { id: "park", type: "fill", source: "kl", "source-layer": "landuse", filter: isK("park", "wood", "pitch"), paint: { "fill-color": c.park } },
        { id: "platform", type: "fill", source: "kl", "source-layer": "landuse", filter: isK("platform"), paint: { "fill-color": c.bldLine } },
        { id: "water", type: "fill", source: "kl", "source-layer": "water", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": c.water } },
        { id: "river", type: "line", source: "kl", "source-layer": "water", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": c.water, "line-width": w(2, 14) } },
        { id: "bld", type: "fill", source: "kl", "source-layer": "building", minzoom: 14, paint: { "fill-color": c.bld, "fill-outline-color": c.bldLine } },
        { id: "road-case", type: "line", source: "kl", "source-layer": "road", filter: isK("motorway", "trunk", "primary", "secondary", "tertiary", "minor"), layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": c.roadCase, "line-width": rw([3, 26], [2.4, 22], [1.8, 18], [0.8, 13]) } },
        { id: "road-service", type: "line", source: "kl", "source-layer": "road", minzoom: 15, filter: isK("service"), paint: { "line-color": c.road, "line-width": w(0.5, 7) } },
        { id: "road", type: "line", source: "kl", "source-layer": "road", filter: isK("motorway", "trunk", "primary", "secondary", "tertiary", "minor"), layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["match", ["get", "k"], ["motorway", "trunk", "primary", "secondary"], c.major, c.road], "line-width": rw([2, 22], [1.6, 18], [1.2, 14], [0.5, 10]) } },
        { id: "foot", type: "line", source: "kl", "source-layer": "road", minzoom: 15, filter: ["all", isK("foot", "path", "steps"), ["!", ["has", "cov"]]],
          paint: { "line-color": c.foot, "line-width": w(0.4, 3), "line-dasharray": [2, 1.5] } },
        { id: "foot-cov", type: "line", source: "kl", "source-layer": "road", minzoom: 14, filter: ["all", ["has", "cov"], ["!=", ["get", "k"], "corridor"]],
          paint: { "line-color": c.cov, "line-width": w(0.8, 5), "line-opacity": 0.85 } },
        { id: "foot-indoor", type: "line", source: "kl", "source-layer": "road", minzoom: 15, filter: isK("corridor"),
          paint: { "line-color": c.indoor, "line-width": w(0.6, 4), "line-dasharray": [1, 1], "line-opacity": 0.8 } },
        { id: "foot-tunnel", type: "line", source: "kl", "source-layer": "road", minzoom: 15, filter: ["all", ["has", "tun"], isK("foot", "steps", "corridor", "path")],
          paint: { "line-color": c.indoor, "line-width": w(0.6, 4), "line-dasharray": [0.6, 0.8] } },
        { id: "rail", type: "line", source: "kl", "source-layer": "rail",
          paint: { "line-color": ["case", ["!=", ["get", "col"], ""], ["get", "col"], "#888888"], "line-width": w(1.2, 6), "line-opacity": ["case", ["has", "tun"], 0.45, 0.9] } },
        { id: "road-label", type: "symbol", source: "kl", "source-layer": "road", minzoom: 15, filter: ["all", ["has", "name"], isK("primary", "secondary", "tertiary", "minor", "trunk", "pedestrian", "foot")],
          layout: { "symbol-placement": "line", "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 11 },
          paint: { "text-color": c.label, "text-halo-color": c.halo, "text-halo-width": 1.4 } },
        { id: "entrance", type: "circle", source: "kl", "source-layer": "poi", minzoom: 16.5, filter: isK("entrance"),
          paint: { "circle-radius": 4, "circle-color": "#ffffff", "circle-stroke-color": "#D9480F", "circle-stroke-width": 2 } },
        { id: "entrance-l", type: "symbol", source: "kl", "source-layer": "poi", minzoom: 17, filter: isK("entrance"),
          layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 10, "text-offset": [0, 1.1] }, paint: { "text-color": "#D9480F", "text-halo-color": c.halo, "text-halo-width": 1.2 } },
        { id: "toilet", type: "circle", source: "kl", "source-layer": "poi", minzoom: 16, filter: isK("toilet", "elevator"),
          paint: { "circle-radius": 3.5, "circle-color": ["match", ["get", "k"], "toilet", "#2563EB", "#7C3AED"], "circle-stroke-color": "#fff", "circle-stroke-width": 1 } },
        { id: "station", type: "circle", source: "kl", "source-layer": "poi", filter: isK("station"),
          paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 2.5, 17, 7], "circle-color": "#ffffff", "circle-stroke-color": c.label, "circle-stroke-width": 1.6 } },
        { id: "station-l", type: "symbol", source: "kl", "source-layer": "poi", minzoom: 13.5, filter: isK("station"),
          layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Medium"], "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10, 17, 13], "text-offset": [0, 1.2], "text-anchor": "top", "text-optional": true },
          paint: { "text-color": c.label, "text-halo-color": c.halo, "text-halo-width": 1.6 } },
        { id: "place-l", type: "symbol", source: "kl", "source-layer": "poi", minzoom: 15.5, filter: isK("place"),
          layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-optional": true }, paint: { "text-color": "#8a5a00", "text-halo-color": c.halo, "text-halo-width": 1.4 } },
      ],
    };
  }

  /* ---------- 道順の文章を作る ---------- */
  function bearing(a, b) { const y = (b[0] - a[0]) * Math.cos((a[1] * Math.PI) / 180), x = b[1] - a[1]; return (Math.atan2(y, x) * 180) / Math.PI; }
  function turnWord(prev, next) {
    if (!prev || !next || prev.length < 2 || next.length < 2) return "";
    const b1 = bearing(prev[prev.length - 2], prev[prev.length - 1]), b2 = bearing(next[0], next[1]);
    let d = ((b2 - b1 + 540) % 360) - 180;
    if (Math.abs(d) < 35) return "";
    if (Math.abs(d) > 150) return "引き返すように";
    return d > 0 ? "右へ" : "左へ";
  }
  function segKind(s, F) {
    if (s.f & F.elev) return "elev";
    if (s.f & F.steps) return "steps";
    if (s.f & F.cross) return "cross";
    if (s.f & F.tunnel) return "tunnel";
    if (s.f & F.bridge) return "bridge";
    if (s.f & F.indoor) return "indoor";
    if (s.f & F.cover) return "cover";
    if (s.f & F.road) return "road";
    return "walk";
  }
  const XTXT = { 1: "信号のある横断歩道を渡る", 2: "横断歩道（信号なし）を渡る。車に注意", 3: "信号のない所で道路を横断。車に十分注意", 4: "横断歩道のない所を渡る。車に十分注意", 5: "横断できない所。迂回が必要かも" };
  function walkSteps(leg, F) {
    const groups = [];
    for (const s of leg.segs) {
      const k = segKind(s, F);
      const g = groups[groups.length - 1];
      if (g && g.k === k && g.name === s.name && k !== "cross") { g.m += s.m; g.pts.push(...s.pts.slice(1)); if (s.note) g.note = s.note; }
      else groups.push({ k, name: s.name, m: s.m, x: s.x, pts: s.pts.slice(), note: s.note, nodeX: s.nc });
      if (s.nc >= 1 && s.nc <= 5 && !(s.f & F.cross)) groups.push({ k: "crossnode", x: s.nc, m: 0, pts: [s.pts[s.pts.length - 1], s.pts[s.pts.length - 1]] });
      if (s.nc === 6) groups[groups.length - 1].signal = true;
    }
    // 短い区間（30m未満の普通の道・屋根付きの道）は前後とまとめる
    const soft = (k) => k === "walk" || k === "road" || k === "cover";
    let out = [];
    for (const g of groups) {
      const p = out[out.length - 1];
      if (p && soft(g.k) && soft(p.k) && (g.m < 30 || p.k === g.k)) {
        if (p.m < 30 && g.m >= 30) { p.k = g.k; p.name = g.name; }
        p.coverM = (p.coverM || (p.k === "cover" ? p.m : 0)) + (g.k === "cover" ? g.m : 0);
        p.m += g.m; p.pts.push(...g.pts.slice(1)); if (g.note) p.note = g.note; if (!p.name) p.name = g.name;
        continue;
      }
      out.push(g);
    }
    // 最初が短すぎる時は次とまとめる
    if (out.length > 1 && soft(out[0].k) && soft(out[1].k) && out[0].m < 30) { out[1].m += out[0].m; out[1].pts = out[0].pts.concat(out[1].pts.slice(1)); out.shift(); }
    out = out.filter((g) => !(soft(g.k) && g.m < 8 && out.length > 1));
    return out.map((g, i) => {
      const turn = i ? turnWord(out[i - 1].pts, g.pts) : "";
      const nm = g.name ? "（" + g.name + "）" : "";
      let icon = "walk", text = "", warn = false;
      switch (g.k) {
        case "elev": icon = "elev"; text = "エレベーターで移動"; break;
        case "steps": icon = "steps"; text = "階段" + nm + "・" + meters(g.m); break;
        case "cross": case "crossnode": icon = "cross"; text = XTXT[g.x] || XTXT[3]; warn = g.x >= 3; break;
        case "tunnel": icon = "tunnel"; text = "地下道を通る" + nm + "・" + meters(g.m); break;
        case "bridge": icon = "bridge"; text = "歩道橋・連絡橋を渡る" + nm + "・" + meters(g.m); break;
        case "indoor": icon = "indoor"; text = "建物の中の通路を進む" + nm + "・" + meters(g.m); break;
        case "cover": icon = "cover"; text = "屋根付きの道を進む" + nm + "・" + meters(g.m); break;
        case "road": icon = "road"; text = (g.name ? g.name + " 沿いに" : "道路沿いに") + meters(g.m) + "歩く"; break;
        default: text = (g.name ? g.name + " を" : "") + meters(g.m) + "歩く";
      }
      if (turn && g.k !== "cross" && g.k !== "crossnode") text = turn + "曲がって、" + text;
      return { icon, text, warn, note: g.note, at: g.pts[0], m: g.m, k: g.k };
    });
  }

  /* ---------- モジュール ---------- */
  App.register({
    id: "map", title: "地図・ルート", short: "地図", icon: "map", order: 15, nav: "main", full: true,
    render(el, ctx) {
      const { h, icon, toast, sheet, store, onLeave, param } = ctx;
      if (!window.maplibregl) { el.append(h("p", { class: "empty" }, "地図の部品を読み込めませんでした。通信できる所でもう一度開いてください。")); return; }
      const dark = matchMedia("(prefers-color-scheme: dark)").matches;
      const wrap = h("div", { class: "mapwrap" });
      const mapEl = h("div", { id: "map", class: "map" });
      const searchInput = h("input", { id: "map-q", class: "map-search", type: "search", placeholder: "行き先を検索（駅、モール、スポット…）", autocomplete: "off" });
      const gpsBtn = h("button", { class: "map-fab gps", "aria-label": "現在地" }, icon("gps"));
      const layerBtn = h("button", { class: "map-fab legend-btn", "aria-label": "地図の見方" }, icon("info"));
      const panel = h("div", { class: "map-panel" });
      wrap.append(mapEl, h("div", { class: "map-top" }, h("div", { class: "searchbox" }, icon("search"), searchInput)), h("div", { class: "map-fabs" }, layerBtn, gpsBtn), panel);
      el.append(wrap);

      const map = new maplibregl.Map({
        container: mapEl, style: style(dark), center: CENTER, zoom: 14.2, minZoom: 12, maxZoom: 19.5,
        maxBounds: [[101.60, 3.03], [101.80, 3.29]], attributionControl: false, localIdeographFontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif", dragRotate: true, pitchWithRotate: false,
      });
      map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "© OpenStreetMap contributors / Rapid KL GTFS" }), "bottom-left");
      map.touchZoomRotate.enableRotation();
      // 画面の大きさが変わったら地図も合わせる
      const ro = new ResizeObserver(() => map.resize());
      ro.observe(mapEl);
      onLeave(() => ro.disconnect());
      requestAnimationFrame(() => map.resize());
      onLeave(() => { stopGps(); map.remove(); });

      /* ----- 状態 ----- */
      let me = null;              // [lng, lat, accuracy]
      let watchId = null, follow = false;
      let from = null, to = null; // {la, lo, name}
      let routes = [], selected = -1, depart = null; // depart: {t0, dow} or null(now)
      let navMode = false, offCount = 0;
      const pins = [];
      let pinMarkers = [];

      /* ----- マーカー ----- */
      const meEl = h("div", { class: "me-dot" }, h("i"));
      const meMarker = new maplibregl.Marker({ element: meEl });
      const toMarker = new maplibregl.Marker({ element: h("div", { class: "pin to" }, icon("pin")), anchor: "bottom" });
      const fromMarker = new maplibregl.Marker({ element: h("div", { class: "pin from" }), anchor: "center" });

      map.on("load", () => {
        map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addSource("acc", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "acc", type: "fill", source: "acc", paint: { "fill-color": "#2563EB", "fill-opacity": 0.12 } });
        map.addLayer({ id: "route-case", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 5, 18, 14] } });
        map.addLayer({ id: "route-line", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["get", "col"], "line-width": ["interpolate", ["linear"], ["zoom"], 12, 3, 18, 9], "line-dasharray": ["case", ["==", ["get", "dash"], 1], ["literal", [1, 1.4]], ["literal", [1, 0]]] } });
        map.addLayer({ id: "route-warn", type: "circle", source: "route", filter: ["==", ["get", "w"], 1], paint: { "circle-radius": 7, "circle-color": "#F59E0B", "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
        if (param && param.to) setTo(param.to);
      });

      // 長押し・右クリックで地点メニュー
      let pressT = null;
      const openPointMenu = (lngLat) => {
        const pt = { la: lngLat.lat, lo: lngLat.lng, name: "地図で選んだ地点" };
        let close;
        const body = h("div", { class: "form" },
          h("p", { class: "small muted mono" }, pt.la.toFixed(5) + ", " + pt.lo.toFixed(5)),
          h("div", { class: "row gap" },
            h("button", { class: "btn primary", onclick: () => { close(); setTo(pt); } }, "ここへ行く"),
            h("button", { class: "btn", onclick: () => { close(); setFrom(pt); } }, "ここから出発"),
            h("button", { class: "btn", onclick: () => { close(); savePin(pt); } }, "地点を保存")));
        close = sheet("この地点", body);
      };
      map.on("contextmenu", (e) => openPointMenu(e.lngLat));
      map.on("touchstart", (e) => { if (e.originalEvent.touches.length > 1) return; const ll = e.lngLat; clearTimeout(pressT); pressT = setTimeout(() => openPointMenu(ll), 650); });
      ["touchend", "touchmove", "dragstart", "zoomstart"].forEach((ev) => map.on(ev, () => clearTimeout(pressT)));
      map.on("dragstart", () => { if (follow) { follow = false; gpsBtn.classList.remove("follow"); } });

      /* ----- 現在地 ----- */
      function circle(lng, lat, r) {
        const pts = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; pts.push([lng + (r * Math.cos(a)) / (111320 * Math.cos((lat * Math.PI) / 180)), lat + (r * Math.sin(a)) / 110540]); }
        return { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [pts] } }] };
      }
      function startGps() {
        if (!navigator.geolocation) { toast("この端末では現在地を使えません"); return; }
        if (watchId != null) { follow = true; gpsBtn.classList.add("follow"); if (me) map.easeTo({ center: [me[0], me[1]], zoom: Math.max(map.getZoom(), 16.5) }); return; }
        gpsBtn.classList.add("busy");
        watchId = navigator.geolocation.watchPosition((p) => {
          gpsBtn.classList.remove("busy");
          const first = !me;
          me = [p.coords.longitude, p.coords.latitude, p.coords.accuracy];
          meMarker.setLngLat([me[0], me[1]]).addTo(map);
          if (map.getSource("acc")) map.getSource("acc").setData(circle(me[0], me[1], Math.min(me[2], 300)));
          const inArea = me[1] > 3.03 && me[1] < 3.29 && me[0] > 101.6 && me[0] < 101.8;
          if (first) {
            if (!inArea) toast("現在地は地図の範囲（KL中心部・バトゥ洞窟周辺）の外です");
            else { follow = true; gpsBtn.classList.add("follow"); map.easeTo({ center: [me[0], me[1]], zoom: 16.5 }); }
          } else if (follow && inArea) map.easeTo({ center: [me[0], me[1]], duration: 600 });
          if (navMode) navTick();
        }, (err) => {
          gpsBtn.classList.remove("busy");
          toast(err.code === 1 ? "位置情報の使用が許可されていません。設定で許可してください" : "現在地を取得できませんでした");
          stopGps();
        }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
      }
      function stopGps() { if (watchId != null) navigator.geolocation.clearWatch(watchId); watchId = null; }
      gpsBtn.onclick = startGps;

      layerBtn.onclick = () => sheet("地図の見方", h("div", { class: "legend" },
        h("p", null, h("span", { class: "lg", style: { background: dark ? "#3FBF8F" : "#14935F" } }), "屋根付きの歩道・通路"),
        h("p", null, h("span", { class: "lg dash", style: { borderColor: "#7C3AED" } }), "建物の中の通路・地下道"),
        h("p", null, h("span", { class: "lg dash", style: { borderColor: "#8C8B85" } }), "歩道・小道"),
        h("p", null, h("span", { class: "lg dot", style: { borderColor: "#D9480F" } }), "駅の出入口（ズームすると番号）"),
        h("p", null, h("span", { class: "lg dot", style: { background: "#2563EB" } }), "トイレ　", h("span", { class: "lg dot", style: { background: "#7C3AED" } }), "エレベーター"),
        h("p", { class: "small muted" }, "長押し（PCは右クリック）で、その地点を出発地・目的地・保存地点にできます。"),
        h("p", { class: "small muted" }, "地図データ：© OpenStreetMap contributors（2026年10月取得）。路線データ：Rapid KL（data.gov.my）。KTMコミューターとGoKLの時刻は目安です。"),
        h("div", { class: "row gap" }, h("button", { class: "btn", onclick: offlineSave }, icon("download"), "オフライン用に地図を全部保存"))
      ));

      /* ----- 検索 ----- */
      let places = null;
      const loadPlaces = () => (places = places || fetch(BASE + "data/map/places.json").then((r) => r.json()));
      const fold = (s) => (s || "").toLowerCase().normalize("NFKC").replace(/[\s'’\-・（）()]/g, "");
      function search(q) {
        const f = fold(q);
        return loadPlaces().then((ps) => {
          const all = pins.map((p) => ({ n: p.name, ja: p.name, c: "保存した地点", la: p.la, lo: p.lo, star: 2 })).concat(ps);
          const hit = [];
          for (const p of all) {
            const keys = [p.ja, p.n].concat(p.a || []).map(fold);
            let score = -1;
            keys.forEach((k) => { if (!k) return; if (k === f) score = Math.max(score, 100); else if (k.startsWith(f)) score = Math.max(score, 60); else if (k.includes(f)) score = Math.max(score, 30); });
            if (score < 0) continue;
            if (p.star) score += 40 * p.star;
            if (p.c === "駅") score += 15;
            if (me) score -= Math.min(20, Math.hypot(p.la - me[1], p.lo - me[0]) * 200);
            hit.push([score, p]);
          }
          return hit.sort((a, b) => b[0] - a[0]).slice(0, 40).map((x) => x[1]);
        });
      }
      let qTimer;
      searchInput.addEventListener("input", () => {
        clearTimeout(qTimer);
        const q = searchInput.value.trim();
        if (!q) { showHome(); return; }
        qTimer = setTimeout(() => search(q).then((list) => showResults(list, q)), 150);
      });
      searchInput.addEventListener("focus", () => { if (!searchInput.value) showHome(); });

      function placeRow(p, onPick) {
        const d = me ? Math.hypot((p.la - me[1]) * 110540, (p.lo - me[0]) * 111320) : null;
        return h("li", null, h("button", { class: "res", onclick: () => onPick(p) },
          h("span", { class: "res-main" }, h("strong", null, p.ja || p.n), h("small", { class: "muted" }, (p.ja && p.ja !== p.n ? p.n + "・" : "") + p.c)),
          d != null ? h("small", { class: "mono muted" }, meters(d)) : null));
      }
      function showResults(list, q) {
        panel.className = "map-panel open";
        panel.replaceChildren(
          h("div", { class: "panel-head" }, h("strong", null, "「" + q + "」の検索結果"), closeBtn()),
          list.length ? h("ul", { class: "res-list" }, list.map((p) => placeRow(p, (pp) => { searchInput.blur(); setTo({ la: pp.la, lo: pp.lo, name: pp.ja || pp.n, c: pp.c }); })))
            : h("p", { class: "empty" }, "見つかりませんでした。英語やマレー語の名前でも探してみてください。長押しで地図から選ぶこともできます。"));
      }
      function closeBtn() { return h("button", { class: "icon-btn", "aria-label": "閉じる", onclick: () => { panel.className = "map-panel"; panel.replaceChildren(); searchInput.value = ""; } }, icon("x")); }
      function showHome() {
        loadPlaces().then((ps) => {
          panel.className = "map-panel open";
          const stars = ps.filter((p) => p.star);
          panel.replaceChildren(
            h("div", { class: "panel-head" }, h("strong", null, "よく行く場所"), closeBtn()),
            pins.length ? [h("h3", { class: "sec small" }, "保存した地点"), h("ul", { class: "res-list" }, pins.map((p) => placeRow({ n: p.name, ja: p.name, c: p.note || "保存した地点", la: p.la, lo: p.lo }, (pp) => setTo({ la: pp.la, lo: pp.lo, name: pp.ja }))))] : null,
            h("h3", { class: "sec small" }, "主な観光地・駅"),
            h("ul", { class: "res-list" }, stars.map((p) => placeRow(p, (pp) => setTo({ la: pp.la, lo: pp.lo, name: pp.ja || pp.n, c: pp.c })))));
        });
      }

      /* ----- 出発地・目的地 ----- */
      function setTo(p) {
        to = p;
        toMarker.setLngLat([p.lo, p.la]).addTo(map);
        searchInput.value = p.name || "";
        if (!from && !me) startGps();
        map.easeTo({ center: [p.lo, p.la], zoom: Math.max(map.getZoom(), 15.5) });
        planUI();
      }
      function setFrom(p) {
        from = p;
        if (p) fromMarker.setLngLat([p.lo, p.la]).addTo(map); else fromMarker.remove();
        if (to) planUI();
      }
      function origin() { return from || (me ? { la: me[1], lo: me[0], name: "現在地" } : null); }

      function planUI() {
        panel.className = "map-panel open";
        const o = origin();
        const now = myNow();
        const t = depart || now;
        const timeIn = h("input", { id: "map-time", class: "input small-in", type: "time", value: hm(t.t0) });
        const dowSel = h("select", { id: "map-dow", class: "select small-in", "aria-label": "曜日" }, DOWJ.map((d, i) => h("option", { value: i, selected: i === t.dow ? true : null }, d + "曜")));
        const apply = () => { const [a, b] = timeIn.value.split(":").map(Number); depart = { t0: a * 3600 + b * 60, dow: +dowSel.value }; compute(); };
        timeIn.onchange = apply; dowSel.onchange = apply;
        panel.replaceChildren(
          h("div", { class: "panel-head" }, h("div", { class: "od" },
            h("div", null, h("span", { class: "dot from" }), h("button", { class: "linkish", onclick: chooseFrom }, o ? o.name : "出発地を選ぶ")),
            h("div", null, h("span", { class: "dot to" }), h("strong", null, to.name || "目的地"))),
            closeBtn()),
          h("div", { class: "row gap time-row" }, h("span", { class: "small muted" }, "出発"), timeIn, dowSel,
            h("button", { class: "chip" + (depart ? "" : " on"), onclick: () => { depart = null; planUI(); } }, "今すぐ")),
          h("div", { class: "route-list" }, o ? h("p", { class: "empty" }, "ルートを計算中…") : h("p", { class: "empty" }, "出発地が決まっていません。現在地を使うか、「出発地を選ぶ」から決めてください。"))
        );
        if (o) compute();
      }
      function chooseFrom() {
        let close;
        const input = h("input", { id: "from-q", class: "input", type: "search", placeholder: "出発地を検索" });
        const list = h("ul", { class: "res-list" });
        input.oninput = () => search(input.value.trim()).then((l) => list.replaceChildren(...l.slice(0, 20).map((p) => placeRow(p, (pp) => { close(); setFrom({ la: pp.la, lo: pp.lo, name: pp.ja || pp.n }); }))));
        close = sheet("出発地", h("div", { class: "form" },
          h("button", { class: "btn", onclick: () => { close(); setFrom(null); startGps(); } }, icon("gps"), "現在地から"),
          input, list));
        setTimeout(() => input.focus(), 250);
      }

      async function compute() {
        const o = origin();
        if (!o || !to) return;
        const list = panel.querySelector(".route-list");
        const st = await loadEngine();
        if (!st.ok) { list.replaceChildren(h("p", { class: "empty" }, "ルートのデータを読み込めませんでした")); return; }
        const t = depart || myNow();
        const res = await rpc({ type: "route", from: [o.la, o.lo], to: [to.la, to.lo], t0: t.t0, dow: t.dow, transit: true });
        if (!res.ok) { list.replaceChildren(h("p", { class: "empty" }, res.err || "ルートが見つかりませんでした")); return; }
        routes = res.routes;
        routes.forEach((r) => (r.t0 = t.t0));
        if (!routes.length) {
          const night = t.t0 < 6 * 3600 || t.t0 > 23 * 3600 + 1800;
          list.replaceChildren(h("p", { class: "empty" }, night
            ? "この時間は電車・バスが動いていないため、ルートが見つかりませんでした。出発時刻を変えるか、Grabを使ってください。"
            : "歩いて行ける道がつながっていないか、電車・バスのルートが見つかりませんでした。Grabも検討してください。"));
          return;
        }
        drawOptions(list);
        select(0, false);
      }

      function drawOptions(list) {
        list.replaceChildren(...routes.map((r, i) => {
          const md = MODE[r.mode];
          const rides = r.legs.filter((l) => l.type === "ride");
          return h("button", { class: "route-card" + (i === selected ? " on" : ""), style: { "--rc": md.col }, onclick: () => select(i, true) },
            h("div", { class: "row between" },
              h("strong", null, md.t, r.alsoFor ? h("small", { class: "muted" }, "（" + r.alsoFor.map((m) => MODE[m].t).join("・") + "も同じ道）") : null),
              h("span", { class: "mono big" }, mins(r.total))),
            rides.length ? h("div", { class: "rides" }, rides.map((l) => h("span", { class: "line-chip", style: { background: l.col } }, l.line))) : null,
            h("div", { class: "facts small" },
              h("span", null, "徒歩 " + meters(r.walkM)),
              h("span", null, "屋根 " + r.coverPct + "%"),
              r.crossNo ? h("span", { class: "warn" }, "信号なし横断 " + r.crossNo) : h("span", null, "信号なし横断 0"),
              r.crossSig ? h("span", null, "信号 " + r.crossSig) : null,
              r.bridges ? h("span", null, "歩道橋 " + r.bridges) : null,
              r.tunnels ? h("span", null, "地下道 " + r.tunnels) : null,
              r.steps ? h("span", null, "階段 " + r.steps) : null,
              rides.length ? h("span", null, hm(r.t0 + 0) + "発 → " + hm(r.t0 + r.total) + "着") : null));
        }));
      }

      function select(i, showSteps) {
        selected = i;
        const r = routes[i];
        if (!r) return;
        const feats = [];
        const md = MODE[r.mode];
        for (const l of r.legs) {
          if (l.type === "walk") {
            for (const s of l.segs) {
              const tr = r.mode.startsWith("transit");
              feats.push({ type: "Feature", properties: { col: (s.f & 1) ? "#0E9F6E" : tr ? "#64748B" : md.col, dash: (s.f & 1) ? 0 : (tr ? 1 : 0), w: 0 }, geometry: { type: "LineString", coordinates: s.pts } });
              if ((s.f & 256 && s.x >= 3) || (s.nc >= 3 && s.nc <= 5)) feats.push({ type: "Feature", properties: { w: 1 }, geometry: { type: "Point", coordinates: s.pts[s.pts.length - 1] } });
            }
          } else if (l.type === "ride") {
            feats.push({ type: "Feature", properties: { col: l.col, dash: 0 }, geometry: { type: "LineString", coordinates: l.stops.map((s) => [s.lo, s.la]) } });
          }
        }
        if (map.getSource("route")) map.getSource("route").setData({ type: "FeatureCollection", features: feats });
        const all = feats.filter((f) => f.geometry.type === "LineString").flatMap((f) => f.geometry.coordinates);
        if (all.length) {
          const b = all.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(all[0], all[0]));
          map.fitBounds(b, { padding: { top: 90, bottom: Math.round(window.innerHeight * 0.45), left: 40, right: 40 }, maxZoom: 17.5, duration: 500 });
        }
        const list = panel.querySelector(".route-list");
        if (list) [...list.children].forEach((c, k) => c.classList.toggle("on", k === i));
        if (showSteps) stepsUI(r);
      }

      function stepsUI(r) {
        panel.className = "map-panel open tall";
        const md = MODE[r.mode];
        const items = [];
        let t = r.t0;
        const F = { cover: 1, indoor: 2, tunnel: 4, bridge: 8, steps: 16, road: 32, major: 64, sidewalk: 128, cross: 256, paid: 512, elev: 1024, noside: 2048, path: 4096 };
        for (const l of r.legs) {
          if (l.type === "walk") {
            walkSteps(l, F).forEach((s) => items.push(h("li", { class: "step " + s.icon + (s.warn ? " warn" : "") }, App.icon(stepIcon(s.icon)), h("div", null, h("span", null, s.text), s.note ? h("small", { class: "muted" }, "メモ（OSM）：" + s.note) : null,
              s.k === "indoor" ? h("small", { class: "muted" }, "建物の営業時間外は閉まっていることがあります") : null))));
            t += l.m / 1.25;
          } else if (l.type === "enter") {
            items.push(h("li", { class: "step station" }, App.icon("train"), h("span", null, (l.kind === "rail" ? "駅に入る：" : "バス停：") + l.stop)));
          } else if (l.type === "ride") {
            const n = l.stops.length - 1;
            items.push(h("li", { class: "step ride", style: { "--lc": l.col } },
              h("span", { class: "line-chip", style: { background: l.col } }, l.line),
              h("div", null,
                h("strong", null, l.name || l.line),
                h("span", null, l.head ? l.head.replace(/^From .* to /, "") + " 方面" : ""),
                h("span", { class: "mono" }, hm(l.dep) + " " + l.stops[0].n + " 発"),
                h("span", { class: "mono" }, hm(l.arr) + " " + l.stops[n].n + " 着（" + n + (l.kind === "rail" ? "駅" : "停留所") + "・" + mins(l.arr - l.dep) + "）"),
                l.hw ? h("small", { class: "muted" }, "約" + Math.round(l.hw / 60) + "分おき" + (l.approx ? "（目安）" : "")) : null,
                l.fare ? h("small", { class: "muted" }, "運賃：" + l.fare) : null)));
          } else if (l.type === "exit") {
            items.push(h("li", { class: "step station" }, App.icon("train"), h("span", null, (l.kind === "rail" ? "駅を出る：" : "バスを降りる：") + l.stop)));
          } else if (l.type === "xfer") {
            items.push(h("li", { class: "step station" }, App.icon("swap"), h("span", null, "乗り換え：" + l.from + " → " + l.to)));
          }
        }
        items.push(h("li", { class: "step goal" }, App.icon("pin"), h("strong", null, "到着：" + (to.name || "目的地"))));
        panel.replaceChildren(
          h("div", { class: "panel-head" },
            h("button", { class: "icon-btn", "aria-label": "候補に戻る", onclick: () => { panel.className = "map-panel open"; planUI(); } }, App.icon("back")),
            h("div", { class: "grow" }, h("strong", null, md.t + "　" + mins(r.total)), h("small", { class: "muted" }, "徒歩 " + meters(r.walkM) + "・屋根 " + r.coverPct + "%")),
            h("button", { class: "btn primary small", onclick: startNav }, "案内開始")),
          h("ol", { class: "steps" }, items));
      }
      function stepIcon(k) { return { elev: "elev", steps: "steps", cross: "alert", tunnel: "tunnel", bridge: "bridge", indoor: "indoor", cover: "umbrella", road: "walk", walk: "walk" }[k] || "walk"; }

      /* ----- 案内モード ----- */
      function startNav() {
        if (!me) { startGps(); toast("現在地を取得してから案内します"); }
        navMode = true; follow = true; gpsBtn.classList.add("follow");
        panel.className = "map-panel open nav";
        if (me) map.easeTo({ center: [me[0], me[1]], zoom: 17.5 });
        navTick();
      }
      function navTick() {
        if (!navMode || !me) return;
        const r = routes[selected]; if (!r) return;
        // ルート上の一番近い点と、残りの距離
        let best = 1e9, bi = 0; const line = [];
        r.legs.forEach((l) => { if (l.type === "walk") l.segs.forEach((s) => s.pts.forEach((p) => line.push(p))); else if (l.type === "ride") l.stops.forEach((s) => line.push([s.lo, s.la])); });
        line.forEach((p, i) => { const d = Math.hypot((p[1] - me[1]) * 110540, (p[0] - me[0]) * 111320); if (d < best) { best = d; bi = i; } });
        let rest = 0; for (let i = bi + 1; i < line.length; i++) rest += Math.hypot((line[i][1] - line[i - 1][1]) * 110540, (line[i][0] - line[i - 1][0]) * 111320);
        offCount = best > 45 ? offCount + 1 : 0;
        panel.replaceChildren(
          h("div", { class: "panel-head" },
            h("div", { class: "grow" }, h("strong", { class: "big" }, "残り " + meters(rest)), h("small", { class: "muted" }, best > 45 ? "ルートから " + meters(best) + " 離れています" : "ルート上を進んでいます")),
            h("button", { class: "btn small", onclick: () => { navMode = false; stepsUI(r); } }, "道順を見る"),
            h("button", { class: "icon-btn", "aria-label": "案内を終了", onclick: () => { navMode = false; planUI(); } }, App.icon("x"))),
          offCount >= 3 ? h("button", { class: "btn primary wide", onclick: () => { offCount = 0; setFrom(null); compute().then(() => startNav()); } }, "現在地からルートを探し直す") : null);
        if (rest < 25) { navMode = false; toast("目的地に着きました"); }
      }

      /* ----- 保存地点（みんなで共有） ----- */
      const pinCol = store.collection("map_pins");
      const stopPins = pinCol.watch((list) => {
        pins.length = 0; pins.push(...list);
        pinMarkers.forEach((m) => m.remove());
        pinMarkers = list.map((p) => {
          const el2 = h("button", { class: "pin saved", "aria-label": p.name }, App.icon("star"));
          el2.onclick = (e) => { e.stopPropagation(); pinMenu(p); };
          return new maplibregl.Marker({ element: el2, anchor: "bottom" }).setLngLat([p.lo, p.la]).addTo(map);
        });
      });
      onLeave(stopPins);
      function savePin(pt) {
        let close;
        const name = h("input", { id: "pin-name", class: "input", placeholder: "名前（例：ホテル）", maxlength: "40" });
        const note = h("input", { id: "pin-note", class: "input", placeholder: "メモ（任意）", maxlength: "80" });
        close = sheet("地点を保存", h("form", { class: "form", onsubmit: async (e) => {
          e.preventDefault();
          const n = name.value.trim(); if (!n) { name.focus(); return; }
          try { await pinCol.add({ name: n, note: note.value.trim(), la: pt.la, lo: pt.lo, created: Date.now() }); close(); toast("保存しました"); } catch (x) {}
        } }, name, note, h("p", { class: "small muted" }, "保存した地点は、メンバー全員の地図に出ます。"), h("button", { class: "btn primary", type: "submit" }, "保存")));
        setTimeout(() => name.focus(), 250);
      }
      function pinMenu(p) {
        let close, confirmDel = false;
        const del = h("button", { class: "btn danger ghost", onclick: async () => { if (!confirmDel) { confirmDel = true; del.textContent = "もう一度押すと削除"; return; } try { await pinCol.remove(p.id); close(); } catch (e) {} } }, "削除");
        close = sheet(p.name, h("div", { class: "form" }, p.note ? h("p", null, p.note) : null,
          h("div", { class: "row gap" }, h("button", { class: "btn primary", onclick: () => { close(); setTo({ la: p.la, lo: p.lo, name: p.name }); } }, "ここへ行く"),
            h("button", { class: "btn", onclick: () => { close(); setFrom({ la: p.la, lo: p.lo, name: p.name }); } }, "ここから出発"), del)));
      }

      /* ----- オフライン保存 ----- */
      async function offlineSave() {
        if (!("caches" in window)) { toast("この端末ではオフライン保存が使えません"); return; }
        let close;
        const bar = h("i", { style: { width: "0%" } });
        const label = h("p", { class: "small" }, "準備中…");
        close = sheet("オフライン用に保存", h("div", { class: "form" }, label, h("div", { class: "bar" }, bar), h("p", { class: "small muted" }, "Wi-Fiにつながっている時に行ってください（約17MB）。途中で閉じても、保存できた分は残ります。")));
        try {
          const list = await fetch(BASE + "assets.json", { cache: "no-store" }).then((r) => r.json());
          const cache = await caches.open("mt-data-v1");
          let n = 0;
          const queue = list.slice();
          async function worker() {
            while (queue.length) {
              const u = queue.shift();
              try { const hit = await cache.match(BASE + u); if (!hit) { const r = await fetch(BASE + u); if (r.ok) await cache.put(BASE + u, r); } } catch (e) {}
              n++; bar.style.width = Math.round((n / list.length) * 100) + "%"; label.textContent = n + " / " + list.length + " ファイル";
            }
          }
          await Promise.all([worker(), worker(), worker(), worker()]);
          label.textContent = "保存できました。ネットがなくても地図とルート検索が使えます。";
        } catch (e) { label.textContent = "保存に失敗しました。通信を確認してもう一度試してください。"; }
      }

      if (!param || !param.to) setTimeout(() => { if (!to) startGps(); }, 600);
      loadEngine();
    },
  });
})();
