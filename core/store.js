/* =====================================================================
   保存のしくみ
   ---------------------------------------------------------------------
   Firebaseの設定があれば、みんなで共有（trips/<合言葉から作ったID>/...）。
   なければ、この端末の中だけに保存する。各機能は保存先を気にせず使える。

     const col = ctx.store.collection("split_expenses");  // みんなで共有する一覧
     const stop = col.watch(list => {...});
     col.add({...}); col.set(id, {...}); col.remove(id);
     const doc = ctx.store.doc("split_settings/main");      // 共有の1件
     const mine = ctx.store.mine("packing");                // 自分（この端末）だけの1件
   ===================================================================== */
(function () {
  const App = window.App;
  const cfg = window.APP_CONFIG || {};
  const statusFns = [];
  let state = { mode: "loading", label: "接続中…" };
  const setStatus = (s) => { state = s; statusFns.forEach((f) => f(s)); };
  let resolveReady;
  const ready = new Promise((r) => (resolveReady = r));

  /* ---------- 端末内保存 ---------- */
  const local = {
    read(key) { try { return JSON.parse(localStorage.getItem("mt:" + key) || "null"); } catch (e) { return null; } },
    write(key, val) { try { localStorage.setItem("mt:" + key, JSON.stringify(val)); } catch (e) {} (local.subs[key] || []).forEach((f) => f(val)); },
    subs: {},
    on(key, fn) { (local.subs[key] = local.subs[key] || []).push(fn); fn(local.read(key)); return () => (local.subs[key] = local.subs[key].filter((f) => f !== fn)); },
  };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const backendLocal = {
    collection(name) {
      const key = "col:" + name;
      const toList = (m) => Object.entries(m || {}).map(([id, v]) => Object.assign({ id }, v));
      return {
        watch: (cb) => local.on(key, (m) => cb(toList(m))),
        add: async (data) => { const m = local.read(key) || {}; const id = uid(); m[id] = data; local.write(key, m); return id; },
        set: async (id, data) => { const m = local.read(key) || {}; m[id] = data; local.write(key, m); },
        remove: async (id) => { const m = local.read(key) || {}; delete m[id]; local.write(key, m); },
      };
    },
    doc(path) { const key = "doc:" + path; return { watch: (cb) => local.on(key, (v) => cb(v || null)), set: async (data) => local.write(key, data) }; },
    mine(name) { return backendLocal.doc("me/" + name); },
  };

  /* ---------- Firebase ---------- */
  function backendFirebase(db, root) {
    const guard = (p) => p.catch((e) => { console.warn(e); App.toast("保存できませんでした。通信を確認してください"); throw e; });
    return {
      collection(name) {
        const ref = db.collection(root + "/" + name);
        return {
          watch: (cb) => ref.onSnapshot((s) => cb(s.docs.map((d) => Object.assign({ id: d.id }, d.data()))), (e) => console.warn(e)),
          add: (data) => guard(ref.add(data).then((r) => r.id)),
          set: (id, data) => guard(ref.doc(id).set(data)),
          remove: (id) => guard(ref.doc(id).delete()),
        };
      },
      doc(path) {
        const ref = db.doc(root + "/" + path);
        return { watch: (cb) => ref.onSnapshot((s) => cb(s.exists ? s.data() : null), (e) => console.warn(e)), set: (data) => guard(ref.set(data)) };
      },
      mine: (name) => backendLocal.mine(name),
    };
  }

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  App.sha256 = sha256;

  let backend = null;
  App.store_init = async function (pass) {
    if (cfg.firebase && window.firebase) {
      try {
        if (!firebase.apps.length) firebase.initializeApp(cfg.firebase);
        const db = firebase.firestore();
        try { await Promise.race([db.enablePersistence({ synchronizeTabs: true }), new Promise((r) => setTimeout(r, 3000))]); } catch (e) {}
        // オフラインでも先に進めるように、ログインは最大6秒だけ待つ
        await Promise.race([firebase.auth().signInAnonymously().catch((e) => console.warn("auth", e)), new Promise((r) => setTimeout(r, 6000))]);
        const tripId = (await sha256((pass || "") + "|" + (cfg.tripSalt || ""))).slice(0, 32);
        backend = backendFirebase(db, "trips/" + tripId);
        setStatus({ mode: "cloud", label: "共有中", detail: "割り勘と地図の保存地点はメンバー全員で共有されます" });
      } catch (e) {
        console.warn(e);
        backend = backendLocal;
        setStatus({ mode: "local", label: "この端末に保存", detail: "共有の設定がうまくいかなかったので、この端末の中だけに保存しています" });
      }
    } else {
      backend = backendLocal;
      setStatus({ mode: "local", label: "この端末に保存", detail: "共有の設定がまだなので、この端末の中だけに保存しています" });
    }
    resolveReady(backend);
  };

  function lazy(kind, arg) {
    return {
      watch(cb) { let stop = null, dead = false; ready.then((b) => { if (!dead) stop = b[kind](arg).watch(cb); }); return () => { dead = true; if (stop) stop(); }; },
      add: (d) => ready.then((b) => b[kind](arg).add(d)),
      set: (a, b2) => ready.then((b) => (b2 === undefined ? b[kind](arg).set(a) : b[kind](arg).set(a, b2))),
      remove: (id) => ready.then((b) => b[kind](arg).remove(id)),
    };
  }
  App.store = {
    collection: (name) => lazy("collection", name),
    doc: (path) => lazy("doc", path),
    mine: (name) => lazy("mine", name),
    status(fn) { statusFns.push(fn); fn(state); },
    ready,
  };
})();
