/* =====================================================================
   旅アプリのコア
   ---------------------------------------------------------------------
   【機能の足し方】
   1. modules/ に新しいファイルを作り、App.register({...}) を呼ぶ
        App.register({
          id: "weather",          // URLの #weather にもなる
          title: "天気",          // タブ・見出しの名前
          icon: "sun",            // core/icons.js にあるアイコン名
          order: 60,              // 並び順（小さいほど左）
          nav: "more",            // "main"=下のタブバー / "more"=「その他」
          full: false,            // true なら画面いっぱい（地図など）
          render(el, ctx) { ... } // el に中身を描く。ctx は下を参照
        });
   2. 中身のデータは data/ に App.data.xxx = {...} として置く
   3. index.html の FILES に2つのファイル名を足す
   これだけで、タブ・その他メニュー・画面切り替えに自動で組み込まれる。

   ctx（render に渡される道具）:
     ctx.h(tag, attrs, ...children)  要素を作る
     ctx.go(id, param)               別の画面へ移動（param は任意）
     ctx.param                       移動時に渡された値
     ctx.store                       保存（core/store.js）
     ctx.toast(msg)                  画面下に短いお知らせ
     ctx.sheet(title, contentEl)     下から出るシート（閉じる関数を返す）
     ctx.onLeave(fn)                 画面を離れるときの後片付け
   ===================================================================== */
