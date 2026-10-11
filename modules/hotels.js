/* ホテル候補。データは data/hotels.js。「候補」の印はみんなで共有（store の hotel_picks） */
App.register({
  id: "hotels", title: "ホテル", short: "ホテル", icon: "bed", order: 48, nav: "more", wide: true, desc: "各地のホテル（高級〜節約）",
  render(el, { h, icon, store, onLeave }) {
    const D = App.data, hotels = D.hotels, areas = D.hotelAreas, tiers = D.hotelTiers;
    const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; };
    let area = ls("mt:hotel-area") || "all";
    let tier = ls("mt:hotel-tier") || "all";
    let onlyPicks = false;
    let picks = new Set();
    const col = store.collection("hotel_picks");

    const card = (x) => {
      const on = picks.has(x.id);
      return h("article", { class: "ht-card t-" + x.tier + (on ? " picked" : "") },
        h("div", { class: "ht-top" },
          h("span", { class: "ht-tier" }, (tiers.find((t) => t.id === x.tier) || {}).short),
          h("span", { class: "ht-zone small muted" }, x.zone)
        ),
        h("h3", null, x.name),
        h("div", { class: "ht-en small muted" }, x.en),
        h("div", { class: "ht-price mono" }, x.price),
        x.points && x.points.length ? h("ul", { class: "ht-pts" }, x.points.map((p) => h("li", null, p))) : null,
        h("div", { class: "ht-act" },
          h("button", { class: "chip" + (on ? " on" : ""), "aria-pressed": on ? "true" : "false", onclick: () => (on ? col.remove(x.id) : col.set(x.id, { at: Date.now() })) }, icon("star"), on ? "候補に入れた" : "候補に入れる"),
          h("a", { class: "chip", href: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(x.en + " " + (areas.find((a) => a.id === x.area) || {}).name), target: "_blank", rel: "noopener" }, icon("map"), "地図"),
          h("a", { class: "chip", href: "https://www.google.com/search?q=" + encodeURIComponent(x.en + " 予約 料金"), target: "_blank", rel: "noopener" }, icon("ext"), "料金を調べる")
        )
      );
    };

    const filt = h("div", { class: "mz-filters" });
    const list = h("div");
    function draw() {
      const chip = (on, label, fn) => h("button", { class: "chip" + (on ? " on" : ""), "aria-pressed": on ? "true" : "false", onclick: fn }, label);
      filt.replaceChildren(
        h("div", { class: "chips scroll" }, [{ id: "all", name: "全エリア" }].concat(areas).map((a) => chip(area === a.id, a.name, () => { area = a.id; ls("mt:hotel-area", area); draw(); }))),
        h("div", { class: "chips scroll" },
          [{ id: "all", name: "すべて" }].concat(tiers).map((t) => chip(tier === t.id, t.name, () => { tier = t.id; ls("mt:hotel-tier", tier); draw(); })),
          chip(onlyPicks, "★ 候補だけ（" + picks.size + "）", () => { onlyPicks = !onlyPicks; draw(); })
        )
      );
      const shown = hotels.filter((x) => (area === "all" || x.area === area) && (tier === "all" || x.tier === tier) && (!onlyPicks || picks.has(x.id)));
      if (!shown.length) { list.replaceChildren(h("p", { class: "empty" }, onlyPicks ? "まだ候補に入れたホテルはありません" : "この条件のホテルはありません")); return; }
      list.replaceChildren(
        ...areas.filter((a) => shown.some((x) => x.area === a.id)).map((a) =>
          h("section", { class: "ht-sec" },
            h("h2", { class: "ht-h" }, a.name, h("small", null, shown.filter((x) => x.area === a.id).length + "軒")),
            a.note ? h("p", { class: "small muted ht-note" }, a.note) : null,
            tiers.filter((t) => shown.some((x) => x.area === a.id && x.tier === t.id)).map((t) => [
              h("h3", { class: "ht-tierh t-" + t.id }, t.name),
              h("div", { class: "ht-grid" }, shown.filter((x) => x.area === a.id && x.tier === t.id).map(card)),
            ])
          )
        )
      );
    }
    el.append(
      h("p", { class: "lead small" }, "まだ宿は決まっていないので、各地の候補を高級リゾートから節約宿まで並べました。気になる宿は「候補に入れる」を押すと、みんなの画面にも★がつきます。"),
      h("div", { class: "note" }, icon("info"), h("span", null, "料金は1泊1室の目安です（調べた時点の予約サイトの相場）。2〜3月の週末や祝日は高くなるので、予約サイトで日付を入れて確認してください。")),
      filt, list
    );
    draw();
    onLeave(col.watch((rows) => { picks = new Set(rows.map((r) => r.id)); draw(); }));
  },
});
