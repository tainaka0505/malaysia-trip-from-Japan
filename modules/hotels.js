/* ホテル候補。データは data/hotels.js、予約サイトの写真は data/hotel_imgs.js。「候補」の印はみんなで共有（store の hotel_picks） */
App.register({
  id: "hotels", title: "ホテル", short: "ホテル", icon: "bed", order: 48, nav: "more", wide: true, desc: "各地のホテル（高級〜節約）",
  render(el, { h, icon, store, onLeave, sheet }) {
    const D = App.data, hotels = D.hotels, areas = D.hotelAreas, tiers = D.hotelTiers;
    const BK = D.hotelImgs || {};
    const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; };
    let area = ls("mt:hotel-area") || "all";
    let tier = ls("mt:hotel-tier") || "all";
    let onlyPicks = false;
    let picks = new Set();
    const col = store.collection("hotel_picks");
    const areaOf = (id) => areas.find((a) => a.id === id) || {};
    const tierOf = (id) => tiers.find((t) => t.id === id) || {};
    // 公式サイトの写真 → 予約サイトの写真 の順
    const imgsOf = (x) => (x.img || []).map((u) => ({ u, src: "公式サイト" })).concat((BK[x.id] || []).map((u) => ({ u, src: "Booking.com" })));

    // 読み込めない写真は次の写真に差し替える
    function pic(list, cls) {
      const box = h("div", { class: "ht-ph " + (cls || "") });
      let i = 0;
      const img = h("img", { alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" });
      const next = () => { if (i < list.length) img.src = list[i++].u; else { img.remove(); box.classList.add("noimg"); } };
      img.addEventListener("error", next);
      if (list.length) { next(); box.append(img); } else box.classList.add("noimg");
      return box;
    }

    function pickBtn(x) {
      const on = picks.has(x.id);
      return h("button", { class: "chip" + (on ? " on" : ""), "aria-pressed": on ? "true" : "false", onclick: (e) => { e.stopPropagation(); on ? col.remove(x.id) : col.set(x.id, { at: Date.now() }); } }, icon("star"), on ? "候補に入れた" : "候補に入れる");
    }

    function detail(x) {
      const list = imgsOf(x);
      const strip = h("div", { class: "ht-strip" });
      list.forEach((p) => {
        const im = h("img", { src: p.u, alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
        im.addEventListener("error", () => fig.remove());
        const fig = h("figure", null, im, h("figcaption", null, p.src));
        strip.append(fig);
      });
      const sec = (t, arr) => (arr && arr.length ? [h("h3", null, t), h("ul", { class: "tips" }, arr.map((s) => h("li", null, s)))] : null);
      const a = areaOf(x.area);
      const body = h("div", { class: "detail ht-detail" },
        list.length ? strip : null,
        h("div", { class: "mz-kicker" }, tierOf(x.tier).name + "　/　" + x.zone),
        h("div", { class: "small muted" }, x.en),
        x.vibe ? h("p", { class: "ht-vibe" }, x.vibe) : null,
        h("dl", { class: "kv" },
          h("dt", null, "料金の目安"), h("dd", null, x.price),
          x.bk ? [h("dt", null, a.bkDate + " の料金"), h("dd", null, x.bk + "（Booking.com・大人2人1室、10/11時点）")] : null,
          x.score ? [h("dt", null, "クチコミ"), h("dd", null, x.score + "（Booking.com）")] : null
        ),
        sec("ここが売り", x.sells),
        sec("プール・スパ・食事", x.fac),
        x.rooms ? [h("h3", null, "部屋"), h("p", null, x.rooms)] : null,
        x.note ? h("div", { class: "note" }, icon("info"), h("span", null, x.note)) : null,
        h("div", { class: "mz-actions" },
          pickBtn(x),
          x.off ? h("a", { class: "btn", href: x.off, target: "_blank", rel: "noopener" }, icon("ext"), "公式サイト") : null,
          h("a", { class: "btn", href: "https://www.booking.com/searchresults.ja.html?ss=" + encodeURIComponent(x.en), target: "_blank", rel: "noopener" }, icon("ext"), "Booking.comで見る"),
          h("a", { class: "btn", href: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(x.en + " " + a.name), target: "_blank", rel: "noopener" }, icon("map"), "地図")
        ),
        h("p", { class: "muted small" }, "写真は各ホテルの公式サイトと予約サイトから直接読み込んでいます（ネットがないと表示されません）。")
      );
      sheet(x.name, body);
    }

    const card = (x) => {
      const on = picks.has(x.id);
      const big = x.tier === "hi";
      return h("article", { class: "ht-card t-" + x.tier + (on ? " picked" : "") + (big ? " big" : ""), tabindex: "0", role: "button", onclick: () => detail(x), onkeydown: (e) => { if (e.key === "Enter") detail(x); } },
        pic(imgsOf(x), big ? "wide" : ""),
        h("div", { class: "ht-body" },
          h("div", { class: "ht-top" }, h("span", { class: "ht-tier" }, tierOf(x.tier).short), h("span", { class: "ht-zone small muted" }, x.zone)),
          h("h3", null, x.name),
          h("div", { class: "ht-price" }, h("span", { class: "mono" }, x.price), x.score ? h("span", { class: "ht-score" }, "★ " + x.score.split("（")[0]) : null),
          big && x.vibe ? h("p", { class: "small clamp3" }, x.vibe) : x.sells && x.sells[0] ? h("p", { class: "small clamp2 muted" }, x.sells[0]) : null,
          h("div", { class: "ht-act" }, pickBtn(x), h("span", { class: "linkbtn" }, "くわしく", icon("ext")))
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
              h("div", { class: "ht-grid t-" + t.id }, shown.filter((x) => x.area === a.id && x.tier === t.id).map(card)),
            ])
          )
        )
      );
    }
    el.append(
      h("p", { class: "lead small" }, "まだ宿は決まっていないので、各地の候補を高級リゾートから節約宿まで並べました。カードを押すと写真と詳しい説明が出ます。「候補に入れる」を押すと、みんなの画面にも★がつきます。"),
      h("div", { class: "note" }, icon("info"), h("span", null, "「◯/◯の料金」は旅行の日付・大人2人1室でBooking.comに出た金額（2026年10月11日時点）。空室なしと出たところは、まだ予約が始まっていないか満室です。料金は変わるので、予約前に確認してください。")),
      filt, list
    );
    draw();
    onLeave(col.watch((rows) => { picks = new Set(rows.map((r) => r.id)); draw(); }));
  },
});
