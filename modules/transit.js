/* 交通：ETS時刻表、バス・フェリーなど */
App.data.stationJa = {
  "PADANG BESAR": "パダンブサール", "ALOR SETAR": "アロースター", "SUNGAI PETANI": "スンガイプタニ",
  "BUTTERWORTH": "バタワース（ペナン）", "BUKIT MERTAJAM": "ブキッメルタジャム", "PARIT BUNTAR": "パリッブンタル",
  "TAIPING": "タイピン", "KUALA KANGSAR": "クアラカンサー", "IPOH": "イポー", "BATU GAJAH": "バトゥガジャ",
  "KAMPAR": "カンパー", "TAPAH ROAD": "タパロード", "TANJUNG MALIM": "タンジュンマリム", "SUNGAI BULOH": "スンガイブロー",
  "KUALA LUMPUR": "クアラルンプール（旧駅）", "KL SENTRAL": "KLセントラル", "KAJANG": "カジャン", "SEREMBAN": "スレンバン",
  "PULAU SEBANG / TAMPIN": "プラウスバン（マラッカ）", "SEGAMAT": "スガマット", "KLUANG": "クルアン", "JB SENTRAL": "JBセントラル",
};
App.register({
  id: "transit", title: "交通・時刻表", short: "交通", icon: "train", order: 30, nav: "main",
  render(el, { h, sheet, icon, fmt, param }) {
    const ets = App.data.ets, ja = App.data.stationJa;
    const st = ets.stations;
    const label = (s) => ja[s] || s.charAt(0) + s.slice(1).toLowerCase();
    const toMin = (t) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
    const cls = { EP: ["Platinum", "停車駅が少ない"], EG: ["Gold", "各駅に近い"], EX: ["Express", "主要駅のみ"], ES: ["Silver", ""] };
    const tripTrains = {};
    App.data.trip.days.forEach((d) => d.items.forEach((i) => i.train && (tripTrains[i.train] = d.date)));

    // 旅程で使う区間をプリセットに
    const presets = [
      ["BUTTERWORTH", "TAIPING"], ["TAIPING", "IPOH"], ["IPOH", "PULAU SEBANG / TAMPIN"],
      ["KL SENTRAL", "BUTTERWORTH"], ["KL SENTRAL", "IPOH"], ["IPOH", "KL SENTRAL"],
    ];
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("mt:ets") || "null"); } catch (e) {}
    let from = (saved && saved[0]) || "BUTTERWORTH", to = (saved && saved[1]) || "TAIPING";
    let tab = param && param.tab ? param.tab : param && param.train ? "ets" : "ets";

    const tabs = h("div", { class: "seg", role: "tablist" });
    const pane = h("div");

    function trainSheet(t, dir) {
      const order = dir === "south" ? st : st.slice().reverse();
      const stops = order.filter((s) => t.stops[s]);
      sheet(t.no + "（" + (cls[t.no.slice(0, 2)] || [""])[0] + "）の停車駅", h("div", null,
        h("ol", { class: "stops" }, stops.map((s) => h("li", { class: s === from || s === to ? "hit" : "" }, h("span", { class: "mono" }, t.stops[s]), h("span", null, label(s))))),
        h("p", { class: "muted small" }, "時刻は各駅の発車時刻（終点は到着時刻）。")
      ));
    }

    function drawEts() {
      const fi = st.indexOf(from), ti = st.indexOf(to);
      const dir = fi < ti ? "south" : "north";
      const rows = ets[dir]
        .filter((t) => t.stops[from] && t.stops[to])
        .map((t) => {
          let d = toMin(t.stops[from]), a = toMin(t.stops[to]);
          if (a < d) a += 1440;
          return { t, dep: t.stops[from], arr: t.stops[to], dur: a - d, sort: d < 240 ? d + 1440 : d };
        })
        .sort((x, y) => x.sort - y.sort);
      const sel = (val, on) => h("select", { class: "select", onchange: (e) => on(e.target.value), "aria-label": "駅を選ぶ" },
        st.map((s) => h("option", { value: s, selected: s === val ? true : null }, label(s))));
      const save = () => { try { localStorage.setItem("mt:ets", JSON.stringify([from, to])); } catch (e) {} };
      pane.replaceChildren(
        h("div", { class: "card odpick" },
          h("label", { class: "fld" }, h("span", null, "乗る駅"), sel(from, (v) => { from = v; save(); drawEts(); })),
          h("button", { class: "icon-btn swap", "aria-label": "乗る駅と降りる駅を入れ替える", onclick: () => { [from, to] = [to, from]; save(); drawEts(); } }, icon("swap")),
          h("label", { class: "fld" }, h("span", null, "降りる駅"), sel(to, (v) => { to = v; save(); drawEts(); }))
        ),
        h("div", { class: "chips scroll" }, presets.map(([a, b]) =>
          h("button", { class: "chip" + (a === from && b === to ? " on" : ""), onclick: () => { from = a; to = b; save(); drawEts(); } }, label(a).replace(/（.*）/, "") + " → " + label(b).replace(/（.*）/, "")))),
        h("div", { class: "muted small" }, label(from) + " → " + label(to) + "：" + rows.length + "本（" + (dir === "south" ? "南行き" : "北行き") + "）"),
        rows.length
          ? h("ul", { class: "trains" }, rows.map((r) => {
              const c = cls[r.t.no.slice(0, 2)] || ["", ""];
              const mine = tripTrains[r.t.no];
              return h("li", null, h("button", { class: "train" + (mine ? " mine" : ""), onclick: () => trainSheet(r.t, dir) },
                h("span", { class: "t-time mono" }, r.dep, h("i", null, "→"), r.arr),
                h("span", { class: "t-meta" },
                  h("span", { class: "badge c-" + r.t.no.slice(0, 2) }, c[0]),
                  h("span", { class: "mono small" }, r.t.no),
                  h("span", { class: "small muted" }, fmt.mins(r.dur))
                ),
                mine ? h("span", { class: "pill accent small" }, fmt.date(mine) + "に乗る予定") : null
              ));
            }))
          : h("p", { class: "empty" }, "この2駅を直接結ぶ列車はありません。乗り換えが必要です。"),
        h("div", { class: "note" }, icon("info"),
          h("span", null, "KTMB公式の時刻表（2026年6月1日改正）です。2027年2月までに変わることがあるので、予約前にKTMB Mobileアプリで確認してください。 ",
            h("a", { href: ets.sourceUrl, target: "_blank", rel: "noopener" }, "公式PDF"))),
        h("dl", { class: "kv small" },
          h("dt", null, "Platinum"), h("dd", null, "停車駅が少なく速い"),
          h("dt", null, "Gold"), h("dd", null, "小さめの駅にも止まる"),
          h("dt", null, "Express"), h("dd", null, "大きな駅だけ"))
      );
      if (param && param.train && !drawEts.opened) {
        drawEts.opened = true;
        for (const d of ["south", "north"]) {
          const t = ets[d].find((x) => x.no === param.train);
          if (t) { trainSheet(t, d); break; }
        }
      }
    }

    function drawOther() {
      const groups = [...new Set(App.data.transport.map((x) => x.area))];
      const kindIcon = { bus: "bus", ship: "ship", train: "train", car: "car", plane: "plane" };
      pane.replaceChildren(
        ...groups.map((g) => h("section", { class: "block" },
          h("h2", { class: "sec" }, g),
          h("div", { class: "cards2" }, App.data.transport.filter((x) => x.area === g).map((x) =>
            h("article", { class: "card tr" + (param && param.tr === x.id ? " hl" : ""), id: "tr-" + x.id },
              h("div", { class: "row gap" }, icon(kindIcon[x.kind] || "dot", "lg"), h("strong", null, x.name)),
              h("div", { class: "small muted" }, x.route),
              x.times ? h("dl", { class: "kv small" }, x.times.map(([k, v]) => [h("dt", null, k), h("dd", { class: "mono" }, v)])) : null,
              h("dl", { class: "kv small" },
                x.freq ? [h("dt", null, "本数"), h("dd", null, x.freq)] : null,
                x.dur ? [h("dt", null, "所要"), h("dd", null, x.dur)] : null,
                x.fare ? [h("dt", null, "料金"), h("dd", null, x.fare)] : null,
                x.pay ? [h("dt", null, "支払い"), h("dd", null, x.pay)] : null),
              x.note ? h("p", { class: "small" }, x.note) : null,
              h("div", { class: "row between small muted" }, h("span", null, "確認：" + (x.checked || "")),
                x.url ? h("a", { href: x.url, target: "_blank", rel: "noopener" }, "出典") : null)
            )))
        )),
        h("p", { class: "muted small" }, "バスの本数・料金は目安です。現地ではMyRapid PULSEアプリやGoogleマップで確認してください。")
      );
    }

    function drawTabs() {
      tabs.replaceChildren(
        ...[["ets", "ETS（電車）"], ["other", "バス・船・飛行機"]].map(([k, t]) =>
          h("button", { class: "seg-btn" + (tab === k ? " on" : ""), role: "tab", "aria-selected": tab === k ? "true" : "false", onclick: () => { tab = k; drawTabs(); } }, t))
      );
      tab === "ets" ? drawEts() : drawOther();
      if (tab === "other" && param && param.tr) { const c = document.getElementById("tr-" + param.tr); if (c) setTimeout(() => c.scrollIntoView({ block: "center" }), 50); }
    }
    el.append(tabs, pane);
    drawTabs();
  },
});