(function () {
  const App = (window.App = window.App || {});
  App.data = App.data || {};
  const modules = [];
  let current = null;
  let leaveFns = [];

  App.register = function (mod) {
    if (!mod || !mod.id || !mod.render) throw new Error("module needs id and render");
    if (modules.some((m) => m.id === mod.id)) return;
    modules.push(Object.assign({ order: 100, nav: "more", icon: "dot" }, mod));
    modules.sort((a, b) => a.order - b.order);
  };
  App.modules = () => modules.slice();

  /* ---------- 小さな道具 ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (k === "html") el.innerHTML = v;
        else if (v === true) el.setAttribute(k, "");
        else el.setAttribute(k, v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  App.h = h;

  App.icon = function (name, cls) {
    const span = h("span", { class: "ic " + (cls || ""), "aria-hidden": "true" });
    span.innerHTML = (App.icons && App.icons[name]) || (App.icons && App.icons.dot) || "";
    return span;
  };

  /* 円の換算レート（1リンギット＝何円）。変えるときはここだけ */
  App.rate = 38.7;
  App.fmt = {
    yen: (n) => "¥" + Math.round(n).toLocaleString("ja-JP"),
    rm: (n) => "RM" + (Math.round(n * 100) / 100).toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    date: (iso) => {
      const d = new Date(iso + "T00:00:00");
      return d.getMonth() + 1 + "/" + d.getDate() + "（" + "日月火水木金土"[d.getDay()] + "）";
    },
    mins: (m) => (m >= 60 ? Math.floor(m / 60) + "時間" + (m % 60 ? (m % 60) + "分" : "") : m + "分"),
  };
  // 文章の中の「RM◯」「RM◯〜◯」のあとに（約◯円）を足す
  App.fmt.ry = (text) => {
    if (typeof text !== "string" || !/RM\s?\d/.test(text) || /円）/.test(text)) return text;
    const y = (v) => {
      const n = parseFloat(v.replace(/,/g, "")) * App.rate;
      return (n >= 100 ? Math.round(n / 10) * 10 : Math.round(n)).toLocaleString("ja-JP");
    };
    return text.replace(/RM\s?([\d,]+(?:\.\d+)?)(?:\s?[〜~\-–]\s?([\d,]+(?:\.\d+)?))?(前後〜|前後|〜)?/g, (m, a, b) =>
      m + "（約" + y(a) + (b ? "〜" + y(b) : "") + "円）");
  };
  // データ全体の文字列に円を足す（地図・写真・割り勘の記録には触らない）
  App.addYen = function () {
    const walk = (o) => {
      if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) { if (typeof o[i] === "string") o[i] = App.fmt.ry(o[i]); else walk(o[i]); } }
      else if (o && typeof o === "object") for (const k in o) { if (typeof o[k] === "string") { if (!/^https?:/.test(o[k])) o[k] = App.fmt.ry(o[k]); } else walk(o[k]); }
    };
    for (const k in App.data) if (!/^(hotelImgs|spotPhotos|ets)$/.test(k)) walk(App.data[k]);
  };
  App.todayISO = function () {
    // マレーシア時間（UTC+8）の日付
    const d = new Date(Date.now() + 8 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  };

  /* ---------- トースト・シート ---------- */
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.hidden = false;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => (t.hidden = true), 250);
    }, 2600);
  }
  App.toast = toast;

  function sheet(title, content) {
    const root = document.getElementById("sheet-root");
    const close = () => {
      wrap.classList.remove("open");
      setTimeout(() => wrap.remove(), 200);
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => e.key === "Escape" && close();
    const wrap = h(
      "div",
      { class: "sheet-wrap", role: "dialog", "aria-modal": "true", "aria-label": title },
      h("div", { class: "sheet-backdrop", onclick: close }),
      h(
        "div",
        { class: "sheet" },
        h("div", { class: "sheet-grip" }),
        h("div", { class: "sheet-head" }, h("h2", null, title), h("button", { class: "icon-btn", onclick: close, "aria-label": "閉じる" }, App.icon("x"))),
        h("div", { class: "sheet-body" }, content)
      )
    );
    root.append(wrap);
    requestAnimationFrame(() => wrap.classList.add("open"));
    document.addEventListener("keydown", onKey);
    return close;
  }
  App.sheet = sheet;

  /* ---------- 画面の切り替え ---------- */
  function go(id, param) {
    const mod = modules.find((m) => m.id === id) || modules[0];
    leaveFns.forEach((f) => {
      try { f(); } catch (e) {}
    });
    leaveFns = [];
    current = mod;
    const view = document.getElementById("view");
    view.replaceChildren();
    document.body.classList.toggle("full-view", !!mod.full);
    document.body.classList.toggle("wide-view", !!mod.wide);
    view.scrollTop = 0;
    window.scrollTo(0, 0);
    document.getElementById("view-title").textContent = mod.title;
    const ctx = {
      h, go, param, toast, sheet,
      store: App.store,
      fmt: App.fmt,
      icon: App.icon,
      onLeave: (fn) => leaveFns.push(fn),
    };
    try {
      mod.render(view, ctx);
    } catch (e) {
      console.error(e);
      view.append(h("p", { class: "empty" }, "この画面の表示でエラーが起きました：" + e.message));
    }
    renderNav();
    try { history.replaceState(null, "", "#" + mod.id); } catch (e) {}
    try { localStorage.setItem("mt:last", mod.id); } catch (e) {}
  }
  App.go = go;

  function renderNav() {
    const nav = document.getElementById("tabbar");
    const main = modules.filter((m) => m.nav === "main").slice(0, 5);
    const more = modules.filter((m) => !main.includes(m));
    const moreActive = current && more.includes(current);
    const btn = (m) =>
      h(
        "button",
        { class: "tab" + (current === m ? " on" : ""), onclick: () => go(m.id), "aria-current": current === m ? "page" : null },
        App.icon(m.icon),
        h("span", null, m.short || m.title)
      );
    nav.replaceChildren(
      ...main.map(btn),
      h(
        "button",
        { class: "tab" + (moreActive ? " on" : ""), onclick: openMore, "aria-haspopup": "dialog" },
        App.icon("grid"),
        h("span", null, moreActive ? current.short || current.title : "その他")
      )
    );
    // PC用の横並びメニュー
    const side = document.getElementById("sidenav");
    side.replaceChildren(
      ...modules.map((m) =>
        h("button", { class: "side-item" + (current === m ? " on" : ""), onclick: () => go(m.id) }, App.icon(m.icon), h("span", null, m.title))
      )
    );
  }

  function openMore() {
    const main = modules.filter((m) => m.nav === "main").slice(0, 5);
    const more = modules.filter((m) => !main.includes(m));
    let close;
    const list = h(
      "div",
      { class: "more-grid" },
      more.map((m) =>
        h(
          "button",
          { class: "more-item", onclick: () => { close(); go(m.id); } },
          App.icon(m.icon),
          h("strong", null, m.title),
          m.desc ? h("small", null, m.desc) : null
        )
      )
    );
    close = sheet("その他の機能", list);
  }

  App.start = function () {
    try { App.addYen(); } catch (e) { console.warn(e); }
    const hash = (location.hash || "").slice(1);
    let last = null;
    try { last = localStorage.getItem("mt:last"); } catch (e) {}
    const first = modules.find((m) => m.id === hash) || modules.find((m) => m.id === last) || modules[0];
    go(first.id);
    window.addEventListener("hashchange", () => {
      const id = location.hash.slice(1);
      if (id && (!current || id !== current.id)) go(id);
    });
    App.store.status((s) => {
      const el = document.getElementById("sync");
      el.textContent = s.label;
      el.className = "sync " + s.mode;
      el.title = s.detail || "";
    });
  };
})();
